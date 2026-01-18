// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::Emitter;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use serde::{Deserialize, Serialize};
use std::fs::File as StdFile;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ClipData {
    file_path: String,
    start_time: f64,
    end_time: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ExportProgress {
    percent: u8,
}

// Command to export video using native FFmpeg
#[tauri::command]
async fn export_video(
    clips: Vec<ClipData>,
    audio_path: String,
    output_path: String,
    window: tauri::Window,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    // 1. Resolve FFmpeg path
    let ffmpeg_path = app_handle
        .path()
        .resolve("bin/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve FFmpeg path: {}", e))?;

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at {:?}", ffmpeg_path));
    }

    // 2. Create temp directory for intermediate clips
    let temp_dir = std::env::temp_dir().join("rvj_export");
    if !temp_dir.exists() {
        std::fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    }

    let mut concat_content = String::new();
    let total_clips = clips.len();

    // 3. Trim each clip
    for (i, clip) in clips.iter().enumerate() {
        let trimmed_name = format!("clip_{}.ts", i); // Use TS for easier concatenation
        let trimmed_path = temp_dir.join(&trimmed_name);
        
        let duration = clip.end_time - clip.start_time;
        
        // Trim command: ffmpeg -ss {start} -t {duration} -i {input} -c:v libx264 -preset ultrafast -c:a aac {output}
        let status = Command::new(&ffmpeg_path)
            .args([
                "-y",
                "-ss", &clip.start_time.to_string(),
                "-t", &duration.to_string(),
                "-i", &clip.file_path,
                "-c:v", "libx264",
                "-preset", "ultrafast", // Speed up for preview/debug
                "-c:a", "aac",
                "-f", "mpegts", // Intermediate format
                trimmed_path.to_str().ok_or("Invalid path")?,
            ])
            .status()
            .map_err(|e| format!("FFmpeg trim failed: {}", e))?;

        if !status.success() {
            return Err(format!("FFmpeg trim exited with error for clip {}", i));
        }

        concat_content.push_str(&format!("file '{}'\n", trimmed_path.to_str().unwrap().replace('\\', "/")));
        
        // Emit progress
        let progress = ((i + 1) as f64 / (total_clips + 1) as f64 * 50.0) as u8;
        window.emit("export-progress", ExportProgress { percent: progress }).unwrap();
    }

    // 4. Create concat file
    let concat_file_path = temp_dir.join("concat.txt");
    let mut concat_file = StdFile::create(&concat_file_path).map_err(|e| format!("Failed to create concat file: {}", e))?;
    concat_file.write_all(concat_content.as_bytes()).map_err(|e| format!("Failed to write concat file: {}", e))?;

    // 5. Final concatenation with audio
    // Command: ffmpeg -f concat -safe 0 -i concat.txt -i audio.mp3 -map 0:v -map 1:a -c:v copy -shortest output.mp4
    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file_path.to_str().unwrap(),
        "-i", &audio_path,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "libx264", // Recode to ensure compatibility, or "copy" if same
        "-preset", "medium",
        "-c:a", "aac",
        "-shortest", // Match length to shortest (useful if looping/padding logic is needed later)
        &output_path,
    ]);

    let status = cmd.status().map_err(|e| format!("FFmpeg final concat failed: {}", e))?;

    if !status.success() {
        return Err("FFmpeg final concat exited with error".to_string());
    }

    // 6. Cleanup
    let _ = std::fs::remove_dir_all(&temp_dir);

    window.emit("export-progress", ExportProgress { percent: 100 }).unwrap();
    
    Ok(output_path)
}

// Command to validate file access
#[tauri::command]
async fn validate_file_path(path: String) -> Result<bool, String> {
    let file_path = PathBuf::from(&path);
    Ok(file_path.exists())
}

// Command to generate video thumbnail using FFmpeg
#[tauri::command]
async fn generate_thumbnail(
    file_path: String,
    timestamp: f64,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use base64::Engine;
    
    // Resolve FFmpeg path
    let ffmpeg_path = app_handle
        .path()
        .resolve("bin/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve FFmpeg path: {}", e))?;

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at {:?}", ffmpeg_path));
    }

    // Extract a single frame as PNG to stdout
    let output = Command::new(&ffmpeg_path)
        .args([
            "-ss", &timestamp.to_string(),
            "-i", &file_path,
            "-vframes", "1",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-vf", "scale=160:90:force_original_aspect_ratio=decrease",
            "-"
        ])
        .output()
        .map_err(|e| format!("FFmpeg thumbnail extraction failed: {}", e))?;

    if !output.status.success() {
        return Err("FFmpeg failed to extract thumbnail".to_string());
    }

    // Encode as base64 data URL
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&output.stdout);
    Ok(format!("data:image/png;base64,{}", base64_data))
}

// Command to generate a low-quality proxy video for fast preview
#[tauri::command]
async fn generate_proxy_video(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
    bitrate: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    // Resolve FFmpeg path
    let ffmpeg_path = app_handle
        .path()
        .resolve("bin/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve FFmpeg path: {}", e))?;

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at {:?}", ffmpeg_path));
    }

    // Ensure output directory exists
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create proxy dir: {}", e))?;
    }

    // FFmpeg command for generating proxy:
    // - Scale to target resolution
    // - Use fast encoding preset
    // - Lower bitrate for smaller file size
    let status = Command::new(&ffmpeg_path)
        .args([
            "-y",
            "-i", &input_path,
            "-vf", &format!("scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2", width, height, width, height),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-b:v", &bitrate,
            "-c:a", "aac",
            "-b:a", "96k",
            "-movflags", "+faststart", // Enable fast start for streaming
            &output_path,
        ])
        .status()
        .map_err(|e| format!("FFmpeg proxy generation failed: {}", e))?;

    if !status.success() {
        return Err("FFmpeg proxy generation exited with error".to_string());
    }

    Ok(output_path)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            export_video,
            validate_file_path,
            generate_thumbnail,
            generate_proxy_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


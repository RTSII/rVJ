// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ClipData {
    file_path: String,
    start_time: f64,
    end_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
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
) -> Result<String, String> {
    // TODO: Implement native FFmpeg export
    // This will be implemented in Phase 4
    
    // For now, return a placeholder
    Ok(output_path)
}

// Command to validate file access
#[tauri::command]
async fn validate_file_path(path: String) -> Result<bool, String> {
    let file_path = PathBuf::from(&path);
    Ok(file_path.exists())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            export_video,
            validate_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

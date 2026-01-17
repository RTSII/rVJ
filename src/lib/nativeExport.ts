import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { TimelineClip } from '@/types';

export type ExportProgress = {
    percent: number;
};

/**
 * Invokes the native Rust FFmpeg export command
 */
export async function exportVideoNative(
    clips: TimelineClip[],
    audioPath: string,
    outputPath: string,
    onProgress: (percent: number) => void
): Promise<string> {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

    if (!isTauri) {
        throw new Error('Native export is only available in desktop mode');
    }

    // Listen for progress events from Rust
    const unlisten = await listen<ExportProgress>('export-progress', (event) => {
        onProgress(event.payload.percent);
    });

    try {
        // Format clips for Rust
        const clipData = clips.map(clip => ({
            file_path: clip.filePath,
            start_time: clip.startTime || 0,
            end_time: clip.endTime || clip.originalDuration || 0,
        }));

        const result = await invoke<string>('export_video', {
            clips: clipData,
            audioPath,
            outputPath,
        });

        return result;
    } catch (error) {
        console.error('Native export failed:', error);
        throw error;
    } finally {
        unlisten();
    }
}

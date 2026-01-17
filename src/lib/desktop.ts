// Desktop utilities for Tauri file handling
export const isTauriApp = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Converts a native file path to a Tauri asset:// URL for video playback
 * Only works in Tauri desktop mode
 */
export async function convertToAssetUrl(filePath: string): Promise<string> {
    if (!isTauriApp) {
        throw new Error('convertToAssetUrl can only be called in Tauri desktop mode');
    }

    const { convertFileSrc } = await import('@tauri-apps/api/core');
    return convertFileSrc(filePath);
}

/**
 * Opens a native file dialog to select video files
 * Returns array of file paths
 */
export async function selectVideoFiles(): Promise<string[] | null> {
    if (!isTauriApp) return null;

    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
        multiple: true,
        filters: [{
            name: 'Video Files',
            extensions: ['mp4', 'mpg', 'mpeg', 'avi', 'mkv', 'mov', 'wmv']
        }]
    });

    if (!selected) return null;
    return Array.isArray(selected) ? selected : [selected];
}

/**
 * Opens a native file dialog to select an audio file
 * Returns file path
 */
export async function selectAudioFile(): Promise<string | null> {
    if (!isTauriApp) return null;

    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
        multiple: false,
        filters: [{
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'aac', 'flac', 'ogg']
        }]
    });

    return typeof selected === 'string' ? selected : null;
}

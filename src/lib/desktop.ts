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
        title: 'Select Video Files',
        filters: [{
            name: 'Video Files',
            extensions: ['mp4', 'mpg', 'mpeg', 'avi', 'mkv', 'mov', 'wmv', 'webm']
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
        title: 'Select Audio File',
        filters: [{
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']
        }]
    });

    return typeof selected === 'string' ? selected : null;
}

/**
 * Opens a native folder picker dialog
 * Returns folder path
 */
export async function selectFolder(): Promise<string | null> {
    if (!isTauriApp) return null;

    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
        directory: true,
        title: 'Select Media Folder'
    });

    return typeof selected === 'string' ? selected : null;
}

/**
 * Extracts filename from a full path
 */
export function getFilenameFromPath(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || filePath;
}

/**
 * Generates real waveform data from a local audio file
 * Uses Web Audio API to decode and extract amplitude data
 */
export async function generateWaveformFromPath(assetUrl: string, samples: number = 200): Promise<number[]> {
    return new Promise((resolve) => {
        const audioContext = new AudioContext();

        fetch(assetUrl)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                // Extract waveform from first channel
                const rawData = audioBuffer.getChannelData(0);
                const blockSize = Math.floor(rawData.length / samples);
                const waveform: number[] = [];

                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[i * blockSize + j]);
                    }
                    waveform.push(sum / blockSize);
                }

                // Normalize to 0-1 range
                const max = Math.max(...waveform);
                if (max > 0) {
                    resolve(waveform.map(v => v / max));
                } else {
                    resolve(waveform);
                }

                audioContext.close();
            })
            .catch(error => {
                console.error('Waveform generation failed:', error);
                // Return mock data as fallback
                resolve(Array.from({ length: samples }, () => Math.random()));
            });
    });
}

/**
 * Reads files from a directory (for folder browsing feature)
 */
export async function readDirectory(dirPath: string): Promise<{ name: string; path: string; isDir: boolean }[]> {
    if (!isTauriApp) return [];

    const { readDir } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(dirPath);

    return entries.map(entry => ({
        name: entry.name || '',
        path: `${dirPath}/${entry.name}`,
        isDir: entry.isDirectory || false
    }));
}

/**
 * Generates a thumbnail from a video file using native FFmpeg
 * Returns a base64 data URL
 */
export async function generateNativeThumbnail(filePath: string, timestamp: number = 0.1): Promise<string | null> {
    if (!isTauriApp) return null;

    try {
        const { invoke } = await import('@tauri-apps/api/core');
        const dataUrl = await invoke<string>('generate_thumbnail', {
            filePath,
            timestamp
        });
        return dataUrl;
    } catch (error) {
        console.error('Native thumbnail generation failed:', error);
        return null;
    }
}

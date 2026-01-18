/**
 * Proxy Video Manager
 * Handles generation and caching of low-quality proxy videos for smooth timeline preview
 */

import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import { PreviewQuality, ProxySettings } from '@/types';

// Resolution settings for each quality level
const QUALITY_SETTINGS: Record<PreviewQuality, { width: number; height: number; bitrate: string }> = {
    '360p': { width: 640, height: 360, bitrate: '500k' },
    '480p': { width: 854, height: 480, bitrate: '1000k' },
    '720p': { width: 1280, height: 720, bitrate: '2500k' },
};

// Mapping of original file paths to proxy paths
const proxyCache = new Map<string, string>();

/**
 * Get the proxy directory path
 */
export async function getProxyDir(): Promise<string> {
    const appData = await appDataDir();
    return await join(appData, 'proxies');
}

/**
 * Ensure proxy directory exists
 */
export async function ensureProxyDir(): Promise<string> {
    const proxyDir = await getProxyDir();
    const dirExists = await exists(proxyDir);
    if (!dirExists) {
        await mkdir(proxyDir, { recursive: true });
    }
    return proxyDir;
}

/**
 * Generate a proxy filename from the original path
 */
function getProxyFilename(originalPath: string, quality: PreviewQuality): string {
    // Extract filename and create unique proxy name
    const parts = originalPath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    const baseName = filename.replace(/\.[^.]+$/, ''); // Remove extension
    const hash = simpleHash(originalPath);
    return `${baseName}_${hash}_${quality}.mp4`;
}

/**
 * Simple hash function for creating unique identifiers
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Check if a proxy already exists for a video
 */
export async function hasProxy(originalPath: string, quality: PreviewQuality): Promise<boolean> {
    const cacheKey = `${originalPath}_${quality}`;
    if (proxyCache.has(cacheKey)) {
        return true;
    }

    try {
        const proxyDir = await getProxyDir();
        const proxyFilename = getProxyFilename(originalPath, quality);
        const proxyPath = await join(proxyDir, proxyFilename);
        const proxyExists = await exists(proxyPath);

        if (proxyExists) {
            proxyCache.set(cacheKey, proxyPath);
        }

        return proxyExists;
    } catch {
        return false;
    }
}

/**
 * Get the proxy path for a video (if it exists)
 */
export async function getProxyPath(originalPath: string, quality: PreviewQuality): Promise<string | null> {
    const cacheKey = `${originalPath}_${quality}`;

    if (proxyCache.has(cacheKey)) {
        return proxyCache.get(cacheKey)!;
    }

    const hasExisting = await hasProxy(originalPath, quality);
    if (hasExisting) {
        return proxyCache.get(cacheKey)!;
    }

    return null;
}

/**
 * Generate a proxy video using FFmpeg
 */
export async function generateProxy(
    originalPath: string,
    quality: PreviewQuality,
    onProgress?: (percent: number) => void
): Promise<string> {
    const proxyDir = await ensureProxyDir();
    const proxyFilename = getProxyFilename(originalPath, quality);
    const outputPath = await join(proxyDir, proxyFilename);

    const settings = QUALITY_SETTINGS[quality];

    console.log(`🎬 PROXY: Generating ${quality} proxy for ${originalPath}`);

    try {
        // Call Rust command to generate proxy via FFmpeg
        await invoke('generate_proxy_video', {
            inputPath: originalPath,
            outputPath: outputPath,
            width: settings.width,
            height: settings.height,
            bitrate: settings.bitrate,
        });

        // Cache the result
        const cacheKey = `${originalPath}_${quality}`;
        proxyCache.set(cacheKey, outputPath);

        console.log(`🎬 PROXY: Successfully generated proxy at ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`🎬 PROXY: Failed to generate proxy:`, error);
        throw error;
    }
}

/**
 * Clear all proxy files
 */
export async function clearAllProxies(): Promise<void> {
    try {
        const proxyDir = await getProxyDir();
        const dirExists = await exists(proxyDir);

        if (dirExists) {
            await remove(proxyDir, { recursive: true });
            await mkdir(proxyDir, { recursive: true });
        }

        proxyCache.clear();
        console.log('🎬 PROXY: Cleared all proxy files');
    } catch (error) {
        console.error('🎬 PROXY: Failed to clear proxies:', error);
        throw error;
    }
}

/**
 * Get proxy storage size in bytes
 */
export async function getProxyStorageSize(): Promise<number> {
    // This would need filesystem stat operations
    // For now, return 0 - can be implemented later
    return 0;
}

/**
 * Convert a local file path to a Tauri asset:// URL
 */
export function pathToAssetUrl(filePath: string): string {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `asset://localhost/${encodeURIComponent(normalizedPath)}`;
}

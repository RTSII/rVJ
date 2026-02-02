/**
 * Persistent thumbnail cache using IndexedDB for cross-session storage.
 * Stores thumbnails locally to avoid regenerating them every time.
 */

const DB_NAME = 'rVJ-ThumbnailCache';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const MAX_AGE_DAYS = 7; // Auto-delete thumbnails older than 7 days

interface ThumbnailCacheEntry {
    id: string; // Clip ID or file path hash
    thumbnail: string; // Base64 data URL
    timestamp: number; // When it was created
    fileSize?: number; // Optional file size for validation
}

class ThumbnailCacheManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the IndexedDB database
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open thumbnail cache DB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Thumbnail cache DB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('✅ Created thumbnail cache object store');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Generate a unique ID for a file (hash of file path or file name + size)
     */
    private generateId(filePath: string, fileSize?: number): string {
        // Simple hash function for file paths
        const str = fileSize ? `${filePath}-${fileSize}` : filePath;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get a thumbnail from the cache
     */
    async get(filePath: string, fileSize?: number): Promise<string | null> {
        try {
            await this.init();
            if (!this.db) return null;

            const id = this.generateId(filePath, fileSize);

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readonly');
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.get(id);

                request.onsuccess = () => {
                    const entry: ThumbnailCacheEntry = request.result;

                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Check if entry is too old
                    const ageInDays = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24);
                    if (ageInDays > MAX_AGE_DAYS) {
                        console.log(`🗑️ Thumbnail cache entry expired for ${filePath}`);
                        this.delete(filePath, fileSize); // Delete expired entry
                        resolve(null);
                        return;
                    }

                    console.log(`✅ Thumbnail cache HIT for ${filePath}`);
                    resolve(entry.thumbnail);
                };

                request.onerror = () => {
                    console.error('Failed to get thumbnail from cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error accessing thumbnail cache:', error);
            return null;
        }
    }

    /**
     * Store a thumbnail in the cache
     */
    async set(filePath: string, thumbnail: string, fileSize?: number): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const id = this.generateId(filePath, fileSize);
            const entry: ThumbnailCacheEntry = {
                id,
                thumbnail,
                timestamp: Date.now(),
                fileSize,
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.put(entry);

                request.onsuccess = () => {
                    console.log(`✅ Thumbnail cached for ${filePath}`);
                    resolve();
                };

                request.onerror = () => {
                    console.error('Failed to cache thumbnail:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error storing thumbnail in cache:', error);
        }
    }

    /**
     * Delete a thumbnail from the cache
     */
    async delete(filePath: string, fileSize?: number): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const id = this.generateId(filePath, fileSize);

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.delete(id);

                request.onsuccess = () => {
                    console.log(`🗑️ Deleted thumbnail cache for ${filePath}`);
                    resolve();
                };

                request.onerror = () => {
                    console.error('Failed to delete thumbnail from cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error deleting thumbnail from cache:', error);
        }
    }

    /**
     * Clear all thumbnails from the cache
     */
    async clearAll(): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.clear();

                request.onsuccess = () => {
                    console.log('🗑️ Cleared all thumbnail cache');
                    resolve();
                };

                request.onerror = () => {
                    console.error('Failed to clear thumbnail cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error clearing thumbnail cache:', error);
        }
    }

    /**
     * Get cache statistics (size, count)
     */
    async getStats(): Promise<{ count: number; totalSize: number }> {
        try {
            await this.init();
            if (!this.db) return { count: 0, totalSize: 0 };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readonly');
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.getAll();

                request.onsuccess = () => {
                    const entries: ThumbnailCacheEntry[] = request.result;
                    const count = entries.length;
                    const totalSize = entries.reduce((sum, entry) => sum + entry.thumbnail.length, 0);

                    resolve({ count, totalSize });
                };

                request.onerror = () => {
                    console.error('Failed to get cache stats:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { count: 0, totalSize: 0 };
        }
    }

    /**
     * Clean up old entries (older than MAX_AGE_DAYS)
     */
    async cleanup(): Promise<number> {
        try {
            await this.init();
            if (!this.db) return 0;

            const maxAge = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
            let deletedCount = 0;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const objectStore = transaction.objectStore(STORE_NAME);
                const index = objectStore.index('timestamp');
                const request = index.openCursor(IDBKeyRange.upperBound(maxAge));

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        console.log(`🗑️ Cleaned up ${deletedCount} old thumbnails`);
                        resolve(deletedCount);
                    }
                };

                request.onerror = () => {
                    console.error('Failed to cleanup old thumbnails:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error cleaning up thumbnail cache:', error);
            return 0;
        }
    }
}

// Export a singleton instance
export const thumbnailCache = new ThumbnailCacheManager();

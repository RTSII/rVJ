import { useEffect, useState, useCallback, useRef } from 'react';

export interface MemoryStats {
    usedJSHeapSize: number; // Bytes used by JS heap
    totalJSHeapSize: number; // Total JS heap size
    jsHeapSizeLimit: number; // Maximum heap size
    usedPercent: number; // Percentage of heap used
    isAvailable: boolean; // Whether memory API is available
}

export interface MemoryMonitorConfig {
    warningThreshold?: number; // Percent at which to warn (default: 80)
    criticalThreshold?: number; // Percent at which it's critical (default: 90)
    pollInterval?: number; // How often to check memory in ms (default: 5000)
    onWarning?: (stats: MemoryStats) => void;
    onCritical?: (stats: MemoryStats) => void;
}

/**
 * Hook to monitor browser memory usage and trigger warnings
 * when thresholds are exceeded. Useful for preventing out-of-memory
 * crashes during video editing.
 */
export const useMemoryMonitor = (config: MemoryMonitorConfig = {}) => {
    const {
        warningThreshold = 80,
        criticalThreshold = 90,
        pollInterval = 5000,
        onWarning,
        onCritical,
    } = config;

    const [memoryStats, setMemoryStats] = useState<MemoryStats>({
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usedPercent: 0,
        isAvailable: false,
    });

    // Use refs to prevent infinite loop
    const warningTriggeredRef = useRef(false);
    const criticalTriggeredRef = useRef(false);

    const checkMemory = useCallback(() => {
        // Check if Performance.memory API is available (Chromium browsers)
        if ('memory' in performance && (performance as any).memory) {
            const memory = (performance as any).memory;

            const usedJSHeapSize = memory.usedJSHeapSize;
            const totalJSHeapSize = memory.totalJSHeapSize;
            const jsHeapSizeLimit = memory.jsHeapSizeLimit;
            const usedPercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

            const stats: MemoryStats = {
                usedJSHeapSize,
                totalJSHeapSize,
                jsHeapSizeLimit,
                usedPercent,
                isAvailable: true,
            };

            setMemoryStats(stats);

            // Check thresholds and trigger callbacks
            if (usedPercent >= criticalThreshold && !criticalTriggeredRef.current) {
                console.error('🚨 MEMORY CRITICAL:', usedPercent.toFixed(1), '%');
                criticalTriggeredRef.current = true;
                onCritical?.(stats);
            } else if (usedPercent >= warningThreshold && usedPercent < criticalThreshold && !warningTriggeredRef.current) {
                console.warn('⚠️ MEMORY WARNING:', usedPercent.toFixed(1), '%');
                warningTriggeredRef.current = true;
                onWarning?.(stats);
            } else if (usedPercent < warningThreshold) {
                // Reset warning flags when memory drops below threshold
                warningTriggeredRef.current = false;
                criticalTriggeredRef.current = false;
            }
        } else {
            // Memory API not available (Firefox, Safari)
            setMemoryStats({
                usedJSHeapSize: 0,
                totalJSHeapSize: 0,
                jsHeapSizeLimit: 0,
                usedPercent: 0,
                isAvailable: false,
            });
        }
    }, [warningThreshold, criticalThreshold, onWarning, onCritical]);

    // Poll memory usage at regular intervals
    useEffect(() => {
        checkMemory(); // Initial check

        const interval = setInterval(checkMemory, pollInterval);

        return () => {
            clearInterval(interval);
        };
    }, [checkMemory, pollInterval]);

    // Helper to format bytes to human-readable format
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    // Manually trigger garbage collection (only works in dev with --expose-gc flag)
    const requestGarbageCollection = useCallback(() => {
        if (typeof (window as any).gc === 'function') {
            console.log('🗑️ Manually triggering garbage collection');
            (window as any).gc();
        } else {
            console.warn('⚠️ Manual GC not available. Run with --expose-gc flag in development.');
        }
    }, []);

    return {
        memoryStats,
        formatBytes,
        requestGarbageCollection,
        checkMemory,
        isWarning: memoryStats.usedPercent >= warningThreshold && memoryStats.usedPercent < criticalThreshold,
        isCritical: memoryStats.usedPercent >= criticalThreshold,
    };
};

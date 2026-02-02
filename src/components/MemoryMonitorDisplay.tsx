import React from 'react';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import { Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MemoryMonitorDisplayProps {
    alwaysShow?: boolean; // Show even when memory is healthy
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Visual memory usage indicator that appears when memory usage is high.
 * Helps users monitor app performance and prevent crashes.
 */
export const MemoryMonitorDisplay: React.FC<MemoryMonitorDisplayProps> = ({
    alwaysShow = false,
    position = 'bottom-right',
}) => {
    const { memoryStats, formatBytes, isWarning, isCritical, requestGarbageCollection } = useMemoryMonitor({
        warningThreshold: 75,
        criticalThreshold: 90,
        pollInterval: 3000,
        onWarning: (stats) => {
            toast.warning('Memory usage is high', {
                description: `${stats.usedPercent.toFixed(1)}% of available memory in use`,
            });
        },
        onCritical: (stats) => {
            toast.error('Memory usage critical!', {
                description: `${stats.usedPercent.toFixed(1)}% - Consider closing other tabs or reducing media`,
                duration: 10000,
            });
        },
    });

    // Only show if memory API is available and we're above threshold (or alwaysShow is true)
    if (!memoryStats.isAvailable || (!alwaysShow && !isWarning && !isCritical)) {
        return null;
    }

    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    const getStatusColor = () => {
        if (isCritical) return 'text-red-400 bg-red-500/10 border-red-500/30';
        if (isWarning) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-green-400 bg-green-500/10 border-green-500/30';
    };

    const getIcon = () => {
        if (isCritical) return <AlertCircle className="h-4 w-4" />;
        if (isWarning) return <AlertTriangle className="h-4 w-4" />;
        return <Activity className="h-4 w-4" />;
    };

    return (
        <div className={`fixed ${positionClasses[position]} z-50 pointer-events-auto`}>
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md text-xs font-mono ${getStatusColor()} transition-all duration-300`}
                onClick={requestGarbageCollection}
                title="Click to request garbage collection (dev mode only)"
            >
                {getIcon()}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Memory:</span>
                        <span>{memoryStats.usedPercent.toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] opacity-75">
                        {formatBytes(memoryStats.usedJSHeapSize)} / {formatBytes(memoryStats.jsHeapSizeLimit)}
                    </div>
                </div>

                {/* Visual progress bar */}
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden ml-1">
                    <div
                        className={`h-full transition-all duration-500 ${isCritical ? 'bg-red-400' : isWarning ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${memoryStats.usedPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MemoryMonitorDisplay;

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Trash2, HardDrive } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { clearAllProxies } from '@/lib/proxyManager';
import { toast } from 'sonner';
import { PreviewQuality } from '@/types';

const ProxySettings = () => {
    const { proxySettings, setProxyQuality, setProxySettings } = useEditorStore();
    const [isClearing, setIsClearing] = React.useState(false);
    const [open, setOpen] = React.useState(false);

    const handleClearProxies = async () => {
        setIsClearing(true);
        try {
            await clearAllProxies();
            toast.success('All proxy files cleared');
        } catch (error) {
            toast.error('Failed to clear proxies');
            console.error(error);
        } finally {
            setIsClearing(false);
        }
    };

    const qualityDescriptions: Record<PreviewQuality, string> = {
        '360p': 'Draft - Fastest, ~5MB/min',
        '480p': 'Standard - Balanced (Default)',
        '720p': 'High - Better quality, ~40MB/min',
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Preview Settings">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Preview Quality Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure proxy video settings for optimized timeline preview.
                        Lower quality = faster playback, higher quality = better preview.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Quality Selector */}
                    <div className="grid gap-2">
                        <Label htmlFor="quality">Preview Quality</Label>
                        <Select
                            value={proxySettings.quality}
                            onValueChange={(value) => setProxyQuality(value as PreviewQuality)}
                        >
                            <SelectTrigger id="quality">
                                <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="360p">
                                    <div className="flex flex-col">
                                        <span>360p - Draft</span>
                                        <span className="text-xs text-muted-foreground">Fastest, ~5MB/min</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="480p">
                                    <div className="flex flex-col">
                                        <span>480p - Standard ⭐</span>
                                        <span className="text-xs text-muted-foreground">Balanced, ~15MB/min</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="720p">
                                    <div className="flex flex-col">
                                        <span>720p - High</span>
                                        <span className="text-xs text-muted-foreground">Better quality, ~40MB/min</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {qualityDescriptions[proxySettings.quality]}
                        </p>
                    </div>

                    {/* Storage Options */}
                    <div className="grid gap-4">
                        <Label>Proxy Storage</Label>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="auto-delete" className="text-sm font-normal">
                                    Auto-delete old proxies
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Remove proxies unused for 7+ days
                                </p>
                            </div>
                            <Switch
                                id="auto-delete"
                                checked={proxySettings.autoDelete}
                                onCheckedChange={(checked) => setProxySettings({ autoDelete: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="temp-folder" className="text-sm font-normal">
                                    Use temp folder
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Auto-cleaned on system restart
                                </p>
                            </div>
                            <Switch
                                id="temp-folder"
                                checked={proxySettings.useTempFolder}
                                onCheckedChange={(checked) => setProxySettings({ useTempFolder: checked })}
                            />
                        </div>
                    </div>

                    {/* Manual Clear */}
                    <div className="pt-2 border-t">
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleClearProxies}
                            disabled={isClearing}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isClearing ? 'Clearing...' : 'Clear All Proxy Files'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            This will delete all cached preview videos
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProxySettings;

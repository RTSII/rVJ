import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Music, Settings2 } from 'lucide-react';
import { useEditorStore } from '@/lib/store';

const BPMControls = () => {
    const { bpmSync, setTargetBPM, setBPMEnabled } = useEditorStore();
    const [localBPM, setLocalBPM] = useState(bpmSync.targetBPM.toString());

    const handleBPMChange = (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 60 && num <= 200) {
            setTargetBPM(num);
            setLocalBPM(value);
        }
    };

    const handleBPMInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalBPM(e.target.value);
    };

    const handleBPMBlur = () => {
        const num = parseInt(localBPM);
        if (isNaN(num) || num < 60 || num > 200) {
            setLocalBPM(bpmSync.targetBPM.toString());
        } else {
            setTargetBPM(num);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${bpmSync.isEnabled
                            ? 'text-purple-400 bg-purple-500/20'
                            : 'text-muted-foreground hover:text-purple-400'
                        }`}
                    title="BPM Sync Settings"
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#0A0715]/95 backdrop-blur-md border-purple-500/30">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-purple-300">
                        <Music className="h-5 w-5" />
                        BPM Sync Settings
                    </DialogTitle>
                    <DialogDescription className="text-purple-400/60">
                        Synchronize video playback to audio tempo
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Enable/Disable BPM Sync */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="bpm-enabled" className="text-purple-300">
                            Enable BPM Sync
                        </Label>
                        <Button
                            id="bpm-enabled"
                            variant={bpmSync.isEnabled ? 'default' : 'outline'}
                            size="sm"
                            className={
                                bpmSync.isEnabled
                                    ? 'bg-purple-500/30 hover:bg-purple-500/40 border-purple-400/50'
                                    : 'border-purple-500/30 hover:bg-purple-500/10'
                            }
                            onClick={() => setBPMEnabled(!bpmSync.isEnabled)}
                        >
                            {bpmSync.isEnabled ? 'ON' : 'OFF'}
                        </Button>
                    </div>

                    {/* Target BPM */}
                    <div className="grid gap-2">
                        <Label htmlFor="target-bpm" className="text-purple-300">
                            Target BPM
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="target-bpm"
                                type="number"
                                min="60"
                                max="200"
                                value={localBPM}
                                onChange={handleBPMInput}
                                onBlur={handleBPMBlur}
                                className="bg-[#0D0A1A]/80 border-purple-500/30 text-purple-300"
                            />
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500/30 hover:bg-purple-500/10"
                                    onClick={() => handleBPMChange((bpmSync.targetBPM - 5).toString())}
                                >
                                    -5
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500/30 hover:bg-purple-500/10"
                                    onClick={() => handleBPMChange((bpmSync.targetBPM + 5).toString())}
                                >
                                    +5
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-purple-400/60">Range: 60-200 BPM</p>
                    </div>

                    {/* Detected BPM (read-only for now) */}
                    <div className="grid gap-2">
                        <Label className="text-purple-300">Detected BPM</Label>
                        <div className="flex items-center justify-between bg-[#0D0A1A]/80 border border-purple-500/30 rounded-md px-3 py-2">
                            <span className="text-purple-400">{bpmSync.detectedBPM} BPM</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-cyan-400 hover:bg-cyan-500/10"
                                onClick={() => setTargetBPM(bpmSync.detectedBPM)}
                            >
                                Use Detected
                            </Button>
                        </div>
                    </div>

                    {/* Quantize Mode */}
                    <div className="grid gap-2">
                        <Label htmlFor="quantize-mode" className="text-purple-300">
                            Quantize Mode
                        </Label>
                        <Select defaultValue={bpmSync.quantizeMode}>
                            <SelectTrigger
                                id="quantize-mode"
                                className="bg-[#0D0A1A]/80 border-purple-500/30 text-purple-300"
                            >
                                <SelectValue placeholder="Select quantize mode" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A0715]/95 border-purple-500/30">
                                <SelectItem value="beat">Beat (1/4 note)</SelectItem>
                                <SelectItem value="bar">Bar (4 beats)</SelectItem>
                                <SelectItem value="phrase">Phrase (8 beats)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-purple-400/60">
                            Snap clip edits to musical timing
                        </p>
                    </div>

                    {/* Info */}
                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-md">
                        <p className="text-xs text-purple-300/80">
                            <strong>How it works:</strong> BPM sync automatically adjusts video playback
                            speed to match the audio tempo. Enable this for music videos or rhythmic
                            content.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BPMControls;

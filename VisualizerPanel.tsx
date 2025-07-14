import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Download, AudioWaveform } from 'lucide-react';
import { VisualizerCanvas } from './visualizers/VisualizerCanvas';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useEditorStore } from '@/lib/store';

const VISUALIZER_EFFECTS = [
  { id: 'frequency-bars', name: 'Frequency Bars', description: 'Classic spectrum analyzer bars' },
  { id: 'tunnel', name: 'Tunnel Vision', description: 'Hypnotic tunnel with geometric patterns' },
  { id: 'plasma', name: 'Plasma Bursts', description: 'Colorful plasma bursts on black background' }
];

export const VisualizerPanel: React.FC = () => {
  const [selectedEffect, setSelectedEffect] = useState('frequency-bars');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const { audioFile, isPlaying, setIsPlaying } = useEditorStore();
  const audioData = useAudioAnalysis(audioRef.current);

  useEffect(() => {
    if (audioFile && audioRef.current) {
      const url = URL.createObjectURL(audioFile);
      audioRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const startRecording = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(60); // 60 FPS
      
      // Add audio track if available
      if (audioRef.current && 'captureStream' in audioRef.current) {
        try {
          const audioStream = (audioRef.current as any).captureStream();
          audioStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
            stream.addTrack(track);
          });
        } catch (error) {
          console.warn('Audio capture not supported:', error);
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualizer-${selectedEffect}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        setIsRecording(false);
        setRecordingProgress(0);
      };

      mediaRecorderRef.current.start(1000); // 1 second chunks
      setIsRecording(true);
      
      // Start progress tracking
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed / (audioRef.current?.duration || 1) / 1000) * 100;
        setRecordingProgress(Math.min(progress, 100));
        
        if (!isRecording) {
          clearInterval(progressInterval);
        }
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioWaveform className="w-5 h-5" />
          Audio Visualizer
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Effect Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Visualizer Effect</label>
            <Select value={selectedEffect} onValueChange={setSelectedEffect}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISUALIZER_EFFECTS.map((effect) => (
                  <SelectItem key={effect.id} value={effect.id}>
                    <div>
                      <div className="font-medium">{effect.name}</div>
                      <div className="text-xs text-muted-foreground">{effect.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              disabled={!audioFile}
              variant="outline"
              size="sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!audioFile || !isPlaying}
              variant={isRecording ? "destructive" : "default"}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {isRecording ? 'Stop Recording' : 'Record Video'}
            </Button>
          </div>

          {/* Recording Progress */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Recording...</span>
                <span>{Math.round(recordingProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${recordingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Audio Info */}
          {audioData && (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">Bass</div>
                <div className={`p-1 rounded ${audioData.bass > 0.3 ? 'bg-red-500' : 'bg-muted'}`}>
                  {Math.round(audioData.bass * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Mid</div>
                <div className={`p-1 rounded ${audioData.mid > 0.3 ? 'bg-yellow-500' : 'bg-muted'}`}>
                  {Math.round(audioData.mid * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Treble</div>
                <div className={`p-1 rounded ${audioData.treble > 0.3 ? 'bg-blue-500' : 'bg-muted'}`}>
                  {Math.round(audioData.treble * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Beat</div>
                <div className={`p-1 rounded ${audioData.beatDetected ? 'bg-green-500' : 'bg-muted'}`}>
                  {audioData.beatDetected ? '🥁' : '⚫'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualizer Canvas */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video w-full">
            <VisualizerCanvas 
              audioData={audioData} 
              effect={selectedEffect}
              width={800}
              height={450}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
};
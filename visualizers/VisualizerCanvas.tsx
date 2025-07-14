import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { AudioAnalysisData } from '@/hooks/useAudioAnalysis';
import { FrequencyBars } from './effects/FrequencyBars';
import { TunnelEffect } from './effects/TunnelEffect';
import { PlasmaField } from './effects/PlasmaField';

interface VisualizerCanvasProps {
  audioData: AudioAnalysisData | null;
  effect: string;
  width?: number;
  height?: number;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  audioData,
  effect,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderEffect = () => {
    switch (effect) {
      case 'frequency-bars':
        return <FrequencyBars audioData={audioData} />;
      case 'tunnel':
        return <TunnelEffect audioData={audioData} />;
      case 'plasma':
        return <PlasmaField audioData={audioData} />;
      default:
        return <FrequencyBars audioData={audioData} />;
    }
  };

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        style={{ width, height }}
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.2} />
        {renderEffect()}
      </Canvas>
    </div>
  );
};
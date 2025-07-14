import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AudioAnalysisData } from '@/hooks/useAudioAnalysis';
import * as THREE from 'three';

interface FrequencyBarsProps {
  audioData: AudioAnalysisData | null;
}

export const FrequencyBars: React.FC<FrequencyBarsProps> = ({ audioData }) => {
  const groupRef = useRef<THREE.Group>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  
  const barCount = 64;
  
  // Create bar geometries and materials
  const bars = useMemo(() => {
    const barArray = [];
    for (let i = 0; i < barCount; i++) {
      const hue = (i / barCount) * 360;
      barArray.push({
        geometry: new THREE.BoxGeometry(0.1, 1, 0.1),
        material: new THREE.MeshBasicMaterial({ 
          color: new THREE.Color().setHSL(hue / 360, 1, 0.5)
        }),
        position: [(i - barCount / 2) * 0.15, 0, 0]
      });
    }
    return barArray;
  }, []);

  useFrame(() => {
    if (!audioData || !barsRef.current) return;
    
    const frequencyData = audioData.frequencyData;
    const dataStep = Math.floor(frequencyData.length / barCount);
    
    barsRef.current.forEach((bar, index) => {
      if (bar) {
        const dataIndex = index * dataStep;
        const value = frequencyData[dataIndex] / 255;
        
        // Animate height and color intensity
        bar.scale.y = Math.max(0.1, value * 3);
        
        // Pulsing color effect
        const hue = ((index / barCount) * 360 + Date.now() * 0.1) % 360;
        const saturation = 0.8 + value * 0.2;
        const lightness = 0.3 + value * 0.4;
        
        (bar.material as THREE.MeshBasicMaterial).color.setHSL(
          hue / 360, 
          saturation, 
          lightness
        );
      }
    });
    
    // Rotate the entire group based on sub-bass (kick drums)
    if (groupRef.current) {
      groupRef.current.rotation.y += audioData.subBass * 0.03;
      // Add beat-reactive zoom effect
      if (audioData.beatDetected) {
        groupRef.current.scale.setScalar(1.2);
      } else {
        groupRef.current.scale.lerp({ x: 1, y: 1, z: 1 } as any, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {bars.map((bar, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) barsRef.current[index] = el;
          }}
          geometry={bar.geometry}
          material={bar.material}
          position={bar.position}
        />
      ))}
    </group>
  );
};
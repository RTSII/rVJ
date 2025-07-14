import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AudioAnalysisData } from '@/hooks/useAudioAnalysis';
import * as THREE from 'three';

interface TunnelEffectProps {
  audioData: AudioAnalysisData | null;
}

export const TunnelEffect: React.FC<TunnelEffectProps> = ({ audioData }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Mesh[]>([]);
  
  const ringCount = 50;
  
  const rings = useMemo(() => {
    const ringArray = [];
    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.RingGeometry(0.5, 1, 32);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(i / ringCount, 1, 0.5),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      ringArray.push({
        geometry,
        material,
        position: [0, 0, -i * 2]
      });
    }
    return ringArray;
  }, []);

  useFrame((state) => {
    if (!audioData || !groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    // Use sub-bass for kick drum detection and bass for bass synths
    const subBassIntensity = audioData.subBass;
    const bassIntensity = audioData.bass;
    const energy = audioData.energy;
    
    ringsRef.current.forEach((ring, index) => {
      if (ring) {
        // Move rings towards camera with kick drum acceleration - geometric patterns in sync
        const kickMovement = 0.2 + subBassIntensity * 1.2 + bassIntensity * 0.4;
        ring.position.z += kickMovement;
        
        // Reset ring position when it passes camera
        if (ring.position.z > 5) {
          ring.position.z = -ringCount * 2;
        }
        
        // Kick-reactive concentric circle scaling - geometric patterns
        const kickScale = 1 + subBassIntensity * 1.5 + bassIntensity * 0.8;
        const geometricPulse = Math.sin(time * 4 + index * 0.5) * 0.1;
        ring.scale.setScalar(kickScale + geometricPulse);
        
        // Much slower color transitions - 32 beats/4 bars (assuming 128 BPM = ~2 beats/sec, so 16 seconds)
        const slowHue = (time * 0.0625 + index * 0.005) % 1; // 16x slower color cycling
        const saturation = 0.9 + energy * 0.1;
        const lightness = 0.5 + audioData.treble * 0.3;
        
        (ring.material as THREE.MeshBasicMaterial).color.setHSL(slowHue, saturation, lightness);
        
        // Kick-synced rotation for geometric movement
        ring.rotation.z += 0.005 + subBassIntensity * 0.3 + (audioData.beatDetected ? 0.15 : 0);
      }
    });
    
    // Subtle camera movement
    if (groupRef.current) {
      groupRef.current.rotation.z += energy * 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) ringsRef.current[index] = el;
          }}
          geometry={ring.geometry}
          material={ring.material}
          position={ring.position}
        />
      ))}
    </group>
  );
};
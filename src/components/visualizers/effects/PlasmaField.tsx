import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AudioAnalysisData } from '@/hooks/useAudioAnalysis';
import * as THREE from 'three';

interface PlasmaFieldProps {
  audioData: AudioAnalysisData | null;
}

export const PlasmaField: React.FC<PlasmaFieldProps> = ({ audioData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 20, 128, 128);
    
    // Plasma burst shader material with black background
    const material = new THREE.ShaderMaterial({
        uniforms: {
        time: { value: 0 },
        subBass: { value: 0 },
        bass: { value: 0 },
        mid: { value: 0 },
        treble: { value: 0 },
        energy: { value: 0 },
        beat: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float subBass;
        uniform float bass;
        uniform float energy;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Audio-reactive vertex displacement for plasma bursts
          float burst = subBass * 3.0 + bass * 1.5;
          float wave = sin(pos.x * 2.0 + time * 3.0) * cos(pos.y * 2.0 + time * 2.0);
          pos.z += wave * burst * 0.8;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float subBass;
        uniform float bass;
        uniform float mid;
        uniform float treble;
        uniform float energy;
        uniform float beat;
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          vec2 uv = vUv - 0.5; // Center UV coordinates
          float t = time * 0.5;
          
          // Create distinct burst centers for different frequency ranges
          vec2 kickCenter = vec2(sin(t * 0.3) * 0.4, cos(t * 0.4) * 0.3);
          vec2 bassCenter = vec2(cos(t * 0.6) * 0.3, sin(t * 0.5) * 0.4);
          vec2 midCenter = vec2(sin(t * 0.8) * 0.2, cos(t * 0.7) * 0.2);
          vec2 trebleCenter = vec2(cos(t * 1.2) * 0.15, sin(t * 1.1) * 0.15);
          
          // Distance calculations
          float kickDist = length(uv - kickCenter);
          float bassDist = length(uv - bassCenter);
          float midDist = length(uv - midCenter);
          float trebleDist = length(uv - trebleCenter);
          
          // Audio-reactive burst intensities
          float kickIntensity = (subBass * 12.0 + beat * 8.0);
          float bassIntensity = bass * 10.0;
          float midIntensity = mid * 6.0;
          float trebleIntensity = treble * 4.0;
          
          // Create distinct plasma bursts for each frequency range
          float kickBurst = kickIntensity * sin(kickDist * 8.0 - t * 3.0) * exp(-kickDist * 1.5);
          float bassBurst = bassIntensity * sin(bassDist * 10.0 - t * 4.0) * exp(-bassDist * 2.0);
          float midBurst = midIntensity * sin(midDist * 15.0 - t * 5.0) * exp(-midDist * 3.0);
          float trebleBurst = trebleIntensity * sin(trebleDist * 25.0 - t * 8.0) * exp(-trebleDist * 4.0);
          
          // Color mapping for different frequency ranges
          vec3 kickColor = vec3(1.0, 0.3, 0.0);    // Red-orange for kick/sub-bass
          vec3 bassColor = vec3(1.0, 0.8, 0.0);    // Yellow for bass
          vec3 midColor = vec3(0.0, 1.0, 0.3);     // Green for mids
          vec3 trebleColor = vec3(0.3, 0.7, 1.0);  // Blue for treble
          
          // Combine colored bursts
          vec3 finalColor = vec3(0.0);
          finalColor += kickColor * max(0.0, kickBurst);
          finalColor += bassColor * max(0.0, bassBurst);
          finalColor += midColor * max(0.0, midBurst);
          finalColor += trebleColor * max(0.0, trebleBurst);
          
          // Add ambient plasma when no audio
          float ambientPlasma = 0.3 * sin(length(uv) * 5.0 - t * 2.0) * exp(-length(uv) * 1.0);
          finalColor += vec3(1.0, 0.8, 0.2) * max(0.0, ambientPlasma);
          
          // Enhanced glow effect
          float glow = length(finalColor);
          finalColor += finalColor * glow * 0.5;
          
          // Black background with smooth falloff
          float brightness = length(finalColor);
          brightness = smoothstep(0.05, 0.6, brightness);
          
          gl_FragColor = vec4(finalColor * brightness, 1.0);
        }
      `,
      transparent: true
    });
    
    return { geometry, material };
  }, []);

  useFrame((state) => {
    if (!audioData || !meshRef.current) return;
    
    const material = meshRef.current.material as THREE.ShaderMaterial;
    const time = state.clock.elapsedTime;
    
    // Update shader uniforms with audio data
    material.uniforms.time.value = time;
    material.uniforms.subBass.value = audioData.subBass;
    material.uniforms.bass.value = audioData.bass;
    material.uniforms.mid.value = audioData.mid;
    material.uniforms.treble.value = audioData.treble;
    material.uniforms.energy.value = audioData.energy;
    material.uniforms.beat.value = audioData.beatDetected ? 1.0 : 0.0;
    
    // Rotate the plasma field
    meshRef.current.rotation.z = time * 0.1 + audioData.energy * 0.5;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
};
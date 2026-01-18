import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, RoundedBox, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// Rotating center sphere with space gradient
const CenterSphere = () => {
    const sphereRef = useRef<THREE.Mesh>(null);

    // Create space-like gradient texture
    const gradientTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Create radial gradient (cyan → purple → magenta)
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#0D0A1A'); // Dark center
        gradient.addColorStop(0.3, '#1E1632'); // Purple
        gradient.addColorStop(0.6, '#FF2D92'); // Magenta
        gradient.addColorStop(1, '#00F0FF'); // Cyan edge

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        return new THREE.CanvasTexture(canvas);
    }, []);

    // Rotate sphere
    useFrame((state) => {
        if (sphereRef.current) {
            sphereRef.current.rotation.y += 0.002;
            sphereRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    return (
        <group>
            <Sphere ref={sphereRef} args={[1.2, 64, 64]}>
                <meshStandardMaterial
                    map={gradientTexture}
                    metalness={0.8}
                    roughness={0.2}
                    emissive="#FF2D92"
                    emissiveIntensity={0.3}
                />
            </Sphere>

            {/* RVJ Text overlay */}
            <Html center distanceFactor={1.5}>
                <div className="text-5xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif', userSelect: 'none' }}>
                    RVJ
                </div>
            </Html>
        </group>
    );
};

// Outer ring with subtle pulse
const OuterRing = () => {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ringRef.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
            ringRef.current.scale.setScalar(scale);
        }
    });

    return (
        <Torus ref={ringRef} args={[2, 0.05, 16, 100]}>
            <meshStandardMaterial
                color="#00F0FF"
                emissive="#00F0FF"
                emissiveIntensity={0.5}
                metalness={0.9}
                roughness={0.1}
            />
        </Torus>
    );
};

// Middle ring with gradient
const MiddleRing = () => {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
        }
    });

    return (
        <Torus ref={ringRef} args={[1.6, 0.03, 16, 100]}>
            <meshStandardMaterial
                color="#A855F7"
                emissive="#A855F7"
                emissiveIntensity={0.4}
                metalness={0.8}
                roughness={0.2}
            />
        </Torus>
    );
};

// Headphone cup (left)
const HeadphoneCupLeft = () => {
    const cupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (cupRef.current) {
            const intensity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
            const material = (cupRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = intensity;
        }
    });

    return (
        <group ref={cupRef} position={[-2.5, 0, 0]}>
            <RoundedBox args={[0.8, 1.2, 0.6]} radius={0.1}>
                <meshStandardMaterial
                    color="#00F0FF"
                    emissive="#00F0FF"
                    emissiveIntensity={0.5}
                    metalness={0.7}
                    roughness={0.3}
                />
            </RoundedBox>
        </group>
    );
};

// Headphone cup (right)
const HeadphoneCupRight = () => {
    const cupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (cupRef.current) {
            // Offset pulse from left cup
            const intensity = 0.3 + Math.sin(state.clock.elapsedTime * 3 + Math.PI) * 0.3;
            const material = (cupRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = intensity;
        }
    });

    return (
        <group ref={cupRef} position={[2.5, 0, 0]}>
            <RoundedBox args={[0.8, 1.2, 0.6]} radius={0.1}>
                <meshStandardMaterial
                    color="#FF2D92"
                    emissive="#FF2D92"
                    emissiveIntensity={0.5}
                    metalness={0.7}
                    roughness={0.3}
                />
            </RoundedBox>
        </group>
    );
};

// Corner node (pulsing dot)
const CornerNode = ({ position }: { position: [number, number, number] }) => {
    const nodeRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (nodeRef.current) {
            const scale = 0.8 + Math.sin(state.clock.elapsedTime * 4 + position[0]) * 0.4;
            nodeRef.current.scale.setScalar(scale);
        }
    });

    return (
        <Sphere ref={nodeRef} args={[0.1, 16, 16]} position={position}>
            <meshStandardMaterial
                color="#00F0FF"
                emissive="#00F0FF"
                emissiveIntensity={0.8}
            />
        </Sphere>
    );
};

// Main 3D Logo Scene
export const Logo3D = ({ className = '' }: { className?: string }) => {
    return (
        <div className={`w-full h-full ${className}`}>
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                {/* Lighting */}
                <ambientLight intensity={0.3} />
                <pointLight position={[5, 5, 5]} intensity={1} color="#00F0FF" />
                <pointLight position={[-5, -5, 5]} intensity={0.8} color="#FF2D92" />
                <spotLight position={[0, 10, 0]} intensity={0.5} color="#A855F7" angle={0.3} penumbra={1} />

                {/* Logo components */}
                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
                    <CenterSphere />
                    <OuterRing />
                    <MiddleRing />
                    <HeadphoneCupLeft />
                    <HeadphoneCupRight />

                    {/* Corner nodes */}
                    <CornerNode position={[2.8, 2.8, 0]} />
                    <CornerNode position={[-2.8, 2.8, 0]} />
                    <CornerNode position={[2.8, -2.8, 0]} />
                    <CornerNode position={[-2.8, -2.8, 0]} />
                </Float>

                {/* Background particles/stars effect */}
                <mesh position={[0, 0, -10]}>
                    <planeGeometry args={[50, 50]} />
                    <meshBasicMaterial color="#0D0A1A" />
                </mesh>
            </Canvas>
        </div>
    );
};

export default Logo3D;

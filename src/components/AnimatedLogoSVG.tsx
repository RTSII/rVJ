import React from 'react';

export const AnimatedLogoSVG = ({ size = 48, className = '' }: { size?: number; className?: string }) => {
    return (
        <div className={`animated-logo-container ${className}`} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                <defs>
                    {/* Gradient definitions */}
                    <radialGradient id="sphereGradient">
                        <stop offset="0%" stopColor="#0D0A1A" />
                        <stop offset="30%" stopColor="#1E1632" />
                        <stop offset="60%" stopColor="#FF2D92" />
                        <stop offset="100%" stopColor="#00F0FF" />
                    </radialGradient>

                    <linearGradient id="ringGradient" gradientTransform="rotate(45)">
                        <stop offset="0%" stopColor="#00F0FF" />
                        <stop offset="50%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#FF2D92" />
                    </linearGradient>

                    {/* Glow filters */}
                    <filter id="glow-cyan">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="glow-magenta">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Outer frame */}
                <rect
                    x="10"
                    y="10"
                    width="180"
                    height="180"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="2"
                    rx="20"
                    className="outer-frame"
                />

                {/* Corner nodes */}
                <circle cx="20" cy="20" r="4" fill="#00F0FF" className="corner-node pulse-glow" filter="url(#glow-cyan)" />
                <circle cx="180" cy="20" r="4" fill="#00F0FF" className="corner-node pulse-glow" filter="url(#glow-cyan)" />
                <circle cx="20" cy="180" r="4" fill="#FF2D92" className="corner-node pulse-glow" filter="url(#glow-magenta)" />
                <circle cx="180" cy="180" r="4" fill="#FF2D92" className="corner-node pulse-glow" filter="url(#glow-magenta)" />

                {/* Outer ring */}
                <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="3"
                    opacity="0.6"
                    className="outer-ring subtle-pulse"
                    filter="url(#glow-cyan)"
                />

                {/* Middle ring with rotation */}
                <circle
                    cx="100"
                    cy="100"
                    r="55"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2"
                    opacity="0.5"
                    className="middle-ring rotate-ring"
                    strokeDasharray="10 5"
                />

                {/* Center sphere */}
                <circle
                    cx="100"
                    cy="100"
                    r="42"
                    fill="url(#sphereGradient)"
                    className="center-sphere"
                />

                {/* Left headphone cup */}
                <g className="headphone-cup-left neon-pulse-cyan">
                    <rect
                        x="15"
                        y="80"
                        width="25"
                        height="40"
                        rx="8"
                        fill="#00F0FF"
                        opacity="0.8"
                        filter="url(#glow-cyan)"
                    />
                </g>

                {/* Right headphone cup */}
                <g className="headphone-cup-right neon-pulse-magenta">
                    <rect
                        x="160"
                        y="80"
                        width="25"
                        height="40"
                        rx="8"
                        fill="#FF2D92"
                        opacity="0.8"
                        filter="url(#glow-magenta)"
                    />
                </g>

                {/* Circuit lines */}
                <path
                    d="M 40 100 H 60"
                    stroke="#00F0FF"
                    strokeWidth="2"
                    opacity="0.6"
                    className="circuit-line"
                />
                <circle cx="45" cy="100" r="2" fill="#00F0FF" className="circuit-particle" />

                <path
                    d="M 140 100 H 160"
                    stroke="#FF2D92"
                    strokeWidth="2"
                    opacity="0.6"
                    className="circuit-line"
                />
                <circle cx="155" cy="100" r="2" fill="#FF2D92" className="circuit-particle-right" />

                {/* RVJ Text */}
                <text
                    x="100"
                    y="110"
                    textAnchor="middle"
                    fill="white"
                    fontSize="32"
                    fontWeight="bold"
                    fontFamily="Orbitron, sans-serif"
                    className="logo-text"
                >
                    RVJ
                </text>
            </svg>

            <style dangerouslySetInnerHTML={{
                __html: `
        .animated-logo-container {
          display: inline-block;
          position: relative;
        }
        
        /* Sphere rotation */
        .center-sphere {
          transform-origin: center;
          animation: sphere-rotate 30s linear infinite;
        }
        
        @keyframes sphere-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Ring rotation */
        .middle-ring {
          transform-origin: center;
          animation: ring-spin 20s linear infinite;
        }
        
        @keyframes ring-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Outer ring pulse */
        .outer-ring {
          animation: ring-pulse 3s ease-in-out infinite;
        }
        
        @keyframes ring-pulse {
          0%, 100% { opacity: 0.6; stroke-width: 3; }
          50% { opacity: 0.9; stroke-width: 4; }
        }
        
        /* Corner node pulse */
        .corner-node {
          animation: node-pulse 2s ease-in-out infinite;
        }
        
        @keyframes node-pulse {
          0%, 100% { opacity: 0.7; r: 4; }
          50% { opacity: 1; r: 6; }
        }
        
        /* Cyan neon pulse */
        .neon-pulse-cyan {
          animation: neon-pulse-cyan 3s ease-in-out infinite;
        }
        
        @keyframes neon-pulse-cyan {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        /* Magenta neon pulse (offset) */
        .neon-pulse-magenta {
          animation: neon-pulse-magenta 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        
        @keyframes neon-pulse-magenta {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        /* Circuit particle animation */
        .circuit-particle {
          animation: particle-travel 4s linear infinite;
        }
        
        @keyframes particle-travel {
          0% { cx: 40; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { cx: 60; opacity: 0; }
        }
        
        .circuit-particle-right {
          animation: particle-travel-right 4s linear infinite;
        }
        
        @keyframes particle-travel-right {
          0% { cx: 160; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { cx: 140; opacity: 0; }
        }
        
        /* Outer frame subtle animation */
        .outer-frame {
          animation: frame-glow 4s ease-in-out infinite;
        }
        
        @keyframes frame-glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      ` }} />
        </div>
    );
};

export default AnimatedLogoSVG;

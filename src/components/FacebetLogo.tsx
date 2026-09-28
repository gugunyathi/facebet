import React from 'react';

interface FacebetLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'gradient' | 'gold' | 'neon' | 'image';
  showGlow?: boolean;
}

export const FacebetLogo: React.FC<FacebetLogoProps> = ({
  className = "w-8 h-8",
  size,
  variant = 'gradient',
  showGlow = true,
}) => {
  if (variant === 'image') {
    return (
      <img
        src="/facebet_logo.jpg"
        alt="FACEBET Logo"
        referrerPolicy="no-referrer"
        style={size ? { width: size, height: size } : undefined}
        className={`rounded-2xl object-cover shadow-[0_0_20px_rgba(236,72,153,0.4)] ${className}`}
      />
    );
  }

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div 
      style={dimension ? { width: dimension, height: dimension } : undefined} 
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Main App Gradient: Yellow/Amber to Purple/Pink */}
          <linearGradient id="facebetAppGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          {/* Cyan to Gold Laser Glow */}
          <linearGradient id="facebetLaserGrad" x1="30" y1="108" x2="170" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="30%" stopColor="#10B981" />
            <stop offset="70%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>

          {/* BET Token Badge Gradient */}
          <linearGradient id="facebetBadgeGrad" x1="120" y1="120" x2="170" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Neon Glow Filters */}
          <filter id="laserGlow" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="badgeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ─── 1. FOUR CORNER SCANNER BRACKETS ─── */}
        {/* Top-Left Bracket */}
        <path
          d="M 64 38 H 48 C 41.37 38 36 43.37 36 50 V 66"
          stroke="url(#facebetAppGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Top-Right Bracket */}
        <path
          d="M 136 38 H 152 C 158.63 38 164 43.37 164 50 V 66"
          stroke="url(#facebetAppGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom-Left Bracket */}
        <path
          d="M 36 134 V 150 C 36 156.63 41.37 162 48 162 H 66"
          stroke="url(#facebetAppGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ─── 2. BIOMETRIC FACE SILHOUETTE ─── */}
        {/* Hair and Top Head Silhouette */}
        <path
          d="M 58 84 C 58 56 76 44 100 44 C 124 44 142 56 142 84 C 146 84 149 87 149 92 C 149 98 146 102 142 103 L 142 110 C 142 116 138 122 133 126 L 126 138 C 118 152 108 158 100 158 C 92 158 82 152 74 138 L 67 126 C 62 122 58 116 58 110 L 58 103 C 54 102 51 98 51 92 C 51 87 54 84 58 84 Z"
          fill="none"
          stroke="url(#facebetAppGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ear contours for high recognition matching attached reference */}
        {/* Left Ear */}
        <path
          d="M 58 90 C 51 90 49 95 49 100 C 49 106 53 110 58 110"
          stroke="url(#facebetAppGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Right Ear */}
        <path
          d="M 142 90 C 149 90 151 95 151 100 C 151 106 147 110 142 110"
          stroke="url(#facebetAppGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Hair styling swoosh inside face */}
        <path
          d="M 64 78 C 76 66 112 60 136 78"
          stroke="url(#facebetAppGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* ─── 3. HORIZONTAL SCANNING LASER BEAM ─── */}
        {/* Outer Glow Halo Beam */}
        <line
          x1="30"
          y1="108"
          x2="170"
          y2="108"
          stroke="url(#facebetLaserGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.6"
          filter={showGlow ? "url(#laserGlow)" : undefined}
        />
        {/* Inner Sharp Laser Core */}
        <line
          x1="30"
          y1="108"
          x2="170"
          y2="108"
          stroke="#E0F2FE"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* ─── 4. 'BET' TOKEN BADGE IN LOWER RIGHT CORNER ─── */}
        {/* Glowing Badge Ring & Container */}
        <g filter={showGlow ? "url(#badgeGlow)" : undefined}>
          {/* Badge Background Circle */}
          <circle
            cx="145"
            cy="145"
            r="23"
            fill="#0F0826"
            stroke="url(#facebetBadgeGrad)"
            strokeWidth="4.5"
          />
          {/* Inner Accent Ring */}
          <circle
            cx="145"
            cy="145"
            r="19"
            fill="#1E103A"
            stroke="#F59E0B"
            strokeWidth="1"
            opacity="0.7"
          />
          {/* 'BET' Capital Text */}
          <text
            x="145"
            y="151"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="0.8px"
          >
            BET
          </text>
        </g>
      </svg>
    </div>
  );
};

export default FacebetLogo;

import React, { useEffect, useRef } from 'react';

interface DemoPlayerVideoProps {
  playerRole: 'p1' | 'p2';
  isLoggedIn: boolean;
  targetWord?: string;
  className?: string;
}

export const DemoPlayerVideo: React.FC<DemoPlayerVideoProps> = ({
  playerRole,
  isLoggedIn,
  targetWord = "WIDE-EYED SHOCK",
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isLoggedIn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width = canvas.parentElement?.clientWidth || 400;
      const height = canvas.height = canvas.parentElement?.clientHeight || 300;

      // 1. Cyberpunk Dark Camera Background
      const bgGradient = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, Math.max(width, height) / 1.2
      );
      if (playerRole === 'p1') {
        bgGradient.addColorStop(0, '#0c1a30');
        bgGradient.addColorStop(0.5, '#060d1f');
        bgGradient.addColorStop(1, '#02040a');
      } else {
        bgGradient.addColorStop(0, '#24082c');
        bgGradient.addColorStop(0.5, '#120317');
        bgGradient.addColorStop(1, '#050108');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Camera Grid Overlay
      ctx.strokeStyle = playerRole === 'p1' ? 'rgba(0, 180, 255, 0.06)' : 'rgba(200, 50, 255, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Animated Player Face Silhouette & Features
      const centerX = width / 2 + Math.sin(time * 0.8) * 8;
      const centerY = height / 2 + Math.cos(time * 1.1) * 6 + 10;
      const headRadiusX = Math.min(width, height) * 0.22;
      const headRadiusY = Math.min(width, height) * 0.28;

      // Player Head Outline
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = playerRole === 'p1' ? '#1e293b' : '#27122b';
      ctx.shadowColor = playerRole === 'p1' ? '#00e5ff' : '#d946ef';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.strokeStyle = playerRole === 'p1' ? '#38bdf8' : '#e879f9';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Eyes - Animated Blinking & Expression
      const eyeOffset = headRadiusX * 0.42;
      const eyeY = centerY - headRadiusY * 0.15;
      const blink = Math.sin(time * 3) > 0.96 ? 0.1 : 1;
      const eyeOpen = (playerRole === 'p1' ? 14 : 10) * blink;

      // Left Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(centerX - eyeOffset, eyeY, 12, Math.max(2, eyeOpen), 0, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      ctx.ellipse(centerX + eyeOffset, eyeY, 12, Math.max(2, eyeOpen), 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (looking around)
      const pupilLookX = Math.sin(time * 1.5) * 4;
      const pupilLookY = Math.cos(time * 1.2) * 3;
      ctx.fillStyle = playerRole === 'p1' ? '#0284c7' : '#c026d3';
      ctx.beginPath();
      ctx.arc(centerX - eyeOffset + pupilLookX, eyeY + pupilLookY, 5, 0, Math.PI * 2);
      ctx.arc(centerX + eyeOffset + pupilLookX, eyeY + pupilLookY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Mouth - Expressive Movement (Shock / Laughing / Jaw Unhinged)
      const mouthY = centerY + headRadiusY * 0.35;
      const mouthOpen = playerRole === 'p1' 
        ? Math.abs(Math.sin(time * 2)) * 22 + 8 
        : Math.abs(Math.cos(time * 1.8)) * 14 + 5;

      ctx.beginPath();
      ctx.ellipse(centerX, mouthY, headRadiusX * 0.38, mouthOpen, 0, 0, Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = playerRole === 'p1' ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. AI Facial Landmark Wireframe Overlay (Mesh Tracking)
      ctx.save();
      ctx.strokeStyle = playerRole === 'p1' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(232, 121, 249, 0.6)';
      ctx.fillStyle = playerRole === 'p1' ? '#38bdf8' : '#e879f9';
      ctx.lineWidth = 1;

      const landmarks = [
        // Forehead
        { x: centerX, y: centerY - headRadiusY * 0.8 },
        { x: centerX - headRadiusX * 0.4, y: centerY - headRadiusY * 0.7 },
        { x: centerX + headRadiusX * 0.4, y: centerY - headRadiusY * 0.7 },
        // Nose bridge
        { x: centerX, y: centerY - headRadiusY * 0.05 },
        { x: centerX, y: centerY + headRadiusY * 0.15 },
        // Cheeks
        { x: centerX - headRadiusX * 0.7, y: centerY + headRadiusY * 0.05 },
        { x: centerX + headRadiusX * 0.7, y: centerY + headRadiusY * 0.05 },
        // Chin
        { x: centerX, y: centerY + headRadiusY * 0.85 },
      ];

      // Draw lines between landmarks
      landmarks.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (i < landmarks.length - 1) {
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
          ctx.stroke();
        }
      });
      ctx.restore();

      // 4. Live Game Indicators Overlay
      // Status Banner
      ctx.save();
      ctx.font = '900 11px system-ui, sans-serif';
      if (playerRole === 'p1') {
        // Winner / Reigning King
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.fillRect(12, 12, 155, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🔥 WINNING (3 STREAK)', 20, 28);

        // Confidence score
        const score = (95 + Math.sin(time * 3) * 3.5).toFixed(1);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.fillRect(width - 125, 12, 113, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`⚡ MATCH: ${score}%`, width - 118, 28);
      } else {
        // Challenger
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(12, 12, 140, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⚡ MATCHING PROMPT', 20, 28);

        // Confidence score
        const score = (72 + Math.cos(time * 2.5) * 6).toFixed(1);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
        ctx.fillRect(width - 125, 12, 113, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🎯 MATCH: ${score}%`, width - 118, 28);
      }
      ctx.restore();

      // Watermark Footer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, height - 22, width, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9px system-ui, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `🎮 DEMO GAMEPLAY FEED (${playerRole === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}) • SIGN IN WITH WALLET TO PLAY LIVE`,
        width / 2,
        height - 8
      );

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playerRole, isLoggedIn, targetWord]);

  // If user is logged in with a wallet, DO NOT show demo video placeholder!
  if (isLoggedIn) {
    return null;
  }

  return (
    <div className={`absolute inset-0 z-10 w-full h-full pointer-events-none overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full object-cover block" />
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function BackgroundParticles() {
  const [mounted, setMounted] = useState(false);
  const [dots, setDots] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
      setDots(
        Array.from({ length: 60 }).map((_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          duration: Math.random() * 20 + 20, // 20s to 40s
          delay: -Math.random() * 20,
        }))
      );
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020205]">
      {/* 1. Deep space radial background gradients */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] 
          bg-[radial-gradient(circle_at_center,rgba(0,18,50,0.15)_0%,rgba(0,5,20,0.1)_40%,rgba(1,1,3,0.95)_100%)]" 
      />

      {/* 2. Cyberpunk Tech Grid (very subtle) */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
        }}
      />

      {/* 3. Soft atmospheric light pillars / blobs */}
      <div className="absolute top-[20%] left-[15%] w-96 h-96 rounded-full bg-cyan-500/3 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-blue-500/3 blur-[160px] pointer-events-none" />

      {/* 4. Elegant floating stars / nodes particles using Framer Motion */}
      {mounted && dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-cyan-400/30"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            boxShadow: dot.size > 2 ? '0 0 6px rgba(0, 240, 255, 0.5)' : 'none',
          }}
          animate={{
            y: ['0px', '-40px', '0px'],
            opacity: [0.15, 0.6, 0.15],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

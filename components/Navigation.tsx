'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Cpu, HelpCircle, Activity, Globe } from 'lucide-react';

interface NavigationProps {
  onDemoClick: () => void;
  onAboutClick: () => void;
  onSystemClick: () => void;
  currentState: string;
}

export default function Navigation({ onDemoClick, onAboutClick, onSystemClick, currentState }: NavigationProps) {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-14 bg-black/30 backdrop-blur-md border border-white/5 rounded-full px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
      >
        {/* Left Brand Area */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Logo container with cyan glow */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] overflow-hidden">
              <span className="text-[10px] font-black tracking-widest text-cyan-400">R</span>
            </div>
            {/* Spinning orbital around logo */}
            <div className="absolute inset-0 w-8 h-8 border border-cyan-500/20 rounded-full border-t-transparent animate-spin duration-3000 pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-[0.25em] text-white">RIME</span>
              <span className="text-[7px] text-cyan-400 border border-cyan-400/30 px-1 py-0.2 rounded-full font-bold uppercase tracking-widest leading-none bg-cyan-400/5">v1.0</span>
            </div>
            <p className="text-[8px] text-zinc-400 tracking-[0.18em] font-medium leading-none mt-0.5">VOICE INTELLIGENCE</p>
          </div>
        </div>

        {/* Center / Right Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={onSystemClick}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors duration-200 tracking-widest uppercase cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-500/70" />
            <span>SYSTEM</span>
          </button>
          
          <button
            onClick={onDemoClick}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors duration-200 tracking-widest uppercase cursor-pointer relative"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>RUN DEMO</span>
            <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
          </button>

          <button
            onClick={onAboutClick}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors duration-200 tracking-widest uppercase cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-500/70" />
            <span>ABOUT</span>
          </button>
        </nav>

        {/* Far Right Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end hidden sm:block">
            <span className="text-[8px] text-zinc-500 tracking-wider leading-none">AI CORE</span>
            <span className="text-[9px] text-cyan-400 font-bold tracking-widest leading-none mt-1">
              {currentState}
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/20 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.05)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold text-emerald-400 tracking-[0.15em]">SYSTEM ONLINE</span>
          </div>
        </div>
      </motion.div>
    </header>
  );
}

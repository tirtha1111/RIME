'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Radio, RotateCw, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface StateIndicatorProps {
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
}

export default function StateIndicator({ state }: StateIndicatorProps) {
  // Configs for each state
  const config = {
    READY: {
      text: 'READY FOR PROMPT',
      subText: 'Listening offline, awaiting active signal',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/5',
      borderColor: 'border-cyan-500/10',
      icon: CheckCircle2,
      glow: 'shadow-[0_0_15px_rgba(34,211,238,0.05)]',
    },
    LISTENING: {
      text: 'LISTENING NOW',
      subText: 'RIME is streaming audio, interrupt whenever you want',
      color: 'text-cyan-400 font-extrabold',
      bgColor: 'bg-cyan-400/10',
      borderColor: 'border-cyan-400/30',
      icon: Mic,
      glow: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]',
    },
    THINKING: {
      text: 'AI REASONING',
      subText: 'Processing natural language tokens & generating voice layers',
      color: 'text-blue-400 font-extrabold',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: Cpu,
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    },
    SPEAKING: {
      text: 'RIME SPEAKING',
      subText: 'Streaming synthesized voice audio (Rime Voice Engine)',
      color: 'text-emerald-400 font-extrabold',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: Radio,
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    INTERRUPTED: {
      text: 'USER INTERRUPTED',
      subText: 'Interrupted! Immediate sound emission halt triggered',
      color: 'text-red-400 font-black',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/40',
      icon: ShieldAlert,
      glow: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
    },
    RECOVERING: {
      text: 'RECOVERING VOICE CORE...',
      subText: 'Purging active stream & updating reasoning branch',
      color: 'text-purple-400 font-bold',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      icon: RotateCw,
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    },
  };

  const current = config[state] || config.READY;
  const StateIcon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full border ${current.bgColor} ${current.borderColor} ${current.glow} backdrop-blur-md transition-all duration-300`}
          id="rime-state-indicator-badge"
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 
              ${state === 'LISTENING' ? 'bg-cyan-400' : ''}
              ${state === 'THINKING' ? 'bg-blue-400' : ''}
              ${state === 'SPEAKING' ? 'bg-emerald-400' : ''}
              ${state === 'INTERRUPTED' ? 'bg-red-400' : ''}
              ${state === 'RECOVERING' ? 'bg-purple-400 animate-spin duration-1000' : ''}
              ${state === 'READY' ? 'bg-zinc-500/50' : ''}
            `} />
            <span className={`relative inline-flex rounded-full h-2 w-2 
              ${state === 'LISTENING' ? 'bg-cyan-400' : ''}
              ${state === 'THINKING' ? 'bg-blue-400' : ''}
              ${state === 'SPEAKING' ? 'bg-emerald-400' : ''}
              ${state === 'INTERRUPTED' ? 'bg-red-500' : ''}
              ${state === 'RECOVERING' ? 'bg-purple-400' : ''}
              ${state === 'READY' ? 'bg-zinc-500' : ''}
            `} />
          </span>

          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em]">
            <StateIcon className={`w-3.5 h-3.5 ${current.color} ${state === 'RECOVERING' ? 'animate-spin' : ''}`} />
            <span className={`${current.color}`}>{current.text}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Subtitle describing the transition */}
      <div className="h-6 mt-2 relative overflow-hidden w-full max-w-sm px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] text-zinc-400 tracking-wide font-normal"
          >
            {current.subText}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Square, AlertOctagon, HelpCircle } from 'lucide-react';

interface VoiceControlProps {
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
  onClick: () => void;
}

export default function VoiceControl({ state, onClick }: VoiceControlProps) {
  // Label and help tips depending on current state
  const getButtonContent = () => {
    switch (state) {
      case 'LISTENING':
        return {
          icon: Square,
          text: 'Listening...',
          subText: 'Tap to stop & process',
          glowColor: 'shadow-[0_0_30px_rgba(34,211,238,0.4)]',
          borderColor: 'border-cyan-400',
          iconColor: 'text-cyan-400',
          bgColor: 'bg-cyan-950/25',
        };
      case 'THINKING':
        return {
          icon: Mic,
          text: 'AI is thinking',
          subText: 'Reasoning response branch...',
          glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
          borderColor: 'border-blue-500/40',
          iconColor: 'text-blue-400/50',
          bgColor: 'bg-blue-950/10',
        };
      case 'SPEAKING':
        return {
          icon: AlertOctagon,
          text: 'RIME is Speaking',
          subText: 'TAP ANYWHERE TO INTERRUPT',
          glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
          borderColor: 'border-emerald-400/80 animate-pulse',
          iconColor: 'text-emerald-400',
          bgColor: 'bg-emerald-950/20',
        };
      case 'INTERRUPTED':
        return {
          icon: AlertOctagon,
          text: 'INTERRUPTED',
          subText: 'Halting sound output stream...',
          glowColor: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]',
          borderColor: 'border-red-500/80',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-950/30',
        };
      case 'RECOVERING':
        return {
          icon: Mic,
          text: 'Recovering AI branch',
          subText: 'Re-routing context buffers...',
          glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
          borderColor: 'border-purple-500/40',
          iconColor: 'text-purple-400/50',
          bgColor: 'bg-purple-950/10',
        };
      case 'READY':
      default:
        return {
          icon: Mic,
          text: 'Tap to speak',
          subText: 'Or click RUN DEMO above',
          glowColor: 'shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(6,182,212,0.35)]',
          borderColor: 'border-cyan-500/30 hover:border-cyan-400/80',
          iconColor: 'text-cyan-400',
          bgColor: 'bg-cyan-950/10 hover:bg-cyan-950/20',
        };
    }
  };

  const current = getButtonContent();
  const ControlIcon = current.icon;

  const isDisabled = state === 'THINKING' || state === 'INTERRUPTED' || state === 'RECOVERING';

  return (
    <div className="flex flex-col items-center justify-center gap-4 relative z-20">
      <div className="relative">
        {/* Pulsing ring underneath button when active */}
        {(state === 'LISTENING' || state === 'SPEAKING') && (
          <motion.div
            className={`absolute -inset-4 rounded-full border opacity-30 pointer-events-none
              ${state === 'LISTENING' ? 'border-cyan-400 bg-cyan-400/5' : 'border-emerald-400 bg-emerald-400/5'}
            `}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.3, 0.05, 0.3],
            }}
            transition={{
              duration: state === 'LISTENING' ? 2 : 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* The interactive main circle button */}
        <motion.button
          id="rime-voice-control-button"
          disabled={isDisabled}
          onClick={onClick}
          whileHover={isDisabled ? {} : { scale: 1.05 }}
          whileTap={isDisabled ? {} : { scale: 0.95 }}
          className={`w-20 h-20 rounded-full border ${current.borderColor} ${current.bgColor} ${current.glowColor}
            flex items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-md relative overflow-hidden group
            ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          {/* Internal rotating light sweep */}
          {!isDisabled && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          )}

          {/* Icon */}
          <motion.div
            animate={
              state === 'LISTENING'
                ? { scale: [1, 1.15, 1] }
                : state === 'SPEAKING'
                ? { scale: [1, 1.1, 1] }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ControlIcon className={`w-8 h-8 ${current.iconColor} transition-colors duration-300`} />
          </motion.div>
        </motion.button>
      </div>

      {/* Button labels underneath */}
      <div className="text-center font-mono">
        <h3 className={`text-xs font-bold uppercase tracking-[0.2em] transition-colors duration-300
          ${state === 'SPEAKING' ? 'text-emerald-400 font-extrabold animate-pulse' : 'text-white/90'}
          ${state === 'LISTENING' ? 'text-cyan-400 font-extrabold' : ''}
          ${state === 'INTERRUPTED' ? 'text-red-400' : ''}
          ${state === 'RECOVERING' ? 'text-purple-400' : ''}
        `}>
          {current.text}
        </h3>
        
        <p className={`text-[9px] text-zinc-500 tracking-wider mt-1.5 uppercase transition-all duration-300
          ${state === 'SPEAKING' ? 'text-emerald-400/60 font-semibold' : ''}
          ${state === 'LISTENING' ? 'text-cyan-400/60 font-semibold' : ''}
        `}>
          {current.subText}
        </p>
      </div>
    </div>
  );
}

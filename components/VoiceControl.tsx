'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Square, AlertOctagon, MicOff, Radio } from 'lucide-react';

interface VoiceControlProps {
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
  isAlwaysOnActive?: boolean;
  micEnergy?: number;
  onClick: () => void;
}

export default function VoiceControl({ 
  state, 
  isAlwaysOnActive = true, 
  micEnergy = 0,
  onClick 
}: VoiceControlProps) {
  // Label and help tips depending on current state
  const getButtonContent = () => {
    switch (state) {
      case 'LISTENING':
        return {
          icon: Radio,
          text: 'Listening & Transcribing...',
          subText: 'Voice detected — speak naturally',
          glowColor: 'shadow-[0_0_35px_rgba(34,211,238,0.5)]',
          borderColor: 'border-cyan-400',
          iconColor: 'text-cyan-300',
          bgColor: 'bg-cyan-950/40',
        };
      case 'THINKING':
        return {
          icon: Mic,
          text: 'Groq LPU Reasoning',
          subText: 'openai/gpt-oss-120b inference...',
          glowColor: 'shadow-[0_0_25px_rgba(59,130,246,0.3)]',
          borderColor: 'border-blue-500/50',
          iconColor: 'text-blue-400/70',
          bgColor: 'bg-blue-950/20',
        };
      case 'SPEAKING':
        return {
          icon: AlertOctagon,
          text: 'P.H.I. is Speaking',
          subText: 'Speak a verbal statement to interrupt',
          glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.4)]',
          borderColor: 'border-emerald-400/90 animate-pulse',
          iconColor: 'text-emerald-300',
          bgColor: 'bg-emerald-950/30',
        };
      case 'INTERRUPTED':
        return {
          icon: AlertOctagon,
          text: 'Interrupted',
          subText: 'Capturing new input & following up...',
          glowColor: 'shadow-[0_0_35px_rgba(239,68,68,0.5)]',
          borderColor: 'border-red-500/90',
          iconColor: 'text-red-400',
          bgColor: 'bg-red-950/40',
        };
      case 'RECOVERING':
        return {
          icon: Mic,
          text: 'Following Up',
          subText: 'Blending context with previous topic...',
          glowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
          borderColor: 'border-purple-500/50',
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-950/20',
        };
      case 'READY':
      default:
        return {
          icon: isAlwaysOnActive ? Mic : MicOff,
          text: isAlwaysOnActive ? 'Always Listening' : 'Mic Paused',
          subText: isAlwaysOnActive ? 'Speak anytime to begin' : 'Tap to enable Always-On Mic',
          glowColor: isAlwaysOnActive 
            ? 'shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_40px_rgba(6,182,212,0.45)]' 
            : 'shadow-[0_0_15px_rgba(255,255,255,0.05)]',
          borderColor: isAlwaysOnActive ? 'border-cyan-500/40 hover:border-cyan-400' : 'border-zinc-700',
          iconColor: isAlwaysOnActive ? 'text-cyan-400' : 'text-zinc-500',
          bgColor: isAlwaysOnActive ? 'bg-cyan-950/20 hover:bg-cyan-950/30' : 'bg-zinc-900/50',
        };
    }
  };

  const current = getButtonContent();
  const ControlIcon = current.icon;

  const isDisabled = state === 'THINKING' || state === 'INTERRUPTED' || state === 'RECOVERING';

  return (
    <div className="flex flex-col items-center justify-center gap-3 relative z-20">
      <div className="relative">
        {/* Pulsing ring underneath button when active */}
        {(state === 'LISTENING' || state === 'SPEAKING' || (state === 'READY' && micEnergy > 15)) && (
          <motion.div
            className={`absolute -inset-4 rounded-full border opacity-40 pointer-events-none
              ${state === 'LISTENING' ? 'border-cyan-400 bg-cyan-400/10' : ''}
              ${state === 'SPEAKING' ? 'border-emerald-400 bg-emerald-400/10' : ''}
              ${state === 'READY' ? 'border-cyan-400 bg-cyan-400/5' : ''}
            `}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.4, 0.1, 0.4],
            }}
            transition={{
              duration: state === 'LISTENING' ? 1.5 : 1.2,
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
          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border ${current.borderColor} ${current.bgColor} ${current.glowColor}
            flex items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-md relative overflow-hidden group
            ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}
          `}
          title={state === 'SPEAKING' ? 'Tap to interrupt' : 'Tap to toggle Always-On Mic'}
        >
          {/* Internal rotating light sweep */}
          {!isDisabled && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          )}

          {/* Icon */}
          <motion.div
            animate={
              state === 'LISTENING'
                ? { scale: [1, 1.18, 1] }
                : state === 'SPEAKING'
                ? { scale: [1, 1.1, 1] }
                : {}
            }
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ControlIcon className={`w-8 h-8 sm:w-9 sm:h-9 ${current.iconColor} transition-colors duration-300`} />
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
        
        <p className={`text-[10px] text-zinc-400 tracking-wider mt-1 uppercase transition-all duration-300
          ${state === 'SPEAKING' ? 'text-emerald-400/80 font-semibold' : ''}
          ${state === 'LISTENING' ? 'text-cyan-400/80 font-semibold' : ''}
        `}>
          {current.subText}
        </p>
      </div>
    </div>
  );
}

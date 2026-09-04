'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Activity, Circle, Terminal } from 'lucide-react';

interface SystemStatusProps {
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
  latency: number | null;
}

export default function SystemStatus({ state, latency }: SystemStatusProps) {
  // Set statuses based on overall state
  const micActive = state === 'LISTENING';
  const speechActive = state === 'SPEAKING';
  const logicActive = state === 'THINKING';
  const audioReady = state === 'SPEAKING' || state === 'READY' || state === 'LISTENING';

  // Calculate interruption status
  const getInterruptionStatus = () => {
    switch (state) {
      case 'INTERRUPTED':
        return { text: 'TRIGGERED', color: 'text-red-400 bg-red-950/40 border-red-500/30' };
      case 'RECOVERING':
        return { text: 'RE-CALIBRATING', color: 'text-purple-400 bg-purple-950/40 border-purple-500/30 animate-pulse' };
      case 'SPEAKING':
        return { text: 'MONITORING', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20' };
      case 'LISTENING':
        return { text: 'ACTIVE', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20' };
      case 'READY':
      default:
        return { text: 'READY', color: 'text-zinc-500 bg-zinc-950/30 border-white/5' };
    }
  };

  const interruptControl = getInterruptionStatus();

  return (
    <div className="w-full max-w-xs bg-black/40 backdrop-blur-lg border border-white/5 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Title */}
      <div className="flex items-center gap-2 mb-2.5">
        <Terminal className="w-3.5 h-3.5 text-cyan-400/80" />
        <h4 className="font-mono text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
          VOICE TELEMETRY
        </h4>
      </div>

      {/* Grid of indicators */}
      <div className="flex flex-col gap-3 font-mono text-[10px]">
        {/* Microphones */}
        <div className="flex items-center justify-between py-1 border-b border-white/5">
          <span className="text-zinc-500 tracking-wider">MICROPHONE INPUT</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${micActive ? 'text-cyan-400' : 'text-zinc-400'}`}>
              {micActive ? 'CAPTURING' : 'STANDBY'}
            </span>
            <span className="relative flex h-2 w-2">
              {micActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${micActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-zinc-700'}`}></span>
            </span>
          </div>
        </div>

        {/* Speech Engine */}
        <div className="flex items-center justify-between py-1 border-b border-white/5">
          <span className="text-zinc-500 tracking-wider">SPEECH SYNTHESIS</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${speechActive ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`}>
              {speechActive ? 'STREAMING' : 'READY'}
            </span>
            <span className="relative flex h-2 w-2">
              {speechActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${speechActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></span>
            </span>
          </div>
        </div>

        {/* AI Logic Core */}
        <div className="flex items-center justify-between py-1 border-b border-white/5">
          <span className="text-zinc-500 tracking-wider">REASONING CORE</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${logicActive ? 'text-blue-400 animate-pulse' : 'text-zinc-400'}`}>
              {logicActive ? 'RESOLVING' : 'READY'}
            </span>
            <span className="relative flex h-2 w-2">
              {logicActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${logicActive ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-700'}`}></span>
            </span>
          </div>
        </div>

        {/* Audio Output */}
        <div className="flex items-center justify-between py-1">
          <span className="text-zinc-500 tracking-wider">AUDIO DAC OUTPUT</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${audioReady ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {audioReady ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${audioReady ? 'bg-emerald-400' : 'bg-zinc-700'}`}></span>
            </span>
          </div>
        </div>
      </div>

      {/* Interruption Control block */}
      <div className="mt-5 p-3.5 bg-white/2 rounded-xl border border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold text-zinc-400 tracking-widest uppercase">
            INTERRUPTION CONTROL
          </span>
          <Activity className={`w-3.5 h-3.5 ${state === 'INTERRUPTED' ? 'text-red-400 animate-bounce' : 'text-cyan-400/60'}`} />
        </div>

        <div className={`w-full text-center py-1.5 rounded border font-mono text-[10px] font-black tracking-widest ${interruptControl.color}`}>
          {interruptControl.text}
        </div>

        <p className="text-[8px] font-mono text-zinc-500 leading-normal tracking-wide text-center mt-1">
          RE-ROUTING STREAM INSTANTLY ON USER VOICE COLLISION
        </p>
      </div>

      {/* Latency and System Load metrics */}
      <div className="mt-4 flex items-center justify-between font-mono text-[8px] text-zinc-600 border-t border-white/5 pt-3">
        <span>LATENCY: {latency ? `${latency}ms` : '-- ms'}</span>
        <span>LOAD: 12.4%</span>
      </div>
    </div>
  );
}

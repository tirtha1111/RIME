'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Zap, Cpu, Radio, ShieldCheck, Activity } from 'lucide-react';
import { RimeLanguage } from '@/lib/rimeVoices';

interface AudioTelemetryPanelProps {
  selectedLanguage: RimeLanguage;
  selectedSpeaker: string;
  isAlwaysOnActive: boolean;
  micEnergy: number; // 0 to 100
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
  hasInterruptedContext: boolean;
  interruptedTextPreview: string | null;
  onToggleAlwaysOn: () => void;
}

export default function AudioTelemetryPanel({
  selectedLanguage,
  selectedSpeaker,
  isAlwaysOnActive,
  micEnergy,
  state,
  hasInterruptedContext,
  interruptedTextPreview,
  onToggleAlwaysOn,
}: AudioTelemetryPanelProps) {
  // Compute VU meter bars
  const totalBars = 16;
  const activeBars = Math.min(totalBars, Math.round((micEnergy / 100) * totalBars));

  return (
    <div className="w-full h-[360px] sm:h-[400px] lg:h-[440px] flex flex-col bg-black/40 backdrop-blur-lg border border-white/5 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden shrink-0">
      {/* Top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
            VOICE VAD & TELEMETRY
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleAlwaysOn}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border transition-all cursor-pointer ${
            isAlwaysOnActive
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isAlwaysOnActive ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
          {isAlwaysOnActive ? 'ALWAYS ON' : 'MANUAL'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-cyan-500/20">
        
        {/* Real-time Voice Activity Meter */}
        <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-cyan-400" />
              Mic Sound Level
            </span>
            <span className="font-mono text-[10px] font-bold text-cyan-300">
              {micEnergy}% {micEnergy > 30 ? '(AUDIO DETECTED)' : '(QUIET)'}
            </span>
          </div>

          {/* VU Meter Bars */}
          <div className="flex items-center gap-1 h-6 px-1.5 py-1 bg-black/60 rounded-lg border border-white/5">
            {Array.from({ length: totalBars }).map((_, i) => {
              const isFilled = i < activeBars;
              const isHigh = i > 11;
              const isMid = i > 6;
              return (
                <motion.div
                  key={i}
                  animate={{
                    height: isFilled ? '100%' : '20%',
                    opacity: isFilled ? 1 : 0.2,
                  }}
                  transition={{ duration: 0.05 }}
                  className={`flex-1 rounded-xs transition-colors ${
                    isHigh 
                      ? 'bg-red-400' 
                      : isMid 
                        ? 'bg-amber-400' 
                        : 'bg-cyan-400'
                  }`}
                />
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-1.5 text-[8px] font-mono text-zinc-500">
            <span>Noise Filter: Active</span>
            <span>Statement-Gated</span>
            <span>0 dB</span>
          </div>
        </div>

        {/* Interruption & Context Follow-up Memory */}
        <div className={`p-3 rounded-xl border transition-all ${
          hasInterruptedContext 
            ? 'bg-purple-950/20 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
            : 'bg-zinc-950/30 border-white/5'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-zinc-300">
              <Zap className={`w-3 h-3 ${hasInterruptedContext ? 'text-purple-400 animate-pulse' : 'text-zinc-500'}`} />
              Interruption Memory
            </span>
            <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${
              hasInterruptedContext 
                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40' 
                : 'bg-zinc-900 text-zinc-500'
            }`}>
              {hasInterruptedContext ? 'FOLLOW-UP ACTIVE' : 'STATEMENT-GATED'}
            </span>
          </div>
          
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {hasInterruptedContext && interruptedTextPreview
              ? `Previous context retained: "${interruptedTextPreview.slice(0, 60)}..."`
              : 'Decision-making is preserved without noise interruptions. Only full verbal statements interrupt and follow up.'}
          </p>
        </div>

        {/* Inference Engine Status */}
        <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Groq LPU Model
            </span>
            <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              LPU Active
            </span>
          </div>
          <div className="font-mono text-xs text-zinc-200 font-bold tracking-wide">
            openai/gpt-oss-120b
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Target Latency: &lt; 250ms • Streaming Engine
          </div>
        </div>

        {/* Audio Synthesis Profile */}
        <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              Voice Profile
            </span>
            <span className="text-xs">{selectedLanguage.flag}</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-200 mt-1">
            {selectedLanguage.name} ({selectedLanguage.nativeName})
          </div>
          <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
            Speaker: {selectedSpeaker} • Model: {selectedLanguage.defaultModel.toUpperCase()}
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500 shrink-0">
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3 h-3" /> Hands-free Mode
        </span>
        <span>Always Listening</span>
      </div>
    </div>
  );
}

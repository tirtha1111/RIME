'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CornerDownRight, CheckCircle, Radio } from 'lucide-react';

export interface TranscriptItem {
  id: string;
  speaker: 'USER' | 'RIME';
  text: string;
  status: 'normal' | 'interrupted' | 'recovering' | 'recovered' | 'active';
}

interface ConversationPanelProps {
  transcript: TranscriptItem[];
  currentState: string;
}

export default function ConversationPanel({ transcript, currentState }: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll transcript panel to the bottom when new items are added
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  return (
    <div className="w-full max-w-2xl bg-black/40 backdrop-blur-lg border border-white/5 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
      {/* Laser header edge accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      {/* Decorative background grid element */}
      <div className="absolute top-2 right-4 text-[8px] font-mono text-zinc-600 tracking-widest pointer-events-none select-none uppercase">
        Live Voice Stream // T-800ms
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Radio className={`w-3.5 h-3.5 text-cyan-400 ${currentState === 'SPEAKING' || currentState === 'LISTENING' ? 'animate-pulse' : ''}`} />
        <h4 className="font-mono text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
          TELEMETRY STREAM & TRANSCRIPT
        </h4>
      </div>

      {/* Transcript container */}
      <div className="h-44 overflow-y-auto pr-1 flex flex-col gap-3.5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {transcript.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="h-full flex flex-col items-center justify-center text-center py-8"
            >
              <p className="font-mono text-[10px] text-zinc-500 tracking-wider">
                AWAITING TRANSMISSION LAYER...
              </p>
              <p className="text-[11px] text-zinc-600 mt-1 max-w-[280px]">
                Trigger the microphone or click Run Demo to simulate realtime conversation streams.
              </p>
            </motion.div>
          ) : (
            transcript.map((item, index) => {
              const isUser = item.speaker === 'USER';
              const isInterrupted = item.status === 'interrupted';
              const isRecovered = item.status === 'recovered';
              const isActive = item.status === 'active';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: isUser ? -10 : 10, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative p-3.5 rounded-xl border transition-all duration-300
                    ${isUser 
                      ? 'bg-cyan-950/5 border-cyan-500/5' 
                      : isInterrupted 
                        ? 'bg-red-950/5 border-red-500/10' 
                        : isRecovered 
                          ? 'bg-purple-950/5 border-purple-500/10' 
                          : 'bg-zinc-950/10 border-white/5'
                    }
                  `}
                >
                  {/* Left accent line representing signal connection */}
                  <div className={`absolute top-0 left-0 bottom-0 w-0.5 rounded-l-xl
                    ${isUser 
                      ? 'bg-cyan-500/30' 
                      : isInterrupted 
                        ? 'bg-red-500/40' 
                        : isRecovered 
                          ? 'bg-purple-500/40' 
                          : 'bg-emerald-500/20'
                    }
                  `} />

                  {/* Header metadata row */}
                  <div className="flex items-center justify-between mb-1.5 pl-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-black tracking-widest
                        ${isUser ? 'text-cyan-400' : 'text-emerald-400'}
                      `}>
                        {item.speaker}
                      </span>
                      
                      {/* Sub-label/timestamp */}
                      <span className="font-mono text-[7px] text-zinc-600">
                        CH-01 // SIG: 99%
                      </span>
                    </div>

                    {/* Status badges */}
                    <div>
                      {isInterrupted && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                          Interrupted
                        </span>
                      )}
                      {isRecovered && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-purple-400 bg-purple-950/30 border border-purple-500/20 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest">
                          <CornerDownRight className="w-2.5 h-2.5 text-purple-400" />
                          Recovered & Adapted
                        </span>
                      )}
                      {isActive && !isInterrupted && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest animate-pulse">
                          Receiving...
                        </span>
                      )}
                      {item.status === 'normal' && !isUser && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                          Committed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcript content */}
                  <p className={`text-xs pl-1.5 leading-relaxed tracking-wide transition-all duration-300
                    ${isUser ? 'text-zinc-200' : 'text-zinc-300'}
                    ${isInterrupted ? 'line-through text-red-400/40' : ''}
                    ${isRecovered ? 'text-purple-300' : ''}
                  `}>
                    {item.text}
                    {isActive && (
                      <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                    )}
                  </p>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

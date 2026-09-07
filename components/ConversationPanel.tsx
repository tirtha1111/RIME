'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CornerDownRight, CheckCircle, Radio, Sparkles, Download, ExternalLink, Maximize2 } from 'lucide-react';

export interface GeneratedImageMetadata {
  url: string;
  prompt: string;
  model: string;
  provider: string;
}

export interface TranscriptItem {
  id: string;
  speaker: 'USER' | 'PHI AI' | 'RIME';
  text: string;
  status: 'normal' | 'interrupted' | 'recovering' | 'recovered' | 'active';
  image?: GeneratedImageMetadata | null;
}

interface ConversationPanelProps {
  transcript: TranscriptItem[];
  currentState: string;
  onOpenImageModal?: (image: GeneratedImageMetadata) => void;
}

export default function ConversationPanel({ transcript, currentState, onOpenImageModal }: ConversationPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endMarkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll transcript panel internally to the bottom without shifting window scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [transcript]);

  return (
    <div className="w-full h-[360px] sm:h-[400px] lg:h-[440px] flex flex-col bg-black/40 backdrop-blur-lg border border-white/5 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden shrink-0">
      {/* Laser header edge accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      {/* Decorative background grid element */}
      <div className="absolute top-2 right-4 text-[8px] font-mono text-zinc-600 tracking-widest pointer-events-none select-none uppercase">
        Live Voice Stream // T-800ms
      </div>

      <div className="flex items-center gap-2 mb-2.5 shrink-0">
        <Radio className={`w-3.5 h-3.5 text-cyan-400 ${currentState === 'SPEAKING' || currentState === 'LISTENING' ? 'animate-pulse' : ''}`} />
        <h4 className="font-mono text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
          TELEMETRY STREAM & CONVERSATION
        </h4>
      </div>

      {/* Transcript container */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent"
      >
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
                Speak to P.H.I. or enter any question or image prompt like &quot;Generate a photo of a neon cyber city&quot;.
              </p>
            </motion.div>
          ) : (
            transcript.map((item) => {
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
                          : item.image
                            ? 'bg-gradient-to-b from-purple-950/20 to-black/40 border-purple-500/30'
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
                          : item.image
                            ? 'bg-purple-400'
                            : 'bg-emerald-500/20'
                    }
                  `} />

                  {/* Header metadata row */}
                  <div className="flex items-center justify-between mb-1.5 pl-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-black tracking-widest
                        ${isUser ? 'text-cyan-400' : item.image ? 'text-purple-400' : 'text-emerald-400'}
                      `}>
                        {item.speaker === 'RIME' ? 'PHI AI' : item.speaker}
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
                          Recovered
                        </span>
                      )}
                      {item.image && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-purple-300 bg-purple-950/50 border border-purple-500/30 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          Visual Synthesis
                        </span>
                      )}
                      {isActive && !isInterrupted && !item.image && (
                        <span className="flex items-center gap-1 font-mono text-[7px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md leading-none uppercase tracking-widest animate-pulse">
                          Receiving...
                        </span>
                      )}
                      {item.status === 'normal' && !isUser && !item.image && (
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

                  {/* Integrated Generated Visual Image Card */}
                  {item.image && item.image.url && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="mt-3 pl-1.5"
                    >
                      <div 
                        onClick={() => item.image && onOpenImageModal?.(item.image)}
                        className="relative rounded-xl overflow-hidden border border-purple-500/40 bg-black/80 shadow-[0_8px_24px_rgba(168,85,247,0.2)] group cursor-pointer"
                      >
                        {/* Render generated image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.image.url} 
                          alt={item.image.prompt || "Generated by PHI AI"} 
                          referrerPolicy="no-referrer"
                          className="w-full h-auto max-h-[240px] object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Overlay with separate window button badge */}
                        <div className="absolute top-2.5 right-2.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.image) onOpenImageModal?.(item.image);
                            }}
                            className="px-2.5 py-1 bg-black/80 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg border border-purple-500/40 transition-all text-[10px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer"
                          >
                            <Maximize2 className="w-3 h-3 text-purple-400 group-hover:text-white" />
                            <span>Separate Window</span>
                          </button>
                        </div>

                        {/* Subtle gradient overlay with action controls */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono text-[9px] font-bold text-purple-300 block truncate">
                                {item.image.model || 'FLUX.1-schnell'}
                              </span>
                              <span className="text-[10px] text-zinc-300 truncate block">
                                Click to open separate window
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => item.image && onOpenImageModal?.(item.image)}
                                className="p-1.5 bg-purple-600/90 hover:bg-purple-500 text-white rounded-lg border border-purple-400/40 transition-all text-[10px] flex items-center gap-1 shadow-md cursor-pointer"
                                title="Open in Separate Window"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={item.image.url}
                                download="phi_ai_visual.jpg"
                                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 rounded-lg border border-white/10 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                                title="Download Image"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={item.image.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 rounded-lg border border-white/10 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                                title="Open Full Size"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={endMarkerRef} className="h-1 shrink-0" />
      </div>
    </div>
  );
}

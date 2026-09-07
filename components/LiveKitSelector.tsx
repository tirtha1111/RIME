'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  ChevronDown, 
  Sparkles, 
  Check, 
  Wifi, 
  WifiOff, 
  Zap, 
  Cpu, 
  Key, 
  Loader2,
  Sliders,
  ExternalLink,
  Bot
} from 'lucide-react';
import { livekitManager, LiveKitConnectionState } from '@/lib/livekitClient';

export interface LiveKitModel {
  id: string;
  name: string;
  description: string;
  type: 'speech-to-speech' | 'pipeline';
  tag: string;
  provider: string;
  badgeColor: string;
}

const DEFAULT_LIVEKIT_MODELS: LiveKitModel[] = [
  {
    id: 'gpt-realtime-2.1',
    name: 'LiveKit Realtime 2.1',
    description: 'Ultra-low latency (~280ms p95) native audio multimodal streaming agent.',
    type: 'speech-to-speech',
    tag: 'NEW 2026',
    provider: 'OpenAI Realtime / LiveKit',
    badgeColor: 'emerald',
  },
  {
    id: 'pipeline-deepgram-groq-rime',
    name: 'LiveKit Pipeline (Nova-3 + Groq + Rime)',
    description: 'Deepgram Nova-3 STT + Groq LPU + Rime Coda neural TTS with Silero VAD.',
    type: 'pipeline',
    tag: 'ULTRA FAST',
    provider: 'Deepgram + Groq + Rime',
    badgeColor: 'cyan',
  },
  {
    id: 'gemini-2.5-live',
    name: 'LiveKit Multimodal (Gemini 2.5 Live)',
    description: 'Google DeepMind multimodal audio streaming agent with search grounding.',
    type: 'speech-to-speech',
    tag: 'GEMINI LIVE',
    provider: 'Google Live Audio / LiveKit',
    badgeColor: 'purple',
  },
  {
    id: 'pipeline-whisper-llama-cartesia',
    name: 'LiveKit Pipeline (Whisper + Llama 3.3)',
    description: 'Whisper Large v3 Turbo + Llama 3.3 70B + Cartesia Sonic-3.5 voice synthesis.',
    type: 'pipeline',
    tag: 'OPEN WEIGHTS',
    provider: 'Groq + Cartesia',
    badgeColor: 'blue',
  },
];

interface LiveKitSelectorProps {
  onOpenSecretsModal: () => void;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export default function LiveKitSelector({
  onOpenSecretsModal,
  selectedModelId,
  onModelChange,
}: LiveKitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLiveKitConfigured, setIsLiveKitConfigured] = useState(false);
  const [models, setModels] = useState<LiveKitModel[]>(DEFAULT_LIVEKIT_MODELS);
  const [connState, setConnState] = useState<LiveKitConnectionState>(livekitManager.getState());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/livekit/status')
      .then(r => r.json())
      .then(data => {
        setIsLiveKitConfigured(Boolean(data.configured));
        if (data.models && Array.isArray(data.models)) {
          setModels(data.models);
        }
      })
      .catch(() => setIsLiveKitConfigured(false));
  }, []);

  useEffect(() => {
    const unsub = livekitManager.subscribeState(setConnState);
    return () => unsub();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = models.find(m => m.id === selectedModelId) || models[0];

  const handleToggleConnect = async () => {
    if (connState.isConnected) {
      await livekitManager.disconnect();
    } else {
      if (!isLiveKitConfigured) {
        onOpenSecretsModal();
        return;
      }
      await livekitManager.connect(selectedModelId);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    onModelChange(modelId);
    if (connState.isConnected) {
      // Reconnect with the new model
      await livekitManager.disconnect();
      await livekitManager.connect(modelId);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      
      {/* Trigger Button Group */}
      <div className="flex items-center gap-1.5">
        
        {/* Main Model Selector Button */}
        <button
          type="button"
          id="livekit-model-dropdown-button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all backdrop-blur-md cursor-pointer ${
            isOpen
              ? 'bg-purple-950/80 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : connState.isConnected
              ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-emerald-500/40 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 hover:border-purple-500/40 text-zinc-200'
          }`}
        >
          <div className="w-2 h-2 rounded-full relative">
            {connState.isConnected ? (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </>
            ) : connState.isConnecting ? (
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-purple-400" />
            )}
          </div>

          <div className="flex flex-col text-left leading-tight">
            <span className="font-semibold text-white tracking-wide flex items-center gap-1">
              {currentModel.name}
            </span>
            <span className="text-[10px] text-purple-300 font-mono flex items-center gap-1">
              <span>LiveKit Model</span>
              <span className="text-zinc-500">•</span>
              <span className="text-emerald-400 font-bold">{currentModel.tag}</span>
            </span>
          </div>

          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
        </button>

        {/* Quick WebRTC Connect / Live Button */}
        <button
          type="button"
          id="livekit-connect-webrtc-btn"
          onClick={handleToggleConnect}
          disabled={connState.isConnecting}
          title={connState.isConnected ? 'Disconnect LiveKit WebRTC Room' : 'Connect to LiveKit WebRTC Agent'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all backdrop-blur-md cursor-pointer ${
            connState.isConnected
              ? 'bg-red-950/40 hover:bg-red-950/60 border-red-500/40 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : connState.isConnecting
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : isLiveKitConfigured
              ? 'bg-purple-950/50 hover:bg-purple-900/60 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-zinc-300'
          }`}
        >
          {connState.isConnecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Connecting</span>
            </>
          ) : connState.isConnected ? (
            <>
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LiveKit Live</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>LiveKit WebRTC</span>
            </>
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-[420px] rounded-2xl bg-zinc-950/95 border border-purple-500/30 p-3 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header info */}
            <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  LiveKit Voice Agent Models
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isLiveKitConfigured 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
              }`}>
                {isLiveKitConfigured ? 'LiveKit Active' : 'Keys Needed'}
              </span>
            </div>

            {/* Model List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {models.map((model) => {
                const isSelected = model.id === selectedModelId;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectModel(model.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 group cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-white/2 hover:bg-white/5 border-transparent hover:border-white/10'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {model.name}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          model.badgeColor === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : model.badgeColor === 'cyan'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : model.badgeColor === 'purple'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {model.tag}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {model.description}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-zinc-500">
                        <span>Provider: <span className="text-zinc-300">{model.provider}</span></span>
                        <span>•</span>
                        <span>Type: <span className="text-purple-300">{model.type}</span></span>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-purple-400/20 border border-purple-400 flex items-center justify-center text-purple-300">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/10 group-hover:border-purple-400/40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* LiveKit Connection status & Python instructions */}
            <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-mono">LiveKit WebRTC Agent:</span>
                <button
                  type="button"
                  onClick={handleToggleConnect}
                  disabled={connState.isConnecting}
                  className="text-xs font-mono font-bold text-purple-400 hover:text-purple-300 cursor-pointer underline flex items-center gap-1"
                >
                  {connState.isConnected ? 'Disconnect WebRTC' : 'Connect WebRTC Room'}
                </button>
              </div>

              {!isLiveKitConfigured && (
                <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      Configure LiveKit Secrets
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenSecretsModal();
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-mono border border-amber-500/30 cursor-pointer"
                    >
                      Settings
                    </button>
                  </div>
                  Add <code className="text-amber-300 font-mono">LIVEKIT_URL</code>, <code className="text-amber-300 font-mono">LIVEKIT_API_KEY</code>, and <code className="text-amber-300 font-mono">LIVEKIT_API_SECRET</code> in AI Studio Settings to enable direct cloud WebRTC rooms.
                </div>
              )}

              <div className="bg-black/50 border border-white/5 rounded-xl p-2 font-mono text-[10px] text-zinc-400 flex items-center justify-between">
                <span>Run Python Agent:</span>
                <code className="text-purple-300 bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20">python agent.py dev</code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

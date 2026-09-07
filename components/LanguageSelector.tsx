'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  ChevronDown, 
  Volume2, 
  Check, 
  Sparkles, 
  Mic, 
  Play, 
  Square,
  Radio,
  Sliders
} from 'lucide-react';
import { RIME_LANGUAGES, RimeLanguage, RimeSpeaker, getLanguageById } from '@/lib/rimeVoices';

interface LanguageSelectorProps {
  selectedLanguage: RimeLanguage;
  selectedSpeaker: string;
  onLanguageChange: (lang: RimeLanguage) => void;
  onSpeakerChange: (speakerId: string) => void;
  onTestVoice: (text: string, langId: string, speakerId: string) => void;
  isRimeConfigured: boolean;
  isPlayingPreview?: boolean;
}

export default function LanguageSelector({
  selectedLanguage,
  selectedSpeaker,
  onLanguageChange,
  onSpeakerChange,
  onTestVoice,
  isRimeConfigured,
  isPlayingPreview = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSpeakerList, setShowSpeakerList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSpeakerList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSpeakerObj = selectedLanguage.speakers.find(s => s.id === selectedSpeaker) || selectedLanguage.speakers[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      
      {/* Main Trigger Button */}
      <button
        type="button"
        id="rime-language-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all backdrop-blur-md cursor-pointer ${
          isOpen
            ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 hover:border-cyan-500/40 text-zinc-200'
        }`}
      >
        <span className="text-base leading-none" role="img" aria-label={selectedLanguage.name}>
          {selectedLanguage.flag}
        </span>
        <div className="flex flex-col text-left leading-tight">
          <span className="font-semibold text-white tracking-wide flex items-center gap-1">
            {selectedLanguage.nativeName}
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">
            Rime: {currentSpeakerObj?.name || selectedLanguage.defaultSpeaker}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-cyan-500/30 p-2.5 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header info */}
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-300 uppercase">
                  Select Rime Voice Language
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isRimeConfigured ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
              }`}>
                {isRimeConfigured ? 'Rime Active' : 'Key Needed'}
              </span>
            </div>

            {/* Language list */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {RIME_LANGUAGES.map((lang) => {
                const isSelected = lang.id === selectedLanguage.id;
                return (
                  <div
                    key={lang.id}
                    className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-white' 
                        : 'bg-white/2 hover:bg-white/5 border-transparent hover:border-white/10 text-zinc-300'
                    }`}
                  >
                    {/* Language Selector row */}
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange(lang);
                        onSpeakerChange(lang.defaultSpeaker);
                      }}
                      className="flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <span className="text-xl shrink-0">{lang.flag}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight group-hover:text-cyan-300 transition-colors">
                          {lang.nativeName}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {lang.name} • {lang.speakers.length} Rime {lang.speakers.length === 1 ? 'voice' : 'voices'}
                        </span>
                      </div>
                    </button>

                    {/* Action buttons: Test preview voice */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        title={`Sample ${lang.name} voice`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTestVoice(lang.samplePhrase, lang.id, isSelected ? selectedSpeaker : lang.defaultSpeaker);
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Sample</span>
                      </button>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Language Voice/Speaker Customizer */}
            <div className="mt-2.5 pt-2 border-t border-white/5 px-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  Voice Speaker ({selectedLanguage.name})
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  Model: {selectedLanguage.defaultModel.toUpperCase()}
                </span>
              </div>

              {/* Speaker Pills */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedLanguage.speakers.map((spk) => {
                  const isSpkSelected = spk.id === selectedSpeaker;
                  return (
                    <button
                      key={spk.id}
                      type="button"
                      onClick={() => onSpeakerChange(spk.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                        isSpkSelected
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                      }`}
                    >
                      <span>{spk.name}</span>
                      {spk.gender && (
                        <span className="text-[9px] text-zinc-500">
                          ({spk.gender[0].toUpperCase()})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-zinc-400 flex items-center justify-between px-1">
              <span>Rime Low-Latency Conversational Synthesis</span>
              <span className="text-cyan-400/80 font-mono">10 Languages</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

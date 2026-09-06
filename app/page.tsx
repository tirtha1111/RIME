'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  HelpCircle, 
  AlertTriangle, 
  Settings, 
  Activity, 
  RefreshCw, 
  Cpu, 
  Radio, 
  X, 
  FileText, 
  Code, 
  CornerDownRight, 
  Terminal, 
  Mic,
  Plus
} from 'lucide-react';

import AIGlobe from '@/components/AIGlobe';
import VoiceControl from '@/components/VoiceControl';
import ConversationPanel, { TranscriptItem } from '@/components/ConversationPanel';
import SystemStatus from '@/components/SystemStatus';
import Navigation from '@/components/Navigation';
import StateIndicator from '@/components/StateIndicator';
import DemoController from '@/components/DemoController';
import BackgroundParticles from '@/components/BackgroundParticles';
import { rimeSound } from '@/lib/audio';

type SystemState = 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';

export default function Home() {
  const [state, setState] = useState<SystemState>('READY');
  const [latency, setLatency] = useState<number | null>(null);
  const [speechVolume, setSpeechVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [activeDemoStep, setActiveDemoStep] = useState<number>(-1);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);

  // Timeouts ref to clear on unmount or abort
  const timeoutsRef = useRef<number[]>([]);
  const stateRef = useRef<SystemState>('READY');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(id => clearTimeout(id));
      rimeSound.stopHum();
      rimeSound.stopSpeakingSynth();
    };
  }, []);

  const addTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  };

  // 1. Unified Interruption Sequence
  const triggerInterruption = (customUserPrompt = 'Wait, Mumbai instead.') => {
    clearAllTimeouts();
    rimeSound.stopAll(); // Stop all sound immediately on interruption
    setSpeechVolume(0);
    rimeSound.playInterruptionZap();
    setState('INTERRUPTED');
    setLatency(null);

    // Truncate the last PHI AI speech item if it was active
    setTranscript(prev => {
      const copy = [...prev];
      const lastRimeIdx = copy.map(item => item.speaker).findLastIndex(s => s === 'PHI AI' || s === 'RIME');
      if (lastRimeIdx !== -1 && copy[lastRimeIdx].status === 'active') {
        const text = copy[lastRimeIdx].text;
        // Truncate sentence to show it was cut off
        const words = text.split(' ');
        const truncatedText = words.slice(0, Math.max(3, words.length - 4)).join(' ') + '—';
        copy[lastRimeIdx] = {
          ...copy[lastRimeIdx],
          text: truncatedText,
          status: 'interrupted',
        };
      }
      return copy;
    });

    // Append user interruption prompt
    addTimeout(() => {
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'USER',
          text: customUserPrompt,
          status: 'interrupted',
        }
      ]);
      setState('RECOVERING');
      rimeSound.playRecoveryChime();
    }, 400);

    // Transition from recovering back to processing the new routing request (silent reasoning)
    addTimeout(() => {
      setState('THINKING');
      rimeSound.stopAll(); // Silence during reasoning
      setSpeechVolume(0);
      setLatency(120); // Quick adaptive recovery latency
    }, 1800);

    // PHI AI speaks the updated corrected response
    addTimeout(() => {
      rimeSound.stopHum();
      setState('SPEAKING');
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'PHI AI',
          text: "Got it. I'll check Mumbai instead. Analyzing high-speed trains from Chennai central directly to Mumbai Terminus.",
          status: 'recovered',
        }
      ]);

      // Start synthesizer to animate globe lines
      rimeSound.startSpeakingSynth((vol) => {
        setSpeechVolume(vol);
      });
    }, 3200);

    // Transition back to READY - stop all sound when replied
    addTimeout(() => {
      rimeSound.stopAll(); // Stop sound when replied
      setSpeechVolume(0);
      setState('READY');
      setActiveDemoStep(-1);
      setLatency(null);
    }, 7800);
  };

  // 2. Start standard demo scenario
  const handleStartDemo = (scenarioId: string) => {
    clearAllTimeouts();
    rimeSound.stopAll();
    setSpeechVolume(0);
    setTranscript([]);
    setLatency(null);

    if (scenarioId === 'train_bengaluru') {
      setActiveDemoStep(0);
      setState('LISTENING');
      rimeSound.playMicStart();

      // Append User's first request
      addTimeout(() => {
        setTranscript([
          {
            id: 'demo-1',
            speaker: 'USER',
            text: 'Find me a high-speed express train to Bengaluru.',
            status: 'normal',
          }
        ]);
        rimeSound.stopAll(); // Stop sound when user finishes speaking
      }, 1500);

      // AI Reasoning (silent)
      addTimeout(() => {
        setActiveDemoStep(1);
        setState('THINKING');
        rimeSound.stopAll(); // Silence during reasoning
        setSpeechVolume(0);
        setLatency(190); // Simulated cold start latency
      }, 2500);

      // AI Speaking
      addTimeout(() => {
        setActiveDemoStep(2);
        rimeSound.stopHum();
        setState('SPEAKING');
        setTranscript(prev => [
          ...prev,
          {
            id: 'demo-2',
            speaker: 'PHI AI',
            text: "Sure, I'm checking the available high-speed rail connections for Bengaluru departing today—",
            status: 'active',
          }
        ]);

        rimeSound.startSpeakingSynth((vol) => {
          setSpeechVolume(vol);
        });
      }, 4200);

      // Trigger user interruption (collides mid-speech!)
      addTimeout(() => {
        setActiveDemoStep(3);
        triggerInterruption('Wait, Mumbai instead.');
      }, 6400);

      // We update the active step tracker during the interruption phase
      addTimeout(() => {
        setActiveDemoStep(4);
      }, 8200);

    } else if (scenarioId === 'quick_weather') {
      setActiveDemoStep(0);
      setState('LISTENING');
      rimeSound.playMicStart();

      addTimeout(() => {
        setTranscript([
          {
            id: 'weather-1',
            speaker: 'USER',
            text: 'What is the current wind speed in Tokyo right now?',
            status: 'normal',
          }
        ]);
        rimeSound.stopAll(); // Stop sound when user finishes speaking
      }, 1500);

      addTimeout(() => {
        setActiveDemoStep(1);
        setState('THINKING');
        rimeSound.stopAll(); // Silence during reasoning
        setSpeechVolume(0);
        setLatency(85);
      }, 2500);

      addTimeout(() => {
        setActiveDemoStep(2);
        rimeSound.stopHum();
        setState('SPEAKING');
        setTranscript(prev => [
          ...prev,
          {
            id: 'weather-2',
            speaker: 'PHI AI',
            text: "Tokyo radar shows a low pressure system moving inland, bringing winds of—",
            status: 'active',
          }
        ]);

        rimeSound.startSpeakingSynth((vol) => {
          setSpeechVolume(vol);
        });
      }, 3500);

      addTimeout(() => {
        setActiveDemoStep(3);
        triggerInterruption('Wait, London instead. Just need wind speeds.');
      }, 5500);

      addTimeout(() => {
        setActiveDemoStep(4);
      }, 7500);
    }
  };

  // 3. User manual microphone tap interaction
  const handleMicTap = () => {
    if (state === 'READY') {
      // Begin manual query capture simulation - Stop all sound immediately when asking
      clearAllTimeouts();
      rimeSound.stopAll();
      setSpeechVolume(0);
      setLatency(null);
      setState('LISTENING');
      rimeSound.playMicStart();

      // Automatically simulate user finishing speech after 3 seconds
      addTimeout(() => {
        rimeSound.stopAll(); // Stop sound when user finishes asking
        setTranscript(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: 'USER',
            text: "Hello PHI AI, run diagnostic checks on the orbital grid.",
            status: 'normal',
          }
        ]);
        setState('THINKING');
        rimeSound.stopAll(); // Silence during reasoning
        setSpeechVolume(0);
        setLatency(210);
      }, 3000);

      // AI starts speaking back
      addTimeout(() => {
        rimeSound.stopHum();
        setState('SPEAKING');
        setTranscript(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: 'PHI AI',
            text: "Orbital diagnostic loop initiated. Checking thermal vents, node links, and telemetry stream synchronize buffers—",
            status: 'active',
          }
        ]);

        rimeSound.startSpeakingSynth((vol) => {
          setSpeechVolume(vol);
        });
      }, 4800);

      // Complete naturally if not interrupted - Stop sound when replied
      addTimeout(() => {
        if (stateRef.current === 'SPEAKING') {
          rimeSound.stopAll(); // Stop sound when replied
          setSpeechVolume(0);
          setState('READY');
          setLatency(null);
          setTranscript(prev => {
            const copy = [...prev];
            const lastIdx = copy.map(item => item.speaker).findLastIndex(s => s === 'PHI AI' || s === 'RIME');
            if (lastIdx !== -1) {
              copy[lastIdx] = {
                ...copy[lastIdx],
                text: "Orbital diagnostic loop initiated. Checking thermal vents, node links, and telemetry stream synchronize buffers. All systems nominal.",
                status: 'normal'
              };
            }
            return copy;
          });
        }
      }, 10500);

    } else if (state === 'LISTENING') {
      // Cancel capture / stop sound
      clearAllTimeouts();
      rimeSound.stopAll();
      setSpeechVolume(0);
      setState('READY');
    } else if (state === 'SPEAKING') {
      // MANUAL INTERRUPTION TRIGGER!
      rimeSound.stopAll();
      setSpeechVolume(0);
      triggerInterruption('Wait, abort diagnostic check and open grid maps.');
    }
  };

  const handleAbort = () => {
    clearAllTimeouts();
    rimeSound.stopAll(); // Stop all sound
    setSpeechVolume(0);
    setState('READY');
    setActiveDemoStep(-1);
    setLatency(null);
  };

  return (
    <main className="relative h-screen max-h-screen w-full bg-[#020205] text-white flex flex-col items-center justify-between overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* 3D Cyberpunk Background Layer */}
      <BackgroundParticles />

      {/* Header / Top Nav (Removed) */}
      <div className="hidden" />

      {/* Main Screen Layout Container */}
      <div className="w-full max-w-7xl mx-auto px-4 py-2 flex-1 flex flex-col items-center justify-between relative z-10 overflow-hidden">
        
        {/* Absolute header / Hero banner */}
        <div id="phi-ai-top-center-brand" className="text-center mt-1 sm:mt-2 mb-1 relative shrink-0 flex flex-col items-center justify-center">
          {/* Distinctive PHI AI Emblem / Title in Orbitron Font */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center mb-1.5"
          >
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_24px_rgba(6,182,212,0.22)] hover:border-cyan-400/60 transition-all duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></span>
              </span>
              <h1 
                className="font-phi text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-[0.32em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)] select-none pl-1"
                style={{ fontFamily: "'Orbitron', 'Syne', sans-serif" }}
              >
                PHI AI
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase">
                Voice Core
              </span>
            </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg md:text-xl font-bold tracking-tight leading-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
          >
            Talk naturally. <span className="text-cyan-400 bg-none text-cyan-400/90 font-extrabold shadow-cyan-400/10">Interrupt freely.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-[9px] sm:text-[10px] text-zinc-400 max-w-md mx-auto mt-0.5 tracking-wide font-normal"
          >
            An AI voice agent designed to understand context collisions, adapt and recover in real time without audio drift.
          </motion.p>
        </div>

        {/* Central interactive balanced layout: Globe & Mic in exact dead center, Transcript on right */}
        <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 xl:gap-8 my-auto relative">
          
          {/* Left Spacer: Symmetrically balances the right transcript panel so Center is at exact 50% dead center */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 pointer-events-none" />

          {/* Center Column: Globe & States & Microphone (DEAD CENTER of screen) */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-md">
            
            {/* Status indicator text placed cleanly right above the globe */}
            <div className="mb-2 shrink-0 flex justify-center">
              <StateIndicator state={state} />
            </div>

            {/* Globe Canvas Container */}
            <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] md:w-[260px] md:h-[260px] flex items-center justify-center shrink-0">
              <AIGlobe state={state} speechVolume={speechVolume} />
            </div>

            {/* Microphone Control Button directly centered underneath the globe */}
            <div className="mt-2 shrink-0 flex justify-center">
              <VoiceControl state={state} onClick={handleMicTap} />
            </div>
          </div>

          {/* Right Column: Telemetry Feed / Transcript Panel */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col items-center justify-center z-20">
            <ConversationPanel transcript={transcript} currentState={state} />
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="w-full h-1 shrink-0" />
      </div>

      {/* Footer system details (Removed) */}
      <div className="hidden" />

      {/* RIME Core Concepts & Architecture slideover / Modal (ABOUT) */}
      <AnimatePresence>
        {showAboutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-950/90 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono">Φ</div>
                  <h3 className="font-mono text-xs font-black tracking-widest uppercase text-zinc-100">PHI AI CONVERSATIONAL ARCHITECTURE</h3>
                </div>
                <button 
                  onClick={() => setShowAboutModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
                <p>
                  Traditional voice bots are conversational turn-based state machines. If a user speaks while the bot is outputting audio, the system breaks, registers overlapping speech as errors, or forces the user to wait out the output cycle.
                </p>

                <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl font-mono text-[10px] space-y-1 text-cyan-300">
                  <div className="font-extrabold text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    SIG COLLISION PRINCIPLE
                  </div>
                  <div>1. STOP ACTIVE SPEECH AUDIO IMMEDIATELY</div>
                  <div>2. FLUSH / INVALIDATE OLD INCOMPLETE QUERY</div>
                  <div>3. CAPTURE NEW VOICE STREAM COLLISION</div>
                  <div>4. UPDATE LOCAL CONTEXT SYNC BUFFER</div>
                  <div>5. STREAM OUT FRESH RESPONSE ENVELOPE</div>
                </div>

                <p>
                  PHI AI solves this through a continuous telemetry stream. Built for low-latency, voice-first devices, its core concept keeps the speech synthesis channel and reasoning modules fully decoupled, allowing spontaneous interruption at any point during output.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/2 border border-white/5 p-2 rounded-lg text-center">
                    <span className="block font-mono text-[14px] font-black text-cyan-400 leading-none">85ms</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-wider mt-1.5 block">LATENCY CEILING</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-2 rounded-lg text-center">
                    <span className="block font-mono text-[14px] font-black text-emerald-400 leading-none">100%</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-wider mt-1.5 block">INTERRUPTIBLE</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-2 rounded-lg text-center">
                    <span className="block font-mono text-[14px] font-black text-purple-400 leading-none">Full-Duplex</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-wider mt-1.5 block">STREAM FLOW</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIME Integration Guide Slideover (SYSTEM DOCS) */}
      <AnimatePresence>
        {showDocModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-950/90 border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  <h3 className="font-mono text-xs font-black tracking-widest uppercase text-zinc-100">FUTURE API INTEGRATION MANUAL</h3>
                </div>
                <button 
                  onClick={() => setShowDocModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans max-h-96 overflow-y-auto pr-1">
                <p>
                  To transition this frontend from simulated state machines to real production voice pipes, integrate the pre-architected <code className="text-purple-300 font-mono bg-purple-950/40 px-1 rounded">RimeVoiceEngine</code> schema.
                </p>

                <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl font-mono text-[9px] text-zinc-400 space-y-2">
                  <div className="text-zinc-500 font-bold uppercase tracking-wider">{"// RimeVoiceEngine Core Integration API"}</div>
                  <div>
                    <span className="text-purple-400 font-bold">interface</span> <span className="text-blue-300">RimeVoiceEngine</span> {'{'}
                    <div className="pl-4">
                      startSpeaking(text: <span className="text-emerald-400">string</span>): <span className="text-purple-400">void</span>; <span className="text-zinc-600">{"// streams synthesizer audio"}</span>
                    </div>
                    <div className="pl-4">
                      stopSpeaking(): <span className="text-purple-400">void</span>; <span className="text-zinc-600">{"// stops audio context outputs"}</span>
                    </div>
                    <div className="pl-4">
                      interrupt(): <span className="text-purple-400">void</span>; <span className="text-zinc-600">{"// fires cancel signal to TTS server"}</span>
                    </div>
                    <div className="pl-4">
                      getState(): <span className="text-blue-300">SystemState</span>; <span className="text-zinc-600">{"// gets current telemetry state"}</span>
                    </div>
                    {'}'}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl font-mono text-[9px] text-zinc-400 space-y-2">
                  <div className="text-zinc-500 font-bold uppercase tracking-wider">{"// Hook callback triggers for hardware integrations"}</div>
                  <div>
                    <span className="text-purple-400 font-bold">const</span> handleVADCollision = () =&gt; {'{'}
                    <div className="pl-4">
                      <span className="text-zinc-500">{"// 1. STOP CURRENT AUDIO EMISSION INSTANTLY"}</span>
                    </div>
                    <div className="pl-4">
                      voiceEngine.stopSpeaking();
                    </div>
                    <div className="pl-4">
                      <span className="text-zinc-500">{"// 2. INVALIDATE OLD UNFINISHED SERVER REQUEST"}</span>
                    </div>
                    <div className="pl-4">
                      voiceEngine.interrupt();
                    </div>
                    <div className="pl-4">
                      <span className="text-zinc-500">{"// 3. COMMENCE HIGHSPEED LISTEN MODE"}</span>
                    </div>
                    <div className="pl-4">
                      voiceEngine.startListening();
                    </div>
                    {'}'}
                  </div>
                </div>

                <p className="text-zinc-400 text-[10px]">
                  PHI AI uses WebSockets for duplex communication. Audio frames (PCM raw buffers) are sent upstream, while synthetic speech envelopes are streamed downstream in chunks. For details on Cloud Run streaming adapters, check the root documentation files.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

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
  const [speechVolume, setSpeechVolume] = useState<number>(0.2);
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
    rimeSound.playInterruptionZap();
    setState('INTERRUPTED');
    setLatency(null);

    // Truncate the last RIME speech item if it was active
    setTranscript(prev => {
      const copy = [...prev];
      const lastRimeIdx = copy.map(item => item.speaker).lastIndexOf('RIME');
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

    // Transition from recovering back to processing the new routing request
    addTimeout(() => {
      setState('THINKING');
      rimeSound.startHum();
      setLatency(120); // Quick adaptive recovery latency
    }, 1800);

    // RIME speaks the updated corrected response
    addTimeout(() => {
      rimeSound.stopHum();
      setState('SPEAKING');
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'RIME',
          text: "Got it. I'll check Mumbai instead. Analyzing high-speed trains from Chennai central directly to Mumbai Terminus.",
          status: 'recovered',
        }
      ]);

      // Start synthesizer to animate globe lines
      rimeSound.startSpeakingSynth((vol) => {
        setSpeechVolume(vol);
      });
    }, 3200);

    // Transition back to READY
    addTimeout(() => {
      rimeSound.stopSpeakingSynth();
      setState('READY');
      setActiveDemoStep(-1);
      setLatency(null);
    }, 7800);
  };

  // 2. Start standard demo scenario
  const handleStartDemo = (scenarioId: string) => {
    clearAllTimeouts();
    rimeSound.stopSpeakingSynth();
    rimeSound.stopHum();
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
        rimeSound.playMicStop();
      }, 1500);

      // AI Reasoning
      addTimeout(() => {
        setActiveDemoStep(1);
        setState('THINKING');
        rimeSound.startHum();
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
            speaker: 'RIME',
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
        rimeSound.playMicStop();
      }, 1500);

      addTimeout(() => {
        setActiveDemoStep(1);
        setState('THINKING');
        rimeSound.startHum();
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
            speaker: 'RIME',
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
      // Begin manual query capture simulation
      clearAllTimeouts();
      setLatency(null);
      setState('LISTENING');
      rimeSound.playMicStart();

      // Automatically simulate user finishing speech after 3 seconds
      addTimeout(() => {
        rimeSound.playMicStop();
        setTranscript(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: 'USER',
            text: "Hello RIME, run diagnostic checks on the orbital grid.",
            status: 'normal',
          }
        ]);
        setState('THINKING');
        rimeSound.startHum();
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
            speaker: 'RIME',
            text: "Orbital diagnostic loop initiated. Checking thermal vents, node links, and telemetry stream synchronize buffers—",
            status: 'active',
          }
        ]);

        rimeSound.startSpeakingSynth((vol) => {
          setSpeechVolume(vol);
        });
      }, 4800);

      // Complete naturally if not interrupted
      addTimeout(() => {
        if (stateRef.current === 'SPEAKING') {
          rimeSound.stopSpeakingSynth();
          setState('READY');
          setLatency(null);
          setTranscript(prev => {
            const copy = [...prev];
            const lastIdx = copy.map(item => item.speaker).lastIndexOf('RIME');
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
      // Cancel capture
      clearAllTimeouts();
      rimeSound.playMicStop();
      setState('READY');
    } else if (state === 'SPEAKING') {
      // MANUAL INTERRUPTION TRIGGER! Extremely rewarding to click while speaking
      triggerInterruption('Wait, abort diagnostic check and open grid maps.');
    }
  };

  const handleAbort = () => {
    clearAllTimeouts();
    rimeSound.stopSpeakingSynth();
    rimeSound.stopHum();
    setState('READY');
    setActiveDemoStep(-1);
    setLatency(null);
  };

  return (
    <main className="relative min-h-screen lg:h-screen lg:max-h-screen bg-[#020205] text-white flex flex-col items-center justify-between lg:overflow-hidden overflow-y-auto selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* 3D Cyberpunk Background Layer */}
      <BackgroundParticles />

      {/* Header / Top Nav */}
      <Navigation 
        currentState={state} 
        onDemoClick={() => handleStartDemo('train_bengaluru')} 
        onAboutClick={() => setShowAboutModal(true)} 
        onSystemClick={() => setShowDocModal(true)}
      />

      {/* Main Screen Layout Container */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-2 pb-2 flex-1 flex flex-col items-center justify-between relative z-10 overflow-hidden">
        
        {/* Absolute header / Hero banner */}
        <div className="text-center mt-1 mb-1 relative">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[8px] font-mono tracking-[0.4em] text-cyan-400 font-extrabold uppercase mb-1"
          >
            VOICE INTELLIGENCE OPERATING PLATFORM
          </motion.p>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
          >
            Talk naturally. <span className="text-cyan-400 bg-none text-cyan-400/90 font-extrabold shadow-cyan-400/10">Interrupt freely.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[10px] sm:text-xs text-zinc-400 max-w-md mx-auto mt-1 tracking-wide font-normal"
          >
            An AI voice agent designed to understand context collisions, adapt and recover in real time without audio drift.
          </motion.p>
        </div>

        {/* Central interactive grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-center justify-center my-1.5 flex-1">
          
          {/* Left panel: Scenario sequencer (Desktop) */}
          <div className="hidden lg:block lg:col-span-3 h-full">
            <div className="sticky top-20">
              <DemoController 
                onStartDemo={handleStartDemo} 
                onReset={handleAbort} 
                currentState={state}
                demoProgress={activeDemoStep !== -1 ? (activeDemoStep + 1) * 20 : 0}
                activeDemoStep={activeDemoStep}
              />
            </div>
          </div>

          {/* Center Column: Globe & States */}
          <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center relative min-h-[260px] sm:min-h-[300px] h-[340px]">
            
            {/* Globe Canvas */}
            <div className="relative w-full h-full flex items-center justify-center">
              <AIGlobe state={state} speechVolume={speechVolume} />
              
              {/* Foreground Overlay HUD details */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-20">
                <StateIndicator state={state} />
              </div>
            </div>

            {/* Microphone Control Button */}
            <div className="mt-2 z-20">
              <VoiceControl state={state} onClick={handleMicTap} />
            </div>
          </div>

          {/* Right Column: Telemetry Feed */}
          <div className="hidden lg:block lg:col-span-3 h-full">
            <div className="sticky top-20">
              <SystemStatus state={state} latency={latency} />
            </div>
          </div>
        </div>

        {/* Bottom Area: Transcripts & Responsive columns for Mobile devices */}
        <div className="w-full flex flex-col items-center gap-3 mt-1 pb-1">
          
          {/* Live transcripts panel (All devices) */}
          <ConversationPanel transcript={transcript} currentState={state} />

          {/* Inline system status blocks for mobile devices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 w-full max-w-2xl">
            <DemoController 
              onStartDemo={handleStartDemo} 
              onReset={handleAbort} 
              currentState={state}
              demoProgress={activeDemoStep !== -1 ? (activeDemoStep + 1) * 20 : 0}
              activeDemoStep={activeDemoStep}
            />
            <SystemStatus state={state} latency={latency} />
          </div>

        </div>
      </div>

      {/* Footer system details */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-2 border-t border-white/5 relative z-10 flex flex-col sm:flex-row items-center justify-between text-zinc-500 font-mono text-[9px] gap-1 shrink-0">
        <div className="flex items-center gap-1.5 uppercase tracking-widest font-black text-cyan-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
          </span>
          SESSION #001
        </div>
        
        <div className="uppercase tracking-widest text-center">
          Real-time voice interaction // RIME Synthesis Engine
        </div>

        <div className="flex items-center gap-4">
          <span className="uppercase tracking-wider">
            Response: {latency ? `${latency} ms` : '-- ms'}
          </span>
          <span className="uppercase tracking-wider text-emerald-400">
            JITTER: &lt; 2ms
          </span>
        </div>
      </footer>

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
                  <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono">A</div>
                  <h3 className="font-mono text-xs font-black tracking-widest uppercase text-zinc-100">RIME CONVERSATIONAL ARCHITECTURE</h3>
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
                  RIME solves this through an continuous telemetry stream. Built for low-latency, voice-first devices, its core concept keeps the speech synthesis channel and reasoning modules fully decoupled, allowing spontaneous interruption at any point during output.
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
                  RIME uses WebSockets for duplex communication. Audio frames (PCM raw buffers) are sent upstream, while synthetic speech envelopes are steamed downstream in chunks. For details on Cloud Run streaming adapters, check the root documentation files.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

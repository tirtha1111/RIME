'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  HelpCircle, 
  Settings, 
  Activity, 
  RefreshCw, 
  Cpu, 
  Radio, 
  X, 
  Key, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

import dynamic from 'next/dynamic';
import VoiceControl from '@/components/VoiceControl';
import ConversationPanel, { TranscriptItem, GeneratedImageMetadata } from '@/components/ConversationPanel';
import AudioTelemetryPanel from '@/components/AudioTelemetryPanel';
import StateIndicator from '@/components/StateIndicator';
import BackgroundParticles from '@/components/BackgroundParticles';
import LanguageSelector from '@/components/LanguageSelector';
import ImageWindowModal from '@/components/ImageWindowModal';
import { rimeSound } from '@/lib/audio';
import { rimeAudioClient } from '@/lib/rimeAudioClient';
import { RIME_LANGUAGES, RimeLanguage, getLanguageById } from '@/lib/rimeVoices';

const AIGlobe = dynamic(() => import('@/components/AIGlobe'), { ssr: false });

type SystemState = 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
type AuthStatus = 'PENDING' | 'VERIFYING' | 'AUTHENTICATED';

interface InterruptedContext {
  previousAssistantText: string;
  wasInterrupted: boolean;
  timestamp: number;
}

export default function Home() {
  const [state, setState] = useState<SystemState>('READY');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('PENDING');
  const [hostName, setHostName] = useState<string | null>(null);
  
  const [latency, setLatency] = useState<number | null>(null);
  const [speechVolume, setSpeechVolume] = useState<number>(0);
  const [micEnergy, setMicEnergy] = useState<number>(0);
  const [isAlwaysOnActive, setIsAlwaysOnActive] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  
  // Rime Voice language & speaker state
  const [selectedLanguage, setSelectedLanguage] = useState<RimeLanguage>(RIME_LANGUAGES[0]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>(RIME_LANGUAGES[0].defaultSpeaker);
  const [isRimeConfigured, setIsRimeConfigured] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // Modals
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showSecretsModal, setShowSecretsModal] = useState<boolean>(false);
  const [activeImageModal, setActiveImageModal] = useState<GeneratedImageMetadata | null>(null);

  // Interruption Memory
  const [interruptedContext, setInterruptedContext] = useState<InterruptedContext | null>(null);

  // Refs
  const timeoutsRef = useRef<number[]>([]);
  const stateRef = useRef<SystemState>('READY');
  const authStatusRef = useRef<AuthStatus>('PENDING');
  const hostNameRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<TranscriptItem[]>([]);
  const latestGeneratedImageRef = useRef<GeneratedImageMetadata | null>(null);
  const selectedLangRef = useRef<RimeLanguage>(RIME_LANGUAGES[0]);
  const selectedSpeakerRef = useRef<string>(RIME_LANGUAGES[0].defaultSpeaker);
  const isAlwaysOnActiveRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interruptedContextRef = useRef<InterruptedContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentSpokenTextRef = useRef<string>('');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    hostNameRef.current = hostName;
  }, [hostName]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    selectedLangRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    selectedSpeakerRef.current = selectedSpeaker;
  }, [selectedSpeaker]);

  useEffect(() => {
    isAlwaysOnActiveRef.current = isAlwaysOnActive;
  }, [isAlwaysOnActive]);

  useEffect(() => {
    interruptedContextRef.current = interruptedContext;
  }, [interruptedContext]);

  // Check Rime configuration status on mount
  useEffect(() => {
    fetch('/api/rime/status')
      .then(r => r.json())
      .then(data => {
        setIsRimeConfigured(Boolean(data.configured));
      })
      .catch(() => setIsRimeConfigured(false));
  }, []);

  const addTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // Primary speech synthesis powered by Rime Voice API
  const speakRimeText = (
    text: string, 
    langOverride?: string, 
    speakerOverride?: string, 
    onEndCallback?: () => void
  ) => {
    const lang = langOverride || selectedLangRef.current.id;
    const speaker = speakerOverride || selectedSpeakerRef.current;
    const model = selectedLangRef.current.defaultModel || 'coda';

    currentSpokenTextRef.current = text;
    setState('SPEAKING');

    rimeAudioClient.playRimeSpeech({
      text,
      lang,
      speaker,
      modelId: model,
      onStart: () => {
        setState('SPEAKING');
      },
      onVolumeChange: (vol) => {
        setSpeechVolume(vol);
      },
      onEnded: () => {
        setSpeechVolume(0);
        currentSpokenTextRef.current = '';
        if (onEndCallback) {
          onEndCallback();
        } else {
          setState('READY');
          setLatency(null);
          setTranscript(prev => {
            const copy = [...prev];
            const lastIdx = copy.findLastIndex(item => item.speaker === 'PHI AI');
            if (lastIdx !== -1 && copy[lastIdx].status === 'active') {
              copy[lastIdx].status = 'normal';
            }
            return copy;
          });
        }
      },
      onError: (err) => {
        console.warn("Rime speech synthesis note:", err);
      }
    });
  };

  // Trigger interruption when user speaks during assistant speech
  const triggerInterruption = useCallback(() => {
    if (stateRef.current !== 'SPEAKING') return;

    clearAllTimeouts();
    rimeAudioClient.stop();
    rimeSound.stopAll();
    setSpeechVolume(0);
    rimeSound.playInterruptionZap();

    const previousText = currentSpokenTextRef.current || transcriptRef.current.findLast(t => t.speaker === 'PHI AI')?.text || '';
    
    // Save interrupted context so Groq openai/gpt-oss-120b follows up smoothly
    const contextObj: InterruptedContext = {
      previousAssistantText: previousText,
      wasInterrupted: true,
      timestamp: Date.now()
    };
    setInterruptedContext(contextObj);
    interruptedContextRef.current = contextObj;

    // Truncate assistant transcript item with visual interruption marker
    setTranscript(prev => {
      const copy = [...prev];
      const lastRimeIdx = copy.findLastIndex(item => item.speaker === 'PHI AI');
      if (lastRimeIdx !== -1 && (copy[lastRimeIdx].status === 'active' || copy[lastRimeIdx].status === 'normal')) {
        const text = copy[lastRimeIdx].text;
        const words = text.split(' ');
        const truncatedText = words.slice(0, Math.max(3, words.length - 2)).join(' ') + '—';
        copy[lastRimeIdx] = {
          ...copy[lastRimeIdx],
          text: truncatedText,
          status: 'interrupted',
        };
      }
      return copy;
    });

    setState('INTERRUPTED');
    
    addTimeout(() => {
      setState('LISTENING');
    }, 250);
  }, []);

  // Send query to Groq openai/gpt-oss-120b
  const handleSendQuery = useCallback(async (queryText?: string) => {
    setState('THINKING');
    setLatency(120);
    rimeAudioClient.stop();
    rimeSound.stopAll();

    // Stop speech recognition to clear buffer for the next turn
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const userQuery = queryText || transcriptRef.current.findLast(t => t.speaker === 'USER')?.text || '';
    if (!userQuery.trim() || userQuery === '...') {
      setState('READY');
      setLatency(null);
      return;
    }

    setTranscript(prev => {
      const copy = [...prev];
      const lastIdx = copy.findLastIndex(item => item.speaker === 'USER');
      if (lastIdx !== -1) copy[lastIdx].status = 'normal';
      return copy;
    });

    if (authStatusRef.current === 'VERIFYING') {
      const lowerQuery = userQuery.toLowerCase();
      if (lowerQuery.includes('aditya') || lowerQuery.includes('tirtharaj')) {
        const matchedName = lowerQuery.includes('aditya') ? 'Aditya' : 'Tirtharaj';
        setHostName(matchedName);
        setAuthStatus('AUTHENTICATED');
        setState('SPEAKING');
        
        const replyText = `Identity confirmed. Welcome, ${matchedName}.`;
        setTranscript(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: 'PHI AI',
            text: replyText,
            status: 'active',
          }
        ]);
        speakRimeText(replyText);
      } else {
        setAuthStatus('PENDING');
        setState('SPEAKING');
        
        const replyText = "Permission denied. Unrecognized host.";
        setTranscript(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: 'PHI AI',
            text: replyText,
            status: 'active',
          }
        ]);
        speakRimeText(replyText);
      }
      return;
    }

    try {
      const start = performance.now();
      const currentInterruption = interruptedContextRef.current;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userQuery, 
          hostName: hostNameRef.current,
          lang: selectedLangRef.current.id,
          interruptedContext: currentInterruption,
          history: transcriptRef.current.slice(-4).map(t => ({ speaker: t.speaker, text: t.text })),
          activeImage: latestGeneratedImageRef.current
        })
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);

      // Reset interrupted context once followed up
      setInterruptedContext(null);
      interruptedContextRef.current = null;

      // Track generated image & open separate window if requested
      if (data.image) {
        latestGeneratedImageRef.current = data.image;
      }
      if (data.openImageWindow || data.intent === 'open-image-window') {
        const targetImg = data.image || latestGeneratedImageRef.current;
        if (targetImg) {
          setActiveImageModal(targetImg);
        }
      }

      setState('SPEAKING');
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'PHI AI',
          text: data.text,
          status: data.followedUpOnInterruption ? 'recovered' : 'active',
          image: data.image || null,
        }
      ]);
      
      speakRimeText(data.text);
      
    } catch (err) {
      console.error("Groq chat error:", err);
      setState('READY');
      setLatency(null);
    }
  }, []);

  // Validate if captured text constitutes an actual verbal statement (filters out room noise, clicks, breathing)
  const isValidVerbalStatement = useCallback((text: string): boolean => {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 2) return false;
    // Must contain actual alphabetic or unicode word characters
    const hasLetters = /[a-zA-Z\u0900-\u097F\u00C0-\u024F\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF]/.test(cleaned);
    if (!hasLetters) return false;
    
    // Ignore isolated non-statement filler noise syllables
    const lower = cleaned.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
    const noiseFillers = new Set(['um', 'uh', 'ah', 'er', 'mm', 'hmm', 'shh', 'oh', 'tch']);
    if (noiseFillers.has(lower)) return false;

    return true;
  }, []);

  // Check if verbal text constitutes a genuine statement to interrupt ongoing decision-making / speech
  const isInterruptionStatement = useCallback((text: string): boolean => {
    const cleaned = text.trim();
    if (!isValidVerbalStatement(cleaned)) return false;
    const words = cleaned.split(/\s+/).filter(Boolean);
    // At least 2 spoken words, OR a distinct verbal command of at least 2 characters (e.g., "no", "stop", "wait")
    if (words.length >= 2) return true;
    if (words.length === 1 && cleaned.length >= 2) return true;
    return false;
  }, [isValidVerbalStatement]);

  // Initialize Microphone & VAD Analyser Node (Metering only, never interrupts directly on volume)
  const setupAudioVAD = useCallback(async () => {
    try {
      if (audioContextRef.current && micStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Non-linear sensitivity curve to capture quiet speech signals and whispers cleanly
        const normalized = avg > 0.5 
          ? Math.min(100, Math.round(Math.pow(avg / 90, 0.75) * 100))
          : 0;
        setMicEnergy(normalized);

        // Volume meter is visual-only: Decision-making is never interrupted by raw audio volume
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("Audio VAD setup note:", err);
    }
  }, []);

  // Initialize Speech Recognition in Continuous Mode with Statement Filtering
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage.bcp47;

    recognition.onstart = () => {
      // Mic is active
    };

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      
      // Map over all results and join them to obtain the full complete sentence(s) in this session
      const transcriptText = results
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      // Filter out empty or noise fragments
      if (!isValidVerbalStatement(transcriptText)) return;

      // Statement-gated interruption: ONLY interrupt if a clear verbal statement is passed
      if (stateRef.current === 'SPEAKING' || stateRef.current === 'THINKING') {
        if (isInterruptionStatement(transcriptText)) {
          triggerInterruption();
        } else {
          // Do NOT interrupt decision making or speech for minor non-statement noises
          return;
        }
      }

      // If in READY, transition to LISTENING only when a valid verbal statement starts
      if (stateRef.current === 'READY' || stateRef.current === 'INTERRUPTED') {
        setState('LISTENING');
        rimeSound.playMicStart();
      }

      // Update or append user transcript item
      setTranscript(prev => {
        const copy = [...prev];
        const lastIdx = copy.findLastIndex(item => item.speaker === 'USER');
        
        if (lastIdx !== -1 && copy[lastIdx].status === 'active') {
          copy[lastIdx].text = transcriptText;
          return copy;
        } else {
          return [
            ...copy,
            {
              id: Math.random().toString(),
              speaker: 'USER',
              text: transcriptText,
              status: 'active',
            }
          ];
        }
      });

      // Reset Silence Timer (1400ms pause ensures complete statements without cutting user off)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'LISTENING') {
          const finalQuery = transcriptRef.current.findLast(t => t.speaker === 'USER')?.text || '';
          if (isValidVerbalStatement(finalQuery)) {
            handleSendQuery(finalQuery);
          } else {
            setState('READY');
          }
        }
      }, 1400);
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' is expected during silent intervals in continuous mode
      if (event.error !== 'no-speech') {
        console.warn("Speech recognition status:", event.error);
      }
    };

    recognition.onend = () => {
      // In Always-On mode, automatically restart recognition when it naturally ends
      if (isAlwaysOnActiveRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already running or restart in queue
        }
      }
    };

    recognitionRef.current = recognition;

    // Start recognition automatically
    if (isAlwaysOnActiveRef.current) {
      try {
        recognition.start();
        setupAudioVAD();
      } catch (err) {
        console.warn("Speech recognition auto-start:", err);
      }
    }

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [
    selectedLanguage.bcp47, 
    setupAudioVAD, 
    triggerInterruption, 
    handleSendQuery, 
    isValidVerbalStatement, 
    isInterruptionStatement
  ]);

  // Clean up timers & audio context on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      rimeAudioClient.stop();
      rimeSound.stopHum();
      rimeSound.stopSpeakingSynth();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // When selected language changes, update speech recognition language
  const handleLanguageChange = (newLang: RimeLanguage) => {
    setSelectedLanguage(newLang);
    setSelectedSpeaker(newLang.defaultSpeaker);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang.bcp47;
    }
    // Speak a brief friendly welcome confirmation in the chosen language
    speakRimeText(newLang.welcomeGreeting, newLang.id, newLang.defaultSpeaker);
  };

  const handleSpeakerChange = (speakerId: string) => {
    setSelectedSpeaker(speakerId);
    speakRimeText(`Rime speaker ${speakerId} selected.`, selectedLanguage.id, speakerId);
  };

  const handleTestVoice = (sampleText: string, langId: string, speakerId: string) => {
    setIsPlayingPreview(true);
    speakRimeText(sampleText, langId, speakerId, () => {
      setIsPlayingPreview(false);
      setState('READY');
    });
  };

  // Toggle Always-On Mic Mode
  const handleToggleAlwaysOn = () => {
    const nextState = !isAlwaysOnActive;
    setIsAlwaysOnActive(nextState);
    isAlwaysOnActiveRef.current = nextState;

    if (nextState) {
      setupAudioVAD();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setMicEnergy(0);
      setState('READY');
    }
  };

  // Mic Button tap handler
  const handleMicTap = () => {
    if (!recognitionRef.current) {
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'PHI AI',
          text: 'System Error: Voice-to-Text (Web Speech API) is not supported in this browser. Please use Chrome or Safari.',
          status: 'interrupted',
        }
      ]);
      return;
    }

    setupAudioVAD();

    if (state === 'SPEAKING') {
      // Tap to interrupt
      triggerInterruption();
    } else if (state === 'LISTENING') {
      // Tap to immediately submit captured speech
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      const userText = transcriptRef.current.findLast(t => t.speaker === 'USER')?.text || '';
      if (userText.trim()) {
        handleSendQuery(userText);
      }
    } else {
      // Ensure Always-on is running
      if (!isAlwaysOnActive) {
        handleToggleAlwaysOn();
      } else {
        // Mobile Safari fix: Explicitly restart recognition on user gesture if it died silently
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore if already started
        }
      }
      setState('LISTENING');
      rimeSound.playMicStart();
      setTranscript(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          speaker: 'USER',
          text: '...',
          status: 'active',
        }
      ]);
    }
  };

  // Global click / tap ensures Web Audio context is unblocked
  const handleGlobalInteraction = () => {
    setupAudioVAD();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  return (
    <main 
      onClick={handleGlobalInteraction}
      className="relative w-screen h-screen bg-[#07090e] text-white flex flex-col items-center justify-between font-sans overflow-hidden select-none"
    >
      {/* Dynamic Starfield and Ambient Grid Background */}
      <BackgroundParticles />

      {/* Main UI Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-4 sm:p-6 lg:p-8">
        
        {/* Top Header */}
        <header className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-b border-white/5 pb-4 shrink-0">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 justify-start">
            <div className="relative w-9 h-9 rounded-xl bg-black/90 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center justify-center overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/phi_logo.jpg"
                alt="P.H.I. Insignia"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-black tracking-widest uppercase text-zinc-100">
                  P.H.I.
                </h1>
                <span className="font-mono text-[9px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                  GROQ OSS-120B
                </span>
                <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ALWAYS-ON VAD
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-wider">
                Hands-Free Voice Assistant // Seamless Interruption &amp; Follow-up
              </p>
            </div>
          </div>

          {/* Center: PHI AI Brand Name styled beautifully with distinct font */}
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="font-serif italic text-2xl sm:text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              PHI AI
            </h2>
            <p className="text-[8px] sm:text-[9px] text-zinc-500 font-mono tracking-[0.3em] uppercase mt-0.5">
              Personal Helpful Intelligence
            </p>
          </div>

          {/* Right: Dropdown Language Selector & Status Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            
            {/* Rime Language Dropdown Selector */}
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              selectedSpeaker={selectedSpeaker}
              onLanguageChange={handleLanguageChange}
              onSpeakerChange={handleSpeakerChange}
              onTestVoice={handleTestVoice}
              isRimeConfigured={isRimeConfigured}
              isPlayingPreview={isPlayingPreview}
            />

            {/* Rime Voice Status Pill */}
            <button
              type="button"
              id="rime-status-badge"
              onClick={() => setShowSecretsModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all backdrop-blur-md cursor-pointer ${
                isRimeConfigured
                  ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 border-white/10 text-zinc-300'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isRimeConfigured ? 'Rime Active' : 'API Key Setup'}</span>
            </button>

            {/* Architecture Info Button */}
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              title="About Architecture"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Central interactive balanced layout: Audio Telemetry on Left, Globe & Mic in Center, Transcript on Right */}
        <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-6 xl:gap-8 my-auto relative pt-4 pb-4">
          
          {/* Left Column: Real-time Audio Telemetry & VAD Signal Monitor */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col justify-center z-20 order-3 lg:order-1">
            <AudioTelemetryPanel
              selectedLanguage={selectedLanguage}
              selectedSpeaker={selectedSpeaker}
              isAlwaysOnActive={isAlwaysOnActive}
              micEnergy={micEnergy}
              state={state}
              hasInterruptedContext={Boolean(interruptedContext?.wasInterrupted)}
              interruptedTextPreview={interruptedContext?.previousAssistantText || null}
              onToggleAlwaysOn={handleToggleAlwaysOn}
            />
          </div>

          {/* Center Column: Globe & States & Always-On Microphone (DEAD CENTER of screen) */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-md order-1 lg:order-2">
            
            {/* Status indicator text placed cleanly right above the globe */}
            <div className="mb-2 shrink-0 flex justify-center">
              <StateIndicator state={state} />
            </div>

            {/* Globe Canvas Container */}
            <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] md:w-[260px] md:h-[260px] flex items-center justify-center shrink-0">
              <AIGlobe state={state} speechVolume={speechVolume} />
            </div>

            {/* Always-On Voice Control Button */}
            <div className="mt-3 shrink-0 flex flex-col items-center justify-center w-full">
              <VoiceControl 
                state={state} 
                isAlwaysOnActive={isAlwaysOnActive}
                micEnergy={micEnergy}
                onClick={handleMicTap} 
              />
              
              {/* Metadata strip */}
              <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <span>Model: <span className="text-cyan-300 font-bold">Groq openai/gpt-oss-120b</span></span>
                <span>•</span>
                <span>Speaker: <span className="text-cyan-300 font-bold">{selectedSpeaker}</span></span>
                {latency && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">{latency}ms</span>
                  </>
                )}
              </div>

              {/* Seamless Voice Interruption Tip */}
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-950/40 border border-white/5 px-3 py-1 rounded-full">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Hands-free: Speak a full verbal statement to converse or interrupt</span>
              </div>
            </div>
          </div>

          {/* Right Column: Telemetry Feed / Transcript Panel */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col items-center justify-center z-20 order-2 lg:order-3">
            <ConversationPanel 
              transcript={transcript} 
              currentState={state} 
              onOpenImageModal={setActiveImageModal}
            />
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="w-full h-1 shrink-0" />
      </div>

      {/* Separate Image Window Modal */}
      <ImageWindowModal
        image={activeImageModal}
        isOpen={Boolean(activeImageModal)}
        onClose={() => setActiveImageModal(null)}
      />

      {/* Secrets & API Key Setup Modal */}
      <AnimatePresence>
        {showSecretsModal && (
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
              className="bg-zinc-950/95 border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-cyan-500 via-emerald-500 to-purple-500" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <h3 className="font-mono text-sm font-black tracking-widest uppercase text-zinc-100">
                    GROQ LPU &amp; VOICE SECRETS
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecretsModal(false)}
                  className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300">
                <p className="leading-relaxed">
                  P.H.I. is powered exclusively by Groq LPU inference (<span className="font-mono text-cyan-300">openai/gpt-oss-120b</span>) and ultra-realistic Rime Voice synthesis with Always-On Voice Activity Detection.
                </p>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                    Recommended Environment Variables:
                  </div>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-zinc-300">
                    <li><span className="text-cyan-400 font-bold">GROQ_API_KEY</span>: Groq LPU API key for openai/gpt-oss-120b</li>
                    <li><span className="text-emerald-400 font-bold">RIME_API_KEY</span>: Rime Voice synthesis key</li>
                    <li><span className="text-amber-400 font-bold">HF_TOKEN</span>: Hugging Face key for FLUX image synthesis</li>
                    <li><span className="text-cyan-400 font-bold">FINNHUB_API_KEY</span>: Real-time stock feeds</li>
                    <li><span className="text-cyan-400 font-bold">OPENWEATHERMAP_API_KEY</span>: Real-time weather</li>
                    <li><span className="text-cyan-400 font-bold">NEWS_API_KEY</span>: Real-time global headlines</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[11px] space-y-1">
                  <div className="font-bold">How to configure in AI Studio:</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-zinc-400 text-[10px]">
                    <li>Open the <span className="text-white">Settings</span> menu</li>
                    <li>Select <span className="text-white">Secrets</span></li>
                    <li>Add the variables and reload the app</li>
                  </ol>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSecretsModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
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
              className="bg-zinc-950/95 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-sm font-black tracking-widest uppercase text-zinc-100">
                  SYSTEM ARCHITECTURE
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(false)}
                  className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300 font-mono leading-relaxed">
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5">
                  <div className="text-cyan-400 font-bold mb-0.5">⚡ Continuous Always-On Mic</div>
                  <p className="text-[11px] text-zinc-400">
                    Voice Activity Detection (VAD) monitors ambient audio energy in real time and begins transcribing immediately when you speak.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5">
                  <div className="text-purple-400 font-bold mb-0.5">🔄 Interruption &amp; Context Follow-Up</div>
                  <p className="text-[11px] text-zinc-400">
                    Instant barge-in halts assistant playback and passes the interrupted context to Groq <code className="text-purple-300 font-bold">openai/gpt-oss-120b</code> to seamlessly follow up on previous topics.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5">
                  <div className="text-emerald-400 font-bold mb-0.5">🎙️ Multilingual Rime Voice Synthesis</div>
                  <p className="text-[11px] text-zinc-400">
                    Supports 10+ global languages with sub-150ms speech latency.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAboutModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

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
  const [isAlwaysOnActive, setIsAlwaysOnActive] = useState<boolean>(true);
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
  const isAlwaysOnActiveRef = useRef<boolean>(true);
  const isRecognitionRunningRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interruptedContextRef = useRef<InterruptedContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentSpokenTextRef = useRef<string>('');
  const currentChatSessionIdRef = useRef<number>(0);

  // MediaRecorder Whisper VAD Refs
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const vadSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadSpeakingRef = useRef<boolean>(false);

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

    // Invalidate any in-flight chat query API responses immediately
    currentChatSessionIdRef.current += 1;

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

    // Increment chat session ID and capture current value
    currentChatSessionIdRef.current += 1;
    const chatSessionId = currentChatSessionIdRef.current;

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

      // Discard this response if user interrupted or triggered a new query while fetching
      if (chatSessionId !== currentChatSessionIdRef.current) {
        console.log("Discarded stale chat response due to interruption.");
        return;
      }

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

    // Echo cancellation guard: ignore if the recognized text is a substring of what the assistant is currently speaking
    if (currentSpokenTextRef.current) {
      const assistantLower = currentSpokenTextRef.current.toLowerCase();
      const userLower = cleaned.toLowerCase();
      if (assistantLower.includes(userLower) || userLower.includes(assistantLower)) {
        return false;
      }
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    // At least 2 spoken words, OR a distinct verbal command of at least 2 characters (e.g., "no", "stop", "wait")
    if (words.length >= 2) return true;
    if (words.length === 1 && cleaned.length >= 2) return true;
    return false;
  }, [isValidVerbalStatement]);

  // Start recording audio chunks via MediaRecorder
  const startRecording = useCallback(() => {
    if (!micStreamRef.current || isRecordingRef.current) return;
    
    try {
      audioChunksRef.current = [];
      const options = { mimeType: 'audio/webm' };
      let recorder: any;
      try {
        recorder = new MediaRecorder(micStreamRef.current, options);
      } catch (e) {
        // Safe fallback for browsers (like Safari) with limited format selections
        recorder = new MediaRecorder(micStreamRef.current);
      }
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        
        // Skip tiny/noisy recordings (under 1.5 KB is likely a brief non-verbal sound or tap)
        if (audioBlob.size < 1500) {
          if (stateRef.current === 'LISTENING') {
            setState('READY');
          }
          return;
        }
        
        setState('THINKING');
        
        try {
          const mimeType = audioBlob.type || 'audio/webm';
          const extension = mimeType.split(';')[0].split('/')[1] || 'webm';
          
          const formData = new FormData();
          formData.append('file', audioBlob, `speech.${extension}`);
          formData.append('lang', selectedLangRef.current.id);
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Transcription API error');
          }
          
          const resData = await response.json();
          const text = (resData.text || '').trim();
          
          // Filter out Whisper silent/hallucinatory phrases (such as "Thank you.", "You", "Subscribed", etc.)
          const cleanNorm = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
          const WHISPER_HALLUCINATIONS = [
            'thank you',
            'thank you very much',
            'thank you for watching',
            'you',
            'subscribed',
            'please subscribe',
            'bye',
            'watching',
            'youtube'
          ];
          if (WHISPER_HALLUCINATIONS.includes(cleanNorm) || cleanNorm === '') {
            console.log("Filtered out Whisper hallucination:", text);
            setState('READY');
            return;
          }
          
          if (text.length >= 2) {
            // Echo/self-interruption cancellation check
            if (currentSpokenTextRef.current) {
              const assistantLower = currentSpokenTextRef.current.toLowerCase();
              const userLower = text.toLowerCase();
              if (assistantLower.includes(userLower) || userLower.includes(assistantLower)) {
                setState('READY');
                return;
              }
            }

            // Stop any ongoing speech if the user said a valid statement
            if (stateRef.current === 'SPEAKING' || stateRef.current === 'THINKING') {
              triggerInterruption();
            }
            
            // Render user transcript bubble
            setTranscript(prev => {
              const copy = prev.map(item => item.status === 'active' ? { ...item, status: 'normal' as const } : item);
              return [
                ...copy,
                {
                  id: Math.random().toString(),
                  speaker: 'USER',
                  text: text,
                  status: 'normal',
                }
              ];
            });
            
            // Stream response
            await handleSendQuery(text);
          } else {
            setState('READY');
          }
        } catch (err) {
          console.error("VAD Transcribe error:", err);
          setState('READY');
        }
      };
      
      recorder.start(100);
      isRecordingRef.current = true;
    } catch (err) {
      console.warn("Failed to start MediaRecorder:", err);
    }
  }, [handleSendQuery, triggerInterruption]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      isRecordingRef.current = false;
    }
  }, []);

  // Initialize Microphone & VAD Analyser Node (Metering & voice-driven recording control)
  const setupAudioVAD = useCallback(async () => {
    try {
      // Warm up/create AudioContext synchronously at the start of the user gesture to satisfy mobile Safari's policy
      let audioCtx = audioContextRef.current;
      if (!audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        rimeAudioClient.setAudioContext(audioCtx);
      }

      // Safe resume
      if (audioCtx.state === 'suspended') {
        try {
          audioCtx.resume();
        } catch (e) {}
      }

      if (micStreamRef.current && analyserRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silentTicks = 0;
      let consecutiveSpeechFrames = 0; // Accumulates consecutive loud frames to filter transient noise

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = avg > 0.5 
          ? Math.min(100, Math.round(Math.pow(avg / 90, 0.75) * 100))
          : 0;
        setMicEnergy(normalized);

        // Always-On voice activity tracking loop
        if (isAlwaysOnActiveRef.current) {
          // Speak / speech activity gate
          const SPEECH_THRESHOLD = 15; // Ignore low-level background noise
          
          if (normalized > SPEECH_THRESHOLD) {
            consecutiveSpeechFrames++;
            
            // To interrupt the AI, require continuous sustained sound (e.g. 50 frames ~800ms, representing 3-5 continuous words)
            // If the AI is NOT speaking, we want immediate responsiveness (e.g. 5 frames ~80ms)
            const requiredFrames = stateRef.current === 'SPEAKING' ? 50 : 5;
            
            if (consecutiveSpeechFrames >= requiredFrames) {
              silentTicks = 0;
              
              // Immediate interruption on validated sustained continuous voice activity
              if (stateRef.current === 'SPEAKING') {
                triggerInterruption();
              }
              
              if (!vadSpeakingRef.current) {
                vadSpeakingRef.current = true;
                setState('LISTENING');
                rimeSound.playMicStart();
                startRecording();
              }
              
              if (vadSilenceTimerRef.current) {
                clearTimeout(vadSilenceTimerRef.current);
                vadSilenceTimerRef.current = null;
              }
            }
          } else {
            // Decay consecutive speech tracker if input drops below threshold
            consecutiveSpeechFrames = Math.max(0, consecutiveSpeechFrames - 2);
            
            if (vadSpeakingRef.current) {
              silentTicks++;
              // If consecutive silent frames denote a complete sentence pause (approx 1.4s of silence)
              if (silentTicks > 85 && !vadSilenceTimerRef.current) {
                vadSilenceTimerRef.current = setTimeout(() => {
                  vadSpeakingRef.current = false;
                  stopRecording();
                  silentTicks = 0;
                  vadSilenceTimerRef.current = null;
                }, 50);
              }
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("Audio VAD setup note:", err);
    }
  }, [startRecording, stopRecording, triggerInterruption]);

  // Unified auto-start of microphone metering/VAD
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Bind a dummy recognition object for compatibility with legacy functions if any
    recognitionRef.current = {
      stop: () => {},
      lang: ''
    };

    if (isAlwaysOnActiveRef.current) {
      setupAudioVAD();
    }
  }, [setupAudioVAD]);

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
    setupAudioVAD();

    if (state === 'SPEAKING') {
      // Tap to interrupt
      triggerInterruption();
    } else if (state === 'LISTENING') {
      // Tap to immediately stop and submit the speech
      if (vadSpeakingRef.current) {
        vadSpeakingRef.current = false;
        stopRecording();
      }
    } else {
      // Manual start recording
      vadSpeakingRef.current = true;
      setState('LISTENING');
      rimeSound.playMicStart();
      startRecording();
    }
  };

  // Global click / tap ensures Web Audio context is unblocked
  const handleGlobalInteraction = () => {
    // Synchronously create and warm up the AudioContext on direct user gesture for iOS Safari compatibility
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        rimeAudioClient.setAudioContext(audioCtx);
        
        // Warm up sound buffer (Warms up audio hardware and gets past iOS auto-suspend policies)
        try {
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
        } catch (e) {}
      }
    } else if (audioContextRef.current.state === 'suspended') {
      try {
        audioContextRef.current.resume();
      } catch (e) {}
    }
    setupAudioVAD();
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
        <header className="w-full flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
          
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
            
            <h1 className="font-mono text-sm font-black tracking-widest uppercase text-zinc-100">
              P.H.I.
            </h1>
          </div>

          {/* Right: Dropdown Language Selector */}
          <div className="flex items-center justify-end gap-2">
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
              <div className="mt-3 flex flex-col items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-950/40 border border-white/5 px-4 py-2.5 rounded-2xl max-w-sm text-center">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hands-free: Speak a full statement to converse or interrupt</span>
                </div>
                <p className="text-[9px] text-zinc-600 mt-1 font-sans leading-relaxed">
                  Note: If voice transcription is silent, open the app in a **New Tab** using the top-right settings menu to bypass iframe browser sandbox security.
                </p>
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

'use client';

class RimeAudioClient {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private isPlaying: boolean = false;
  private currentSessionId: number = 0; // Tracks active speaking session to discard stale async downloads

  setAudioContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    return this.audioContext;
  }

  stop() {
    this.isPlaying = false;
    this.currentSessionId++; // Instantly invalidate any active in-flight fetches or decoding steps
    
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch (e) {
        // Ignore already stopped/disconnected errors
      }
      this.currentBufferSource = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {
        // Ignore
      }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  async playRimeSpeech({
    text,
    lang = 'eng',
    speaker,
    modelId,
    onStart,
    onVolumeChange,
    onEnded,
    onError,
  }: {
    text: string;
    lang: string;
    speaker?: string;
    modelId?: string;
    onStart?: () => void;
    onVolumeChange?: (vol: number) => void;
    onEnded?: () => void;
    onError?: (err: any) => void;
  }) {
    this.stop();
    const sessionId = this.currentSessionId; // Capture the session ID assigned to this request

    try {
      // Request Rime TTS audio from our server proxy
      const res = await fetch('/api/rime/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, speaker, modelId }),
      });

      // Abort if this request was interrupted during fetch
      if (sessionId !== this.currentSessionId) {
        console.log("Discarded in-flight TTS download due to interruption");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Rime API request failed' }));
        console.warn('Rime TTS server error, using fallback:', errorData);
        if (onError) onError(errorData);
        if (sessionId === this.currentSessionId) {
          this.fallbackSpeak({ text, lang, onStart, onVolumeChange, onEnded, sessionId });
        }
        return;
      }

      const audioArrayBuffer = await res.arrayBuffer();
      
      // Abort if interrupted during arrayBuffer download
      if (sessionId !== this.currentSessionId) {
        return;
      }

      if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
        throw new Error('Empty audio stream received from Rime TTS.');
      }

      const ctx = this.getAudioContext();
      if (ctx) {
        try {
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          
          if (sessionId !== this.currentSessionId) return;

          // Decode MP3 audio buffer
          const audioBuffer = await ctx.decodeAudioData(audioArrayBuffer.slice(0));
          
          // Abort if interrupted during audio decoding
          if (sessionId !== this.currentSessionId) return;

          // Set up source and analyser
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;

          if (!this.analyser) {
            this.analyser = ctx.createAnalyser();
            this.analyser.fftSize = 64;
          }

          source.connect(this.analyser);
          this.analyser.connect(ctx.destination);
          this.currentBufferSource = source;
          this.isPlaying = true;

          // Animate speech volume
          if (onVolumeChange) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            const trackVolume = () => {
              if (sessionId !== this.currentSessionId || !this.isPlaying || !this.analyser) return;
              this.analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / (dataArray.length * 255);
              onVolumeChange(Math.min(1, avg * 1.8));
              this.animFrameId = requestAnimationFrame(trackVolume);
            };
            this.animFrameId = requestAnimationFrame(trackVolume);
          }

          source.onended = () => {
            if (sessionId !== this.currentSessionId) return;
            this.isPlaying = false;
            if (this.animFrameId !== null) {
              cancelAnimationFrame(this.animFrameId);
              this.animFrameId = null;
            }
            this.currentBufferSource = null;
            if (onVolumeChange) onVolumeChange(0);
            if (onEnded) onEnded();
          };

          if (onStart) onStart();
          source.start(0);
          return;
        } catch (decodeErr) {
          console.warn('Web Audio decode failed, falling back to HTML5 Audio:', decodeErr);
        }
      }

      if (sessionId !== this.currentSessionId) return;

      // Secondary fallback: HTMLAudioElement without crossOrigin
      const blob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.src = audioUrl;
      this.currentAudio = audio;
      this.isPlaying = true;

      audio.onplay = () => {
        if (sessionId !== this.currentSessionId) {
          audio.pause();
          return;
        }
        if (onStart) onStart();
      };

      audio.onended = () => {
        if (sessionId !== this.currentSessionId) return;
        this.stop();
        if (onVolumeChange) onVolumeChange(0);
        URL.revokeObjectURL(audioUrl);
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        if (sessionId !== this.currentSessionId) return;
        console.warn('HTML5 Audio playback error, using speech synthesis fallback:', e);
        this.stop();
        URL.revokeObjectURL(audioUrl);
        if (onVolumeChange) onVolumeChange(0);
        this.fallbackSpeak({ text, lang, onStart, onVolumeChange, onEnded, sessionId });
      };

      await audio.play();

    } catch (err: any) {
      if (sessionId !== this.currentSessionId) return;
      console.error('Rime speech failed, falling back to synthesis:', err);
      if (onError) onError(err);
      this.fallbackSpeak({ text, lang, onStart, onVolumeChange, onEnded, sessionId });
    }
  }

  // Graceful browser fallback when Rime API key is missing or network unavailable
  private fallbackSpeak({
    text,
    lang,
    onStart,
    onVolumeChange,
    onEnded,
    sessionId,
  }: {
    text: string;
    lang: string;
    onStart?: () => void;
    onVolumeChange?: (vol: number) => void;
    onEnded?: () => void;
    sessionId?: number;
  }) {
    if (sessionId !== undefined && sessionId !== this.currentSessionId) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnded) onEnded();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Map Rime lang to BCP-47
    const langMap: Record<string, string> = {
      eng: 'en-US',
      hin: 'hi-IN',
      spa: 'es-ES',
      fra: 'fr-FR',
      ger: 'de-DE',
      jpn: 'ja-JP',
      por: 'pt-BR',
      ara: 'ar-SA',
      ita: 'it-IT',
      heb: 'he-IL',
    };
    utterance.lang = langMap[lang] || 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)));
    if (matchedVoice) utterance.voice = matchedVoice;

    let volumeInterval: any = null;
    utterance.onstart = () => {
      if (sessionId !== undefined && sessionId !== this.currentSessionId) {
        window.speechSynthesis.cancel();
        return;
      }
      if (onStart) onStart();
      if (onVolumeChange) {
        let step = 0;
        volumeInterval = setInterval(() => {
          if (sessionId !== undefined && sessionId !== this.currentSessionId) {
            clearInterval(volumeInterval);
            return;
          }
          const simulatedVol = 0.25 + Math.sin(step * 0.4) * 0.15;
          onVolumeChange(simulatedVol);
          step++;
        }, 80);
      }
    };

    utterance.onend = () => {
      if (volumeInterval) clearInterval(volumeInterval);
      if (onVolumeChange) onVolumeChange(0);
      if (onEnded) onEnded();
    };

    utterance.onerror = () => {
      if (volumeInterval) clearInterval(volumeInterval);
      if (onVolumeChange) onVolumeChange(0);
      if (onEnded) onEnded();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const rimeAudioClient = new RimeAudioClient();

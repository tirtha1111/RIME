'use client';

// A lightweight, highly futuristic synthesizer for RIME's sci-fi voice audio feedback
class RimeSoundEngine {
  private ctx: AudioContext | null = null;
  private humNode: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private voiceOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private voiceGain: GainNode | null = null;
  private voiceInterval: ReturnType<typeof setInterval> | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn("Web Audio API not supported in this environment.", e);
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
    this.init();
    if (!this.ctx) return;
    
    // Resume context if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    // Smooth fade out
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 1. Capture/Mic Start Beep (Clean subtle cyber click)
  playMicStart() {
    this.stopAll();
    this.playTone(980, 0.08, 'sine', 0.05);
  }

  // 2. Capture/Mic Stop Beep
  playMicStop() {
    this.stopAll();
    this.playTone(660, 0.08, 'sine', 0.04);
  }

  // 3. Interruption Zap (Sharp decay static sound)
  playInterruptionZap() {
    this.stopAll();
    this.playTone(440, 0.08, 'triangle', 0.1);
  }

  // 4. Recovery Success Chime (ascending holographic chord)
  playRecoveryChime() {
    const tones = [523.25, 659.25, 783.99]; // C5, E5, G5
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.03);
      }, idx * 70);
    });
  }

  // 5. Thinking / Reasoning - completely silent
  startHum() {
    // Sound is completely silenced when the AI is reasoning
    this.stopHum();
  }

  stopHum() {
    if (this.humGain && this.ctx) {
      try {
        this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {
        // Ignore
      }
    }
    if (this.humNode) {
      try {
        this.humNode.stop();
        this.humNode.disconnect();
      } catch (e) {
        // Ignore
      }
      this.humNode = null;
    }
    if (this.lfoNode) {
      try {
        this.lfoNode.stop();
        this.lfoNode.disconnect();
      } catch (e) {
        // Ignore
      }
      this.lfoNode = null;
    }
    this.humGain = null;
  }

  // 6. Speaking Voice Synthesizer - completely silent (no audio generated)
  startSpeakingSynth(onVolumeChange: (vol: number) => void) {
    this.stopSpeakingSynth();
    
    // Voice speaking sound is disabled per user request
    // Only simulate volume changes to drive the visual 3D globe ripple
    let step = 0;
    this.voiceInterval = setInterval(() => {
      const isWordPause = Math.sin(step * 0.4) > 0.85;
      const currentVol = isWordPause ? 0.04 : 0.3 + Math.sin(step * 0.25) * 0.15 + Math.random() * 0.1;
      onVolumeChange(currentVol);
      step++;
    }, 80);
  }

  stopSpeakingSynth() {
    if (this.voiceInterval) {
      clearInterval(this.voiceInterval);
      this.voiceInterval = null;
    }
    if (this.voiceGain && this.ctx) {
      try {
        this.voiceGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {
        // Ignore
      }
    }
    if (this.voiceOsc) {
      try {
        this.voiceOsc.stop();
        this.voiceOsc.disconnect();
      } catch (e) {
        // Ignore
      }
      this.voiceOsc = null;
    }
    if (this.subOsc) {
      try {
        this.subOsc.stop();
        this.subOsc.disconnect();
      } catch (e) {
        // Ignore
      }
      this.subOsc = null;
    }
    this.voiceGain = null;
  }

  stopAll() {
    this.stopSpeakingSynth();
    this.stopHum();
  }
}

export const rimeSound = new RimeSoundEngine();
export default rimeSound;

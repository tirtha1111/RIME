'use client';

// A lightweight, highly futuristic synthesizer for RIME's sci-fi voice audio feedback
class RimeSoundEngine {
  private ctx: AudioContext | null = null;
  private humNode: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private voiceOsc: OscillatorNode | null = null;
  private voiceGain: GainNode | null = null;
  private voiceInterval: any = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn("Web Audio API not supported in this environment.", e);
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
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

  // 1. Capture/Mic Start Beep (Cyberpunk high-pitch ping)
  playMicStart() {
    this.playTone(880, 0.15, 'sine', 0.08);
    setTimeout(() => this.playTone(1320, 0.25, 'sine', 0.06), 80);
  }

  // 2. Capture/Mic Stop Beep
  playMicStop() {
    this.playTone(1100, 0.15, 'sine', 0.06);
    setTimeout(() => this.playTone(660, 0.2, 'sine', 0.05), 80);
  }

  // 3. Interruption Zap (Sharp decay static sound)
  playInterruptionZap() {
    this.stopSpeakingSynth();
    this.stopHum();
    
    this.playTone(550, 0.1, 'triangle', 0.15);
    setTimeout(() => {
      this.playTone(180, 0.15, 'sawtooth', 0.12);
    }, 40);
  }

  // 4. Recovery Success Chime (ascending holographic chord)
  playRecoveryChime() {
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 0.04);
      }, idx * 80);
    });
  }

  // 5. Thinking Hum (continuous tech vibrato hum)
  startHum() {
    this.init();
    if (!this.ctx || this.humNode) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 110; // Low hum
    
    // Add LFO modulation for futuristic sci-fi pulse
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 8; // 8Hz modulation
    lfoGain.gain.value = 15; // Modulate frequency by 15Hz

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start();
    osc.start();

    this.humNode = osc;
    this.humGain = gain;
  }

  stopHum() {
    if (this.humNode) {
      try {
        this.humNode.stop();
      } catch (e) {}
      this.humNode = null;
      this.humGain = null;
    }
  }

  // 6. Speaking Voice Synthesizer (generates random speech envelopes & volumes)
  startSpeakingSynth(onVolumeChange: (vol: number) => void) {
    this.init();
    if (!this.ctx) return;
    
    this.stopSpeakingSynth();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    
    // We simulate vocoded speech with nested sine waves
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 160; // Warm voice fundamental

    subOsc.type = 'triangle';
    subOsc.frequency.value = 320; // Harmonic

    gain.gain.setValueAtTime(0.08, t);

    // Filter to make it warmer/less harsh
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(filter);
    filter.connect(this.ctx.destination);

    osc.start();
    subOsc.start();

    this.voiceOsc = osc;
    this.voiceGain = gain;

    // Simulate speech flow by rapidly modulating frequency and gain
    let step = 0;
    this.voiceInterval = setInterval(() => {
      if (!this.ctx || !osc || !gain) return;
      
      const isWordPause = Math.sin(step * 0.4) > 0.85; // Natural pauses in sentences
      const currentVol = isWordPause ? 0.005 : 0.05 + Math.random() * 0.08;
      
      // Update oscillators for synthetic voice sounds
      const baseFreq = 140 + Math.sin(step * 0.2) * 25 + Math.cos(step * 0.4) * 10;
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      subOsc.frequency.setValueAtTime(baseFreq * 2, this.ctx.currentTime);
      
      gain.gain.linearRampToValueAtTime(currentVol, this.ctx.currentTime + 0.08);
      onVolumeChange(isWordPause ? 0.02 : currentVol * 8); // Scale to 0-1 for globe visualization
      
      step++;
    }, 80);
  }

  stopSpeakingSynth() {
    if (this.voiceInterval) {
      clearInterval(this.voiceInterval);
      this.voiceInterval = null;
    }
    if (this.voiceOsc) {
      try {
        this.voiceOsc.stop();
      } catch (e) {}
      this.voiceOsc = null;
    }
    this.voiceGain = null;
  }
}

export const rimeSound = new RimeSoundEngine();
export default rimeSound;

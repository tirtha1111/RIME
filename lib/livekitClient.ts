'use client';

import { Room, RoomEvent, Track, createLocalAudioTrack, RemoteParticipant, RemoteTrackPublication, RemoteAudioTrack } from 'livekit-client';

export interface LiveKitConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isPublishingAudio: boolean;
  isAgentSpeaking: boolean;
  roomName: string | null;
  participantId: string | null;
  agentId: string | null;
  error: string | null;
  activeModel: string;
}

type StateCallback = (state: LiveKitConnectionState) => void;
type VolumeCallback = (volume: number) => void;
type TranscriptCallback = (speaker: 'USER' | 'PHI AI', text: string, isFinal: boolean) => void;

class LiveKitManager {
  private room: Room | null = null;
  private localAudioTrack: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private state: LiveKitConnectionState = {
    isConnected: false,
    isConnecting: false,
    isPublishingAudio: false,
    isAgentSpeaking: false,
    roomName: null,
    participantId: null,
    agentId: null,
    error: null,
    activeModel: 'gpt-realtime-2.1',
  };

  private stateListeners: Set<StateCallback> = new Set();
  private volumeListeners: Set<VolumeCallback> = new Set();
  private transcriptListeners: Set<TranscriptCallback> = new Set();

  public subscribeState(cb: StateCallback) {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  public subscribeVolume(cb: VolumeCallback) {
    this.volumeListeners.add(cb);
    return () => {
      this.volumeListeners.delete(cb);
    };
  }

  public subscribeTranscript(cb: TranscriptCallback) {
    this.transcriptListeners.add(cb);
    return () => {
      this.transcriptListeners.delete(cb);
    };
  }

  private updateState(partial: Partial<LiveKitConnectionState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach(cb => cb(this.state));
  }

  public getState(): LiveKitConnectionState {
    return this.state;
  }

  public async connect(modelId = 'gpt-realtime-2.1', roomName = 'phi-live-room'): Promise<boolean> {
    if (this.state.isConnected || this.state.isConnecting) {
      return true;
    }

    this.updateState({
      isConnecting: true,
      error: null,
      activeModel: modelId,
    });

    try {
      // 1. Fetch token from server API
      const tokenRes = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}&model=${encodeURIComponent(modelId)}`);
      
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to obtain LiveKit room token.');
      }

      const { token, url, identity } = await tokenRes.json();

      // 2. Initialize Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.room = room;

      // 3. Register Event Listeners
      room.on(RoomEvent.Connected, () => {
        this.updateState({
          isConnected: true,
          isConnecting: false,
          roomName: room.name,
          participantId: identity,
          error: null,
        });
      });

      room.on(RoomEvent.Disconnected, () => {
        this.cleanupAudio();
        this.updateState({
          isConnected: false,
          isConnecting: false,
          isPublishingAudio: false,
          isAgentSpeaking: false,
          roomName: null,
          participantId: null,
          agentId: null,
        });
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const oldEl = document.getElementById(`livekit-audio-${participant.identity}`);
          if (oldEl) oldEl.remove();

          const remoteAudio = track.attach();
          remoteAudio.id = `livekit-audio-${participant.identity}`;
          remoteAudio.style.display = 'none';
          document.body.appendChild(remoteAudio);
          this.attachAudioVisualizer(track as RemoteAudioTrack);

          this.updateState({
            agentId: participant.identity,
            isAgentSpeaking: true,
          });
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach(el => el.remove());
        this.cleanupAudioVisualizer();
        this.updateState({ isAgentSpeaking: false });
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const hasRemoteSpeaker = speakers.some(s => s !== room.localParticipant);
        this.updateState({ isAgentSpeaking: hasRemoteSpeaker });
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const str = new TextDecoder().decode(payload);
          const data = JSON.parse(str);
          if (data.type === 'transcript' || data.text) {
            const isLocal = !participant || participant.identity === room.localParticipant.identity;
            const speaker = isLocal ? 'USER' : 'PHI AI';
            const text = data.text || data.message || '';
            const isFinal = Boolean(data.isFinal ?? true);
            this.transcriptListeners.forEach(cb => cb(speaker, text, isFinal));
          }
        } catch {
          // ignore non-json data messages
        }
      });

      // 4. Connect to LiveKit WebRTC Server
      await room.connect(url, token);

      // 5. Publish microphone audio
      try {
        const localTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        this.localAudioTrack = localTrack;
        await room.localParticipant.publishTrack(localTrack);
        this.updateState({ isPublishingAudio: true });
      } catch (micErr: any) {
        console.warn('Microphone permission / publication issue:', micErr);
      }

      return true;
    } catch (err: any) {
      console.error('LiveKit connection error:', err);
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: err?.message || 'Could not connect to LiveKit WebRTC room.',
      });
      return false;
    }
  }

  public async disconnect() {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.cleanupAudio();
    this.updateState({
      isConnected: false,
      isConnecting: false,
      isPublishingAudio: false,
      isAgentSpeaking: false,
      roomName: null,
      participantId: null,
      agentId: null,
    });
  }

  public async sendTextMessage(text: string) {
    if (!this.room || !this.state.isConnected) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: 'chat', text, timestamp: Date.now() }));
    await this.room.localParticipant.publishData(data, { reliable: true });
  }

  private attachAudioVisualizer(audioTrack: RemoteAudioTrack) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const stream = new MediaStream([audioTrack.mediaStreamTrack]);
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const norm = Math.min(1, avg / 128);
        this.volumeListeners.forEach(cb => cb(norm));
        this.animFrameId = requestAnimationFrame(updateVolume);
      };
      this.animFrameId = requestAnimationFrame(updateVolume);
    } catch (e) {
      console.warn('Audio visualizer attach error:', e);
    }
  }

  private cleanupAudioVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.analyser = null;
    this.volumeListeners.forEach(cb => cb(0));
  }

  private cleanupAudio() {
    this.cleanupAudioVisualizer();
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export const livekitManager = new LiveKitManager();

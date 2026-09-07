'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Loader2, 
  Download, 
  X, 
  Volume2, 
  ArrowRight, 
  Copy, 
  Check, 
  Wand2, 
  Zap,
  KeyRound
} from 'lucide-react';

interface HuggingFaceHubProps {
  onInsertToPrompt?: (text: string) => void;
  onDirectSpeak?: (text: string) => void;
  selectedLanguage?: string;
}

export default function HuggingFaceHub({
  onInsertToPrompt,
  onDirectSpeak,
  selectedLanguage = 'eng'
}: HuggingFaceHubProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'stt'>('image');
  
  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('black-forest-labs/FLUX.1-schnell');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Voice to Text (STT) State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [sttError, setSttError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sample creative image prompts
  const sampleImagePrompts = [
    "Cyberpunk AI core sphere floating in a neon Tokyo city street at midnight, ultra-detailed 8k octane render",
    "Futuristic voice assistant holographic interface in dark glassmorphism sci-fi laboratory",
    "Ethereal glowing neural network brain with gold and cyan fiber optic lighting, cinematic photo",
    "Ancient Indian temple merged with futuristic solar technology and glowing quantum runes, hyper-realistic"
  ];

  // Image Generation Handler
  const handleGenerateImage = async (promptToUse?: string) => {
    const prompt = promptToUse || imagePrompt;
    if (!prompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/huggingface/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedImageModel
        })
      });

      let data: any;
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 404 
            ? 'API route not reachable. Please check connection.' 
            : `Server returned an invalid response (${res.status}): ${rawText.slice(0, 100)}`
        );
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Image generation failed');
      }

      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error('Image generation error:', err);
      setImageError(err.message || 'Failed to generate image. Please verify your HF_TOKEN in Secrets.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Start Audio Recording for Whisper STT
  const startRecording = async () => {
    setSttError(null);
    setTranscribedText('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
        await processAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Audio capture error:', err);
      setSttError('Microphone access denied or audio recording failed.');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload Audio Blob to Hugging Face STT Route
  const processAudioBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    setSttError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'openai/whisper-large-v3-turbo');

      const res = await fetch('/api/huggingface/stt', {
        method: 'POST',
        body: formData
      });

      let data: any;
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 404 
            ? 'STT endpoint not reachable.' 
            : `Server returned an invalid response (${res.status}): ${rawText.slice(0, 100)}`
        );
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscribedText(data.text || '');
    } catch (err: any) {
      console.error('Hugging Face STT error:', err);
      setSttError(err.message || 'Hugging Face Whisper STT failed. Check HF_TOKEN in Secrets.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyTranscribedText = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] relative overflow-hidden">
      
      {/* Top Header with Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
            🤗
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-black tracking-wider text-white uppercase">
                Hugging Face Suite
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                HF_TOKEN ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              FLUX & SDXL Image Generation • Whisper Large-v3 Voice-to-Text
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Text to Image</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'stt'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice to Text (STT)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Text-to-Image Generation */}
      {activeTab === 'image' && (
        <div className="pt-4 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="hf-image-prompt-input"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                placeholder="Describe any scene, futuristic artifact, or portrait..."
                className="w-full bg-black/70 border border-white/10 hover:border-amber-500/40 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
                disabled={isGeneratingImage}
              />
            </div>

            {/* Model Select */}
            <select
              value={selectedImageModel}
              onChange={(e) => setSelectedImageModel(e.target.value)}
              disabled={isGeneratingImage}
              className="bg-black/80 border border-white/10 text-zinc-300 text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
            >
              <option value="black-forest-labs/FLUX.1-schnell">FLUX.1 Schnell (Fast 8K)</option>
              <option value="black-forest-labs/FLUX.1-dev">FLUX.1 Dev (Ultra Quality)</option>
              <option value="stabilityai/stable-diffusion-xl-base-1.0">Stable Diffusion XL 1.0</option>
              <option value="runwayml/stable-diffusion-v1-5">Stable Diffusion v1.5</option>
              <option value="prompthero/openjourney">Openjourney (Midjourney style)</option>
            </select>

            {/* Generate Action Button */}
            <button
              type="button"
              id="hf-generate-image-btn"
              onClick={() => handleGenerateImage()}
              disabled={!imagePrompt.trim() || isGeneratingImage}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer shrink-0"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Presets:
            </span>
            {sampleImagePrompts.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setImagePrompt(sample);
                  handleGenerateImage(sample);
                }}
                disabled={isGeneratingImage}
                className="px-2 py-1 text-[10px] rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-zinc-300 hover:text-amber-200 transition-all text-left truncate max-w-[240px] cursor-pointer"
                title={sample}
              >
                {sample}
              </button>
            ))}
          </div>

          {/* Error Message display */}
          {imageError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-mono">
              <p className="font-bold">⚠️ Generation Notice:</p>
              <p className="mt-0.5 text-[11px] text-red-300">{imageError}</p>
              <p className="mt-1 text-[10px] text-zinc-400">
                Make sure you added <code className="text-amber-300 font-mono">HF_TOKEN</code> or <code className="text-amber-300 font-mono">HUGGINGFACE_API_KEY</code> in Settings &gt; Secrets.
              </p>
            </div>
          )}

          {/* Result Canvas / Image preview */}
          {generatedImageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-xl overflow-hidden border border-amber-500/30 bg-black/90 p-2 flex flex-col items-center justify-center shadow-2xl group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImageUrl}
                alt="Hugging Face AI Generated"
                className="w-full max-h-[360px] object-contain rounded-lg border border-white/5 shadow-lg"
              />

              <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-white/10 px-2 text-xs">
                <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[70%]">
                  Model: <span className="text-amber-300">{selectedImageModel}</span>
                </span>
                
                <a
                  href={generatedImageUrl}
                  download="huggingface-generated.png"
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px] border border-white/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab 2: Voice to Text (Whisper STT via Hugging Face) */}
      {activeTab === 'stt' && (
        <div className="pt-4 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-black/60 border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                isRecording 
                  ? 'bg-red-950/60 border-red-500 animate-pulse text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : isTranscribing
                  ? 'bg-cyan-950/60 border-cyan-400 animate-spin text-cyan-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}>
                {isTranscribing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isRecording ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6 text-zinc-500" />
                )}
              </div>

              <div>
                <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  {isRecording 
                    ? 'Recording voice audio...' 
                    : isTranscribing 
                    ? 'Hugging Face Whisper transcribing...' 
                    : 'Whisper Large-v3 Speech-to-Text'}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isRecording 
                    ? 'Speak clearly into your microphone, then click Stop.' 
                    : 'High-accuracy neural transcription in any language.'}
                </p>
              </div>
            </div>

            {/* Mic Record Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isRecording ? (
                <button
                  type="button"
                  id="hf-start-recording-btn"
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="hf-stop-recording-btn"
                  onClick={stopRecording}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Stop &amp; Transcribe</span>
                </button>
              )}
            </div>
          </div>

          {/* STT Error Notice */}
          {sttError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-mono">
              <p className="font-bold">⚠️ Transcription Notice:</p>
              <p className="mt-0.5 text-[11px] text-red-300">{sttError}</p>
            </div>
          )}

          {/* Transcribed Output Box */}
          {transcribedText && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-black/80 border border-cyan-500/30 space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono border-b border-white/5 pb-2">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Transcribed Text:
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyTranscribedText}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-100 font-sans leading-relaxed bg-zinc-900/50 p-2.5 rounded-lg border border-white/5 select-all">
                {transcribedText}
              </p>

              {/* Action Buttons to connect with PHI Assistant & Rime Voice */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onInsertToPrompt && (
                  <button
                    type="button"
                    onClick={() => onInsertToPrompt(transcribedText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Send to P.H.I. Assistant</span>
                  </button>
                )}

                {onDirectSpeak && (
                  <button
                    type="button"
                    onClick={() => onDirectSpeak(transcribedText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak with Rime Voice</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setImagePrompt(transcribedText);
                    setActiveTab('image');
                    handleGenerateImage(transcribedText);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate Image from Voice</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

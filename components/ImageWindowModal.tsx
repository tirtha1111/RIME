'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Image as ImageIcon 
} from 'lucide-react';
import { GeneratedImageMetadata } from '@/components/ConversationPanel';

interface ImageWindowModalProps {
  image: GeneratedImageMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageWindowModal({ image, isOpen, onClose }: ImageWindowModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(3, prev + 0.25));
      } else if (e.key === '-') {
        setZoomLevel(prev => Math.max(0.5, prev - 0.25));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const handleCopyPrompt = () => {
    if (!image.prompt) return;
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenInNewWindow = () => {
    if (!image.url) return;
    
    // Create an HTML blob to open in a dedicated clean window with dark background
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>P.H.I. Visual Synthesis — ${image.prompt.slice(0, 40).replace(/</g, '&lt;')}</title>
          <style>
            body {
              margin: 0;
              background-color: #05070a;
              color: #e2e8f0;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              max-width: 1200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            img {
              max-width: 100%;
              max-height: 82vh;
              border-radius: 16px;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.2);
              border: 1px solid rgba(168, 85, 247, 0.3);
              object-fit: contain;
            }
            .caption {
              font-size: 13px;
              color: #94a3b8;
              text-align: center;
              max-width: 800px;
              line-height: 1.5;
            }
            .badge {
              font-family: monospace;
              font-size: 11px;
              padding: 4px 10px;
              background: rgba(168, 85, 247, 0.15);
              border: 1px solid rgba(168, 85, 247, 0.4);
              color: #c084fc;
              border-radius: 999px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <span class="badge">P.H.I. AI // ${image.model || 'FLUX.1-schnell'}</span>
            <img src="${image.url}" alt="${image.prompt.replace(/"/g, '&quot;')}" />
            <div class="caption">"${image.prompt.replace(/</g, '&lt;')}"</div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const newWin = window.open(blobUrl, '_blank', 'width=1100,height=850,resizable=yes,scrollbars=yes');
    if (!newWin) {
      // Fallback if popup blocked
      window.open(image.url, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      >
        {/* Main Window Container */}
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-zinc-950/95 border border-purple-500/40 rounded-2xl shadow-[0_0_60px_rgba(168,85,247,0.25)] flex flex-col overflow-hidden relative transition-all duration-300 ${
            isFullscreen 
              ? 'w-[98vw] h-[96vh]' 
              : 'w-full max-w-4xl max-h-[90vh]'
          }`}
        >
          {/* Top laser accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

          {/* Window Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-widest">
                    SEPARATE IMAGE WINDOW
                  </h3>
                  <span className="font-mono text-[9px] text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-full uppercase font-semibold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                    {image.model || 'FLUX.1-schnell'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono truncate max-w-xs sm:max-w-md">
                  {image.prompt}
                </p>
              </div>
            </div>

            {/* Titlebar Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Open in external browser window */}
              <button
                type="button"
                onClick={handleOpenInNewWindow}
                className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-purple-950/60 text-zinc-300 hover:text-purple-300 border border-white/10 hover:border-purple-500/40 transition-all text-xs flex items-center gap-1 font-mono cursor-pointer"
                title="Open in new browser popup window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Pop Out</span>
              </button>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/10 transition-all cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-red-950/80 text-zinc-400 hover:text-red-300 border border-white/10 hover:border-red-500/40 transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Display Canvas Area */}
          <div className="flex-1 min-h-0 bg-[#06080d] flex items-center justify-center p-4 relative overflow-hidden select-none">
            {/* Ambient backlight glow matching image */}
            <div className="absolute inset-0 bg-radial from-purple-600/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto scrollbar-thin scrollbar-thumb-purple-500/30">
              <motion.img
                key={image.url}
                src={image.url}
                alt={image.prompt}
                animate={{ scale: zoomLevel }}
                transition={{ duration: 0.2 }}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[58vh] sm:max-h-[64vh] object-contain rounded-xl shadow-2xl border border-purple-500/20 cursor-zoom-in"
                onClick={() => setZoomLevel(prev => (prev >= 2 ? 1 : prev + 0.5))}
              />
            </div>

            {/* Floating Zoom & Controls HUD on canvas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                className="p-1 hover:bg-white/10 rounded-full text-zinc-300 transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-zinc-300 px-1 font-bold min-w-[36px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                className="p-1 hover:bg-white/10 rounded-full text-zinc-300 transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3 bg-white/20 mx-0.5" />
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Footer with prompt and download bar */}
          <div className="px-4 py-3 border-t border-white/10 bg-black/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="font-mono text-[10px] text-purple-400 uppercase font-bold shrink-0">
                PROMPT:
              </span>
              <p className="text-xs text-zinc-300 font-mono truncate" title={image.prompt}>
                &quot;{image.prompt}&quot;
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Copy prompt button */}
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
              </button>

              {/* Download image */}
              <a
                href={image.url}
                download="phi_ai_visual.jpg"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save High-Res</span>
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

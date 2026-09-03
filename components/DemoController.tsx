'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Zap, HelpCircle, Activity, Info } from 'lucide-react';

interface DemoControllerProps {
  onStartDemo: (scenarioId: string) => void;
  onReset: () => void;
  currentState: string;
  demoProgress: number; // 0 to 100 or -1 if idle
  activeDemoStep: number; // -1 if idle, 0 to 5 for steps
}

export default function DemoController({
  onStartDemo,
  onReset,
  currentState,
  demoProgress,
  activeDemoStep,
}: DemoControllerProps) {
  // Scenarios we support
  const scenarios = [
    {
      id: 'train_bengaluru',
      title: 'Train Routing Correction',
      desc: 'Simulate routing to Bengaluru, interrupting with Mumbai mid-speech.',
    },
    {
      id: 'quick_weather',
      title: 'Dynamic Weather Query',
      desc: 'Ask about weather in Tokyo, override with London mid-sentence.',
    },
  ];

  // The steps of our primary demo scenario
  const demoSteps = [
    { label: 'MIC TRIGGER', desc: 'USER: "Find me a train..."' },
    { label: 'AI REASONING', desc: 'Thinking tokens...' },
    { label: 'SPEECH FEED', desc: 'RIME: "Checking options..."' },
    { label: 'COLLISION / INTERRUPT', desc: 'USER: "Wait, Mumbai instead."' },
    { label: 'RECOVER / ADAPT', desc: 'RIME: "Got it. Mumbai..."' },
  ];

  return (
    <div className="w-full max-w-xs bg-black/40 backdrop-blur-lg border border-white/5 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
      {/* Top micro laser line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
        <h4 className="font-mono text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
          SCENARIO CONTROLLER
        </h4>
      </div>

      <p className="text-[10px] text-zinc-500 font-sans leading-relaxed mb-4">
        Select a conversational sequence to observe RIME&apos;s instantaneous stream recovery engine in action.
      </p>

      {/* Scenario triggers */}
      <div className="flex flex-col gap-2 mb-5">
        {scenarios.map((scen) => (
          <button
            key={scen.id}
            disabled={activeDemoStep !== -1}
            onClick={() => onStartDemo(scen.id)}
            className={`w-full text-left p-2.5 rounded-xl border font-sans transition-all duration-300 cursor-pointer flex flex-col gap-1
              ${activeDemoStep === -1
                ? 'bg-cyan-950/5 border-cyan-500/10 hover:bg-cyan-950/25 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                : 'bg-zinc-950/10 border-white/5 opacity-40 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-zinc-200 tracking-wider font-mono">
                {scen.title}
              </span>
              <Play className="w-2.5 h-2.5 text-cyan-400" />
            </div>
            <span className="text-[8.5px] text-zinc-500 leading-normal">
              {scen.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Sequence steps visualizing the state engine */}
      <div className="mt-4 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] font-bold text-zinc-400 tracking-widest uppercase">
            LIVE SEQUENCER
          </span>
          {activeDemoStep !== -1 && (
            <button
              onClick={onReset}
              className="font-mono text-[8.5px] text-red-400 flex items-center gap-1 bg-red-950/20 border border-red-500/10 px-2 py-0.5 rounded cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              ABORT
            </button>
          )}
        </div>

        {/* The timeline tracker */}
        <div className="flex flex-col gap-2 font-mono text-[9px]">
          {demoSteps.map((step, idx) => {
            const isCompleted = idx < activeDemoStep;
            const isActive = idx === activeDemoStep;

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-1.5 rounded transition-all duration-300
                  ${isActive 
                    ? 'bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 font-extrabold shadow-[0_0_10px_rgba(34,211,238,0.05)]' 
                    : isCompleted 
                      ? 'text-zinc-600 opacity-65 line-through' 
                      : 'text-zinc-500'
                  }
                `}
              >
                {/* Visual marker */}
                <div className="flex flex-col items-center justify-center mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full
                    ${isCompleted ? 'bg-zinc-600' : ''}
                    ${isActive ? 'bg-cyan-400 animate-ping' : ''}
                    ${!isCompleted && !isActive ? 'bg-zinc-800' : ''}
                  `} />
                  {idx < demoSteps.length - 1 && (
                    <div className={`w-[1px] h-3 my-0.5 
                      ${isCompleted ? 'bg-zinc-800' : 'bg-zinc-800'}
                    `} />
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span>{step.label}</span>
                    {isActive && (
                      <span className="text-[7px] bg-cyan-400/10 border border-cyan-400/20 px-1 rounded uppercase tracking-widest leading-none">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] mt-0.5 font-sans leading-none font-normal ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`}>
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info panel */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2 text-[8.5px] text-zinc-500 font-sans leading-relaxed">
        <Info className="w-3.5 h-3.5 text-cyan-500/50 shrink-0 mt-0.5" />
        <span>
          During Speaking phases, tapping the circular microphone below acts as an immediate user interruption trigger. Try it!
        </span>
      </div>
    </div>
  );
}

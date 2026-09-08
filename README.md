# PHI AI 🎙️✨

**PHI AI** is an ultra-low latency, interactive real-time Voice & Visual AI Assistant built with Next.js 15, Groq LPU Inference, Google Gemini, Three.js 3D visuals, and Web Audio VAD (Voice Activity Detection).

Designed for fluid, natural human-AI voice conversations, PHI AI features instant interruption handling, live financial & web data grounding, integrated image generation, and a responsive audio-reactive 3D visual orb.

---

## ✨ Features

- **🎙️ Real-Time Voice Conversation Engine**:
  - Powered by Groq LPU inference (`openai/gpt-oss-120b`) for lightning-fast speech generation and near-zero latency responses.
  - Native Voice Activity Detection (VAD) with instant interruptibility: speak mid-sentence to interrupt PHI AI seamlessly without audio overlaps or race conditions.
  - Dual Voice Modes: **Manual Toggle** and **Always-On Continuous Mic**.

- **🎨 3D Interactive Audio Visualizer**:
  - Dynamic Three.js particle sphere that visually reacts to AI states (`READY`, `LISTENING`, `THINKING`, `SPEAKING`, `INTERRUPTED`).
  - Fluid particle physics and smooth state transitions with Motion / Framer Motion.

- **🖼️ Visual AI & Image Generation**:
  - On-demand high-resolution image generation powered by Google Gemini API (`@google/genai`).
  - In-chat preview cards and full-screen image inspection modal.

- **📊 Live Data Grounding Modules**:
  - **Financial Markets**: Live stock quotes, prices, and market updates via Finnhub API integration.
  - **Live News & Wikipedia**: Up-to-the-minute news synthesis and factual knowledge retrieval.
  - **Real-Time Weather**: Current weather conditions and temperature forecasts.

- **🌐 Multi-Language & Telemetry**:
  - Seamless support for English, Hindi, Spanish, French, German, and more.
  - Live latency tracking, audio wave telemetry, and visual system diagnostic dashboard.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, API Routes)
- **AI / LLM Engine**: Groq SDK (`groq-sdk`), Model: `openai/gpt-oss-120b`
- **Vision & Image Generation**: Google GenAI SDK (`@google/genai`)
- **3D & Graphics**: Three.js (`three`), `@types/three`
- **Real-Time Streaming**: LiveKit Client & Server SDK (`livekit-client`, `livekit-server-sdk`)
- **Animation**: Motion (`motion`)
- **Styling**: Tailwind CSS v4, Lucide Icons (`lucide-react`)
- **Audio Processing**: Web Audio API, Custom VAD, Rime Sound Cues

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm / yarn / pnpm

### Environment Setup

Create a `.env.local` or `.env` file in the root directory:

```env
# Groq API Key (For fast LLM inference)
GROQ_API_KEY=your_groq_api_key_here

# Hugging Face API Key (For Image Generation)
HF_API_KEY=your_huggingface_api_key_here

# Optional: Finnhub API Key (For real-time stock market data)
FINNHUB_API_KEY=your_finnhub_api_key_here

# Optional: LiveKit Credentials (For WebRTC audio streaming)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/phi-ai.git
cd phi-ai

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start interacting with PHI AI.

---

## 🛠️ Project Structure

```text
├── app/
│   ├── api/
│   │   ├── chat/        # Main LLM Groq & Tool grounding API route
│   │   └── generate/    # Hugging Face Image Generation API route
│   ├── globals.css      # Tailwind & global styling
│   ├── layout.tsx       # Root layout & providers
│   └── page.tsx         # Main PHI AI Voice Interface & State Controller
├── components/
│   ├── VoiceControl.tsx        # Central interactive mic button
│   ├── AudioTelemetryPanel.tsx # Real-time audio waveform & latency diagnostics
│   └── ThreeOrb.tsx            # Three.js 3D audio-reactive sphere
├── lib/
│   ├── realtimeEngine.ts # Real-time data synthesis (Finnhub, News, Weather)
│   └── soundEffects.ts   # Rime spatial audio cues & sound feedback
└── public/               # Static assets & icons
```

---

## 📜 Scripts

- `npm run dev` - Starts the development server on port 3000
- `npm run build` - Builds the optimized production application
- `npm run start` - Runs the production server
- `npm run lint` - Executes ESLint checks across the codebase


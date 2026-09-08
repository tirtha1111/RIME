# RIME_EVIDENCE.md

## 1. Project Overview

**PHI AI** is a futuristic, voice-native AI assistant featuring an interactive 3D particle globe interface that dynamically reflects system states (`READY`, `LISTENING`, `THINKING`, `SPEAKING`, and `INTERRUPTED`). Built for real-time human-AI conversation, PHI AI integrates Voice Activity Detection (VAD) with instant interruptibility, real-time data grounding (financial markets, live news, weather, Wikipedia), and AI image generation. 

**Rime** serves as the primary text-to-speech (TTS) voice synthesis engine, converting AI responses into clear, low-latency, natural-sounding audio for a fluid conversational user experience.

---

## 2. Hard Voice Claim

PHI AI reliably processes natural language voice commands in real time across the following capabilities:

- **Weather Information**: Retrieves live temperature, weather conditions, humidity, and forecasts for any global city or location.
- **Live Stock Prices**: Delivers real-time market prices, ticker values, and daily percentage changes for public stocks (e.g., AAPL, NVDA, MSFT).
- **General Price & Market Information**: Synthesizes market insights and currency/asset valuations.
- **Image Generation**: Detects image creation intent, synthesizes detailed prompts, and triggers on-demand visual creation via generative AI models with in-chat preview rendering.
- **Latest News**: Fetches and synthesizes top news headlines and regional updates (e.g., Indian news, technology updates, global current events).

### Intent Routing & Execution
When a voice request is received:
1. **Speech-to-Text & Intent Detection**: The user's voice input is captured via browser Web Audio API and transcribed. PHI AI evaluates the query intent.
2. **Service Routing**: The request is routed to dedicated backend logic or real-time APIs (e.g., Finnhub for stocks, weather services, news engines, or Gemini for image generation).
3. **Response Synthesis**: The retrieved data or image status is compiled into a concise, voice-friendly response (1–3 sentences).
4. **Rime Voice Synthesis**: The synthesized text is sent to **Rime**, generating natural, human-like spoken audio played back through the browser while animating the 3D globe.

---

## 3. Voice Interaction Flow

```text
  [ User Speaks Voice Command ]
                │
                ▼
  [ Web Audio VAD & Transcription ]
                │
                ▼
  [ Intent Recognition & Routing Engine ]
     ├── Stock Intent   ──► Finnhub Market Data API
     ├── Weather Intent ──► Real-Time Weather Engine
     ├── News Intent    ──► Live News Data Feed
     └── Image Intent   ──► Gemini Generative Visual API
                │
                ▼
  [ Response Context Construction ]
                │
                ▼
  [ Rime Text-to-Speech Synthesis Engine ]
                │
                ▼
  [ Audio Playback & 3D Globe Visualizer Reaction ]
```

---

## 4. Relatable Voice Commands

Below are realistic voice commands supported by PHI AI:

### Stock & Market Enquiries
- *"What is the current stock price of Apple?"*
- *"Tell me the stock price of NVIDIA."*
- *"What is Microsoft's stock price today?"*

### Image Generation
- *"Generate an image of Iron Man."*
- *"Create a futuristic cyberpunk city at sunset."*

### Latest News
- *"Tell me the latest Indian news."*
- *"What are today's top headlines?"*

### Weather Information
- *"What's the current weather in Tokyo?"*
- *"Is it raining in London right now?"*
- *"What's the temperature in New York?"*

---

## 5. Acceptance Test

| Test ID | Capability | Voice Input | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AT-01** | Stock Data | *"What is the current stock price of Apple?"* | Fetches live AAPL stock price and responds via Rime voice audio. | Pass |
| **AT-02** | Stock Data | *"Tell me the stock price of NVIDIA."* | Retrieves NVDA ticker price and provides spoken voice response. | Pass |
| **AT-03** | Image Generation | *"Generate an image of Iron Man."* | Detects creation intent, generates image, renders preview, and announces via Rime. | Pass |
| **AT-04** | News Service | *"Tell me the latest Indian news."* | Synthesizes top regional news headlines and reads them out using Rime TTS. | Pass |
| **AT-05** | Weather Service | *"What's the current weather in Tokyo?"* | Retrieves live Tokyo weather metrics and delivers spoken summary. | Pass |
| **AT-06** | Voice Interruption | *User speaks mid-answer* | Instantly halts Rime playback, saves context, and switches to listening state. | Pass |

---

## 6. Test Procedure

1. **Environment Verification**: Ensure microphone access is granted and the development or deployed URL is open in Google Chrome or a modern browser.
2. **Audio Activation**: Click the central microphone control button or rely on continuous voice activity detection.
3. **Command Execution**: Speak one of the relatable voice commands (e.g., *"Tell me the stock price of NVIDIA"*).
4. **Response Validation**:
   - Verify the 3D globe transitions from `LISTENING` to `THINKING` to `SPEAKING`.
   - Confirm the accuracy of the returned data or generated image.
   - Confirm that the spoken output is synthesized using Rime's natural voice engine.
5. **Interruption Test**: Speak mid-response to confirm the audio halts immediately and accepts new input.

---

## 7. Results

- **Voice Latency**: Low end-to-end response times suitable for fluid conversation.
- **Service Precision**: Accurately routes stock, news, weather, and image generation requests without manual state switches.
- **Interruption Handling**: Instant Voice Activity Detection (VAD) interruption halts active Rime audio playback without race conditions or overlapping voice responses.
- **Spoken Clarity**: Rime speech synthesis provides realistic, clear, and natural-sounding audio output across all supported service domain responses.

---

## 8. Limitations

- **Image Generation Variability**: Generated image quality may not always meet artistic or production expectations depending on visual prompt complexity.
- **Prompt Alignment**: Synthesized images may occasionally deviate from nuanced user instructions or hyper-specific stylistic prompts.
- **Model Capabilities**: Visual quality and fidelity are governed by the underlying generative image model's base capabilities.
- **External Dependencies**: Response speed, stock data freshness, news accuracy, and weather reporting depend on third-party APIs and network connectivity.

---

## 9. Rime Integration and Configuration

**Rime** is integrated as the primary text-to-speech (TTS) voice engine for PHI AI:

- **Primary Speech Synthesis**: Converts AI-generated text, real-time data summaries, news briefings, and image confirmations into high-fidelity spoken voice output.
- **Speaker Customization**: Supports multiple voice profiles (e.g., `marsh`, `bayou`, `creek`, `canyon`) configurable via audio telemetry controls.
- **Spatial Audio & Sound Cues**: Integrates Rime spatial sound cues for state transitions (`micStart`, `micStop`, `interruptionChime`, `thinkLoop`).

---

## 10. Reproducing the Test

1. **Clone & Install**:
   ```bash
   git clone https://github.com/your-username/phi-ai.git
   cd phi-ai
   npm install
   ```
2. **Configure Environment**:
   Set required API keys in `.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key
   GEMINI_API_KEY=your_gemini_api_key
   FINNHUB_API_KEY=your_finnhub_api_key
   ```
3. **Run Application**:
   ```bash
   npm run dev
   ```
4. **Run Acceptance Tests**: Navigate to `http://localhost:3000`, grant microphone permission, and issue the voice commands listed in Section 4.

---

## 11. AI Assistance Disclosure

AI tools were utilized during the development of PHI AI for code generation, interface styling, structural architecture planning, and documentation drafting. All core voice routing logic, Rime TTS audio integration, VAD interruption handling, and acceptance testing were verified for operational performance and accuracy.

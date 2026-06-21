---
name: doubao-speech
version: 1.0.0
description: |
  Use when needing text-to-speech (TTS) or automatic speech recognition (ASR) using Doubao (豆包) speech models.
  TTS: convert text to natural speech audio.
  ASR: transcribe audio to text.
  Configure API_KEY in .doubao-speech/.env before use.
---

# doubao-speech

## Goal

Provide TTS and ASR capabilities using Doubao speech models. Users configure API credentials once, then the AI handles audio generation and transcription.

## Configuration

API key must be set before first use:

```bash
# In project's .doubao-speech/.env or ~/.doubao-speech/.env
API_KEY=your_api_key_here
```

### Models

| Service | Resource-Id | Description |
|---|---|---|
| TTS | `seed-tts-2.0` | Doubao speech synthesis model 2.0 |
| ASR | `volc.seedasr.sauc.duration` | Doubao streaming ASR model 2.0 |

Note: These speech models do not support switching via Auto or console.

### API Endpoints

**TTS (Text-to-Speech):**
- Bidirectional streaming (WebSocket): `wss://openspeech.bytedance.com/api/v3/plan/tts/bidirection`
- Streaming output (WebSocket): `wss://openspeech.bytedance.com/api/v3/plan/tts/unidirectional/stream`
- HTTP (HTTP POST): `https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional`

**ASR (Speech Recognition):**
- Refer to Doubao ASR documentation for endpoints.

## Default Tools

- `doubao_tts` — convert text to speech audio file

## Workflow

### TTS

1. User provides text content and optional voice parameters
2. AI reads API_KEY from .doubao-speech/.env
3. AI calls doubao_tts tool with text and model settings
4. Tool returns audio file path (saved to workspace)

### ASR

1. User provides audio file
2. AI reads ARK_API_KEY from config
3. AI processes audio through Doubao ASR service
4. Returns transcribed text

## Safety Rules

- API keys are read from .doubao-speech/.env only, never hardcoded
- Generated audio files are saved locally, not uploaded anywhere
- User must have ARK_API_KEY configured; tool will fail with clear message if missing

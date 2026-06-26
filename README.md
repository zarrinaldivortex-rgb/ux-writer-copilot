# UX Writer Copilot

AI-powered UX writing assistant for consistent, data-driven copy — a Figma plugin.

## Features

- **Generate** — AI-powered copy suggestions for selected text layers, grounded in your brand voice and writing principles
- **Analyze** — 8-dimension UX writing audit (Brand Voice, Principles, CTA Clarity, Accessibility, Reading Level, Localization, Terminology, Product Consistency)
- **Brainstorm** — Multi-session AI chat with full product context loaded
- **Contexts** — Define brand voice, tone, vocabulary rules, PRD docs, personas, and writing principles per product
- **Agents** — Supports Groq, Ollama, OpenRouter, DeepSeek, Mistral, OpenAI, Anthropic, Gemini, Together AI, and custom endpoints

## Setup

1. Open the plugin in Figma
2. Go to the **Contexts** tab and create a Product Context with your brand voice, tone, and writing principles
3. Go to the **Agents** tab and select your AI provider + enter your API key (session-only, never stored)
4. Select text layers or a frame, then use **Generate** to get AI copy suggestions

## Security

API keys are **session-only** — they are never stored between sessions. The plugin source is stored inside the Figma file, so no credentials are ever embedded in the code.

## Supported AI Providers

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Groq | Yes | Llama 3.3 70B, DeepSeek R1, Llama 4 Scout |
| Ollama | Local | 100% private, offline |
| OpenRouter | Yes | Dozens of free models |
| DeepSeek | Yes | V3 & R1 — near-zero cost |
| Mistral AI | Yes | Small, Large, Codestral |
| OpenAI | Paid | GPT-4.1 Mini, GPT-4.1, GPT-4o |
| Anthropic | Paid | Claude Haiku, Sonnet, Opus |
| Gemini | Yes | 2.0 Flash, 2.5 Flash |
| Together AI | Yes | Free credits |
| Custom | — | Any OpenAI-compatible endpoint |

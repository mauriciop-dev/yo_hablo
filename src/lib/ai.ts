const AI_BASE = '';

type STTProvider = 'gemini-live' | 'groq' | 'web-speech';
type TTSProvider = 'elevenlabs' | 'deepgram' | 'gemini' | 'web-speech' | 'local';
type LLMProvider = 'gemini' | 'deepseek' | 'kimi' | 'zai';

export class AIProvider {
  private sttPrimary: STTProvider = 'groq';
  private sttFallback: STTProvider = 'web-speech';
  private ttsPrimary: TTSProvider = 'deepgram';
  private ttsFallback: TTSProvider = 'web-speech';
  private llmPrimary: LLMProvider = 'gemini';
  private llmFallback: LLMProvider = 'zai';

  async transcribe(audio: Blob, language: string): Promise<string> {
    try {
      return await this.transcribeWith(this.sttPrimary, audio, language);
    } catch {
      try {
        return await this.transcribeWith(this.sttFallback, audio, language);
      } catch {
        throw new Error('All STT providers failed');
      }
    }
  }

  async synthesize(text: string, voiceId: string, language: string): Promise<string> {
    try {
      return await this.synthesizeWith(this.ttsPrimary, text, voiceId, language);
    } catch {
      try {
        return await this.synthesizeWith(this.ttsFallback, text, voiceId, language);
      } catch {
        throw new Error('All TTS providers failed');
      }
    }
  }

  async generate(
    prompt: string,
    systemPrompt: string,
    signal?: AbortSignal,
  ): Promise<string> {
    try {
      return await this.generateWith(this.llmPrimary, prompt, systemPrompt, signal);
    } catch {
      try {
        return await this.generateWith(this.llmFallback, prompt, systemPrompt, signal);
      } catch {
        throw new Error('All LLM providers failed');
      }
    }
  }

  private async transcribeWith(provider: STTProvider, audio: Blob, language: string): Promise<string> {
    if (provider === 'groq') {
      const form = new FormData();
      form.append('audio', audio, 'recording.webm');
      form.append('language', language);
      const res = await fetch(`${AI_BASE}/api/stt/groq`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Groq STT failed');
      const data = await res.json();
      return data.text;
    }
    if (provider === 'web-speech') {
      return new Promise((resolve, reject) => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return reject(new Error('Web Speech not supported'));
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'German' ? 'de-DE' : 'en-US';
        recognition.interimResults = false;
        recognition.onresult = (event: any) => resolve(event.results[0][0].transcript);
        recognition.onerror = () => reject(new Error('Web Speech error'));
        recognition.start();
      });
    }
    throw new Error('Gemini Live STT is handled via WebSocket, not REST');
  }

  private async synthesizeWith(provider: TTSProvider, text: string, voiceId: string, language: string): Promise<string> {
    if (provider === 'deepgram') {
      const res = await fetch(`${AI_BASE}/api/tts/deepgram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId, language }),
      });
      if (!res.ok) throw new Error('Deepgram TTS failed');
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    if (provider === 'elevenlabs') {
      const res = await fetch(`${AI_BASE}/api/tts/elevenlabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) throw new Error('ElevenLabs TTS failed');
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    throw new Error(`TTS provider ${provider} not implemented via REST`);
  }

  private async generateWith(provider: LLMProvider, prompt: string, systemPrompt: string, signal?: AbortSignal): Promise<string> {
    if (provider === 'gemini') {
      const res = await fetch(`${AI_BASE}/api/llm/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
        signal,
      });
      if (!res.ok) throw new Error('Gemini failed');
      const data = await res.json();
      return data.reply;
    }
    if (provider === 'deepseek') {
      const res = await fetch(`${AI_BASE}/api/llm/deepseek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
        signal,
      });
      if (!res.ok) throw new Error('DeepSeek failed');
      const data = await res.json();
      return data.reply;
    }
    if (provider === 'kimi') {
      const res = await fetch(`${AI_BASE}/api/llm/kimi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
        signal,
      });
      if (!res.ok) throw new Error('Kimi failed');
      const data = await res.json();
      return data.reply;
    }
    if (provider === 'zai') {
      const res = await fetch(`${AI_BASE}/api/llm/zai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
        signal,
      });
      if (!res.ok) throw new Error('Z.AI failed');
      const data = await res.json();
      return data.reply;
    }
    throw new Error(`LLM provider ${provider} not supported via this method`);
  }
}

export const ai = new AIProvider();

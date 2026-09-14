import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIProvider } from './ai';

describe('AIProvider', () => {
  let provider: AIProvider;

  beforeEach(() => {
    provider = new AIProvider();
    global.fetch = vi.fn();
  });

  describe('public API', () => {
    it('has transcribe, synthesize, and generate methods', () => {
      expect(typeof provider.transcribe).toBe('function');
      expect(typeof provider.synthesize).toBe('function');
      expect(typeof provider.generate).toBe('function');
    });
  });

  describe('generate (LLM with fallback)', () => {
    it('returns result from primary provider (gemini) on success', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Gemini response' }),
      });

      const result = await provider.generate('hello', 'system prompt');
      expect(result).toBe('Gemini response');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/llm/gemini'),
        expect.any(Object),
      );
    });

    it('falls back to zai when gemini fails', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/llm/zai')) return Promise.resolve({
          ok: true,
          json: async () => ({ reply: 'Z.AI fallback' }),
        });
        if (url.includes('/api/llm/gemini')) return Promise.reject(new Error('Gemini down'));
        return Promise.reject(new Error('unknown'));
      });

      const result = await provider.generate('hello', 'system');
      expect(result).toBe('Z.AI fallback');
    });

    it('throws when all providers fail', async () => {
      (global.fetch as any).mockRejectedValue(new Error('All down'));

      await expect(provider.generate('hello', 'system')).rejects.toThrow('All LLM providers failed');
    });
  });

  describe('transcribe', () => {
    it('falls back to groq when gemini-live is not available', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/stt/groq')) return Promise.resolve({
          ok: true,
          json: async () => ({ text: 'hello world' }),
        });
        return Promise.reject(new Error('not mocked'));
      });

      const result = await provider.transcribe(new Blob(['test']), 'English');
      expect(result).toBe('hello world');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stt/groq'),
        expect.any(Object),
      );
    });
  });

  describe('synthesize', () => {
    it('calls Gemini endpoint by default and returns object URL', async () => {
      const blob = new Blob(['audio-data'], { type: 'audio/mpeg' });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => blob,
      });
      URL.createObjectURL = vi.fn(() => 'blob:audio-url');

      const result = await provider.synthesize('Hello', null, 'English');
      expect(result).toBe('blob:audio-url');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/gemini'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Hello'),
        }),
      );
    });

    it('routes to the selected voice provider first (gemini)', async () => {
      const blob = new Blob(['audio-data'], { type: 'audio/wav' });
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tts/gemini')) return Promise.resolve({ ok: true, blob: async () => blob });
        if (url.includes('/api/tts/deepgram')) return Promise.resolve({ ok: true, blob: async () => blob });
        return Promise.reject(new Error('unknown'));
      });
      URL.createObjectURL = vi.fn(() => 'blob:gemini-url');

      const result = await provider.synthesize('Hallo', { provider: 'gemini', voice_id: 'Kore' }, 'German');
      expect(result).toBe('blob:gemini-url');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/gemini'),
        expect.objectContaining({ body: expect.stringContaining('Kore') }),
      );
    });

    it('falls back to ElevenLabs when the selected provider fails', async () => {
      const blob = new Blob(['audio-data'], { type: 'audio/mpeg' });
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tts/gemini')) return Promise.reject(new Error('Gemini down'));
        if (url.includes('/api/tts/elevenlabs')) return Promise.resolve({ ok: true, blob: async () => blob });
        return Promise.reject(new Error('unknown'));
      });
      URL.createObjectURL = vi.fn(() => 'blob:deepgram-url');

      const result = await provider.synthesize('Hello', { provider: 'gemini', voice_id: 'Kore' }, 'English');
      expect(result).toBe('blob:deepgram-url');
    });
  });
});

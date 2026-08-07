import { useState, useRef, useCallback } from 'react';
import { ai } from '../lib/ai';

export function useVoice(language: string, level: string, selectedVoiceId: string = '') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const langTag = language === 'German' ? 'de-DE' : 'en-US';

  const speakWithWebSpeech = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langTag;
    utterance.rate = level === 'A1' ? 0.85 : 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [langTag, level]);

  const speakText = useCallback((text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    ai.synthesize(text, selectedVoiceId, langTag)
      .then((url) => {
        const audio = new Audio(url);
        audioElRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          speakWithWebSpeech(text);
        };
        audio.play().catch(() => {
          setIsSpeaking(false);
          speakWithWebSpeech(text);
        });
      })
      .catch(() => {
        setIsSpeaking(false);
        speakWithWebSpeech(text);
      });
  }, [speakWithWebSpeech, selectedVoiceId]);

  const stopSpeech = useCallback(() => {
    audioElRef.current?.pause();
    audioElRef.current = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startLiveSession = useCallback(async (name: string, userId?: string, retryCount = 0) => {
    try {
      stopSpeech();
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/live?targetLanguage=${encodeURIComponent(language)}&level=${encodeURIComponent(level)}&name=${encodeURIComponent(name)}&userId=${userId || ''}`;

      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputAudioCtx;
      outputAudioCtxRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = inputAudioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(inputData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      const onMessageHandlers: ((msg: any) => void)[] = [];

      ws.onopen = () => {
        setIsLiveActive(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) playAudioChunk(outputAudioCtx, msg.audio);
          onMessageHandlers.forEach(h => h(msg));
        } catch (e) {
          console.error(e);
        }
      };

      ws.onerror = () => {
        if (retryCount < 3) setTimeout(() => startLiveSession(name, userId, retryCount + 1), 2000);
        else stopLiveSession();
      };

      ws.onclose = (event) => {
        setIsLiveActive(false);
        if (!event.wasClean && retryCount < 3) setTimeout(() => startLiveSession(name, userId, retryCount + 1), 2000);
      };

      return { onMessage: (handler: (msg: any) => void) => onMessageHandlers.push(handler) };
    } catch {
      if (retryCount < 3) setTimeout(() => startLiveSession(name, userId, retryCount + 1), 2000);
      else stopLiveSession();
      return null;
    }
  }, [language, level, stopSpeech]);

  const stopLiveSession = useCallback(() => {
    setIsLiveActive(false);
    liveWsRef.current?.close();
    liveWsRef.current = null;
    try {
      sourceRef.current?.disconnect();
      processorRef.current?.disconnect();
      inputAudioCtxRef.current?.close();
    } catch {}
    try { outputAudioCtxRef.current?.close(); } catch {}
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<(transcript: string) => void>(() => {});

  const startListening = useCallback((onResult: (transcript: string) => void) => {
    onResultRef.current = onResult;
    if (isListening) return;

    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = () => {
          setIsListening(false);
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          ai.transcribe(blob, language)
            .then((text) => {
              if (text && text.trim()) onResultRef.current(text.trim());
            })
            .catch((err) => console.error('STT error:', err));
        };
        recorder.start();
        setIsListening(true);
      })
      .catch((err) => console.error('Mic error:', err));
  }, [language, isListening]);

  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    } else {
      setIsListening(false);
    }
  }, []);

  return {
    isSpeaking, isListening, isLiveActive,
    speakText, stopSpeech, startLiveSession, stopLiveSession, startListening, stopListening, setIsLiveActive,
  };
}

function pcmToBase64(float32Array: Float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) binary += String.fromCharCode(uint8Array[i]);
  return btoa(binary);
}

function playAudioChunk(ctx: AudioContext, base64: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

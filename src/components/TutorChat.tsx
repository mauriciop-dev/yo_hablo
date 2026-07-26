import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Award, Mic, MicOff } from 'lucide-react';
import { Message, UserProfile } from '../types';
import VoiceIndicator from './VoiceIndicator';

interface TutorChatProps {
  profile: UserProfile;
  voiceEnabled: boolean;
  voice: {
    isSpeaking: boolean;
    isListening: boolean;
    isLiveActive: boolean;
    speakText: (text: string) => void;
    stopSpeech: () => void;
    startLiveSession: (name: string) => Promise<any>;
    stopLiveSession: () => void;
    startListening: (onResult: (text: string) => void) => void;
  };
  streakDays?: number;
}

export default function TutorChat({ profile, voiceEnabled, voice, streakDays = 5 }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    initGreeting();
  }, [profile.id]);

  const initGreeting = () => {
    let greetingText = '';
    let suggestionList: string[] = [];
    if (profile.targetLanguage === 'German') {
      greetingText = `Hallo ${profile.name}! ¡Qué gusto saludarte! ¿Cómo estás hoy? ¿Quieres que sigamos practicando alemán donde quedamos o prefieres trabajar otra habilidad?`;
      suggestionList = ['Mir geht es sehr gut, danke!', 'Ich möchte gerne sprechen üben.', 'Was machen wir heute?'];
    } else {
      greetingText = `Hi ${profile.name}! Great to see you today. How was your day? Are we ready to continue with English practice or do you want to focus on a new topic?`;
      suggestionList = ['I am doing great, thank you!', 'I want to practice conversation.', 'What should we talk about today?'];
    }

    setMessages([{
      id: Date.now().toString(), role: 'assistant', text: greetingText, timestamp: new Date()
    }]);
    setSuggestedReplies(suggestionList);
    if (voiceEnabled) voice.speakText(greetingText);
  };

  const sendMessage = async (textToSend?: string, retries = 2) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', text, timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages, profile }),
      });
      const textResponse = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textResponse}`);
      const data = JSON.parse(textResponse);
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant', text: data.reply,
        translation: data.translation, gentleCorrection: data.gentleCorrection, timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      setSuggestedReplies(data.suggestedReplies || []);
      if (voiceEnabled) voice.speakText(data.reply);
    } catch (err) {
      console.error(err);
      if (retries > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: 'assistant',
          text: `⚠️ Error de conexión. Reintentando (${3 - retries}/2)...`, timestamp: new Date()
        }]);
        setLoading(false);
        setTimeout(() => sendMessage(text, retries - 1), 1500);
        return;
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: 'assistant',
          text: 'Lo siento, tuve un problema persistente conectando con el tutor. ¿Podrías repetirlo?', timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLiveStart = () => {
    voice.startLiveSession(profile.name);
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'assistant',
      text: `🟢 Conectado a Gemini Live (Voz Real). ¡Habla con Aura en ${profile.targetLanguage}!`, timestamp: new Date()
    }]);
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopSpeech();
    } else {
      voice.startListening((transcript) => sendMessage(transcript));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold">🤖</div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800">Aura (Tutor IA en vivo)</h2>
            <p className="text-xs text-stone-500">Práctica de {profile.targetLanguage} • Nivel {profile.level}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {voice.isLiveActive ? (
            <button onClick={voice.stopLiveSession}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-medium shadow-sm transition-all hover:bg-rose-700">
              <MicOff className="w-4 h-4" /><span>Gemini Live</span>
            </button>
          ) : (
            <button onClick={handleLiveStart}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
              <Mic className="w-4 h-4" /><span>Gemini Live</span>
            </button>
          )}

          <VoiceIndicator
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            isLiveActive={voice.isLiveActive}
            onToggleMic={handleMicToggle}
            onStopSpeech={voice.stopSpeech}
          />

          <div className="hidden sm:flex items-center space-x-2 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl">
            <Award className="w-4 h-4 text-emerald-600" /><span>Racha: <strong className="text-stone-800">{streakDays} días</strong></span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={`max-w-xl rounded-2xl px-4 py-3 space-y-2 text-sm shadow-xs ${
              msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-xs' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.translation && (
                <div className="text-xs bg-stone-100 text-stone-600 p-2 rounded-lg border border-stone-200">
                  <span className="font-semibold text-stone-700">Traducción/Nota:</span> {msg.translation}
                </div>
              )}
              {msg.gentleCorrection && (
                <div className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200 flex items-start space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div><span className="font-semibold">Tip de gramática:</span> {msg.gentleCorrection}</div>
                </div>
              )}
              <div className={`text-[10px] text-right ${msg.role === 'user' ? 'text-emerald-100' : 'text-stone-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 rounded-bl-xs flex items-center space-x-3 text-stone-500 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
              </div>
              <span className="text-xs text-stone-400">Aura está escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {suggestedReplies.length > 0 && !loading && (
        <div className="px-6 py-2 bg-white border-t border-stone-100 flex items-center space-x-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider shrink-0">Sugerencias:</span>
          {suggestedReplies.map((reply, idx) => (
            <button key={idx} onClick={() => sendMessage(reply)}
              className="text-xs bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200 transition-all shrink-0 whitespace-nowrap animate-fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}>
              {reply}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 bg-white border-t border-stone-200 flex items-center space-x-3">
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={voice.isListening ? '🎤 Escuchando...' : `Escribe en ${profile.targetLanguage}...`}
          className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" />
        <button onClick={() => sendMessage()} disabled={loading || !inputText.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm flex items-center justify-center">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

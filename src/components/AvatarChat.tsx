// Componente principal del chat con Avatar 3D
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, RotateCcw, MessageSquareHeart, Loader2 } from 'lucide-react';
import type { UserProfile, AvatarMessage, AvatarMetadata } from '../types';
import { useAvatar } from '../hooks/useAvatar';
import AvatarSelector from './AvatarSelector';
import VoiceIndicator from './VoiceIndicator';
import { parseAvatarResponse, AVATAR_SYSTEM_PROMPT, buildAvatarPrompt } from '../lib/avatar';

interface AvatarChatProps {
  profile: UserProfile;
  voiceEnabled: boolean;
  voice: {
    isSpeaking: boolean;
    isListening: boolean;
    speakText: (text: string) => void;
    stopSpeech: () => void;
    startListening: (onResult: (text: string) => void) => void;
    stopListening: () => void;
  };
  selectedTutorVoice: { provider: string; voice_id: string } | null;
  onProfileChange: (profile: UserProfile) => void;
  activeLesson?: any;
  onLessonComplete?: (lesson: any) => void;
}

export default function AvatarChat({ 
  profile, 
  voiceEnabled, 
  voice, 
  selectedTutorVoice,
  onProfileChange,
  activeLesson = null,
  onLessonComplete 
}: AvatarChatProps) {
  const [messages, setMessages] = useState<AvatarMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(!profile.avatarGender);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  const avatar = useAvatar({
    profile,
    voiceEnabled,
    selectedVoice: selectedTutorVoice,
  });

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Saludo inicial
  useEffect(() => {
    if (hasGreeted || showSelector || !profile.avatarGender) return;
    setHasGreeted(true);
    initGreeting();
  }, [profile.id, profile.avatarGender, showSelector]);

  // Lección activa
  useEffect(() => {
    if (!activeLesson) return;
    setExerciseIndex(0);
    setExerciseAnswer('');
    setCompletedExercises(new Set());
    const instruction = profile.targetLanguage === 'German'
      ? `Wir beginnen jetzt die Lektion: ${activeLesson.title}. Folge den Anweisungen und beantworte alle Übungen.`
      : profile.targetLanguage === 'French'
        ? `Nous commençons la leçon : ${activeLesson.title}. Suis les instructions et réponds à tous les exercices.`
        : `We are starting the lesson: ${activeLesson.title}. Follow the instructions and answer every exercise.`;
    setMessages(prev => [...prev, { id: `lesson-${activeLesson.id}`, role: 'assistant', text: instruction, timestamp: new Date() }]);
  }, [activeLesson, profile.targetLanguage]);

  const initGreeting = async () => {
    let greetingText = '';
    let suggestionList: string[] = [];
    
    if (profile.targetLanguage === 'German') {
      greetingText = `Hallo ${profile.name}! Schön, dich zu sehen. Ich bin Aura, dein ${profile.avatarGender === 'male' ? 'Sprachlehrer' : 'Sprachlehrerin'}. Wollen wir heute mit einer Übung für ${profile.level} starten?`;
      suggestionList = ['Guten Tag! Ich bin bereit.', 'Wie läuft mein Fortschritt?', 'Was machen wir heute?'];
    } else if (profile.targetLanguage === 'French') {
      greetingText = `Salut ${profile.name}! Ravi de te voir. Je suis Aura, ton ${profile.avatarGender === 'male' ? 'professeur' : 'professeure'} de langue. On commence avec un exercice ${profile.level} ?`;
      suggestionList = ['Salut! Je suis prêt.', 'Comment va mon progrès?', 'Qu\'est-ce qu\'on fait aujourd\'hui?'];
    } else {
      greetingText = `Hi ${profile.name}! Great to see you. I'm Aura, your ${profile.avatarGender === 'male' ? 'language tutor' : 'language tutor'}. Shall we start with a ${profile.level} exercise today?`;
      suggestionList = ['Hello! I am ready to start.', 'How is my progress going?', 'What are we doing today?'];
    }

    // Formatear saludo con metadata de avatar
    const metadata = {
      expr: 'HAPPY' as const,
      gesture: 'WAVE' as const,
      gaze: 'DIRECT' as const,
      prosody: 'WARM_CASUAL' as const,
      phonetics_focus: 'STANDARD' as const,
      pause_ms: 300,
    };
    
    const formattedGreeting = `${JSON.stringify(metadata)} ${greetingText}`;
    
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      text: greetingText,
      metadata,
      timestamp: new Date()
    }]);
    setSuggestedReplies(suggestionList);
    
    if (voiceEnabled) {
      avatar.speak(formattedGreeting);
    }
  };

  const sendMessage = async (textToSend?: string, retries = 2) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: AvatarMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);
    setSuggestedReplies([]);

    try {
      const historyForAPI = messages.map(m => ({ role: m.role, text: m.text }));
      
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: historyForAPI, 
          profile: {
            ...profile,
            avatarGender: profile.avatarGender || 'female',
          }
        }),
      });
      
      const textResponse = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textResponse}`);
      
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        // Si no es JSON, usar el texto plano
        data = { reply: textResponse };
      }
      
      if (data.error) throw new Error(data.error);

      const replyText = data.reply || textResponse;
      const parsed = parseAvatarResponse(replyText);
      
      const assistantMsg: AvatarMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: parsed?.cleanText || replyText,
        metadata: parsed?.metadata || undefined,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setSuggestedReplies(data.suggestedReplies || []);
      
      if (voiceEnabled) {
        avatar.speak(replyText);
      }
    } catch (err) {
      console.error(err);
      if (retries > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `⚠️ Error de conexión. Reintentando (${3 - retries}/2)...`,
          timestamp: new Date()
        }]);
        setLoading(false);
        setTimeout(() => sendMessage(text, retries - 1), 1500);
        return;
      } else {
        const errorMsg = profile.targetLanguage === 'German'
          ? 'Entschuldigung, ich hatte ein Problem. Kannst du das wiederholen?'
          : profile.targetLanguage === 'French'
            ? 'Désolé, j\'ai eu un problème. Peux-tu répéter ?'
            : 'Sorry, I had a problem. Could you repeat that?';
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: errorMsg,
          timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening((transcript) => sendMessage(transcript));
    }
  };

  const submitLessonExercise = () => {
    if (!activeLesson || !exerciseAnswer.trim()) return;
    const exercise = activeLesson.exercises[exerciseIndex];
    if (!exercise) return;
    const normalized = exerciseAnswer.trim().toLowerCase();
    const expected = Array.isArray(exercise.correctAnswer) ? exercise.correctAnswer : [exercise.correctAnswer];
    const requiresExactAnswer = exercise.type === 'multiple_choice' || exercise.type === 'fill_blank';
    if (requiresExactAnswer && exercise.correctAnswer && !expected.some(answer => String(answer).toLowerCase() === normalized)) return;

    const nextCompleted = new Set(completedExercises).add(exercise.exerciseNumber);
    setCompletedExercises(nextCompleted);
    setExerciseAnswer('');
    if (exerciseIndex < activeLesson.exercises.length - 1) {
      setExerciseIndex(index => index + 1);
    } else {
      onLessonComplete?.(activeLesson);
      const completeText = profile.targetLanguage === 'German' 
        ? 'Ausgezeichnet! Die Lektion ist abgeschlossen.'
        : profile.targetLanguage === 'French'
          ? 'Excellent ! La leçon est terminée.'
          : 'Excellent! The lesson is complete.';
      setMessages(prev => [...prev, { id: `lesson-complete-${activeLesson.id}`, role: 'assistant', text: completeText, timestamp: new Date() }]);
    }
  };

  const handleAvatarChange = (gender: 'male' | 'female', modelUrl: string) => {
    const newProfile = { ...profile, avatarGender: gender, avatarModelUrl: modelUrl };
    onProfileChange(newProfile);
    setShowSelector(false);
    setHasGreeted(false); // Reiniciar saludo con nuevo avatar
  };

  const handleResetAvatar = () => {
    setShowSelector(true);
    setMessages([]);
    setHasGreeted(false);
    avatar.stopSpeaking();
  };

  if (showSelector || !profile.avatarGender) {
    return (
      <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
        <AvatarSelector 
          targetLanguage={profile.targetLanguage} 
          onSelect={handleAvatarChange}
          initialGender={profile.avatarGender || 'female'}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold">
              {profile.avatarGender === 'male' ? '👨' : '👩'}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800">Aura (Avatar 3D)</h2>
            <p className="text-xs text-stone-500">
              Práctica de {profile.targetLanguage} • Nivel {profile.level} • {profile.avatarGender === 'male' ? 'Hombre' : 'Mujer'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <VoiceIndicator
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            onToggleMic={handleMicToggle}
            onStopSpeech={voice.stopSpeech}
          />

          <button 
            onClick={handleResetAvatar}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all text-stone-500 hover:text-emerald-600"
            title="Cambiar avatar"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas 3D del Avatar */}
      <div className="relative h-72 bg-stone-50/50 border-b border-stone-200">
        {avatar.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 z-10">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          </div>
        )}
        {avatar.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 z-10 text-stone-600">
            <p className="text-center px-4">{avatar.error}</p>
          </div>
        )}
        <canvas
          ref={avatar.canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        {/* Indicador de habla sobre el canvas */}
        {avatar.isSpeaking && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-emerald-600/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
            <span className="flex space-x-0.5">
              {[1,2,3].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </span>
            <span>Aura está hablando...</span>
          </div>
        )}
        {avatar.currentMetadata && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-stone-600 font-mono">
            {avatar.currentMetadata.expr} • {avatar.currentMetadata.gesture}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={`max-w-xl rounded-2xl px-4 py-3 space-y-2 text-sm shadow-xs ${
              msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-xs' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.metadata && (
                <div className="text-[10px] text-stone-400 font-mono flex items-center space-x-2">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>expr: {msg.metadata.expr}</span>
                  <span>gesture: {msg.metadata.gesture}</span>
                  <span>gaze: {msg.metadata.gaze}</span>
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
              <span className="text-xs text-stone-400">Aura está pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Lesson Exercise */}
      {activeLesson && exerciseIndex < activeLesson.exercises.length && (
        <div className="border-t border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>{activeLesson.title}</span>
            <span>Ejercicio {exerciseIndex + 1}/{activeLesson.exercises.length}</span>
          </div>
          <p className="text-xs text-emerald-900">{activeLesson.exercises[exerciseIndex].instructions}</p>
          <p className="mt-1 text-sm font-medium text-stone-800">{activeLesson.exercises[exerciseIndex].prompt}</p>
          {activeLesson.exercises[exerciseIndex].options ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeLesson.exercises[exerciseIndex].options?.map(option => (
                <button 
                  key={option} 
                  onClick={() => setExerciseAnswer(option)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${
                    exerciseAnswer === option ? 'border-emerald-600 bg-emerald-100' : 'border-stone-200 bg-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input 
              value={exerciseAnswer} 
              onChange={e => setExerciseAnswer(e.target.value)} 
              className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" 
              placeholder={profile.targetLanguage === 'German' ? 'Deine Antwort...' : profile.targetLanguage === 'French' ? 'Ta réponse...' : 'Your answer...'} 
            />
          )}
          <button 
            onClick={submitLessonExercise} 
            disabled={!exerciseAnswer.trim()} 
            className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Suggested Replies */}
      {suggestedReplies.length > 0 && !loading && (
        <div className="px-6 py-2 bg-white border-t border-stone-100 flex items-center space-x-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider shrink-0">Sugerencias:</span>
          {suggestedReplies.map((reply, idx) => (
            <button 
              key={idx} 
              onClick={() => sendMessage(reply)}
              className="text-xs bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200 transition-all shrink-0 whitespace-nowrap animate-fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-stone-200 flex items-center space-x-3">
        <input 
          type="text" 
          value={inputText} 
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={voice.isListening ? '🎤 Escuchando...' : `Escribe en ${profile.targetLanguage}...`}
          className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" 
        />
        <button 
          onClick={() => sendMessage()} 
          disabled={loading || !inputText.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
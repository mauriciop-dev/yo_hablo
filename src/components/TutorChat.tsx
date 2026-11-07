import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Award } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { LessonData } from '../data/lessons';
import VoiceIndicator from './VoiceIndicator';

interface TutorChatProps {
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
  streakDays?: number;
  activeLesson?: LessonData | null;
  activeScenario?: { title: string; prompt: string } | null;
  onLessonComplete?: (lesson: LessonData) => void;
}

export default function TutorChat({ profile, voiceEnabled, voice, streakDays = 5, activeLesson = null, activeScenario = null, onLessonComplete }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasGreetedRef = useRef<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (activeScenario) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        text: `📍 Rol / Situación: ${activeScenario.title}\n\n${activeScenario.prompt}`,
        timestamp: new Date()
      }]);
      setSuggestedReplies([
        profile.targetLanguage === 'German' ? 'Ja, bitte.' : profile.targetLanguage === 'French' ? 'Oui, s il vous plaît.' : 'Yes, please.',
        profile.targetLanguage === 'German' ? 'Was empfehlen Sie?' : profile.targetLanguage === 'French' ? 'Qu est-ce que vous recommandez ?' : 'What do you recommend?',
      ]);
      if (voiceEnabled) voice.speakText(activeScenario.prompt);
      return;
    }

    if (hasGreetedRef.current === profile.id) return;
    hasGreetedRef.current = profile.id;
    setMessages([]);
    setSuggestedReplies([]);
    initGreeting();
  }, [profile.id, activeScenario]);

  useEffect(() => {
    if (!activeLesson) return;
    setExerciseIndex(0);
    setExerciseAnswer('');
    setCompletedExercises(new Set());
    const skillName = activeLesson.skill === 'speaking' ? 'Hablar (Speaking - Respuesta hablada)' : activeLesson.skill === 'listening' ? 'Escuchar (Listening - Preguntas y opciones)' : activeLesson.skill === 'reading' ? 'Leer (Reading - Preguntas y opciones)' : 'Escribir (Writing - Respuesta escrita)';
    const instruction = profile.targetLanguage === 'German'
      ? `Willkommen zur Lektion: "${activeLesson.title}". Fokus: ${skillName} (${activeLesson.level}). ${activeLesson.description} Bitte folge den Anweisungen im grünen Bereich unten.`
      : profile.targetLanguage === 'French'
        ? `Bienvenue dans la leçon : "${activeLesson.title}". Objectif : ${skillName} (${activeLesson.level}). ${activeLesson.description} Suivez les instructions dans le panneau vert ci-dessous.`
        : `Welcome to lesson: "${activeLesson.title}". Focus: ${skillName} (${activeLesson.level}). ${activeLesson.description} Follow the instructions in the green panel below.`;
    setMessages(prev => [...prev, { id: `lesson-${activeLesson.id}`, role: 'assistant', text: instruction, timestamp: new Date() }]);
  }, [activeLesson, profile.targetLanguage]);

  const initGreeting = () => {
    let greetingText = '';
    let suggestionList: string[] = [];
    if (profile.targetLanguage === 'German') {
      greetingText = `Hallo ${profile.name}! Schön, dass du hier bist. Ich bin Aura, deine Sprachlehrerin. Wollen wir heute mit einer Übung für das Niveau ${profile.level} starten?`;
      suggestionList = ['Guten Tag! Ich bin bereit.', 'Wie läuft mein Fortschritt?', 'Was machen wir heute?'];
    } else {
      greetingText = `Hi ${profile.name}! Great to see you here. I'm Aura, your language tutor. Shall we start today with an exercise for ${profile.level} level?`;
      suggestionList = ['Hello! I am ready to start.', 'How is my progress going?', 'What are we doing today?'];
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
      setMessages(prev => [...prev, { id: `lesson-complete-${activeLesson.id}`, role: 'assistant', text: profile.targetLanguage === 'German' ? 'Ausgezeichnet! Die Lektion ist abgeschlossen.' : profile.targetLanguage === 'French' ? 'Excellent ! La leçon est terminée.' : 'Excellent! The lesson is complete.', timestamp: new Date() }]);
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
          <VoiceIndicator
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
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

      {activeLesson && exerciseIndex < activeLesson.exercises.length && (() => {
        const exercise = activeLesson.exercises[exerciseIndex];
        const skill = activeLesson.skill;
        return (
          <div className="border-t border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span className="flex items-center space-x-1.5">
                <span>{activeLesson.title}</span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">
                  {skill === 'speaking' ? '🗣️ Speaking (Solo hablado)' : skill === 'listening' ? '🎧 Listening (Hablado / Opciones)' : skill === 'reading' ? '📖 Reading (Hablado / Opciones)' : '✍️ Writing (Solo escrito)'}
                </span>
              </span>
              <span>Ejercicio {exerciseIndex + 1}/{activeLesson.exercises.length}</span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-1 shadow-2xs">
              <p className="text-xs font-bold text-emerald-800">📌 Instrucción: {exercise.instructions}</p>
              <p className="text-sm font-semibold text-stone-900">❓ Pregunta / Reto: {exercise.prompt}</p>
            </div>

            {skill === 'speaking' ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <p className="text-xs text-stone-700 font-medium text-center">
                  Este ejercicio es de <strong>Speaking</strong>. Por favor, responde <strong>hablando</strong> utilizando el micrófono:
                </p>
                <button
                  onClick={() => {
                    voice.startListening((transcript) => setExerciseAnswer(transcript));
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center space-x-2 transition-all shadow-sm ${
                    voice.isListening ? 'bg-rose-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}>
                  <span>{voice.isListening ? '🎤 Escuchando... Habla ahora' : '🎙️ Hablar respuesta'}</span>
                </button>
                {exerciseAnswer && (
                  <p className="text-xs bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300 font-medium">
                    Respuesta capturada: "{exerciseAnswer}"
                  </p>
                )}
              </div>
            ) : exercise.options ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {exercise.options.map(option => (
                  <button key={option} onClick={() => setExerciseAnswer(option)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-xs font-semibold transition-all ${
                      exerciseAnswer === option ? 'border-emerald-600 bg-emerald-100 text-emerald-900 font-bold shadow-2xs' : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                    }`}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={exerciseAnswer}
                onChange={event => setExerciseAnswer(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                placeholder={
                  skill === 'writing'
                    ? 'Escribe tu respuesta escrita aquí...'
                    : 'Escribe o responde aquí...'
                }
              />
            )}

            <button
              onClick={submitLessonExercise}
              disabled={!exerciseAnswer.trim()}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 transition-all shadow-sm">
              {exerciseIndex < activeLesson.exercises.length - 1 ? 'Continuar' : 'Finalizar lección'}
            </button>
          </div>
        );
      })()}

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

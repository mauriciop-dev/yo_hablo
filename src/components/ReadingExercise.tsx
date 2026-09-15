import React, { useState, useEffect } from 'react';
import { RefreshCw, Volume2, BookOpen, BookMarked, CheckCircle, ChevronRight } from 'lucide-react';
import { UserProfile, ReadingExercise as ReadingExerciseType } from '../types';

interface ReadingExerciseProps {
  profile: UserProfile;
  speakText: (text: string) => void;
}

export default function ReadingExercise({ profile, speakText }: ReadingExerciseProps) {
  const [topic, setTopic] = useState('Mein Alltag');
  const [data, setData] = useState<ReadingExerciseType | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setTopic(profile.targetLanguage === 'German' ? 'Mein Alltag' : profile.targetLanguage === 'French' ? 'Ma routine quotidienne' : 'My daily routine');
  }, [profile.targetLanguage]);

  const generate = async () => {
    setLoading(true);
    setShowResults(false);
    setSelectedAnswers({});
    try {
      const res = await fetch('/api/reading/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, topic }),
      });
      const textRes = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textRes}`);
      const result = JSON.parse(textRes);
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err) {
      console.error(err);
      const fallback = profile.targetLanguage === 'German' ? {
        title: topic || 'Mein Alltag', text: `Jeden Morgen beginne ich meinen Tag ruhig. Ich trinke Kaffee, lese kurz und plane meine Aufgaben. Am Nachmittag lerne ich neue Wörter und übe mit kurzen Gesprächen. Am Abend wiederhole ich die wichtigsten Ausdrücke.`,
        vocabulary: [{ word: 'jeden Morgen', translation: 'every morning' }, { word: 'Aufgaben', translation: 'tasks' }, { word: 'wiederholen', translation: 'to review' }],
        questions: [{ question: 'Was macht die Person am Nachmittag?', options: ['Sie lernt neue Wörter', 'Sie schläft', 'Sie reist', 'Sie kocht'], correctAnswer: 'Sie lernt neue Wörter' }, { question: 'Was macht die Person am Abend?', options: ['Sie wiederholt Ausdrücke', 'Sie arbeitet im Büro', 'Sie geht ins Kino', 'Sie schwimmt'], correctAnswer: 'Sie wiederholt Ausdrücke' }],
      } : profile.targetLanguage === 'French' ? {
        title: topic || 'Ma routine quotidienne', text: `Chaque matin, je commence ma journée calmement. Je prends un café, je lis un peu et je prépare mes tâches. L'après-midi, j'apprends de nouveaux mots et je pratique de courtes conversations. Le soir, je révise les expressions importantes.`,
        vocabulary: [{ word: 'chaque matin', translation: 'every morning' }, { word: 'tâches', translation: 'tasks' }, { word: 'réviser', translation: 'to review' }],
        questions: [{ question: 'Que fait la personne l’après-midi ?', options: ['Elle apprend de nouveaux mots', 'Elle dort', 'Elle voyage', 'Elle cuisine'], correctAnswer: 'Elle apprend de nouveaux mots' }, { question: 'Que fait-elle le soir ?', options: ['Elle révise les expressions', 'Elle travaille au bureau', 'Elle va au cinéma', 'Elle nage'], correctAnswer: 'Elle révise les expressions' }],
      } : {
        title: topic || 'My daily routine', text: `Every morning, I start my day calmly. I have a coffee, read for a few minutes, and plan my tasks. In the afternoon, I learn new words and practise short conversations. In the evening, I review the most important expressions.`,
        vocabulary: [{ word: 'every morning', translation: 'cada mañana' }, { word: 'tasks', translation: 'tareas' }, { word: 'review', translation: 'repasar' }],
        questions: [{ question: 'What does the person do in the afternoon?', options: ['They learn new words', 'They sleep', 'They travel', 'They cook'], correctAnswer: 'They learn new words' }, { question: 'What do they do in the evening?', options: ['They review expressions', 'They work at the office', 'They go to the cinema', 'They swim'], correctAnswer: 'They review expressions' }],
      };
      setData(fallback as any);
    } finally {
      setLoading(false);
    }
  };

  const score = showResults && data
    ? data.questions.reduce((acc, q, i) => acc + (selectedAnswers[i] === q.correctAnswer ? 1 : 0), 0) : 0;

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="flex flex-col items-start justify-between gap-4 pb-6 border-b border-stone-200 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-stone-800">Lectura Asistida ({profile.targetLanguage})</h2>
          <p className="text-xs text-stone-500 mt-0.5">Textos adaptados a tu nivel con vocabulario clave y preguntas de comprensión.</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema..."
            className="w-full min-w-0 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-48" />
          <button onClick={generate} disabled={loading}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1.5 sm:w-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /><span>Generar Texto</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 animate-fade-in">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-stone-500">Generando lectura interactiva...</p>
        </div>
      )}

      {!loading && data && (
        <div className="mt-6 space-y-8 max-w-3xl mx-auto w-full">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800">{data.title}</h3>
              <button onClick={() => speakText(data.text)}
                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-all">
                <Volume2 className="w-4 h-4" /><span>Escuchar audio</span>
              </button>
            </div>
            <p className="text-stone-700 leading-relaxed text-base whitespace-pre-wrap">{data.text}</p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 space-y-3 animate-slide-up">
            <h4 className="text-sm font-bold text-emerald-900 flex items-center space-x-2">
              <BookMarked className="w-4 h-4 text-emerald-700" /><span>Vocabulario Clave</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.vocabulary?.map((vocab, idx) => (
                <div key={idx} className="bg-white border border-emerald-100 p-3 rounded-xl flex justify-between items-center text-xs shadow-xs">
                  <span className="font-bold text-stone-800">{vocab.word}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{vocab.translation}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Preguntas de Comprensión</h4>
              {showResults && (
                <div className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
                  {score}/{data.questions.length} correctas
                </div>
              )}
            </div>
            {data.questions?.map((q, qIdx) => (
              <div key={qIdx} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs transition-all hover:shadow-sm">
                <p className="text-sm font-medium text-stone-800">{qIdx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[qIdx] === opt;
                    const isCorrect = showResults && opt === q.correctAnswer;
                    const isWrong = showResults && isSelected && opt !== q.correctAnswer;
                    let btnStyle = "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100";
                    if (isSelected) btnStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium";
                    if (isCorrect) btnStyle = "bg-emerald-600 border-emerald-600 text-white font-medium";
                    if (isWrong) btnStyle = "bg-rose-100 border-rose-300 text-rose-900";
                    return (
                      <button key={optIdx} onClick={() => { if (!showResults) setSelectedAnswers({ ...selectedAnswers, [qIdx]: opt }); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${btnStyle}`}>
                        <span>{opt}</span>
                        {showResults && opt === q.correctAnswer && <CheckCircle className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!showResults ? (
              <button onClick={() => setShowResults(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
                Verificar Respuestas
              </button>
            ) : (
              <button onClick={() => { setShowResults(false); setSelectedAnswers({}); generate(); }}
                className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4" /><span>Nuevo Texto de Lectura</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

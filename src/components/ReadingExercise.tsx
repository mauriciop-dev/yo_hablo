import React, { useState } from 'react';
import { RefreshCw, Volume2, BookOpen, BookMarked, CheckCircle, ChevronRight } from 'lucide-react';
import { UserProfile, ReadingExercise as ReadingExerciseType } from '../types';

interface ReadingExerciseProps {
  profile: UserProfile;
  speakText: (text: string) => void;
}

export default function ReadingExercise({ profile, speakText }: ReadingExerciseProps) {
  const [topic, setTopic] = useState('Mi rutina diaria / Mein Alltag');
  const [data, setData] = useState<ReadingExerciseType | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const score = showResults && data
    ? data.questions.reduce((acc, q, i) => acc + (selectedAnswers[i] === q.correctAnswer ? 1 : 0), 0) : 0;

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-800">Lectura Asistida ({profile.targetLanguage})</h2>
          <p className="text-xs text-stone-500 mt-0.5">Textos adaptados a tu nivel con vocabulario clave y preguntas de comprensión.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema..."
            className="bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={generate} disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 shrink-0">
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

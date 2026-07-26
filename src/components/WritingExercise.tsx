import React, { useState } from 'react';
import { Sparkles, Award, PenTool, ChevronRight } from 'lucide-react';
import { UserProfile, WritingFeedback } from '../types';

interface WritingExerciseProps {
  profile: UserProfile;
}

export default function WritingExercise({ profile }: WritingExerciseProps) {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/writing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, profile }),
      });
      const textRes = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textRes}`);
      const data = JSON.parse(textRes);
      if (data.error) throw new Error(data.error);
      setFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="pb-6 border-b border-stone-200">
        <h2 className="text-xl font-bold text-stone-800">Escritura Asistida ({profile.targetLanguage})</h2>
        <p className="text-xs text-stone-500 mt-0.5">Escribe un párrafo o frase y recibe corrección instantánea y feedback.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="flex flex-col space-y-3">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Tu redacción</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder={`Escribe aquí en ${profile.targetLanguage}...`}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all h-64 resize-none" />
          <button onClick={submit} disabled={loading || !text.trim()}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center justify-center space-x-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Analizando redacción...</span></>
            ) : (
              <><Sparkles className="w-4 h-4" /><span>Enviar a Corregir</span></>
            )}
          </button>
        </div>

        <div className="flex flex-col space-y-3">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Evaluación y Sugerencias</label>
          <div className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl p-6 overflow-y-auto space-y-4">
            {!feedback && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 py-12">
                <PenTool className="w-10 h-10 mb-3 text-stone-300" />
                <p className="text-xs">Escribe algo a la izquierda y haz clic en "Enviar a Corregir" para ver las observaciones de Aura.</p>
              </div>
            )}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2">
                <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-stone-500">Evaluando gramática y estilo...</p>
              </div>
            )}
            {feedback && !loading && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between bg-white border border-stone-200 p-4 rounded-xl shadow-xs">
                  <div>
                    <div className="text-xs text-stone-500">Calificación de fluidez</div>
                    <div className="text-lg font-bold text-emerald-700">{feedback.score} / 100</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700"><Award className="w-6 h-6" /></div>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                    style={{ width: `${feedback.score}%` }}></div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  <span className="font-semibold block mb-1">Comentario del tutor:</span>{feedback.encouragement}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-stone-700">Versión pulida recomendada:</div>
                  <div className="bg-white border border-stone-200 p-3 rounded-xl text-xs text-stone-800 font-medium">{feedback.correctedText}</div>
                </div>
                {feedback.corrections?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-700">Correcciones específicas:</div>
                    {feedback.corrections.map((c, i) => (
                      <div key={i} className="bg-white border border-stone-200 p-3 rounded-xl text-xs space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{c.original}</span>
                          <ChevronRight className="w-3 h-3 text-stone-400" />
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{c.suggestion}</span>
                        </div>
                        <p className="text-stone-500 text-[11px]">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

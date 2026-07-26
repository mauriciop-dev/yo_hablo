import React, { useState, useMemo } from 'react';
import { BookOpen, Volume2, ChevronLeft, ChevronRight, Shuffle, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { LESSONS } from '../data/lessons';

interface VocabularyCardsProps {
  profile: UserProfile;
  speakText: (text: string) => void;
}

interface VocabItem {
  word: string;
  translation: string;
  example?: string;
  lessonTitle: string;
}

export default function VocabularyCards({ profile, speakText }: VocabularyCardsProps) {
  const [mode, setMode] = useState<'browse' | 'quiz'>('browse');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});
  const [quizDone, setQuizDone] = useState(false);

  const allVocab = useMemo(() => {
    const items: VocabItem[] = [];
    LESSONS.filter(l => l.language === profile.targetLanguage).forEach(l =>
      l.vocabulary.forEach(v => items.push({ ...v, lessonTitle: l.title })));
    return items;
  }, [profile.targetLanguage]);

  const cards = useMemo(() => {
    const c = [...allVocab];
    if (shuffled) {
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
    }
    return c;
  }, [allVocab, shuffled]);

  const current = cards[currentIdx];
  const score = Object.values(quizResults).filter(Boolean).length;

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx(i => i + 1);
      setFlipped(false);
      setQuizAnswer('');
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      setFlipped(false);
      setQuizAnswer('');
    }
  };

  const handleToggleShuffle = () => {
    setShuffled(!shuffled);
    setCurrentIdx(0);
    setFlipped(false);
  };

  const handleCheckAnswer = () => {
    if (!quizAnswer.trim()) return;
    const correct = quizAnswer.trim().toLowerCase() === current.word.toLowerCase();
    setQuizResults(prev => ({ ...prev, [currentIdx]: correct }));
    setQuizAnswer('');
    if (currentIdx >= cards.length - 1) {
      setQuizDone(true);
    } else {
      handleNext();
    }
  };

  const resetQuiz = () => {
    setQuizResults({});
    setQuizDone(false);
    setCurrentIdx(0);
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="pb-6 border-b border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-800">Vocabulario</h2>
          <p className="text-xs text-stone-500 mt-0.5">{cards.length} palabras · {profile.targetLanguage}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleToggleShuffle}
            className={`p-2 rounded-xl border text-xs transition-all ${shuffled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={() => { setMode(mode === 'browse' ? 'quiz' : 'browse'); resetQuiz(); }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              mode === 'quiz' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}>
            {mode === 'browse' ? 'Practicar' : 'Explorar'}
          </button>
        </div>
      </div>

      {cards.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400">
          <BookOpen className="w-10 h-10 mb-3 text-stone-300" />
          <p className="text-sm">No hay vocabulario disponible para {profile.targetLanguage} aún.</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="mt-6 flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-full max-w-md" onClick={handleFlip}>
            <div className={`relative cursor-pointer rounded-2xl p-8 min-h-[200px] flex flex-col items-center justify-center text-center transition-all duration-500 border-2 ${
              quizResults[currentIdx] === true
                ? 'bg-emerald-50 border-emerald-400 shadow-emerald-100'
                : quizResults[currentIdx] === false
                ? 'bg-rose-50 border-rose-400 shadow-rose-100'
                : flipped
                ? 'bg-stone-50 border-emerald-300 shadow-md'
                : 'bg-white border-stone-200 shadow-sm hover:shadow-md'
            }`}>
              <div className="animate-fade-in">
                {!flipped ? (
                  <>
                    <p className="text-3xl font-bold text-stone-900">{current.word}</p>
                    <p className="text-xs text-stone-400 mt-2">Toca para ver traducción</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-700">{current.translation}</p>
                    {current.example && (
                      <p className="text-sm text-stone-600 mt-3 italic">"{current.example}"</p>
                    )}
                    <p className="text-[10px] text-stone-400 mt-2">{current.lessonTitle}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={handlePrev} disabled={currentIdx === 0}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs text-stone-500 font-medium">{currentIdx + 1} / {cards.length}</span>

            <button onClick={() => speakText(current.word)}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
              <Volume2 className="w-5 h-5" />
            </button>

            <button onClick={handleNext} disabled={currentIdx >= cards.length - 1}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {mode === 'quiz' && !quizDone && (
            <div className="w-full max-w-md flex items-center space-x-2">
              <input type="text" value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                placeholder={`Escribe "${current.word}" en ${profile.targetLanguage}...`}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={handleCheckAnswer} disabled={!quizAnswer.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-all">
                Verificar
              </button>
            </div>
          )}

          {quizDone && (
            <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-stone-800">¡Práctica completada!</h3>
              <p className="text-sm text-stone-600">Acertaste <strong className="text-emerald-700">{score}</strong> de <strong>{cards.length}</strong> palabras ({Math.round(score / cards.length * 100)}%)</p>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${score / cards.length * 100}%` }}></div>
              </div>
              <button onClick={resetQuiz}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all">
                Practicar de nuevo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

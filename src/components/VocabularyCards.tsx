import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Volume2, ChevronLeft, ChevronRight, CheckCircle, Clock, Award, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { LESSONS } from '../data/lessons';
import { SrsCard, getInitialSrsCards, reviewCard } from '../lib/srs';

interface VocabularyCardsProps {
  profile: UserProfile;
  speakText: (text: string) => void;
}

export default function VocabularyCards({ profile, speakText }: VocabularyCardsProps) {
  const [mode, setMode] = useState<'study' | 'browse'>('study');
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const storageKey = `yo-hablo-srs-${profile.id}-${profile.targetLanguage}`;

  const allVocab = useMemo(() => {
    const items: { word: string; translation: string; example?: string; lessonTitle: string }[] = [];
    LESSONS.filter(l => l.language === profile.targetLanguage).forEach(l =>
      l.vocabulary.forEach(v => items.push({ ...v, lessonTitle: l.title })));
    return items;
  }, [profile.targetLanguage]);

  const [cards, setCards] = useState<SrsCard[]>(() => getInitialSrsCards(allVocab, storageKey));

  useEffect(() => {
    const loaded = getInitialSrsCards(allVocab, storageKey);
    setCards(loaded);
    setCurrentIndex(0);
    setFlipped(false);
  }, [profile.targetLanguage, profile.id]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cards));
  }, [cards, storageKey]);

  // Filter cards due today or new
  const dueCards = useMemo(() => {
    const now = Date.now();
    return cards.filter(c => c.dueDate <= now);
  }, [cards]);

  const activeDeck = mode === 'study' ? (dueCards.length > 0 ? dueCards : cards) : cards;
  const currentCard = activeDeck[currentIndex];

  const handleReview = (rating: 'again' | 'good' | 'easy') => {
    if (!currentCard) return;
    const updated = reviewCard(currentCard, rating);
    setCards(prev => prev.map(c => c.id === currentCard.id ? updated : c));
    setFlipped(false);
    if (currentIndex >= activeDeck.length - 1) {
      setCurrentIndex(0);
    }
  };

  const masteredCount = cards.filter(c => c.repetition >= 3).length;

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="pb-6 border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-stone-800">Flashcards SRS (Repetición Espaciada)</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">Anki Pro</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {dueCards.length} tarjetas pendientes de repaso hoy · {profile.targetLanguage}
          </p>
          <div className="flex items-center space-x-4 mt-3 text-xs">
            <span className="flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5" /><span>Pendientes: {dueCards.length}</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Award className="w-3.5 h-3.5" /><span>Dominadas: {masteredCount}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setMode(m => m === 'study' ? 'browse' : 'study'); setCurrentIndex(0); setFlipped(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              mode === 'study' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}>
            {mode === 'study' ? 'Modo Repaso (SRS)' : 'Todas las Palabras'}
          </button>
        </div>
      </div>

      {cards.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400">
          <BookOpen className="w-10 h-10 mb-3 text-stone-300" />
          <p className="text-sm">No hay vocabulario disponible para {profile.targetLanguage} aún.</p>
        </div>
      )}

      {cards.length > 0 && activeDeck.length === 0 && mode === 'study' && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-800">¡Al día con tus repasos!</h3>
          <p className="text-xs text-stone-500 max-w-sm">
            Has completado todas tus tarjetas pendientes por hoy. Puedes cambiar a "Todas las palabras" si deseas seguir practicando.
          </p>
          <button onClick={() => setMode('browse')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all">
            Ver todas las palabras
          </button>
        </div>
      )}

      {activeDeck.length > 0 && currentCard && (
        <div className="mt-6 flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-full max-w-md cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <div className={`relative rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center transition-all duration-300 border-2 shadow-sm hover:shadow-md ${
              flipped ? 'bg-stone-50 border-emerald-300' : 'bg-white border-stone-200'
            }`}>
              <div className="absolute top-3 left-4 text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                {mode === 'study' ? 'Repaso SRS' : 'Exploración'} • {currentIndex + 1} / {activeDeck.length}
              </div>

              <div className="absolute top-3 right-4">
                <button
                  onClick={(e) => { e.stopPropagation(); speakText(currentCard.word); }}
                  className="p-2 rounded-xl text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 animate-fade-in">
                {!flipped ? (
                  <>
                    <p className="text-3xl font-bold text-stone-900">{currentCard.word}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center justify-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" /><span>Toca la tarjeta para voltear</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-700">{currentCard.translation}</p>
                    {currentCard.example && (
                      <p className="text-sm text-stone-600 mt-3 italic">"{currentCard.example}"</p>
                    )}
                    <p className="text-[10px] text-stone-400 mt-3">{currentCard.lessonTitle}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {flipped && mode === 'study' ? (
            <div className="w-full max-w-md grid grid-cols-3 gap-3">
              <button
                onClick={() => handleReview('again')}
                className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold transition-all">
                Difícil / Repetir
                <span className="block text-[10px] opacity-75 font-normal mt-0.5">1 día</span>
              </button>
              <button
                onClick={() => handleReview('good')}
                className="py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-all">
                Bien
                <span className="block text-[10px] opacity-75 font-normal mt-0.5">{Math.max(1, Math.round(currentCard.interval * (currentCard.easeFactor || 2.5)))} días</span>
              </button>
              <button
                onClick={() => handleReview('easy')}
                className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-all">
                Fácil
                <span className="block text-[10px] opacity-75 font-normal mt-0.5">{Math.max(4, Math.round(currentCard.interval * (currentCard.easeFactor || 2.5) * 1.3))} days</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs text-stone-500 font-medium">Tarjeta {currentIndex + 1} de {activeDeck.length}</span>

              <button
                onClick={() => { setCurrentIndex(i => Math.min(activeDeck.length - 1, i + 1)); setFlipped(false); }}
                disabled={currentIndex >= activeDeck.length - 1}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

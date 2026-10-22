export interface SrsCard {
  id: string;
  word: string;
  translation: string;
  example?: string;
  lessonTitle: string;
  interval: number; // in days
  easeFactor: number;
  repetition: number;
  dueDate: number; // timestamp
}

export function getInitialSrsCards(
  allVocab: { word: string; translation: string; example?: string; lessonTitle: string }[],
  storageKey: string
): SrsCard[] {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed: SrsCard[] = JSON.parse(saved);
      const existingWords = new Set(parsed.map(c => c.word));
      const newCards = allVocab
        .filter(v => !existingWords.has(v.word))
        .map((v, idx) => ({
          id: `${v.word}-${idx}-${Date.now()}`,
          ...v,
          interval: 0,
          easeFactor: 2.5,
          repetition: 0,
          dueDate: Date.now(),
        }));
      return [...parsed, ...newCards];
    } catch (e) {
      console.warn('Failed to parse SRS cards', e);
    }
  }

  return allVocab.map((v, idx) => ({
    id: `${v.word}-${idx}-${Date.now()}`,
    ...v,
    interval: 0,
    easeFactor: 2.5,
    repetition: 0,
    dueDate: Date.now(),
  }));
}

export function reviewCard(card: SrsCard, rating: 'again' | 'good' | 'easy'): SrsCard {
  let { interval, easeFactor, repetition } = card;

  if (rating === 'again') {
    repetition = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 'good') {
    repetition += 1;
    interval = repetition === 1 ? 1 : Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor);
  } else if (rating === 'easy') {
    repetition += 1;
    interval = repetition === 1 ? 4 : Math.round(interval * easeFactor * 1.3);
    easeFactor = easeFactor + 0.15;
  }

  const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { ...card, interval, easeFactor, repetition, dueDate };
}

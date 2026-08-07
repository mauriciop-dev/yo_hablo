export type SkillName = 'speaking' | 'listening' | 'reading' | 'writing';

export type Goal = {
  objective: 'conversational' | 'travel' | 'work' | 'exam' | 'general';
  timeframeMonths: number;
  languages: string[];
};

export type SkillWeights = Record<SkillName, number>;

export type GeneratedPlan = {
  objectiveLabel: string;
  timeframeMonths: number;
  languages: string[];
  weights: SkillWeights;
  weeklyLessons: number;
  frequencyLabel: string;
  recommendations: string[];
};

export const OBJECTIVE_LABELS: Record<Goal['objective'], string> = {
  conversational: 'Conversación fluida',
  travel: 'Viajar',
  work: 'Trabajo / negocios',
  exam: 'Aprobar un examen',
  general: 'General',
};

export const OBJECTIVE_DESCRIPTIONS: Record<Goal['objective'], string> = {
  conversational: 'Quiero hablar con confianza en situaciones cotidianas.',
  travel: 'Quiero desenvolverme al viajar: pedir, preguntar y conversar.',
  work: 'Necesito el idioma para mi trabajo o para crecer profesionalmente.',
  exam: 'Quiero certificarme (ej. Goethe, Cambridge) con un plan claro.',
  general: 'Quiero aprender el idioma de forma equilibrada y completa.',
};

export const TIMEFRAMES = [3, 6, 12];

export const BASE_WEIGHTS: Record<Goal['objective'], SkillWeights> = {
  conversational: { speaking: 45, listening: 25, reading: 15, writing: 15 },
  travel: { speaking: 40, listening: 30, reading: 15, writing: 15 },
  work: { speaking: 30, listening: 25, reading: 25, writing: 20 },
  exam: { speaking: 20, listening: 20, reading: 30, writing: 30 },
  general: { speaking: 30, listening: 25, reading: 25, writing: 20 },
};

export function generatePlan(goal: Goal): GeneratedPlan {
  const weights = { ...BASE_WEIGHTS[goal.objective] };
  if (goal.timeframeMonths <= 3) {
    weights.speaking += 10;
    weights.listening += 5;
    weights.reading -= 7;
    weights.writing -= 8;
  } else if (goal.timeframeMonths >= 12) {
    weights.speaking -= 5;
    weights.reading += 5;
    weights.writing += 5;
  }

  const weeklyLessons = Math.min(2 + Math.ceil(12 / goal.timeframeMonths), 7);
  const frequencyLabel =
    weeklyLessons >= 5
      ? 'Casi todos los días'
      : weeklyLessons >= 3
        ? '3–4 veces por semana'
        : '2 veces por semana';

  const recommendations: string[] = [];
  if (weights.speaking >= 40) {
    recommendations.push('Prioriza conversación real: empieza cada sesión con 10 min de speaking en el tutor Aura.');
  }
  if (weights.listening >= 25) {
    recommendations.push('Escucha la lectura y el vocabulario en voz alta cada día para entrenar el oído.');
  }
  if (weights.reading >= 25) {
    recommendations.push('Haz una lectura semanal en la pestaña Lectura para ampliar vocabulario en contexto.');
  }
  if (weights.writing >= 25) {
    recommendations.push('Escribe 2 frases por día y deja que Aura corrija tus errores en la pestaña Escritura.');
  }
  recommendations.push(
    `Objetivo: nivel ${goal.timeframeMonths >= 12 ? 'B1' : goal.timeframeMonths >= 6 ? 'A2–B1' : 'A1–A2'} conversacional en ${goal.timeframeMonths} meses.`
  );
  recommendations.push('Repasa las lecciones marcadas del plan semanalmente y registra tu racha.');

  return {
    objectiveLabel: OBJECTIVE_LABELS[goal.objective],
    timeframeMonths: goal.timeframeMonths,
    languages: goal.languages,
    weights,
    weeklyLessons,
    frequencyLabel,
    recommendations,
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: { type: string; count: number; skill?: string };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', title: 'Primeros Pasos', description: 'Completa tu primera lección', icon: '🌱', requirement: { type: 'lessons_completed', count: 1 } },
  { id: 'dedicated', title: 'Dedicado', description: 'Completa 5 lecciones', icon: '📚', requirement: { type: 'lessons_completed', count: 5 } },
  { id: 'scholar', title: 'Erudito', description: 'Completa 15 lecciones', icon: '🎓', requirement: { type: 'lessons_completed', count: 15 } },
  { id: 'streak-3', title: 'Constante', description: 'Mantén una racha de 3 días', icon: '🔥', requirement: { type: 'streak', count: 3 } },
  { id: 'streak-7', title: 'Imparable', description: 'Mantén una racha de 7 días', icon: '💪', requirement: { type: 'streak', count: 7 } },
  { id: 'speaker', title: 'Conversador', description: 'Completa 10 ejercicios de speaking', icon: '🗣️', requirement: { type: 'skill_exercises', count: 10, skill: 'speaking' } },
  { id: 'writer', title: 'Escritor', description: 'Completa 10 ejercicios de writing', icon: '✍️', requirement: { type: 'skill_exercises', count: 10, skill: 'writing' } },
  { id: 'reader', title: 'Lector', description: 'Completa 10 ejercicios de reading', icon: '📖', requirement: { type: 'skill_exercises', count: 10, skill: 'reading' } },
  { id: 'listener', title: 'Oyente', description: 'Completa 10 ejercicios de listening', icon: '👂', requirement: { type: 'skill_exercises', count: 10, skill: 'listening' } },
  { id: 'perfect-score', title: 'Perfecto', description: 'Obtén 100% en cualquier lección', icon: '⭐', requirement: { type: 'perfect_lesson', count: 1 } },
  { id: 'level-up-a2', title: 'Ascenso A2', description: 'Alcanza el nivel A2 en cualquier idioma', icon: '⬆️', requirement: { type: 'level_reach', count: 1 } },
];

export type SkillName = 'speaking' | 'listening' | 'reading' | 'writing';
export type LevelName = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ProgressState = {
  completedLessons: string[];
  passedTests: string[];
  skillScores: Record<SkillName, number>;
  completedLevels: Record<SkillName, string[]>;
};

export const LEVEL_ORDER: LevelName[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function getSkillFromLessonId(id: string): SkillName | null {
  const parts = id.split('-');
  const token = parts[2]?.toLowerCase();
  if (!token) return null;

  if (token.startsWith('s')) return 'speaking';
  if (token.startsWith('l')) return 'listening';
  if (token.startsWith('r')) return 'reading';
  if (token.startsWith('w')) return 'writing';

  return null;
}

export function calculateSkillProgress(progress: ProgressState, skill: SkillName): number {
  const lessonCount = progress.completedLessons.filter((lessonId) => getSkillFromLessonId(lessonId) === skill).length;
  const practiceScore = progress.skillScores[skill] ?? 0;
  const lessonPct = Math.min(100, Math.round((lessonCount / 6) * 100));
  const blended = Math.round((lessonPct * 0.7) + (practiceScore * 0.3));
  return Math.max(0, Math.min(100, blended));
}

export function calculateOverallProgress(progress: ProgressState): number {
  const skills: SkillName[] = ['speaking', 'listening', 'reading', 'writing'];
  const values = skills.map((skill) => calculateSkillProgress(progress, skill));
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function evaluateAchievements(progress: ProgressState): string[] {
  const unlocked: string[] = [];
  const lessonCount = progress.completedLessons.length;
  const skillCounts: Record<SkillName, number> = {
    speaking: progress.completedLessons.filter((id) => getSkillFromLessonId(id) === 'speaking').length,
    listening: progress.completedLessons.filter((id) => getSkillFromLessonId(id) === 'listening').length,
    reading: progress.completedLessons.filter((id) => getSkillFromLessonId(id) === 'reading').length,
    writing: progress.completedLessons.filter((id) => getSkillFromLessonId(id) === 'writing').length,
  };

  if (lessonCount >= 1) unlocked.push('first-steps');
  if (lessonCount >= 5) unlocked.push('dedicated');
  if (lessonCount >= 15) unlocked.push('scholar');

  if (progress.passedTests.length >= 1) unlocked.push('perfect-score');

  if (skillCounts.speaking >= 10) unlocked.push('speaker');
  if (skillCounts.listening >= 10) unlocked.push('listener');
  if (skillCounts.reading >= 10) unlocked.push('reader');
  if (skillCounts.writing >= 10) unlocked.push('writer');

  const reachedA2 = Object.values(progress.completedLevels).some((levels) => levels.includes('A2'));
  if (reachedA2) unlocked.push('level-up-a2');

  return [...new Set(unlocked)];
}

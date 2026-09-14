import { describe, expect, it } from 'vitest';
import {
  calculateOverallProgress,
  calculateSkillProgress,
  evaluateAchievements,
  type ProgressState,
} from './progress';

describe('progress engine', () => {
  it('calculates overall and skill progress from completed lessons and tests', () => {
    const progress: ProgressState = {
      completedLessons: [
        'de-a1-s1-l1',
        'de-a1-s1-l2',
        'de-a1-l1-l1',
        'de-a1-r1-l1',
      ],
      passedTests: ['de-a1-s1-test'],
      skillScores: {
        speaking: 80,
        listening: 60,
        reading: 50,
        writing: 30,
      },
      completedLevels: {
        speaking: ['A1'],
        listening: ['A1'],
        reading: ['A1'],
        writing: ['A1'],
      },
    };

    expect(calculateSkillProgress(progress, 'speaking')).toBeGreaterThan(0);
    expect(calculateSkillProgress(progress, 'reading')).toBeGreaterThan(0);
    expect(calculateOverallProgress(progress)).toBeGreaterThan(0);
    expect(calculateOverallProgress(progress)).toBeLessThanOrEqual(100);
  });

  it('unlocks achievements based on real progress thresholds', () => {
    const progress: ProgressState = {
      completedLessons: ['de-a1-s1-l1', 'de-a1-s1-l2', 'de-a1-l1-l1'],
      passedTests: [],
      skillScores: {
        speaking: 70,
        listening: 40,
        reading: 30,
        writing: 20,
      },
      completedLevels: {
        speaking: ['A1'],
        listening: [],
        reading: [],
        writing: [],
      },
    };

    const unlocked = evaluateAchievements(progress);
    expect(unlocked).toContain('first-steps');
  });
});

import { describe, it, expect } from 'vitest';
import { getSkillTest, scoreSkillTest, inferLevel } from './skillTest';

describe('skillTest', () => {
  it('generates 8 questions with 2 per skill for English', () => {
    const qs = getSkillTest('English');
    expect(qs).toHaveLength(8);
    for (const skill of ['speaking', 'listening', 'reading', 'writing']) {
      expect(qs.filter(q => q.skill === skill)).toHaveLength(2);
    }
  });

  it('generates German test with different options', () => {
    const qs = getSkillTest('German');
    expect(qs).toHaveLength(8);
    expect(qs.some(q => q.options.includes('"Hallo"'))).toBe(true);
  });

  it('scores perfect answers at 100', () => {
    const qs = getSkillTest('English');
    const answers = qs.map(q => q.correctIndex);
    const scores = scoreSkillTest(qs, answers);
    expect(scores.speaking).toBe(100);
    expect(scores.listening).toBe(100);
  });

  it('infers level by average', () => {
    const qs = getSkillTest('English');
    const allWrong = qs.map(() => 0);
    const none = scoreSkillTest(qs, allWrong);
    expect(inferLevel(none)).toBe('A1');

    const half = qs.map((q, i) => (i % 2 === 0 ? q.correctIndex : 0));
    const mid = scoreSkillTest(qs, half);
    expect(['A2', 'B1']).toContain(inferLevel(mid));
  });
});

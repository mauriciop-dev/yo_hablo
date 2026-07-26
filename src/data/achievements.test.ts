import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from './achievements';

describe('achievements data integrity', () => {
  it('has at least 5 achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(5);
  });

  it('each achievement has required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.requirement).toBeTruthy();
      expect(typeof a.requirement.count).toBe('number');
      expect(a.requirement.count).toBeGreaterThan(0);
    }
  });

  it('achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skill-based achievements have a valid skill', () => {
    const validSkills = new Set(['speaking', 'listening', 'reading', 'writing']);
    for (const a of ACHIEVEMENTS) {
      if (a.requirement.skill) {
        expect(validSkills.has(a.requirement.skill)).toBe(true);
      }
    }
  });

  it('requirement types are valid', () => {
    const valid = new Set(['lessons_completed', 'streak', 'skill_exercises', 'perfect_lesson', 'level_reach']);
    for (const a of ACHIEVEMENTS) {
      expect(valid.has(a.requirement.type)).toBe(true);
    }
  });
});

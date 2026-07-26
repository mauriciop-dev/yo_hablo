import { describe, it, expect } from 'vitest';
import { LESSONS } from './lessons';

describe('lesson data integrity', () => {
  it('has at least one lesson per supported language', () => {
    const languages = new Set(LESSONS.map(l => l.language));
    expect(languages.has('German')).toBe(true);
    expect(languages.has('English')).toBe(true);
  });

  it('each lesson has required fields', () => {
    for (const lesson of LESSONS) {
      expect(lesson.id).toBeTruthy();
      expect(lesson.title).toBeTruthy();
      expect(lesson.description).toBeTruthy();
      expect(lesson.language).toBeTruthy();
      expect(lesson.level).toMatch(/^A[12]|B1$/);
      expect(lesson.lessonNumber).toBeGreaterThan(0);
      expect(Array.isArray(lesson.exercises)).toBe(true);
      expect(Array.isArray(lesson.vocabulary)).toBe(true);
    }
  });

  it('all exercise types are valid', () => {
    const valid = new Set(['voice', 'text', 'multiple_choice', 'fill_blank', 'translation', 'listening', 'speaking', 'reading', 'writing']);
    for (const lesson of LESSONS) {
      for (const ex of lesson.exercises) {
        expect(valid.has(ex.type)).toBe(true);
        expect(ex.instructions).toBeTruthy();
        expect(ex.prompt).toBeTruthy();
        if (ex.type === 'multiple_choice') {
          expect(Array.isArray(ex.options)).toBe(true);
          expect(ex.options!.length).toBeGreaterThan(1);
          expect(ex.correctAnswer).toBeTruthy();
        }
      }
    }
  });

  it('vocabulary entries have word and translation', () => {
    for (const lesson of LESSONS) {
      for (const v of lesson.vocabulary) {
        expect(v.word).toBeTruthy();
        expect(v.translation).toBeTruthy();
      }
    }
  });

  it('lesson IDs are unique', () => {
    const ids = LESSONS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

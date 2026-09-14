import { describe, it, expect } from 'vitest';
import { LESSONS } from './lessons';

describe('lesson data integrity', () => {
  it('has at least one lesson per supported language', () => {
    const languages = new Set(LESSONS.map(l => l.language));
    expect(languages.has('German')).toBe(true);
    expect(languages.has('English')).toBe(true);
    expect(languages.has('French')).toBe(true);
  });

  it('contains five levels per skill and a final test lesson', () => {
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'];
    for (const language of ['German', 'English', 'French']) {
      for (const skill of ['speaking', 'listening', 'reading', 'writing']) {
        const entries = LESSONS.filter(l => l.language === language && l.skill === skill);
        expect(entries.length).toBeGreaterThanOrEqual(30);
        for (const level of levelOrder) {
          const levelEntries = entries.filter(l => l.level === level);
          expect(levelEntries.length).toBeGreaterThanOrEqual(5);
          expect(levelEntries.some(l => l.lessonNumber === 6)).toBe(true);
        }
      }
    }
  });

  it('each lesson has required fields', () => {
    for (const lesson of LESSONS) {
      expect(lesson.id).toBeTruthy();
      expect(lesson.title).toBeTruthy();
      expect(lesson.description).toBeTruthy();
      expect(lesson.language).toBeTruthy();
      expect(lesson.level).toMatch(/^(A1|A2|B1|B2|C1|C2)$/);
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

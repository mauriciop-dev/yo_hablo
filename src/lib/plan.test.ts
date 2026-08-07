import { describe, it, expect } from 'vitest';
import { generatePlan, BASE_WEIGHTS, OBJECTIVE_LABELS } from './plan';

describe('generatePlan', () => {
  it('weights sum to 100 for conversational objective', () => {
    const plan = generatePlan({ objective: 'conversational', timeframeMonths: 6, languages: ['English'] });
    const total = Object.values(plan.weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    expect(plan.weights.speaking).toBeGreaterThan(plan.weights.writing);
  });

  it('short timeline boosts speaking weight', () => {
    const three = generatePlan({ objective: 'conversational', timeframeMonths: 3, languages: ['English'] });
    const twelve = generatePlan({ objective: 'conversational', timeframeMonths: 12, languages: ['English'] });
    expect(three.weights.speaking).toBeGreaterThan(twelve.weights.speaking);
  });

  it('exam objective favors reading and writing', () => {
    const plan = generatePlan({ objective: 'exam', timeframeMonths: 12, languages: ['German'] });
    expect(plan.weights.reading + plan.weights.writing).toBeGreaterThan(plan.weights.speaking + plan.weights.listening);
  });

  it('includes recommendations and frequency label', () => {
    const plan = generatePlan({ objective: 'travel', timeframeMonths: 6, languages: ['German'] });
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.frequencyLabel).toBeTruthy();
    expect(OBJECTIVE_LABELS.travel).toBe('Viajar');
  });

  it('weekly lessons scales with timeframe', () => {
    const three = generatePlan({ objective: 'general', timeframeMonths: 3, languages: ['English'] });
    const twelve = generatePlan({ objective: 'general', timeframeMonths: 12, languages: ['English'] });
    expect(three.weeklyLessons).toBeGreaterThanOrEqual(twelve.weeklyLessons);
    expect(three.weeklyLessons).toBeLessThanOrEqual(7);
  });
});

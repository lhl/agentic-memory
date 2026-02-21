import { describe, expect, it } from 'vitest';
import { estimateTokens, fitWithinBudget } from './token-counter.js';

describe('token-counter', () => {
  it('estimates tokens as chars divided by four', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('1234567890')).toBe(3);
  });

  it('fits items greedily by priority while respecting budget', () => {
    const items = [
      { source: 'red', priority: 1, text: 'x'.repeat(40) }, // 10 tokens
      { source: 'daily', priority: 2, text: 'x'.repeat(20) }, // 5 tokens
      { source: 'search-too-big', priority: 3, text: 'x'.repeat(120) }, // 30 tokens
      { source: 'yellow', priority: 4, text: 'x'.repeat(16) }, // 4 tokens
      { source: 'green', priority: 5, text: 'x'.repeat(20) } // 5 tokens
    ];

    const fitted = fitWithinBudget(items, 20);
    expect(fitted.map((item) => item.source)).toEqual(['red', 'daily', 'yellow']);
  });

  it('returns empty when budget is not positive', () => {
    const items = [{ source: 'any', priority: 1, text: 'hello' }];
    expect(fitWithinBudget(items, 0)).toEqual([]);
    expect(fitWithinBudget(items, -10)).toEqual([]);
  });
});

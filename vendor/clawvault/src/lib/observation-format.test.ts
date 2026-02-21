import { describe, expect, it } from 'vitest';
import {
  normalizeObservationContent,
  parseObservationLine,
  parseObservationMarkdown,
  renderScoredObservationLine,
  toImportanceBucket
} from './observation-format.js';

describe('observation-format', () => {
  it('parses scored observation lines', () => {
    const parsed = parseObservationLine(
      '- [decision|c=0.95|i=0.90] 14:00 Use ledger-first architecture',
      '2026-02-14'
    );

    expect(parsed).toEqual({
      date: '2026-02-14',
      type: 'decision',
      confidence: 0.95,
      importance: 0.9,
      content: '14:00 Use ledger-first architecture',
      format: 'scored',
      rawLine: '- [decision|c=0.95|i=0.90] 14:00 Use ledger-first architecture'
    });
  });

  it('parses legacy emoji lines for backward compatibility', () => {
    const parsed = parseObservationLine('🔴 10:00 Decided to ship v2.2.0', '2026-02-14');
    expect(parsed?.format).toBe('emoji');
    expect(parsed?.importance).toBe(0.9);
    expect(parsed?.priority).toBe('🔴');
    expect(parsed?.type).toBe('decision');
  });

  it('parses mixed markdown sections', () => {
    const markdown = [
      '## 2026-02-14',
      '',
      '- [project|c=0.80|i=0.55] Deployed docs',
      '🟡 10:20 User prefers concise updates'
    ].join('\n');

    const parsed = parseObservationMarkdown(markdown);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.type).toBe('project');
    expect(parsed[1]?.format).toBe('emoji');
  });

  it('renders scored observation line and normalizes content', () => {
    const rendered = renderScoredObservationLine({
      type: 'fact',
      confidence: 0.7,
      importance: 0.2,
      content: ' 09:00   Keep deployment logs '
    });
    expect(rendered).toBe('- [fact|c=0.70|i=0.20] 09:00   Keep deployment logs');
    expect(normalizeObservationContent('09:00   Keep deployment logs')).toBe('keep deployment logs');
    expect(toImportanceBucket(0.85)).toBe('structural');
    expect(toImportanceBucket(0.5)).toBe('potential');
    expect(toImportanceBucket(0.1)).toBe('contextual');
  });
});

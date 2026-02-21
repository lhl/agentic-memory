import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTemplateVariables, renderTemplate } from './template-engine.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('template engine', () => {
  it('interpolates variables in frontmatter and body', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T10:11:12Z'));

    const vars = buildTemplateVariables({ title: 'Alpha', type: 'decision' });
    const template = `---
title: "{{title}}"
date: {{date}}
type: {{type}}
---
# {{title}}
{{datetime}}
`;

    const output = renderTemplate(template, vars);
    expect(output).toContain('title: "Alpha"');
    expect(output).toContain('date: 2026-02-03');
    expect(output).toContain('type: decision');
    expect(output).toContain('2026-02-03T10:11:12.000Z');
  });

  it('leaves unknown tokens untouched', () => {
    const vars = buildTemplateVariables({ title: 'Alpha', type: 'note' }, new Date('2026-02-03T00:00:00Z'));
    const output = renderTemplate('Hello {{unknown}}', vars);
    expect(output).toBe('Hello {{unknown}}');
  });
});

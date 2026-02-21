import { describe, expect, it } from 'vitest';
import {
  inferContextProfile,
  normalizeContextProfileInput,
  resolveContextProfile
} from './context-profile.js';

describe('context profile inference', () => {
  it('infers incident intent for outage prompts', () => {
    expect(inferContextProfile('URGENT outage in prod, rollback now')).toBe('incident');
  });

  it('infers handoff intent for resume prompts', () => {
    expect(inferContextProfile('continue from last session handoff')).toBe('handoff');
  });

  it('infers planning intent for migration prompts', () => {
    expect(inferContextProfile('Plan database migration approach')).toBe('planning');
  });

  it('falls back to default intent when no signal matches', () => {
    expect(inferContextProfile('summarize open pull requests')).toBe('default');
  });
});

describe('context profile normalization', () => {
  it('normalizes unknown values to default', () => {
    expect(normalizeContextProfileInput(undefined)).toBe('default');
    expect(normalizeContextProfileInput('unknown')).toBe('default');
  });

  it('resolves auto profile using task inference', () => {
    expect(resolveContextProfile('auto', 'hotfix outage now')).toBe('incident');
  });

  it('keeps explicit profiles without re-inference', () => {
    expect(resolveContextProfile('handoff', 'urgent incident')).toBe('handoff');
  });
});

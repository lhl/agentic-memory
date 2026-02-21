export type ResolvedContextProfile = 'default' | 'planning' | 'incident' | 'handoff';
export type ContextProfileInput = ResolvedContextProfile | 'auto';

const INCIDENT_PROMPT_RE = /\b(outage|incident|sev[1-4]|p[0-3]|broken|failure|urgent|rollback|hotfix|degraded)\b/i;
const PLANNING_PROMPT_RE = /\b(plan|planning|design|architecture|roadmap|proposal|spec|migrate|migration|approach)\b/i;
const HANDOFF_PROMPT_RE = /\b(resume|continue|handoff|pick up|where (did|was) i|last session)\b/i;

export function inferContextProfile(task: string): ResolvedContextProfile {
  const normalizedTask = task.trim();
  if (!normalizedTask) {
    return 'default';
  }
  if (INCIDENT_PROMPT_RE.test(normalizedTask)) return 'incident';
  if (HANDOFF_PROMPT_RE.test(normalizedTask)) return 'handoff';
  if (PLANNING_PROMPT_RE.test(normalizedTask)) return 'planning';
  return 'default';
}

export function normalizeContextProfileInput(profile: string | undefined): ContextProfileInput {
  if (profile === 'planning' || profile === 'incident' || profile === 'handoff' || profile === 'auto') {
    return profile;
  }
  return 'default';
}

export function resolveContextProfile(profile: ContextProfileInput | undefined, task: string): ResolvedContextProfile {
  const normalized = normalizeContextProfileInput(profile);
  if (normalized === 'auto') {
    return inferContextProfile(task);
  }
  return normalized;
}

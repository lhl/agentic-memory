import type { NormalizedReplayMessage } from '../types.js';

function normalizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return normalizeText(record.text);
  if (typeof record.content === 'string') return normalizeText(record.content);
  return '';
}

function toTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const millis = value < 10_000_000_000 ? Math.floor(value * 1000) : Math.floor(value);
    const parsed = new Date(millis);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

function normalizeRecord(record: Record<string, unknown>): NormalizedReplayMessage | null {
  const text = normalizeText(record.content ?? record.text ?? record.message);
  if (!text) return null;
  const role = typeof record.role === 'string'
    ? record.role.trim().toLowerCase()
    : typeof record.type === 'string'
      ? record.type.trim().toLowerCase()
      : '';
  return {
    source: 'opencode',
    conversationId: typeof record.conversationId === 'string' ? record.conversationId : undefined,
    role: role || undefined,
    text,
    timestamp: toTimestamp(record.timestamp ?? record.createdAt ?? record.created_at ?? record.time)
  };
}

export function normalizeOpenCodeExport(input: unknown): NormalizedReplayMessage[] {
  if (typeof input === 'string') {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return normalizeRecord(JSON.parse(line) as Record<string, unknown>);
        } catch {
          return null;
        }
      })
      .filter((value): value is NormalizedReplayMessage => value !== null);
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => (item && typeof item === 'object')
        ? normalizeRecord(item as Record<string, unknown>)
        : null)
      .filter((value): value is NormalizedReplayMessage => value !== null);
  }

  if (input && typeof input === 'object') {
    const root = input as Record<string, unknown>;
    if (Array.isArray(root.messages)) {
      return normalizeOpenCodeExport(root.messages);
    }
  }

  return [];
}

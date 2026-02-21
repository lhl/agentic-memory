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

function normalizeOpenClawRecord(record: Record<string, unknown>): NormalizedReplayMessage | null {
  let role = '';
  let text = '';
  if (typeof record.role === 'string' && 'content' in record) {
    role = record.role.trim().toLowerCase();
    text = normalizeText(record.content);
  } else if (record.type === 'message' && record.message && typeof record.message === 'object') {
    const message = record.message as Record<string, unknown>;
    role = typeof message.role === 'string' ? message.role.trim().toLowerCase() : '';
    text = normalizeText(message.content);
  }

  if (!text) {
    return null;
  }

  return {
    source: 'openclaw',
    role: role || undefined,
    text,
    timestamp: toTimestamp(
      record.timestamp
      ?? record.createdAt
      ?? record.created_at
      ?? (record.message && typeof record.message === 'object'
        ? (record.message as Record<string, unknown>).timestamp
        : undefined)
    )
  };
}

export function normalizeOpenClawTranscript(input: string): NormalizedReplayMessage[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return normalizeOpenClawRecord(JSON.parse(line) as Record<string, unknown>);
      } catch {
        return null;
      }
    })
    .filter((entry): entry is NormalizedReplayMessage => entry !== null);
}

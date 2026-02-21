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

function extractTimestamp(record: Record<string, unknown>): string | undefined {
  const candidates = [record.timestamp, record.created_at, record.createdAt, record.time];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      const millis = candidate < 10_000_000_000 ? Math.floor(candidate * 1000) : Math.floor(candidate);
      const parsed = new Date(millis);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return undefined;
}

function pushMessage(
  destination: NormalizedReplayMessage[],
  conversationId: string | undefined,
  record: Record<string, unknown>
): void {
  const text = normalizeText(record.content ?? record.text);
  if (!text) {
    return;
  }
  const role = typeof record.role === 'string' ? record.role.trim().toLowerCase() : undefined;
  destination.push({
    source: 'claude',
    conversationId,
    role: role || undefined,
    text,
    timestamp: extractTimestamp(record)
  });
}

export function normalizeClaudeExport(input: unknown): NormalizedReplayMessage[] {
  const messages: NormalizedReplayMessage[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const conversationId = typeof record.id === 'string'
        ? record.id
        : typeof record.uuid === 'string'
          ? record.uuid
          : undefined;

      if (Array.isArray(record.messages)) {
        for (const message of record.messages) {
          if (!message || typeof message !== 'object') continue;
          pushMessage(messages, conversationId, message as Record<string, unknown>);
        }
        continue;
      }

      pushMessage(messages, conversationId, record);
    }
    return messages;
  }

  if (input && typeof input === 'object') {
    const root = input as Record<string, unknown>;
    if (Array.isArray(root.conversations)) {
      return normalizeClaudeExport(root.conversations);
    }
    if (Array.isArray(root.messages)) {
      return normalizeClaudeExport([{ id: root.id, messages: root.messages }]);
    }
  }

  return messages;
}

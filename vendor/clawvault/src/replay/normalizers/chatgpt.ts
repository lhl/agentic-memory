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
  if (Array.isArray(record.parts)) {
    return normalizeText(record.parts);
  }
  if (typeof record.text === 'string') {
    return normalizeText(record.text);
  }
  if (typeof record.content === 'string') {
    return normalizeText(record.content);
  }
  return '';
}

function asTimestamp(input: unknown): string | undefined {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    const millis = input < 10_000_000_000 ? Math.floor(input * 1000) : Math.floor(input);
    const parsed = new Date(millis);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (typeof input === 'string' && input.trim()) {
    const parsed = new Date(input.trim());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return undefined;
}

export function normalizeChatGptExport(input: unknown): NormalizedReplayMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const messages: NormalizedReplayMessage[] = [];
  for (const conversation of input) {
    if (!conversation || typeof conversation !== 'object') {
      continue;
    }

    const record = conversation as Record<string, unknown>;
    const conversationId = typeof record.id === 'string' ? record.id : undefined;
    const mapping = record.mapping;
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      continue;
    }

    const ordered = Object.values(mapping as Record<string, unknown>)
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => entry as Record<string, unknown>)
      .sort((left, right) => {
        const leftTime = Number(left.message && typeof left.message === 'object'
          ? (left.message as Record<string, unknown>).create_time
          : 0);
        const rightTime = Number(right.message && typeof right.message === 'object'
          ? (right.message as Record<string, unknown>).create_time
          : 0);
        return leftTime - rightTime;
      });

    for (const node of ordered) {
      const message = node.message;
      if (!message || typeof message !== 'object') {
        continue;
      }
      const messageRecord = message as Record<string, unknown>;
      const author = messageRecord.author;
      const role = author && typeof author === 'object'
        ? String((author as Record<string, unknown>).role ?? '').trim().toLowerCase()
        : '';
      const text = normalizeText(messageRecord.content);
      if (!text) {
        continue;
      }

      messages.push({
        source: 'chatgpt',
        conversationId,
        role: role || undefined,
        text,
        timestamp: asTimestamp(messageRecord.create_time)
      });
    }
  }

  return messages;
}

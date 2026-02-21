import * as fs from 'fs';
import * as path from 'path';

type SessionFormat = 'plain' | 'jsonl' | 'markdown';

const JSONL_SAMPLE_LIMIT = 20;
const MARKDOWN_SIGNAL_RE = /^(#{1,6}\s|[-*+]\s|>\s)/;
const MARKDOWN_INLINE_RE = /(\[[^\]]+\]\([^)]+\)|[*_`~])/;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractText(value: unknown): string {
  if (typeof value === 'string') {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const part of value) {
      const extracted = extractText(part);
      if (extracted) {
        parts.push(extracted);
      }
    }
    return normalizeText(parts.join(' '));
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') {
    return normalizeText(record.text);
  }
  if (typeof record.content === 'string') {
    return normalizeText(record.content);
  }

  return '';
}

function normalizeRole(role: unknown): string {
  if (typeof role !== 'string') {
    return '';
  }
  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return '';
  }
  return normalized;
}

function isLikelyJsonMessage(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if ('role' in record && 'content' in record) {
    return true;
  }

  if (record.type === 'message' && record.message && typeof record.message === 'object') {
    return true;
  }

  return false;
}

function parseJsonLine(line: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return '';
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '';
  }

  const entry = parsed as Record<string, unknown>;

  if ('role' in entry && 'content' in entry) {
    const role = normalizeRole(entry.role);
    const content = extractText(entry.content);
    if (!content) return '';
    return role ? `${role}: ${content}` : content;
  }

  if (entry.type === 'message' && entry.message && typeof entry.message === 'object') {
    const message = entry.message as Record<string, unknown>;
    const role = normalizeRole(message.role);
    const content = extractText(message.content);
    if (!content) return '';
    return role ? `${role}: ${content}` : content;
  }

  return '';
}

function parseJsonLines(raw: string): string[] {
  const messages: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseJsonLine(trimmed);
    if (parsed) {
      messages.push(parsed);
    }
  }
  return messages;
}

function stripMarkdownSyntax(text: string): string {
  return normalizeText(
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .replace(/<[^>]+>/g, '')
  );
}

function normalizeMarkdownLine(line: string): string {
  return stripMarkdownSyntax(
    line
      .replace(/^>\s*/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/^#{1,6}\s+/, '')
  );
}

function parseMarkdown(raw: string): string[] {
  const withoutCodeBlocks = raw.replace(/```[\s\S]*?```/g, ' ');
  const blocks = withoutCodeBlocks
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const messages: string[] = [];
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => normalizeMarkdownLine(line))
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const joined = stripMarkdownSyntax(lines.join(' '));
    if (!joined) continue;

    const roleMatch = /^(user|assistant|system|tool)\s*:?\s*(.+)$/i.exec(joined);
    if (roleMatch) {
      const role = normalizeRole(roleMatch[1]);
      const content = normalizeText(roleMatch[2]);
      if (content) {
        messages.push(`${role}: ${content}`);
      }
      continue;
    }

    messages.push(joined);
  }

  return messages;
}

function parsePlainText(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function detectSessionFormat(raw: string, filePath: string): SessionFormat {
  const nonEmptyLines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (nonEmptyLines.length === 0) {
    return 'plain';
  }

  const sample = nonEmptyLines.slice(0, JSONL_SAMPLE_LIMIT);
  const jsonHits = sample.filter((line) => {
    try {
      const parsed = JSON.parse(line) as unknown;
      return isLikelyJsonMessage(parsed);
    } catch {
      return false;
    }
  }).length;

  if (jsonHits >= Math.max(1, Math.ceil(sample.length * 0.6))) {
    return 'jsonl';
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') {
    return 'markdown';
  }

  const markdownSignals = sample.filter((line) => MARKDOWN_SIGNAL_RE.test(line) || MARKDOWN_INLINE_RE.test(line)).length;
  if (markdownSignals >= Math.max(2, Math.ceil(sample.length * 0.4))) {
    return 'markdown';
  }

  return 'plain';
}

export function parseSessionFile(filePath: string): string[] {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf-8');
  const format = detectSessionFormat(raw, resolved);

  if (format === 'jsonl') {
    const parsed = parseJsonLines(raw);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (format === 'markdown') {
    const parsed = parseMarkdown(raw);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return parsePlainText(raw);
}

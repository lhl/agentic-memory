import * as fs from 'fs';
import * as path from 'path';
import {
  getSessionFilePath,
  getSessionsDir,
  loadSessionsStore
} from '../lib/session-utils.js';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const READ_CHUNK_SIZE = 64 * 1024;
const MAX_TURN_TEXT_LENGTH = 420;
const MAX_TOTAL_TEXT_LENGTH = 12_000;

const SESSION_KEY_PATTERN = /^agent:[a-zA-Z0-9_-]+:[a-zA-Z0-9:_-]+$/;
const AGENT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

export type SessionRecapFormat = 'markdown' | 'json';
export type SessionRole = 'user' | 'assistant';

export interface SessionRecapOptions {
  limit?: number;
  format?: SessionRecapFormat;
  agentId?: string;
}

export interface SessionTurn {
  role: SessionRole;
  text: string;
}

export interface SessionRecapResult {
  sessionKey: string;
  sessionLabel: string;
  agentId: string;
  sessionId: string;
  transcriptPath: string;
  generated: string;
  count: number;
  messages: SessionTurn[];
  markdown: string;
}

interface SessionStoreEntry {
  sessionId?: unknown;
  sessionFile?: unknown;
}

function sanitizeSessionKey(input: string): string {
  const sessionKey = input.trim();
  if (!SESSION_KEY_PATTERN.test(sessionKey)) {
    throw new Error('Invalid session key. Expected format: agent:<agentId>:<scope>');
  }
  return sessionKey;
}

function sanitizeAgentId(input: string): string {
  const agentId = input.trim();
  if (!AGENT_ID_PATTERN.test(agentId)) {
    throw new Error('Invalid agent ID. Use letters, numbers, "_" or "-".');
  }
  return agentId;
}

function parseAgentIdFromSessionKey(sessionKey: string): string | null {
  const match = /^agent:([^:]+):/.exec(sessionKey);
  if (!match?.[1]) return null;
  return sanitizeAgentId(match[1]);
}

function resolveAgentId(sessionKey: string, explicitAgentId?: string): string {
  if (explicitAgentId) {
    return sanitizeAgentId(explicitAgentId);
  }

  const fromSessionKey = parseAgentIdFromSessionKey(sessionKey);
  if (fromSessionKey) return fromSessionKey;

  const fromEnv = process.env.OPENCLAW_AGENT_ID;
  if (fromEnv) return sanitizeAgentId(fromEnv);

  return 'clawdious';
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIMIT;
  const parsed = Math.floor(limit);
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function isPathInside(parentPath: string, candidatePath: string): boolean {
  const normalizedParent = parentPath.endsWith(path.sep)
    ? parentPath
    : `${parentPath}${path.sep}`;
  return candidatePath.startsWith(normalizedParent);
}

function resolveSafeTranscriptPath(agentId: string, sessionId: string, sessionFile?: unknown): string {
  const sessionsDir = getSessionsDir(agentId);
  if (!fs.existsSync(sessionsDir)) {
    throw new Error(`Sessions directory not found for agent "${agentId}".`);
  }

  const sessionsDirRealPath = fs.realpathSync(sessionsDir);
  const candidatePaths: string[] = [];

  if (typeof sessionFile === 'string' && sessionFile.trim()) {
    candidatePaths.push(path.resolve(sessionFile));
  }

  candidatePaths.push(getSessionFilePath(agentId, sessionId));

  for (const candidatePath of candidatePaths) {
    if (path.extname(candidatePath).toLowerCase() !== '.jsonl') continue;
    if (!fs.existsSync(candidatePath)) continue;

    let candidateRealPath = '';
    try {
      candidateRealPath = fs.realpathSync(candidatePath);
    } catch {
      continue;
    }

    if (!isPathInside(sessionsDirRealPath, candidateRealPath)) {
      continue;
    }

    const stat = fs.statSync(candidateRealPath);
    if (!stat.isFile()) continue;

    return candidateRealPath;
  }

  throw new Error(`No valid transcript found for session "${sessionId}".`);
}

function getSessionStoreEntry(agentId: string, sessionKey: string): SessionStoreEntry {
  const store = loadSessionsStore(agentId);
  if (!store) {
    throw new Error(`Could not load sessions store for agent "${agentId}".`);
  }

  const entry = store[sessionKey] as SessionStoreEntry | undefined;
  if (!entry) {
    throw new Error(`Session key not found: ${sessionKey}`);
  }

  if (typeof entry.sessionId !== 'string' || !entry.sessionId.trim()) {
    throw new Error(`Invalid session mapping for "${sessionKey}" (missing sessionId).`);
  }

  return entry;
}

function sanitizeText(input: string): string {
  return input
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    const cleaned = sanitizeText(content);
    return truncateText(cleaned, MAX_TURN_TEXT_LENGTH);
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === 'string') {
        const cleaned = sanitizeText(part);
        if (cleaned) parts.push(cleaned);
        continue;
      }

      if (!part || typeof part !== 'object') continue;
      const block = part as Record<string, unknown>;
      const blockType = typeof block.type === 'string' ? block.type.toLowerCase() : '';

      if (blockType.includes('tool') || blockType.includes('thinking') || blockType.includes('reason')) {
        continue;
      }

      const blockText = typeof block.text === 'string'
        ? block.text
        : typeof block.content === 'string' && blockType.includes('text')
          ? block.content
          : '';

      const cleaned = sanitizeText(blockText);
      if (cleaned) parts.push(cleaned);
    }

    return truncateText(parts.join(' '), MAX_TURN_TEXT_LENGTH);
  }

  return '';
}

function parseTurnFromLine(line: string): SessionTurn | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const entry = parsed as { type?: unknown; message?: unknown };
  if (entry.type !== 'message' || !entry.message || typeof entry.message !== 'object') {
    return null;
  }

  const message = entry.message as { role?: unknown; content?: unknown };
  const role = typeof message.role === 'string' ? message.role.toLowerCase() : '';
  if (role !== 'user' && role !== 'assistant') return null;

  const text = extractTextFromContent(message.content);
  if (!text) return null;

  return { role: role as SessionRole, text };
}

function applyOutputBudget(turns: SessionTurn[]): SessionTurn[] {
  let remaining = MAX_TOTAL_TEXT_LENGTH;
  const selected: SessionTurn[] = [];

  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (remaining <= 0) break;

    const current = turns[i];
    let text = current.text;
    if (text.length > remaining) {
      if (remaining < 16) break;
      text = truncateText(text, remaining);
    }

    selected.push({ role: current.role, text });
    remaining -= text.length;
  }

  return selected.reverse();
}

function readRecentTurnsFromTranscript(filePath: string, limit: number): SessionTurn[] {
  if (limit <= 0) return [];

  const fileHandle = fs.openSync(filePath, 'r');
  const collected: SessionTurn[] = [];
  let remainder = '';

  try {
    let position = fs.fstatSync(fileHandle).size;

    while (position > 0 && collected.length < limit) {
      const readSize = Math.min(READ_CHUNK_SIZE, position);
      position -= readSize;

      const buffer = Buffer.allocUnsafe(readSize);
      fs.readSync(fileHandle, buffer, 0, readSize, position);

      const chunk = buffer.toString('utf-8');
      const text = chunk + remainder;
      const lines = text.split('\n');
      remainder = lines.shift() ?? '';

      for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
        if (collected.length >= limit) break;
        const turn = parseTurnFromLine(lines[lineIndex]);
        if (turn) collected.push(turn);
      }
    }

    if (position === 0 && remainder && collected.length < limit) {
      const turn = parseTurnFromLine(remainder);
      if (turn) collected.push(turn);
    }
  } finally {
    fs.closeSync(fileHandle);
  }

  return applyOutputBudget(collected.reverse());
}

function toSessionLabel(sessionKey: string, agentId: string): string {
  const normalizedPrefix = `agent:${agentId}:`;
  if (sessionKey.startsWith(normalizedPrefix)) {
    return sessionKey.slice(normalizedPrefix.length) || sessionKey;
  }

  const parts = sessionKey.split(':');
  if (parts[0] === 'agent' && parts.length > 2) {
    return parts.slice(2).join(':');
  }

  return sessionKey;
}

export function formatSessionRecapMarkdown(result: SessionRecapResult): string {
  let output = `## Session Recap: ${result.sessionLabel}\n\n`;
  output += `### Recent Conversation (last ${result.count} messages)\n`;

  if (result.messages.length === 0) {
    output += '_No recent user/assistant messages found._\n';
    return output.trimEnd();
  }

  for (const message of result.messages) {
    const label = message.role === 'user' ? 'User' : 'Assistant';
    output += `**${label}:** ${message.text}\n\n`;
  }

  return output.trimEnd();
}

export async function buildSessionRecap(
  sessionKeyInput: string,
  options: SessionRecapOptions = {}
): Promise<SessionRecapResult> {
  const sessionKey = sanitizeSessionKey(sessionKeyInput);
  const agentId = resolveAgentId(sessionKey, options.agentId);
  const limit = normalizeLimit(options.limit);

  const entry = getSessionStoreEntry(agentId, sessionKey);
  const sessionId = String(entry.sessionId).trim();
  const transcriptPath = resolveSafeTranscriptPath(agentId, sessionId, entry.sessionFile);
  const messages = readRecentTurnsFromTranscript(transcriptPath, limit);

  const result: SessionRecapResult = {
    sessionKey,
    sessionLabel: toSessionLabel(sessionKey, agentId),
    agentId,
    sessionId,
    transcriptPath,
    generated: new Date().toISOString(),
    count: messages.length,
    messages,
    markdown: ''
  };

  result.markdown = formatSessionRecapMarkdown(result);
  return result;
}

export async function sessionRecapCommand(
  sessionKey: string,
  options: SessionRecapOptions = {}
): Promise<void> {
  const result = await buildSessionRecap(sessionKey, options);
  const format = options.format ?? 'markdown';

  if (format === 'json') {
    console.log(JSON.stringify({
      sessionKey: result.sessionKey,
      sessionLabel: result.sessionLabel,
      agentId: result.agentId,
      sessionId: result.sessionId,
      generated: result.generated,
      count: result.count,
      messages: result.messages
    }, null, 2));
    return;
  }

  console.log(result.markdown);
}

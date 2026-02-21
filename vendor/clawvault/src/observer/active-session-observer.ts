import * as fs from 'fs';
import * as path from 'path';
import { Observer, type ObserverOptions } from './observer.js';
import { getSessionsDir } from '../lib/session-utils.js';

const ONE_KIB = 1024;
const ONE_MIB = ONE_KIB * ONE_KIB;
const SMALL_SESSION_THRESHOLD_BYTES = 50 * ONE_KIB;
const MEDIUM_SESSION_THRESHOLD_BYTES = 150 * ONE_KIB;
const LARGE_SESSION_THRESHOLD_BYTES = 300 * ONE_KIB;
const DEFAULT_AGENT_ID = 'main';
const AGENT_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;
const SESSION_ID_RE = /^[a-zA-Z0-9._-]{1,200}$/;
const CURSOR_FILE_NAME = 'observe-cursors.json';
const STALE_CURSOR_THRESHOLD_MS = 12 * 60 * 60 * 1000;

export interface ObserveCursorEntry {
  lastObservedOffset: number;
  lastObservedAt: string;
  sessionKey: string;
  lastFileSize: number;
}

export type ObserveCursorStore = Record<string, ObserveCursorEntry>;

export interface ActiveObserveOptions {
  vaultPath: string;
  agentId?: string;
  minNewBytes?: number;
  sessionsDir?: string;
  dryRun?: boolean;
  threshold?: number;
  reflectThreshold?: number;
  model?: string;
  extractTasks?: boolean;
}

export interface ActiveObservationCandidate {
  sessionId: string;
  sessionKey: string;
  sourceLabel: string;
  filePath: string;
  fileSize: number;
  startOffset: number;
  newBytes: number;
  thresholdBytes: number;
}

export interface ActiveObservationFailure {
  sessionId: string;
  sessionKey: string;
  sourceLabel: string;
  error: string;
}

export interface ActiveObserveResult {
  agentId: string;
  sessionsDir: string;
  checkedSessions: number;
  candidateSessions: number;
  observedSessions: number;
  cursorUpdates: number;
  dryRun: boolean;
  totalNewBytes: number;
  observedNewBytes: number;
  routedCounts: Record<string, number>;
  failedSessionCount: number;
  failedSessions: ActiveObservationFailure[];
  candidates: ActiveObservationCandidate[];
}

export interface ObserverStalenessResult {
  staleCount: number;
  oldestMs: number;
  newestMs: number;
}

interface SessionDescriptor {
  sessionId: string;
  sessionKey: string;
  filePath: string;
}

interface SessionIndexEntry {
  sessionId?: unknown;
  updatedAt?: unknown;
}

type MinimalObserver = Pick<Observer, 'processMessages' | 'flush'>;
type ObserverFactory = (vaultPath: string, options: ObserverOptions) => MinimalObserver;

interface ActiveObserveDependencies {
  createObserver?: ObserverFactory;
  now?: () => Date;
}

interface ObserverStalenessOptions {
  sessionsDir?: string;
  now?: () => Date;
}

interface IncrementalReadResult {
  messages: string[];
  nextOffset: number;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeAgentId(input?: string): string {
  const raw = (input ?? process.env.OPENCLAW_AGENT_ID ?? DEFAULT_AGENT_ID).trim();
  if (!AGENT_ID_RE.test(raw)) {
    return DEFAULT_AGENT_ID;
  }
  return raw;
}

function resolveSessionsDirectory(agentId: string, override?: string): string {
  if (override?.trim()) {
    return path.resolve(override.trim());
  }
  return getSessionsDir(agentId);
}

function getCursorPath(vaultPath: string): string {
  return path.join(vaultPath, '.clawvault', CURSOR_FILE_NAME);
}

export function getScaledObservationThresholdBytes(fileSizeBytes: number): number {
  if (fileSizeBytes < ONE_MIB) {
    return SMALL_SESSION_THRESHOLD_BYTES;
  }
  if (fileSizeBytes <= 5 * ONE_MIB) {
    return MEDIUM_SESSION_THRESHOLD_BYTES;
  }
  return LARGE_SESSION_THRESHOLD_BYTES;
}

function parseCursorStore(raw: unknown): ObserveCursorStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const input = raw as Record<string, unknown>;
  const store: ObserveCursorStore = {};

  for (const [sessionId, value] of Object.entries(input)) {
    if (!SESSION_ID_RE.test(sessionId)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    const entry = value as Record<string, unknown>;
    if (!isFiniteNonNegative(entry.lastObservedOffset)) continue;
    if (!isFiniteNonNegative(entry.lastFileSize)) continue;
    if (typeof entry.lastObservedAt !== 'string' || !entry.lastObservedAt.trim()) continue;
    if (typeof entry.sessionKey !== 'string' || !entry.sessionKey.trim()) continue;

    store[sessionId] = {
      lastObservedOffset: entry.lastObservedOffset,
      lastObservedAt: entry.lastObservedAt,
      sessionKey: entry.sessionKey,
      lastFileSize: entry.lastFileSize
    };
  }

  return store;
}

export function loadObserveCursorStore(vaultPath: string): ObserveCursorStore {
  const cursorPath = getCursorPath(vaultPath);
  if (!fs.existsSync(cursorPath)) {
    return {};
  }

  try {
    const raw = JSON.parse(fs.readFileSync(cursorPath, 'utf-8')) as unknown;
    return parseCursorStore(raw);
  } catch {
    return {};
  }
}

export function saveObserveCursorStore(vaultPath: string, store: ObserveCursorStore): void {
  const cursorPath = getCursorPath(vaultPath);
  fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
  fs.writeFileSync(cursorPath, `${JSON.stringify(store, null, 2)}\n`, 'utf-8');
}

function parseAgentIdFromSessionKey(sessionKey: string): string | null {
  const match = /^agent:([^:]+):/.exec(sessionKey);
  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim();
  if (!AGENT_ID_RE.test(candidate)) {
    return null;
  }

  return candidate;
}

function resolveSessionFileForCursor(
  sessionId: string,
  cursor: ObserveCursorEntry,
  sessionsDirOverride?: string
): string | null {
  const candidates = new Set<string>();
  if (sessionsDirOverride?.trim()) {
    candidates.add(path.join(path.resolve(sessionsDirOverride.trim()), `${sessionId}.jsonl`));
  }

  const agentId = parseAgentIdFromSessionKey(cursor.sessionKey) ?? DEFAULT_AGENT_ID;
  candidates.add(path.join(getSessionsDir(agentId), `${sessionId}.jsonl`));

  for (const filePath of candidates) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        return filePath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function getObserverStaleness(
  vaultPath: string,
  options: ObserverStalenessOptions = {}
): ObserverStalenessResult {
  const nowDate = options.now ? options.now() : new Date();
  const nowMs = nowDate.getTime();
  if (!Number.isFinite(nowMs)) {
    return {
      staleCount: 0,
      oldestMs: 0,
      newestMs: 0
    };
  }

  const cursorStore = loadObserveCursorStore(path.resolve(vaultPath));
  let staleCount = 0;
  let oldestMs = 0;
  let newestMs = Number.POSITIVE_INFINITY;

  for (const [sessionId, cursor] of Object.entries(cursorStore)) {
    const observedAtMs = Date.parse(cursor.lastObservedAt);
    if (!Number.isFinite(observedAtMs)) {
      continue;
    }

    const ageMs = Math.max(0, nowMs - observedAtMs);
    if (ageMs <= STALE_CURSOR_THRESHOLD_MS) {
      continue;
    }

    const sessionFilePath = resolveSessionFileForCursor(sessionId, cursor, options.sessionsDir);
    if (!sessionFilePath) {
      continue;
    }

    let sessionStat: fs.Stats;
    try {
      sessionStat = fs.statSync(sessionFilePath);
    } catch {
      continue;
    }
    if (!sessionStat.isFile()) {
      continue;
    }

    if (cursor.lastFileSize >= sessionStat.size) {
      continue;
    }

    staleCount += 1;
    oldestMs = Math.max(oldestMs, ageMs);
    newestMs = Math.min(newestMs, ageMs);
  }

  return {
    staleCount,
    oldestMs: staleCount > 0 ? oldestMs : 0,
    newestMs: staleCount > 0 ? newestMs : 0
  };
}

function loadSessionIndex(sessionsDir: string): Record<string, SessionIndexEntry> {
  const indexPath = path.join(sessionsDir, 'sessions.json');
  if (!fs.existsSync(indexPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, SessionIndexEntry>;
  } catch {
    return {};
  }
}

function resolveTranscriptPath(sessionsDir: string, sessionId: string): string {
  return path.join(sessionsDir, `${sessionId}.jsonl`);
}

function discoverSessionDescriptors(sessionsDir: string, fallbackAgentId: string): SessionDescriptor[] {
  const descriptors: SessionDescriptor[] = [];
  const seen = new Set<string>();
  const index = loadSessionIndex(sessionsDir);

  const indexedEntries = Object.entries(index).sort((left, right) => {
    const leftUpdated = Number(left[1]?.updatedAt ?? 0);
    const rightUpdated = Number(right[1]?.updatedAt ?? 0);
    return rightUpdated - leftUpdated;
  });

  for (const [sessionKey, entry] of indexedEntries) {
    if (!entry || typeof entry !== 'object') continue;
    const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId.trim() : '';
    if (!SESSION_ID_RE.test(sessionId) || seen.has(sessionId)) continue;

    const filePath = resolveTranscriptPath(sessionsDir, sessionId);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      seen.add(sessionId);
      descriptors.push({ sessionId, sessionKey, filePath });
    } catch {
      continue;
    }
  }

  const fallbackPrefix = `agent:${fallbackAgentId}:`;
  for (const fileName of fs.readdirSync(sessionsDir)) {
    if (!fileName.endsWith('.jsonl') || fileName.includes('.backup') || fileName.includes('.deleted')) {
      continue;
    }

    const sessionId = fileName.slice(0, -'.jsonl'.length);
    if (!SESSION_ID_RE.test(sessionId) || seen.has(sessionId)) continue;

    const filePath = path.join(sessionsDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      seen.add(sessionId);
      descriptors.push({
        sessionId,
        sessionKey: `${fallbackPrefix}unknown:${sessionId}`,
        filePath
      });
    } catch {
      continue;
    }
  }

  return descriptors;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractContentText(value: unknown): string {
  if (typeof value === 'string') {
    return normalizeWhitespace(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractContentText(item))
      .filter(Boolean);
    return normalizeWhitespace(parts.join(' '));
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const input = value as Record<string, unknown>;
  if (typeof input.text === 'string') {
    return normalizeWhitespace(input.text);
  }
  if (typeof input.content === 'string') {
    return normalizeWhitespace(input.content);
  }
  return '';
}

function normalizeRole(role: unknown): string {
  if (typeof role !== 'string') {
    return '';
  }
  return role.trim().toLowerCase();
}

function parseOpenClawJsonLine(line: string): string {
  if (!line.trim()) {
    return '';
  }

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
    const content = extractContentText(entry.content);
    if (!content) return '';
    return role ? `${role}: ${content}` : content;
  }

  if (entry.type === 'message' && entry.message && typeof entry.message === 'object') {
    const message = entry.message as Record<string, unknown>;
    const role = normalizeRole(message.role);
    const content = extractContentText(message.content);
    if (!content) return '';
    return role ? `${role}: ${content}` : content;
  }

  return '';
}

function decodeLineBuffer(lineBuffer: Buffer): string {
  if (lineBuffer.length === 0) {
    return '';
  }

  const normalized = lineBuffer[lineBuffer.length - 1] === 0x0d
    ? lineBuffer.subarray(0, lineBuffer.length - 1)
    : lineBuffer;
  return normalized.toString('utf-8').trim();
}

async function readIncrementalMessages(filePath: string, startOffset: number): Promise<IncrementalReadResult> {
  const messages: string[] = [];
  let nextOffset = startOffset;
  let remainder: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  const stream = fs.createReadStream(filePath, {
    start: startOffset
  });

  for await (const chunk of stream) {
    const chunkBuffer: Buffer<ArrayBufferLike> = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    const combined = remainder.length > 0
      ? Buffer.concat([remainder, chunkBuffer])
      : chunkBuffer;

    let lineStart = 0;
    for (let index = 0; index < combined.length; index += 1) {
      if (combined[index] !== 0x0a) continue;

      const lineBuffer = combined.subarray(lineStart, index);
      const line = decodeLineBuffer(lineBuffer);
      const parsed = parseOpenClawJsonLine(line);
      if (parsed) {
        messages.push(parsed);
      }

      nextOffset += (index - lineStart + 1);
      lineStart = index + 1;
    }

    remainder = combined.subarray(lineStart);
  }

  // Consume trailing complete JSON line without final newline.
  if (remainder.length > 0) {
    const trailing = decodeLineBuffer(remainder);
    if (trailing) {
      const parsed = parseOpenClawJsonLine(trailing);
      if (parsed) {
        messages.push(parsed);
        nextOffset += remainder.length;
      }
    }
  }

  return { messages, nextOffset };
}

export function parseSessionSourceLabel(sessionKey: string): string {
  const parts = sessionKey.split(':');
  if (parts.length < 3 || parts[0] !== 'agent') {
    return 'session';
  }

  const scope = parts.slice(2);
  if (scope[0] === 'main') {
    return 'main';
  }
  if (scope[0] === 'telegram' && scope[1] === 'dm') {
    return 'telegram-dm';
  }
  if (scope[0] === 'telegram' && scope[1] === 'group') {
    return 'telegram-group';
  }
  if (scope[0] === 'discord') {
    return 'discord';
  }
  if (scope[0] === 'telegram') {
    return 'telegram';
  }
  if (scope[0] === 'slack') {
    return 'slack';
  }

  return scope[0] || 'session';
}

function createDefaultObserver(vaultPath: string, options: ObserverOptions): MinimalObserver {
  return new Observer(vaultPath, options);
}

function parseRoutingCounts(routingSummary: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const [, categorySection = ''] = routingSummary.split('\u2192');
  const summaryCategories = categorySection.split('(')[0] ?? '';
  if (!summaryCategories) {
    return counts;
  }

  for (const match of summaryCategories.matchAll(/\b([a-z][a-z0-9-]*):\s*(\d+)\b/gi)) {
    const category = match[1].toLowerCase();
    const count = Number.parseInt(match[2], 10);
    if (!Number.isFinite(count) || count <= 0) {
      continue;
    }
    counts[category] = (counts[category] ?? 0) + count;
  }

  return counts;
}

function mergeRoutingCounts(
  target: Record<string, number>,
  incoming: Record<string, number>
): void {
  for (const [category, count] of Object.entries(incoming)) {
    target[category] = (target[category] ?? 0) + count;
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function selectCandidates(
  descriptors: SessionDescriptor[],
  cursors: ObserveCursorStore,
  minNewBytes?: number
): ActiveObservationCandidate[] {
  const candidates: ActiveObservationCandidate[] = [];

  for (const descriptor of descriptors) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(descriptor.filePath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    const fileSize = stat.size;
    const cursor = cursors[descriptor.sessionId];
    const previousOffset = cursor && isFiniteNonNegative(cursor.lastObservedOffset)
      ? cursor.lastObservedOffset
      : 0;
    const startOffset = previousOffset <= fileSize ? previousOffset : 0;
    const newBytes = Math.max(0, fileSize - startOffset);
    const thresholdBytes = minNewBytes ?? getScaledObservationThresholdBytes(fileSize);

    if (newBytes < thresholdBytes) {
      continue;
    }

    candidates.push({
      sessionId: descriptor.sessionId,
      sessionKey: descriptor.sessionKey,
      sourceLabel: parseSessionSourceLabel(descriptor.sessionKey),
      filePath: descriptor.filePath,
      fileSize,
      startOffset,
      newBytes,
      thresholdBytes
    });
  }

  return candidates;
}

export async function observeActiveSessions(
  options: ActiveObserveOptions,
  dependencies: ActiveObserveDependencies = {}
): Promise<ActiveObserveResult> {
  const vaultPath = path.resolve(options.vaultPath);
  const agentId = normalizeAgentId(options.agentId);
  const sessionsDir = resolveSessionsDirectory(agentId, options.sessionsDir);
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(sessionsDir) || !fs.statSync(sessionsDir).isDirectory()) {
    return {
      agentId,
      sessionsDir,
      checkedSessions: 0,
      candidateSessions: 0,
      observedSessions: 0,
      cursorUpdates: 0,
      dryRun,
      totalNewBytes: 0,
      observedNewBytes: 0,
      routedCounts: {},
      failedSessionCount: 0,
      failedSessions: [],
      candidates: []
    };
  }

  const now = dependencies.now ?? (() => new Date());
  const cursors = loadObserveCursorStore(vaultPath);
  const descriptors = discoverSessionDescriptors(sessionsDir, agentId);
  const candidates = selectCandidates(descriptors, cursors, options.minNewBytes);

  if (dryRun || candidates.length === 0) {
    return {
      agentId,
      sessionsDir,
      checkedSessions: descriptors.length,
      candidateSessions: candidates.length,
      observedSessions: 0,
      cursorUpdates: 0,
      dryRun,
      totalNewBytes: candidates.reduce((sum, candidate) => sum + candidate.newBytes, 0),
      observedNewBytes: 0,
      routedCounts: {},
      failedSessionCount: 0,
      failedSessions: [],
      candidates
    };
  }

  const observerFactory = dependencies.createObserver ?? createDefaultObserver;
  const observerOptions: ObserverOptions = {
    tokenThreshold: options.threshold,
    reflectThreshold: options.reflectThreshold,
    model: options.model,
    extractTasks: options.extractTasks
  };

  let observedSessions = 0;
  let cursorUpdates = 0;
  let observedNewBytes = 0;
  const routedCounts: Record<string, number> = {};
  const failedSessions: ActiveObservationFailure[] = [];

  for (const candidate of candidates) {
    try {
      const observer = observerFactory(vaultPath, observerOptions);
      const { messages, nextOffset } = await readIncrementalMessages(candidate.filePath, candidate.startOffset);
      const taggedMessages = messages.map((message) => `[${candidate.sourceLabel}] ${message}`);

      if (taggedMessages.length > 0) {
        await observer.processMessages(taggedMessages, {
          source: 'openclaw',
          sessionKey: candidate.sessionKey,
          transcriptId: candidate.sessionId
        });
        const flushResult = await observer.flush();
        mergeRoutingCounts(routedCounts, parseRoutingCounts(flushResult.routingSummary));
        observedSessions += 1;
        observedNewBytes += candidate.newBytes;
      }

      if (nextOffset > candidate.startOffset) {
        cursors[candidate.sessionId] = {
          lastObservedOffset: nextOffset,
          lastObservedAt: now().toISOString(),
          sessionKey: candidate.sessionKey,
          lastFileSize: candidate.fileSize
        };
        cursorUpdates += 1;
      }
    } catch (error) {
      const reason = stringifyError(error);
      failedSessions.push({
        sessionId: candidate.sessionId,
        sessionKey: candidate.sessionKey,
        sourceLabel: candidate.sourceLabel,
        error: reason
      });
      console.error(
        `[observer] failed to observe session ${candidate.sessionKey} (${candidate.sessionId}): ${reason}`
      );
    }
  }

  if (cursorUpdates > 0) {
    saveObserveCursorStore(vaultPath, cursors);
  }

  return {
    agentId,
    sessionsDir,
    checkedSessions: descriptors.length,
    candidateSessions: candidates.length,
    observedSessions,
    cursorUpdates,
    dryRun,
    totalNewBytes: candidates.reduce((sum, candidate) => sum + candidate.newBytes, 0),
    observedNewBytes,
    routedCounts,
    failedSessionCount: failedSessions.length,
    failedSessions,
    candidates
  };
}

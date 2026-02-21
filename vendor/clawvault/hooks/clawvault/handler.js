/**
 * ClawVault OpenClaw Hook
 * 
 * Provides automatic context death resilience:
 * - gateway:startup → detect context death, inject recovery info
 * - gateway:heartbeat → cheap active-session threshold checks
 * - command:new → auto-checkpoint before session reset
 * - compaction:memoryFlush → force active-session flush before compaction
 * - session:start → inject relevant context for first user prompt
 * 
 * SECURITY: Uses execFileSync (no shell) to prevent command injection
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MAX_CONTEXT_RESULTS = 4;
const MAX_CONTEXT_PROMPT_LENGTH = 500;
const MAX_CONTEXT_SNIPPET_LENGTH = 220;
const MAX_RECAP_RESULTS = 6;
const MAX_RECAP_SNIPPET_LENGTH = 220;
const EVENT_NAME_SEPARATOR_RE = /[.:/]/g;
const OBSERVE_CURSOR_FILE = 'observe-cursors.json';
const ONE_KIB = 1024;
const ONE_MIB = ONE_KIB * ONE_KIB;
const SMALL_SESSION_THRESHOLD_BYTES = 50 * ONE_KIB;
const MEDIUM_SESSION_THRESHOLD_BYTES = 150 * ONE_KIB;
const LARGE_SESSION_THRESHOLD_BYTES = 300 * ONE_KIB;

// Sanitize string for safe display (prevent prompt injection via control chars)
function sanitizeForDisplay(str) {
  if (typeof str !== 'string') return '';
  // Remove control characters, limit length, escape markdown
  return str
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control chars
    .replace(/[`*_~\[\]]/g, '\\$&')  // Escape markdown
    .slice(0, 200);                   // Limit length
}

// Sanitize prompt before passing to CLI command
function sanitizePromptForContext(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CONTEXT_PROMPT_LENGTH);
}

function sanitizeSessionKey(str) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (!/^agent:[a-zA-Z0-9_-]+:[a-zA-Z0-9:_-]+$/.test(trimmed)) {
    return '';
  }
  return trimmed.slice(0, 200);
}

function extractSessionKey(event) {
  const candidates = [
    event?.sessionKey,
    event?.context?.sessionKey,
    event?.session?.key,
    event?.context?.session?.key,
    event?.metadata?.sessionKey
  ];

  for (const candidate of candidates) {
    const key = sanitizeSessionKey(candidate);
    if (key) return key;
  }

  return '';
}

function extractAgentIdFromSessionKey(sessionKey) {
  const match = /^agent:([^:]+):/.exec(sessionKey);
  if (!match?.[1]) return '';
  const agentId = match[1].trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(agentId)) return '';
  return agentId;
}

function sanitizeAgentId(agentId) {
  if (typeof agentId !== 'string') return '';
  const normalized = agentId.trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(normalized)) return '';
  return normalized;
}

function normalizeAbsoluteEnvPath(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const resolved = path.resolve(trimmed);
  if (!path.isAbsolute(resolved)) return null;
  return resolved;
}

function getOpenClawAgentsDir() {
  const stateDir = normalizeAbsoluteEnvPath(process.env.OPENCLAW_STATE_DIR);
  if (stateDir) {
    return path.join(stateDir, 'agents');
  }

  const openClawHome = normalizeAbsoluteEnvPath(process.env.OPENCLAW_HOME);
  if (openClawHome) {
    return path.join(openClawHome, 'agents');
  }

  return path.join(os.homedir(), '.openclaw', 'agents');
}

function getObserveCursorPath(vaultPath) {
  return path.join(vaultPath, '.clawvault', OBSERVE_CURSOR_FILE);
}

function loadObserveCursors(vaultPath) {
  const cursorPath = getObserveCursorPath(vaultPath);
  if (!fs.existsSync(cursorPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cursorPath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function getScaledObservationThresholdBytes(fileSizeBytes) {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return SMALL_SESSION_THRESHOLD_BYTES;
  }
  if (fileSizeBytes < ONE_MIB) {
    return SMALL_SESSION_THRESHOLD_BYTES;
  }
  if (fileSizeBytes <= 5 * ONE_MIB) {
    return MEDIUM_SESSION_THRESHOLD_BYTES;
  }
  return LARGE_SESSION_THRESHOLD_BYTES;
}

function parseSessionIndex(agentId) {
  const sessionsDir = path.join(getOpenClawAgentsDir(), agentId, 'sessions');
  const sessionsJsonPath = path.join(sessionsDir, 'sessions.json');
  if (!fs.existsSync(sessionsJsonPath)) {
    return { sessionsDir, index: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { sessionsDir, index: {} };
    }
    return { sessionsDir, index: parsed };
  } catch {
    return { sessionsDir, index: {} };
  }
}

function shouldObserveActiveSessions(vaultPath, agentId) {
  const cursors = loadObserveCursors(vaultPath);
  const { sessionsDir, index } = parseSessionIndex(agentId);
  const entries = Object.entries(index);
  if (entries.length === 0) {
    return false;
  }

  for (const [sessionKey, value] of entries) {
    if (!value || typeof value !== 'object') continue;
    const sessionId = typeof value.sessionId === 'string' ? value.sessionId.trim() : '';
    if (!/^[a-zA-Z0-9._-]{1,200}$/.test(sessionId)) continue;

    const filePath = path.join(sessionsDir, `${sessionId}.jsonl`);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    const fileSize = stat.size;
    const cursorEntry = cursors[sessionId];
    const previousOffset = Number.isFinite(cursorEntry?.lastObservedOffset)
      ? Math.max(0, Number(cursorEntry.lastObservedOffset))
      : 0;
    const startOffset = previousOffset <= fileSize ? previousOffset : 0;
    const newBytes = Math.max(0, fileSize - startOffset);
    const thresholdBytes = getScaledObservationThresholdBytes(fileSize);

    if (newBytes >= thresholdBytes) {
      console.log(`[clawvault] Active observe trigger: ${sessionKey} (+${newBytes}B >= ${thresholdBytes}B)`);
      return true;
    }
  }

  return false;
}

function extractTextFromMessage(message) {
  if (typeof message === 'string') return message;
  if (!message || typeof message !== 'object') return '';

  const content = message.content ?? message.text ?? message.message;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        if (typeof part.text === 'string') return part.text;
        if (typeof part.content === 'string') return part.content;
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function isUserMessage(message) {
  if (typeof message === 'string') return true;
  if (!message || typeof message !== 'object') return false;
  const role = typeof message.role === 'string' ? message.role.toLowerCase() : '';
  const type = typeof message.type === 'string' ? message.type.toLowerCase() : '';
  return role === 'user' || role === 'human' || type === 'user';
}

function extractInitialPrompt(event) {
  const fromContext = sanitizePromptForContext(event?.context?.initialPrompt);
  if (fromContext) return fromContext;

  const candidates = [
    event?.context?.messages,
    event?.context?.initialMessages,
    event?.context?.history,
    event?.messages
  ];

  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const message of list) {
      if (!isUserMessage(message)) continue;
      const text = sanitizePromptForContext(extractTextFromMessage(message));
      if (text) return text;
    }
  }

  return '';
}

function truncateSnippet(snippet) {
  const safe = sanitizeForDisplay(snippet).replace(/\s+/g, ' ').trim();
  if (safe.length <= MAX_CONTEXT_SNIPPET_LENGTH) return safe;
  return `${safe.slice(0, MAX_CONTEXT_SNIPPET_LENGTH - 3).trimEnd()}...`;
}

function truncateRecapSnippet(snippet) {
  const safe = sanitizeForDisplay(snippet).replace(/\s+/g, ' ').trim();
  if (safe.length <= MAX_RECAP_SNIPPET_LENGTH) return safe;
  return `${safe.slice(0, MAX_RECAP_SNIPPET_LENGTH - 3).trimEnd()}...`;
}

function parseContextJson(output) {
  try {
    const parsed = JSON.parse(output);
    if (!parsed || !Array.isArray(parsed.context)) return [];

    return parsed.context
      .slice(0, MAX_CONTEXT_RESULTS)
      .map((entry) => ({
        title: sanitizeForDisplay(entry?.title || 'Untitled'),
        age: sanitizeForDisplay(entry?.age || 'unknown age'),
        snippet: truncateSnippet(entry?.snippet || '')
      }))
      .filter((entry) => entry.snippet);
  } catch {
    return [];
  }
}

function parseSessionRecapJson(output) {
  try {
    const parsed = JSON.parse(output);
    if (!parsed || !Array.isArray(parsed.messages)) return [];

    return parsed.messages
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const role = typeof entry.role === 'string' ? entry.role.toLowerCase() : '';
        if (role !== 'user' && role !== 'assistant') return null;
        const text = truncateRecapSnippet(typeof entry.text === 'string' ? entry.text : '');
        if (!text) return null;
        return {
          role: role === 'user' ? 'User' : 'Assistant',
          text
        };
      })
      .filter(Boolean)
      .slice(-MAX_RECAP_RESULTS);
  } catch {
    return [];
  }
}

function formatSessionContextInjection(recapEntries, memoryEntries) {
  const lines = ['[ClawVault] Session context restored:', '', 'Recent conversation:'];

  if (recapEntries.length === 0) {
    lines.push('- No recent user/assistant turns found for this session.');
  } else {
    for (const entry of recapEntries) {
      lines.push(`- ${entry.role}: ${entry.text}`);
    }
  }

  lines.push('', 'Relevant memories:');
  if (memoryEntries.length === 0) {
    lines.push('- No relevant vault memories found for the current prompt.');
  } else {
    for (const entry of memoryEntries) {
      lines.push(`- ${entry.title} (${entry.age}): ${entry.snippet}`);
    }
  }

  return lines.join('\n');
}

function injectSystemMessage(event, message) {
  if (!event.messages || !Array.isArray(event.messages)) return false;

  if (event.messages.length === 0) {
    event.messages.push(message);
    return true;
  }

  const first = event.messages[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    if ('role' in first || 'content' in first) {
      event.messages.push({ role: 'system', content: message });
      return true;
    }
    if ('type' in first || 'text' in first) {
      event.messages.push({ type: 'system', text: message });
      return true;
    }
  }

  event.messages.push(message);
  return true;
}

function normalizeEventToken(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(EVENT_NAME_SEPARATOR_RE, ':');
}

function eventMatches(event, type, action) {
  const normalizedExpected = `${normalizeEventToken(type)}:${normalizeEventToken(action)}`;
  const normalizedType = normalizeEventToken(event?.type);
  const normalizedAction = normalizeEventToken(event?.action);

  if (normalizedType && normalizedAction) {
    if (`${normalizedType}:${normalizedAction}` === normalizedExpected) {
      return true;
    }
  }

  const aliases = [
    event?.event,
    event?.name,
    event?.hook,
    event?.trigger,
    event?.eventName
  ];

  for (const alias of aliases) {
    const normalizedAlias = normalizeEventToken(alias);
    if (!normalizedAlias) continue;
    if (normalizedAlias === normalizedExpected) {
      return true;
    }
  }

  return false;
}

function eventIncludesToken(event, token) {
  const normalizedToken = normalizeEventToken(token);
  if (!normalizedToken) return false;

  const values = [
    event?.type,
    event?.action,
    event?.event,
    event?.name,
    event?.hook,
    event?.trigger,
    event?.eventName
  ];

  return values
    .map((value) => normalizeEventToken(value))
    .filter(Boolean)
    .some((value) => value.includes(normalizedToken));
}

// Validate vault path - must be absolute and exist
function validateVaultPath(vaultPath) {
  if (!vaultPath || typeof vaultPath !== 'string') return null;
  
  // Resolve to absolute path
  const resolved = path.resolve(vaultPath);
  
  // Must be absolute
  if (!path.isAbsolute(resolved)) return null;
  
  // Must exist and be a directory
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  
  // Must contain .clawvault.json
  const configPath = path.join(resolved, '.clawvault.json');
  if (!fs.existsSync(configPath)) return null;
  
  return resolved;
}

// Find vault by walking up directories
function findVaultPath() {
  // Check env first
  if (process.env.CLAWVAULT_PATH) {
    return validateVaultPath(process.env.CLAWVAULT_PATH);
  }

  // Walk up from cwd
  let dir = process.cwd();
  const root = path.parse(dir).root;
  
  while (dir !== root) {
    const validated = validateVaultPath(dir);
    if (validated) return validated;
    
    // Also check memory/ subdirectory (OpenClaw convention)
    const memoryDir = path.join(dir, 'memory');
    const memoryValidated = validateVaultPath(memoryDir);
    if (memoryValidated) return memoryValidated;
    
    dir = path.dirname(dir);
  }
  
  return null;
}

// Run clawvault command safely (no shell)
function runClawvault(args, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1000, Number(options.timeoutMs)) : 15000;
  try {
    // Use execFileSync to avoid shell injection
    // Arguments are passed as array, not interpolated into shell
    const output = execFileSync('clawvault', args, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Explicitly no shell
      shell: false
    });
    return { success: true, output: output.trim(), code: 0 };
  } catch (err) {
    return { 
      success: false, 
      output: err.stderr?.toString() || err.message || String(err),
      code: err.status || 1
    };
  }
}

// Parse recovery output safely
function parseRecoveryOutput(output) {
  if (!output || typeof output !== 'string') {
    return { hadDeath: false, workingOn: null };
  }
  
  const hadDeath = output.includes('Context death detected') || 
                   output.includes('died') || 
                   output.includes('⚠️');
  
  let workingOn = null;
  if (hadDeath) {
    const lines = output.split('\n');
    const workingOnLine = lines.find(l => l.toLowerCase().includes('working on'));
    if (workingOnLine) {
      const parts = workingOnLine.split(':');
      if (parts.length > 1) {
        workingOn = sanitizeForDisplay(parts.slice(1).join(':').trim());
      }
    }
  }
  
  return { hadDeath, workingOn };
}

function resolveAgentIdForEvent(event) {
  const fromSessionKey = extractAgentIdFromSessionKey(extractSessionKey(event));
  if (fromSessionKey) return fromSessionKey;

  const fromEnv = sanitizeAgentId(process.env.OPENCLAW_AGENT_ID);
  if (fromEnv) return fromEnv;

  return 'main';
}

function runObserverCron(vaultPath, agentId, options = {}) {
  const args = ['observe', '--cron', '--agent', agentId, '-v', vaultPath];
  if (Number.isFinite(options.minNewBytes) && Number(options.minNewBytes) > 0) {
    args.push('--min-new', String(Math.floor(Number(options.minNewBytes))));
  }

  const result = runClawvault(args, { timeoutMs: 120000 });
  if (!result.success) {
    console.warn(`[clawvault] Observer cron failed (${options.reason || 'unknown reason'})`);
    return false;
  }

  if (result.output) {
    console.log(`[clawvault] Observer cron: ${result.output}`);
  } else {
    console.log('[clawvault] Observer cron: complete');
  }
  return true;
}

function extractEventTimestamp(event) {
  const candidates = [
    event?.timestamp,
    event?.scheduledAt,
    event?.time,
    event?.context?.timestamp,
    event?.context?.scheduledAt
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function isSundayMidnightUtc(date) {
  return date.getUTCDay() === 0 && date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
}

async function handleWeeklyReflect(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping weekly reflection');
    return;
  }

  const timestamp = extractEventTimestamp(event) || new Date();
  if (!isSundayMidnightUtc(timestamp)) {
    console.log('[clawvault] Weekly reflect skipped (not Sunday midnight UTC)');
    return;
  }

  const result = runClawvault(['reflect', '-v', vaultPath], { timeoutMs: 120000 });
  if (!result.success) {
    console.warn('[clawvault] Weekly reflection failed');
    return;
  }
  console.log('[clawvault] Weekly reflection complete');
}

// Handle gateway startup - check for context death
async function handleStartup(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping recovery check');
    return;
  }

  console.log(`[clawvault] Checking for context death`);

  // Pass vault path as separate argument (not interpolated)
  const result = runClawvault(['recover', '--clear', '-v', vaultPath]);
  
  if (!result.success) {
    console.warn('[clawvault] Recovery check failed');
    return;
  }

  const { hadDeath, workingOn } = parseRecoveryOutput(result.output);
  
  if (hadDeath) {
    // Build safe alert message with sanitized content
    const alertParts = ['[ClawVault] Context death detected.'];
    if (workingOn) {
      alertParts.push(`Last working on: ${workingOn}`);
    }
    alertParts.push('Run `clawvault wake` for full recovery context.');
    
    const alertMsg = alertParts.join(' ');

    // Inject into event messages if available
    if (injectSystemMessage(event, alertMsg)) {
      console.warn('[clawvault] Context death detected, alert injected');
    }
  } else {
    console.log('[clawvault] Clean startup - no context death');
  }
}

// Handle /new command - auto-checkpoint before reset
async function handleNew(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping auto-checkpoint');
    return;
  }

  // Sanitize session info for checkpoint
  const sessionKey = typeof event.sessionKey === 'string' 
    ? event.sessionKey.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 100)
    : 'unknown';
  const source = typeof event.context?.commandSource === 'string'
    ? event.context.commandSource.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50)
    : 'cli';

  console.log('[clawvault] Auto-checkpoint before /new');

  // Pass each argument separately (no shell interpolation)
  const result = runClawvault([
    'checkpoint',
    '--working-on', `Session reset via /new from ${source}`,
    '--focus', `Pre-reset checkpoint, session: ${sessionKey}`,
    '-v', vaultPath
  ]);

  if (result.success) {
    console.log('[clawvault] Auto-checkpoint created');
  } else {
    console.warn('[clawvault] Auto-checkpoint failed');
  }

  const agentId = resolveAgentIdForEvent(event);
  runObserverCron(vaultPath, agentId, {
    minNewBytes: 1,
    reason: 'command:new flush'
  });
}

// Handle session start - inject dynamic context for first prompt
async function handleSessionStart(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping context injection');
    return;
  }

  const sessionKey = extractSessionKey(event);
  const prompt = extractInitialPrompt(event);
  let recapEntries = [];
  let memoryEntries = [];

  if (sessionKey) {
    console.log('[clawvault] Fetching session recap for context restoration');
    const recapArgs = ['session-recap', sessionKey, '--format', 'json'];
    const agentId = extractAgentIdFromSessionKey(sessionKey);
    if (agentId) {
      recapArgs.push('--agent', agentId);
    }

    const recapResult = runClawvault(recapArgs);
    if (!recapResult.success) {
      console.warn('[clawvault] Session recap lookup failed');
    } else {
      recapEntries = parseSessionRecapJson(recapResult.output);
    }
  } else {
    console.log('[clawvault] No session key found, skipping session recap');
  }

  if (prompt) {
    console.log('[clawvault] Fetching vault memories for session start prompt');
    const contextResult = runClawvault([
      'context',
      prompt,
      '--format', 'json',
      '--profile', 'auto',
      '-v', vaultPath
    ]);

    if (!contextResult.success) {
      console.warn('[clawvault] Context lookup failed');
    } else {
      memoryEntries = parseContextJson(contextResult.output);
    }
  } else {
    console.log('[clawvault] No initial prompt, skipping vault memory lookup');
  }

  if (recapEntries.length === 0 && memoryEntries.length === 0) {
    console.log('[clawvault] No session context available to inject');
    return;
  }

  if (injectSystemMessage(event, formatSessionContextInjection(recapEntries, memoryEntries))) {
    console.log(`[clawvault] Injected session context (${recapEntries.length} recap, ${memoryEntries.length} memories)`);
  } else {
    console.log('[clawvault] No message array available, skipping injection');
  }
}

// Handle heartbeat events - cheap stat-based trigger for active observation
async function handleHeartbeat(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping heartbeat observation check');
    return;
  }

  const agentId = resolveAgentIdForEvent(event);
  if (!shouldObserveActiveSessions(vaultPath, agentId)) {
    console.log('[clawvault] Heartbeat: no sessions crossed active-observe threshold');
    return;
  }

  runObserverCron(vaultPath, agentId, { reason: 'heartbeat threshold crossed' });
}

// Handle context compaction - force flush any pending session deltas
async function handleContextCompaction(event) {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping compaction observation');
    return;
  }

  const agentId = resolveAgentIdForEvent(event);
  runObserverCron(vaultPath, agentId, {
    minNewBytes: 1,
    reason: 'context compaction'
  });
}

// Main handler - route events
const handler = async (event) => {
  try {
    if (eventMatches(event, 'gateway', 'startup')) {
      await handleStartup(event);
      return;
    }

    if (
      eventMatches(event, 'cron', 'weekly')
      || eventIncludesToken(event, 'cron:weekly')
    ) {
      await handleWeeklyReflect(event);
      return;
    }

    if (
      eventMatches(event, 'gateway', 'heartbeat')
      || eventMatches(event, 'session', 'heartbeat')
      || eventIncludesToken(event, 'heartbeat')
    ) {
      await handleHeartbeat(event);
      return;
    }

    if (
      eventMatches(event, 'compaction', 'memoryflush')
      || eventMatches(event, 'context', 'compaction')
      || eventMatches(event, 'context', 'compact')
      || eventIncludesToken(event, 'compaction')
      || eventIncludesToken(event, 'memoryflush')
    ) {
      await handleContextCompaction(event);
      return;
    }

    if (eventMatches(event, 'command', 'new')) {
      await handleNew(event);
      return;
    }

    if (eventMatches(event, 'session', 'start')) {
      await handleSessionStart(event);
      return;
    }
  } catch (err) {
    console.error('[clawvault] Hook error:', err.message || 'unknown error');
  }
};

export default handler;

/**
 * Quick checkpoint command - fast state save for context death resilience
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

export interface CheckpointOptions {
  workingOn?: string;
  focus?: string;
  blocked?: string;
  vaultPath: string;
  urgent?: boolean;
}

export interface CheckpointData {
  timestamp: string;
  workingOn: string | null;
  focus: string | null;
  blocked: string | null;
  sessionId?: string;
  sessionKey?: string;
  model?: string;
  tokenEstimate?: number;
  sessionStartedAt?: string;
  urgent?: boolean;
}

export interface SessionState {
  sessionId?: string;
  sessionKey?: string;
  model?: string;
  tokenEstimate?: number;
  startedAt?: string;
}

const CLAWVAULT_DIR = '.clawvault';
const CHECKPOINT_FILE = 'last-checkpoint.json';
const SESSION_STATE_FILE = 'session-state.json';
const DIRTY_DEATH_FLAG = 'dirty-death.flag';
const CHECKPOINT_HISTORY_DIR = 'checkpoints';

let pendingCheckpoint: NodeJS.Timeout | null = null;
let pendingData: { dir: string; data: CheckpointData } | null = null;

function ensureClawvaultDir(vaultPath: string): string {
  const dir = path.join(vaultPath, CLAWVAULT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeCheckpointToDisk(dir: string, data: CheckpointData): void {
  const checkpointPath = path.join(dir, CHECKPOINT_FILE);
  fs.writeFileSync(checkpointPath, JSON.stringify(data, null, 2));

  const historyDir = path.join(dir, CHECKPOINT_HISTORY_DIR);
  fs.mkdirSync(historyDir, { recursive: true });
  const historyFileName = `${data.timestamp.replace(/[:.]/g, '-')}.json`;
  const historyPath = path.join(historyDir, historyFileName);
  fs.writeFileSync(historyPath, JSON.stringify(data, null, 2));

  const flagPath = path.join(dir, DIRTY_DEATH_FLAG);
  fs.writeFileSync(flagPath, data.timestamp);
}

function parseTokenEstimate(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function loadSessionState(dir: string): SessionState | null {
  const sessionStatePath = path.join(dir, SESSION_STATE_FILE);
  if (!fs.existsSync(sessionStatePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(sessionStatePath, 'utf-8')) as SessionState;
  } catch {
    return null;
  }
}

function getEnvSessionState(): SessionState {
  return {
    sessionKey: process.env.OPENCLAW_SESSION_KEY,
    model: process.env.OPENCLAW_MODEL,
    tokenEstimate: parseTokenEstimate(
      process.env.OPENCLAW_TOKEN_ESTIMATE || process.env.OPENCLAW_CONTEXT_TOKENS
    )
  };
}

function triggerUrgentWake(data: CheckpointData): void {
  const summary = [
    data.workingOn ? `Working on: ${data.workingOn}` : null,
    data.focus ? `Focus: ${data.focus}` : null,
    data.blocked ? `Blocked: ${data.blocked}` : null
  ].filter(Boolean).join(' | ');

  const text = summary
    ? `Urgent checkpoint saved. ${summary}`
    : 'Urgent checkpoint saved.';

  try {
    execFileSync('openclaw', ['gateway', 'wake', '--text', text, '--mode', 'now'], {
      stdio: 'inherit'
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error('Urgent wake failed: openclaw CLI not found.');
    }
    throw new Error(`Urgent wake failed: ${err?.message || 'unknown error'}`);
  }
}

export async function flush(): Promise<CheckpointData | null> {
  if (pendingCheckpoint) {
    clearTimeout(pendingCheckpoint);
    pendingCheckpoint = null;
  }
  if (!pendingData) return null;

  const { dir, data } = pendingData;
  pendingData = null;
  writeCheckpointToDisk(dir, data);
  return data;
}

export async function checkpoint(options: CheckpointOptions): Promise<CheckpointData> {
  const dir = ensureClawvaultDir(options.vaultPath);
  
  const data: CheckpointData = {
    timestamp: new Date().toISOString(),
    workingOn: options.workingOn || null,
    focus: options.focus || null,
    blocked: options.blocked || null,
    urgent: options.urgent || false
  };
  
  const sessionState = loadSessionState(dir);
  const envState = getEnvSessionState();
  data.sessionId = sessionState?.sessionId;
  data.sessionKey = envState.sessionKey || sessionState?.sessionKey || sessionState?.sessionId;
  data.model = envState.model || sessionState?.model;
  data.tokenEstimate = envState.tokenEstimate ?? sessionState?.tokenEstimate;
  data.sessionStartedAt = sessionState?.startedAt;

  if (options.urgent) {
    if (pendingCheckpoint) {
      clearTimeout(pendingCheckpoint);
      pendingCheckpoint = null;
    }
    pendingData = null;
    writeCheckpointToDisk(dir, data);
    triggerUrgentWake(data);
  } else {
    // Debounce writes to avoid rapid write spam; last call wins.
    pendingData = { dir, data };
    if (pendingCheckpoint) clearTimeout(pendingCheckpoint);
    pendingCheckpoint = setTimeout(() => {
      void flush();
    }, 1000);
  }

  return data;
}

export async function clearDirtyFlag(vaultPath: string): Promise<void> {
  const flagPath = path.join(vaultPath, CLAWVAULT_DIR, DIRTY_DEATH_FLAG);
  if (fs.existsSync(flagPath)) {
    fs.unlinkSync(flagPath);
  }
}

// Alias for CLI ergonomics (`clawvault clean-exit`)
export async function cleanExit(vaultPath: string): Promise<void> {
  await clearDirtyFlag(vaultPath);
}

export async function checkDirtyDeath(vaultPath: string): Promise<{
  died: boolean;
  checkpoint: CheckpointData | null;
  deathTime: string | null;
}> {
  const dir = path.join(vaultPath, CLAWVAULT_DIR);
  const flagPath = path.join(dir, DIRTY_DEATH_FLAG);
  const checkpointPath = path.join(dir, CHECKPOINT_FILE);
  
  if (!fs.existsSync(flagPath)) {
    return { died: false, checkpoint: null, deathTime: null };
  }
  
  const deathTime = fs.readFileSync(flagPath, 'utf-8').trim();
  
  let checkpoint: CheckpointData | null = null;
  if (fs.existsSync(checkpointPath)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }
  
  return { died: true, checkpoint, deathTime };
}

export async function setSessionState(vaultPath: string, session: string | SessionState): Promise<void> {
  const dir = ensureClawvaultDir(vaultPath);
  const sessionStatePath = path.join(dir, SESSION_STATE_FILE);
  
  const state: SessionState = typeof session === 'string'
    ? { sessionId: session }
    : { ...session };

  if (!state.startedAt) {
    state.startedAt = new Date().toISOString();
  }

  fs.writeFileSync(sessionStatePath, JSON.stringify(state, null, 2));
}

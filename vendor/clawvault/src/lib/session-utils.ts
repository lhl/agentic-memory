/**
 * Session discovery utilities for OpenClaw transcripts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionInfo {
  sessionId: string;
  sessionKey: string;
  agentId: string;
  filePath: string;
  updatedAt?: number;
}

export interface SessionsStore {
  [sessionKey: string]: {
    sessionId: string;
    updatedAt?: number;
    [key: string]: unknown;
  };
}

/**
 * Validate and normalize an environment variable path.
 * Returns null if the path is invalid (empty, whitespace-only, or non-absolute after resolve).
 */
function validateEnvPath(envValue: string | undefined): string | null {
  if (!envValue) return null;
  const trimmed = envValue.trim();
  if (!trimmed) return null;
  
  const resolved = path.resolve(trimmed);
  // Require absolute paths to avoid cwd-dependent behavior
  if (!path.isAbsolute(resolved)) return null;
  
  return resolved;
}

/**
 * Get the OpenClaw home directory (respects OPENCLAW_HOME env var)
 */
export function getOpenClawDir(): string {
  const customHome = validateEnvPath(process.env.OPENCLAW_HOME);
  if (customHome) {
    return customHome;
  }
  return path.join(os.homedir(), '.openclaw');
}

/**
 * Get the OpenClaw agents directory (respects OPENCLAW_STATE_DIR and OPENCLAW_HOME)
 */
export function getOpenClawAgentsDir(): string {
  const stateDir = validateEnvPath(process.env.OPENCLAW_STATE_DIR);
  if (stateDir) {
    return path.join(stateDir, 'agents');
  }
  return path.join(getOpenClawDir(), 'agents');
}

/**
 * Get the sessions directory for an agent
 */
export function getSessionsDir(agentId: string): string {
  return path.join(getOpenClawAgentsDir(), agentId, 'sessions');
}

/**
 * Get the path to sessions.json for an agent
 */
export function getSessionsJsonPath(agentId: string): string {
  return path.join(getSessionsDir(agentId), 'sessions.json');
}

/**
 * Get the path to a session JSONL file
 */
export function getSessionFilePath(agentId: string, sessionId: string): string {
  return path.join(getSessionsDir(agentId), `${sessionId}.jsonl`);
}

/**
 * List all available agents
 */
export function listAgents(): string[] {
  const agentsDir = getOpenClawAgentsDir();
  
  try {
    if (!fs.existsSync(agentsDir)) {
      return [];
    }
    
    const stat = fs.statSync(agentsDir);
    if (!stat.isDirectory()) {
      return [];
    }
    
    return fs.readdirSync(agentsDir)
      .filter(name => {
        try {
          const sessionsDir = getSessionsDir(name);
          return fs.existsSync(sessionsDir) && fs.statSync(sessionsDir).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

/**
 * Load sessions.json for an agent
 */
export function loadSessionsStore(agentId: string): SessionsStore | null {
  const sessionsJsonPath = getSessionsJsonPath(agentId);
  if (!fs.existsSync(sessionsJsonPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(sessionsJsonPath, 'utf-8');
    return JSON.parse(content) as SessionsStore;
  } catch {
    return null;
  }
}

/**
 * Find the current/main session for an agent
 */
export function findMainSession(agentId: string): SessionInfo | null {
  const store = loadSessionsStore(agentId);
  if (!store) return null;
  
  // Look for the main session key pattern
  const mainKey = `agent:${agentId}:main`;
  const entry = store[mainKey];
  
  if (entry?.sessionId) {
    const filePath = getSessionFilePath(agentId, entry.sessionId);
    if (fs.existsSync(filePath)) {
      return {
        sessionId: entry.sessionId,
        sessionKey: mainKey,
        agentId,
        filePath,
        updatedAt: entry.updatedAt
      };
    }
  }
  
  return null;
}

/**
 * Find a session by ID
 */
export function findSessionById(agentId: string, sessionId: string): SessionInfo | null {
  const filePath = getSessionFilePath(agentId, sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const store = loadSessionsStore(agentId);
  let sessionKey: string | undefined;
  let updatedAt: number | undefined;
  
  if (store) {
    for (const [key, entry] of Object.entries(store)) {
      if (entry.sessionId === sessionId) {
        sessionKey = key;
        updatedAt = entry.updatedAt;
        break;
      }
    }
  }
  
  return {
    sessionId,
    sessionKey: sessionKey || `agent:${agentId}:unknown`,
    agentId,
    filePath,
    updatedAt
  };
}

/**
 * List all sessions for an agent
 */
export function listSessions(agentId: string): SessionInfo[] {
  const sessionsDir = getSessionsDir(agentId);
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  
  const store = loadSessionsStore(agentId);
  const sessions: SessionInfo[] = [];
  
  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith('.jsonl') && !f.includes('.backup') && !f.includes('.deleted') && !f.includes('.corrupted'));
  
  for (const file of files) {
    const sessionId = file.replace('.jsonl', '');
    const filePath = path.join(sessionsDir, file);
    
    let sessionKey = `agent:${agentId}:unknown`;
    let updatedAt: number | undefined;
    
    if (store) {
      for (const [key, entry] of Object.entries(store)) {
        if (entry.sessionId === sessionId) {
          sessionKey = key;
          updatedAt = entry.updatedAt;
          break;
        }
      }
    }
    
    sessions.push({
      sessionId,
      sessionKey,
      agentId,
      filePath,
      updatedAt
    });
  }
  
  return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Create a backup of a session file
 */
export function backupSession(filePath: string): string {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '-')
    .slice(0, 15);
  
  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

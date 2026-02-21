/**
 * repair-session command - Repair corrupted OpenClaw session transcripts
 * 
 * Fixes issues like:
 * - Aborted tool calls with partial JSON
 * - Orphaned tool_result messages referencing non-existent tool_use IDs
 * - Broken parent chain references
 */

import * as fs from 'fs';
import {
  listAgents,
  findMainSession,
  findSessionById,
  getSessionFilePath,
  type SessionInfo
} from '../lib/session-utils.js';

import {
  analyzeSession,
  repairSession,
  type RepairResult
} from '../lib/session-repair.js';

export interface RepairSessionOptions {
  sessionId?: string;
  agentId?: string;
  backup?: boolean;
  dryRun?: boolean;
}

/**
 * Resolve the session to repair
 */
export function resolveSession(options: RepairSessionOptions): SessionInfo | null {
  const { sessionId, agentId } = options;
  
  // If we have both session ID and agent ID, look up directly
  if (sessionId && agentId) {
    return findSessionById(agentId, sessionId);
  }
  
  // If we only have session ID, search all agents
  if (sessionId) {
    const agents = listAgents();
    for (const agent of agents) {
      const session = findSessionById(agent, sessionId);
      if (session) return session;
    }
    return null;
  }
  
  // If we only have agent ID, get main session
  if (agentId) {
    return findMainSession(agentId);
  }
  
  // Default: try to find a configured agent from environment
  const defaultAgent = process.env.OPENCLAW_AGENT_ID || 'clawdious';
  return findMainSession(defaultAgent);
}

/**
 * Format repair result for CLI output
 */
export function formatRepairResult(result: RepairResult, options: { dryRun?: boolean } = {}): string {
  const { dryRun = false } = options;
  const lines: string[] = [];
  
  lines.push(`Analyzing session: ${result.sessionId}`);
  lines.push('');
  
  if (result.corruptedEntries.length === 0) {
    lines.push('✅ No corruption detected. Session is clean.');
    return lines.join('\n');
  }
  
  if (dryRun) {
    lines.push(`Found ${result.corruptedEntries.length} corrupted entries:`);
  } else {
    lines.push(`Found and fixed ${result.corruptedEntries.length} corrupted entries:`);
  }
  
  for (const entry of result.corruptedEntries) {
    const prefix = entry.type === 'aborted_tool_use' ? 'Aborted tool_use' : 'Orphaned tool_result';
    lines.push(`  - Line ${entry.lineNumber}: ${prefix} (id: ${entry.toolUseId})`);
  }
  
  if (result.parentRelinks.length > 0) {
    lines.push('');
    if (dryRun) {
      lines.push(`Would relink ${result.parentRelinks.length} parent reference(s):`);
    } else {
      lines.push(`Relinked ${result.parentRelinks.length} parent reference(s):`);
    }
    for (const relink of result.parentRelinks.slice(0, 5)) {
      lines.push(`  - Line ${relink.lineNumber}: parentId ${relink.oldParentId.slice(0, 8)}… → ${relink.newParentId === 'null' ? 'null' : relink.newParentId.slice(0, 8)}…`);
    }
    if (result.parentRelinks.length > 5) {
      lines.push(`  ... and ${result.parentRelinks.length - 5} more`);
    }
  }
  
  lines.push('');
  
  if (dryRun) {
    lines.push(`Would remove ${result.removedCount} entries, relink ${result.relinkedCount} parent references.`);
  } else {
    lines.push(`✅ Session repaired: removed ${result.removedCount} entries, relinked ${result.relinkedCount} parent references`);
    if (result.backupPath) {
      const backupName = result.backupPath.split('/').pop();
      lines.push(`Backup saved: ${backupName}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Main repair-session command handler
 */
export async function repairSessionCommand(options: RepairSessionOptions): Promise<RepairResult> {
  const { backup = true, dryRun = false } = options;
  
  const session = resolveSession(options);
  
  if (!session) {
    throw new Error(
      options.sessionId
        ? `Session not found: ${options.sessionId}`
        : options.agentId
          ? `No main session found for agent: ${options.agentId}`
          : 'No session found. Specify --session or --agent.'
    );
  }
  
  if (!fs.existsSync(session.filePath)) {
    throw new Error(`Session file not found: ${session.filePath}`);
  }
  
  if (dryRun) {
    return analyzeSession(session.filePath);
  }
  
  return repairSession(session.filePath, { backup, dryRun: false });
}

/**
 * List available sessions for an agent (for --list flag)
 */
export function listAgentSessions(agentId?: string): string {
  const agents = agentId ? [agentId] : listAgents();
  const lines: string[] = [];
  
  if (agents.length === 0) {
    return 'No agents found in ~/.openclaw/agents/';
  }
  
  for (const agent of agents) {
    const mainSession = findMainSession(agent);
    if (mainSession) {
      lines.push(`${agent}:`);
      lines.push(`  Main session: ${mainSession.sessionId}`);
      lines.push(`  File: ${mainSession.filePath}`);
      if (mainSession.updatedAt) {
        const date = new Date(mainSession.updatedAt);
        lines.push(`  Updated: ${date.toISOString()}`);
      }
      lines.push('');
    }
  }
  
  if (lines.length === 0) {
    return agentId
      ? `No sessions found for agent: ${agentId}`
      : 'No sessions found.';
  }
  
  return lines.join('\n');
}

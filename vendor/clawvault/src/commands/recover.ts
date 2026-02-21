/**
 * Recovery command - detect dirty death and provide recovery info
 */

import * as fs from 'fs';
import * as path from 'path';
import { checkDirtyDeath, clearDirtyFlag, CheckpointData } from './checkpoint.js';
import { formatAge } from '../lib/time.js';

const CLAWVAULT_DIR = '.clawvault';
const CHECKPOINT_FILE = 'last-checkpoint.json';
const CHECKPOINT_HISTORY_DIR = 'checkpoints';

export interface RecoveryInfo {
  died: boolean;
  deathTime: string | null;
  checkpoint: CheckpointData | null;
  handoffPath: string | null;
  handoffContent: string | null;
  recoveryMessage: string;
}

export interface RecoveryCheckInfo {
  died: boolean;
  deathTime: string | null;
  checkpoint: CheckpointData | null;
}

export interface ListedCheckpoint extends CheckpointData {
  filePath: string;
}

function parseCheckpointFile(filePath: string): CheckpointData | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const timestamp = typeof record.timestamp === 'string' ? record.timestamp.trim() : '';
    if (!timestamp) {
      return null;
    }
    const checkpoint: CheckpointData = {
      timestamp,
      workingOn: typeof record.workingOn === 'string' ? record.workingOn : null,
      focus: typeof record.focus === 'string' ? record.focus : null,
      blocked: typeof record.blocked === 'string' ? record.blocked : null
    };
    if (typeof record.sessionId === 'string') {
      checkpoint.sessionId = record.sessionId;
    }
    if (typeof record.sessionKey === 'string') {
      checkpoint.sessionKey = record.sessionKey;
    }
    if (typeof record.model === 'string') {
      checkpoint.model = record.model;
    }
    if (typeof record.tokenEstimate === 'number' && Number.isFinite(record.tokenEstimate)) {
      checkpoint.tokenEstimate = record.tokenEstimate;
    }
    if (typeof record.sessionStartedAt === 'string') {
      checkpoint.sessionStartedAt = record.sessionStartedAt;
    }
    if (typeof record.urgent === 'boolean') {
      checkpoint.urgent = record.urgent;
    }
    return checkpoint;
  } catch {
    return null;
  }
}

function compareByTimestampDesc(left: ListedCheckpoint, right: ListedCheckpoint): number {
  const leftTime = Date.parse(left.timestamp);
  const rightTime = Date.parse(right.timestamp);
  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return rightTime - leftTime;
  }
  return right.timestamp.localeCompare(left.timestamp);
}

export async function checkRecoveryStatus(vaultPath: string): Promise<RecoveryCheckInfo> {
  const { died, checkpoint, deathTime } = await checkDirtyDeath(vaultPath);
  return { died, checkpoint, deathTime };
}

export function listCheckpoints(vaultPath: string): ListedCheckpoint[] {
  const resolvedVaultPath = path.resolve(vaultPath);
  const clawvaultDir = path.join(resolvedVaultPath, CLAWVAULT_DIR);
  const historyDir = path.join(clawvaultDir, CHECKPOINT_HISTORY_DIR);
  const checkpoints: ListedCheckpoint[] = [];

  if (fs.existsSync(historyDir)) {
    const files = fs.readdirSync(historyDir)
      .filter((entry) => entry.endsWith('.json'))
      .sort()
      .reverse();
    for (const fileName of files) {
      const absolutePath = path.join(historyDir, fileName);
      const parsed = parseCheckpointFile(absolutePath);
      if (!parsed) {
        continue;
      }
      checkpoints.push({
        ...parsed,
        filePath: absolutePath
      });
    }
  }

  if (checkpoints.length === 0) {
    const latestCheckpointPath = path.join(clawvaultDir, CHECKPOINT_FILE);
    if (fs.existsSync(latestCheckpointPath)) {
      const fallback = parseCheckpointFile(latestCheckpointPath);
      if (fallback) {
        checkpoints.push({
          ...fallback,
          filePath: latestCheckpointPath
        });
      }
    }
  }

  return checkpoints.sort(compareByTimestampDesc);
}

export async function recover(
  vaultPath: string,
  options: { clearFlag?: boolean; verbose?: boolean } = {}
): Promise<RecoveryInfo> {
  const { clearFlag = false } = options;
  const { died, checkpoint, deathTime } = await checkRecoveryStatus(vaultPath);
  
  if (!died) {
    return {
      died: false,
      deathTime: null,
      checkpoint: null,
      handoffPath: null,
      handoffContent: null,
      recoveryMessage: 'No context death detected. Clean startup.'
    };
  }
  
  // Find most recent handoff
  const handoffsDir = path.join(vaultPath, 'handoffs');
  let handoffPath: string | null = null;
  let handoffContent: string | null = null;
  
  if (fs.existsSync(handoffsDir)) {
    const files = fs.readdirSync(handoffsDir)
      .filter(f => f.startsWith('handoff-') && f.endsWith('.md'))
      .sort()
      .reverse();
    
    if (files.length > 0) {
      handoffPath = path.join(handoffsDir, files[0]);
      handoffContent = fs.readFileSync(handoffPath, 'utf-8');
    }
  }
  
  // Build recovery message
  let message = '⚠️ **CONTEXT DEATH DETECTED**\n\n';
  message += `Your previous session died at ${deathTime}.\n\n`;
  
  if (checkpoint) {
    message += '**Last known state:**\n';
    if (checkpoint.workingOn) {
      message += `- Working on: ${checkpoint.workingOn}\n`;
    }
    if (checkpoint.focus) {
      message += `- Focus: ${checkpoint.focus}\n`;
    }
    if (checkpoint.blocked) {
      message += `- Blocked: ${checkpoint.blocked}\n`;
    }
    message += '\n';
  }
  
  if (handoffPath) {
    message += `**Last handoff:** ${path.basename(handoffPath)}\n`;
    message += 'Review and resume from where you left off.\n';
  } else {
    message += '**No handoff found.** You may have lost context.\n';
  }
  
  // Clear the flag if requested
  if (clearFlag) {
    await clearDirtyFlag(vaultPath);
  }
  
  return {
    died: true,
    deathTime,
    checkpoint,
    handoffPath,
    handoffContent,
    recoveryMessage: message
  };
}

export function formatRecoveryCheckStatus(info: RecoveryCheckInfo): string {
  if (!info.died) {
    return '✓ Dirty death flag is clear.';
  }

  let output = '⚠️ Dirty death flag is set.\n';
  output += `Death time: ${info.deathTime}\n`;
  if (info.checkpoint?.timestamp) {
    const age = formatAge(Date.now() - new Date(info.checkpoint.timestamp).getTime());
    output += `Last checkpoint: ${info.checkpoint.timestamp} (${age} ago)\n`;
  } else {
    output += 'Last checkpoint: unavailable\n';
  }
  output += 'Use `clawvault recover --clear` after reviewing recovery details.';
  return output;
}

export function formatCheckpointList(checkpoints: ListedCheckpoint[]): string {
  if (checkpoints.length === 0) {
    return 'No checkpoints found.';
  }

  const headers = ['TIMESTAMP', 'WORKING_ON', 'FOCUS', 'FILE'];
  const rows = checkpoints.map((checkpoint) => ({
    timestamp: checkpoint.timestamp,
    workingOn: checkpoint.workingOn ?? '-',
    focus: checkpoint.focus ?? '-',
    file: path.basename(checkpoint.filePath)
  }));

  const timestampWidth = Math.max(headers[0].length, ...rows.map((row) => row.timestamp.length));
  const workingOnWidth = Math.max(headers[1].length, ...rows.map((row) => row.workingOn.length));
  const focusWidth = Math.max(headers[2].length, ...rows.map((row) => row.focus.length));
  const fileWidth = Math.max(headers[3].length, ...rows.map((row) => row.file.length));

  const lines: string[] = [];
  lines.push(
    `${headers[0].padEnd(timestampWidth)}  ${headers[1].padEnd(workingOnWidth)}  ${headers[2].padEnd(focusWidth)}  ${headers[3].padEnd(fileWidth)}`
  );
  lines.push(
    `${'-'.repeat(timestampWidth)}  ${'-'.repeat(workingOnWidth)}  ${'-'.repeat(focusWidth)}  ${'-'.repeat(fileWidth)}`
  );
  for (const row of rows) {
    lines.push(
      `${row.timestamp.padEnd(timestampWidth)}  ${row.workingOn.padEnd(workingOnWidth)}  ${row.focus.padEnd(focusWidth)}  ${row.file}`
    );
  }
  return lines.join('\n');
}

/**
 * Format recovery info for CLI output
 */
export function formatRecoveryInfo(info: RecoveryInfo, options: { verbose?: boolean } = {}): string {
  const { verbose = false } = options;
  if (!info.died) {
    return '✓ Clean startup - no context death detected.';
  }
  
  let output = '\n⚠️  CONTEXT DEATH DETECTED\n';
  output += '═'.repeat(40) + '\n\n';
  output += `Death time: ${info.deathTime}\n`;
  if (info.checkpoint?.timestamp) {
    const age = formatAge(Date.now() - new Date(info.checkpoint.timestamp).getTime());
    output += `Checkpoint: ${info.checkpoint.timestamp} (${age} ago)\n`;
  }
  output += '\n';
  
  if (info.checkpoint) {
    output += 'Last checkpoint:\n';
    if (info.checkpoint.workingOn) {
      output += `  • Working on: ${info.checkpoint.workingOn}\n`;
    }
    if (info.checkpoint.focus) {
      output += `  • Focus: ${info.checkpoint.focus}\n`;
    }
    if (info.checkpoint.blocked) {
      output += `  • Blocked: ${info.checkpoint.blocked}\n`;
    }
    if (info.checkpoint.sessionKey || info.checkpoint.model || info.checkpoint.tokenEstimate !== undefined) {
      output += '  • Session:\n';
      if (info.checkpoint.sessionKey) {
        output += `    - Key: ${info.checkpoint.sessionKey}\n`;
      }
      if (info.checkpoint.model) {
        output += `    - Model: ${info.checkpoint.model}\n`;
      }
      if (info.checkpoint.tokenEstimate !== undefined) {
        output += `    - Token estimate: ${info.checkpoint.tokenEstimate}\n`;
      }
    }
    output += '\n';
  } else {
    output += 'No checkpoint data found.\n\n';
  }
  
  if (info.handoffPath) {
    output += `Last handoff: ${path.basename(info.handoffPath)}\n`;
  } else {
    output += 'No handoff found - context may be lost.\n';
  }
  
  if (verbose) {
    if (info.checkpoint) {
      output += '\nCheckpoint JSON:\n';
      output += JSON.stringify(info.checkpoint, null, 2) + '\n';
    }
    if (info.handoffContent) {
      output += '\nHandoff content:\n';
      output += info.handoffContent.trim() + '\n';
    }
  }

  output += '\n' + '═'.repeat(40) + '\n';
  output += 'Run `clawvault recap` to see full context.\n';
  
  return output;
}

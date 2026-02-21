/**
 * Vault statistics collection utilities for ClawVault
 * Gathers operational stats about vault usage for dashboard display
 */

import * as fs from 'fs';
import * as path from 'path';
import { listTasks, type TaskStatus } from './task-utils.js';
import {
  listObservationFiles,
  getReflectionsRoot,
  getRawRoot,
  getLedgerRoot
} from './ledger.js';

/**
 * Vault statistics interface
 */
export interface VaultStats {
  observations: {
    total: number;
    firstDate: string | null;
    latestDate: string | null;
    avgPerDay: number;
  };
  reflections: {
    total: number;
    latestDate: string | null;
    weeksCovered: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    blocked: number;
    completed: number;
    completionRate: number; // 0-100
  };
  sessions: {
    checkpoints: number;
    handoffs: number;
    lastCheckpoint: string | null;
  };
  documents: {
    total: number;
    byCategory: Record<string, number>;
    inboxPending: number;
  };
  ledger: {
    rawTranscripts: number;
    totalLedgerSizeMB: number;
  };
}

/**
 * Count markdown files in a directory (non-recursive)
 */
function countMarkdownFiles(dirPath: string): number {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter(e => e.isFile() && e.name.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

/**
 * Count files recursively in a directory with optional extension filter
 */
function countFilesRecursive(dirPath: string, extension?: string): number {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let count = 0;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        count += countFilesRecursive(fullPath, extension);
      } else if (entry.isFile()) {
        if (!extension || entry.name.endsWith(extension)) {
          count++;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return count;
}

/**
 * Get total size of files in a directory (recursive) in bytes
 */
function getDirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let totalSize = 0;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += getDirSizeBytes(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          totalSize += stat.size;
        } catch {
          // Ignore stat errors
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Parse week number from reflection filename
 * Supports formats like: 2026-W07.md, week-07.md, W07.md
 */
function parseWeekFromFilename(filename: string): { year?: number; week?: number } | null {
  // Match YYYY-Www format
  const isoMatch = filename.match(/(\d{4})-W(\d{2})/i);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), week: parseInt(isoMatch[2], 10) };
  }

  // Match week-NN or WNN format
  const weekMatch = filename.match(/(?:week-?)?W?(\d{2})/i);
  if (weekMatch) {
    return { week: parseInt(weekMatch[1], 10) };
  }

  return null;
}

/**
 * Collect reflection statistics
 */
function collectReflectionStats(vaultPath: string): VaultStats['reflections'] {
  const reflectionsRoot = getReflectionsRoot(vaultPath);
  
  if (!fs.existsSync(reflectionsRoot)) {
    return { total: 0, latestDate: null, weeksCovered: 0 };
  }

  const reflectionFiles: string[] = [];
  const weeks = new Set<string>();

  // Walk the reflections directory
  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          reflectionFiles.push(entry.name);
          const weekInfo = parseWeekFromFilename(entry.name);
          if (weekInfo) {
            const weekKey = weekInfo.year 
              ? `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`
              : `W${String(weekInfo.week).padStart(2, '0')}`;
            weeks.add(weekKey);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  walkDir(reflectionsRoot);

  // Sort to find latest
  reflectionFiles.sort();
  const latestFile = reflectionFiles[reflectionFiles.length - 1];
  let latestDate: string | null = null;
  
  if (latestFile) {
    const weekInfo = parseWeekFromFilename(latestFile);
    if (weekInfo?.year && weekInfo?.week) {
      latestDate = `Week ${String(weekInfo.week).padStart(2, '0')} (${weekInfo.year})`;
    } else if (weekInfo?.week) {
      latestDate = `Week ${String(weekInfo.week).padStart(2, '0')}`;
    }
  }

  return {
    total: reflectionFiles.length,
    latestDate,
    weeksCovered: weeks.size
  };
}

/**
 * Collect task statistics
 */
function collectTaskStats(vaultPath: string): VaultStats['tasks'] {
  const tasks = listTasks(vaultPath);
  
  const statusCounts: Record<TaskStatus, number> = {
    'open': 0,
    'in-progress': 0,
    'blocked': 0,
    'done': 0
  };

  for (const task of tasks) {
    const status = task.frontmatter.status;
    if (status in statusCounts) {
      statusCounts[status]++;
    }
  }

  const total = tasks.length;
  const completed = statusCounts['done'];
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    open: statusCounts['open'],
    inProgress: statusCounts['in-progress'],
    blocked: statusCounts['blocked'],
    completed,
    completionRate
  };
}

/**
 * Collect session statistics (checkpoints and handoffs)
 */
function collectSessionStats(vaultPath: string): VaultStats['sessions'] {
  const resolvedPath = path.resolve(vaultPath);
  let checkpoints = 0;
  let handoffs = 0;
  let lastCheckpoint: string | null = null;

  // Check .clawvault directory for checkpoint
  const clawvaultDir = path.join(resolvedPath, '.clawvault');
  const checkpointFile = path.join(clawvaultDir, 'last-checkpoint.json');
  
  if (fs.existsSync(checkpointFile)) {
    checkpoints = 1;
    try {
      const checkpointData = JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
      if (checkpointData.timestamp) {
        lastCheckpoint = checkpointData.timestamp.split('T')[0];
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Count handoff files in handoffs directory
  const handoffsDir = path.join(resolvedPath, 'handoffs');
  if (fs.existsSync(handoffsDir)) {
    handoffs = countMarkdownFiles(handoffsDir);
  }

  // Also check for checkpoint/handoff files in root
  try {
    const rootEntries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.includes('checkpoint')) {
          checkpoints++;
        }
        if (lowerName.includes('handoff')) {
          handoffs++;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return {
    checkpoints,
    handoffs,
    lastCheckpoint
  };
}

/**
 * Collect document statistics by category
 */
function collectDocumentStats(vaultPath: string): VaultStats['documents'] {
  const resolvedPath = path.resolve(vaultPath);
  const byCategory: Record<string, number> = {};
  let total = 0;
  let inboxPending = 0;

  // Known category directories to check
  const categoryDirs = [
    'preferences', 'decisions', 'patterns', 'people', 'projects',
    'goals', 'transcripts', 'inbox', 'templates', 'facts', 'feelings',
    'lessons', 'commitments', 'handoffs', 'research', 'agents'
  ];

  for (const category of categoryDirs) {
    const categoryPath = path.join(resolvedPath, category);
    const count = countMarkdownFiles(categoryPath);
    if (count > 0) {
      byCategory[category] = count;
      total += count;
      
      if (category === 'inbox') {
        inboxPending = count;
      }
    }
  }

  // Also check for any other directories that might be categories
  try {
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && 
          !entry.name.startsWith('.') && 
          !entry.name.startsWith('_') &&
          !categoryDirs.includes(entry.name) &&
          !['ledger', 'tasks', 'backlog', 'node_modules'].includes(entry.name)) {
        const categoryPath = path.join(resolvedPath, entry.name);
        const count = countMarkdownFiles(categoryPath);
        if (count > 0) {
          byCategory[entry.name] = count;
          total += count;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return {
    total,
    byCategory,
    inboxPending
  };
}

/**
 * Collect ledger statistics (raw transcripts and size)
 */
function collectLedgerStats(vaultPath: string): VaultStats['ledger'] {
  const rawRoot = getRawRoot(vaultPath);
  const ledgerRoot = getLedgerRoot(vaultPath);

  const rawTranscripts = countFilesRecursive(rawRoot, '.jsonl');
  const totalSizeBytes = getDirSizeBytes(ledgerRoot);
  const totalLedgerSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

  return {
    rawTranscripts,
    totalLedgerSizeMB
  };
}

/**
 * Collect all vault statistics
 */
export function collectVaultStats(vaultPath: string): VaultStats {
  const resolvedPath = path.resolve(vaultPath);

  // Observations
  const observationFiles = listObservationFiles(resolvedPath, { 
    includeLegacy: true, 
    includeArchive: false 
  });
  
  const observationsTotal = observationFiles.length;
  const firstDate = observationFiles.length > 0 ? observationFiles[0].date : null;
  const latestDate = observationFiles.length > 0 ? observationFiles[observationFiles.length - 1].date : null;
  
  // Calculate average per day
  let avgPerDay = 0;
  if (firstDate && latestDate && observationsTotal > 0) {
    const firstMs = new Date(firstDate).getTime();
    const latestMs = new Date(latestDate).getTime();
    const daySpan = Math.max(1, Math.ceil((latestMs - firstMs) / (1000 * 60 * 60 * 24)) + 1);
    avgPerDay = Math.round((observationsTotal / daySpan) * 10) / 10;
  }

  return {
    observations: {
      total: observationsTotal,
      firstDate,
      latestDate,
      avgPerDay
    },
    reflections: collectReflectionStats(resolvedPath),
    tasks: collectTaskStats(resolvedPath),
    sessions: collectSessionStats(resolvedPath),
    documents: collectDocumentStats(resolvedPath),
    ledger: collectLedgerStats(resolvedPath)
  };
}

/**
 * Format a date range string (e.g., "Feb 3 → Feb 14")
 */
export function formatDateRange(firstDate: string | null, latestDate: string | null): string {
  if (!firstDate || !latestDate) {
    return 'N/A';
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
  };

  if (firstDate === latestDate) {
    return formatDate(firstDate);
  }

  return `${formatDate(firstDate)} → ${formatDate(latestDate)}`;
}

/**
 * Format task status summary line
 */
export function formatTaskStatusLine(stats: VaultStats['tasks']): string {
  const parts: string[] = [];
  
  if (stats.completed > 0) parts.push(`✓ ${stats.completed} done`);
  if (stats.inProgress > 0) parts.push(`● ${stats.inProgress} active`);
  if (stats.open > 0) parts.push(`○ ${stats.open} open`);
  if (stats.blocked > 0) parts.push(`⊘ ${stats.blocked} blocked`);
  
  return parts.join(' | ');
}

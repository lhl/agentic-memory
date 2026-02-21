/**
 * Session transcript repair logic
 * 
 * Repairs corrupted OpenClaw session transcripts by:
 * 1. Finding aborted tool_use blocks (stopReason: "aborted", partialJson present)
 * 2. Finding orphaned tool_result messages that reference non-existent tool_use IDs
 * 3. Removing both the aborted entries and orphaned results
 * 4. Relinking parent chain references
 */

import * as fs from 'fs';

export interface TranscriptEntry {
  type: 'session' | 'message' | 'compaction' | 'custom' | 'thinking_level_change' | string;
  id: string;
  parentId: string | null;
  timestamp: string;
  message?: {
    role: 'user' | 'assistant' | 'toolResult' | 'system';
    content: Array<{
      type: string;
      id?: string;
      name?: string;
      arguments?: unknown;
      toolCallId?: string;
      toolUseId?: string;
      partialJson?: string;
      text?: string;
    }>;
    stopReason?: string;
    errorMessage?: string;
  };
  summary?: string;
  customType?: string;
  data?: unknown;
  thinkingLevel?: string;
}

export interface ToolUseInfo {
  id: string;
  lineNumber: number;
  entryId: string;
  isAborted: boolean;
  isPartial: boolean;
  name?: string;
}

export interface CorruptedEntry {
  lineNumber: number;
  entryId: string;
  type: 'aborted_tool_use' | 'orphaned_tool_result';
  toolUseId: string;
  description: string;
}

export interface ParentRelink {
  lineNumber: number;
  entryId: string;
  oldParentId: string;
  newParentId: string;
}

export interface RepairResult {
  sessionId: string;
  totalLines: number;
  corruptedEntries: CorruptedEntry[];
  parentRelinks: ParentRelink[];
  removedCount: number;
  relinkedCount: number;
  backupPath?: string;
  repaired: boolean;
}

/**
 * Parse a JSONL file into transcript entries with line numbers
 */
export function parseTranscript(filePath: string): Array<{ line: number; entry: TranscriptEntry; raw: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const entries: Array<{ line: number; entry: TranscriptEntry; raw: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    try {
      const entry = JSON.parse(raw) as TranscriptEntry;
      entries.push({ line: i + 1, entry, raw });
    } catch {
      // Skip malformed lines
      console.warn(`Warning: Could not parse line ${i + 1}`);
    }
  }
  
  return entries;
}

/**
 * Extract all tool_use IDs from assistant messages
 */
export function extractToolUses(
  entries: Array<{ line: number; entry: TranscriptEntry }>
): Map<string, ToolUseInfo> {
  const toolUses = new Map<string, ToolUseInfo>();
  
  for (const { line, entry } of entries) {
    if (entry.type !== 'message') continue;
    if (entry.message?.role !== 'assistant') continue;
    
    const isAborted = entry.message.stopReason === 'aborted';
    const content = entry.message.content || [];
    
    for (const block of content) {
      // Check for various tool call block types
      if (block.type === 'toolCall' || block.type === 'tool_use' || block.type === 'functionCall') {
        if (block.id) {
          const isPartial = !!block.partialJson;
          toolUses.set(block.id, {
            id: block.id,
            lineNumber: line,
            entryId: entry.id,
            isAborted: isAborted || isPartial,
            isPartial,
            name: block.name
          });
        }
      }
    }
  }
  
  return toolUses;
}

/**
 * Find orphaned tool_result messages that reference non-existent or aborted tool_use IDs
 */
export function findCorruptedEntries(
  entries: Array<{ line: number; entry: TranscriptEntry }>,
  toolUses: Map<string, ToolUseInfo>
): {
  corrupted: CorruptedEntry[];
  entriesToRemove: Set<string>;
} {
  const corrupted: CorruptedEntry[] = [];
  const entriesToRemove = new Set<string>();
  
  // First, mark aborted tool_uses for removal
  for (const [toolId, info] of toolUses) {
    if (info.isAborted) {
      corrupted.push({
        lineNumber: info.lineNumber,
        entryId: info.entryId,
        type: 'aborted_tool_use',
        toolUseId: toolId,
        description: `Aborted tool_use${info.name ? ` (${info.name})` : ''} with id: ${toolId}`
      });
      entriesToRemove.add(info.entryId);
    }
  }
  
  // Find orphaned tool_results
  for (const { line, entry } of entries) {
    if (entry.type !== 'message') continue;
    if (entry.message?.role !== 'toolResult') continue;
    
    // Get the tool_use ID this result references
    const content = entry.message.content || [];
    let toolCallId: string | undefined;
    
    // Check the message-level toolCallId (common pattern)
    const msg = entry.message as { toolCallId?: string; toolUseId?: string };
    toolCallId = msg.toolCallId || msg.toolUseId;
    
    // Also check content blocks for toolCallId
    if (!toolCallId) {
      for (const block of content) {
        if (block.toolCallId || block.toolUseId) {
          toolCallId = block.toolCallId || block.toolUseId;
          break;
        }
      }
    }
    
    if (!toolCallId) continue;
    
    // Check if the referenced tool_use exists and is valid
    const toolUse = toolUses.get(toolCallId);
    
    if (!toolUse || toolUse.isAborted) {
      corrupted.push({
        lineNumber: line,
        entryId: entry.id,
        type: 'orphaned_tool_result',
        toolUseId: toolCallId,
        description: toolUse
          ? `Orphaned tool_result references aborted tool_use: ${toolCallId}`
          : `Orphaned tool_result references non-existent tool_use: ${toolCallId}`
      });
      entriesToRemove.add(entry.id);
    }
  }
  
  return { corrupted, entriesToRemove };
}

/**
 * Compute parent chain relinks after removing entries
 */
export function computeParentRelinks(
  entries: Array<{ line: number; entry: TranscriptEntry }>,
  entriesToRemove: Set<string>
): ParentRelink[] {
  const relinks: ParentRelink[] = [];
  
  // Build a map of entry ID to its parent ID
  const entryParents = new Map<string, string | null>();
  for (const { entry } of entries) {
    entryParents.set(entry.id, entry.parentId);
  }
  
  // For each entry that references a removed entry as parent, find the next valid ancestor
  for (const { line, entry } of entries) {
    if (entriesToRemove.has(entry.id)) continue; // Skip entries being removed
    if (!entry.parentId) continue;
    if (!entriesToRemove.has(entry.parentId)) continue; // Parent is valid
    
    // Find the next valid ancestor
    let newParentId: string | null = entry.parentId;
    while (newParentId && entriesToRemove.has(newParentId)) {
      newParentId = entryParents.get(newParentId) || null;
    }
    
    if (newParentId !== entry.parentId) {
      relinks.push({
        lineNumber: line,
        entryId: entry.id,
        oldParentId: entry.parentId,
        newParentId: newParentId || 'null'
      });
    }
  }
  
  return relinks;
}

/**
 * Analyze a session transcript for corruption without modifying it
 */
export function analyzeSession(filePath: string): RepairResult {
  const entries = parseTranscript(filePath);
  
  // Extract session ID from first entry
  const sessionEntry = entries.find(e => e.entry.type === 'session');
  const sessionId = sessionEntry?.entry.id || 'unknown';
  
  const toolUses = extractToolUses(entries);
  const { corrupted, entriesToRemove } = findCorruptedEntries(entries, toolUses);
  const parentRelinks = computeParentRelinks(entries, entriesToRemove);
  
  return {
    sessionId,
    totalLines: entries.length,
    corruptedEntries: corrupted,
    parentRelinks,
    removedCount: entriesToRemove.size,
    relinkedCount: parentRelinks.length,
    repaired: false
  };
}

/**
 * Repair a session transcript
 */
export function repairSession(
  filePath: string,
  options: { backup?: boolean; dryRun?: boolean } = {}
): RepairResult {
  const { backup = true, dryRun = false } = options;
  
  const entries = parseTranscript(filePath);
  
  // Extract session ID from first entry
  const sessionEntry = entries.find(e => e.entry.type === 'session');
  const sessionId = sessionEntry?.entry.id || 'unknown';
  
  const toolUses = extractToolUses(entries);
  const { corrupted, entriesToRemove } = findCorruptedEntries(entries, toolUses);
  const parentRelinks = computeParentRelinks(entries, entriesToRemove);
  
  if (corrupted.length === 0) {
    return {
      sessionId,
      totalLines: entries.length,
      corruptedEntries: [],
      parentRelinks: [],
      removedCount: 0,
      relinkedCount: 0,
      repaired: false
    };
  }
  
  if (dryRun) {
    return {
      sessionId,
      totalLines: entries.length,
      corruptedEntries: corrupted,
      parentRelinks,
      removedCount: entriesToRemove.size,
      relinkedCount: parentRelinks.length,
      repaired: false
    };
  }
  
  // Create backup if requested
  let backupPath: string | undefined;
  if (backup) {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '-')
      .slice(0, 15);
    backupPath = `${filePath}.backup-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
  }
  
  // Build relink map for quick lookup
  const relinkMap = new Map<string, string | null>();
  for (const relink of parentRelinks) {
    relinkMap.set(relink.entryId, relink.newParentId === 'null' ? null : relink.newParentId);
  }
  
  // Write repaired transcript
  const repairedLines: string[] = [];
  
  for (const { entry, raw } of entries) {
    // Skip removed entries
    if (entriesToRemove.has(entry.id)) continue;
    
    // Apply relinks if needed
    if (relinkMap.has(entry.id)) {
      const newEntry = { ...entry, parentId: relinkMap.get(entry.id) };
      repairedLines.push(JSON.stringify(newEntry));
    } else {
      repairedLines.push(raw);
    }
  }
  
  fs.writeFileSync(filePath, repairedLines.join('\n') + '\n');
  
  return {
    sessionId,
    totalLines: entries.length,
    corruptedEntries: corrupted,
    parentRelinks,
    removedCount: entriesToRemove.size,
    relinkedCount: parentRelinks.length,
    backupPath,
    repaired: true
  };
}

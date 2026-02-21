/**
 * Tests for session repair functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  parseTranscript,
  extractToolUses,
  findCorruptedEntries,
  computeParentRelinks,
  analyzeSession,
  repairSession,
  type TranscriptEntry
} from '../lib/session-repair.js';

// Test fixtures
const CLEAN_SESSION = [
  { type: 'session', version: 3, id: 'test-session-clean', timestamp: '2026-01-01T00:00:00.000Z' },
  { type: 'message', id: 'msg-1', parentId: null, timestamp: '2026-01-01T00:00:01.000Z', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
  { type: 'message', id: 'msg-2', parentId: 'msg-1', timestamp: '2026-01-01T00:00:02.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }, { type: 'toolCall', id: 'toolu_123', name: 'exec', arguments: { command: 'ls' } }], stopReason: 'toolUse' } },
  { type: 'message', id: 'msg-3', parentId: 'msg-2', timestamp: '2026-01-01T00:00:03.000Z', message: { role: 'toolResult', toolCallId: 'toolu_123', content: [{ type: 'text', text: 'file1.txt\nfile2.txt' }] } },
  { type: 'message', id: 'msg-4', parentId: 'msg-3', timestamp: '2026-01-01T00:00:04.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Found 2 files.' }], stopReason: 'stop' } }
];

const CORRUPTED_SESSION = [
  { type: 'session', version: 3, id: 'test-session-corrupted', timestamp: '2026-01-01T00:00:00.000Z' },
  { type: 'message', id: 'msg-1', parentId: null, timestamp: '2026-01-01T00:00:01.000Z', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
  // Aborted tool call with partialJson
  { type: 'message', id: 'msg-2', parentId: 'msg-1', timestamp: '2026-01-01T00:00:02.000Z', message: { role: 'assistant', content: [{ type: 'toolCall', id: 'toolu_aborted', name: 'exec', arguments: { command: 'long' }, partialJson: '{"command": "long' }], stopReason: 'aborted' } },
  // Orphaned tool result referencing aborted call
  { type: 'message', id: 'msg-3', parentId: 'msg-2', timestamp: '2026-01-01T00:00:03.000Z', message: { role: 'toolResult', toolCallId: 'toolu_aborted', content: [{ type: 'text', text: 'synthetic error' }], isError: true } },
  // Next valid message that needs relinking
  { type: 'message', id: 'msg-4', parentId: 'msg-3', timestamp: '2026-01-01T00:00:04.000Z', message: { role: 'user', content: [{ type: 'text', text: 'What happened?' }] } }
];

const ORPHAN_ONLY_SESSION = [
  { type: 'session', version: 3, id: 'test-session-orphan', timestamp: '2026-01-01T00:00:00.000Z' },
  { type: 'message', id: 'msg-1', parentId: null, timestamp: '2026-01-01T00:00:01.000Z', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
  // Orphaned tool result with no matching tool call at all
  { type: 'message', id: 'msg-2', parentId: 'msg-1', timestamp: '2026-01-01T00:00:02.000Z', message: { role: 'toolResult', toolCallId: 'toolu_nonexistent', content: [{ type: 'text', text: 'phantom result' }] } },
  { type: 'message', id: 'msg-3', parentId: 'msg-2', timestamp: '2026-01-01T00:00:03.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Continuing...' }] } }
];

function createTempSession(entries: unknown[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-test-'));
  const filePath = path.join(tmpDir, 'test-session.jsonl');
  const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanupTempSession(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('parseTranscript', () => {
  it('parses valid JSONL file', () => {
    const filePath = createTempSession(CLEAN_SESSION);
    try {
      const entries = parseTranscript(filePath);
      expect(entries).toHaveLength(5);
      expect(entries[0].entry.type).toBe('session');
      expect(entries[1].entry.id).toBe('msg-1');
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

describe('extractToolUses', () => {
  it('extracts tool_use IDs from assistant messages', () => {
    const filePath = createTempSession(CLEAN_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      
      expect(toolUses.size).toBe(1);
      expect(toolUses.has('toolu_123')).toBe(true);
      
      const info = toolUses.get('toolu_123')!;
      expect(info.name).toBe('exec');
      expect(info.isAborted).toBe(false);
      expect(info.isPartial).toBe(false);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('marks aborted tool calls correctly', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      
      expect(toolUses.size).toBe(1);
      expect(toolUses.has('toolu_aborted')).toBe(true);
      
      const info = toolUses.get('toolu_aborted')!;
      expect(info.isAborted).toBe(true);
      expect(info.isPartial).toBe(true);
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

describe('findCorruptedEntries', () => {
  it('finds no corruption in clean session', () => {
    const filePath = createTempSession(CLEAN_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      const { corrupted, entriesToRemove } = findCorruptedEntries(entries, toolUses);
      
      expect(corrupted).toHaveLength(0);
      expect(entriesToRemove.size).toBe(0);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('finds aborted tool_use and orphaned tool_result', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      const { corrupted, entriesToRemove } = findCorruptedEntries(entries, toolUses);
      
      expect(corrupted).toHaveLength(2);
      expect(corrupted[0].type).toBe('aborted_tool_use');
      expect(corrupted[1].type).toBe('orphaned_tool_result');
      expect(entriesToRemove.size).toBe(2);
      expect(entriesToRemove.has('msg-2')).toBe(true);
      expect(entriesToRemove.has('msg-3')).toBe(true);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('finds orphaned tool_result without any matching tool_use', () => {
    const filePath = createTempSession(ORPHAN_ONLY_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      const { corrupted, entriesToRemove } = findCorruptedEntries(entries, toolUses);
      
      expect(corrupted).toHaveLength(1);
      expect(corrupted[0].type).toBe('orphaned_tool_result');
      expect(corrupted[0].toolUseId).toBe('toolu_nonexistent');
      expect(entriesToRemove.size).toBe(1);
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

describe('computeParentRelinks', () => {
  it('computes correct parent relinks', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const entries = parseTranscript(filePath);
      const toolUses = extractToolUses(entries);
      const { entriesToRemove } = findCorruptedEntries(entries, toolUses);
      const relinks = computeParentRelinks(entries, entriesToRemove);
      
      // msg-4 should be relinked from msg-3 to msg-1
      expect(relinks).toHaveLength(1);
      expect(relinks[0].entryId).toBe('msg-4');
      expect(relinks[0].oldParentId).toBe('msg-3');
      expect(relinks[0].newParentId).toBe('msg-1');
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

describe('analyzeSession', () => {
  it('returns clean result for clean session', () => {
    const filePath = createTempSession(CLEAN_SESSION);
    try {
      const result = analyzeSession(filePath);
      
      expect(result.sessionId).toBe('test-session-clean');
      expect(result.corruptedEntries).toHaveLength(0);
      expect(result.parentRelinks).toHaveLength(0);
      expect(result.removedCount).toBe(0);
      expect(result.repaired).toBe(false);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('detects corruption in corrupted session', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const result = analyzeSession(filePath);
      
      expect(result.sessionId).toBe('test-session-corrupted');
      expect(result.corruptedEntries).toHaveLength(2);
      expect(result.parentRelinks).toHaveLength(1);
      expect(result.removedCount).toBe(2);
      expect(result.repaired).toBe(false);
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

describe('repairSession', () => {
  it('does not modify clean session', () => {
    const filePath = createTempSession(CLEAN_SESSION);
    try {
      const result = repairSession(filePath, { backup: false });
      
      expect(result.repaired).toBe(false);
      expect(result.removedCount).toBe(0);
      
      // Verify file unchanged
      const entries = parseTranscript(filePath);
      expect(entries).toHaveLength(5);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('repairs corrupted session', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const result = repairSession(filePath, { backup: false });
      
      expect(result.repaired).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(result.relinkedCount).toBe(1);
      
      // Verify file was repaired
      const entries = parseTranscript(filePath);
      expect(entries).toHaveLength(3); // session + msg-1 + msg-4
      
      // Check msg-4 was relinked to msg-1
      const msg4 = entries.find(e => e.entry.id === 'msg-4');
      expect(msg4?.entry.parentId).toBe('msg-1');
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('creates backup when requested', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    try {
      const result = repairSession(filePath, { backup: true });
      
      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath!)).toBe(true);
      
      // Backup should contain original content
      const backupEntries = parseTranscript(result.backupPath!);
      expect(backupEntries).toHaveLength(5);
    } finally {
      cleanupTempSession(filePath);
    }
  });

  it('dry-run mode does not modify file', () => {
    const filePath = createTempSession(CORRUPTED_SESSION);
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const result = repairSession(filePath, { backup: false, dryRun: true });
      
      expect(result.repaired).toBe(false);
      expect(result.corruptedEntries).toHaveLength(2);
      
      // File should be unchanged
      const currentContent = fs.readFileSync(filePath, 'utf-8');
      expect(currentContent).toBe(originalContent);
    } finally {
      cleanupTempSession(filePath);
    }
  });
});

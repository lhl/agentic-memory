import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { blockedList, formatBlockedList } from './blocked.js';
import { createTask, updateTask } from '../lib/task-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-blocked-cmd-'));
}

describe('blocked command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('blockedList', () => {
    beforeEach(() => {
      createTask(tempDir, 'Open Task');
      const blocked1 = createTask(tempDir, 'Blocked One', { owner: 'alice', project: 'proj-a' });
      updateTask(tempDir, blocked1.slug, { status: 'blocked', blocked_by: 'api-issue' });
      const blocked2 = createTask(tempDir, 'Blocked Two', { owner: 'bob', project: 'proj-b' });
      updateTask(tempDir, blocked2.slug, { status: 'blocked', blocked_by: 'config-issue' });
    });

    it('lists all blocked tasks', () => {
      const blocked = blockedList(tempDir);
      expect(blocked).toHaveLength(2);
      expect(blocked.every(t => t.frontmatter.status === 'blocked')).toBe(true);
    });

    it('filters by project', () => {
      const blocked = blockedList(tempDir, { project: 'proj-a' });
      expect(blocked).toHaveLength(1);
      expect(blocked[0].frontmatter.project).toBe('proj-a');
    });
  });

  describe('formatBlockedList', () => {
    it('formats empty list', () => {
      const output = formatBlockedList([]);
      expect(output).toContain('No blocked tasks');
    });

    it('formats blocked tasks with details', () => {
      const task = createTask(tempDir, 'Blocked Format Test', { owner: 'alice', project: 'proj' });
      updateTask(tempDir, task.slug, { status: 'blocked', blocked_by: 'api-issue' });

      const blocked = blockedList(tempDir);
      const output = formatBlockedList(blocked);

      expect(output).toContain('BLOCKED TASKS (1)');
      expect(output).toContain('■ Blocked Format Test');
      expect(output).toContain('alice');
      expect(output).toContain('proj');
      expect(output).toContain('Blocked by: api-issue');
      expect(output).toContain('Since:');
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  backlogAdd,
  backlogList,
  backlogPromote,
  formatBacklogList
} from './backlog.js';
import { createBacklogItem, readTask } from '../lib/task-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-backlog-cmd-'));
}

describe('backlog command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('backlogAdd', () => {
    it('creates a new backlog item', () => {
      const item = backlogAdd(tempDir, 'New Idea', {
        source: 'pedro',
        project: 'clawvault'
      });

      expect(item.slug).toBe('new-idea');
      expect(item.frontmatter.source).toBe('pedro');
      expect(item.frontmatter.project).toBe('clawvault');
    });
  });

  describe('backlogList', () => {
    beforeEach(() => {
      createBacklogItem(tempDir, 'Idea A', { project: 'proj-a' });
      createBacklogItem(tempDir, 'Idea B', { project: 'proj-b' });
      createBacklogItem(tempDir, 'Idea C', { project: 'proj-a' });
    });

    it('lists all backlog items', () => {
      const items = backlogList(tempDir);
      expect(items).toHaveLength(3);
    });

    it('filters by project', () => {
      const items = backlogList(tempDir, { project: 'proj-a' });
      expect(items).toHaveLength(2);
      expect(items.every(i => i.frontmatter.project === 'proj-a')).toBe(true);
    });
  });

  describe('backlogPromote', () => {
    it('promotes backlog item to task', () => {
      createBacklogItem(tempDir, 'Promote Me', { project: 'clawvault' });
      const task = backlogPromote(tempDir, 'promote-me', {
        owner: 'clawdious',
        priority: 'high'
      });

      expect(task.slug).toBe('promote-me');
      expect(task.frontmatter.owner).toBe('clawdious');
      expect(task.frontmatter.priority).toBe('high');
      expect(task.frontmatter.project).toBe('clawvault');

      // Verify task exists
      const readTaskResult = readTask(tempDir, 'promote-me');
      expect(readTaskResult).not.toBeNull();
    });
  });

  describe('formatBacklogList', () => {
    it('formats empty list', () => {
      const output = formatBacklogList([]);
      expect(output).toContain('No backlog items found');
    });

    it('formats backlog list with headers', () => {
      createBacklogItem(tempDir, 'Format Test', { source: 'pedro', project: 'proj' });
      const items = backlogList(tempDir);
      const output = formatBacklogList(items);

      expect(output).toContain('SOURCE');
      expect(output).toContain('PROJECT');
      expect(output).toContain('CREATED');
      expect(output).toContain('TITLE');
      expect(output).toContain('pedro');
      expect(output).toContain('proj');
      expect(output).toContain('Format Test');
    });
  });
});

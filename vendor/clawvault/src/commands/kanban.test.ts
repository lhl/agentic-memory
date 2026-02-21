import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createTask, readTask } from '../lib/task-utils.js';
import { readAllTransitions } from '../lib/transition-ledger.js';
import {
  syncKanbanBoard,
  importKanbanBoard,
  parseKanbanMarkdown
} from './kanban.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-kanban-cmd-'));
}

describe('kanban command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('syncKanbanBoard', () => {
    it('generates Obsidian Kanban markdown with metadata-rich cards', () => {
      createTask(tempDir, 'Open Task', {
        owner: 'alice',
        project: 'apollo',
        priority: 'high',
        due: '2026-02-20',
        tags: ['backend', 'urgent']
      });
      createTask(tempDir, 'Blocked Task', {
        owner: 'bob',
        project: 'apollo',
        priority: 'critical'
      });

      const outputPath = path.join(tempDir, 'Board.md');
      const result = syncKanbanBoard(tempDir, {
        output: outputPath,
        groupBy: 'status',
        now: new Date('2026-02-14T20:00:00Z')
      });

      expect(result.groupBy).toBe('status');
      expect(fs.existsSync(outputPath)).toBe(true);

      const board = fs.readFileSync(outputPath, 'utf-8');
      expect(board).toContain('kanban-plugin: basic');
      expect(board).toContain('clawvault-group-by: status');
      expect(board).toContain("clawvault-last-sync: '2026-02-14T20:00:00.000Z'");
      expect(board).toContain('## Open');
      expect(board).toContain('## In Progress');
      expect(board).toContain('## Blocked');
      expect(board).toContain('## Done');
      expect(board).toContain('[[open-task|Open Task]]');
      expect(board).toContain('#apollo');
      expect(board).toContain('@alice');
      expect(board).toContain('#backend');
      expect(board).toContain('📅 2026-02-20');
      expect(board).toContain('%% kanban:settings');
    });

    it('supports priority grouping with emoji lanes', () => {
      createTask(tempDir, 'Critical Issue', { priority: 'critical' });
      createTask(tempDir, 'Low Priority', { priority: 'low' });

      const outputPath = path.join(tempDir, 'priority-board.md');
      syncKanbanBoard(tempDir, {
        output: outputPath,
        groupBy: 'priority'
      });

      const board = fs.readFileSync(outputPath, 'utf-8');
      expect(board).toContain('## 🔥 Critical');
      expect(board).toContain('## 🟢 Low');
      expect(board).toContain('🔥 [[critical-issue|Critical Issue]]');
      expect(board).toContain('🟢 [[low-priority|Low Priority]]');
    });
  });

  describe('parseKanbanMarkdown', () => {
    it('extracts lanes and wiki-link slugs', () => {
      const markdown = `---
kanban-plugin: basic
clawvault-group-by: status
---

## Open

- [ ] [[task-one|Task One]] #apollo

## In Progress

- [ ] [[task-two|Task Two]] @alice
`;

      const parsed = parseKanbanMarkdown(markdown);
      expect(parsed.groupBy).toBe('status');
      expect(parsed.lanes).toHaveLength(2);
      expect(parsed.lanes[0]).toEqual({
        name: 'Open',
        slugs: ['task-one']
      });
      expect(parsed.lanes[1]).toEqual({
        name: 'In Progress',
        slugs: ['task-two']
      });
    });
  });

  describe('importKanbanBoard', () => {
    it('updates task status from status lanes', () => {
      createTask(tempDir, 'Move Me');
      const boardPath = path.join(tempDir, 'Board.md');
      fs.writeFileSync(boardPath, `---
kanban-plugin: basic
clawvault-group-by: status
---

## Open

## In Progress

- [ ] [[move-me|Move Me]]

## Blocked

## Done
`);

      const result = importKanbanBoard(tempDir, { output: boardPath });
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        slug: 'move-me',
        field: 'status',
        from: 'open',
        to: 'in-progress'
      });

      const updated = readTask(tempDir, 'move-me');
      expect(updated?.frontmatter.status).toBe('in-progress');

      const transitions = readAllTransitions(tempDir);
      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toMatchObject({
        task_id: 'move-me',
        from_status: 'open',
        to_status: 'in-progress'
      });
    });

    it('updates task priority from priority lanes', () => {
      createTask(tempDir, 'Reprioritize Me', { priority: 'low' });
      const boardPath = path.join(tempDir, 'priority-board.md');
      fs.writeFileSync(boardPath, `---
kanban-plugin: basic
clawvault-group-by: priority
---

## 🔴 High

- [ ] [[reprioritize-me|Reprioritize Me]]
`);

      const result = importKanbanBoard(tempDir, { output: boardPath });
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        slug: 'reprioritize-me',
        field: 'priority',
        from: 'low',
        to: 'high'
      });

      const updated = readTask(tempDir, 'reprioritize-me');
      expect(updated?.frontmatter.priority).toBe('high');
    });
  });
});

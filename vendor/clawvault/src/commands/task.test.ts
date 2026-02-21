import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  taskAdd,
  taskList,
  taskUpdate,
  taskDone,
  taskShow,
  formatTaskList,
  formatTaskDetails
} from './task.js';
import { createTask, updateTask, completeTask } from '../lib/task-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-task-cmd-'));
}

describe('task command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('taskAdd', () => {
    it('creates a new task', () => {
      const task = taskAdd(tempDir, 'New Task', {
        owner: 'test',
        priority: 'high'
      });

      expect(task.slug).toBe('new-task');
      expect(task.frontmatter.owner).toBe('test');
      expect(task.frontmatter.priority).toBe('high');
    });
  });

  describe('taskList', () => {
    beforeEach(() => {
      createTask(tempDir, 'Task A', { owner: 'alice', priority: 'high' });
      createTask(tempDir, 'Task B', { owner: 'bob', priority: 'low' });
      const doneTask = createTask(tempDir, 'Task C', { owner: 'alice' });
      updateTask(tempDir, doneTask.slug, { status: 'done' });
    });

    it('lists non-done tasks by default', () => {
      const tasks = taskList(tempDir);
      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.frontmatter.status !== 'done')).toBe(true);
    });

    it('filters by status', () => {
      const tasks = taskList(tempDir, { status: 'done' });
      expect(tasks).toHaveLength(1);
    });

    it('filters by owner', () => {
      const tasks = taskList(tempDir, { owner: 'alice' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].frontmatter.owner).toBe('alice');
    });

    it('filters tasks with due dates sorted ascending', () => {
      createTask(tempDir, 'Due Later', { due: '2026-05-01' });
      createTask(tempDir, 'Due Sooner', { due: '2026-04-01' });

      const dueTasks = taskList(tempDir, { due: true });
      const dueTitles = dueTasks.map((task) => task.title);

      expect(dueTitles).toEqual(['Due Sooner', 'Due Later']);
    });

    it('filters tasks by tag', () => {
      createTask(tempDir, 'Tagged One', { tags: ['kanban'] });
      createTask(tempDir, 'Tagged Two', { tags: ['platform'] });

      const tagged = taskList(tempDir, { tag: 'kanban' });
      expect(tagged).toHaveLength(1);
      expect(tagged[0].title).toBe('Tagged One');
    });

    it('shows only overdue tasks that are not done', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      createTask(tempDir, 'Overdue Open', { due: yesterday });
      const overdueDone = createTask(tempDir, 'Overdue Done', { due: yesterday });
      completeTask(tempDir, overdueDone.slug);

      const overdueTasks = taskList(tempDir, { overdue: true });
      expect(overdueTasks.map((task) => task.slug)).toContain('overdue-open');
      expect(overdueTasks.map((task) => task.slug)).not.toContain('overdue-done');
    });
  });

  describe('taskUpdate', () => {
    it('updates task fields', () => {
      createTask(tempDir, 'Update Me');
      const updated = taskUpdate(tempDir, 'update-me', {
        status: 'in-progress',
        priority: 'critical'
      });

      expect(updated.frontmatter.status).toBe('in-progress');
      expect(updated.frontmatter.priority).toBe('critical');
    });

    it('sets blocked_by when blocking', () => {
      createTask(tempDir, 'Block Me');
      const updated = taskUpdate(tempDir, 'block-me', {
        status: 'blocked',
        blockedBy: 'api-issue'
      });

      expect(updated.frontmatter.status).toBe('blocked');
      expect(updated.frontmatter.blocked_by).toBe('api-issue');
    });
  });

  describe('taskDone', () => {
    it('marks task as done', () => {
      createTask(tempDir, 'Complete Me');
      const done = taskDone(tempDir, 'complete-me');

      expect(done.frontmatter.status).toBe('done');
      expect(done.frontmatter.completed).toBeDefined();
    });
  });

  describe('taskShow', () => {
    it('returns task details', () => {
      createTask(tempDir, 'Show Me', { owner: 'test', priority: 'high' });
      const task = taskShow(tempDir, 'show-me');

      expect(task).not.toBeNull();
      expect(task?.title).toBe('Show Me');
      expect(task?.frontmatter.owner).toBe('test');
    });

    it('returns null for non-existent task', () => {
      const task = taskShow(tempDir, 'non-existent');
      expect(task).toBeNull();
    });
  });

  describe('formatTaskList', () => {
    it('formats empty list', () => {
      const output = formatTaskList([]);
      expect(output).toContain('No tasks found');
    });

    it('formats task list with headers', () => {
      createTask(tempDir, 'Format Test', { owner: 'alice', priority: 'high', project: 'proj' });
      const tasks = taskList(tempDir);
      const output = formatTaskList(tasks);

      expect(output).toContain('STATUS');
      expect(output).toContain('OWNER');
      expect(output).toContain('PRIORITY');
      expect(output).toContain('PROJECT');
      expect(output).toContain('TITLE');
      expect(output).toContain('alice');
      expect(output).toContain('high');
      expect(output).toContain('proj');
      expect(output).toContain('Format Test');
    });

    it('shows correct status icons', () => {
      createTask(tempDir, 'Open Task');
      const openTask = createTask(tempDir, 'Active Task');
      updateTask(tempDir, openTask.slug, { status: 'in-progress' });
      const blockedTask = createTask(tempDir, 'Blocked Task');
      updateTask(tempDir, blockedTask.slug, { status: 'blocked', blocked_by: 'issue' });

      const tasks = taskList(tempDir);
      const output = formatTaskList(tasks);

      expect(output).toContain('○'); // open
      expect(output).toContain('●'); // active
      expect(output).toContain('■'); // blocked
    });

    it('shows compact metadata for due, tags, parent and dependencies', () => {
      createTask(tempDir, 'Meta Task', {
        due: '2026-02-25',
        tags: ['kanban', 'cli'],
        parent: 'epic-1',
        depends_on: ['dep-a', 'dep-b']
      });

      const output = formatTaskList(taskList(tempDir));
      expect(output).toContain('due:2026-02-25');
      expect(output).toContain('#kanban,#cli');
      expect(output).toContain('parent:epic-1');
      expect(output).toContain('deps:dep-a|dep-b');
    });
  });

  describe('formatTaskDetails', () => {
    it('formats task details', () => {
      const task = createTask(tempDir, 'Detail Test', {
        owner: 'alice',
        project: 'proj',
        priority: 'high',
        due: '2026-02-20'
      });

      const output = formatTaskDetails(task);

      expect(output).toContain('# Detail Test');
      expect(output).toContain('Status:');
      expect(output).toContain('Owner: alice');
      expect(output).toContain('Project: proj');
      expect(output).toContain('Priority: high');
      expect(output).toContain('Due: 2026-02-20');
      expect(output).toContain('Created:');
      expect(output).toContain('File:');
    });

    it('formats enriched hierarchy details', () => {
      const task = createTask(tempDir, 'Hierarchy Detail', {
        description: 'Summary line',
        estimate: '1w',
        parent: 'epic-1',
        depends_on: ['api-ready']
      });

      const output = formatTaskDetails(task);
      expect(output).toContain('Description: Summary line');
      expect(output).toContain('Estimate: 1w');
      expect(output).toContain('Parent: epic-1');
      expect(output).toContain('Depends on: api-ready');
    });
  });
});

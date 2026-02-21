import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import matter from 'gray-matter';
import {
  slugify,
  getTasksDir,
  getBacklogDir,
  ensureTasksDir,
  ensureBacklogDir,
  getTaskPath,
  getBacklogPath,
  createTask,
  readTask,
  listTasks,
  updateTask,
  completeTask,
  createBacklogItem,
  readBacklogItem,
  listBacklogItems,
  promoteBacklogItem,
  getBlockedTasks,
  getActiveTasks,
  getRecentlyCompletedTasks,
  listSubtasks,
  listDependentTasks,
  getStatusIcon,
  getStatusDisplay
} from './task-utils.js';
import { readAllTransitions } from './transition-ledger.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-task-utils-'));
}

describe('task-utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('slugify', () => {
    it('converts title to slug', () => {
      expect(slugify('Fix Gemini API timeout')).toBe('fix-gemini-api-timeout');
      expect(slugify('Send Chamath email')).toBe('send-chamath-email');
      expect(slugify('Bug Report Follow-up')).toBe('bug-report-follow-up');
    });

    it('handles special characters', () => {
      expect(slugify('Test: Special (chars)')).toBe('test-special-chars');
      expect(slugify('Hello & World!')).toBe('hello-world');
    });

    it('is deterministic', () => {
      const title = 'My Task Title';
      expect(slugify(title)).toBe(slugify(title));
    });
  });

  describe('directory helpers', () => {
    it('returns correct tasks directory', () => {
      expect(getTasksDir(tempDir)).toBe(path.join(tempDir, 'tasks'));
    });

    it('returns correct backlog directory', () => {
      expect(getBacklogDir(tempDir)).toBe(path.join(tempDir, 'backlog'));
    });

    it('creates tasks directory', () => {
      ensureTasksDir(tempDir);
      expect(fs.existsSync(getTasksDir(tempDir))).toBe(true);
    });

    it('creates backlog directory', () => {
      ensureBacklogDir(tempDir);
      expect(fs.existsSync(getBacklogDir(tempDir))).toBe(true);
    });
  });

  describe('createTask', () => {
    it('creates a task file', () => {
      const task = createTask(tempDir, 'Fix Gemini timeout', {
        owner: 'clawdious',
        project: 'clawvault',
        priority: 'high'
      });

      expect(task.slug).toBe('fix-gemini-timeout');
      expect(task.title).toBe('Fix Gemini timeout');
      expect(task.frontmatter.status).toBe('open');
      expect(task.frontmatter.owner).toBe('clawdious');
      expect(task.frontmatter.project).toBe('clawvault');
      expect(task.frontmatter.priority).toBe('high');
      expect(fs.existsSync(task.path)).toBe(true);
    });

    it('throws if task already exists', () => {
      createTask(tempDir, 'Duplicate Task');
      expect(() => createTask(tempDir, 'Duplicate Task')).toThrow('Task already exists');
    });

    it('includes wiki-links in content', () => {
      const task = createTask(tempDir, 'My Task', {
        owner: 'pedro',
        project: 'versatly'
      });

      const content = fs.readFileSync(task.path, 'utf-8');
      expect(content).toContain('[[pedro]]');
      expect(content).toContain('[[versatly]]');
    });

    it('persists enriched optional frontmatter fields', () => {
      const task = createTask(tempDir, 'Enriched Task', {
        description: 'One line summary',
        estimate: '2h',
        parent: 'parent-task',
        depends_on: ['dep-a', 'dep-b'],
        tags: ['backend', 'kanban']
      });

      expect(task.frontmatter.description).toBe('One line summary');
      expect(task.frontmatter.estimate).toBe('2h');
      expect(task.frontmatter.parent).toBe('parent-task');
      expect(task.frontmatter.depends_on).toEqual(['dep-a', 'dep-b']);
      expect(task.frontmatter.tags).toEqual(['backend', 'kanban']);
    });

    it('reads task schema defaults and body scaffold from vault templates', () => {
      const templatesDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(templatesDir, 'task.md'),
        `---
primitive: task
fields:
  status:
    type: string
    default: blocked
  created:
    type: datetime
    default: "{{datetime}}"
  updated:
    type: datetime
    default: "{{datetime}}"
  owner:
    type: string
  project:
    type: string
  estimate:
    type: string
  effort:
    type: string
    default: "{{estimate}}"
---
# CUSTOM {{title}}
{{links_line}}
Effort: {{estimate}}
{{content}}
`
      );

      const task = createTask(tempDir, 'Template Task', {
        owner: 'alice',
        project: 'core-platform',
        estimate: '3h',
        content: 'Ship the patch.'
      });

      expect(task.frontmatter.status).toBe('blocked');
      expect(task.frontmatter.owner).toBe('alice');
      expect(task.frontmatter.project).toBe('core-platform');
      expect(task.frontmatter.estimate).toBe('3h');
      expect((task.frontmatter as unknown as Record<string, unknown>).effort).toBe('3h');

      const raw = fs.readFileSync(task.path, 'utf-8');
      expect(raw).toContain('# CUSTOM Template Task');
      expect(raw).toContain('[[alice]] | [[core-platform]]');
      expect(raw).toContain('Effort: 3h');
      expect(raw).toContain('Ship the patch.');
    });
  });

  describe('readTask', () => {
    it('reads an existing task', () => {
      createTask(tempDir, 'Read Test Task', { owner: 'test' });
      const task = readTask(tempDir, 'read-test-task');

      expect(task).not.toBeNull();
      expect(task?.title).toBe('Read Test Task');
      expect(task?.frontmatter.owner).toBe('test');
    });

    it('returns null for non-existent task', () => {
      const task = readTask(tempDir, 'non-existent');
      expect(task).toBeNull();
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      createTask(tempDir, 'Task One', { owner: 'alice', priority: 'high', project: 'proj-a' });
      createTask(tempDir, 'Task Two', { owner: 'bob', priority: 'low', project: 'proj-b' });
      createTask(tempDir, 'Task Three', { owner: 'alice', priority: 'critical', project: 'proj-a' });
    });

    it('lists all tasks', () => {
      const tasks = listTasks(tempDir);
      expect(tasks).toHaveLength(3);
    });

    it('filters by owner', () => {
      const tasks = listTasks(tempDir, { owner: 'alice' });
      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.frontmatter.owner === 'alice')).toBe(true);
    });

    it('filters by project', () => {
      const tasks = listTasks(tempDir, { project: 'proj-a' });
      expect(tasks).toHaveLength(2);
    });

    it('filters by priority', () => {
      const tasks = listTasks(tempDir, { priority: 'critical' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].frontmatter.priority).toBe('critical');
    });

    it('sorts by priority then date', () => {
      const tasks = listTasks(tempDir);
      expect(tasks[0].frontmatter.priority).toBe('critical');
      expect(tasks[1].frontmatter.priority).toBe('high');
      expect(tasks[2].frontmatter.priority).toBe('low');
    });

    it('filters tasks that have due dates', () => {
      createTask(tempDir, 'Due Task', { due: '2026-03-01' });
      const dueTasks = listTasks(tempDir, { due: true });
      expect(dueTasks.some((task) => task.slug === 'due-task')).toBe(true);
      expect(dueTasks.every((task) => !!task.frontmatter.due)).toBe(true);
    });

    it('filters by tag', () => {
      createTask(tempDir, 'Tagged Task', { tags: ['kanban', 'cli'] });
      const tagged = listTasks(tempDir, { tag: 'kanban' });
      expect(tagged.some((task) => task.slug === 'tagged-task')).toBe(true);
      expect(tagged.every((task) => (task.frontmatter.tags || []).includes('kanban'))).toBe(true);
    });

    it('filters overdue tasks and excludes done tasks', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      createTask(tempDir, 'Overdue Active', { due: yesterday });
      const doneOverdue = createTask(tempDir, 'Overdue Done', { due: yesterday });
      completeTask(tempDir, doneOverdue.slug);
      createTask(tempDir, 'Not Overdue', { due: tomorrow });

      const overdue = listTasks(tempDir, { overdue: true });
      expect(overdue.map((task) => task.slug)).toContain('overdue-active');
      expect(overdue.map((task) => task.slug)).not.toContain('overdue-done');
      expect(overdue.map((task) => task.slug)).not.toContain('not-overdue');
      expect(overdue.every((task) => task.frontmatter.status !== 'done')).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('updates task status', () => {
      createTask(tempDir, 'Update Test');
      const updated = updateTask(tempDir, 'update-test', { status: 'in-progress' });

      expect(updated.frontmatter.status).toBe('in-progress');
    });

    it('updates blocked_by when status is blocked', () => {
      createTask(tempDir, 'Blocked Test');
      const updated = updateTask(tempDir, 'blocked-test', {
        status: 'blocked',
        blocked_by: 'api-issue'
      });

      expect(updated.frontmatter.status).toBe('blocked');
      expect(updated.frontmatter.blocked_by).toBe('api-issue');
    });

    it('clears blocked_by when status changes from blocked', () => {
      createTask(tempDir, 'Unblock Test');
      updateTask(tempDir, 'unblock-test', { status: 'blocked', blocked_by: 'issue' });
      const updated = updateTask(tempDir, 'unblock-test', { status: 'in-progress' });

      expect(updated.frontmatter.status).toBe('in-progress');
      expect(updated.frontmatter.blocked_by).toBeUndefined();
    });

    it('throws for non-existent task', () => {
      expect(() => updateTask(tempDir, 'non-existent', { status: 'done' })).toThrow('Task not found');
    });

    it('logs status transitions to the transition ledger', () => {
      createTask(tempDir, 'Transition Logging');
      updateTask(tempDir, 'transition-logging', { status: 'in-progress' });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        task_id: 'transition-logging',
        from_status: 'open',
        to_status: 'in-progress'
      });
    });

    it('does not log when status is unchanged', () => {
      createTask(tempDir, 'No-op Transition');
      updateTask(tempDir, 'no-op-transition', { status: 'in-progress' });
      updateTask(tempDir, 'no-op-transition', { status: 'in-progress' });

      const events = readAllTransitions(tempDir).filter((event) => event.task_id === 'no-op-transition');
      expect(events).toHaveLength(1);
    });

    it('skips transition logging when previous status is missing', () => {
      const task = createTask(tempDir, 'Missing Status');
      const raw = fs.readFileSync(task.path, 'utf-8');
      const parsed = matter(raw);
      delete (parsed.data as Record<string, unknown>).status;
      fs.writeFileSync(task.path, matter.stringify(parsed.content, parsed.data));

      const updated = updateTask(tempDir, task.slug, { status: 'in-progress' });
      expect(updated.frontmatter.status).toBe('in-progress');

      const events = readAllTransitions(tempDir).filter((event) => event.task_id === task.slug);
      expect(events).toHaveLength(0);
    });

    it('rejects invalid status values at runtime', () => {
      createTask(tempDir, 'Invalid Status');
      const invalidStatus = 'not-a-status' as unknown as Parameters<typeof updateTask>[2]['status'];

      expect(() => updateTask(tempDir, 'invalid-status', { status: invalidStatus })).toThrow('Invalid task status');
      expect(readAllTransitions(tempDir)).toHaveLength(0);
      expect(readTask(tempDir, 'invalid-status')?.frontmatter.status).toBe('open');
    });

    it('keeps task updates successful when transition ledger writes fail', () => {
      createTask(tempDir, 'Ledger Failure');
      const ledgerRoot = path.join(tempDir, 'ledger');
      fs.mkdirSync(ledgerRoot, { recursive: true });
      fs.writeFileSync(path.join(ledgerRoot, 'transitions'), 'occupied');

      const updated = updateTask(tempDir, 'ledger-failure', { status: 'in-progress' });
      expect(updated.frontmatter.status).toBe('in-progress');

      expect(readAllTransitions(tempDir)).toHaveLength(0);
      expect(readTask(tempDir, 'ledger-failure')?.frontmatter.status).toBe('in-progress');
    });

    it('marks escalation after three transitions into blocked', () => {
      createTask(tempDir, 'Escalate Utility');
      updateTask(tempDir, 'escalate-utility', { status: 'blocked', blocked_by: 'blocker-1' });
      updateTask(tempDir, 'escalate-utility', { status: 'open' });
      updateTask(tempDir, 'escalate-utility', { status: 'blocked', blocked_by: 'blocker-2' });
      updateTask(tempDir, 'escalate-utility', { status: 'open' });
      updateTask(tempDir, 'escalate-utility', { status: 'blocked', blocked_by: 'blocker-3' });

      expect(readTask(tempDir, 'escalate-utility')?.frontmatter.escalation).toBe(true);
    });

    it('supports opting out of transition logging', () => {
      createTask(tempDir, 'Skip Transition');
      updateTask(tempDir, 'skip-transition', { status: 'in-progress' }, { skipTransition: true });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(0);
    });

    it('sets and clears enriched frontmatter fields', () => {
      createTask(tempDir, 'Enriched Update');
      const updated = updateTask(tempDir, 'enriched-update', {
        description: 'Detailed summary',
        estimate: '1d',
        parent: 'epic-parent',
        depends_on: ['dep-one', 'dep-two'],
        tags: ['ops', 'migration']
      });

      expect(updated.frontmatter.description).toBe('Detailed summary');
      expect(updated.frontmatter.estimate).toBe('1d');
      expect(updated.frontmatter.parent).toBe('epic-parent');
      expect(updated.frontmatter.depends_on).toEqual(['dep-one', 'dep-two']);
      expect(updated.frontmatter.tags).toEqual(['ops', 'migration']);

      const cleared = updateTask(tempDir, 'enriched-update', {
        description: null,
        estimate: null,
        parent: null,
        depends_on: null,
        tags: null
      });

      expect(cleared.frontmatter.description).toBeUndefined();
      expect(cleared.frontmatter.estimate).toBeUndefined();
      expect(cleared.frontmatter.parent).toBeUndefined();
      expect(cleared.frontmatter.depends_on).toBeUndefined();
      expect(cleared.frontmatter.tags).toBeUndefined();
    });
  });

  describe('completeTask', () => {
    it('marks task as done with completion date', () => {
      createTask(tempDir, 'Complete Test');
      const completed = completeTask(tempDir, 'complete-test');

      expect(completed.frontmatter.status).toBe('done');
      expect(completed.frontmatter.completed).toBeDefined();
    });

    it('clears blocked_by when completing', () => {
      createTask(tempDir, 'Complete Blocked');
      updateTask(tempDir, 'complete-blocked', { status: 'blocked', blocked_by: 'issue' });
      const completed = completeTask(tempDir, 'complete-blocked');

      expect(completed.frontmatter.blocked_by).toBeUndefined();
    });

    it('logs status transition when marking task done', () => {
      createTask(tempDir, 'Complete Transition');
      completeTask(tempDir, 'complete-transition', { reason: 'shipped' });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        task_id: 'complete-transition',
        from_status: 'open',
        to_status: 'done',
        reason: 'shipped'
      });
    });

    it('preserves original completion timestamp when already done', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        createTask(tempDir, 'Idempotent Complete');

        vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
        const first = completeTask(tempDir, 'idempotent-complete');
        expect(first.frontmatter.completed).toBe('2026-01-02T00:00:00.000Z');

        vi.setSystemTime(new Date('2026-01-03T00:00:00.000Z'));
        const second = completeTask(tempDir, 'idempotent-complete');
        expect(second.frontmatter.completed).toBe(first.frontmatter.completed);

        const events = readAllTransitions(tempDir).filter((event) => event.task_id === 'idempotent-complete');
        expect(events).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('backlog operations', () => {
    it('creates a backlog item', () => {
      const item = createBacklogItem(tempDir, 'Add trust scoring', {
        source: 'pedro',
        project: 'clawvault'
      });

      expect(item.slug).toBe('add-trust-scoring');
      expect(item.frontmatter.source).toBe('pedro');
      expect(item.frontmatter.project).toBe('clawvault');
      expect(fs.existsSync(item.path)).toBe(true);
    });

    it('reads a backlog item', () => {
      createBacklogItem(tempDir, 'Read Backlog Test');
      const item = readBacklogItem(tempDir, 'read-backlog-test');

      expect(item).not.toBeNull();
      expect(item?.title).toBe('Read Backlog Test');
    });

    it('lists backlog items', () => {
      createBacklogItem(tempDir, 'Item One', { project: 'proj-a' });
      createBacklogItem(tempDir, 'Item Two', { project: 'proj-b' });
      createBacklogItem(tempDir, 'Item Three', { project: 'proj-a' });

      const all = listBacklogItems(tempDir);
      expect(all).toHaveLength(3);

      const filtered = listBacklogItems(tempDir, { project: 'proj-a' });
      expect(filtered).toHaveLength(2);
    });

    it('promotes backlog item to task', () => {
      createBacklogItem(tempDir, 'Promote Test', { project: 'clawvault' });
      const task = promoteBacklogItem(tempDir, 'promote-test', {
        owner: 'clawdious',
        priority: 'medium'
      });

      expect(task.slug).toBe('promote-test');
      expect(task.frontmatter.owner).toBe('clawdious');
      expect(task.frontmatter.priority).toBe('medium');
      expect(task.frontmatter.project).toBe('clawvault');

      // Backlog item should be deleted
      expect(readBacklogItem(tempDir, 'promote-test')).toBeNull();
      // Task should exist
      expect(readTask(tempDir, 'promote-test')).not.toBeNull();
    });
  });

  describe('query helpers', () => {
    beforeEach(() => {
      createTask(tempDir, 'Active One', { owner: 'alice' });
      createTask(tempDir, 'Active Two', { owner: 'bob' });
      const blocked = createTask(tempDir, 'Blocked One', { owner: 'alice', project: 'proj-a' });
      updateTask(tempDir, blocked.slug, { status: 'blocked', blocked_by: 'issue' });
      const done = createTask(tempDir, 'Done One', { owner: 'alice' });
      completeTask(tempDir, done.slug);
    });

    it('gets blocked tasks', () => {
      const blocked = getBlockedTasks(tempDir);
      expect(blocked).toHaveLength(1);
      expect(blocked[0].frontmatter.status).toBe('blocked');
    });

    it('gets blocked tasks by project', () => {
      const blocked = getBlockedTasks(tempDir, 'proj-a');
      expect(blocked).toHaveLength(1);

      const noBlocked = getBlockedTasks(tempDir, 'proj-b');
      expect(noBlocked).toHaveLength(0);
    });

    it('gets active tasks', () => {
      const active = getActiveTasks(tempDir);
      expect(active).toHaveLength(2);
      expect(active.every(t => t.frontmatter.status === 'open' || t.frontmatter.status === 'in-progress')).toBe(true);
    });

    it('gets recently completed tasks', () => {
      const done = getRecentlyCompletedTasks(tempDir);
      expect(done).toHaveLength(1);
      expect(done[0].frontmatter.status).toBe('done');
    });
  });

  describe('hierarchy helpers', () => {
    it('lists subtasks and dependency-linked tasks', () => {
      createTask(tempDir, 'Parent Task');
      createTask(tempDir, 'Child Task One', { parent: 'parent-task' });
      createTask(tempDir, 'Child Task Two', { parent: 'parent-task' });
      createTask(tempDir, 'Blocked by Parent', { depends_on: ['parent-task'] });

      const subtasks = listSubtasks(tempDir, 'parent-task');
      expect(subtasks).toHaveLength(2);
      expect(subtasks.every((task) => task.frontmatter.parent === 'parent-task')).toBe(true);

      const dependentTasks = listDependentTasks(tempDir, 'parent-task');
      expect(dependentTasks).toHaveLength(1);
      expect(dependentTasks[0].slug).toBe('blocked-by-parent');
    });
  });

  describe('status helpers', () => {
    it('returns correct status icons', () => {
      expect(getStatusIcon('open')).toBe('○');
      expect(getStatusIcon('in-progress')).toBe('●');
      expect(getStatusIcon('blocked')).toBe('■');
      expect(getStatusIcon('done')).toBe('✓');
    });

    it('returns correct status display names', () => {
      expect(getStatusDisplay('open')).toBe('open');
      expect(getStatusDisplay('in-progress')).toBe('active');
      expect(getStatusDisplay('blocked')).toBe('blocked');
      expect(getStatusDisplay('done')).toBe('done');
    });
  });
});

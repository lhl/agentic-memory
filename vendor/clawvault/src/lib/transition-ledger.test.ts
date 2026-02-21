import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  appendTransition,
  buildTransitionEvent,
  readAllTransitions,
  queryTransitions,
  countBlockedTransitions,
  isRegression,
  formatTransitionsTable,
  getLedgerDir,
  type TransitionEvent,
} from './transition-ledger.js';
import { createTask, updateTask } from './task-utils.js';
import { taskUpdate, taskDone } from '../commands/task.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-transition-'));
}

describe('transition-ledger', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    // Clear env vars
    delete process.env.OPENCLAW_AGENT_ID;
    delete process.env.OPENCLAW_TOKEN_ESTIMATE;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.OPENCLAW_AGENT_ID;
    delete process.env.OPENCLAW_TOKEN_ESTIMATE;
  });

  describe('isRegression', () => {
    it('detects done→open as regression', () => {
      expect(isRegression('done', 'open')).toBe(true);
    });

    it('detects done→blocked as regression', () => {
      expect(isRegression('done', 'blocked')).toBe(true);
    });

    it('detects in-progress→blocked as regression', () => {
      expect(isRegression('in-progress', 'blocked')).toBe(true);
    });

    it('does not flag open→in-progress', () => {
      expect(isRegression('open', 'in-progress')).toBe(false);
    });

    it('does not flag in-progress→done', () => {
      expect(isRegression('in-progress', 'done')).toBe(false);
    });
  });

  describe('buildTransitionEvent', () => {
    it('uses manual agent_id by default', () => {
      const event = buildTransitionEvent('my-task', 'open', 'in-progress');
      expect(event.agent_id).toBe('manual');
      expect(event.task_id).toBe('my-task');
      expect(event.from_status).toBe('open');
      expect(event.to_status).toBe('in-progress');
      expect(event.confidence).toBe(1.0);
      expect(event.cost_tokens).toBeNull();
      expect(event.reason).toBeNull();
    });

    it('reads agent_id from env', () => {
      process.env.OPENCLAW_AGENT_ID = 'clawdious';
      const event = buildTransitionEvent('t', 'open', 'done');
      expect(event.agent_id).toBe('clawdious');
    });

    it('reads cost_tokens from env', () => {
      process.env.OPENCLAW_TOKEN_ESTIMATE = '1500';
      const event = buildTransitionEvent('t', 'open', 'done');
      expect(event.cost_tokens).toBe(1500);
    });

    it('accepts confidence and reason', () => {
      const event = buildTransitionEvent('t', 'open', 'done', {
        confidence: 0.8,
        reason: 'tests pass',
      });
      expect(event.confidence).toBe(0.8);
      expect(event.reason).toBe('tests pass');
    });
  });

  describe('appendTransition / readAllTransitions', () => {
    it('writes and reads transitions', () => {
      const event = buildTransitionEvent('task-a', 'open', 'in-progress');
      appendTransition(tempDir, event);

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(1);
      expect(events[0].task_id).toBe('task-a');
    });

    it('appends multiple events', () => {
      appendTransition(tempDir, buildTransitionEvent('t1', 'open', 'in-progress'));
      appendTransition(tempDir, buildTransitionEvent('t2', 'open', 'blocked'));
      appendTransition(tempDir, buildTransitionEvent('t1', 'in-progress', 'done'));

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(3);
    });

    it('returns empty array for missing ledger dir', () => {
      expect(readAllTransitions(tempDir)).toEqual([]);
    });

    it('throws a descriptive error when ledger path cannot be created', () => {
      const ledgerRoot = path.join(tempDir, 'ledger');
      fs.mkdirSync(ledgerRoot, { recursive: true });
      fs.writeFileSync(path.join(ledgerRoot, 'transitions'), 'occupied');

      expect(() => appendTransition(tempDir, buildTransitionEvent('broken-ledger', 'open', 'blocked')))
        .toThrow(/Failed to write transition ledger/i);

      expect(readAllTransitions(tempDir)).toEqual([]);
    });
  });

  describe('queryTransitions', () => {
    beforeEach(() => {
      appendTransition(tempDir, buildTransitionEvent('t1', 'open', 'in-progress'));
      appendTransition(tempDir, buildTransitionEvent('t1', 'in-progress', 'blocked'));
      appendTransition(tempDir, buildTransitionEvent('t2', 'open', 'done'));
    });

    it('filters by taskId', () => {
      const events = queryTransitions(tempDir, { taskId: 't1' });
      expect(events).toHaveLength(2);
    });

    it('filters by failed (regression)', () => {
      const events = queryTransitions(tempDir, { failed: true });
      expect(events).toHaveLength(1);
      expect(events[0].task_id).toBe('t1');
      expect(events[0].to_status).toBe('blocked');
    });
  });

  describe('countBlockedTransitions', () => {
    it('counts blocked transitions for a task', () => {
      appendTransition(tempDir, buildTransitionEvent('t1', 'open', 'blocked'));
      appendTransition(tempDir, buildTransitionEvent('t1', 'blocked', 'open'));
      appendTransition(tempDir, buildTransitionEvent('t1', 'open', 'blocked'));

      expect(countBlockedTransitions(tempDir, 't1')).toBe(2);
    });
  });

  describe('formatTransitionsTable', () => {
    it('returns message for empty', () => {
      expect(formatTransitionsTable([])).toContain('No transitions');
    });

    it('formats events as table', () => {
      const events = [buildTransitionEvent('task-x', 'open', 'done', { reason: 'shipped' })];
      const output = formatTransitionsTable(events);
      expect(output).toContain('task-x');
      expect(output).toContain('open → done');
      expect(output).toContain('shipped');
    });
  });

  describe('integration: taskUpdate emits transitions', () => {
    it('logs transition on status change', () => {
      createTask(tempDir, 'My Task', { priority: 'high' });
      taskUpdate(tempDir, 'my-task', { status: 'in-progress' });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(1);
      expect(events[0].from_status).toBe('open');
      expect(events[0].to_status).toBe('in-progress');
    });

    it('does not log when status unchanged', () => {
      createTask(tempDir, 'Another Task');
      taskUpdate(tempDir, 'another-task', { owner: 'bob' });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(0);
    });

    it('records confidence and reason', () => {
      createTask(tempDir, 'Conf Task');
      taskUpdate(tempDir, 'conf-task', {
        status: 'blocked',
        confidence: 0.5,
        reason: 'waiting on API',
      });

      const events = readAllTransitions(tempDir);
      expect(events[0].confidence).toBe(0.5);
      expect(events[0].reason).toBe('waiting on API');
    });
  });

  describe('integration: taskDone emits transition', () => {
    it('logs transition to done', () => {
      createTask(tempDir, 'Done Task');
      taskDone(tempDir, 'done-task', { reason: 'all good' });

      const events = readAllTransitions(tempDir);
      expect(events).toHaveLength(1);
      expect(events[0].to_status).toBe('done');
      expect(events[0].reason).toBe('all good');
    });
  });

  describe('escalation detection', () => {
    it('marks escalation after 3 blocked transitions', () => {
      createTask(tempDir, 'Escalate Me');

      // 3 transitions to blocked
      taskUpdate(tempDir, 'escalate-me', { status: 'blocked', reason: 'block 1' });
      taskUpdate(tempDir, 'escalate-me', { status: 'open' });
      taskUpdate(tempDir, 'escalate-me', { status: 'blocked', reason: 'block 2' });
      taskUpdate(tempDir, 'escalate-me', { status: 'open' });
      taskUpdate(tempDir, 'escalate-me', { status: 'blocked', reason: 'block 3' });

      // Read task frontmatter
      const raw = fs.readFileSync(path.join(tempDir, 'tasks', 'escalate-me.md'), 'utf-8');
      expect(raw).toContain('escalation: true');
    });

    it('does not mark escalation with fewer than 3 blocked', () => {
      createTask(tempDir, 'No Escalate');
      taskUpdate(tempDir, 'no-escalate', { status: 'blocked' });
      taskUpdate(tempDir, 'no-escalate', { status: 'open' });
      taskUpdate(tempDir, 'no-escalate', { status: 'blocked' });

      const raw = fs.readFileSync(path.join(tempDir, 'tasks', 'no-escalate.md'), 'utf-8');
      expect(raw).not.toContain('escalation');
    });
  });
});

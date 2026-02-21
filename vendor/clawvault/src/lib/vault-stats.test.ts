import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  collectVaultStats,
  formatDateRange,
  formatTaskStatusLine,
  type VaultStats
} from './vault-stats.js';
import { createTask, updateTask, completeTask } from './task-utils.js';
import { ensureLedgerStructure, getObservationPath, getReflectionsRoot } from './ledger.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-vault-stats-'));
}

describe('vault-stats', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('collectVaultStats', () => {
    describe('with empty vault', () => {
      it('returns all zeros for empty vault', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.observations.total).toBe(0);
        expect(stats.observations.firstDate).toBeNull();
        expect(stats.observations.latestDate).toBeNull();
        expect(stats.observations.avgPerDay).toBe(0);

        expect(stats.reflections.total).toBe(0);
        expect(stats.reflections.latestDate).toBeNull();
        expect(stats.reflections.weeksCovered).toBe(0);

        expect(stats.tasks.total).toBe(0);
        expect(stats.tasks.open).toBe(0);
        expect(stats.tasks.inProgress).toBe(0);
        expect(stats.tasks.blocked).toBe(0);
        expect(stats.tasks.completed).toBe(0);
        expect(stats.tasks.completionRate).toBe(0);

        expect(stats.sessions.checkpoints).toBe(0);
        expect(stats.sessions.handoffs).toBe(0);
        expect(stats.sessions.lastCheckpoint).toBeNull();

        expect(stats.documents.total).toBe(0);
        expect(stats.documents.inboxPending).toBe(0);
        expect(Object.keys(stats.documents.byCategory)).toHaveLength(0);

        expect(stats.ledger.rawTranscripts).toBe(0);
        expect(stats.ledger.totalLedgerSizeMB).toBe(0);
      });
    });

    describe('with populated vault', () => {
      beforeEach(() => {
        // Set up ledger structure
        ensureLedgerStructure(tempDir);

        // Create some observation files
        const obsPath1 = getObservationPath(tempDir, '2026-02-03');
        const obsPath2 = getObservationPath(tempDir, '2026-02-10');
        const obsPath3 = getObservationPath(tempDir, '2026-02-14');
        
        fs.mkdirSync(path.dirname(obsPath1), { recursive: true });
        fs.mkdirSync(path.dirname(obsPath2), { recursive: true });
        fs.mkdirSync(path.dirname(obsPath3), { recursive: true });
        
        fs.writeFileSync(obsPath1, '# Observations 2026-02-03\n\n- Test observation 1');
        fs.writeFileSync(obsPath2, '# Observations 2026-02-10\n\n- Test observation 2');
        fs.writeFileSync(obsPath3, '# Observations 2026-02-14\n\n- Test observation 3');

        // Create reflection files
        const reflectionsRoot = getReflectionsRoot(tempDir);
        const reflectionDir = path.join(reflectionsRoot, '2026');
        fs.mkdirSync(reflectionDir, { recursive: true });
        fs.writeFileSync(path.join(reflectionDir, '2026-W06.md'), '# Week 6 Reflection');
        fs.writeFileSync(path.join(reflectionDir, '2026-W07.md'), '# Week 7 Reflection');

        // Create tasks with various statuses
        createTask(tempDir, 'Open Task One');
        createTask(tempDir, 'Open Task Two');
        const inProgressTask = createTask(tempDir, 'In Progress Task');
        updateTask(tempDir, inProgressTask.slug, { status: 'in-progress' });
        const blockedTask = createTask(tempDir, 'Blocked Task');
        updateTask(tempDir, blockedTask.slug, { status: 'blocked', blocked_by: 'dependency' });
        const doneTask = createTask(tempDir, 'Done Task');
        completeTask(tempDir, doneTask.slug);

        // Create handoffs directory with files
        const handoffsDir = path.join(tempDir, 'handoffs');
        fs.mkdirSync(handoffsDir, { recursive: true });
        fs.writeFileSync(path.join(handoffsDir, 'handoff-2026-02-10.md'), '# Handoff');
        fs.writeFileSync(path.join(handoffsDir, 'handoff-2026-02-14.md'), '# Handoff');

        // Create inbox with pending documents
        const inboxDir = path.join(tempDir, 'inbox');
        fs.mkdirSync(inboxDir, { recursive: true });
        fs.writeFileSync(path.join(inboxDir, 'pending-doc-1.md'), '# Pending 1');
        fs.writeFileSync(path.join(inboxDir, 'pending-doc-2.md'), '# Pending 2');

        // Create some category documents
        const decisionsDir = path.join(tempDir, 'decisions');
        fs.mkdirSync(decisionsDir, { recursive: true });
        fs.writeFileSync(path.join(decisionsDir, 'decision-1.md'), '# Decision 1');

        // Create .clawvault checkpoint
        const clawvaultDir = path.join(tempDir, '.clawvault');
        fs.mkdirSync(clawvaultDir, { recursive: true });
        fs.writeFileSync(
          path.join(clawvaultDir, 'last-checkpoint.json'),
          JSON.stringify({ timestamp: '2026-02-14T10:30:00Z', workingOn: 'testing' })
        );

        // Create raw transcript files
        const rawDir = path.join(tempDir, 'ledger', 'raw', 'openclaw', '2026', '02');
        fs.mkdirSync(rawDir, { recursive: true });
        fs.writeFileSync(path.join(rawDir, '14.jsonl'), '{"test": "data"}');
      });

      it('counts observations correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.observations.total).toBe(3);
        expect(stats.observations.firstDate).toBe('2026-02-03');
        expect(stats.observations.latestDate).toBe('2026-02-14');
        expect(stats.observations.avgPerDay).toBeGreaterThan(0);
      });

      it('counts reflections correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.reflections.total).toBe(2);
        expect(stats.reflections.weeksCovered).toBe(2);
        expect(stats.reflections.latestDate).toBe('Week 07 (2026)');
      });

      it('counts tasks by status correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.tasks.total).toBe(5);
        expect(stats.tasks.open).toBe(2);
        expect(stats.tasks.inProgress).toBe(1);
        expect(stats.tasks.blocked).toBe(1);
        expect(stats.tasks.completed).toBe(1);
        expect(stats.tasks.completionRate).toBe(20); // 1/5 = 20%
      });

      it('counts sessions correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.sessions.checkpoints).toBe(1);
        expect(stats.sessions.handoffs).toBe(2);
        expect(stats.sessions.lastCheckpoint).toBe('2026-02-14');
      });

      it('counts documents by category correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.documents.inboxPending).toBe(2);
        expect(stats.documents.byCategory['inbox']).toBe(2);
        expect(stats.documents.byCategory['decisions']).toBe(1);
        expect(stats.documents.byCategory['handoffs']).toBe(2);
        expect(stats.documents.total).toBe(5); // 2 inbox + 1 decision + 2 handoffs
      });

      it('counts ledger stats correctly', () => {
        const stats = collectVaultStats(tempDir);

        expect(stats.ledger.rawTranscripts).toBe(1);
        expect(stats.ledger.totalLedgerSizeMB).toBeGreaterThanOrEqual(0);
      });
    });

    describe('date parsing from observation filenames', () => {
      it('parses dates from ledger observation files', () => {
        ensureLedgerStructure(tempDir);
        
        const obsPath = getObservationPath(tempDir, '2026-01-15');
        fs.mkdirSync(path.dirname(obsPath), { recursive: true });
        fs.writeFileSync(obsPath, '# Test');

        const stats = collectVaultStats(tempDir);
        
        expect(stats.observations.total).toBe(1);
        expect(stats.observations.firstDate).toBe('2026-01-15');
        expect(stats.observations.latestDate).toBe('2026-01-15');
      });

      it('parses dates from legacy observation files', () => {
        const legacyDir = path.join(tempDir, 'observations');
        fs.mkdirSync(legacyDir, { recursive: true });
        fs.writeFileSync(path.join(legacyDir, '2026-01-20.md'), '# Test');

        const stats = collectVaultStats(tempDir);
        
        expect(stats.observations.total).toBe(1);
        expect(stats.observations.firstDate).toBe('2026-01-20');
      });
    });

    describe('task status counting', () => {
      it('handles vault with only open tasks', () => {
        createTask(tempDir, 'Task One');
        createTask(tempDir, 'Task Two');

        const stats = collectVaultStats(tempDir);

        expect(stats.tasks.total).toBe(2);
        expect(stats.tasks.open).toBe(2);
        expect(stats.tasks.completed).toBe(0);
        expect(stats.tasks.completionRate).toBe(0);
      });

      it('handles vault with only completed tasks', () => {
        const task1 = createTask(tempDir, 'Task One');
        const task2 = createTask(tempDir, 'Task Two');
        completeTask(tempDir, task1.slug);
        completeTask(tempDir, task2.slug);

        const stats = collectVaultStats(tempDir);

        expect(stats.tasks.total).toBe(2);
        expect(stats.tasks.open).toBe(0);
        expect(stats.tasks.completed).toBe(2);
        expect(stats.tasks.completionRate).toBe(100);
      });

      it('calculates completion rate correctly', () => {
        createTask(tempDir, 'Task One');
        createTask(tempDir, 'Task Two');
        createTask(tempDir, 'Task Three');
        const task4 = createTask(tempDir, 'Task Four');
        completeTask(tempDir, task4.slug);

        const stats = collectVaultStats(tempDir);

        expect(stats.tasks.completionRate).toBe(25); // 1/4 = 25%
      });
    });
  });

  describe('formatDateRange', () => {
    it('returns N/A for null dates', () => {
      expect(formatDateRange(null, null)).toBe('N/A');
      expect(formatDateRange('2026-02-03', null)).toBe('N/A');
      expect(formatDateRange(null, '2026-02-14')).toBe('N/A');
    });

    it('formats single date correctly', () => {
      expect(formatDateRange('2026-02-03', '2026-02-03')).toBe('Feb 3');
    });

    it('formats date range correctly', () => {
      expect(formatDateRange('2026-02-03', '2026-02-14')).toBe('Feb 3 → Feb 14');
    });

    it('handles cross-month ranges', () => {
      expect(formatDateRange('2026-01-28', '2026-02-14')).toBe('Jan 28 → Feb 14');
    });
  });

  describe('formatTaskStatusLine', () => {
    it('formats all statuses', () => {
      const stats: VaultStats['tasks'] = {
        total: 10,
        open: 2,
        inProgress: 3,
        blocked: 1,
        completed: 4,
        completionRate: 40
      };

      const line = formatTaskStatusLine(stats);

      expect(line).toContain('✓ 4 done');
      expect(line).toContain('● 3 active');
      expect(line).toContain('○ 2 open');
      expect(line).toContain('⊘ 1 blocked');
    });

    it('omits zero counts', () => {
      const stats: VaultStats['tasks'] = {
        total: 5,
        open: 3,
        inProgress: 0,
        blocked: 0,
        completed: 2,
        completionRate: 40
      };

      const line = formatTaskStatusLine(stats);

      expect(line).toContain('✓ 2 done');
      expect(line).toContain('○ 3 open');
      expect(line).not.toContain('active');
      expect(line).not.toContain('blocked');
    });

    it('handles empty tasks', () => {
      const stats: VaultStats['tasks'] = {
        total: 0,
        open: 0,
        inProgress: 0,
        blocked: 0,
        completed: 0,
        completionRate: 0
      };

      const line = formatTaskStatusLine(stats);

      expect(line).toBe('');
    });
  });
});

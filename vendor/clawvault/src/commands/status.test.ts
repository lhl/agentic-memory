import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { execFileSyncMock, hasQmdMock, getObserverStalenessMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  hasQmdMock: vi.fn(),
  getObserverStalenessMock: vi.fn()
}));

let mockStats = { documents: 0, categories: {} as Record<string, number> };
let mockCollection = 'vault';
let mockRoot = '';

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock
}));

vi.mock('../lib/search.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/search.js')>('../lib/search.js');
  return {
    ...actual,
    hasQmd: hasQmdMock
  };
});

vi.mock('../observer/active-session-observer.js', () => ({
  getObserverStaleness: getObserverStalenessMock
}));

vi.mock('../lib/vault.js', () => ({
  ClawVault: class {
    private vaultPath: string;

    constructor(vaultPath: string) {
      this.vaultPath = vaultPath;
    }

    async load(): Promise<void> {
      return;
    }

    async stats(): Promise<{ documents: number; categories: Record<string, number> }> {
      return mockStats;
    }

    getPath(): string {
      return this.vaultPath;
    }

    getName(): string {
      return mockCollection;
    }

    getQmdCollection(): string {
      return mockCollection;
    }

    getQmdRoot(): string {
      return mockRoot || this.vaultPath;
    }
  }
}));

import { getStatus, formatStatus } from './status.js';
import { QmdUnavailableError } from '../lib/search.js';

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-status-'));
}

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  getObserverStalenessMock.mockReturnValue({
    staleCount: 0,
    oldestMs: 0,
    newestMs: 0
  });
});

describe('status command', () => {
  it('throws when qmd is unavailable', async () => {
    hasQmdMock.mockReturnValue(false);
    await expect(getStatus('/tmp/vault')).rejects.toBeInstanceOf(QmdUnavailableError);
  });

  it('reports issues when checkpoint is missing and git/qmd are dirty', async () => {
    hasQmdMock.mockReturnValue(true);
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'qmd') {
        return 'Collections (1):\n\nother (qmd://other/)\n  Pattern: **/*.md\n';
      }
      if (command === 'git') {
        return ' M file.md\n?? new.md\n';
      }
      return '';
    });

    const vaultPath = makeTempVaultDir();
    try {
      fs.mkdirSync(path.join(vaultPath, '.git'), { recursive: true });
      const clawvaultDir = path.join(vaultPath, '.clawvault');
      fs.mkdirSync(clawvaultDir, { recursive: true });
      fs.writeFileSync(path.join(clawvaultDir, 'dirty-death.flag'), '2024-01-01T00:00:00Z');

      mockStats = { documents: 2, categories: { inbox: 2 } };
      mockCollection = 'vault';
      mockRoot = vaultPath;

      const status = await getStatus(vaultPath);
      expect(status.health).toBe('warning');
      expect(status.issues).toEqual(
        expect.arrayContaining([
          'No checkpoint found',
          'Dirty death flag is set',
          'qmd collection missing',
          'Uncommitted changes: 2'
        ])
      );
      expect(status.git?.dirtyCount).toBe(2);
      expect(status.qmd.indexStatus).toBe('missing');
      expect(status.links.total).toBe(0);
      expect(status.links.orphans).toBe(0);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('returns ok status when everything is healthy', async () => {
    hasQmdMock.mockReturnValue(true);
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'qmd') {
        return `Collections (1):\n\n${mockCollection} (qmd://${mockCollection}/)\n  Pattern: **/*.md\n  Root: ${mockRoot}\n`;
      }
      if (command === 'git') {
        return '';
      }
      return '';
    });

    const vaultPath = makeTempVaultDir();
    try {
      fs.mkdirSync(path.join(vaultPath, '.git'), { recursive: true });
      const clawvaultDir = path.join(vaultPath, '.clawvault');
      fs.mkdirSync(clawvaultDir, { recursive: true });
      const timestamp = new Date(Date.now() - 60_000).toISOString();
      fs.writeFileSync(
        path.join(clawvaultDir, 'last-checkpoint.json'),
        JSON.stringify({ timestamp, workingOn: 'sync', focus: null, blocked: null }, null, 2)
      );
      fs.writeFileSync(
        path.join(clawvaultDir, 'graph-index.json'),
        JSON.stringify({
          schemaVersion: 1,
          vaultPath,
          generatedAt: timestamp,
          files: {},
          graph: {
            nodes: [],
            edges: [],
            stats: { nodeCount: 1, edgeCount: 0 }
          }
        }, null, 2)
      );

      mockStats = { documents: 1, categories: { inbox: 1 } };
      mockCollection = 'vault';
      mockRoot = vaultPath;

      const status = await getStatus(vaultPath);
      expect(status.health).toBe('ok');
      expect(status.issues).toHaveLength(0);
      expect(status.checkpoint.exists).toBe(true);
      expect(status.qmd.indexStatus).toBe('present');
      expect(status.links.total).toBe(0);
      expect(status.links.orphans).toBe(0);
      expect(status.graph.indexStatus).toBe('present');
      const formatted = formatStatus(status);
      expect(formatted).toContain('Issues: none');
      expect(formatted).toContain('Graph:');
      expect(formatted).toContain('Observer:');
      expect(formatted).toContain('Links:');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('marks status warning when observer cursors are stale', async () => {
    hasQmdMock.mockReturnValue(true);
    getObserverStalenessMock.mockReturnValue({
      staleCount: 2,
      oldestMs: 48 * 60 * 60 * 1000,
      newestMs: 13 * 60 * 60 * 1000
    });
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'qmd') {
        return `Collections (1):\n\n${mockCollection} (qmd://${mockCollection}/)\n  Pattern: **/*.md\n  Root: ${mockRoot}\n`;
      }
      if (command === 'git') {
        return '';
      }
      return '';
    });

    const vaultPath = makeTempVaultDir();
    try {
      fs.mkdirSync(path.join(vaultPath, '.git'), { recursive: true });
      const clawvaultDir = path.join(vaultPath, '.clawvault');
      fs.mkdirSync(clawvaultDir, { recursive: true });
      const timestamp = new Date(Date.now() - 60_000).toISOString();
      fs.writeFileSync(
        path.join(clawvaultDir, 'last-checkpoint.json'),
        JSON.stringify({ timestamp, workingOn: 'sync', focus: null, blocked: null }, null, 2)
      );
      fs.writeFileSync(
        path.join(clawvaultDir, 'graph-index.json'),
        JSON.stringify({
          schemaVersion: 1,
          vaultPath,
          generatedAt: timestamp,
          files: {},
          graph: {
            nodes: [],
            edges: [],
            stats: { nodeCount: 1, edgeCount: 0 }
          }
        }, null, 2)
      );

      mockStats = { documents: 1, categories: { inbox: 1 } };
      mockCollection = 'vault';
      mockRoot = vaultPath;

      const status = await getStatus(vaultPath);
      expect(status.health).toBe('warning');
      expect(status.issues).toContain('Observer stale sessions: 2');
      expect(status.observer.staleCount).toBe(2);
      const formatted = formatStatus(status);
      expect(formatted).toContain('Stale sessions: 2');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

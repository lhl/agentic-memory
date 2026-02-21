import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateTokens } from '../lib/token-counter.js';

const {
  loadMock,
  listMock,
  vsearchMock,
  readObservationsMock,
  parseObservationLinesMock,
  getMemoryGraphMock
} = vi.hoisted(() => ({
  loadMock: vi.fn(),
  listMock: vi.fn(),
  vsearchMock: vi.fn(),
  readObservationsMock: vi.fn(),
  parseObservationLinesMock: vi.fn(),
  getMemoryGraphMock: vi.fn()
}));

vi.mock('../lib/vault.js', () => ({
  ClawVault: class {
    private readonly vaultPath: string;

    constructor(vaultPath: string) {
      this.vaultPath = vaultPath;
    }

    async load(): Promise<void> {
      await loadMock();
    }

    async list(): Promise<unknown[]> {
      return listMock();
    }

    async vsearch(task: string, options: unknown): Promise<unknown[]> {
      return vsearchMock(task, options);
    }

    getPath(): string {
      return this.vaultPath;
    }
  }
}));

vi.mock('../lib/observation-reader.js', () => ({
  readObservations: (vaultPath: string, days: number) => readObservationsMock(vaultPath, days),
  parseObservationLines: (markdown: string) => parseObservationLinesMock(markdown)
}));

vi.mock('../lib/memory-graph.js', () => ({
  getMemoryGraph: (vaultPath: string) => getMemoryGraphMock(vaultPath)
}));

import { buildContext } from './context.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildContext budget handling', () => {
  it('greedily keeps high-priority entries and enforces markdown budget', async () => {
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([
      {
        path: '/vault/daily/2026-02-11.md',
        title: '2026-02-11',
        category: 'daily',
        content: 'Daily summary '.repeat(40),
        modified: new Date('2026-02-11T08:00:00.000Z'),
        frontmatter: { date: '2026-02-11', type: 'daily' }
      }
    ]);
    vsearchMock.mockResolvedValue([
      {
        score: 0.9,
        snippet: 'Search context '.repeat(60),
        document: {
          path: '/vault/notes/architecture.md',
          title: 'Architecture',
          category: 'notes',
          content: '',
          modified: new Date('2026-02-10T10:00:00.000Z'),
          frontmatter: {}
        }
      }
    ]);
    readObservationsMock.mockReturnValue('## 2026-02-11');
    parseObservationLinesMock.mockReturnValue([
      {
        type: 'decision',
        confidence: 0.95,
        importance: 0.9,
        content: 'Critical deployment gate remains open',
        date: '2026-02-11',
        format: 'scored'
      },
      {
        type: 'fact',
        confidence: 0.7,
        importance: 0.2,
        content: 'Low priority chatter '.repeat(50),
        date: '2026-02-11',
        format: 'scored'
      }
    ]);
    getMemoryGraphMock.mockResolvedValue({ nodes: [], edges: [] });

    const budget = 40;
    const result = await buildContext('ship release', {
      vaultPath: '/vault',
      budget
    });

    expect(estimateTokens(result.markdown)).toBeLessThanOrEqual(budget);
    expect(result.markdown).toContain('[decision|i=0.90] observation (2026-02-11)');
    expect(result.markdown).not.toContain('Low priority chatter');
  });
});

describe('buildContext observation scoring', () => {
  it('scores observations by keyword overlap and sorts by relevance within priority', async () => {
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([]);
    vsearchMock.mockResolvedValue([]);
    readObservationsMock.mockReturnValue('## 2026-02-11');
    parseObservationLinesMock.mockReturnValue([
      {
        type: 'decision',
        confidence: 0.94,
        importance: 0.9,
        content: '09:10 Postgres migration rollback failed',
        date: '2026-02-11',
        format: 'scored'
      },
      {
        type: 'project',
        confidence: 0.8,
        importance: 0.9,
        content: '09:20 Team synced on release timeline',
        date: '2026-02-11',
        format: 'scored'
      }
    ]);
    getMemoryGraphMock.mockResolvedValue({ nodes: [], edges: [] });

    const result = await buildContext('postgres migration', {
      vaultPath: '/vault',
      includeObservations: true
    });

    const observations = result.context.filter((item) => item.source === 'observation');
    expect(observations).toHaveLength(2);
    expect(observations[0].snippet).toContain('Postgres migration rollback failed');
    expect(observations[0].score).toBeGreaterThan(observations[1].score);
    expect(observations[1].score).toBe(0.1);
  });
});

describe('buildContext graph-aware retrieval', () => {
  it('includes graph neighbor entries with rationale signals', async () => {
    const modified = new Date('2026-02-11T08:00:00.000Z');
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([
      {
        path: '/vault/projects/core-api.md',
        title: 'Core API',
        category: 'projects',
        content: 'Core API details and migration plan',
        modified,
        frontmatter: {}
      },
      {
        path: '/vault/decisions/use-postgres.md',
        title: 'Use Postgres',
        category: 'decisions',
        content: 'Decision content',
        modified,
        frontmatter: {}
      }
    ]);
    vsearchMock.mockResolvedValue([
      {
        score: 0.9,
        snippet: 'Selected postgres for reliability',
        document: {
          path: '/vault/decisions/use-postgres.md',
          title: 'Use Postgres',
          category: 'decisions',
          content: '',
          modified,
          frontmatter: {}
        }
      }
    ]);
    readObservationsMock.mockReturnValue('');
    parseObservationLinesMock.mockReturnValue([]);
    getMemoryGraphMock.mockResolvedValue({
      nodes: [
        { id: 'note:decisions/use-postgres', title: 'Use Postgres', type: 'decision', category: 'decisions', path: 'decisions/use-postgres.md' },
        { id: 'note:projects/core-api', title: 'Core API', type: 'project', category: 'projects', path: 'projects/core-api.md' }
      ],
      edges: [
        {
          id: 'wiki_link:note:decisions/use-postgres->note:projects/core-api',
          source: 'note:decisions/use-postgres',
          target: 'note:projects/core-api',
          type: 'wiki_link'
        }
      ]
    });

    const result = await buildContext('postgres migration', { vaultPath: '/vault' });
    const graphEntry = result.context.find((entry) => entry.source === 'graph');
    expect(graphEntry).toBeTruthy();
    expect(graphEntry?.title).toBe('Core API');
    expect(graphEntry?.signals).toContain('graph_neighbor');
    expect(graphEntry?.rationale).toContain('Connected to "Use Postgres"');
  });

  it('respects max-hops bound for graph expansion', async () => {
    const modified = new Date('2026-02-11T08:00:00.000Z');
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([
      {
        path: '/vault/decisions/use-postgres.md',
        title: 'Use Postgres',
        category: 'decisions',
        content: 'Anchor decision',
        modified,
        frontmatter: {}
      },
      {
        path: '/vault/projects/core-api.md',
        title: 'Core API',
        category: 'projects',
        content: 'One-hop neighbor',
        modified,
        frontmatter: {}
      },
      {
        path: '/vault/projects/client-app.md',
        title: 'Client App',
        category: 'projects',
        content: 'Two-hop neighbor',
        modified,
        frontmatter: {}
      }
    ]);
    vsearchMock.mockResolvedValue([
      {
        score: 0.95,
        snippet: 'Use Postgres for reliability',
        document: {
          path: '/vault/decisions/use-postgres.md',
          title: 'Use Postgres',
          category: 'decisions',
          content: '',
          modified,
          frontmatter: {}
        }
      }
    ]);
    readObservationsMock.mockReturnValue('');
    parseObservationLinesMock.mockReturnValue([]);
    getMemoryGraphMock.mockResolvedValue({
      nodes: [
        { id: 'note:decisions/use-postgres', title: 'Use Postgres', type: 'decision', category: 'decisions', path: 'decisions/use-postgres.md', missing: false },
        { id: 'note:projects/core-api', title: 'Core API', type: 'project', category: 'projects', path: 'projects/core-api.md', missing: false },
        { id: 'note:projects/client-app', title: 'Client App', type: 'project', category: 'projects', path: 'projects/client-app.md', missing: false }
      ],
      edges: [
        {
          id: 'wiki_link:note:decisions/use-postgres->note:projects/core-api',
          source: 'note:decisions/use-postgres',
          target: 'note:projects/core-api',
          type: 'wiki_link'
        },
        {
          id: 'wiki_link:note:projects/core-api->note:projects/client-app',
          source: 'note:projects/core-api',
          target: 'note:projects/client-app',
          type: 'wiki_link'
        }
      ]
    });

    const oneHop = await buildContext('postgres migration', {
      vaultPath: '/vault',
      maxHops: 1
    });
    expect(oneHop.context.some((entry) => entry.title === 'Core API')).toBe(true);
    expect(oneHop.context.some((entry) => entry.title === 'Client App')).toBe(false);

    const twoHops = await buildContext('postgres migration', {
      vaultPath: '/vault',
      maxHops: 2
    });
    expect(twoHops.context.some((entry) => entry.title === 'Client App')).toBe(true);
  });
});

describe('buildContext profiles', () => {
  it('planning profile prioritizes search/graph before observations', async () => {
    const modified = new Date('2026-02-11T08:00:00.000Z');
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([
      {
        path: '/vault/projects/core-api.md',
        title: 'Core API',
        category: 'projects',
        content: 'Graph neighbor details',
        modified,
        frontmatter: {}
      },
      {
        path: '/vault/decisions/use-postgres.md',
        title: 'Use Postgres',
        category: 'decisions',
        content: 'Decision content',
        modified,
        frontmatter: {}
      }
    ]);
    vsearchMock.mockResolvedValue([
      {
        score: 0.95,
        snippet: 'Postgres selected for reliability',
        document: {
          path: '/vault/decisions/use-postgres.md',
          title: 'Use Postgres',
          category: 'decisions',
          content: '',
          modified,
          frontmatter: {}
        }
      }
    ]);
    readObservationsMock.mockReturnValue('## 2026-02-11');
    parseObservationLinesMock.mockReturnValue([
      {
        type: 'decision',
        confidence: 0.95,
        importance: 0.9,
        content: '09:10 Critical outage update',
        date: '2026-02-11',
        format: 'scored'
      }
    ]);
    getMemoryGraphMock.mockResolvedValue({
      nodes: [
        { id: 'note:decisions/use-postgres', title: 'Use Postgres', type: 'decision', category: 'decisions', path: 'decisions/use-postgres.md' },
        { id: 'note:projects/core-api', title: 'Core API', type: 'project', category: 'projects', path: 'projects/core-api.md' }
      ],
      edges: [
        {
          id: 'wiki_link:note:decisions/use-postgres->note:projects/core-api',
          source: 'note:decisions/use-postgres',
          target: 'note:projects/core-api',
          type: 'wiki_link'
        }
      ]
    });

    const result = await buildContext('postgres migration', {
      vaultPath: '/vault',
      profile: 'planning'
    });

    expect(result.profile).toBe('planning');
    expect(result.context[0]?.source).toBe('search');
    expect(result.context.some((entry) => entry.source === 'graph')).toBe(true);
  });

  it('auto profile infers incident ordering from task prompt', async () => {
    const modified = new Date('2026-02-11T08:00:00.000Z');
    loadMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue([
      {
        path: '/vault/projects/core-api.md',
        title: 'Core API',
        category: 'projects',
        content: 'Graph neighbor details',
        modified,
        frontmatter: {}
      },
      {
        path: '/vault/decisions/use-postgres.md',
        title: 'Use Postgres',
        category: 'decisions',
        content: 'Decision content',
        modified,
        frontmatter: {}
      }
    ]);
    vsearchMock.mockResolvedValue([
      {
        score: 0.95,
        snippet: 'Postgres selected for reliability',
        document: {
          path: '/vault/decisions/use-postgres.md',
          title: 'Use Postgres',
          category: 'decisions',
          content: '',
          modified,
          frontmatter: {}
        }
      }
    ]);
    readObservationsMock.mockReturnValue('## 2026-02-11');
    parseObservationLinesMock.mockReturnValue([
      {
        type: 'decision',
        confidence: 0.95,
        importance: 0.9,
        content: '09:10 Critical outage update',
        date: '2026-02-11',
        format: 'scored'
      }
    ]);
    getMemoryGraphMock.mockResolvedValue({
      nodes: [
        { id: 'note:decisions/use-postgres', title: 'Use Postgres', type: 'decision', category: 'decisions', path: 'decisions/use-postgres.md' },
        { id: 'note:projects/core-api', title: 'Core API', type: 'project', category: 'projects', path: 'projects/core-api.md' }
      ],
      edges: [
        {
          id: 'wiki_link:note:decisions/use-postgres->note:projects/core-api',
          source: 'note:decisions/use-postgres',
          target: 'note:projects/core-api',
          type: 'wiki_link'
        }
      ]
    });

    const result = await buildContext('URGENT outage: postgres rollback failed', {
      vaultPath: '/vault',
      profile: 'auto'
    });

    expect(result.profile).toBe('incident');
    expect(result.context[0]?.source).toBe('observation');
  });
});

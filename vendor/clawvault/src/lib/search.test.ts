import { afterEach, describe, expect, it, vi } from 'vitest';
import * as path from 'path';

const { execFileSyncMock, spawnSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  spawnSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock,
  spawnSync: spawnSyncMock
}));

async function loadSearchModule() {
  vi.resetModules();
  return await import('./search.js');
}

function withQmdIndexEnv<T>(value: string | undefined, run: () => Promise<T>): Promise<T> {
  const previous = process.env.CLAWVAULT_QMD_INDEX;
  if (value === undefined) {
    delete process.env.CLAWVAULT_QMD_INDEX;
  } else {
    process.env.CLAWVAULT_QMD_INDEX = value;
  }

  return run().finally(() => {
    if (previous === undefined) {
      delete process.env.CLAWVAULT_QMD_INDEX;
    } else {
      process.env.CLAWVAULT_QMD_INDEX = previous;
    }
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('search qmd dependency', () => {
  it('returns false when qmd is not available', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') });
    const { hasQmd } = await loadSearchModule();
    expect(hasQmd()).toBe(false);
  });

  it('throws when searching without qmd installed', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') });
    const { SearchEngine, QmdUnavailableError } = await loadSearchModule();
    const engine = new SearchEngine();
    expect(() => engine.search('hello')).toThrow(QmdUnavailableError);
  });

  it('keeps default qmd index when no override is provided', async () => {
    await withQmdIndexEnv(undefined, async () => {
      spawnSyncMock.mockReturnValue({ error: undefined });
      const { qmdUpdate } = await loadSearchModule();
      qmdUpdate('vault');

      expect(execFileSyncMock).toHaveBeenCalledWith('qmd', ['update', '-c', 'vault'], { stdio: 'inherit' });
    });
  });

  it('passes explicit qmd index to update/embed helpers', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    const { qmdUpdate, qmdEmbed } = await loadSearchModule();

    qmdUpdate('vault', 'clawvault-test');
    qmdEmbed('vault', 'clawvault-test');

    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      1,
      'qmd',
      ['--index', 'clawvault-test', 'update', '-c', 'vault'],
      { stdio: 'inherit' }
    );
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      2,
      'qmd',
      ['--index', 'clawvault-test', 'embed', '-c', 'vault'],
      { stdio: 'inherit' }
    );
  });

  it('uses configured qmd index when search engine executes queries', async () => {
    await withQmdIndexEnv('clawvault-test', async () => {
      spawnSyncMock.mockReturnValue({ error: undefined });
      execFileSyncMock.mockReturnValue(JSON.stringify([]));

      const { SearchEngine } = await loadSearchModule();
      const engine = new SearchEngine();
      engine.setCollection('vault');
      engine.search('hello');

      expect(execFileSyncMock).toHaveBeenCalledWith(
        'qmd',
        ['--index', 'clawvault-test', 'search', 'hello', '-n', '20', '--json', '-c', 'vault'],
        expect.objectContaining({
          encoding: 'utf-8'
        })
      );
    });
  });

  it('converts qmd results and applies filters', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    execFileSyncMock.mockReturnValue(
      JSON.stringify([
        {
          docid: '1',
          score: 10,
          file: 'qmd://vault/projects/demo.md',
          title: 'Demo',
          snippet: '@@ -1,2 @@ (1 before, 2 after)\nLine1\nLine2\nLine3\nLine4'
        },
        {
          docid: '2',
          score: 5,
          file: 'qmd://vault/notes/other.md',
          title: 'Other',
          snippet: 'Other snippet'
        }
      ])
    );

    const { SearchEngine } = await loadSearchModule();
    const engine = new SearchEngine();
    engine.setCollection('vault');
    engine.setVaultPath('/vault');
    engine.setCollectionRoot('/vault');
    engine.addDocument({
      id: 'projects/demo',
      path: '/vault/projects/demo.md',
      category: 'projects',
      title: 'Demo',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: ['keep'],
      modified: new Date()
    });

    const results = engine.search('hello', {
      tags: ['keep'],
      category: 'projects',
      limit: 5
    });

    expect(results).toHaveLength(1);
    expect(results[0].document.id).toBe('projects/demo');
    expect(results[0].document.path).toBe('/vault/projects/demo.md');
    expect(results[0].score).toBe(1);
    expect(results[0].snippet).not.toContain('@@');
    expect(results[0].snippet).toContain('Line1');
  });

  it('parses qmd output from error streams', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    execFileSyncMock.mockImplementation(() => {
      const err: any = new Error('qmd failed');
      err.stdout =
        'noise\n[{"docid":"1","score":2,"file":"qmd://vault/notes/a.md","title":"A","snippet":"hi"}]';
      throw err;
    });

    const { SearchEngine } = await loadSearchModule();
    const engine = new SearchEngine();
    engine.setCollectionRoot('/vault');
    engine.setVaultPath('/vault');

    const results = engine.search('fallback', { limit: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].document.path).toBe(path.resolve('/vault/notes/a.md'));
  });

  it('applies temporal boosting when enabled', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    execFileSyncMock.mockReturnValue(
      JSON.stringify([
        {
          docid: '1',
          score: 10,
          file: 'qmd://vault/projects/recent.md',
          title: 'Recent',
          snippet: 'Recent snippet'
        },
        {
          docid: '2',
          score: 9,
          file: 'qmd://vault/projects/older.md',
          title: 'Older',
          snippet: 'Older snippet'
        }
      ])
    );

    const { SearchEngine } = await loadSearchModule();
    const engine = new SearchEngine();
    engine.setCollectionRoot('/vault');
    engine.setVaultPath('/vault');
    engine.addDocument({
      id: 'projects/recent',
      path: '/vault/projects/recent.md',
      category: 'projects',
      title: 'Recent',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: [],
      modified: new Date()
    });
    engine.addDocument({
      id: 'projects/older',
      path: '/vault/projects/older.md',
      category: 'projects',
      title: 'Older',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: [],
      modified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });

    const boosted = engine.search('timeline', {
      limit: 2,
      temporalBoost: true
    });
    expect(boosted).toHaveLength(2);
    expect(boosted[0].score).toBeCloseTo(1.0, 5);
    expect(boosted[1].score).toBeCloseTo(0.63, 5);

    const unboosted = engine.search('timeline', {
      limit: 2,
      temporalBoost: false
    });
    expect(unboosted[1].score).toBeCloseTo(0.9, 5);
  });
});

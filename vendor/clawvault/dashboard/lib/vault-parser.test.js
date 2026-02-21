import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildVaultGraph } from './vault-parser.js';

function makeTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-dashboard-'));
}

function writeVaultFile(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

describe('buildVaultGraph', () => {
  it('builds nodes and edges from markdown wiki-links', async () => {
    const vaultPath = makeTempVault();
    try {
      writeVaultFile(
        vaultPath,
        'decisions/use-clawvault.md',
        `---
title: Use ClawVault
tags: [architecture, memory]
---
Linked to [[projects/clawvault|ClawVault Project]] and [[missing-note]].
`
      );
      writeVaultFile(vaultPath, 'projects/clawvault.md', '# ClawVault');

      const graph = await buildVaultGraph(vaultPath);
      const decisionNode = graph.nodes.find((node) => node.id === 'decisions/use-clawvault');
      const unresolvedNode = graph.nodes.find((node) => node.id === 'missing-note');

      expect(decisionNode).toMatchObject({
        title: 'Use ClawVault',
        category: 'decisions',
        tags: ['architecture', 'memory'],
        type: 'decision'
      });
      expect(graph.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'decisions/use-clawvault',
          target: 'projects/clawvault',
          type: 'wiki_link'
        }),
        expect.objectContaining({
          source: 'decisions/use-clawvault',
          target: 'missing-note',
          type: 'wiki_link'
        }),
        expect.objectContaining({
          source: 'decisions/use-clawvault',
          target: 'tag:architecture',
          type: 'tag'
        })
      ]));
      expect(unresolvedNode).toMatchObject({
        missing: true,
        category: 'unresolved'
      });
      expect(graph.stats.edgeTypeCounts.wiki_link).toBeGreaterThanOrEqual(2);
      expect(graph.stats.edgeTypeCounts.tag).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('resolves basename links when there is a unique match', async () => {
    const vaultPath = makeTempVault();
    try {
      writeVaultFile(vaultPath, 'research/notes.md', 'See [[clawvault]].');
      writeVaultFile(vaultPath, 'projects/clawvault.md', '# ClawVault');

      const graph = await buildVaultGraph(vaultPath);

      expect(graph.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'research/notes',
          target: 'projects/clawvault',
          type: 'wiki_link'
        })
      ]));
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('emits frontmatter relation edges with labels', async () => {
    const vaultPath = makeTempVault();
    try {
      writeVaultFile(
        vaultPath,
        'decisions/db.md',
        `---
related:
  - projects/clawvault
owner: people/alice
---
Decision details`
      );
      writeVaultFile(vaultPath, 'projects/clawvault.md', '# ClawVault');
      writeVaultFile(vaultPath, 'people/alice.md', '# Alice');

      const graph = await buildVaultGraph(vaultPath);
      expect(graph.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'decisions/db',
          target: 'projects/clawvault',
          type: 'frontmatter_relation',
          label: 'related'
        }),
        expect.objectContaining({
          source: 'decisions/db',
          target: 'people/alice',
          type: 'frontmatter_relation',
          label: 'owner'
        })
      ]));
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('loads graph data from memory graph index when present', async () => {
    const vaultPath = makeTempVault();
    try {
      writeVaultFile(vaultPath, 'decisions/use-clawvault.md', '# Placeholder');
      writeVaultFile(vaultPath, 'projects/clawvault.md', '# Placeholder project');
      const decisionMtime = fs.statSync(path.join(vaultPath, 'decisions/use-clawvault.md')).mtimeMs;
      const projectMtime = fs.statSync(path.join(vaultPath, 'projects/clawvault.md')).mtimeMs;
      const indexPath = path.join(vaultPath, '.clawvault', 'graph-index.json');
      fs.mkdirSync(path.dirname(indexPath), { recursive: true });
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          schemaVersion: 1,
          files: {
            'decisions/use-clawvault.md': {
              relativePath: 'decisions/use-clawvault.md',
              mtimeMs: decisionMtime
            },
            'projects/clawvault.md': {
              relativePath: 'projects/clawvault.md',
              mtimeMs: projectMtime
            }
          },
          graph: {
            nodes: [
              {
                id: 'note:decisions/use-clawvault',
                title: 'Use ClawVault',
                type: 'decision',
                category: 'decisions',
                tags: ['architecture'],
                path: 'decisions/use-clawvault.md',
                missing: false,
                degree: 1
              },
              {
                id: 'note:projects/clawvault',
                title: 'ClawVault Project',
                type: 'project',
                category: 'projects',
                tags: [],
                path: 'projects/clawvault.md',
                missing: false,
                degree: 1
              }
            ],
            edges: [
              {
                source: 'note:decisions/use-clawvault',
                target: 'note:projects/clawvault',
                type: 'frontmatter_relation',
                label: 'related'
              }
            ],
            stats: { generatedAt: '2026-02-13T00:00:00.000Z' }
          }
        }),
        'utf8'
      );

      const graph = await buildVaultGraph(vaultPath);
      expect(graph.nodes.find((node) => node.id === 'decisions/use-clawvault')).toBeTruthy();
      expect(graph.edges).toEqual([
        {
          source: 'decisions/use-clawvault',
          target: 'projects/clawvault',
          type: 'frontmatter_relation',
          label: 'related'
        }
      ]);
      expect(graph.stats.fileCount).toBe(2);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('falls back to markdown parsing when memory graph index is stale', async () => {
    const vaultPath = makeTempVault();
    try {
      writeVaultFile(vaultPath, 'projects/clawvault.md', '# ClawVault');
      writeVaultFile(vaultPath, 'decisions/use-clawvault.md', 'See [[projects/clawvault]].');

      const indexPath = path.join(vaultPath, '.clawvault', 'graph-index.json');
      fs.mkdirSync(path.dirname(indexPath), { recursive: true });
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-02-13T00:00:00.000Z',
          files: {
            'decisions/use-clawvault.md': { relativePath: 'decisions/use-clawvault.md', mtimeMs: 1 },
            'projects/clawvault.md': { relativePath: 'projects/clawvault.md', mtimeMs: 1 }
          },
          graph: {
            nodes: [
              {
                id: 'note:decisions/use-clawvault',
                title: 'Old node',
                type: 'decision',
                category: 'decisions',
                tags: [],
                path: 'decisions/use-clawvault.md',
                missing: false,
                degree: 0
              }
            ],
            edges: [],
            stats: { generatedAt: '2026-02-13T00:00:00.000Z' }
          }
        }),
        'utf8'
      );

      const graph = await buildVaultGraph(vaultPath);
      const node = graph.nodes.find((candidate) => candidate.id === 'decisions/use-clawvault');
      expect(node?.title).not.toBe('Old node');
      expect(graph.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'decisions/use-clawvault',
          target: 'projects/clawvault',
          type: 'wiki_link'
        })
      ]));
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

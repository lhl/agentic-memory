import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildOrUpdateMemoryGraphIndex,
  getMemoryGraph,
  loadMemoryGraphIndex,
  MEMORY_GRAPH_SCHEMA_VERSION
} from './memory-graph.js';

function makeVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-graph-'));
}

function writeVaultFile(vaultPath: string, relativePath: string, content: string): void {
  const absolutePath = path.join(vaultPath, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
}

afterEach(() => {
  // test-local cleanup is handled per test for readability
});

describe('memory graph index', () => {
  it('builds typed graph nodes/edges from wiki links, tags, and frontmatter relations', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(
        vaultPath,
        'decisions/use-postgres.md',
        `---
title: Use PostgreSQL
tags:
  - architecture
related:
  - projects/core-api
owner: people/alice
---
Linked to [[projects/core-api]] and [[missing-doc]].
`
      );
      writeVaultFile(vaultPath, 'projects/core-api.md', '# Core API');
      writeVaultFile(vaultPath, 'people/alice.md', '# Alice');

      const index = await buildOrUpdateMemoryGraphIndex(vaultPath);
      expect(index.schemaVersion).toBe(MEMORY_GRAPH_SCHEMA_VERSION);
      expect(index.graph.stats.nodeCount).toBeGreaterThanOrEqual(5);
      expect(index.graph.stats.edgeTypeCounts.wiki_link).toBeGreaterThanOrEqual(2);
      expect(index.graph.stats.edgeTypeCounts.tag).toBeGreaterThanOrEqual(1);
      expect(index.graph.stats.edgeTypeCounts.frontmatter_relation).toBeGreaterThanOrEqual(2);

      const noteNode = index.graph.nodes.find((node) => node.id === 'note:decisions/use-postgres');
      expect(noteNode?.type).toBe('decision');
      expect(noteNode?.tags).toContain('architecture');

      const tagNode = index.graph.nodes.find((node) => node.id === 'tag:architecture');
      expect(tagNode?.type).toBe('tag');

      const unresolvedNode = index.graph.nodes.find((node) => node.id.startsWith('unresolved:missing-doc'));
      expect(unresolvedNode?.type).toBe('unresolved');
      expect(unresolvedNode?.missing).toBe(true);

      const relationEdge = index.graph.edges.find(
        (edge) =>
          edge.type === 'frontmatter_relation' &&
          edge.source === 'note:decisions/use-postgres' &&
          edge.target === 'note:projects/core-api' &&
          edge.label === 'related'
      );
      expect(relationEdge).toBeTruthy();

      const persisted = loadMemoryGraphIndex(vaultPath);
      expect(persisted?.graph.stats.nodeCount).toBe(index.graph.stats.nodeCount);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('updates incrementally for added and removed files', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(vaultPath, 'projects/core-api.md', '# Core API');
      await buildOrUpdateMemoryGraphIndex(vaultPath);

      writeVaultFile(vaultPath, 'people/alice.md', '# Alice');
      const second = await buildOrUpdateMemoryGraphIndex(vaultPath);
      expect(second.graph.nodes.some((node) => node.id === 'note:people/alice')).toBe(true);

      fs.rmSync(path.join(vaultPath, 'people', 'alice.md'));
      const third = await buildOrUpdateMemoryGraphIndex(vaultPath);
      expect(third.graph.nodes.some((node) => node.id === 'note:people/alice')).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('returns indexed graph when available', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(vaultPath, 'projects/core-api.md', '# Core API');
      await buildOrUpdateMemoryGraphIndex(vaultPath);

      const graph = await getMemoryGraph(vaultPath);
      expect(graph.schemaVersion).toBe(MEMORY_GRAPH_SCHEMA_VERSION);
      expect(graph.nodes.some((node) => node.id === 'note:projects/core-api')).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('refreshes stale index entries on read when files change', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(vaultPath, 'decisions/choice.md', 'Initial text');
      await buildOrUpdateMemoryGraphIndex(vaultPath);

      // Ensure mtime changes before rewrite on filesystems with coarse precision.
      await new Promise((resolve) => setTimeout(resolve, 10));
      writeVaultFile(vaultPath, 'decisions/choice.md', 'Now links [[projects/core-api]].');
      writeVaultFile(vaultPath, 'projects/core-api.md', '# Core API');

      const graph = await getMemoryGraph(vaultPath);
      expect(graph.edges.some((edge) =>
        edge.source === 'note:decisions/choice' &&
        edge.target === 'note:projects/core-api' &&
        edge.type === 'wiki_link'
      )).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

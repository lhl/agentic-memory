import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { graphSummary } from './graph.js';

function makeVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-graph-cmd-'));
}

function writeVaultFile(vaultPath: string, relativePath: string, content: string): void {
  const absolutePath = path.join(vaultPath, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
}

describe('graph command', () => {
  it('builds and returns graph summary stats', async () => {
    const vaultPath = makeVault();
    try {
      fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), '{}', 'utf-8');
      writeVaultFile(
        vaultPath,
        'decisions/use-postgres.md',
        `---
title: Use Postgres
tags: [architecture]
---
Link to [[projects/core-api]]
`
      );
      writeVaultFile(vaultPath, 'projects/core-api.md', '# Core API');

      const summary = await graphSummary({ vaultPath, refresh: true });
      expect(summary.nodeCount).toBeGreaterThanOrEqual(3);
      expect(summary.edgeCount).toBeGreaterThanOrEqual(2);
      expect(summary.nodeTypeCounts.decision).toBe(1);
      expect(summary.edgeTypeCounts.wiki_link).toBeGreaterThanOrEqual(1);
      expect(summary.fileCount).toBe(2);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

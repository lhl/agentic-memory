import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readBacklinksIndex, scanVaultLinks, writeBacklinksIndex } from './backlinks.js';

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-backlinks-'));
}

function writeFile(root: string, relative: string, content: string): void {
  const filePath = path.join(root, relative);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('backlinks scan', () => {
  it('builds backlinks and orphans', () => {
    const vaultPath = makeTempVaultDir();
    try {
      writeFile(vaultPath, 'people/alice.md', '# Alice');
      writeFile(vaultPath, 'projects/proj-x.md', '# Project X');
      writeFile(
        vaultPath,
        'notes/a.md',
        'Meeting with [[people/alice]] about [[projects/proj-x|Project X]].'
      );
      writeFile(vaultPath, 'notes/b.md', 'Follow up with [[people/alice]] and [[unknown]].');

      const result = scanVaultLinks(vaultPath);
      expect(result.linkCount).toBe(4);
      expect(result.backlinks.get('people/alice')).toEqual(['notes/a', 'notes/b']);
      expect(result.backlinks.get('projects/proj-x')).toEqual(['notes/a']);
      expect(result.orphans).toEqual([{ source: 'notes/b', target: 'unknown' }]);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('writes and reads backlinks index', () => {
    const vaultPath = makeTempVaultDir();
    try {
      writeFile(vaultPath, 'people/alice.md', '# Alice');
      writeFile(vaultPath, 'notes/a.md', 'See [[people/alice]].');

      const result = scanVaultLinks(vaultPath);
      writeBacklinksIndex(vaultPath, result.backlinks);

      const loaded = readBacklinksIndex(vaultPath);
      expect(loaded).not.toBeNull();
      expect(loaded?.get('people/alice')).toEqual(['notes/a']);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

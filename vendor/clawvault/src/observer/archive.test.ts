import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { archiveObservations } from './archive.js';
import { getArchiveObservationPath, getObservationPath } from '../lib/ledger.js';

function makeVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-archive-'));
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

describe('archiveObservations', () => {
  it('moves observations older than retention window to archive', () => {
    const vaultPath = makeVault();
    try {
      const oldPath = getObservationPath(vaultPath, '2026-01-10');
      const recentPath = getObservationPath(vaultPath, '2026-02-19');
      fs.mkdirSync(path.dirname(oldPath), { recursive: true });
      fs.mkdirSync(path.dirname(recentPath), { recursive: true });
      fs.writeFileSync(oldPath, '## 2026-01-10\n\n- [fact|c=0.70|i=0.20] old\n', 'utf-8');
      fs.writeFileSync(recentPath, '## 2026-02-19\n\n- [fact|c=0.70|i=0.20] recent\n', 'utf-8');

      const result = archiveObservations(vaultPath, {
        olderThanDays: 14,
        now: () => new Date('2026-02-20T00:00:00.000Z')
      });

      expect(result.archived).toBe(1);
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(getArchiveObservationPath(vaultPath, '2026-01-10'))).toBe(true);
      expect(fs.existsSync(recentPath)).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('supports dry run', () => {
    const vaultPath = makeVault();
    try {
      const oldPath = getObservationPath(vaultPath, '2026-01-10');
      fs.mkdirSync(path.dirname(oldPath), { recursive: true });
      fs.writeFileSync(oldPath, '## 2026-01-10\n\n- [fact|c=0.70|i=0.20] old\n', 'utf-8');

      const result = archiveObservations(vaultPath, {
        olderThanDays: 14,
        dryRun: true,
        now: () => new Date('2026-02-20T00:00:00.000Z')
      });

      expect(result.archived).toBe(1);
      expect(fs.existsSync(oldPath)).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

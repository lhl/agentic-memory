import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrateObservations } from './migrate-observations.js';

function makeVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-migrate-'));
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

describe('migrateObservations', () => {
  it('converts legacy emoji lines and creates backup files', () => {
    const vaultPath = makeVault();
    try {
      const legacyDir = path.join(vaultPath, 'observations');
      fs.mkdirSync(legacyDir, { recursive: true });
      const filePath = path.join(legacyDir, '2026-02-14.md');
      fs.writeFileSync(
        filePath,
        [
          '## 2026-02-14',
          '',
          '🔴 09:00 Decided to use ledger-first architecture',
          '🟢 09:10 Minor typo fix'
        ].join('\n'),
        'utf-8'
      );

      const result = migrateObservations(vaultPath);
      const migrated = fs.readFileSync(filePath, 'utf-8');
      const backupPath = path.join(legacyDir, '2026-02-14.emoji-backup.md');

      expect(result.migrated).toBe(1);
      expect(result.backups).toBe(1);
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(migrated).toContain('[decision|');
      expect(migrated).toContain('|i=0.90]');
      expect(migrated).toContain('|i=0.20]');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('supports dry run without modifying files', () => {
    const vaultPath = makeVault();
    try {
      const legacyDir = path.join(vaultPath, 'observations');
      fs.mkdirSync(legacyDir, { recursive: true });
      const filePath = path.join(legacyDir, '2026-02-14.md');
      const original = '## 2026-02-14\n\n🟡 09:00 Preference for git-backed storage\n';
      fs.writeFileSync(filePath, original, 'utf-8');

      const result = migrateObservations(vaultPath, { dryRun: true });
      const current = fs.readFileSync(filePath, 'utf-8');

      expect(result.migrated).toBe(1);
      expect(current).toBe(original);
      expect(fs.existsSync(path.join(legacyDir, '2026-02-14.emoji-backup.md'))).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

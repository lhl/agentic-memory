import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getObservationPath, getReflectionsRoot } from '../lib/ledger.js';
import { runReflection } from './reflection-service.js';

function makeVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-reflect-'));
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

function writeObservation(vaultPath: string, date: string, lines: string[]): void {
  const filePath = getObservationPath(vaultPath, date);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [`## ${date}`, '', ...lines].join('\n'), 'utf-8');
}

describe('runReflection', () => {
  it('promotes high-importance and repeated medium-importance observations', async () => {
    const vaultPath = makeVault();
    try {
      writeObservation(vaultPath, '2026-02-10', [
        '- [preference|c=0.80|i=0.60] Prefers Git-backed storage'
      ]);
      writeObservation(vaultPath, '2026-02-11', [
        '- [preference|c=0.82|i=0.62] Prefers Git-backed storage'
      ]);
      writeObservation(vaultPath, '2026-02-12', [
        '- [fact|c=0.70|i=0.20] Mentioned PARA system'
      ]);
      writeObservation(vaultPath, '2026-02-13', [
        '- [decision|c=0.95|i=0.90] Use ledger-first architecture'
      ]);

      const result = await runReflection({
        vaultPath,
        days: 14,
        now: () => new Date('2026-02-20T00:00:00.000Z')
      });

      expect(result.writtenWeeks).toBeGreaterThan(0);
      const files = fs.readdirSync(getReflectionsRoot(vaultPath)).filter((name) => name.endsWith('.md'));
      expect(files.length).toBeGreaterThan(0);
      const reflection = fs.readFileSync(path.join(getReflectionsRoot(vaultPath), files[0]), 'utf-8');
      expect(reflection).toContain('Use ledger-first architecture');
      expect(reflection).toContain('Prefers Git-backed storage');
      expect(reflection).not.toContain('Mentioned PARA system');
      expect(reflection).toContain('## Citations');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { rebuildCommand } from './rebuild.js';
import { getObservationPath } from '../lib/ledger.js';

const originalNoLlm = process.env.CLAWVAULT_NO_LLM;

function makeVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-rebuild-'));
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

afterEach(() => {
  process.env.CLAWVAULT_NO_LLM = originalNoLlm;
});

describe('rebuildCommand', () => {
  it('replays raw transcripts into compiled observations', async () => {
    process.env.CLAWVAULT_NO_LLM = '1';
    const vaultPath = makeVault();
    try {
      const rawPath = path.join(vaultPath, 'ledger', 'raw', 'openclaw', '2026', '02', '14.jsonl');
      fs.mkdirSync(path.dirname(rawPath), { recursive: true });
      fs.writeFileSync(
        rawPath,
        [
          JSON.stringify({ message: '2026-02-14 09:00 Decided to use ledger-first memory model' }),
          JSON.stringify({ message: '2026-02-14 09:10 Added replay engine scaffolding' })
        ].join('\n'),
        'utf-8'
      );

      await rebuildCommand({ vaultPath });

      const observationPath = getObservationPath(vaultPath, '2026-02-14');
      expect(fs.existsSync(observationPath)).toBe(true);
      const content = fs.readFileSync(observationPath, 'utf-8');
      expect(content).toContain('## 2026-02-14');
      expect(content).toContain('ledger-first memory model');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

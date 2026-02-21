import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { replayCommand } from './replay.js';

function makeVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-replay-vault-'));
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

function makeChatGptExportDir(): string {
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-replay-chatgpt-'));
  const payload = [
    {
      id: 'conversation-1',
      mapping: {
        root: {
          id: 'root',
          message: {
            author: { role: 'user' },
            content: { parts: ['Need a ledger-first memory architecture'] },
            create_time: 1_706_000_000
          }
        }
      }
    }
  ];
  fs.writeFileSync(path.join(exportDir, 'conversations.json'), JSON.stringify(payload, null, 2), 'utf-8');
  return exportDir;
}

describe('replayCommand', () => {
  it('supports chatgpt dry-run replay', async () => {
    const vaultPath = makeVault();
    const inputPath = makeChatGptExportDir();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await replayCommand({
        source: 'chatgpt',
        inputPath,
        dryRun: true,
        vaultPath
      });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run:'));
    } finally {
      logSpy.mockRestore();
      fs.rmSync(vaultPath, { recursive: true, force: true });
      fs.rmSync(inputPath, { recursive: true, force: true });
    }
  });
});

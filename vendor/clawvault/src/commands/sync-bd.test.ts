import { describe, expect, it, vi } from 'vitest';

const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  spawnSync: spawnSyncMock
}));

import { syncBdCommand } from './sync-bd.js';

describe('syncBdCommand', () => {
  it('skips gracefully when bd is unavailable', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await syncBdCommand({ vaultPath: '/tmp/vault-does-not-matter' });

    expect(logSpy).toHaveBeenCalledWith('bd binary not found; skipping sync-bd.');
    logSpy.mockRestore();
  });
});

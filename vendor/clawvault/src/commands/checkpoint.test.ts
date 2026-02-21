import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock
}));

const envSnapshot = {
  OPENCLAW_SESSION_KEY: process.env.OPENCLAW_SESSION_KEY,
  OPENCLAW_MODEL: process.env.OPENCLAW_MODEL,
  OPENCLAW_TOKEN_ESTIMATE: process.env.OPENCLAW_TOKEN_ESTIMATE,
  OPENCLAW_CONTEXT_TOKENS: process.env.OPENCLAW_CONTEXT_TOKENS
};

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-test-'));
}

async function loadCheckpointModule() {
  vi.resetModules();
  return await import('./checkpoint.js');
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  process.env.OPENCLAW_SESSION_KEY = envSnapshot.OPENCLAW_SESSION_KEY;
  process.env.OPENCLAW_MODEL = envSnapshot.OPENCLAW_MODEL;
  process.env.OPENCLAW_TOKEN_ESTIMATE = envSnapshot.OPENCLAW_TOKEN_ESTIMATE;
  process.env.OPENCLAW_CONTEXT_TOKENS = envSnapshot.OPENCLAW_CONTEXT_TOKENS;
});

describe('checkpoint debounce', () => {
  it('coalesces rapid checkpoint calls into a single disk write', async () => {
    vi.useFakeTimers();
    const { checkpoint } = await loadCheckpointModule();

    const vaultPath = makeTempVaultDir();
    try {
      const checkpointPath = path.join(vaultPath, '.clawvault', 'last-checkpoint.json');
      const historyDir = path.join(vaultPath, '.clawvault', 'checkpoints');

      await checkpoint({ vaultPath, workingOn: 'a' });
      await vi.advanceTimersByTimeAsync(500);
      await checkpoint({ vaultPath, workingOn: 'b' });
      await vi.advanceTimersByTimeAsync(500);
      await checkpoint({ vaultPath, workingOn: 'c' });

      // Timer should have been reset by the last call.
      await vi.advanceTimersByTimeAsync(999);
      expect(fs.existsSync(checkpointPath)).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(fs.existsSync(checkpointPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
      expect(saved.workingOn).toBe('c');
      expect(fs.existsSync(historyDir)).toBe(true);
      const historyFiles = fs.readdirSync(historyDir).filter((entry) => entry.endsWith('.json'));
      expect(historyFiles.length).toBe(1);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('flush writes immediately and cancels the pending debounce', async () => {
    vi.useFakeTimers();
    const { checkpoint, flush } = await loadCheckpointModule();

    const vaultPath = makeTempVaultDir();
    try {
      const checkpointPath = path.join(vaultPath, '.clawvault', 'last-checkpoint.json');

      await checkpoint({ vaultPath, workingOn: 'soon' });
      const flushed = await flush();

      expect(flushed?.workingOn).toBe('soon');
      expect(fs.existsSync(checkpointPath)).toBe(true);
      const mtime = fs.statSync(checkpointPath).mtimeMs;

      await vi.advanceTimersByTimeAsync(2000);
      expect(fs.statSync(checkpointPath).mtimeMs).toBe(mtime);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('writes urgent checkpoints immediately and triggers a wake', async () => {
    execFileSyncMock.mockReturnValue('');
    const { checkpoint, checkDirtyDeath, clearDirtyFlag } = await loadCheckpointModule();

    const vaultPath = makeTempVaultDir();
    try {
      const checkpointPath = path.join(vaultPath, '.clawvault', 'last-checkpoint.json');
      const flagPath = path.join(vaultPath, '.clawvault', 'dirty-death.flag');
      const historyDir = path.join(vaultPath, '.clawvault', 'checkpoints');

      const data = await checkpoint({ vaultPath, workingOn: 'urgent', urgent: true });

      expect(data.urgent).toBe(true);
      expect(fs.existsSync(checkpointPath)).toBe(true);
      expect(fs.existsSync(flagPath)).toBe(true);
      expect(fs.existsSync(historyDir)).toBe(true);
      expect(execFileSyncMock).toHaveBeenCalledWith(
        'openclaw',
        expect.arrayContaining(['gateway', 'wake', '--mode', 'now']),
        expect.objectContaining({ stdio: 'inherit' })
      );

      const deathInfo = await checkDirtyDeath(vaultPath);
      expect(deathInfo.died).toBe(true);
      expect(deathInfo.deathTime).toBeTruthy();

      await clearDirtyFlag(vaultPath);
      expect(fs.existsSync(flagPath)).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('uses env session details and persists startedAt', async () => {
    const { setSessionState, checkpoint } = await loadCheckpointModule();

    const vaultPath = makeTempVaultDir();
    try {
      await setSessionState(vaultPath, {
        sessionId: 'session-1',
        sessionKey: 'file-key',
        model: 'file-model',
        tokenEstimate: 123
      });

      const sessionPath = path.join(vaultPath, '.clawvault', 'session-state.json');
      const savedState = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(savedState.startedAt).toBeTruthy();

      process.env.OPENCLAW_SESSION_KEY = 'env-key';
      process.env.OPENCLAW_MODEL = 'env-model';
      process.env.OPENCLAW_TOKEN_ESTIMATE = '456';

      const data = await checkpoint({ vaultPath, workingOn: 'work' });
      expect(data.sessionKey).toBe('env-key');
      expect(data.model).toBe('env-model');
      expect(data.tokenEstimate).toBe(456);
      expect(data.sessionStartedAt).toBe(savedState.startedAt);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});


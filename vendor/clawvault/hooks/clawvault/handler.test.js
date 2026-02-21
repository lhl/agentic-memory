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

function makeVaultFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-hook-'));
  fs.writeFileSync(path.join(root, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return root;
}

function makeOpenClawSessionFixture(agentId, sessionId, transcriptBytes = 0) {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-openclaw-'));
  const sessionsDir = path.join(stateRoot, 'agents', agentId, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, 'sessions.json'),
    JSON.stringify({
      [`agent:${agentId}:main`]: {
        sessionId,
        updatedAt: Date.now()
      }
    }),
    'utf-8'
  );
  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  const payload = transcriptBytes > 0 ? 'x'.repeat(transcriptBytes) : '';
  fs.writeFileSync(transcriptPath, payload, 'utf-8');
  return { stateRoot, sessionsDir, transcriptPath };
}

async function loadHandler() {
  vi.resetModules();
  const mod = await import('./handler.js');
  return mod.default;
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CLAWVAULT_PATH;
  delete process.env.OPENCLAW_STATE_DIR;
  delete process.env.OPENCLAW_HOME;
  delete process.env.OPENCLAW_AGENT_ID;
});

describe('clawvault hook handler', () => {
  it('injects recovery warning on gateway startup when death detected', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;

    execFileSyncMock.mockImplementation((_command, args) => {
      if (args[0] === 'recover') {
        return '⚠️ CONTEXT DEATH DETECTED\nWorking on: ship memory graph';
      }
      return '';
    });

    const handler = await loadHandler();
    const event = {
      type: 'gateway',
      action: 'startup',
      messages: [{ role: 'user', content: 'hello' }]
    };

    await handler(event);

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'clawvault',
      expect.arrayContaining(['recover', '--clear', '-v', vaultPath]),
      expect.objectContaining({ shell: false })
    );
    const injected = event.messages.find((message) => message.role === 'system');
    expect(injected?.content).toContain('Context death detected');
    expect(injected?.content).toContain('ship memory graph');

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });

  it('supports alias event names for command:new', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;
    execFileSyncMock.mockReturnValue('');

    const handler = await loadHandler();
    await handler({
      event: 'command:new',
      sessionKey: 'agent:clawdious:main',
      context: { commandSource: 'cli' }
    });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'clawvault',
      expect.arrayContaining(['checkpoint', '--working-on']),
      expect.objectContaining({ shell: false })
    );

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });

  it('injects recap and memory context on session start alias event', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;

    execFileSyncMock.mockImplementation((_command, args) => {
      if (args[0] === 'session-recap') {
        return JSON.stringify({
          messages: [
            { role: 'user', text: 'Need a migration plan.' },
            { role: 'assistant', text: 'Suggested phased rollout.' }
          ]
        });
      }
      if (args[0] === 'context') {
        return JSON.stringify({
          context: [
            {
              title: 'Use Postgres',
              age: '1 day ago',
              snippet: 'Selected Postgres for durability.'
            }
          ]
        });
      }
      return '';
    });

    const handler = await loadHandler();
    const event = {
      eventName: 'session:start',
      sessionKey: 'agent:clawdious:main',
      context: { initialPrompt: 'Need migration plan' },
      messages: [{ role: 'user', content: 'Need migration plan' }]
    };

    await handler(event);

    const contextCall = execFileSyncMock.mock.calls.find((call) => call[1]?.[0] === 'context');
    expect(contextCall?.[1]).toEqual(expect.arrayContaining(['--profile', 'auto']));

    const injected = event.messages.find((message) => message.role === 'system');
    expect(injected?.content).toContain('Session context restored');
    expect(injected?.content).toContain('Recent conversation');
    expect(injected?.content).toContain('Relevant memories');
    expect(injected?.content).toContain('Use Postgres');

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });

  it('delegates profile selection to context auto mode for urgent prompts', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;

    execFileSyncMock.mockImplementation((_command, args) => {
      if (args[0] === 'session-recap') {
        return JSON.stringify({ messages: [] });
      }
      if (args[0] === 'context') {
        return JSON.stringify({ context: [] });
      }
      return '';
    });

    const handler = await loadHandler();
    await handler({
      eventName: 'session:start',
      sessionKey: 'agent:clawdious:main',
      context: { initialPrompt: 'URGENT outage: rollback failed in production' },
      messages: [{ role: 'user', content: 'URGENT outage: rollback failed in production' }]
    });

    const contextCall = execFileSyncMock.mock.calls.find((call) => call[1]?.[0] === 'context');
    expect(contextCall?.[1]).toEqual(expect.arrayContaining(['--profile', 'auto']));

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });

  it('triggers active observation on heartbeat when threshold is crossed', async () => {
    const vaultPath = makeVaultFixture();
    const sessionId = 'heartbeat-session-1';
    const openClawFixture = makeOpenClawSessionFixture('main', sessionId, 70 * 1024);
    process.env.CLAWVAULT_PATH = vaultPath;
    process.env.OPENCLAW_STATE_DIR = openClawFixture.stateRoot;

    fs.mkdirSync(path.join(vaultPath, '.clawvault'), { recursive: true });
    fs.writeFileSync(
      path.join(vaultPath, '.clawvault', 'observe-cursors.json'),
      JSON.stringify({
        [sessionId]: {
          lastObservedOffset: 0,
          lastObservedAt: '2026-02-14T00:00:00.000Z',
          sessionKey: 'agent:main:main',
          lastFileSize: 0
        }
      }),
      'utf-8'
    );

    execFileSyncMock.mockReturnValue('');

    const handler = await loadHandler();
    await handler({
      type: 'gateway',
      action: 'heartbeat'
    });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'clawvault',
      expect.arrayContaining(['observe', '--cron', '--agent', 'main']),
      expect.objectContaining({ shell: false })
    );

    fs.rmSync(vaultPath, { recursive: true, force: true });
    fs.rmSync(openClawFixture.stateRoot, { recursive: true, force: true });
  });

  it('forces active observation flush on compaction events', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;
    execFileSyncMock.mockReturnValue('');

    const handler = await loadHandler();
    await handler({
      eventName: 'compaction:memoryFlush',
      sessionKey: 'agent:clawdious:main'
    });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'clawvault',
      expect.arrayContaining(['observe', '--cron', '--min-new', '1']),
      expect.objectContaining({ shell: false })
    );

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });

  it('runs weekly reflection on cron.weekly at Sunday midnight', async () => {
    const vaultPath = makeVaultFixture();
    process.env.CLAWVAULT_PATH = vaultPath;
    execFileSyncMock.mockReturnValue('');

    const handler = await loadHandler();
    await handler({
      eventName: 'cron.weekly',
      timestamp: '2026-02-15T00:00:00.000Z'
    });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'clawvault',
      expect.arrayContaining(['reflect', '-v', vaultPath]),
      expect.objectContaining({ shell: false })
    );

    fs.rmSync(vaultPath, { recursive: true, force: true });
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { listLedgerObservationFiles } from '../lib/ledger.js';
import {
  getObserverStaleness,
  getScaledObservationThresholdBytes,
  observeActiveSessions,
  parseSessionSourceLabel
} from './active-session-observer.js';

const originalNoLlm = process.env.CLAWVAULT_NO_LLM;
const originalOpenClawStateDir = process.env.OPENCLAW_STATE_DIR;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeVault(root: string): string {
  const vaultPath = path.join(root, 'vault');
  fs.mkdirSync(vaultPath, { recursive: true });
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  return vaultPath;
}

function writeSessions(root: string, lines: string[]): { sessionsDir: string; transcriptPath: string; sessionId: string } {
  const sessionsDir = path.join(root, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const sessionId = 'test-session-001';
  fs.writeFileSync(
    path.join(sessionsDir, 'sessions.json'),
    JSON.stringify({
      'agent:clawdious:main': {
        sessionId,
        updatedAt: Date.now()
      }
    }),
    'utf-8'
  );
  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  fs.writeFileSync(transcriptPath, `${lines.join('\n')}\n`, 'utf-8');
  return { sessionsDir, transcriptPath, sessionId };
}

function messageLine(role: 'user' | 'assistant', text: string): string {
  return JSON.stringify({
    type: 'message',
    message: {
      role,
      content: text
    }
  });
}

afterEach(() => {
  process.env.CLAWVAULT_NO_LLM = originalNoLlm;
  process.env.OPENCLAW_STATE_DIR = originalOpenClawStateDir;
});

describe('active-session-observer', () => {
  it('calculates scaled thresholds by transcript size', () => {
    expect(getScaledObservationThresholdBytes(500 * 1024)).toBe(50 * 1024);
    expect(getScaledObservationThresholdBytes(1 * 1024 * 1024)).toBe(150 * 1024);
    expect(getScaledObservationThresholdBytes(5 * 1024 * 1024)).toBe(150 * 1024);
    expect(getScaledObservationThresholdBytes(6 * 1024 * 1024)).toBe(300 * 1024);
  });

  it('parses session source labels from session keys', () => {
    expect(parseSessionSourceLabel('agent:clawdious:main')).toBe('main');
    expect(parseSessionSourceLabel('agent:clawdious:telegram:dm:5439689035')).toBe('telegram-dm');
    expect(parseSessionSourceLabel('agent:clawdious:discord:channel:1469107483128762499')).toBe('discord');
    expect(parseSessionSourceLabel('agent:clawdious:telegram:group:-5114657181')).toBe('telegram-group');
  });

  it('observes only new transcript deltas and updates per-session cursors', async () => {
    process.env.CLAWVAULT_NO_LLM = '1';
    const root = makeTempDir('clawvault-active-observe-');
    const vaultPath = writeVault(root);
    const { sessionsDir, transcriptPath, sessionId } = writeSessions(root, [
      messageLine('user', 'Need migration plan'),
      messageLine('assistant', 'Use phased rollout')
    ]);

    try {
      const firstRun = await observeActiveSessions({
        vaultPath,
        sessionsDir,
        agentId: 'clawdious',
        minNewBytes: 1,
        threshold: 1,
        reflectThreshold: 99999
      });

      expect(firstRun.candidateSessions).toBe(1);
      expect(firstRun.observedSessions).toBe(1);
      expect(firstRun.cursorUpdates).toBe(1);

      const cursorPath = path.join(vaultPath, '.clawvault', 'observe-cursors.json');
      const cursors = JSON.parse(fs.readFileSync(cursorPath, 'utf-8')) as Record<string, {
        lastObservedOffset: number;
      }>;
      expect(cursors[sessionId]?.lastObservedOffset).toBeGreaterThan(0);

      const observationFiles = listLedgerObservationFiles(vaultPath);
      expect(observationFiles.length).toBeGreaterThan(0);
      const observationContent = fs.readFileSync(observationFiles[0].path, 'utf-8');
      expect(observationContent).toContain('[main]');

      const secondRun = await observeActiveSessions({
        vaultPath,
        sessionsDir,
        agentId: 'clawdious',
        minNewBytes: 1,
        threshold: 1,
        reflectThreshold: 99999
      });
      expect(secondRun.candidateSessions).toBe(0);

      fs.appendFileSync(transcriptPath, `${messageLine('assistant', 'Added rollback checklist')}\n`, 'utf-8');

      const thirdRun = await observeActiveSessions({
        vaultPath,
        sessionsDir,
        agentId: 'clawdious',
        minNewBytes: 1,
        threshold: 1,
        reflectThreshold: 99999
      });
      expect(thirdRun.candidateSessions).toBe(1);
      expect(thirdRun.observedSessions).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('supports dry-run without mutating cursor state', async () => {
    process.env.CLAWVAULT_NO_LLM = '1';
    const root = makeTempDir('clawvault-active-observe-dry-');
    const vaultPath = writeVault(root);
    const { sessionsDir } = writeSessions(root, [messageLine('user', 'draft one')]);

    try {
      const result = await observeActiveSessions({
        vaultPath,
        sessionsDir,
        agentId: 'clawdious',
        minNewBytes: 1,
        dryRun: true
      });

      expect(result.candidateSessions).toBe(1);
      expect(result.observedSessions).toBe(0);
      expect(result.cursorUpdates).toBe(0);

      const cursorPath = path.join(vaultPath, '.clawvault', 'observe-cursors.json');
      expect(fs.existsSync(cursorPath)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('continues observing remaining sessions when one session fails', async () => {
    const root = makeTempDir('clawvault-active-observe-failures-');
    const vaultPath = writeVault(root);
    const sessionsDir = path.join(root, 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });

    const sessionOk = 'session-ok';
    const sessionFail = 'session-fail';
    fs.writeFileSync(
      path.join(sessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:clawdious:main': { sessionId: sessionOk, updatedAt: Date.now() },
        'agent:clawdious:telegram:dm:123': { sessionId: sessionFail, updatedAt: Date.now() - 1 }
      }),
      'utf-8'
    );
    fs.writeFileSync(path.join(sessionsDir, `${sessionOk}.jsonl`), `${messageLine('user', 'Need migration plan')}\n`);
    fs.writeFileSync(path.join(sessionsDir, `${sessionFail}.jsonl`), `${messageLine('assistant', 'Deploy patch')}\n`);

    try {
      const result = await observeActiveSessions(
        {
          vaultPath,
          sessionsDir,
          minNewBytes: 1
        },
        {
          createObserver: () => ({
            processMessages: async (_messages, options?: unknown): Promise<void> => {
              const transcriptId = (options as { transcriptId?: string } | undefined)?.transcriptId;
              if (transcriptId === sessionFail) {
                throw new Error('Gemini timeout');
              }
            },
            flush: async (): Promise<{ observations: string; routingSummary: string }> => ({
              observations: '',
              routingSummary: 'Routed 1 observations \u2192 decisions: 1'
            })
          })
        }
      );

      expect(result.candidateSessions).toBe(2);
      expect(result.observedSessions).toBe(1);
      expect(result.cursorUpdates).toBe(1);
      expect(result.failedSessionCount).toBe(1);
      expect(result.failedSessions[0]?.sessionId).toBe(sessionFail);
      expect(result.routedCounts.decisions).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports stale observer cursors when session file has grown for over 12h', () => {
    const root = makeTempDir('clawvault-observer-staleness-');
    const vaultPath = writeVault(root);
    const stateRoot = path.join(root, 'openclaw-state');
    process.env.OPENCLAW_STATE_DIR = stateRoot;

    const sessionsDir = path.join(stateRoot, 'agents', 'clawdious', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, 'stale-session.jsonl'), 'x'.repeat(120), 'utf-8');
    fs.writeFileSync(path.join(sessionsDir, 'fresh-session.jsonl'), 'x'.repeat(80), 'utf-8');

    const nowMs = Date.UTC(2026, 1, 15, 12, 0, 0);
    const cursorPath = path.join(vaultPath, '.clawvault', 'observe-cursors.json');
    fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
    fs.writeFileSync(
      cursorPath,
      JSON.stringify(
        {
          'stale-session': {
            lastObservedOffset: 10,
            lastObservedAt: new Date(nowMs - 13 * 60 * 60 * 1000).toISOString(),
            sessionKey: 'agent:clawdious:main',
            lastFileSize: 10
          },
          'fresh-session': {
            lastObservedOffset: 80,
            lastObservedAt: new Date(nowMs - 6 * 60 * 60 * 1000).toISOString(),
            sessionKey: 'agent:clawdious:main',
            lastFileSize: 70
          }
        },
        null,
        2
      ),
      'utf-8'
    );

    try {
      const staleness = getObserverStaleness(vaultPath, {
        now: () => new Date(nowMs)
      });

      expect(staleness.staleCount).toBe(1);
      expect(staleness.oldestMs).toBe(13 * 60 * 60 * 1000);
      expect(staleness.newestMs).toBe(13 * 60 * 60 * 1000);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

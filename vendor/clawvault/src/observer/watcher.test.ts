import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Observer, type ObserverCompressor } from './observer.js';
import { SessionWatcher } from './watcher.js';

function makeTempVault(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-watcher-'));
  fs.writeFileSync(path.join(root, '.clawvault.json'), JSON.stringify({ name: 'test' }));
  return root;
}

async function waitFor(assertion: () => void, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assertion();
}

describe('SessionWatcher', () => {
  it('feeds add/change content into observer with debounce and triggers compression', async () => {
    const vaultPath = makeTempVault();
    const sessionDir = path.join(vaultPath, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    const now = () => new Date('2026-02-11T11:00:00.000Z');

    const compressSpy = vi.fn(async (messages: string[], _existing: string) => (
      `## 2026-02-11\n\n🟡 11:00 Captured ${messages.length} updates`
    ));
    const compressor: ObserverCompressor = {
      compress: (messages, existing) => compressSpy(messages, existing)
    };

    const observer = new Observer(vaultPath, {
      tokenThreshold: 10,
      reflectThreshold: 99999,
      now,
      compressor,
      reflector: { reflect: (value: string) => value }
    });

    const watcher = new SessionWatcher(sessionDir, observer, { ignoreInitial: true, debounceMs: 500 });
    const sessionPath = path.join(sessionDir, 'active.log');

    try {
      await watcher.start();
      fs.writeFileSync(sessionPath, '', 'utf-8');
      for (let i = 1; i <= 30; i += 1) {
        fs.appendFileSync(sessionPath, `line ${i} observed by watcher\n`, 'utf-8');
      }

      await waitFor(() => {
        expect(compressSpy).toHaveBeenCalledTimes(1);
      });

      const firstCallMessages = compressSpy.mock.calls[0]?.[0] as string[];
      expect(firstCallMessages.length).toBe(30);
      const observations = observer.getObservations();
      expect(observations).toContain('## 2026-02-11');
      expect(observations).toContain('Captured 30 updates');
    } finally {
      await watcher.stop();
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('tracks per-file offsets so existing content is not replayed', async () => {
    const vaultPath = makeTempVault();
    const sessionDir = path.join(vaultPath, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    const sessionPath = path.join(sessionDir, 'existing.log');
    fs.writeFileSync(sessionPath, 'old line should not replay\n', 'utf-8');

    const compressSpy = vi.fn(async (messages: string[], _existing: string) => (
      `## 2026-02-11\n\n🟡 11:01 Captured ${messages.join(' | ')}`
    ));
    const observer = new Observer(vaultPath, {
      tokenThreshold: 1,
      reflectThreshold: 99999,
      now: () => new Date('2026-02-11T11:01:00.000Z'),
      compressor: { compress: (messages, existing) => compressSpy(messages, existing) },
      reflector: { reflect: (value: string) => value }
    });

    const watcher = new SessionWatcher(sessionDir, observer, { ignoreInitial: true, debounceMs: 120 });

    try {
      await watcher.start();
      fs.appendFileSync(sessionPath, 'new appended line\n', 'utf-8');

      await waitFor(() => {
        expect(compressSpy).toHaveBeenCalledTimes(1);
      });

      const firstCallMessages = compressSpy.mock.calls[0]?.[0] as string[];
      expect(firstCallMessages).toEqual(['new appended line']);
      expect(firstCallMessages).not.toContain('old line should not replay');
    } finally {
      await watcher.stop();
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('flushes on character threshold even with high observer token threshold', async () => {
    const vaultPath = makeTempVault();
    const sessionDir = path.join(vaultPath, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });

    const compressSpy = vi.fn(async (messages: string[], _existing: string) => (
      `## 2026-02-11\n\n🟡 11:02 Flushed ${messages.length} updates`
    ));
    const observer = new Observer(vaultPath, {
      tokenThreshold: 99999,
      reflectThreshold: 99999,
      now: () => new Date('2026-02-11T11:02:00.000Z'),
      compressor: { compress: (messages, existing) => compressSpy(messages, existing) },
      reflector: { reflect: (value: string) => value }
    });

    const watcher = new SessionWatcher(sessionDir, observer, {
      ignoreInitial: true,
      debounceMs: 120,
      flushThresholdChars: 40
    });
    const sessionPath = path.join(sessionDir, 'threshold.log');

    try {
      await watcher.start();
      fs.writeFileSync(sessionPath, '', 'utf-8');
      fs.appendFileSync(sessionPath, 'first update from watcher\n', 'utf-8');
      fs.appendFileSync(sessionPath, 'second update to cross threshold\n', 'utf-8');

      await waitFor(() => {
        expect(compressSpy).toHaveBeenCalledTimes(1);
      });
    } finally {
      await watcher.stop();
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

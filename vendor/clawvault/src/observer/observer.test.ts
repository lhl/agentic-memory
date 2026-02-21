import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Observer, type ObserverCompressor } from './observer.js';

function makeTempVault(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-observer-'));
  fs.writeFileSync(path.join(root, '.clawvault.json'), JSON.stringify({ name: 'test' }));
  return root;
}

function withFixedNow(isoTimestamp: string): () => Date {
  return () => new Date(isoTimestamp);
}

const originalAnthropic = process.env.ANTHROPIC_API_KEY;
const originalOpenAI = process.env.OPENAI_API_KEY;
const originalGemini = process.env.GEMINI_API_KEY;

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = originalAnthropic;
  process.env.OPENAI_API_KEY = originalOpenAI;
  process.env.GEMINI_API_KEY = originalGemini;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Observer', () => {
  it('accumulates messages until threshold is reached', async () => {
    const vaultPath = makeTempVault();
    const now = withFixedNow('2026-02-11T14:30:00.000Z');
    const compressSpy = vi.fn(async (_messages: string[], _existingObservations: string) => (
      '## 2026-02-11\n\n- [fact|c=0.70|i=0.20] 14:30 buffered'
    ));
    const compressor: ObserverCompressor = {
      compress: (messages, existingObservations) => compressSpy(messages, existingObservations)
    };

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 6,
        reflectThreshold: 99999,
        now,
        compressor,
        reflector: { reflect: (value: string) => value }
      });

      await observer.processMessages(['short']);
      expect(compressSpy).not.toHaveBeenCalled();
      expect(observer.getObservations()).toBe('');

      await observer.processMessages(['this message pushes the token estimator over threshold']);
      expect(compressSpy).toHaveBeenCalledTimes(1);
      expect(compressSpy).toHaveBeenCalledWith(
        ['short', 'this message pushes the token estimator over threshold'],
        ''
      );
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('writes compressed observations to daily markdown file', async () => {
    const vaultPath = makeTempVault();
    const now = withFixedNow('2026-02-11T09:05:00.000Z');

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 1,
        reflectThreshold: 99999,
        now,
        compressor: {
          compress: async () => '## 2026-02-11\n\n- [decision|c=0.92|i=0.90] 09:05 User chose PostgreSQL for reliability'
        },
        reflector: { reflect: (value: string) => value }
      });

      await observer.processMessages(['decision recorded']);
      const output = observer.getObservations();
      expect(output).toContain('## 2026-02-11');
      expect(output).toContain('[decision|c=0.92|i=0.90] 09:05 User chose PostgreSQL for reliability');

      const expectedPath = path.join(vaultPath, 'ledger', 'observations', '2026', '02', '11.md');
      expect(fs.existsSync(expectedPath)).toBe(true);
      const fileContent = fs.readFileSync(expectedPath, 'utf-8');
      expect(fileContent).toContain('[decision|c=0.92|i=0.90] 09:05 User chose PostgreSQL for reliability');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('produces scored observation format with fallback compression', async () => {
    const vaultPath = makeTempVault();
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    const now = withFixedNow('2026-02-11T14:10:00.000Z');

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 1,
        reflectThreshold: 99999,
        now
      });

      await observer.processMessages([
        '2026-02-11 14:10 User decided to use PostgreSQL for scaling reasons',
        '2026-02-11 14:12 Encountered error while running migration'
      ]);

      const observations = observer.getObservations();
      expect(observations).toContain('## 2026-02-11');
      expect(observations).toMatch(/\[[a-z]+\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*(?:decided|chose|PostgreSQL)/i);
      expect(observations).toMatch(/\[[a-z]+\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*(?:error|fail|crash|bug)/i);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('deduplicates existing and newly compressed observations', async () => {
    const vaultPath = makeTempVault();
    const now = withFixedNow('2026-02-11T10:00:00.000Z');
    const observationPath = path.join(vaultPath, 'ledger', 'observations', '2026', '02', '11.md');
    fs.mkdirSync(path.dirname(observationPath), { recursive: true });
    fs.writeFileSync(
      observationPath,
      [
        '## 2026-02-11',
        '',
        '- [fact|c=0.70|i=0.20] 09:00 Keep deployment logs',
        '- [fact|c=0.70|i=0.20] 09:01 Keep deployment logs'
      ].join('\n'),
      'utf-8'
    );

    const compressSpy = vi.fn(async (_messages: string[], existing: string) => (
      `${existing}\n- [fact|c=0.72|i=0.20] 10:00 Added rollback checklist\n- [fact|c=0.72|i=0.20] 10:01 Added rollback checklist`
    ));

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 1,
        reflectThreshold: 99999,
        now,
        compressor: {
          compress: (messages, existing) => compressSpy(messages, existing)
        },
        reflector: { reflect: (value: string) => value }
      });

      await observer.processMessages(['sync observation state']);

      expect(compressSpy).toHaveBeenCalledTimes(1);
      const existingPassedToCompressor = compressSpy.mock.calls[0][1] as string;
      expect(existingPassedToCompressor).toContain('09:00 Keep deployment logs');
      expect(existingPassedToCompressor).not.toContain('09:01 Keep deployment logs');

      const updated = fs.readFileSync(observationPath, 'utf-8');
      expect((updated.match(/Keep deployment logs/g) ?? []).length).toBe(1);
      expect((updated.match(/Added rollback checklist/g) ?? []).length).toBe(1);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('loads observer compression provider/model from config and overrides env sniffing', async () => {
    const vaultPath = makeTempVault();
    const now = withFixedNow('2026-02-11T16:00:00.000Z');
    const configPath = path.join(vaultPath, '.clawvault.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    config.observer = {
      compression: {
        provider: 'openai-compatible',
        model: 'local-model-v1',
        baseUrl: 'http://localhost:11434/v1'
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const fetchSpy = vi.fn(async (_input: unknown, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '## 2026-02-11\n\n- [fact|c=0.80|i=0.40] 16:00 Config backend selected'
            }
          }
        ]
      })
    } as Response));
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 1,
        reflectThreshold: 99999,
        now
      });
      await observer.processMessages(['capture state']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, request] = fetchSpy.mock.calls[0] as [unknown, RequestInit];
      const requestUrl = typeof url === 'string' ? url : String(url);
      const body = JSON.parse(String(request.body)) as { model?: string };
      expect(requestUrl).toBe('http://localhost:11434/v1/chat/completions');
      expect(body.model).toBe('local-model-v1');
      expect(observer.getObservations()).toContain('Config backend selected');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('falls back to env-based provider when configured provider lacks required credentials', async () => {
    const vaultPath = makeTempVault();
    const now = withFixedNow('2026-02-11T16:10:00.000Z');
    const configPath = path.join(vaultPath, '.clawvault.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    config.observer = {
      compression: {
        provider: 'openai'
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    process.env.ANTHROPIC_API_KEY = 'anthropic-fallback-key';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const fetchSpy = vi.fn(async (_input: unknown, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '## 2026-02-11\n\n- [fact|c=0.80|i=0.40] 16:10 Fallback to Anthropic'
          }
        ]
      })
    } as Response));
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    try {
      const observer = new Observer(vaultPath, {
        tokenThreshold: 1,
        reflectThreshold: 99999,
        now
      });
      await observer.processMessages(['capture state']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0] as [unknown, RequestInit];
      const requestUrl = typeof url === 'string' ? url : String(url);
      expect(requestUrl).toBe('https://api.anthropic.com/v1/messages');
      expect(observer.getObservations()).toContain('Fallback to Anthropic');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

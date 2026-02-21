import { afterEach, describe, expect, it, vi } from 'vitest';
import { Compressor } from './compressor.js';

const originalAnthropic = process.env.ANTHROPIC_API_KEY;
const originalOpenAI = process.env.OPENAI_API_KEY;
const originalGemini = process.env.GEMINI_API_KEY;
const originalNoLlm = process.env.CLAWVAULT_NO_LLM;

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = originalAnthropic;
  process.env.OPENAI_API_KEY = originalOpenAI;
  process.env.GEMINI_API_KEY = originalGemini;
  process.env.CLAWVAULT_NO_LLM = originalNoLlm;
});

describe('Compressor', () => {
  it('deduplicates by normalized content during merges', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.OPENAI_API_KEY = 'test-key';

    const fetchImpl: typeof fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [
                  '## 2026-02-11',
                  '',
                  '- [project|c=0.81|i=0.42] 10:30 Team aligned on migration plan',
                  '- [fact|c=0.75|i=0.25] 10:35 Added rollback test'
                ].join('\n')
              }
            }
          ]
        })
      } as Response;
    };

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T10:30:00.000Z'),
      fetchImpl
    });

    const existing = '## 2026-02-11\n\n- [project|c=0.80|i=0.50] 10:00 Team aligned on migration plan';
    const merged = await compressor.compress(['merge updates'], existing);

    expect((merged.match(/Team aligned on migration plan/g) ?? []).length).toBe(1);
    expect(merged).toContain('Added rollback test');
  });

  it('marks explicit decision markers as critical', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T12:00:00.000Z')
    });
    const output = await compressor.compress(
      [
        'Decision: move auth to service boundary',
        'Decided: keep retries at 3',
        'Chose: PostgreSQL',
        'Selected: circuit breaker library'
      ],
      ''
    );

    expect(output).toMatch(/\[decision\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*Decision: move auth to service boundary/);
    expect(output).toMatch(/\[decision\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*Decided: keep retries at 3/);
    expect(output).toMatch(/\[decision\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*Chose: PostgreSQL/);
    expect(output).toMatch(/\[decision\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*Selected: circuit breaker library/);
  });

  it('treats preferences and routine deadlines as notable, dated deadlines as critical', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T12:00:00.000Z')
    });
    const output = await compressor.compress(
      [
        'User preference: keep npm scripts as entrypoint',
        'Routine deadline next sprint for docs refresh',
        'Release deadline is 2026-02-28 for migration cutover'
      ],
      ''
    );

    expect(output).toMatch(/\[preference\|c=\d\.\d{2}\|i=0\.(4\d|5\d|6\d|7\d)\].*User preference: keep npm scripts as entrypoint/);
    expect(output).toMatch(/\[[a-z]+\|c=\d\.\d{2}\|i=0\.(4\d|5\d|6\d|7\d)\].*Routine deadline next sprint for docs refresh/);
    expect(output).toMatch(/\[[a-z]+\|c=\d\.\d{2}\|i=0\.(8\d|9\d)\].*Release deadline is 2026-02-28 for migration cutover/);
  });

  it('detects explicit TODO variants as todo observations', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T12:00:00.000Z')
    });
    const output = await compressor.compress(
      [
        'TODO: review the PR',
        'we need to close the release checklist',
        "don't forget to update the changelog",
        'remember to rotate API keys',
        'make sure to run smoke tests'
      ],
      ''
    );

    expect(output).toMatch(/\[todo\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*TODO: review the PR/i);
    expect(output).toMatch(/\[todo\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*we need to close the release checklist/i);
    expect(output).toMatch(/\[todo\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*don't forget to update the changelog/i);
    expect(output).toMatch(/\[todo\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*remember to rotate API keys/i);
    expect(output).toMatch(/\[todo\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*make sure to run smoke tests/i);
  });

  it('detects commitment phrasing as task observations', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T12:00:00.000Z')
    });
    const output = await compressor.compress(
      [
        "I'll deploy after lunch",
        'I will prepare the migration plan',
        'let me open a bug ticket',
        'going to add rollback checks',
        'plan to share release notes',
        'should add a post-deploy monitor'
      ],
      ''
    );

    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*I'll deploy after lunch/i);
    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*I will prepare the migration plan/i);
    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*let me open a bug ticket/i);
    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*going to add rollback checks/i);
    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*plan to share release notes/i);
    expect(output).toMatch(/\[task\|c=\d\.\d{2}\|i=0\.(6\d|7\d|8\d|9\d)\].*should add a post-deploy monitor/i);
  });

  it('deduplicates repeated TODO observations during merges', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.OPENAI_API_KEY = 'test-key';

    const fetchImpl: typeof fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [
                  '## 2026-02-11',
                  '',
                  '- [todo|c=0.84|i=0.66] 10:30 TODO: fix flaky tests'
                ].join('\n')
              }
            }
          ]
        })
      } as Response;
    };

    const compressor = new Compressor({
      now: () => new Date('2026-02-11T10:30:00.000Z'),
      fetchImpl
    });

    const existing = '## 2026-02-11\n\n- [todo|c=0.83|i=0.65] 09:00 TODO: fix flaky tests';
    const merged = await compressor.compress(['merge updates'], existing);

    expect((merged.match(/TODO: fix flaky tests/g) ?? []).length).toBe(1);
  });

  it('uses openai-compatible provider with custom baseUrl', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.CLAWVAULT_NO_LLM = '';

    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '## 2026-02-11\n\n- [fact|c=0.80|i=0.40] 10:35 OpenAI-compatible path works'
              }
            }
          ]
        })
      } as Response;
    });
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const compressor = new Compressor({
      provider: 'openai-compatible',
      model: 'custom-model',
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'custom-key',
      now: () => new Date('2026-02-11T10:35:00.000Z'),
      fetchImpl
    });

    const output = await compressor.compress(['run compression'], '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const requestUrl = typeof url === 'string' ? url : String(url);
    const headers = new Headers(request.headers as any);
    const bodyRaw = typeof request.body === 'string' ? request.body : '{}';
    const body = JSON.parse(bodyRaw) as { model?: string };

    expect(requestUrl).toBe('https://api.example.com/v1/chat/completions');
    expect(headers.get('authorization')).toBe('Bearer custom-key');
    expect(body.model).toBe('custom-model');
    expect(output).toContain('OpenAI-compatible path works');
  });

  it('maps ollama shorthand to local openai-compatible endpoint', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.CLAWVAULT_NO_LLM = '';

    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '## 2026-02-11\n\n- [fact|c=0.80|i=0.40] 10:40 Ollama shorthand works'
              }
            }
          ]
        })
      } as Response;
    });
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const compressor = new Compressor({
      provider: 'ollama',
      now: () => new Date('2026-02-11T10:40:00.000Z'),
      fetchImpl
    });

    const output = await compressor.compress(['run compression'], '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const requestUrl = typeof url === 'string' ? url : String(url);
    const headers = new Headers(request.headers as any);
    const bodyRaw = typeof request.body === 'string' ? request.body : '{}';
    const body = JSON.parse(bodyRaw) as { model?: string };

    expect(requestUrl).toBe('http://localhost:11434/v1/chat/completions');
    expect(headers.get('authorization')).toBeNull();
    expect(body.model).toBe('llama3.2');
    expect(output).toContain('Ollama shorthand works');
  });

  it('falls back to env provider when configured provider is missing required key', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.CLAWVAULT_NO_LLM = '';

    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) => {
      return {
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: '## 2026-02-11\n\n- [fact|c=0.80|i=0.40] 10:45 Env fallback selected Anthropic'
            }
          ]
        })
      } as Response;
    });
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const compressor = new Compressor({
      provider: 'openai',
      now: () => new Date('2026-02-11T10:45:00.000Z'),
      fetchImpl
    });

    const output = await compressor.compress(['run compression'], '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const requestUrl = typeof url === 'string' ? url : String(url);
    const headers = new Headers(request.headers as any);

    expect(requestUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(headers.get('x-api-key')).toBe('anthropic-test-key');
    expect(output).toContain('Env fallback selected Anthropic');
  });
});

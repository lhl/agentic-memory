import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const {
  createHandoffMock,
  clearDirtyFlagMock,
  parseSessionFileMock,
  processMessagesMock,
  flushMock
} = vi.hoisted(() => ({
  createHandoffMock: vi.fn(),
  clearDirtyFlagMock: vi.fn(),
  parseSessionFileMock: vi.fn(),
  processMessagesMock: vi.fn(),
  flushMock: vi.fn()
}));

vi.mock('../lib/vault.js', () => ({
  ClawVault: class {
    private readonly vaultPath: string;

    constructor(vaultPath: string) {
      this.vaultPath = vaultPath;
    }

    async load(): Promise<void> {
      return;
    }

    async createHandoff(): Promise<{
      id: string;
      path: string;
      category: string;
      title: string;
      content: string;
      frontmatter: Record<string, unknown>;
      links: string[];
      tags: string[];
      modified: Date;
    }> {
      return createHandoffMock();
    }

    getPath(): string {
      return this.vaultPath;
    }

    getQmdCollection(): string {
      return 'vault';
    }
  }
}));

vi.mock('./checkpoint.js', () => ({
  clearDirtyFlag: clearDirtyFlagMock
}));

vi.mock('../observer/session-parser.js', () => ({
  parseSessionFile: parseSessionFileMock
}));

vi.mock('../observer/observer.js', () => ({
  Observer: class {
    async processMessages(messages: string[], options?: unknown): Promise<void> {
      await processMessagesMock(messages, options);
    }

    async flush(): Promise<{ observations: string; routingSummary: string }> {
      return flushMock();
    }
  }
}));

import { sleep } from './sleep.js';

const ENV_KEYS = [
  'CLAWVAULT_SESSION_TRANSCRIPT',
  'OPENCLAW_SESSION_FILE',
  'OPENCLAW_SESSION_TRANSCRIPT'
] as const;

function createTranscriptFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-sleep-'));
  const transcriptPath = path.join(dir, 'session.md');
  fs.writeFileSync(transcriptPath, 'message', 'utf-8');
  return transcriptPath;
}

afterEach(() => {
  vi.clearAllMocks();
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe('sleep', () => {
  it('runs observer on transcript and returns routing summary', async () => {
    const transcriptPath = createTranscriptFile();
    createHandoffMock.mockResolvedValue({
      id: 'handoffs/handoff-1',
      path: '/tmp/vault/handoffs/handoff-1.md',
      category: 'handoffs',
      title: 'handoff',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: [],
      modified: new Date('2026-02-11T08:00:00.000Z')
    });
    parseSessionFileMock.mockReturnValue(['user: ship feature', 'assistant: completed']);
    processMessagesMock.mockResolvedValue(undefined);
    flushMock.mockResolvedValue({
      observations: '## 2026-02-11\n\n🔴 08:00 Ship feature',
      routingSummary: 'Routed 1 observations → projects: 1'
    });

    const result = await sleep({
      workingOn: 'Ship feature',
      next: 'Verify deploy',
      blocked: '',
      vaultPath: '/tmp/vault',
      git: false,
      sessionTranscript: transcriptPath
    });

    expect(parseSessionFileMock).toHaveBeenCalledWith(path.resolve(transcriptPath));
    expect(processMessagesMock).toHaveBeenCalledWith(
      ['user: ship feature', 'assistant: completed'],
      expect.objectContaining({
        source: 'openclaw',
        transcriptId: path.basename(path.resolve(transcriptPath))
      })
    );
    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(result.observationRoutingSummary).toBe('Routed 1 observations → projects: 1');
    fs.rmSync(path.dirname(transcriptPath), { recursive: true, force: true });
  });

  it('uses transcript path from environment when option is missing', async () => {
    const transcriptPath = createTranscriptFile();
    process.env.OPENCLAW_SESSION_FILE = transcriptPath;
    createHandoffMock.mockResolvedValue({
      id: 'handoffs/handoff-2',
      path: '/tmp/vault/handoffs/handoff-2.md',
      category: 'handoffs',
      title: 'handoff',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: [],
      modified: new Date('2026-02-11T08:15:00.000Z')
    });
    parseSessionFileMock.mockReturnValue(['user: from env']);
    processMessagesMock.mockResolvedValue(undefined);
    flushMock.mockResolvedValue({ observations: '', routingSummary: 'Routed 0 observations → none' });

    await sleep({
      workingOn: 'Env transcript',
      next: 'Continue',
      blocked: '',
      vaultPath: '/tmp/vault',
      git: false
    });

    expect(parseSessionFileMock).toHaveBeenCalledWith(path.resolve(transcriptPath));
    fs.rmSync(path.dirname(transcriptPath), { recursive: true, force: true });
  });

  it('does not fail sleep flow when observer processing throws', async () => {
    const transcriptPath = createTranscriptFile();
    createHandoffMock.mockResolvedValue({
      id: 'handoffs/handoff-3',
      path: '/tmp/vault/handoffs/handoff-3.md',
      category: 'handoffs',
      title: 'handoff',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: [],
      modified: new Date('2026-02-11T08:30:00.000Z')
    });
    parseSessionFileMock.mockReturnValue(['user: this should fail in observer']);
    processMessagesMock.mockRejectedValue(new Error('observer failed'));

    const result = await sleep({
      workingOn: 'Do not fail handoff',
      next: 'Retry observer',
      blocked: '',
      vaultPath: '/tmp/vault',
      git: false,
      sessionTranscript: transcriptPath
    });

    expect(result.handoff.workingOn).toEqual(['Do not fail handoff']);
    expect(result.observationRoutingSummary).toBeUndefined();
    fs.rmSync(path.dirname(transcriptPath), { recursive: true, force: true });
  });
});
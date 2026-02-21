import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  spawnSync: spawnSyncMock
}));

async function loadCompatModule() {
  vi.resetModules();
  return await import('./compat.js');
}

function writeProjectFixture(root: string): void {
  fs.mkdirSync(path.join(root, 'hooks', 'clawvault'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'clawvault',
      openclaw: { hooks: ['./hooks/clawvault'] }
    }),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(root, 'SKILL.md'),
    '---\nmetadata: {"openclaw":{"emoji":"🐘"}}\n---',
    'utf-8'
  );
  fs.writeFileSync(
    path.join(root, 'hooks', 'clawvault', 'HOOK.md'),
    [
      '---',
      'metadata:',
      '  openclaw:',
      '    events: ["gateway:startup","command:new","session:start"]',
      '    requires:',
      '      bins: ["clawvault"]',
      '---'
    ].join('\n'),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(root, 'hooks', 'clawvault', 'handler.js'),
    "import { execFileSync } from 'child_process';\nexecFileSync('clawvault', ['context', 'task', '--format', 'json', '--profile', 'auto']);\n",
    'utf-8'
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('checkOpenClawCompatibility', () => {
  it('returns healthy report for valid fixtures', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      expect(report.errors).toBe(0);
      expect(report.warnings).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags missing openclaw binary as warning', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const cliCheck = report.checks.find((check) => check.label === 'openclaw CLI available');
      expect(cliCheck?.status).toBe('warn');
      expect(report.warnings).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags unusable openclaw binary when version command exits non-zero', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined, status: 2 });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const cliCheck = report.checks.find((check) => check.label === 'openclaw CLI available');
      expect(cliCheck?.status).toBe('warn');
      expect(cliCheck?.detail).toContain('exited with code 2');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags openclaw CLI termination by signal as warning', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined, status: null, signal: 'SIGTERM' });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const cliCheck = report.checks.find((check) => check.label === 'openclaw CLI available');
      expect(cliCheck?.status).toBe('warn');
      expect(cliCheck?.detail).toContain('terminated by signal SIGTERM');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('computes strict exit code from warnings/errors', async () => {
    const { compatibilityExitCode } = await loadCompatModule();
    expect(compatibilityExitCode({ generatedAt: '', checks: [], warnings: 0, errors: 0 })).toBe(0);
    expect(compatibilityExitCode({ generatedAt: '', checks: [], warnings: 1, errors: 0 })).toBe(0);
    expect(compatibilityExitCode({ generatedAt: '', checks: [], warnings: 1, errors: 0 }, { strict: true })).toBe(1);
    expect(compatibilityExitCode({ generatedAt: '', checks: [], warnings: 0, errors: 1 })).toBe(1);
  });

  it('flags non-auto profile delegation in hook handler', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      fs.writeFileSync(
        path.join(root, 'hooks', 'clawvault', 'handler.js'),
        "import { execFileSync } from 'child_process';\nexecFileSync('clawvault', ['context', 'task', '--profile', 'planning']);\n",
        'utf-8'
      );
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const handlerCheck = report.checks.find((check) => check.label === 'hook handler safety');
      expect(handlerCheck?.status).toBe('warn');
      expect(handlerCheck?.detail).toContain('--profile auto');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags shell-enabled hook handler execution path', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      fs.writeFileSync(
        path.join(root, 'hooks', 'clawvault', 'handler.js'),
        "import { execFileSync } from 'child_process';\nexecFileSync('clawvault', ['context', 'task', '--profile', 'auto'], { shell: true });\n",
        'utf-8'
      );
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const handlerCheck = report.checks.find((check) => check.label === 'hook handler safety');
      expect(handlerCheck?.status).toBe('warn');
      expect(handlerCheck?.detail).toContain('shell:false execution option');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags missing hook manifest required bin', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      fs.writeFileSync(
        path.join(root, 'hooks', 'clawvault', 'HOOK.md'),
        [
          '---',
          'metadata:',
          '  openclaw:',
          '    events: ["gateway:startup","command:new","session:start"]',
          '---'
        ].join('\n'),
        'utf-8'
      );
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const requirementsCheck = report.checks.find((check) => check.label === 'hook manifest requirements');
      expect(requirementsCheck?.status).toBe('warn');
      expect(requirementsCheck?.detail).toContain('Missing required hook bin');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags malformed SKILL frontmatter with actionable warning', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined, status: 0 });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-compat-'));
    try {
      writeProjectFixture(root);
      fs.writeFileSync(
        path.join(root, 'SKILL.md'),
        '---\nmetadata: [\n---\ninvalid',
        'utf-8'
      );
      const { checkOpenClawCompatibility } = await loadCompatModule();
      const report = checkOpenClawCompatibility({ baseDir: root });
      const skillCheck = report.checks.find((check) => check.label === 'skill metadata');
      expect(skillCheck?.status).toBe('warn');
      expect(skillCheck?.detail).toContain('Unable to parse SKILL.md frontmatter');
      expect(skillCheck?.hint).toContain('metadata.openclaw');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('matches declarative compatibility fixture expectations', async () => {
    const { checkOpenClawCompatibility, compatibilityExitCode } = await loadCompatModule();
    const casesPath = path.resolve(process.cwd(), 'tests', 'compat-fixtures', 'cases.json');
    const manifest = JSON.parse(fs.readFileSync(casesPath, 'utf-8')) as {
      schemaVersion: number;
      expectedCheckLabels: string[];
      cases: Array<{
        name: string;
        description: string;
        expectedExitCode: number;
        expectedWarnings: number;
        expectedErrors: number;
        expectedCheckStatuses: Record<string, 'ok' | 'warn' | 'error'>;
        expectedDetailIncludes?: Record<string, string>;
        expectedHintIncludes?: Record<string, string>;
        openclawExitCode?: number;
        openclawSignal?: string;
        openclawMissing?: boolean;
      }>;
    };
    const cases = manifest.cases;

    for (const testCase of cases) {
      const spawnResult = testCase.openclawSignal
        ? { error: undefined, status: null, signal: testCase.openclawSignal }
        : testCase.openclawMissing
          ? { error: new Error('missing') }
        : testCase.openclawExitCode === undefined
          ? { error: undefined, status: 0 }
          : { error: undefined, status: testCase.openclawExitCode };
      spawnSyncMock.mockReturnValueOnce(spawnResult);
      const fixtureRoot = path.resolve(process.cwd(), 'tests', 'compat-fixtures', testCase.name);
      const report = checkOpenClawCompatibility({ baseDir: fixtureRoot });
      expect(report.checks.map((check) => check.label)).toEqual(manifest.expectedCheckLabels);
      expect(report.warnings).toBe(testCase.expectedWarnings);
      expect(report.errors).toBe(testCase.expectedErrors);
      expect(compatibilityExitCode(report, { strict: true })).toBe(testCase.expectedExitCode);

      for (const [label, expectedStatus] of Object.entries(testCase.expectedCheckStatuses)) {
        const check = report.checks.find((candidate) => candidate.label === label);
        expect(check?.status).toBe(expectedStatus);
      }

      for (const [label, expectedSnippet] of Object.entries(testCase.expectedDetailIncludes ?? {})) {
        const check = report.checks.find((candidate) => candidate.label === label);
        expect(check?.detail).toContain(expectedSnippet);
      }

      for (const [label, expectedSnippet] of Object.entries(testCase.expectedHintIncludes ?? {})) {
        const check = report.checks.find((candidate) => candidate.label === label);
        expect(check?.hint).toContain(expectedSnippet);
      }
    }
  });
});

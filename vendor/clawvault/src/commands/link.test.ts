import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { linkCommand } from './link.js';

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-link-'));
}

function writeFile(root: string, relative: string, content: string): void {
  const filePath = path.join(root, relative);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('link command', () => {
  let vaultPath = '';
  let originalEnv: string | undefined;

  beforeEach(() => {
    vaultPath = makeTempVaultDir();
    originalEnv = process.env.CLAWVAULT_PATH;
    process.env.CLAWVAULT_PATH = vaultPath;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAWVAULT_PATH;
    } else {
      process.env.CLAWVAULT_PATH = originalEnv;
    }
    fs.rmSync(vaultPath, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('rebuilds backlinks and shows backlinks for a target', async () => {
    writeFile(vaultPath, 'people/alice.md', '# Alice');
    writeFile(vaultPath, 'notes/a.md', 'Met with [[people/alice]].');
    writeFile(vaultPath, 'notes/b.md', 'Followed up with [[people/alice]].');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await linkCommand(undefined, { rebuild: true });

    const backlinksPath = path.join(vaultPath, '.clawvault', 'backlinks.json');
    expect(fs.existsSync(backlinksPath)).toBe(true);

    logSpy.mockClear();
    await linkCommand(undefined, { backlinks: 'people/alice' });

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('Backlinks → people/alice');
    expect(output).toContain('notes/a');
    expect(output).toContain('notes/b');
  });

  it('lists orphan links', async () => {
    writeFile(vaultPath, 'notes/a.md', 'Reference to [[missing]].');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await linkCommand(undefined, { orphans: true });

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('orphan link(s) found');
    expect(output).toContain('[[missing]]');
  });

  it('supports explicit vault path without CLAWVAULT_PATH env', async () => {
    delete process.env.CLAWVAULT_PATH;
    writeFile(vaultPath, 'people/alice.md', '# Alice');
    writeFile(vaultPath, 'notes/a.md', 'Met with Alice.');

    await linkCommand(path.join(vaultPath, 'notes', 'a.md'), { vaultPath });
    const content = fs.readFileSync(path.join(vaultPath, 'notes', 'a.md'), 'utf-8');
    expect(content).toContain('[[people/alice]]');
    expect(fs.existsSync(path.join(vaultPath, '.clawvault', 'graph-index.json'))).toBe(true);
  });
});

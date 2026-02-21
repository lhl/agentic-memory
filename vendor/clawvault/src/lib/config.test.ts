import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findNearestVaultPath, resolveVaultPath } from './config.js';

const originalVaultEnv = process.env.CLAWVAULT_PATH;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

afterEach(() => {
  if (originalVaultEnv === undefined) {
    delete process.env.CLAWVAULT_PATH;
  } else {
    process.env.CLAWVAULT_PATH = originalVaultEnv;
  }
});

describe('config path resolution', () => {
  it('finds nearest vault from cwd hierarchy', () => {
    const root = makeTempDir('clawvault-config-');
    const nested = path.join(root, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(root, '.clawvault.json'), '{}', 'utf-8');

    try {
      const found = findNearestVaultPath(nested);
      expect(found).toBe(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('resolves explicit path before env or discovery', () => {
    const explicit = makeTempDir('clawvault-explicit-');
    const env = makeTempDir('clawvault-env-');
    process.env.CLAWVAULT_PATH = env;
    try {
      const resolved = resolveVaultPath({ explicitPath: explicit });
      expect(resolved).toBe(path.resolve(explicit));
    } finally {
      fs.rmSync(explicit, { recursive: true, force: true });
      fs.rmSync(env, { recursive: true, force: true });
    }
  });

  it('resolves env path before cwd discovery', () => {
    const env = makeTempDir('clawvault-env-');
    const cwdRoot = makeTempDir('clawvault-cwd-');
    const nested = path.join(cwdRoot, 'nested');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(cwdRoot, '.clawvault.json'), '{}', 'utf-8');
    process.env.CLAWVAULT_PATH = env;

    try {
      const resolved = resolveVaultPath({ cwd: nested });
      expect(resolved).toBe(path.resolve(env));
    } finally {
      fs.rmSync(env, { recursive: true, force: true });
      fs.rmSync(cwdRoot, { recursive: true, force: true });
    }
  });

  it('throws when no explicit path, env, or discovered vault exists', () => {
    const cwd = makeTempDir('clawvault-missing-');
    delete process.env.CLAWVAULT_PATH;
    try {
      expect(() => resolveVaultPath({ cwd })).toThrow(
        'No vault path found. Set CLAWVAULT_PATH, use --vault, or run inside a vault.'
      );
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

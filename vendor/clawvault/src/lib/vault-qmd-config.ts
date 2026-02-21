import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = '.clawvault.json';

interface VaultConfigPayload {
  name?: unknown;
  qmdCollection?: unknown;
  qmdRoot?: unknown;
}

export interface VaultQmdConfig {
  vaultPath: string;
  qmdCollection: string;
  qmdRoot: string;
}

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function loadVaultQmdConfig(vaultPath: string): VaultQmdConfig {
  const resolvedVaultPath = path.resolve(vaultPath);
  const fallbackName = path.basename(resolvedVaultPath);
  const fallbackRoot = resolvedVaultPath;
  const configPath = path.join(resolvedVaultPath, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return {
      vaultPath: resolvedVaultPath,
      qmdCollection: fallbackName,
      qmdRoot: fallbackRoot
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as VaultConfigPayload;
    const configuredName = readTrimmedString(raw.name) ?? fallbackName;
    const qmdCollection = readTrimmedString(raw.qmdCollection) ?? configuredName;
    const rawRoot = readTrimmedString(raw.qmdRoot) ?? fallbackRoot;
    const qmdRoot = path.isAbsolute(rawRoot)
      ? path.resolve(rawRoot)
      : path.resolve(resolvedVaultPath, rawRoot);

    return {
      vaultPath: resolvedVaultPath,
      qmdCollection,
      qmdRoot
    };
  } catch {
    return {
      vaultPath: resolvedVaultPath,
      qmdCollection: fallbackName,
      qmdRoot: fallbackRoot
    };
  }
}

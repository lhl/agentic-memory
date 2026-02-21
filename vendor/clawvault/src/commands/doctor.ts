import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClawVault, findVault } from '../lib/vault.js';
import { scanVaultLinks } from '../lib/backlinks.js';
import { formatAge } from '../lib/time.js';
import { hasQmd } from '../lib/search.js';
import { loadMemoryGraphIndex } from '../lib/memory-graph.js';
import { getObserverStaleness } from '../observer/active-session-observer.js';
import { checkOpenClawCompatibility } from './compat.js';

const CLAWVAULT_DIR = '.clawvault';
const CHECKPOINT_FILE = 'last-checkpoint.json';
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_USE_DAYS = 7;

export type DoctorStatus = 'ok' | 'warn' | 'error';

export interface DoctorCheck {
  label: string;
  status: DoctorStatus;
  detail?: string;
  hint?: string;
}

export interface DoctorReport {
  vaultPath?: string;
  checks: DoctorCheck[];
  warnings: number;
  errors: number;
}

function daysSince(date: Date, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - date.getTime()) / DAY_MS));
}

function describeAge(date: Date, now: number = Date.now()): string {
  return formatAge(now - date.getTime());
}

function loadCheckpointTimestamp(vaultPath: string): { timestamp?: string; error?: string } {
  const checkpointPath = path.join(vaultPath, CLAWVAULT_DIR, CHECKPOINT_FILE);
  if (!fs.existsSync(checkpointPath)) {
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8')) as { timestamp?: string };
    return { timestamp: data.timestamp };
  } catch (err: any) {
    return { error: err?.message || 'Failed to parse checkpoint' };
  }
}

function getShellConfigPaths(shellPath: string | undefined): string[] {
  const home = os.homedir();
  const shellName = shellPath ? path.basename(shellPath) : 'bash';
  if (shellName === 'zsh') {
    return [path.join(home, '.zshrc'), path.join(home, '.zprofile')];
  }
  if (shellName === 'fish') {
    return [path.join(home, '.config', 'fish', 'config.fish')];
  }
  return [path.join(home, '.bashrc'), path.join(home, '.bash_profile'), path.join(home, '.profile')];
}

function hasClawvaultPathConfig(paths: string[]): boolean {
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (/CLAWVAULT_PATH\s*=/.test(content)) {
        return true;
      }
    } catch {
      // ignore unreadable config files
    }
  }
  return false;
}

async function resolveVault(vaultPath?: string): Promise<ClawVault> {
  if (vaultPath) {
    const vault = new ClawVault(path.resolve(vaultPath));
    await vault.load();
    return vault;
  }

  const envPath = process.env.CLAWVAULT_PATH;
  if (envPath) {
    const vault = new ClawVault(path.resolve(envPath));
    await vault.load();
    return vault;
  }

  const found = await findVault();
  if (!found) {
    throw new Error('No ClawVault found. Run `clawvault init` first.');
  }
  return found;
}

export async function doctor(vaultPath?: string): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  let warnings = 0;
  let errors = 0;
  const compatReport = checkOpenClawCompatibility();

  if (compatReport.errors > 0) {
    checks.push({
      label: 'OpenClaw compatibility',
      status: 'error',
      detail: `${compatReport.errors} error(s), ${compatReport.warnings} warning(s)`,
      hint: 'Run `clawvault compat` for full compatibility diagnostics.'
    });
    errors++;
  } else if (compatReport.warnings > 0) {
    checks.push({
      label: 'OpenClaw compatibility',
      status: 'warn',
      detail: `${compatReport.warnings} warning(s)`,
      hint: 'Run `clawvault compat` for full compatibility diagnostics.'
    });
    warnings++;
  } else {
    checks.push({
      label: 'OpenClaw compatibility',
      status: 'ok'
    });
  }

  if (hasQmd()) {
    checks.push({ label: 'qmd installed', status: 'ok' });
  } else {
    checks.push({
      label: 'qmd installed',
      status: 'error',
      hint: 'Install qmd to enable ClawVault commands.'
    });
    errors++;
  }

  const shellConfigs = getShellConfigPaths(process.env.SHELL).filter(fs.existsSync);
  if (hasClawvaultPathConfig(shellConfigs)) {
    checks.push({
      label: 'CLAWVAULT_PATH in shell config',
      status: 'ok',
      detail: shellConfigs.map(p => path.basename(p)).join(', ')
    });
  } else {
    checks.push({
      label: 'CLAWVAULT_PATH in shell config',
      status: 'warn',
      hint: 'Run `clawvault shell-init` and add it to your shell rc.'
    });
    warnings++;
  }

  if (!hasQmd()) {
    return { vaultPath, checks, warnings, errors };
  }

  let vault: ClawVault;
  try {
    vault = await resolveVault(vaultPath);
    checks.push({ label: 'vault found', status: 'ok', detail: vault.getPath() });
  } catch (err: any) {
    checks.push({
      label: 'vault found',
      status: 'error',
      detail: err?.message || 'Unable to locate vault'
    });
    errors++;
    return { vaultPath, checks, warnings, errors };
  }

  const stats = await vault.stats();
  const documents = await vault.list();
  const handoffs = await vault.list('handoffs');
  const inbox = await vault.list('inbox');
  const qmdCollection = vault.getQmdCollection();

  if (qmdCollection) {
    checks.push({ label: 'qmd collection configured', status: 'ok', detail: qmdCollection });
  } else {
    checks.push({
      label: 'qmd collection configured',
      status: 'warn',
      hint: 'Set qmd collection in .clawvault.json'
    });
    warnings++;
  }

  const latestDoc = documents
    .slice()
    .sort((a, b) => b.modified.getTime() - a.modified.getTime())[0];
  const latestDocAge = latestDoc ? daysSince(latestDoc.modified) : null;

  const graphIndex = loadMemoryGraphIndex(vault.getPath());
  if (!graphIndex) {
    checks.push({
      label: 'memory graph index',
      status: 'warn',
      detail: 'No graph index found',
      hint: 'Run `clawvault graph --refresh` to build .clawvault/graph-index.json.'
    });
    warnings++;
  } else {
    const generatedAt = new Date(graphIndex.generatedAt);
    const generatedAge = describeAge(generatedAt);
    const latestDocIsNewer = latestDoc
      ? latestDoc.modified.getTime() > generatedAt.getTime() + 1000
      : false;
    if (latestDocIsNewer) {
      checks.push({
        label: 'memory graph index',
        status: 'warn',
        detail: `Stale graph index (generated ${generatedAge} ago)`,
        hint: 'Run `clawvault graph --refresh` to resync index.'
      });
      warnings++;
    } else {
      checks.push({
        label: 'memory graph index',
        status: 'ok',
        detail: `${graphIndex.graph.stats.nodeCount} nodes, ${graphIndex.graph.stats.edgeCount} edges`
      });
    }
  }

  let lastHandoffAge: number | null = null;
  if (handoffs.length === 0) {
    checks.push({
      label: 'recent handoff',
      status: 'warn',
      hint: 'Run `clawvault sleep` at the end of sessions.'
    });
    warnings++;
  } else {
    const latestHandoff = handoffs
      .slice()
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())[0];
    lastHandoffAge = daysSince(latestHandoff.modified);
    const ageLabel = describeAge(latestHandoff.modified);
    if (lastHandoffAge > 1) {
      checks.push({
        label: 'recent handoff',
        status: 'warn',
        detail: `Last handoff ${ageLabel} ago`,
        hint: 'Run `clawvault sleep` before long pauses.'
      });
      warnings++;
    } else {
      checks.push({
        label: 'recent handoff',
        status: 'ok',
        detail: `Last handoff ${ageLabel} ago`
      });
    }
  }

  const checkpointInfo = loadCheckpointTimestamp(vault.getPath());
  const activeUse =
    (latestDocAge !== null && latestDocAge <= ACTIVE_USE_DAYS) ||
    (lastHandoffAge !== null && lastHandoffAge <= ACTIVE_USE_DAYS);

  if (checkpointInfo.error) {
    checks.push({
      label: 'checkpoint freshness',
      status: 'warn',
      detail: checkpointInfo.error
    });
    warnings++;
  } else if (!checkpointInfo.timestamp) {
    const status = activeUse ? 'warn' : 'ok';
    if (status === 'warn') warnings++;
    checks.push({
      label: 'checkpoint freshness',
      status,
      detail: activeUse ? 'No checkpoint found' : 'No checkpoint found (vault appears inactive)',
      hint: activeUse ? 'Run `clawvault checkpoint` during heavy work.' : undefined
    });
  } else {
    const checkpointDate = new Date(checkpointInfo.timestamp);
    const checkpointAge = daysSince(checkpointDate);
    const ageLabel = describeAge(checkpointDate);
    if (activeUse && checkpointAge > 1) {
      checks.push({
        label: 'checkpoint freshness',
        status: 'warn',
        detail: `Last checkpoint ${ageLabel} ago`,
        hint: 'Checkpoint at least once per active day.'
      });
      warnings++;
    } else {
      checks.push({
        label: 'checkpoint freshness',
        status: 'ok',
        detail: `Last checkpoint ${ageLabel} ago`
      });
    }
  }

  const observerStaleness = getObserverStaleness(vault.getPath());
  if (observerStaleness.staleCount > 0) {
    checks.push({
      label: 'observer freshness',
      status: 'warn',
      detail: `${observerStaleness.staleCount} stale session cursor(s); oldest ${formatAge(observerStaleness.oldestMs)} ago`,
      hint: 'Run `clawvault observe --cron` and verify cron/hook scheduling.'
    });
    warnings++;
  } else {
    checks.push({
      label: 'observer freshness',
      status: 'ok'
    });
  }

  const linkScan = scanVaultLinks(vault.getPath());
  if (linkScan.orphans.length > 20) {
    checks.push({
      label: 'orphan links',
      status: 'warn',
      detail: `${linkScan.orphans.length} orphan link(s)`,
      hint: 'Run `clawvault link --orphans` to review.'
    });
    warnings++;
  } else {
    checks.push({
      label: 'orphan links',
      status: 'ok',
      detail: `${linkScan.orphans.length} orphan link(s)`
    });
  }

  if (inbox.length > 5) {
    checks.push({
      label: 'inbox backlog',
      status: 'warn',
      detail: `${inbox.length} inbox item(s) pending`,
      hint: 'Process inbox items to keep memory tidy.'
    });
    warnings++;
  } else {
    checks.push({
      label: 'inbox backlog',
      status: 'ok',
      detail: `${inbox.length} inbox item(s) pending`
    });
  }

  if (stats.documents < 5) {
    checks.push({
      label: 'vault activity',
      status: 'warn',
      detail: `${stats.documents} total documents`,
      hint: 'Start capturing decisions, lessons, and projects.'
    });
    warnings++;
  }

  return { vaultPath: vault.getPath(), checks, warnings, errors };
}

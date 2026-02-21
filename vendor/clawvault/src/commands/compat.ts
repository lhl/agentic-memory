import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

export type CompatStatus = 'ok' | 'warn' | 'error';

export interface CompatCheck {
  label: string;
  status: CompatStatus;
  detail?: string;
  hint?: string;
}

export interface CompatReport {
  generatedAt: string;
  checks: CompatCheck[];
  warnings: number;
  errors: number;
}

interface CompatOptions {
  baseDir?: string;
}

export interface CompatCommandOptions {
  json?: boolean;
  strict?: boolean;
  baseDir?: string;
}

const REQUIRED_HOOK_EVENTS = ['gateway:startup', 'command:new', 'session:start'];
const REQUIRED_HOOK_BIN = 'clawvault';

function readOptionalFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function findPackageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Unreachable in practice — we're always inside the package
  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveProjectFile(relativePath: string, baseDir?: string): string {
  if (baseDir) {
    return path.resolve(baseDir, relativePath);
  }

  const fromCwd = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  return path.resolve(findPackageRoot(), relativePath);
}

function checkOpenClawCli(): CompatCheck {
  const result = spawnSync('openclaw', ['--version'], { stdio: 'ignore' });
  if (result.error) {
    return {
      label: 'openclaw CLI available',
      status: 'warn',
      detail: 'openclaw binary not found',
      hint: 'Install OpenClaw CLI to enable hook runtime validation.'
    };
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    return {
      label: 'openclaw CLI available',
      status: 'warn',
      detail: `openclaw --version exited with code ${result.status}`,
      hint: 'Ensure OpenClaw CLI is installed and runnable in PATH.'
    };
  }
  if (typeof result.signal === 'string' && result.signal.length > 0) {
    return {
      label: 'openclaw CLI available',
      status: 'warn',
      detail: `openclaw --version terminated by signal ${result.signal}`,
      hint: 'Ensure OpenClaw CLI can execute normally in PATH.'
    };
  }
  return { label: 'openclaw CLI available', status: 'ok' };
}

function checkPackageHookRegistration(options: CompatOptions): CompatCheck {
  const packageRaw = readOptionalFile(resolveProjectFile('package.json', options.baseDir));
  if (!packageRaw) {
    return {
      label: 'package hook registration',
      status: 'error',
      detail: 'package.json not found'
    };
  }

  try {
    const parsed = JSON.parse(packageRaw) as { openclaw?: { hooks?: string[] } };
    const registeredHooks = parsed.openclaw?.hooks ?? [];
    if (registeredHooks.includes('./hooks/clawvault')) {
      return {
        label: 'package hook registration',
        status: 'ok',
        detail: './hooks/clawvault'
      };
    }
    return {
      label: 'package hook registration',
      status: 'error',
      detail: 'Missing ./hooks/clawvault in package openclaw.hooks'
    };
  } catch (err: any) {
    return {
      label: 'package hook registration',
      status: 'error',
      detail: err?.message || 'Unable to parse package.json'
    };
  }
}

function checkHookManifest(options: CompatOptions): CompatCheck {
  const hookRaw = readOptionalFile(resolveProjectFile('hooks/clawvault/HOOK.md', options.baseDir));
  if (!hookRaw) {
    return {
      label: 'hook manifest',
      status: 'error',
      detail: 'HOOK.md not found'
    };
  }

  try {
    const parsed = matter(hookRaw);
    const openclaw = (parsed.data?.metadata as { openclaw?: { events?: string[] } } | undefined)?.openclaw;
    const events = Array.isArray(openclaw?.events) ? openclaw?.events ?? [] : [];
    const missingEvents = REQUIRED_HOOK_EVENTS.filter((event) => !events.includes(event));
    if (missingEvents.length === 0) {
      return {
        label: 'hook manifest events',
        status: 'ok',
        detail: events.join(', ')
      };
    }
    return {
      label: 'hook manifest events',
      status: 'error',
      detail: `Missing events: ${missingEvents.join(', ')}`
    };
  } catch (err: any) {
    return {
      label: 'hook manifest events',
      status: 'error',
      detail: err?.message || 'Unable to parse HOOK.md frontmatter'
    };
  }
}

function checkHookManifestRequirements(options: CompatOptions): CompatCheck {
  const hookRaw = readOptionalFile(resolveProjectFile('hooks/clawvault/HOOK.md', options.baseDir));
  if (!hookRaw) {
    return {
      label: 'hook manifest requirements',
      status: 'error',
      detail: 'HOOK.md not found'
    };
  }

  try {
    const parsed = matter(hookRaw);
    const requiresBins = (
      (parsed.data?.metadata as { openclaw?: { requires?: { bins?: string[] } } } | undefined)
        ?.openclaw
        ?.requires
        ?.bins
    );
    const bins = Array.isArray(requiresBins) ? requiresBins : [];
    if (bins.includes(REQUIRED_HOOK_BIN)) {
      return {
        label: 'hook manifest requirements',
        status: 'ok',
        detail: `bins: ${bins.join(', ')}`
      };
    }

    return {
      label: 'hook manifest requirements',
      status: 'warn',
      detail: `Missing required hook bin "${REQUIRED_HOOK_BIN}"`,
      hint: 'Add metadata.openclaw.requires.bins: ["clawvault"] to hooks/clawvault/HOOK.md.'
    };
  } catch (err: any) {
    return {
      label: 'hook manifest requirements',
      status: 'error',
      detail: err?.message || 'Unable to parse HOOK.md frontmatter'
    };
  }
}

function checkHookHandlerSafety(options: CompatOptions): CompatCheck {
  const handlerRaw = readOptionalFile(resolveProjectFile('hooks/clawvault/handler.js', options.baseDir));
  if (!handlerRaw) {
    return {
      label: 'hook handler script',
      status: 'error',
      detail: 'handler.js not found'
    };
  }

  const usesExecFileSync = handlerRaw.includes('execFileSync');
  const usesExecSync = /\bexecSync\b/.test(handlerRaw);
  const enablesShell = /\bshell\s*:\s*true\b/.test(handlerRaw);
  const delegatesAutoProfile = /['"]--profile['"]\s*,\s*['"]auto['"]/.test(handlerRaw);

  const violations: string[] = [];
  if (!usesExecFileSync || usesExecSync) {
    violations.push('execFileSync-only execution path');
  }
  if (enablesShell) {
    violations.push('shell:false execution option');
  }
  if (!delegatesAutoProfile) {
    violations.push('shared context profile delegation (--profile auto)');
  }

  if (violations.length > 0) {
    return {
      label: 'hook handler safety',
      status: 'warn',
      detail: `Missing conventions: ${violations.join(', ')}`,
      hint: 'Use execFileSync (no shell), avoid execSync, and delegate profile inference via --profile auto.'
    };
  }

  return { label: 'hook handler safety', status: 'ok' };
}

function checkSkillMetadata(options: CompatOptions): CompatCheck {
  const skillRaw = readOptionalFile(resolveProjectFile('SKILL.md', options.baseDir));
  if (!skillRaw) {
    return {
      label: 'skill metadata',
      status: 'warn',
      detail: 'SKILL.md not found',
      hint: 'Ensure SKILL.md is present for OpenClaw skill distribution.'
    };
  }

  let hasOpenClawMetadata = false;
  let parseError: string | undefined;
  try {
    const parsed = matter(skillRaw);
    const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
    const metadata = (
      frontmatter.metadata
      && typeof frontmatter.metadata === 'object'
      && !Array.isArray(frontmatter.metadata)
    )
      ? frontmatter.metadata as Record<string, unknown>
      : undefined;

    hasOpenClawMetadata = Boolean(
      (metadata && typeof metadata.openclaw === 'object' && metadata.openclaw !== null)
      || (typeof frontmatter.openclaw === 'object' && frontmatter.openclaw !== null)
    );
  } catch {
    parseError = 'Unable to parse SKILL.md frontmatter';
    hasOpenClawMetadata = false;
  }

  if (!hasOpenClawMetadata) {
    hasOpenClawMetadata = /"openclaw"\s*:/.test(skillRaw);
  }

  if (!hasOpenClawMetadata) {
    const detail = parseError
      ? `${parseError} (or missing metadata.openclaw)`
      : 'Missing metadata.openclaw in SKILL.md';
    return {
      label: 'skill metadata',
      status: 'warn',
      detail,
      hint: 'Add metadata.openclaw to SKILL.md frontmatter for OpenClaw compatibility.'
    };
  }

  return { label: 'skill metadata', status: 'ok' };
}

export function checkOpenClawCompatibility(options: CompatOptions = {}): CompatReport {
  const checks = [
    checkOpenClawCli(),
    checkPackageHookRegistration(options),
    checkHookManifest(options),
    checkHookManifestRequirements(options),
    checkHookHandlerSafety(options),
    checkSkillMetadata(options)
  ];

  const warnings = checks.filter((check) => check.status === 'warn').length;
  const errors = checks.filter((check) => check.status === 'error').length;

  return {
    generatedAt: new Date().toISOString(),
    checks,
    warnings,
    errors
  };
}

function formatCompatibilityReport(report: CompatReport): string {
  const lines: string[] = [];
  lines.push('OpenClaw Compatibility Report');
  lines.push('-'.repeat(34));
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');

  for (const check of report.checks) {
    const prefix = check.status === 'ok'
      ? '✓'
      : check.status === 'warn'
        ? '⚠'
        : '✗';
    lines.push(`${prefix} ${check.label}${check.detail ? ` — ${check.detail}` : ''}`);
    if (check.hint) {
      lines.push(`  ${check.hint}`);
    }
  }

  lines.push('');
  lines.push(`Warnings: ${report.warnings}`);
  lines.push(`Errors: ${report.errors}`);
  return lines.join('\n');
}

export function compatibilityExitCode(
  report: CompatReport,
  options: { strict?: boolean } = {}
): number {
  if (report.errors > 0) {
    return 1;
  }
  if (options.strict && report.warnings > 0) {
    return 1;
  }
  return 0;
}

export async function compatCommand(options: CompatCommandOptions = {}): Promise<CompatReport> {
  const report = checkOpenClawCompatibility({ baseDir: options.baseDir });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatCompatibilityReport(report));
  }
  return report;
}

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execFileSync } from 'child_process';
import { ClawVault } from '../lib/vault.js';
import { qmdUpdate } from '../lib/search.js';
import type { Document, HandoffDocument } from '../types.js';
import { clearDirtyFlag } from './checkpoint.js';
import { Observer } from '../observer/observer.js';
import { parseSessionFile } from '../observer/session-parser.js';
import { runReflection } from '../observer/reflection-service.js';

export type PromptFn = (question: string) => Promise<string>;

export interface SleepOptions {
  workingOn: string;
  next?: string;
  blocked?: string;
  decisions?: string;
  questions?: string;
  feeling?: string;
  sessionKey?: string;
  vaultPath: string;
  index?: boolean;
  git?: boolean;
  sessionTranscript?: string;
  reflect?: boolean;
  qmdIndexName?: string;
  prompt?: PromptFn;
  cwd?: string;
}

export interface GitCommitResult {
  repoRoot?: string;
  dirtyCount?: number;
  committed: boolean;
  message?: string;
  skippedReason?: string;
}

export interface SleepResult {
  handoff: HandoffDocument;
  document: Document;
  git?: GitCommitResult;
  observationRoutingSummary?: string;
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function defaultPrompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function resolveSessionTranscriptPath(explicitPath?: string): string | null {
  const candidates = [
    explicitPath,
    process.env.CLAWVAULT_SESSION_TRANSCRIPT,
    process.env.OPENCLAW_SESSION_FILE,
    process.env.OPENCLAW_SESSION_TRANSCRIPT
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    const resolved = path.resolve(candidate.trim());
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return null;
}

function ensureNonEmpty(label: string, items: string[]): void {
  if (items.length === 0) {
    throw new Error(`${label} is required.`);
  }
}

async function promptForList(
  label: string,
  prompt: PromptFn,
  interactive: boolean
): Promise<string[]> {
  if (!interactive) return [];
  const answer = await prompt(`${label} (comma-separated, empty to skip): `);
  return parseList(answer);
}

function findGitRoot(startPath: string): string | null {
  let current = path.resolve(startPath);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function getGitStatus(repoRoot: string): { clean: boolean; dirtyCount: number } {
  const output = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain'], {
    encoding: 'utf-8'
  });
  const lines = output.split('\n').filter(Boolean);
  return { clean: lines.length === 0, dirtyCount: lines.length };
}

function isAffirmative(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}

async function maybeCommitDirtyRepo(options: {
  enabled: boolean;
  prompt: PromptFn;
  cwd: string;
  interactive: boolean;
}): Promise<GitCommitResult | undefined> {
  if (!options.enabled) {
    return { committed: false, skippedReason: 'disabled' };
  }

  const repoRoot = findGitRoot(options.cwd);
  if (!repoRoot) {
    return { committed: false, skippedReason: 'no-repo' };
  }

  let status: { clean: boolean; dirtyCount: number };
  try {
    status = getGitStatus(repoRoot);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { committed: false, skippedReason: 'git-missing' };
    }
    return { repoRoot, committed: false, skippedReason: 'status-error' };
  }

  if (status.clean) {
    return { repoRoot, dirtyCount: status.dirtyCount, committed: false, skippedReason: 'clean' };
  }

  if (!options.interactive) {
    return { repoRoot, dirtyCount: status.dirtyCount, committed: false, skippedReason: 'non-interactive' };
  }

  const confirm = await options.prompt(
    `Git repo dirty (${status.dirtyCount} change(s)). Commit before sleep? (y/N): `
  );
  if (!isAffirmative(confirm)) {
    return { repoRoot, dirtyCount: status.dirtyCount, committed: false, skippedReason: 'declined' };
  }

  const message = await options.prompt('Commit message: ');
  if (!message) {
    return { repoRoot, dirtyCount: status.dirtyCount, committed: false, skippedReason: 'no-message' };
  }

  try {
    execFileSync('git', ['-C', repoRoot, 'add', '-A'], { stdio: 'inherit' });
    execFileSync('git', ['-C', repoRoot, 'commit', '-m', message], { stdio: 'inherit' });
  } catch (err: any) {
    throw new Error(`Git commit failed: ${err?.message || 'unknown error'}`);
  }

  return {
    repoRoot,
    dirtyCount: status.dirtyCount,
    committed: true,
    message
  };
}

export async function sleep(options: SleepOptions): Promise<SleepResult> {
  const prompt = options.prompt ?? defaultPrompt;
  const interactive = isInteractive();
  const workingOn = parseList(options.workingOn);
  ensureNonEmpty('Working-on summary', workingOn);

  const nextProvided = options.next !== undefined;
  const blockedProvided = options.blocked !== undefined;

  let nextSteps = parseList(options.next);
  let blocked = parseList(options.blocked);

  if (!nextProvided) {
    nextSteps = await promptForList('Next steps', prompt, interactive);
  }

  if (!blockedProvided) {
    blocked = await promptForList('Blocked items', prompt, interactive);
  }

  const decisions = parseList(options.decisions);
  const questions = parseList(options.questions);

  const vault = new ClawVault(path.resolve(options.vaultPath));
  await vault.load();

  const handoffInput = {
    workingOn,
    blocked,
    nextSteps,
    decisions: decisions.length > 0 ? decisions : undefined,
    openQuestions: questions.length > 0 ? questions : undefined,
    feeling: options.feeling,
    sessionKey: options.sessionKey
  };

  const document = await vault.createHandoff(handoffInput);
  const handoff: HandoffDocument = {
    ...handoffInput,
    created: document.modified.toISOString()
  };
  await clearDirtyFlag(vault.getPath());

  if (options.index) {
    qmdUpdate(vault.getQmdCollection(), options.qmdIndexName);
  }

  const git = await maybeCommitDirtyRepo({
    enabled: options.git !== false,
    prompt,
    cwd: options.cwd ?? process.cwd(),
    interactive
  });

  let observationRoutingSummary: string | undefined;

  try {
    const transcriptPath = resolveSessionTranscriptPath(options.sessionTranscript);
    if (transcriptPath) {
      const observer = new Observer(vault.getPath());
      const messages = parseSessionFile(transcriptPath);
      const transcriptStat = fs.statSync(transcriptPath);
      await observer.processMessages(messages, {
        source: 'openclaw',
        transcriptId: path.basename(transcriptPath),
        timestamp: transcriptStat.mtime
      });
      const { routingSummary } = await observer.flush();
      observationRoutingSummary = routingSummary || undefined;
    }
  } catch {
    // Observational memory should never block session handoff completion.
  }

  if (options.reflect) {
    try {
      await runReflection({
        vaultPath: vault.getPath(),
        days: 14,
        dryRun: false
      });
    } catch {
      // Reflection is best-effort and should not block handoff completion.
    }
  }

  return { handoff, document, git, observationRoutingSummary };
}
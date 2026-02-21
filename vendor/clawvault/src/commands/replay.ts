import * as fs from 'fs';
import * as path from 'path';
import type { Command } from 'commander';
import { resolveVaultPath } from '../lib/config.js';
import { Observer } from '../observer/observer.js';
import { runReflection } from '../observer/reflection-service.js';
import { normalizeChatGptExport } from '../replay/normalizers/chatgpt.js';
import { normalizeClaudeExport } from '../replay/normalizers/claude.js';
import { normalizeOpenCodeExport } from '../replay/normalizers/opencode.js';
import { normalizeOpenClawTranscript } from '../replay/normalizers/openclaw.js';
import type { NormalizedReplayMessage, ReplaySource } from '../replay/types.js';

export interface ReplayCommandOptions {
  source: ReplaySource;
  inputPath: string;
  from?: string;
  to?: string;
  dryRun?: boolean;
  vaultPath?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateFlag(raw: string | undefined, label: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!DATE_RE.test(trimmed)) {
    throw new Error(`Invalid ${label} date. Expected YYYY-MM-DD: ${raw}`);
  }
  return trimmed;
}

function collectFiles(rootPath: string, predicate: (absolutePath: string) => boolean): string[] {
  if (!fs.existsSync(rootPath)) {
    return [];
  }
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    return predicate(rootPath) ? [rootPath] : [];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const absolute = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolute, predicate));
      continue;
    }
    if (entry.isFile() && predicate(absolute)) {
      files.push(absolute);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function loadJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
}

function normalizeReplayMessages(source: ReplaySource, inputPath: string): NormalizedReplayMessage[] {
  if (source === 'chatgpt') {
    const files = collectFiles(inputPath, (filePath) => path.basename(filePath).toLowerCase() === 'conversations.json');
    if (files.length === 0) {
      throw new Error('ChatGPT replay expects conversations.json in --input path.');
    }
    return files.flatMap((filePath) => normalizeChatGptExport(loadJson(filePath)));
  }

  if (source === 'claude') {
    const files = collectFiles(inputPath, (filePath) => filePath.toLowerCase().endsWith('.json'));
    if (files.length === 0) {
      throw new Error('Claude replay expects one or more .json files.');
    }
    return files.flatMap((filePath) => normalizeClaudeExport(loadJson(filePath)));
  }

  if (source === 'opencode') {
    const files = collectFiles(inputPath, (filePath) =>
      filePath.toLowerCase().endsWith('.json') || filePath.toLowerCase().endsWith('.jsonl')
    );
    if (files.length === 0) {
      throw new Error('OpenCode replay expects .json or .jsonl input files.');
    }
    return files.flatMap((filePath) => {
      if (filePath.toLowerCase().endsWith('.jsonl')) {
        return normalizeOpenCodeExport(fs.readFileSync(filePath, 'utf-8'));
      }
      return normalizeOpenCodeExport(loadJson(filePath));
    });
  }

  const files = collectFiles(inputPath, (filePath) => filePath.toLowerCase().endsWith('.jsonl'));
  if (files.length === 0) {
    throw new Error('OpenClaw replay expects .jsonl session transcript files.');
  }
  return files.flatMap((filePath) => normalizeOpenClawTranscript(fs.readFileSync(filePath, 'utf-8')));
}

function normalizeDateFromTimestamp(timestamp: string | undefined, fallbackDate: string): string {
  if (!timestamp) return fallbackDate;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate;
  }
  return parsed.toISOString().slice(0, 10);
}

export async function replayCommand(options: ReplayCommandOptions): Promise<void> {
  const source = options.source;
  if (!['chatgpt', 'claude', 'opencode', 'openclaw'].includes(source)) {
    throw new Error(`Unsupported replay source: ${source}`);
  }

  const fromDate = parseDateFlag(options.from, 'from');
  const toDate = parseDateFlag(options.to, 'to');
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error(`Invalid range: --from ${fromDate} is after --to ${toDate}.`);
  }

  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const resolvedInput = path.resolve(options.inputPath);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Replay input path not found: ${resolvedInput}`);
  }

  const allMessages = normalizeReplayMessages(source, resolvedInput);
  const fallbackDate = new Date().toISOString().slice(0, 10);
  const filtered = allMessages.filter((message) => {
    const date = normalizeDateFromTimestamp(message.timestamp, fallbackDate);
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  if (filtered.length === 0) {
    console.log('Replay found no messages in the requested range.');
    return;
  }

  const grouped = new Map<string, NormalizedReplayMessage[]>();
  for (const message of filtered) {
    const date = normalizeDateFromTimestamp(message.timestamp, fallbackDate);
    const bucket = grouped.get(date) ?? [];
    bucket.push(message);
    grouped.set(date, bucket);
  }

  const dates = [...grouped.keys()].sort((left, right) => left.localeCompare(right));
  if (options.dryRun) {
    console.log(`Dry run: ${filtered.length} message(s) across ${dates.length} day(s) would be replayed.`);
    return;
  }

  let observedDays = 0;
  for (const date of dates) {
    const nowForDate = () => new Date(`${date}T12:00:00.000Z`);
    const observer = new Observer(vaultPath, {
      tokenThreshold: 1,
      reflectThreshold: Number.MAX_SAFE_INTEGER,
      now: nowForDate
    });
    const messages = (grouped.get(date) ?? [])
      .map((message) => {
        const role = message.role?.trim().toLowerCase();
        return role ? `${role}: ${message.text}` : message.text;
      })
      .filter(Boolean);
    if (messages.length === 0) {
      continue;
    }
    await observer.processMessages(messages, {
      source,
      transcriptId: path.basename(resolvedInput),
      timestamp: nowForDate()
    });
    await observer.flush();
    observedDays += 1;
  }

  if (dates.length > 0) {
    const first = new Date(`${dates[0]}T00:00:00.000Z`);
    const last = new Date(`${dates[dates.length - 1]}T00:00:00.000Z`);
    const spanDays = Math.max(1, Math.floor((last.getTime() - first.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    await runReflection({
      vaultPath,
      days: spanDays,
      now: () => new Date(`${dates[dates.length - 1]}T12:00:00.000Z`),
      dryRun: false
    });
  }

  console.log(`Replay complete: ${filtered.length} message(s) ingested across ${observedDays} day(s).`);
}

export function registerReplayCommand(program: Command): void {
  program
    .command('replay')
    .description('Replay historical exports into ClawVault observations')
    .requiredOption('--source <platform>', 'Source platform (chatgpt|claude|opencode|openclaw)')
    .requiredOption('--input <path>', 'Export file or directory')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--dry-run', 'Preview replay without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (rawOptions: {
      source: ReplaySource;
      input: string;
      from?: string;
      to?: string;
      dryRun?: boolean;
      vault?: string;
    }) => {
      await replayCommand({
        source: rawOptions.source,
        inputPath: rawOptions.input,
        from: rawOptions.from,
        to: rawOptions.to,
        dryRun: rawOptions.dryRun,
        vaultPath: rawOptions.vault
      });
    });
}

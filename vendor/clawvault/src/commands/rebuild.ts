import * as fs from 'fs';
import type { Command } from 'commander';
import { resolveVaultPath } from '../lib/config.js';
import {
  getLegacyObservationPath,
  getObservationPath,
  listRawTranscriptFiles
} from '../lib/ledger.js';
import { Observer } from '../observer/observer.js';

export interface RebuildCommandOptions {
  vaultPath?: string;
  from?: string;
  to?: string;
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

function loadRawMessages(rawFilePath: string): string[] {
  const lines = fs.readFileSync(rawFilePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const messages: string[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        messages.push(parsed.message.trim());
      }
    } catch {
      // Keep plain-line fallback for non-JSON legacy raw chunks.
      messages.push(line);
    }
  }

  return messages;
}

export async function rebuildCommand(options: RebuildCommandOptions): Promise<void> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const fromDate = parseDateFlag(options.from, 'from');
  const toDate = parseDateFlag(options.to, 'to');
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error(`Invalid range: --from ${fromDate} is after --to ${toDate}.`);
  }

  const rawFiles = listRawTranscriptFiles(vaultPath, {
    fromDate,
    toDate
  });
  if (rawFiles.length === 0) {
    console.log('No raw transcripts found for rebuild range.');
    return;
  }

  const filesByDate = new Map<string, Array<{ source: string; path: string }>>();
  for (const file of rawFiles) {
    const bucket = filesByDate.get(file.date) ?? [];
    bucket.push({ source: file.source, path: file.path });
    filesByDate.set(file.date, bucket);
  }

  const dates = [...filesByDate.keys()].sort((left, right) => left.localeCompare(right));
  let rebuiltDates = 0;
  let processedFiles = 0;

  for (const date of dates) {
    const ledgerObservationPath = getObservationPath(vaultPath, date);
    const legacyObservationPath = getLegacyObservationPath(vaultPath, date);
    fs.rmSync(ledgerObservationPath, { force: true });
    fs.rmSync(legacyObservationPath, { force: true });

    const fixedNow = () => new Date(`${date}T12:00:00.000Z`);
    const observer = new Observer(vaultPath, {
      tokenThreshold: 1,
      reflectThreshold: Number.MAX_SAFE_INTEGER,
      now: fixedNow,
      rawCapture: false
    });

    for (const file of filesByDate.get(date) ?? []) {
      const messages = loadRawMessages(file.path);
      if (messages.length === 0) {
        continue;
      }
      await observer.processMessages(messages, {
        source: file.source,
        timestamp: fixedNow()
      });
      processedFiles += 1;
    }

    await observer.flush();
    rebuiltDates += 1;
  }

  console.log(`Rebuild complete: ${rebuiltDates} day(s), ${processedFiles} raw file(s) replayed.`);
}

export function registerRebuildCommand(program: Command): void {
  program
    .command('rebuild')
    .description('Rebuild compiled observations from raw ledger transcripts')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (rawOptions: { from?: string; to?: string; vault?: string }) => {
      await rebuildCommand({
        vaultPath: rawOptions.vault,
        from: rawOptions.from,
        to: rawOptions.to
      });
    });
}

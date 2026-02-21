import * as fs from 'fs';
import type { Command } from 'commander';
import { resolveVaultPath } from '../lib/config.js';
import { listObservationFiles } from '../lib/ledger.js';
import {
  DATE_HEADING_RE,
  parseObservationLine,
  renderScoredObservationLine
} from '../lib/observation-format.js';

export interface MigrateObservationsOptions {
  vaultPath?: string;
  dryRun?: boolean;
}

export interface MigrateObservationsResult {
  scanned: number;
  migrated: number;
  backups: number;
  dryRun: boolean;
}

function toBackupPath(filePath: string): string {
  if (filePath.toLowerCase().endsWith('.md')) {
    return `${filePath.slice(0, -3)}.emoji-backup.md`;
  }
  return `${filePath}.emoji-backup`;
}

function convertObservationMarkdown(markdown: string): { converted: string; changed: boolean } {
  const lines = markdown.split(/\r?\n/);
  let currentDate = '';
  let changed = false;
  const nextLines = lines.map((line) => {
    const heading = line.match(DATE_HEADING_RE);
    if (heading) {
      currentDate = heading[1];
      return line;
    }

    if (!currentDate) {
      return line;
    }

    const parsed = parseObservationLine(line.trim(), currentDate);
    if (!parsed || parsed.format !== 'emoji') {
      return line;
    }

    changed = true;
    return renderScoredObservationLine({
      type: parsed.type,
      confidence: parsed.confidence,
      importance: parsed.importance,
      content: parsed.content
    });
  });

  return {
    converted: nextLines.join('\n'),
    changed
  };
}

export function migrateObservations(vaultPath: string, options: { dryRun?: boolean } = {}): MigrateObservationsResult {
  const dryRun = options.dryRun ?? false;
  const files = listObservationFiles(vaultPath, {
    includeLegacy: true,
    includeArchive: false,
    dedupeByDate: false
  });

  let migrated = 0;
  let backups = 0;

  for (const entry of files) {
    const raw = fs.readFileSync(entry.path, 'utf-8');
    const { converted, changed } = convertObservationMarkdown(raw);
    if (!changed) {
      continue;
    }

    migrated += 1;
    if (dryRun) {
      continue;
    }

    const backupPath = toBackupPath(entry.path);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(entry.path, backupPath);
      backups += 1;
    }

    fs.writeFileSync(entry.path, `${converted.trim()}\n`, 'utf-8');
  }

  return {
    scanned: files.length,
    migrated,
    backups,
    dryRun
  };
}

export async function migrateObservationsCommand(options: MigrateObservationsOptions): Promise<void> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const result = migrateObservations(vaultPath, { dryRun: options.dryRun });

  if (result.migrated === 0) {
    console.log('No emoji observations found for migration.');
    return;
  }

  if (result.dryRun) {
    console.log(`Dry run: ${result.migrated} file(s) would be migrated.`);
    return;
  }

  console.log(`Migrated ${result.migrated} file(s); created ${result.backups} backup(s).`);
}

export function registerMigrateObservationsCommand(program: Command): void {
  program
    .command('migrate-observations')
    .description('Convert legacy emoji observations to scored format with backups')
    .option('--dry-run', 'Preview migration without writing files')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (rawOptions: { dryRun?: boolean; vault?: string }) => {
      await migrateObservationsCommand({
        vaultPath: rawOptions.vault,
        dryRun: rawOptions.dryRun
      });
    });
}

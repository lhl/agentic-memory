import type { Command } from 'commander';
import { resolveVaultPath } from '../lib/config.js';
import { archiveObservations } from '../observer/archive.js';

export interface ArchiveCommandOptions {
  vaultPath?: string;
  olderThan?: number;
  dryRun?: boolean;
}

function parsePositiveInteger(raw: string, label: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${raw}`);
  }
  return parsed;
}

export async function archiveCommand(options: ArchiveCommandOptions): Promise<void> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const result = archiveObservations(vaultPath, {
    olderThanDays: options.olderThan,
    dryRun: options.dryRun
  });

  if (result.archived === 0) {
    console.log('No observations matched archive criteria.');
    return;
  }

  if (result.dryRun) {
    console.log(`Dry run: ${result.archived} observation file(s) would be archived.`);
    return;
  }

  console.log(`Archived ${result.archived} observation file(s).`);
}

export function registerArchiveCommand(program: Command): void {
  program
    .command('archive')
    .description('Archive old observations into ledger/archive')
    .option('--older-than <days>', 'Archive observations older than this many days', '14')
    .option('--dry-run', 'Show archive candidates without moving files')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (rawOptions: {
      olderThan: string;
      dryRun?: boolean;
      vault?: string;
    }) => {
      await archiveCommand({
        vaultPath: rawOptions.vault,
        olderThan: parsePositiveInteger(rawOptions.olderThan, 'older-than'),
        dryRun: rawOptions.dryRun
      });
    });
}

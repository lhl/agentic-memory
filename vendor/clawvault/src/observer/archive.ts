import * as fs from 'fs';
import {
  ensureParentDir,
  getArchiveObservationPath,
  listObservationFiles
} from '../lib/ledger.js';

export interface ArchiveObservationsOptions {
  olderThanDays?: number;
  dryRun?: boolean;
  now?: () => Date;
}

export interface ArchiveObservationsResult {
  scanned: number;
  archived: number;
  skipped: number;
  dryRun: boolean;
  archivedDates: string[];
}

export function archiveObservations(
  vaultPath: string,
  options: ArchiveObservationsOptions = {}
): ArchiveObservationsResult {
  const olderThanDays = Number.isFinite(options.olderThanDays)
    ? Math.max(1, Math.floor(options.olderThanDays as number))
    : 14;
  const dryRun = options.dryRun ?? false;
  const now = options.now ?? (() => new Date());

  const today = new Date(now());
  today.setUTCHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setUTCDate(today.getUTCDate() - olderThanDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const files = listObservationFiles(vaultPath, {
    includeLegacy: true,
    includeArchive: false,
    dedupeByDate: true
  });

  let archived = 0;
  let skipped = 0;
  const archivedDates: string[] = [];

  for (const file of files) {
    if (file.date >= cutoffKey) {
      continue;
    }

    const archivePath = getArchiveObservationPath(vaultPath, file.date);
    if (dryRun) {
      archived += 1;
      archivedDates.push(file.date);
      continue;
    }

    ensureParentDir(archivePath);
    fs.copyFileSync(file.path, archivePath);
    if (file.path !== archivePath) {
      fs.rmSync(file.path, { force: true });
    } else {
      skipped += 1;
      continue;
    }
    archived += 1;
    archivedDates.push(file.date);
  }

  return {
    scanned: files.length,
    archived,
    skipped,
    dryRun,
    archivedDates
  };
}

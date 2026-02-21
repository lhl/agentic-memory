import * as fs from 'fs';
import * as path from 'path';

export type ObservationSource = 'openclaw' | 'chatgpt' | 'claude' | 'opencode';
export type ObservationLocation = 'ledger' | 'legacy' | 'archive';

export interface ObservationFileEntry {
  date: string;
  path: string;
  location: ObservationLocation;
}

export interface RawTranscriptFileEntry {
  source: string;
  date: string;
  path: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^(0[1-9]|1[0-2])$/;
const DAY_FILE_RE = /^(0[1-9]|[12]\d|3[01])\.md$/;
const RAW_DAY_FILE_RE = /^(0[1-9]|[12]\d|3[01])\.jsonl$/;

function normalizeDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    if (!DATE_RE.test(date)) {
      throw new Error(`Invalid date key: ${date}`);
    }
    return date;
  }
  return date.toISOString().slice(0, 10);
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function walkThreeLevelDateTree(rootPath: string, extension: '.md' | '.jsonl'): Array<{
  date: string;
  absolutePath: string;
}> {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const results: Array<{ date: string; absolutePath: string }> = [];

  for (const yearEntry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || !YEAR_RE.test(yearEntry.name)) continue;
    const yearDir = path.join(rootPath, yearEntry.name);

    for (const monthEntry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!monthEntry.isDirectory() || !MONTH_RE.test(monthEntry.name)) continue;
      const monthDir = path.join(yearDir, monthEntry.name);

      for (const dayEntry of fs.readdirSync(monthDir, { withFileTypes: true })) {
        if (!dayEntry.isFile()) continue;
        const matches = extension === '.md'
          ? DAY_FILE_RE.test(dayEntry.name)
          : RAW_DAY_FILE_RE.test(dayEntry.name);
        if (!matches) continue;

        const day = dayEntry.name.slice(0, extension.length * -1);
        const date = `${yearEntry.name}-${monthEntry.name}-${day}`;
        if (!DATE_RE.test(date)) continue;

        results.push({
          date,
          absolutePath: path.join(monthDir, dayEntry.name)
        });
      }
    }
  }

  return results;
}

function inDateRange(date: string, fromDate?: string, toDate?: string): boolean {
  if (fromDate && date < fromDate) {
    return false;
  }
  if (toDate && date > toDate) {
    return false;
  }
  return true;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(date: string): Date | null {
  if (!DATE_RE.test(date)) {
    return null;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getLedgerRoot(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), 'ledger');
}

export function getRawRoot(vaultPath: string): string {
  return path.join(getLedgerRoot(vaultPath), 'raw');
}

export function getRawSourceDir(vaultPath: string, source: string): string {
  return path.join(getRawRoot(vaultPath), source);
}

export function getObservationsRoot(vaultPath: string): string {
  return path.join(getLedgerRoot(vaultPath), 'observations');
}

export function getReflectionsRoot(vaultPath: string): string {
  return path.join(getLedgerRoot(vaultPath), 'reflections');
}

export function getArchiveObservationsRoot(vaultPath: string): string {
  return path.join(getLedgerRoot(vaultPath), 'archive', 'observations');
}

export function getLegacyObservationsRoot(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), 'observations');
}

export function getObservationPath(vaultPath: string, date: Date | string): string {
  const dateKey = normalizeDateKey(date);
  const [year, month, day] = dateKey.split('-');
  return path.join(getObservationsRoot(vaultPath), year, month, `${day}.md`);
}

export function getArchiveObservationPath(vaultPath: string, date: Date | string): string {
  const dateKey = normalizeDateKey(date);
  const [year, month, day] = dateKey.split('-');
  return path.join(getArchiveObservationsRoot(vaultPath), year, month, `${day}.md`);
}

export function getLegacyObservationPath(vaultPath: string, date: Date | string): string {
  const dateKey = normalizeDateKey(date);
  return path.join(getLegacyObservationsRoot(vaultPath), `${dateKey}.md`);
}

export function getRawTranscriptPath(
  vaultPath: string,
  source: string,
  date: Date | string
): string {
  const dateKey = normalizeDateKey(date);
  const [year, month, day] = dateKey.split('-');
  return path.join(getRawSourceDir(vaultPath, source), year, month, `${day}.jsonl`);
}

export function ensureLedgerStructure(vaultPath: string): void {
  const root = getLedgerRoot(vaultPath);
  const rawRoot = getRawRoot(vaultPath);
  ensureDir(root);
  ensureDir(rawRoot);
  for (const source of ['openclaw', 'chatgpt', 'claude', 'opencode']) {
    ensureDir(path.join(rawRoot, source));
  }
  ensureDir(getObservationsRoot(vaultPath));
  ensureDir(getReflectionsRoot(vaultPath));
  ensureDir(getArchiveObservationsRoot(vaultPath));
}

export function listLedgerObservationFiles(
  vaultPath: string,
  options: { fromDate?: string; toDate?: string } = {}
): ObservationFileEntry[] {
  return walkThreeLevelDateTree(getObservationsRoot(vaultPath), '.md')
    .filter((entry) => inDateRange(entry.date, options.fromDate, options.toDate))
    .map((entry) => ({
      date: entry.date,
      path: entry.absolutePath,
      location: 'ledger' as const
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function listArchiveObservationFiles(
  vaultPath: string,
  options: { fromDate?: string; toDate?: string } = {}
): ObservationFileEntry[] {
  return walkThreeLevelDateTree(getArchiveObservationsRoot(vaultPath), '.md')
    .filter((entry) => inDateRange(entry.date, options.fromDate, options.toDate))
    .map((entry) => ({
      date: entry.date,
      path: entry.absolutePath,
      location: 'archive' as const
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function listLegacyObservationFiles(
  vaultPath: string,
  options: { fromDate?: string; toDate?: string } = {}
): ObservationFileEntry[] {
  const legacyRoot = getLegacyObservationsRoot(vaultPath);
  if (!fs.existsSync(legacyRoot)) {
    return [];
  }

  return fs.readdirSync(legacyRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && DATE_RE.test(entry.name.replace(/\.md$/, '')) && entry.name.endsWith('.md'))
    .map((entry) => {
      const date = entry.name.replace(/\.md$/, '');
      return {
        date,
        path: path.join(legacyRoot, entry.name),
        location: 'legacy' as const
      };
    })
    .filter((entry) => inDateRange(entry.date, options.fromDate, options.toDate))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function listObservationFiles(
  vaultPath: string,
  options: {
    includeLegacy?: boolean;
    includeArchive?: boolean;
    dedupeByDate?: boolean;
    fromDate?: string;
    toDate?: string;
  } = {}
): ObservationFileEntry[] {
  const includeLegacy = options.includeLegacy ?? true;
  const includeArchive = options.includeArchive ?? false;
  const dedupeByDate = options.dedupeByDate ?? true;

  const files = [
    ...listLedgerObservationFiles(vaultPath, options),
    ...(includeLegacy ? listLegacyObservationFiles(vaultPath, options) : []),
    ...(includeArchive ? listArchiveObservationFiles(vaultPath, options) : [])
  ];

  if (!dedupeByDate) {
    return files.sort((left, right) => left.date.localeCompare(right.date));
  }

  const byDate = new Map<string, ObservationFileEntry>();
  const locationRank: Record<ObservationLocation, number> = {
    ledger: 3,
    legacy: 2,
    archive: 1
  };

  for (const file of files) {
    const existing = byDate.get(file.date);
    if (!existing || locationRank[file.location] > locationRank[existing.location]) {
      byDate.set(file.date, file);
    }
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function listRawTranscriptFiles(
  vaultPath: string,
  options: { source?: string; fromDate?: string; toDate?: string } = {}
): RawTranscriptFileEntry[] {
  const rawRoot = getRawRoot(vaultPath);
  if (!fs.existsSync(rawRoot)) {
    return [];
  }

  const sources = options.source
    ? [options.source]
    : fs.readdirSync(rawRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

  const files: RawTranscriptFileEntry[] = [];
  for (const source of sources) {
    const sourceRoot = path.join(rawRoot, source);
    const datedFiles = walkThreeLevelDateTree(sourceRoot, '.jsonl');
    for (const entry of datedFiles) {
      if (!inDateRange(entry.date, options.fromDate, options.toDate)) {
        continue;
      }
      files.push({
        source,
        date: entry.date,
        path: entry.absolutePath
      });
    }
  }

  return files.sort((left, right) =>
    left.date === right.date
      ? left.path.localeCompare(right.path)
      : left.date.localeCompare(right.date)
  );
}

function getIsoWeekMonday(date: Date): Date {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized;
}

export function getIsoWeek(date: Date): { year: number; week: number } {
  const monday = getIsoWeekMonday(date);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekMonday = getIsoWeekMonday(firstThursday);
  const diffMs = monday.getTime() - firstWeekMonday.getTime();
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;

  return { year: isoYear, week };
}

export function formatIsoWeekKey(input: Date | { year: number; week: number }): string {
  const weekInfo = input instanceof Date ? getIsoWeek(input) : input;
  return `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`;
}

export function getIsoWeekRange(year: number, week: number): { start: Date; end: Date } {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const firstWeekMonday = getIsoWeekMonday(januaryFourth);
  const start = new Date(firstWeekMonday);
  start.setUTCDate(firstWeekMonday.getUTCDate() + ((week - 1) * 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

export function ensureParentDir(filePath: string): void {
  ensureDir(path.dirname(filePath));
}

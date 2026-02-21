import * as fs from 'fs';
import * as path from 'path';
import {
  formatIsoWeekKey,
  getIsoWeek,
  getIsoWeekRange,
  getReflectionsRoot,
  listObservationFiles,
  parseDateKey
} from '../lib/ledger.js';
import {
  normalizeObservationContent,
  parseObservationMarkdown,
  type ObservationType
} from '../lib/observation-format.js';
import { requestLlmCompletion, resolveLlmProvider } from '../lib/llm-provider.js';
import { archiveObservations, type ArchiveObservationsResult } from './archive.js';

export interface ReflectOptions {
  vaultPath: string;
  days?: number;
  dryRun?: boolean;
  now?: () => Date;
}

export interface ReflectResult {
  processedWeeks: number;
  writtenWeeks: number;
  dryRun: boolean;
  files: string[];
  archive: ArchiveObservationsResult | null;
}

interface PromotedItem {
  key: string;
  type: ObservationType;
  confidence: number;
  importance: number;
  content: string;
  dates: Set<string>;
}

interface ReflectionSections {
  stablePatterns: string[];
  keyDecisions: string[];
  openLoops: string[];
  changes: string[];
  citations: string[];
}

const OPEN_LOOP_RE = /\b(open loop|todo|follow[- ]?up|blocked|pending|unresolved|still need)\b/i;
const CHANGE_RE = /\b(changed?|shift(?:ed)?|switched|moved|instead|no longer|pivot(?:ed)?)\b/i;

function normalizeDays(days?: number): number {
  if (!Number.isFinite(days)) return 14;
  return Math.max(1, Math.floor(days as number));
}

function shouldIncludeDate(date: string, fromDate: string, toDate: string): boolean {
  if (date < fromDate) return false;
  if (date > toDate) return false;
  return true;
}

function listReflectionFiles(vaultPath: string): string[] {
  const reflectionsRoot = getReflectionsRoot(vaultPath);
  if (!fs.existsSync(reflectionsRoot)) {
    return [];
  }

  return fs.readdirSync(reflectionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{4}-W\d{2}\.md$/.test(entry.name))
    .map((entry) => path.join(reflectionsRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function extractPriorReflectionKeys(vaultPath: string, currentWeek: string): Set<string> {
  const keys = new Set<string>();
  for (const filePath of listReflectionFiles(vaultPath)) {
    const weekKey = path.basename(filePath, '.md');
    if (weekKey >= currentWeek) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^- (.+)$/);
      if (!match?.[1]) continue;
      const value = match[1].trim();
      if (value.startsWith('ledger/observations/')) continue;
      keys.add(normalizeObservationContent(value));
    }
  }
  return keys;
}

function mergeUnique(target: string[], incoming: Iterable<string>): string[] {
  const seen = new Set(target.map((item) => normalizeObservationContent(item)));
  const merged = [...target];
  for (const item of incoming) {
    const normalized = normalizeObservationContent(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(item);
  }
  return merged;
}

function parseExistingReflectionSections(content: string): ReflectionSections {
  const sections: ReflectionSections = {
    stablePatterns: [],
    keyDecisions: [],
    openLoops: [],
    changes: [],
    citations: []
  };

  let current: keyof ReflectionSections | null = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '## Stable Patterns') {
      current = 'stablePatterns';
      continue;
    }
    if (line === '## Key Decisions') {
      current = 'keyDecisions';
      continue;
    }
    if (line === '## Open Loops') {
      current = 'openLoops';
      continue;
    }
    if (line === '## Changes') {
      current = 'changes';
      continue;
    }
    if (line === '## Citations') {
      current = 'citations';
      continue;
    }

    if (!current) continue;
    const bullet = line.match(/^- (.+)$/);
    if (!bullet?.[1]) continue;
    sections[current].push(bullet[1].trim());
  }

  return sections;
}

function classifyItem(item: PromotedItem): keyof ReflectionSections {
  if (OPEN_LOOP_RE.test(item.content)) {
    return 'openLoops';
  }
  if (item.type === 'decision' || item.type === 'commitment' || item.type === 'milestone') {
    return 'keyDecisions';
  }
  if (CHANGE_RE.test(item.content)) {
    return 'changes';
  }
  return 'stablePatterns';
}

function toObservationCitationPath(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `ledger/observations/${date}.md`;
  }
  const [year, month, day] = date.split('-');
  return `ledger/observations/${year}/${month}/${day}.md`;
}

function buildSectionDraft(promoted: PromotedItem[]): ReflectionSections {
  const sections: ReflectionSections = {
    stablePatterns: [],
    keyDecisions: [],
    openLoops: [],
    changes: [],
    citations: []
  };

  for (const item of promoted) {
    sections[classifyItem(item)].push(
      `[${item.type}|c=${item.confidence.toFixed(2)}|i=${item.importance.toFixed(2)}] ${item.content}`
    );
    for (const date of item.dates) {
      sections.citations.push(toObservationCitationPath(date));
    }
  }

  sections.citations = [...new Set(sections.citations)].sort((left, right) => left.localeCompare(right));
  return sections;
}

function formatWeekTitle(weekKey: string): string {
  const [yearRaw, weekRaw] = weekKey.split('-W');
  const year = Number.parseInt(yearRaw, 10);
  const week = Number.parseInt(weekRaw, 10);
  const range = getIsoWeekRange(year, week);
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `# Week ${week}, ${year} (${monthFormatter.format(range.start)}-${monthFormatter.format(range.end)})`;
}

function renderReflectionMarkdown(weekKey: string, sections: ReflectionSections): string {
  const lines: string[] = [];
  lines.push(formatWeekTitle(weekKey));
  lines.push('');
  lines.push('## Stable Patterns');
  for (const item of sections.stablePatterns) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Key Decisions');
  for (const item of sections.keyDecisions) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Open Loops');
  for (const item of sections.openLoops) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Changes');
  for (const item of sections.changes) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Citations');
  for (const item of sections.citations) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n').trim();
}

function promoteWeekRecords(records: Array<{ date: string; type: ObservationType; confidence: number; importance: number; content: string }>): PromotedItem[] {
  const grouped = new Map<string, PromotedItem>();

  for (const record of records) {
    const key = normalizeObservationContent(record.content);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        key,
        type: record.type,
        confidence: record.confidence,
        importance: record.importance,
        content: record.content,
        dates: new Set([record.date])
      });
      continue;
    }

    existing.dates.add(record.date);
    if (record.importance > existing.importance) {
      existing.importance = record.importance;
      existing.type = record.type;
      existing.content = record.content;
    }
    if (record.confidence > existing.confidence) {
      existing.confidence = record.confidence;
    }
    grouped.set(key, existing);
  }

  const promoted: PromotedItem[] = [];
  for (const item of grouped.values()) {
    if (item.importance >= 0.8) {
      promoted.push(item);
      continue;
    }
    if (item.importance >= 0.4 && item.dates.size >= 2) {
      promoted.push(item);
    }
  }
  return promoted;
}

async function maybeGenerateLlmReflection(
  weekKey: string,
  sections: ReflectionSections
): Promise<string | null> {
  const provider = resolveLlmProvider();
  if (!provider) {
    return null;
  }

  const prompt = [
    'Rewrite the weekly reflection draft while preserving section structure and bullets.',
    'Return markdown only using these exact headers:',
    '# Week <N>, <YYYY> (...)',
    '## Stable Patterns',
    '## Key Decisions',
    '## Open Loops',
    '## Changes',
    '## Citations',
    '',
    `Week key: ${weekKey}`,
    '',
    renderReflectionMarkdown(weekKey, sections)
  ].join('\n');

  try {
    const output = await requestLlmCompletion({
      provider,
      prompt,
      temperature: 0.1,
      maxTokens: 1200
    });
    if (!output.trim()) {
      return null;
    }
    const cleaned = output
      .replace(/^```(?:markdown)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    if (
      cleaned.includes('## Stable Patterns')
      && cleaned.includes('## Key Decisions')
      && cleaned.includes('## Open Loops')
      && cleaned.includes('## Changes')
      && cleaned.includes('## Citations')
    ) {
      return cleaned;
    }
    return null;
  } catch {
    return null;
  }
}

export async function runReflection(options: ReflectOptions): Promise<ReflectResult> {
  const days = normalizeDays(options.days);
  const dryRun = options.dryRun ?? false;
  const now = options.now ?? (() => new Date());
  const nowDate = now();
  const toDate = nowDate.toISOString().slice(0, 10);
  const fromDateDate = new Date(nowDate);
  fromDateDate.setDate(nowDate.getDate() - (days - 1));
  const fromDate = fromDateDate.toISOString().slice(0, 10);

  const observationFiles = listObservationFiles(options.vaultPath, {
    includeLegacy: true,
    includeArchive: false,
    dedupeByDate: true
  }).filter((entry) => shouldIncludeDate(entry.date, fromDate, toDate));

  const recordsByWeek = new Map<string, Array<{
    date: string;
    type: ObservationType;
    confidence: number;
    importance: number;
    content: string;
  }>>();

  for (const entry of observationFiles) {
    const parsedDate = parseDateKey(entry.date);
    if (!parsedDate) continue;
    const week = getIsoWeek(parsedDate);
    const weekKey = formatIsoWeekKey(week);
    const markdown = fs.readFileSync(entry.path, 'utf-8');
    const parsedRecords = parseObservationMarkdown(markdown);
    const bucket = recordsByWeek.get(weekKey) ?? [];
    for (const record of parsedRecords) {
      bucket.push({
        date: record.date,
        type: record.type,
        confidence: record.confidence,
        importance: record.importance,
        content: record.content
      });
    }
    recordsByWeek.set(weekKey, bucket);
  }

  const processedWeeks = [...recordsByWeek.keys()].sort((left, right) => left.localeCompare(right));
  const writtenFiles: string[] = [];

  for (const weekKey of processedWeeks) {
    const promoted = promoteWeekRecords(recordsByWeek.get(weekKey) ?? []);
    const priorKeys = extractPriorReflectionKeys(options.vaultPath, weekKey);
    const unseenPromoted = promoted.filter((item) => !priorKeys.has(item.key));
    if (unseenPromoted.length === 0) {
      continue;
    }

    const reflectionPath = path.join(getReflectionsRoot(options.vaultPath), `${weekKey}.md`);
    const existing = fs.existsSync(reflectionPath) ? fs.readFileSync(reflectionPath, 'utf-8') : '';
    const existingSections = existing ? parseExistingReflectionSections(existing) : {
      stablePatterns: [],
      keyDecisions: [],
      openLoops: [],
      changes: [],
      citations: []
    };
    const draftSections = buildSectionDraft(unseenPromoted);
    const mergedSections: ReflectionSections = {
      stablePatterns: mergeUnique(existingSections.stablePatterns, draftSections.stablePatterns),
      keyDecisions: mergeUnique(existingSections.keyDecisions, draftSections.keyDecisions),
      openLoops: mergeUnique(existingSections.openLoops, draftSections.openLoops),
      changes: mergeUnique(existingSections.changes, draftSections.changes),
      citations: mergeUnique(existingSections.citations, draftSections.citations)
    };

    const llmMarkdown = await maybeGenerateLlmReflection(weekKey, mergedSections);
    const markdown = llmMarkdown ?? renderReflectionMarkdown(weekKey, mergedSections);
    if (dryRun) {
      writtenFiles.push(reflectionPath);
      continue;
    }
    fs.mkdirSync(path.dirname(reflectionPath), { recursive: true });
    fs.writeFileSync(reflectionPath, `${markdown.trim()}\n`, 'utf-8');
    writtenFiles.push(reflectionPath);
  }

  const archive = dryRun
    ? null
    : archiveObservations(options.vaultPath, {
      olderThanDays: 14,
      dryRun: false,
      now
    });

  return {
    processedWeeks: processedWeeks.length,
    writtenWeeks: writtenFiles.length,
    dryRun,
    files: writtenFiles,
    archive
  };
}

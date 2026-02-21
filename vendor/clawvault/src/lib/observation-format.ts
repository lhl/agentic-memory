export const OBSERVATION_TYPES = [
  'decision',
  'preference',
  'fact',
  'commitment',
  'task',
  'todo',
  'commitment-unresolved',
  'milestone',
  'lesson',
  'relationship',
  'project'
] as const;

export type ObservationType = typeof OBSERVATION_TYPES[number];
export type LegacyObservationPriority = '🔴' | '🟡' | '🟢';
export type ObservationLineKind = 'scored' | 'emoji';

export interface ParsedObservationRecord {
  date: string;
  type: ObservationType;
  confidence: number;
  importance: number;
  content: string;
  format: ObservationLineKind;
  priority?: LegacyObservationPriority;
  time?: string;
  rawLine: string;
}

export interface ImportanceThresholds {
  structural: number;
  potential: number;
}

export const IMPORTANCE_THRESHOLDS: ImportanceThresholds = {
  structural: 0.8,
  potential: 0.4
};

export const DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const SCORED_LINE_RE =
  /^(?:-\s*)?\[(decision|preference|fact|commitment|task|todo|commitment-unresolved|milestone|lesson|relationship|project)\|c=(0(?:\.\d+)?|1(?:\.0+)?)\|i=(0(?:\.\d+)?|1(?:\.0+)?)\]\s+(.+)$/i;
const EMOJI_LINE_RE = /^(?:-\s*)?(🔴|🟡|🟢)\s+(\d{2}:\d{2})?\s*(.+)$/u;

const DECISION_RE = /\b(decis(?:ion|ions)?|decid(?:e|ed|ing)|chose|selected|opted|went with|picked)\b/i;
const PREFERENCE_RE = /\b(prefer(?:ence|s|red)?|likes?|dislikes?|default to|always use|never use)\b/i;
const COMMITMENT_RE = /\b(commit(?:ment|ted)?|promised|deadline|due|scheduled|will deliver|agreed to)\b/i;
const TODO_RE = /(?:\btodo:\s*|\bwe need to\b|\bdon't forget(?: to)?\b|\bremember to\b|\bmake sure to\b)/i;
const COMMITMENT_TASK_RE = /\b(?:i'?ll|i will|let me|(?:i'?m\s+)?going to|plan to|should)\b/i;
const UNRESOLVED_RE = /\b(?:need to figure out|tbd|to be determined)\b/i;
const DEADLINE_RE = /\b(?:by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)|before\s+the\s+\w+|deadline is)\b/i;
const MILESTONE_RE = /\b(released?|shipped|launched|merged|published|milestone|v\d+\.\d+)\b/i;
const LESSON_RE = /\b(learn(?:ed|ing|t)|lesson|insight|realized|discovered|never again)\b/i;
const RELATIONSHIP_RE = /\b(talked to|met with|spoke with|asked|client|partner|teammate|colleague)\b/i;
const PROJECT_RE = /\b(project|feature|service|repo|api|roadmap|sprint)\b/i;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function scoreFromLegacyPriority(priority: LegacyObservationPriority): number {
  if (priority === '🔴') return 0.9;
  if (priority === '🟡') return 0.6;
  return 0.2;
}

export function confidenceFromLegacyPriority(priority: LegacyObservationPriority): number {
  if (priority === '🔴') return 0.9;
  if (priority === '🟡') return 0.8;
  return 0.7;
}

export function inferObservationType(content: string): ObservationType {
  if (DECISION_RE.test(content)) return 'decision';
  if (UNRESOLVED_RE.test(content)) return 'commitment-unresolved';
  if (TODO_RE.test(content)) return 'todo';
  if (COMMITMENT_TASK_RE.test(content) || DEADLINE_RE.test(content)) return 'task';
  if (COMMITMENT_RE.test(content)) return 'commitment';
  if (MILESTONE_RE.test(content)) return 'milestone';
  if (PREFERENCE_RE.test(content)) return 'preference';
  if (LESSON_RE.test(content)) return 'lesson';
  if (RELATIONSHIP_RE.test(content)) return 'relationship';
  if (PROJECT_RE.test(content)) return 'project';
  return 'fact';
}

export function toImportanceBucket(
  importance: number
): 'structural' | 'potential' | 'contextual' {
  if (importance >= IMPORTANCE_THRESHOLDS.structural) return 'structural';
  if (importance >= IMPORTANCE_THRESHOLDS.potential) return 'potential';
  return 'contextual';
}

export function formatScore(value: number): string {
  return clamp01(value).toFixed(2);
}

export function normalizeObservationContent(content: string): string {
  return content
    .replace(/^\d{2}:\d{2}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function parseObservationLine(
  line: string,
  date: string
): ParsedObservationRecord | null {
  const scored = line.match(SCORED_LINE_RE);
  if (scored) {
    return {
      date,
      type: scored[1].toLowerCase() as ObservationType,
      confidence: clamp01(Number.parseFloat(scored[2])),
      importance: clamp01(Number.parseFloat(scored[3])),
      content: scored[4].trim(),
      format: 'scored',
      rawLine: line
    };
  }

  const emoji = line.match(EMOJI_LINE_RE);
  if (!emoji) {
    return null;
  }

  const priority = emoji[1] as LegacyObservationPriority;
  const time = emoji[2]?.trim();
  const text = emoji[3].trim();
  const content = time ? `${time} ${text}` : text;
  return {
    date,
    type: inferObservationType(content),
    confidence: confidenceFromLegacyPriority(priority),
    importance: scoreFromLegacyPriority(priority),
    content,
    format: 'emoji',
    priority,
    time,
    rawLine: line
  };
}

export function parseObservationMarkdown(markdown: string): ParsedObservationRecord[] {
  const parsed: ParsedObservationRecord[] = [];
  let currentDate = '';

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(DATE_HEADING_RE);
    if (heading) {
      currentDate = heading[1];
      continue;
    }
    if (!currentDate) {
      continue;
    }

    const record = parseObservationLine(line.trim(), currentDate);
    if (record) {
      parsed.push(record);
    }
  }

  return parsed;
}

export function groupObservationRecordsByDate(
  records: ParsedObservationRecord[]
): Map<string, ParsedObservationRecord[]> {
  const grouped = new Map<string, ParsedObservationRecord[]>();
  for (const record of records) {
    const bucket = grouped.get(record.date) ?? [];
    bucket.push(record);
    grouped.set(record.date, bucket);
  }
  return grouped;
}

export function renderScoredObservationLine(record: {
  type: ObservationType;
  confidence: number;
  importance: number;
  content: string;
}): string {
  return `- [${record.type}|c=${formatScore(record.confidence)}|i=${formatScore(record.importance)}] ${record.content.trim()}`;
}

export function renderObservationMarkdown(
  sections: Map<string, Array<{
    type: ObservationType;
    confidence: number;
    importance: number;
    content: string;
  }>>
): string {
  const chunks: string[] = [];
  const dates = [...sections.keys()].sort((left, right) => left.localeCompare(right));

  for (const date of dates) {
    const lines = sections.get(date) ?? [];
    if (lines.length === 0) continue;
    chunks.push(`## ${date}`);
    chunks.push('');
    for (const line of lines) {
      chunks.push(renderScoredObservationLine(line));
    }
    chunks.push('');
  }

  return chunks.join('\n').trim();
}

export function isScoredObservationLine(line: string): boolean {
  return SCORED_LINE_RE.test(line.trim());
}

export function isLegacyEmojiObservationLine(line: string): boolean {
  return EMOJI_LINE_RE.test(line.trim());
}

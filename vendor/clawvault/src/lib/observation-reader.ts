import * as fs from 'fs';
import { listObservationFiles } from './ledger.js';
import {
  parseObservationMarkdown,
  renderObservationMarkdown,
  type ObservationType
} from './observation-format.js';

export type ObservationPriority = '🔴' | '🟡' | '🟢';

export interface ParsedObservationLine {
  type: ObservationType;
  confidence: number;
  importance: number;
  content: string;
  date: string;
  format: 'scored' | 'emoji';
  priority?: ObservationPriority;
}

export function readObservations(vaultPath: string, days: number = 7): string {
  const normalizedDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  if (normalizedDays === 0) {
    return '';
  }

  const files = listObservationFiles(vaultPath, {
    includeLegacy: true,
    includeArchive: false,
    dedupeByDate: true
  })
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, normalizedDays);

  if (files.length === 0) {
    return '';
  }

  return files
    .map((entry) => fs.readFileSync(entry.path, 'utf-8').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function parseObservationLines(markdown: string): ParsedObservationLine[] {
  return parseObservationMarkdown(markdown).map((record) => ({
    type: record.type,
    confidence: record.confidence,
    importance: record.importance,
    content: record.content,
    date: record.date,
    format: record.format,
    priority: record.priority
  }));
}

export function filterByPriority(observations: string, minPriority: ObservationPriority): string {
  const threshold = minPriority === '🔴'
    ? 0.8
    : minPriority === '🟡'
      ? 0.4
      : 0;

  const grouped = new Map<string, Array<{
    type: ObservationType;
    confidence: number;
    importance: number;
    content: string;
  }>>();

  for (const line of parseObservationLines(observations)) {
    if (line.importance < threshold) {
      continue;
    }
    const bucket = grouped.get(line.date) ?? [];
    bucket.push({
      type: line.type,
      confidence: line.confidence,
      importance: line.importance,
      content: line.content
    });
    grouped.set(line.date, bucket);
  }

  return renderObservationMarkdown(grouped);
}

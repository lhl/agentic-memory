export interface ReflectorOptions {
  now?: () => Date;
}

type Priority = '🔴' | '🟡' | '🟢';

interface ObservationLine {
  priority: Priority;
  content: string;
}

const DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const OBSERVATION_LINE_RE = /^(🔴|🟡|🟢)\s+(.+)$/u;

export class Reflector {
  private readonly now: () => Date;

  constructor(options: ReflectorOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  reflect(observations: string): string {
    const sections = this.parseSections(observations);
    if (sections.size === 0) {
      return observations.trim();
    }

    const cutoff = this.buildCutoffDate();
    const dedupeKeys: string[] = [];
    const reflected = new Map<string, ObservationLine[]>();
    const dates = [...sections.keys()].sort((a, b) => b.localeCompare(a));

    for (const date of dates) {
      const sectionDate = this.parseDate(date);
      const olderThanCutoff = sectionDate ? sectionDate.getTime() < cutoff.getTime() : false;
      const lines = sections.get(date) ?? [];
      const kept: ObservationLine[] = [];

      for (const line of lines) {
        if (line.priority === '🔴') {
          kept.push(line);
          continue;
        }

        if (line.priority === '🟢' && olderThanCutoff) {
          continue;
        }

        const key = this.normalizeText(line.content);
        const isDuplicate = dedupeKeys.some((existing) => this.isSimilar(existing, key));
        if (isDuplicate) {
          continue;
        }

        dedupeKeys.push(key);
        kept.push(line);
      }

      if (kept.length > 0) {
        reflected.set(date, kept);
      }
    }

    return this.renderSections(reflected);
  }

  private buildCutoffDate(): Date {
    const cutoff = new Date(this.now());
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 7);
    return cutoff;
  }

  private parseDate(date: string): Date | null {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  private parseSections(markdown: string): Map<string, ObservationLine[]> {
    const sections = new Map<string, ObservationLine[]>();
    let currentDate: string | null = null;

    for (const rawLine of markdown.split(/\r?\n/)) {
      const dateMatch = rawLine.match(DATE_HEADING_RE);
      if (dateMatch) {
        currentDate = dateMatch[1];
        if (!sections.has(currentDate)) {
          sections.set(currentDate, []);
        }
        continue;
      }

      if (!currentDate) continue;
      const lineMatch = rawLine.match(OBSERVATION_LINE_RE);
      if (!lineMatch) continue;

      const bucket = sections.get(currentDate) ?? [];
      bucket.push({
        priority: lineMatch[1] as Priority,
        content: lineMatch[2].trim()
      });
      sections.set(currentDate, bucket);
    }

    return sections;
  }

  private renderSections(sections: Map<string, ObservationLine[]>): string {
    const chunks: string[] = [];
    const dates = [...sections.keys()].sort((a, b) => a.localeCompare(b));

    for (const date of dates) {
      const lines = sections.get(date) ?? [];
      if (lines.length === 0) continue;
      chunks.push(`## ${date}`);
      chunks.push('');
      for (const line of lines) {
        chunks.push(`${line.priority} ${line.content}`);
      }
      chunks.push('');
    }

    return chunks.join('\n').trim();
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:.-]/g, '')
      .trim();
  }

  private isSimilar(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.length >= 24 && (a.includes(b) || b.includes(a))) {
      return true;
    }
    return false;
  }
}

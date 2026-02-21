import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeObservationContent,
  parseObservationLine,
  parseObservationMarkdown,
  renderScoredObservationLine,
  type ObservationType
} from '../lib/observation-format.js';
import {
  createBacklogItem,
  listBacklogItems,
  listTasks,
  updateBacklogItem,
  updateTask,
  type BacklogItem,
  type Task
} from '../lib/task-utils.js';
import { listProjects } from '../lib/project-utils.js';
import { listRouteRules, matchRouteRule, type RouteRule } from '../lib/config-manager.js';

/**
 * Routes observations into the appropriate vault category files.
 * Takes compressed observations and updates decisions/, people/, lessons/, etc.
 */

interface RoutedItem {
  category: string;
  title: string;
  content: string;
  type: ObservationType;
  confidence: number;
  importance: number;
  date: string;
}

interface RouterOptions {
  extractTasks?: boolean;
  now?: () => Date;
}

export interface RouteContext {
  source?: string;
  sessionKey?: string;
  transcriptId?: string;
  timestamp?: Date;
}

interface ExistingWorkItem {
  kind: 'task' | 'backlog';
  slug: string;
  title: string;
  status: string;
  source?: string;
  tags: string[];
}

interface RouteDestination {
  filePath: string;
  headerLabel: string;
}

interface KnownProjectDefinition {
  slug: string;
  normalizedSlug: string;
  title: string;
  normalizedTitle: string;
}

const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: 'decisions',
    patterns: [
      /\b(decid(?:e|ed|ing|ion)|chose|picked|went with|selected|opted)\b/i,
      /\b(decision|trade[- ]?off|alternative|rationale)\b/i,
    ],
  },
  {
    category: 'lessons',
    patterns: [
      /\b(learn(?:ed|ing|t)|lesson|mistake|insight|realized|discovered)\b/i,
      /\b(note to self|remember|important|don'?t forget|never again)\b/i,
    ],
  },
  {
    category: 'people',
    patterns: [
      /\b(said|asked|told|mentioned|emailed|called|messaged|met with)\b/i,
      /\b(client|partner|team|colleague|contact)\b/i,
      /\b(?:Pedro|Justin|Maria|Sarah|[A-Z][a-z]+ (?:said|asked|told|mentioned))\b/,
      /\b(?:talked to|met with|spoke with|chatted with|discussed with)\s+[A-Z][a-z]+\b/i,
      /\b[A-Z][a-z]+\s+(?:from|at)\s+[A-Z]/,
      /\b[A-Z][a-z]+\s+from\b/,
    ],
  },
  {
    category: 'preferences',
    patterns: [
      /\b(prefer(?:s|red|ence)?|like(?:s|d)?|want(?:s|ed)?|style|convention)\b/i,
      /\b(always use|never use|default to)\b/i,
    ],
  },
  {
    category: 'commitments',
    patterns: [
      /\b(promised|committed|deadline|due|scheduled|will do|agreed to)\b/i,
      /\b(todo|task|action item|follow[- ]?up)\b/i,
    ],
  },
  {
    category: 'projects',
    patterns: [
      /\b(deployed|shipped|launched|released|merged|built|created)\b/i,
      /\b(project|repo|service|api|feature|bug fix)\b/i,
    ],
  },
];

const TYPE_TO_CATEGORY: Record<ObservationType, string> = {
  decision: 'decisions',
  preference: 'preferences',
  fact: 'facts',
  commitment: 'commitments',
  task: 'commitments',
  todo: 'commitments',
  'commitment-unresolved': 'commitments',
  milestone: 'projects',
  lesson: 'lessons',
  relationship: 'people',
  project: 'projects'
};

const PAST_TENSE_TASK_HINT_RE = /\b(completed|shipped|deployed|fixed|merged|finished|resolved|closed)\b/i;
const FUTURE_TASK_HINT_RE = /\b(need to|should|todo|must|plan to)\b/i;

export class Router {
  private readonly vaultPath: string;
  private readonly extractTasks: boolean;
  private readonly now: () => Date;
  private customRoutes: RouteRule[];

  constructor(vaultPath: string, options: RouterOptions = {}) {
    this.vaultPath = path.resolve(vaultPath);
    this.extractTasks = options.extractTasks ?? true;
    this.now = options.now ?? (() => new Date());
    this.customRoutes = this.loadCustomRoutes();
  }

  /**
   * Takes observation markdown and routes items to appropriate vault categories.
   * Routes only items with importance >= 0.4.
   * Returns a summary of what was routed where.
   */
  route(
    observationMarkdown: string,
    context: RouteContext = {}
  ): { routed: RoutedItem[]; summary: string } {
    this.customRoutes = this.loadCustomRoutes();
    const items = this.parseObservations(observationMarkdown);
    const routed: RoutedItem[] = [];
    const knownWorkItems = this.extractTasks ? this.loadExistingWorkItems() : [];
    const knownProjectDefinitions = this.loadKnownProjectDefinitions();
    let dedupHits = 0;

    for (const item of items) {
      if (item.importance < 0.4) continue;

      if (this.extractTasks && this.isTaskObservation(item.type)) {
        const taskResult = this.routeTaskObservation(item, context, knownWorkItems);
        if (taskResult.routedItem) {
          routed.push(taskResult.routedItem);
        }
        if (taskResult.dedupHit) {
          dedupHits += 1;
        }
        continue;
      }

      const category = this.categorize(item.type, item.content);
      if (!category) continue;

      const routedItem: RoutedItem = {
        category,
        title: item.title,
        content: item.content,
        type: item.type,
        confidence: item.confidence,
        importance: item.importance,
        date: item.date
      };
      routed.push(routedItem);
      this.appendToCategory(category, routedItem, knownProjectDefinitions);
    }

    const summary = this.buildSummary(routed, dedupHits);
    return { routed, summary };
  }

  private isTaskObservation(
    type: ObservationType
  ): type is 'task' | 'todo' | 'commitment-unresolved' {
    return type === 'task' || type === 'todo' || type === 'commitment-unresolved';
  }

  private routeTaskObservation(
    item: {
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
      date: string;
      title: string;
    },
    context: RouteContext,
    knownWorkItems: ExistingWorkItem[]
  ): { routedItem: RoutedItem | null; dedupHit: boolean } {
    if (this.shouldSkipCompletedTaskCandidate(item.content)) {
      console.log('[observer] skipped likely-completed task candidate');
      return { routedItem: null, dedupHit: false };
    }

    const title = this.deriveTaskTitle(item.content, item.type);
    if (!title) {
      return { routedItem: null, dedupHit: false };
    }

    const duplicate = this.findDuplicateWorkItem(title, knownWorkItems);
    if (duplicate) {
      if (item.type === 'commitment-unresolved' && this.isOpenWorkItem(duplicate)) {
        this.touchExistingWorkItem(duplicate);
      }
      console.log(`[observer] dedup hit for task candidate: "${title}"`);
      return { routedItem: null, dedupHit: true };
    }

    const tags = this.mergeTags(
      ['open', 'observer'],
      item.type === 'task' ? ['task'] : [],
      item.type === 'todo' ? ['todo'] : [],
      item.type === 'commitment-unresolved' ? ['commitment'] : []
    );

    const content = this.buildTaskContextContent(item, context);
    let backlogItem: BacklogItem;
    try {
      backlogItem = createBacklogItem(this.vaultPath, title, {
        source: 'observer',
        content,
        tags
      });
    } catch (error) {
      if (error instanceof Error && /already exists/i.test(error.message)) {
        console.log(`[observer] dedup hit for task candidate: "${title}"`);
        return { routedItem: null, dedupHit: true };
      }
      throw error;
    }

    knownWorkItems.push({
      kind: 'backlog',
      slug: backlogItem.slug,
      title: backlogItem.title,
      status: 'open',
      source: backlogItem.frontmatter.source,
      tags: backlogItem.frontmatter.tags ?? []
    });

    return {
      dedupHit: false,
      routedItem: {
        category: 'backlog',
        title: backlogItem.title,
        content: item.content,
        type: item.type,
        confidence: item.confidence,
        importance: item.importance,
        date: item.date
      }
    };
  }

  private loadExistingWorkItems(): ExistingWorkItem[] {
    const taskItems: ExistingWorkItem[] = listTasks(this.vaultPath).map((task: Task) => ({
      kind: 'task',
      slug: task.slug,
      title: task.title,
      status: task.frontmatter.status,
      source: task.frontmatter.source,
      tags: task.frontmatter.tags ?? []
    }));
    const backlogItems: ExistingWorkItem[] = listBacklogItems(this.vaultPath).map((item: BacklogItem) => ({
      kind: 'backlog',
      slug: item.slug,
      title: item.title,
      status: item.frontmatter.tags?.includes('done') ? 'done' : 'open',
      source: item.frontmatter.source,
      tags: item.frontmatter.tags ?? []
    }));
    return [...taskItems, ...backlogItems];
  }

  private findDuplicateWorkItem(title: string, knownWorkItems: ExistingWorkItem[]): ExistingWorkItem | null {
    const normalizedTitle = this.normalizeTaskTitle(title);
    if (!normalizedTitle) {
      return null;
    }

    for (const item of knownWorkItems) {
      const normalizedExisting = this.normalizeTaskTitle(item.title);
      if (!normalizedExisting) {
        continue;
      }
      if (normalizedExisting === normalizedTitle) {
        return item;
      }
      if (this.jaccardWordSimilarity(normalizedTitle, normalizedExisting) > 0.8) {
        return item;
      }
    }

    return null;
  }

  private normalizeTaskTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
  }

  private jaccardWordSimilarity(a: string, b: string): number {
    const aWords = new Set(a.split(' ').filter(Boolean));
    const bWords = new Set(b.split(' ').filter(Boolean));
    if (aWords.size === 0 || bWords.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const word of aWords) {
      if (bWords.has(word)) {
        intersection += 1;
      }
    }
    const unionSize = aWords.size + bWords.size - intersection;
    return unionSize === 0 ? 0 : intersection / unionSize;
  }

  private deriveTaskTitle(content: string, type: ObservationType): string {
    let title = content
      .replace(/^\d{2}:\d{2}\s+/, '')
      .replace(/\[[^\]]+\]\s*/g, '')
      .trim();

    if (type === 'todo') {
      title = title.replace(
        /^(?:todo:\s*|we need to\s+|don't forget(?: to)?\s+|remember to\s+|make sure to\s+)/i,
        ''
      );
    } else if (type === 'task') {
      title = title.replace(
        /^(?:i'?ll\s+|i will\s+|let me\s+|(?:i'?m\s+)?going to\s+|plan to\s+|should\s+)/i,
        ''
      );
    } else if (type === 'commitment-unresolved') {
      title = title.replace(/^(?:need to figure out\s+|tbd[:\s-]*|to be determined[:\s-]*)/i, '');
    }

    title = title
      .replace(/\s+/g, ' ')
      .replace(/^[^a-zA-Z0-9]+/, '')
      .replace(/[.?!:;,]+$/, '')
      .trim();

    return title.slice(0, 120);
  }

  private shouldSkipCompletedTaskCandidate(content: string): boolean {
    if (!PAST_TENSE_TASK_HINT_RE.test(content)) {
      return false;
    }
    return !FUTURE_TASK_HINT_RE.test(content);
  }

  private buildTaskContextContent(
    item: {
      type: ObservationType;
      content: string;
      date: string;
    },
    context: RouteContext
  ): string {
    const lines: string[] = ['Auto-extracted by observer from session transcript.'];

    if (context.sessionKey) {
      lines.push(`Session: ${context.sessionKey}`);
    }
    if (context.transcriptId) {
      lines.push(`Transcript: ${context.transcriptId}`);
    }
    if (context.source) {
      lines.push(`Source: ${context.source}`);
    }

    const approximateTimestamp = this.extractApproximateTimestamp(item.date, item.content, context.timestamp);
    lines.push(`Approximate timestamp: ${approximateTimestamp}`);
    lines.push(`Observation type: ${item.type}`);
    lines.push(`Original observation: ${item.content}`);
    return lines.join('\n');
  }

  private extractApproximateTimestamp(
    date: string,
    content: string,
    timestamp?: Date
  ): string {
    if (timestamp) {
      return timestamp.toISOString();
    }
    const timeMatch = content.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
    if (timeMatch) {
      return `${date} ${timeMatch[0]}`;
    }
    return date;
  }

  private isOpenWorkItem(item: ExistingWorkItem): boolean {
    if (item.kind === 'task') {
      return item.status !== 'done';
    }
    return item.status !== 'done';
  }

  private touchExistingWorkItem(item: ExistingWorkItem): void {
    if (item.kind === 'task') {
      if (!this.isOpenWorkItem(item)) {
        return;
      }
      updateTask(this.vaultPath, item.slug, {});
      return;
    }

    const nextTags = this.mergeTags(item.tags, ['commitment']);
    updateBacklogItem(this.vaultPath, item.slug, {
      source: item.source ?? 'observer',
      tags: nextTags,
      lastSeen: this.now().toISOString()
    });
    item.tags = nextTags;
  }

  private mergeTags(...groups: string[][]): string[] {
    const merged = new Set<string>();
    for (const group of groups) {
      for (const tag of group) {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          merged.add(normalized);
        }
      }
    }
    return [...merged];
  }

  private parseObservations(markdown: string): Array<{
    type: ObservationType;
    confidence: number;
    importance: number;
    content: string;
    date: string;
    title: string;
  }> {
    const records = parseObservationMarkdown(markdown);
    return records.map((record) => ({
      type: record.type,
      confidence: record.confidence,
      importance: record.importance,
      content: record.content,
      date: record.date,
      title: record.content.slice(0, 80).replace(/[^a-zA-Z0-9\s-]/g, '').trim()
    }));
  }

  private categorize(type: ObservationType, content: string): string | null {
    const typedCategory = TYPE_TO_CATEGORY[type];
    if (typedCategory) {
      return typedCategory;
    }

    for (const { category, patterns } of CATEGORY_PATTERNS) {
      if (patterns.some((p) => p.test(content))) {
        return category;
      }
    }
    return null;
  }

  private normalizeForDedup(content: string): string {
    return normalizeObservationContent(
      content.replace(/\[\[[^\]]*\]\]/g, (match) => match.replace(/\[\[|\]\]/g, ''))
    );
  }

  /**
   * Extract entity slug from observation content for people/projects routing.
   * Returns null if no entity can be identified.
   */
  private extractEntitySlug(content: string, category: string): string | null {
    if (category !== 'people' && category !== 'projects') return null;

    if (category === 'people') {
      // Match patterns like "talked to Pedro", "met with Maria", "Justin said"
      // Note: name patterns are case-SENSITIVE to only match capitalized proper nouns
      const patterns = [
        /(?:talked to|met with|spoke with|chatted with|discussed with|emailed|called|messaged)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|asked|told|mentioned|from|at)\b/,
        /\b(?:client|partner|colleague|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ];
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match?.[1]) return this.toSlug(match[1]);
      }
    }

    if (category === 'projects') {
      // Match project-like names (capitalized, or in quotes)
      const patterns = [
        /(?:deployed|shipped|launched|released|built|created|working on)\s+([A-Z][a-zA-Z0-9-]+)/,
        /"([^"]+)"\s+(?:project|repo|service)/i,
      ];
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match?.[1]) return this.toSlug(match[1]);
      }
    }

    return null;
  }

  private toSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  private normalizeProjectReference(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractWikiTargets(content: string): string[] {
    const targets: string[] = [];
    for (const match of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const candidate = match[1];
      if (!candidate) continue;
      const target = candidate.split('|')[0].split('#')[0].trim();
      if (target) targets.push(target);
    }
    return targets;
  }

  private loadKnownProjectDefinitions(): KnownProjectDefinition[] {
    try {
      return listProjects(this.vaultPath).map((project) => ({
        slug: project.slug,
        normalizedSlug: this.normalizeProjectReference(project.slug),
        title: project.title,
        normalizedTitle: project.title.toLowerCase()
      }));
    } catch {
      return [];
    }
  }

  private matchKnownProjectSlug(content: string, knownProjects: KnownProjectDefinition[]): string | null {
    if (knownProjects.length === 0) {
      return null;
    }

    const normalizedContent = content.toLowerCase();
    const wikiTargets = this.extractWikiTargets(content).map((target) => this.normalizeProjectReference(target));

    for (const project of knownProjects) {
      if (wikiTargets.includes(project.normalizedSlug)) {
        return project.slug;
      }
      if (project.normalizedTitle && normalizedContent.includes(project.normalizedTitle)) {
        return project.slug;
      }
      const slugPattern = new RegExp(`\\b${this.escapeRegExp(project.normalizedSlug)}\\b`, 'i');
      if (slugPattern.test(content)) {
        return project.slug;
      }
    }

    return null;
  }

  private loadCustomRoutes(): RouteRule[] {
    try {
      return listRouteRules(this.vaultPath);
    } catch {
      return [];
    }
  }

  private resolveCustomEntityPath(content: string, category: string): string | null {
    if ((category !== 'people' && category !== 'projects') || this.customRoutes.length === 0) {
      return null;
    }

    const matchedRule = matchRouteRule(content, this.customRoutes);
    if (!matchedRule) {
      return null;
    }

    const targetParts = matchedRule.target
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (targetParts.length < 2 || targetParts[0] !== category) {
      return null;
    }

    return targetParts.slice(1).join('/');
  }

  /**
   * Resolve the file path for a routed item.
   * For people/projects: entity-slug subfolder with date file (e.g., people/pedro/2026-02-12.md)
   * For other categories: category/date.md
   */
  private resolveFilePath(
    category: string,
    item: RoutedItem,
    knownProjectDefinitions: KnownProjectDefinition[]
  ): RouteDestination {
    const customEntityPath = this.resolveCustomEntityPath(item.content, category);
    if (customEntityPath) {
      const customEntityDir = path.join(this.vaultPath, category, customEntityPath);
      fs.mkdirSync(customEntityDir, { recursive: true });
      return {
        filePath: path.join(customEntityDir, `${item.date}.md`),
        headerLabel: `${category}/${customEntityPath}`
      };
    }

    if (category === 'projects') {
      const matchedProjectSlug = this.matchKnownProjectSlug(item.content, knownProjectDefinitions);
      if (matchedProjectSlug) {
        const projectDir = path.join(this.vaultPath, category, matchedProjectSlug);
        fs.mkdirSync(projectDir, { recursive: true });
        return {
          filePath: path.join(projectDir, `${item.date}.md`),
          headerLabel: `${category}/${matchedProjectSlug}`
        };
      }
    } else {
      const entitySlug = this.extractEntitySlug(item.content, category);
      if (entitySlug) {
        const entityDir = path.join(this.vaultPath, category, entitySlug);
        fs.mkdirSync(entityDir, { recursive: true });
        return {
          filePath: path.join(entityDir, `${item.date}.md`),
          headerLabel: `${category}/${entitySlug}`
        };
      }
    }

    const categoryDir = path.join(this.vaultPath, category);
    fs.mkdirSync(categoryDir, { recursive: true });
    return {
      filePath: path.join(categoryDir, `${item.date}.md`),
      headerLabel: category
    };
  }

  private appendToCategory(
    category: string,
    item: RoutedItem,
    knownProjectDefinitions: KnownProjectDefinition[]
  ): void {
    // Resolve file path (entity-aware for people/projects, custom routes first)
    const destination = this.resolveFilePath(category, item, knownProjectDefinitions);
    const filePath = destination.filePath;
    // Ensure parent dir exists (resolveFilePath handles entity dirs, but be safe)
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const existing = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8').trim()
      : '';

    // Normalized dedup: strip timestamps, wiki-links, whitespace, case
    const normalizedNew = this.normalizeForDedup(item.content);
    const existingLines = existing.split(/\r?\n/);
    for (const line of existingLines) {
      const lineContent = line.replace(/^-\s*/, '').trim();
      const parsed = parseObservationLine(lineContent, item.date);
      const candidate = parsed ? parsed.content : lineContent;
      if (this.normalizeForDedup(candidate) === normalizedNew) return;
    }

    // Also check similarity (>80% overlap = likely duplicate)
    for (const line of existingLines) {
      const lineContent = line.replace(/^-\s*/, '').trim();
      const parsed = parseObservationLine(lineContent, item.date);
      const normalizedExisting = this.normalizeForDedup(parsed ? parsed.content : lineContent);
      if (normalizedExisting.length > 10 && normalizedNew.length > 10) {
        const shorter = normalizedNew.length < normalizedExisting.length ? normalizedNew : normalizedExisting;
        const longer = normalizedNew.length >= normalizedExisting.length ? normalizedNew : normalizedExisting;
        if (longer.includes(shorter) || this.similarity(normalizedNew, normalizedExisting) > 0.8) return;
      }
    }

    const linkedContent = this.addWikiLinks(item.content);
    const entry = renderScoredObservationLine({
      type: item.type,
      confidence: item.confidence,
      importance: item.importance,
      content: linkedContent
    });
    const headerLabel = destination.headerLabel;
    const header = existing ? '' : `# ${headerLabel} — ${item.date}\n`;
    const newContent = existing
      ? `${existing}\n${entry}\n`
      : `${header}\n${entry}\n`;

    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  /**
   * Auto-link proper nouns and known entities with [[wiki-links]].
   * Scans for capitalized names, project names, and tool names.
   * Skips content already inside [[brackets]].
   */
  private addWikiLinks(content: string): string {
    // Don't double-link
    if (content.includes('[[')) return content;

    // Match capitalized proper nouns (2+ chars, not at start of sentence after emoji/time)
    // Pattern: standalone capitalized word that looks like a name/entity
    const namePattern = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g;

    // Words to skip (common English words that happen to appear capitalized)
    const skipWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'There', 'Then', 'Than',
      'When', 'Where', 'What', 'Which', 'While', 'With', 'Would', 'Will',
      'Should', 'Could', 'About', 'After', 'Before', 'Between', 'Because',
      'Also', 'Always', 'Already', 'Another', 'Any', 'Each', 'Every',
      'From', 'Have', 'Has', 'Had', 'Into', 'Just', 'Keep', 'Like',
      'Made', 'Make', 'Many', 'More', 'Most', 'Much', 'Must', 'Need',
      'Never', 'Next', 'None', 'Not', 'Now', 'Only', 'Other', 'Over',
      'Same', 'Some', 'Such', 'Sure', 'Take', 'Them', 'They', 'Too',
      'Under', 'Until', 'Upon', 'Very', 'Want', 'Were', 'Work', 'Yet',
      'Decision', 'Error', 'Deadline', 'Friday', 'Monday', 'Tuesday',
      'Wednesday', 'Thursday', 'Saturday', 'Sunday', 'January', 'February',
      'March', 'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'Today', 'Tomorrow', 'Yesterday',
      'Message', 'Feature', 'Session', 'Update', 'System', 'User',
      'Processed', 'Working', 'Built', 'Deployed', 'Discussed', 'Talked',
      'Mentioned', 'Requested', 'Asked', 'Said',
    ]);

    // Known tool/project names to always link (lowercase for matching)
    const knownEntities = new Set([
      'PostgreSQL', 'MongoDB', 'Railway', 'Vercel', 'React', 'Vue', 'Svelte',
      'Express', 'NestJS', 'Prisma', 'Docker', 'Kubernetes', 'Redis',
      'GraphQL', 'Stripe', 'ClawVault', 'OpenClaw', 'GitHub', 'Obsidian',
    ]);

    return content.replace(namePattern, (match) => {
      if (skipWords.has(match)) return match;
      if (knownEntities.has(match)) return `[[${match}]]`;
      // Link proper nouns (likely people/orgs)
      if (/^[A-Z][a-z]+$/.test(match) && match.length >= 3) {
        return `[[${match}]]`;
      }
      // Link multi-word proper nouns (e.g., "Justin Dukes")
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(match)) {
        return `[[${match}]]`;
      }
      return match;
    });
  }

  /**
   * Jaccard similarity on word bigrams — cheap approximation.
   */
  private similarity(a: string, b: string): number {
    const bigrams = (s: string): Set<string> => {
      const words = s.split(' ');
      const bg = new Set<string>();
      for (let i = 0; i < words.length - 1; i++) bg.add(`${words[i]} ${words[i + 1]}`);
      return bg;
    };
    const setA = bigrams(a);
    const setB = bigrams(b);
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const bg of setA) if (setB.has(bg)) intersection++;
    return intersection / (setA.size + setB.size - intersection);
  }

  private buildSummary(routed: RoutedItem[], dedupHits: number): string {
    if (routed.length === 0) {
      if (dedupHits > 0) {
        return `No items routed to vault categories (dedup hits: ${dedupHits}).`;
      }
      return 'No items routed to vault categories.';
    }

    const byCat = new Map<string, number>();
    for (const item of routed) {
      byCat.set(item.category, (byCat.get(item.category) ?? 0) + 1);
    }

    const parts = [...byCat.entries()].map(([cat, count]) => `${cat}: ${count}`);
    const suffix = dedupHits > 0 ? ` (dedup hits: ${dedupHits})` : '';
    return `Routed ${routed.length} observations → ${parts.join(', ')}${suffix}`;
  }
}

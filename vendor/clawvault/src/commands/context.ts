import * as path from 'path';
import type { Command } from 'commander';
import { ClawVault } from '../lib/vault.js';
import { parseObservationLines, readObservations } from '../lib/observation-reader.js';
import { estimateTokens, fitWithinBudget } from '../lib/token-counter.js';
import { getMemoryGraph, type MemoryGraph, type MemoryGraphEdge } from '../lib/memory-graph.js';
import {
  resolveContextProfile,
  normalizeContextProfileInput,
  type ContextProfileInput,
  type ResolvedContextProfile
} from '../lib/context-profile.js';
import type { Document, SearchResult } from '../types.js';

const DEFAULT_LIMIT = 5;
const MAX_SNIPPET_LENGTH = 320;
const OBSERVATION_LOOKBACK_DAYS = 7;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is',
  'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when',
  'where', 'who', 'why', 'with', 'you', 'your'
]);

export type ContextFormat = 'markdown' | 'json';
export type ContextProfile = ResolvedContextProfile;
export type ContextProfileOption = ContextProfile | 'auto';

export interface ContextOptions {
  vaultPath: string;
  limit?: number;
  format?: ContextFormat;
  recent?: boolean;
  includeObservations?: boolean;
  budget?: number;
  profile?: ContextProfileOption;
  maxHops?: number;
}

export interface ContextEntry {
  title: string;
  path: string;
  category: string;
  score: number;
  snippet: string;
  modified: string;
  age: string;
  source: 'observation' | 'daily-note' | 'search' | 'graph';
  signals?: string[];
  rationale?: string;
}

export interface ContextResult {
  task: string;
  profile: ContextProfile;
  generated: string;
  context: ContextEntry[];
  markdown: string;
}

function formatRelativeAge(date: Date, now: number = Date.now()): string {
  const ageMs = Math.max(0, now - date.getTime());
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  if (days === 0) return 'today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function normalizeSnippet(result: SearchResult): string {
  const source = (result.snippet || result.document.content || '').trim();
  if (!source) return 'No snippet available.';
  return source
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SNIPPET_LENGTH);
}

export function formatContextMarkdown(task: string, entries: ContextEntry[]): string {
  let output = `## Relevant Context for: ${task}\n\n`;

  if (entries.length === 0) {
    output += '_No relevant context found._\n';
    return output;
  }

  for (const entry of entries) {
    output += `### ${entry.title} (${entry.source}, score: ${entry.score.toFixed(2)}, ${entry.age})\n`;
    output += `${entry.snippet}\n\n`;
  }

  return output.trimEnd();
}

interface PrioritizedContextItem {
  entry: ContextEntry;
  priority: number;
}

interface ContextProfileOrdering {
  order: Array<'structural' | 'daily' | 'search' | 'graph' | 'potential' | 'contextual'>;
  caps: Partial<Record<ContextEntry['source'], number>>;
}

const PROFILE_ORDERING: Record<ContextProfile, ContextProfileOrdering> = {
  default: {
    order: ['structural', 'daily', 'search', 'graph', 'potential', 'contextual'],
    caps: {}
  },
  planning: {
    order: ['search', 'graph', 'structural', 'potential', 'daily', 'contextual'],
    caps: { observation: 12, graph: 12 }
  },
  incident: {
    order: ['structural', 'search', 'potential', 'daily', 'graph', 'contextual'],
    caps: { observation: 20, graph: 8 }
  },
  handoff: {
    order: ['daily', 'structural', 'potential', 'search', 'graph', 'contextual'],
    caps: { 'daily-note': 2, observation: 15 }
  }
};

function extractKeywords(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const token of raw) {
    if (token.length < 2 || STOP_WORDS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    keywords.push(token);
  }

  return keywords;
}

function computeKeywordOverlapScore(queryKeywords: string[], text: string): number {
  if (queryKeywords.length === 0) {
    return 1;
  }

  const haystack = new Set(extractKeywords(text));
  let matches = 0;
  for (const keyword of queryKeywords) {
    if (haystack.has(keyword)) {
      matches += 1;
    }
  }

  if (matches === 0) {
    return 0.1;
  }

  return matches / queryKeywords.length;
}

function estimateSnippet(source: string): string {
  const normalized = source.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No snippet available.';
  }
  return normalized.slice(0, MAX_SNIPPET_LENGTH);
}

function parseIsoDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }

  if (value instanceof Date) {
    const time = value.getTime();
    if (!Number.isNaN(time)) {
      return value.toISOString().slice(0, 10);
    }
  }

  return null;
}

function asDate(value: string | null, fallback: Date = new Date(0)): Date {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function observationImportanceToRank(importance: number): number {
  if (importance >= 0.8) return 1;
  if (importance >= 0.4) return 4;
  return 5;
}

function toLedgerObservationPath(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `ledger/observations/${date}.md`;
  }
  const [year, month, day] = date.split('-');
  return `ledger/observations/${year}/${month}/${day}.md`;
}

function isLikelyDailyNote(document: Document): boolean {
  const normalizedPath = document.path.split(path.sep).join('/').toLowerCase();
  if (normalizedPath.includes('/daily/')) {
    return true;
  }

  const category = document.category.toLowerCase();
  if (category.includes('daily')) {
    return true;
  }

  const type = typeof document.frontmatter.type === 'string'
    ? document.frontmatter.type.toLowerCase()
    : '';
  return type === 'daily';
}

function findDailyDate(document: Document, targetDates: Set<string>): string | null {
  const frontmatterDate = parseIsoDate(document.frontmatter.date);
  const titleDate = parseIsoDate(document.title);
  const fileDate = parseIsoDate(path.basename(document.path, '.md'));
  const candidates = [frontmatterDate, titleDate, fileDate].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (!targetDates.has(candidate)) {
      continue;
    }
    if (isLikelyDailyNote(document) || titleDate === candidate || fileDate === candidate) {
      return candidate;
    }
  }

  return null;
}

function getTargetDailyDates(now: Date = new Date()): string[] {
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return [today, yesterday];
}

function buildDailyContextItems(vaultPath: string, allDocuments: Document[]): PrioritizedContextItem[] {
  const targetDates = getTargetDailyDates();
  const targetDateSet = new Set(targetDates);
  const byDate = new Map<string, Document>();

  for (const document of allDocuments) {
    const dailyDate = findDailyDate(document, targetDateSet);
    if (!dailyDate) {
      continue;
    }

    const existing = byDate.get(dailyDate);
    if (!existing || document.modified.getTime() > existing.modified.getTime()) {
      byDate.set(dailyDate, document);
    }
  }

  const items: PrioritizedContextItem[] = [];
  for (const date of targetDates) {
    const document = byDate.get(date);
    if (!document) {
      continue;
    }

    const relativePath = path.relative(vaultPath, document.path).split(path.sep).join('/');
    const snippet = estimateSnippet(document.content);
    items.push({
      priority: 2,
      entry: {
        title: `Daily note ${date}`,
        path: relativePath,
        category: document.category,
        score: 0.9,
        snippet,
        modified: document.modified.toISOString(),
        age: formatRelativeAge(document.modified),
        source: 'daily-note',
        signals: ['daily_recency'],
        rationale: 'Pinned daily note context (today/yesterday).'
      }
    });
  }

  return items;
}

function buildObservationContextItems(vaultPath: string, queryKeywords: string[]): PrioritizedContextItem[] {
  const observationMarkdown = readObservations(vaultPath, OBSERVATION_LOOKBACK_DAYS);
  const parsed = parseObservationLines(observationMarkdown);
  const items: PrioritizedContextItem[] = [];

  for (const [index, observation] of parsed.entries()) {
    const priority = observationImportanceToRank(observation.importance);
    const modifiedDate = asDate(observation.date, new Date());
    const date = observation.date || modifiedDate.toISOString().slice(0, 10);
    const snippet = estimateSnippet(observation.content);

    items.push({
      priority,
      entry: {
        title: `[${observation.type}|i=${observation.importance.toFixed(2)}] observation (${date}) #${index + 1}`,
        path: toLedgerObservationPath(date),
        category: 'observations',
        score: computeKeywordOverlapScore(queryKeywords, observation.content),
        snippet,
        modified: modifiedDate.toISOString(),
        age: formatRelativeAge(modifiedDate),
        source: 'observation',
        signals: ['observation_importance', `type:${observation.type}`, 'keyword_overlap'],
        rationale: `Observation type ${observation.type} with importance ${observation.importance.toFixed(2)} matched task keywords.`
      }
    });
  }

  return items;
}

function buildSearchContextItems(vault: ClawVault, results: SearchResult[]): PrioritizedContextItem[] {
  return results.map((result): PrioritizedContextItem => {
    const relativePath = path.relative(vault.getPath(), result.document.path).split(path.sep).join('/');
    const entry: ContextEntry = {
      title: result.document.title,
      path: relativePath,
      category: result.document.category,
      score: result.score,
      snippet: normalizeSnippet(result),
      modified: result.document.modified.toISOString(),
      age: formatRelativeAge(result.document.modified),
      source: 'search',
      signals: ['semantic_search'],
      rationale: 'Selected by semantic retrieval.'
    };

    return {
      priority: 3,
      entry
    };
  });
}

function toNoteNodeId(vaultPath: string, absolutePath: string): string {
  const relativePath = path.relative(vaultPath, absolutePath).split(path.sep).join('/');
  const noteKey = relativePath.toLowerCase().endsWith('.md') ? relativePath.slice(0, -3) : relativePath;
  return `note:${noteKey}`;
}

function buildGraphAdjacency(edges: MemoryGraphEdge[]): Map<string, MemoryGraphEdge[]> {
  const adjacency = new Map<string, MemoryGraphEdge[]>();
  for (const edge of edges) {
    const sourceBucket = adjacency.get(edge.source) ?? [];
    sourceBucket.push(edge);
    adjacency.set(edge.source, sourceBucket);

    const targetBucket = adjacency.get(edge.target) ?? [];
    targetBucket.push(edge);
    adjacency.set(edge.target, targetBucket);
  }
  return adjacency;
}

function edgeWeight(edge: MemoryGraphEdge): number {
  if (edge.type === 'frontmatter_relation') return 0.95;
  if (edge.type === 'wiki_link') return 0.8;
  return 0.6;
}

function buildGraphContextItems(params: {
  graph: MemoryGraph;
  vaultPath: string;
  documents: Document[];
  searchItems: PrioritizedContextItem[];
  limit: number;
  maxHops: number;
}): PrioritizedContextItem[] {
  const { graph, vaultPath, documents, searchItems, limit, maxHops } = params;
  if (
    searchItems.length === 0
    || graph.nodes.length === 0
    || graph.edges.length === 0
    || maxHops <= 0
  ) {
    return [];
  }

  const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = buildGraphAdjacency(graph.edges);
  const docByNodeId = new Map<string, Document>();
  for (const document of documents) {
    docByNodeId.set(toNoteNodeId(vaultPath, document.path), document);
  }

  const anchors = searchItems
    .map((item) => ({
      item,
      nodeId: toNoteNodeId(vaultPath, path.join(vaultPath, item.entry.path))
    }))
    .filter((anchor) => graphNodeById.has(anchor.nodeId));

  const candidates = new Map<string, PrioritizedContextItem>();

  for (const anchor of anchors) {
    const visited = new Set<string>([anchor.nodeId]);
    const queue: Array<{ nodeId: string; hop: number }> = [{ nodeId: anchor.nodeId, hop: 0 }];

    while (queue.length > 0) {
      const current = queue.shift() as { nodeId: string; hop: number };
      if (current.hop >= maxHops) {
        continue;
      }

      const connectedEdges = adjacency.get(current.nodeId) ?? [];
      for (const edge of connectedEdges) {
        const neighborId = edge.source === current.nodeId ? edge.target : edge.source;
        if (visited.has(neighborId)) {
          continue;
        }
        visited.add(neighborId);
        queue.push({ nodeId: neighborId, hop: current.hop + 1 });

        if (neighborId === anchor.nodeId) continue;

        const neighborNode = graphNodeById.get(neighborId);
        if (
          !neighborNode
          || neighborNode.type === 'tag'
          || neighborNode.type === 'unresolved'
          || neighborNode.missing === true
        ) {
          continue;
        }

        const neighborDoc = docByNodeId.get(neighborId);
        if (!neighborDoc) {
          continue;
        }

        const neighborPath = path.relative(vaultPath, neighborDoc.path).split(path.sep).join('/');
        const modifiedAt = neighborDoc.modified;
        const snippet = estimateSnippet(neighborDoc.content);
        const hopPenalty = Math.pow(0.85, Math.max(0, current.hop));
        const score = Math.max(0.05, Math.min(1, anchor.item.entry.score * edgeWeight(edge) * hopPenalty));
        const key = neighborId;
        const existing = candidates.get(key);

        const candidate: PrioritizedContextItem = {
          priority: 3,
          entry: {
            title: neighborDoc.title,
            path: neighborPath,
            category: neighborDoc.category,
            score,
            snippet,
            modified: modifiedAt.toISOString(),
            age: formatRelativeAge(modifiedAt),
            source: 'graph',
            signals: ['graph_neighbor', `edge:${edge.type}`, `hop:${current.hop + 1}`],
            rationale: `Connected to "${anchor.item.entry.title}" within ${current.hop + 1} hop(s) via ${edge.type}${edge.label ? ` (${edge.label})` : ''}.`
          }
        };

        if (!existing || existing.entry.score < candidate.entry.score) {
          candidates.set(key, candidate);
        }
      }
    }
  }

  return [...candidates.values()]
    .sort((left, right) => right.entry.score - left.entry.score)
    .slice(0, Math.max(limit, 1));
}

function dedupeContextItems(items: PrioritizedContextItem[]): PrioritizedContextItem[] {
  const deduped = new Map<string, PrioritizedContextItem>();
  for (const item of items) {
    const key = `${item.entry.path}|${item.entry.source}|${item.entry.title}`;
    const existing = deduped.get(key);
    if (!existing || existing.entry.score < item.entry.score) {
      deduped.set(key, item);
    }
  }
  return [...deduped.values()];
}

function applySourceCaps(items: PrioritizedContextItem[], caps: Partial<Record<ContextEntry['source'], number>>): PrioritizedContextItem[] {
  const counts: Partial<Record<ContextEntry['source'], number>> = {};
  const capped: PrioritizedContextItem[] = [];

  for (const item of items) {
    const source = item.entry.source;
    const limit = caps[source];
    if (limit !== undefined) {
      const current = counts[source] ?? 0;
      if (current >= limit) {
        continue;
      }
      counts[source] = current + 1;
    }
    capped.push(item);
  }

  return capped;
}

function renderEntryBlock(entry: ContextEntry): string {
  return `### ${entry.title} (${entry.source}, score: ${entry.score.toFixed(2)}, ${entry.age})\n${entry.snippet}\n\n`;
}

function truncateToBudget(text: string, budget: number): string {
  if (!Number.isFinite(budget) || budget <= 0) {
    return '';
  }

  const maxChars = Math.max(0, Math.floor(budget) * 4);
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars).trimEnd();
}

function applyTokenBudget(items: PrioritizedContextItem[], task: string, budget?: number): { context: ContextEntry[]; markdown: string } {
  const fullContext = items.map((item) => item.entry);
  const fullMarkdown = formatContextMarkdown(task, fullContext);

  if (budget === undefined) {
    return { context: fullContext, markdown: fullMarkdown };
  }

  const normalizedBudget = Math.max(1, Math.floor(budget));
  if (estimateTokens(fullMarkdown) <= normalizedBudget) {
    return { context: fullContext, markdown: fullMarkdown };
  }

  const header = `## Relevant Context for: ${task}\n\n`;
  const headerCost = estimateTokens(header);
  if (headerCost >= normalizedBudget) {
    return {
      context: [],
      markdown: truncateToBudget(header.trimEnd(), normalizedBudget)
    };
  }

  const fitted = fitWithinBudget(
    items.map((item, index) => ({
      text: renderEntryBlock(item.entry),
      priority: item.priority,
      source: String(index)
    })),
    normalizedBudget - headerCost
  );

  const selectedEntries = fitted
    .map((item) => {
      const index = Number.parseInt(item.source, 10);
      return Number.isNaN(index) ? null : items[index]?.entry ?? null;
    })
    .filter((entry): entry is ContextEntry => Boolean(entry));

  // Preserve at least one top-ranked signal when the budget is too tight
  // to fit any fully rendered entry block.
  if (selectedEntries.length === 0 && items.length > 0) {
    const topEntry = items[0].entry;
    return {
      context: [topEntry],
      markdown: truncateToBudget(formatContextMarkdown(task, [topEntry]), normalizedBudget)
    };
  }

  const markdown = truncateToBudget(formatContextMarkdown(task, selectedEntries), normalizedBudget);
  return {
    context: selectedEntries,
    markdown
  };
}

export async function buildContext(task: string, options: ContextOptions): Promise<ContextResult> {
  const normalizedTask = task.trim();
  if (!normalizedTask) {
    throw new Error('Task description is required.');
  }

  const vault = new ClawVault(path.resolve(options.vaultPath));
  await vault.load();

  const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
  const recent = options.recent ?? true;
  const includeObservations = options.includeObservations ?? true;
  const maxHops = Math.max(1, Math.floor(options.maxHops ?? 2));
  const profile = resolveContextProfile(options.profile, normalizedTask);
  const queryKeywords = extractKeywords(normalizedTask);
  const allDocuments = await vault.list();

  const searchResults = await vault.vsearch(normalizedTask, {
    limit,
    temporalBoost: recent
  });

  const searchItems = buildSearchContextItems(vault, searchResults);
  const dailyItems = buildDailyContextItems(vault.getPath(), allDocuments);
  const observationItems = includeObservations
    ? buildObservationContextItems(vault.getPath(), queryKeywords)
    : [];
  const graph = await getMemoryGraph(vault.getPath());
  const graphItems = buildGraphContextItems({
    graph,
    vaultPath: vault.getPath(),
    documents: allDocuments,
    searchItems,
    limit,
    maxHops
  });

  const byScoreDesc = (left: PrioritizedContextItem, right: PrioritizedContextItem): number =>
    right.entry.score - left.entry.score;

  const structuralObservations = observationItems.filter((item) => item.priority === 1).sort(byScoreDesc);
  const potentialObservations = observationItems.filter((item) => item.priority === 4).sort(byScoreDesc);
  const contextualObservations = observationItems.filter((item) => item.priority === 5).sort(byScoreDesc);
  const sortedDailyItems = [...dailyItems].sort(byScoreDesc);
  const sortedSearchItems = [...searchItems].sort(byScoreDesc);
  const sortedGraphItems = [...graphItems].sort(byScoreDesc);
  const grouped: Record<'structural' | 'daily' | 'search' | 'graph' | 'potential' | 'contextual', PrioritizedContextItem[]> = {
    structural: structuralObservations,
    daily: sortedDailyItems,
    search: sortedSearchItems,
    graph: sortedGraphItems,
    potential: potentialObservations,
    contextual: contextualObservations
  };
  const ordering = PROFILE_ORDERING[profile];
  const ordered = dedupeContextItems(
    applySourceCaps(
      ordering.order.flatMap((group) => grouped[group]),
      ordering.caps
    )
  );

  const { context, markdown } = applyTokenBudget(ordered, normalizedTask, options.budget);

  return {
    task: normalizedTask,
    profile,
    generated: new Date().toISOString(),
    context,
    markdown
  };
}

export async function contextCommand(task: string, options: ContextOptions): Promise<void> {
  const result = await buildContext(task, options);
  const format = options.format ?? 'markdown';

  if (format === 'json') {
    const context = result.context.map((entry) => ({
      ...entry,
      explain: {
        signals: entry.signals ?? [],
        rationale: entry.rationale ?? ''
      }
    }));
    console.log(JSON.stringify({
      task: result.task,
      profile: result.profile,
      generated: result.generated,
      count: context.length,
      context
    }, null, 2));
    return;
  }

  console.log(result.markdown);
}

function parsePositiveInteger(raw: string, label: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${raw}`);
  }
  return parsed;
}

export function registerContextCommand(program: Command): void {
  program
    .command('context <task>')
    .description('Generate task-relevant context for prompt injection')
    .option('-n, --limit <n>', 'Max results', '5')
    .option('--format <format>', 'Output format (markdown|json)', 'markdown')
    .option('--recent', 'Boost recent documents (enabled by default)', true)
    .option('--include-observations', 'Include observation memories in output', true)
    .option('--budget <number>', 'Optional token budget for assembled context')
    .option('--profile <profile>', 'Context profile (default|planning|incident|handoff|auto)', 'default')
    .option('--max-hops <n>', 'Maximum graph expansion hops', '2')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (
      task: string,
      rawOptions: {
        limit: string;
        format: string;
        recent?: boolean;
        includeObservations?: boolean;
        budget?: string;
        profile?: string;
        maxHops: string;
        vault?: string;
      }
    ) => {
      const format = rawOptions.format === 'json' ? 'json' : 'markdown';
      const budget = rawOptions.budget
        ? parsePositiveInteger(rawOptions.budget, 'budget')
        : undefined;
      const limit = parsePositiveInteger(rawOptions.limit, 'limit');
      const maxHops = parsePositiveInteger(rawOptions.maxHops, 'max-hops');
      const vaultPath = rawOptions.vault
        ?? process.env.CLAWVAULT_PATH
        ?? process.cwd();

      await contextCommand(task, {
        vaultPath,
        limit,
        format,
        recent: rawOptions.recent ?? true,
        includeObservations: rawOptions.includeObservations ?? true,
        budget,
        profile: normalizeContextProfileInput(rawOptions.profile),
        maxHops
      });
    });
}

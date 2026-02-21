import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import {
  getMemoryGraph,
  loadMemoryGraphIndex,
  type MemoryGraph,
  type MemoryGraphNode
} from './memory-graph.js';
import { requestLlmCompletion, resolveLlmProvider, type LlmProvider } from './llm-provider.js';

const INJECTABLE_CATEGORIES = ['rules', 'decisions', 'preferences'] as const;
const DEFAULT_CATEGORY_PRIORITY: Record<InjectSourceCategory, number> = {
  rules: 100,
  decisions: 80,
  preferences: 60
};
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with', 'you',
  'your', 'we', 'our', 'their', 'they', 'them', 'i'
]);

export type InjectSourceCategory = (typeof INJECTABLE_CATEGORIES)[number];
export type InjectMatchSource = 'trigger' | 'keyword' | 'entity' | 'graph_1hop' | 'llm_intent';

export interface InjectableItem {
  id: string;
  category: InjectSourceCategory;
  relativePath: string;
  title: string;
  content: string;
  triggers: string[];
  scope: string[];
  priority: number;
  searchKeywords: string[];
  noteNodeId: string;
}

export interface InjectMatchReason {
  source: InjectMatchSource;
  value: string;
  weight: number;
}

export interface InjectMatch {
  item: InjectableItem;
  score: number;
  deterministicScore: number;
  llmScore: number | null;
  reasons: InjectMatchReason[];
}

export interface InjectResult {
  message: string;
  generatedAt: string;
  deterministicMs: number;
  llmProvider: LlmProvider | null;
  usedLlm: boolean;
  matches: InjectMatch[];
}

export interface InjectRuntimeOptions {
  maxResults?: number;
  useLlm?: boolean;
  scope?: string | string[];
  model?: string;
  fetchImpl?: typeof fetch;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeScopeValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function toRelativePath(vaultPath: string, absolutePath: string): string {
  return path.relative(vaultPath, absolutePath).split(path.sep).join('/');
}

function toNoteNodeId(relativePath: string): string {
  const normalized = relativePath.toLowerCase().endsWith('.md')
    ? relativePath.slice(0, -3)
    : relativePath;
  return `note:${normalized}`;
}

function extractHeadingTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || null;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function parsePriority(frontmatter: Record<string, unknown>, category: InjectSourceCategory): number {
  const explicit = frontmatter.priority;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.max(1, Math.round(explicit));
  }
  if (typeof explicit === 'string') {
    const parsed = Number.parseFloat(explicit);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.round(parsed));
    }
  }

  const importance = frontmatter.importance;
  if (typeof importance === 'number' && Number.isFinite(importance) && importance >= 0 && importance <= 1) {
    return Math.max(1, Math.round(importance * 100));
  }

  return DEFAULT_CATEGORY_PRIORITY[category];
}

function deriveTitle(
  frontmatter: Record<string, unknown>,
  markdownContent: string,
  fallbackPath: string
): string {
  if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
    return frontmatter.title.trim();
  }
  const heading = extractHeadingTitle(markdownContent);
  if (heading) {
    return heading;
  }
  return path.basename(fallbackPath, '.md').replace(/[-_]+/g, ' ').trim();
}

function deriveTriggers(params: {
  category: InjectSourceCategory;
  frontmatter: Record<string, unknown>;
  title: string;
  relativePath: string;
}): string[] {
  const { category, frontmatter, title, relativePath } = params;
  const explicitTriggers = toStringArray(frontmatter.triggers);
  const tags = toStringArray(frontmatter.tags);
  const aliases = toStringArray(frontmatter.aliases);
  const baseName = path.basename(relativePath, '.md').replace(/[-_]+/g, ' ').trim();
  const normalizedTitle = title.trim();
  const triggerSet = new Set<string>();

  for (const value of [...explicitTriggers, ...tags, ...aliases]) {
    if (value.trim()) {
      triggerSet.add(value.trim());
    }
  }

  if (triggerSet.size === 0 || category !== 'rules') {
    if (normalizedTitle) {
      triggerSet.add(normalizedTitle);
    }
    if (baseName) {
      triggerSet.add(baseName);
    }
  }

  for (const keyword of tokenizeKeywords(normalizedTitle)) {
    if (keyword.length >= 4) {
      triggerSet.add(keyword);
    }
  }

  return [...triggerSet];
}

function deriveScope(frontmatter: Record<string, unknown>): string[] {
  const raw = [
    ...toStringArray(frontmatter.scope),
    ...toStringArray(frontmatter.scopes)
  ];
  return [...new Set(raw.map(normalizeScopeValue).filter(Boolean))];
}

function tokenizeKeywords(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  const tokens = normalized.split(' ').filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.length < 3 || STOP_WORDS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    unique.push(token);
  }
  return unique;
}

function collectMarkdownFiles(
  rootPath: string,
  currentPath: string,
  collected: string[]
): void {
  if (!fs.existsSync(currentPath)) {
    return;
  }
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(rootPath, absolutePath, collected);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      collected.push(toRelativePath(rootPath, absolutePath));
    }
  }
}

function parseInjectableFile(
  vaultPath: string,
  category: InjectSourceCategory,
  relativePath: string
): InjectableItem | null {
  const absolutePath = path.join(vaultPath, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = matter(raw);
    const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
    const title = deriveTitle(frontmatter, parsed.content, relativePath);
    const triggers = deriveTriggers({ category, frontmatter, title, relativePath });
    const scope = deriveScope(frontmatter);
    const priority = parsePriority(frontmatter, category);
    const searchKeywordSet = new Set<string>();
    for (const trigger of triggers) {
      for (const keyword of tokenizeKeywords(trigger)) {
        searchKeywordSet.add(keyword);
      }
    }
    for (const keyword of tokenizeKeywords(title)) {
      searchKeywordSet.add(keyword);
    }

    return {
      id: relativePath,
      category,
      relativePath,
      title,
      content: parsed.content.trim(),
      triggers,
      scope,
      priority,
      searchKeywords: [...searchKeywordSet],
      noteNodeId: toNoteNodeId(relativePath)
    };
  } catch {
    return null;
  }
}

export function indexInjectableItems(vaultPathInput: string): InjectableItem[] {
  const vaultPath = path.resolve(vaultPathInput);
  const items: InjectableItem[] = [];

  for (const category of INJECTABLE_CATEGORIES) {
    const categoryRoot = path.join(vaultPath, category);
    const markdownFiles: string[] = [];
    collectMarkdownFiles(vaultPath, categoryRoot, markdownFiles);
    for (const relativePath of markdownFiles.sort((left, right) => left.localeCompare(right))) {
      const parsed = parseInjectableFile(vaultPath, category, relativePath);
      if (parsed) {
        items.push(parsed);
      }
    }
  }

  return items;
}

function containsPhrase(normalizedHaystack: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) {
    return false;
  }
  const haystack = ` ${normalizedHaystack} `;
  const needle = ` ${normalizedPhrase} `;
  return haystack.includes(needle);
}

function collectNodeAliases(node: MemoryGraphNode): string[] {
  const aliases = new Set<string>();
  if (node.title) {
    aliases.add(node.title);
  }
  if (node.path) {
    const basename = path.basename(node.path, '.md');
    aliases.add(basename.replace(/[-_]+/g, ' '));
    aliases.add(basename);
  }
  return [...aliases]
    .map((alias) => normalizeText(alias))
    .filter((alias) => alias.length >= 3);
}

function isEligibleGraphNode(node: MemoryGraphNode | undefined): node is MemoryGraphNode {
  if (!node) return false;
  if (node.missing) return false;
  if (node.type === 'tag' || node.type === 'unresolved') return false;
  return Boolean(node.path);
}

function buildDeterministicEntityMatches(message: string, graph: MemoryGraph): {
  directAliasesByNode: Map<string, Set<string>>;
  oneHopSourcesByNode: Map<string, Set<string>>;
} {
  const normalizedMessage = normalizeText(message);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const directAliasesByNode = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    if (!isEligibleGraphNode(node)) {
      continue;
    }
    const aliases = collectNodeAliases(node);
    for (const alias of aliases) {
      if (containsPhrase(normalizedMessage, alias)) {
        const bucket = directAliasesByNode.get(node.id) ?? new Set<string>();
        bucket.add(alias);
        directAliasesByNode.set(node.id, bucket);
      }
    }
  }

  const oneHopSourcesByNode = new Map<string, Set<string>>();
  if (directAliasesByNode.size === 0) {
    return { directAliasesByNode, oneHopSourcesByNode };
  }

  for (const edge of graph.edges) {
    const leftDirect = directAliasesByNode.has(edge.source);
    const rightDirect = directAliasesByNode.has(edge.target);
    if (!leftDirect && !rightDirect) {
      continue;
    }
    if (leftDirect && !rightDirect) {
      const target = nodeById.get(edge.target);
      const source = nodeById.get(edge.source);
      if (!isEligibleGraphNode(target) || !isEligibleGraphNode(source)) {
        continue;
      }
      const bucket = oneHopSourcesByNode.get(target.id) ?? new Set<string>();
      bucket.add(source.title || source.id);
      oneHopSourcesByNode.set(target.id, bucket);
      continue;
    }
    if (rightDirect && !leftDirect) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!isEligibleGraphNode(source) || !isEligibleGraphNode(target)) {
        continue;
      }
      const bucket = oneHopSourcesByNode.get(source.id) ?? new Set<string>();
      bucket.add(target.title || target.id);
      oneHopSourcesByNode.set(source.id, bucket);
    }
  }

  return { directAliasesByNode, oneHopSourcesByNode };
}

function normalizeScopeInput(scope: string | string[] | undefined): string[] {
  if (!scope) {
    return [];
  }
  if (Array.isArray(scope)) {
    return [...new Set(scope.map(normalizeScopeValue).filter(Boolean))];
  }
  return [...new Set(scope.split(',').map(normalizeScopeValue).filter(Boolean))];
}

function scopeMatches(itemScope: string[], requestedScope: string[]): boolean {
  if (
    requestedScope.length === 0
    || requestedScope.includes('global')
    || requestedScope.includes('*')
  ) {
    return true;
  }
  if (itemScope.length === 0 || itemScope.includes('global') || itemScope.includes('*')) {
    return true;
  }
  return itemScope.some((scope) => requestedScope.includes(scope));
}

export function deterministicInjectMatches(params: {
  message: string;
  items: InjectableItem[];
  graph: MemoryGraph;
  scope?: string | string[];
}): InjectMatch[] {
  const message = params.message.trim();
  if (!message) {
    return [];
  }

  const requestedScope = normalizeScopeInput(params.scope);
  const messageKeywords = new Set(tokenizeKeywords(message));
  const { directAliasesByNode, oneHopSourcesByNode } = buildDeterministicEntityMatches(message, params.graph);
  const normalizedMessage = normalizeText(message);
  const matches: InjectMatch[] = [];

  for (const item of params.items) {
    if (!scopeMatches(item.scope, requestedScope)) {
      continue;
    }

    const reasons: InjectMatchReason[] = [];
    let signalScore = 0;

    const triggerHits: string[] = [];
    for (const trigger of item.triggers) {
      if (containsPhrase(normalizedMessage, trigger)) {
        triggerHits.push(trigger);
      }
    }
    if (triggerHits.length > 0) {
      const weight = Math.min(30, 12 + (triggerHits.length * 6));
      signalScore += weight;
      reasons.push({
        source: 'trigger',
        value: triggerHits.slice(0, 3).join(', '),
        weight
      });
    }

    const keywordHits = item.searchKeywords.filter((keyword) => messageKeywords.has(keyword));
    if (keywordHits.length > 0) {
      const weight = Math.min(18, keywordHits.length * 4);
      signalScore += weight;
      reasons.push({
        source: 'keyword',
        value: keywordHits.slice(0, 4).join(', '),
        weight
      });
    }

    const directAliases = directAliasesByNode.get(item.noteNodeId);
    if (directAliases && directAliases.size > 0) {
      const weight = 18;
      signalScore += weight;
      reasons.push({
        source: 'entity',
        value: [...directAliases].slice(0, 3).join(', '),
        weight
      });
    }

    const oneHopSources = oneHopSourcesByNode.get(item.noteNodeId);
    if (oneHopSources && oneHopSources.size > 0) {
      const weight = 10;
      signalScore += weight;
      reasons.push({
        source: 'graph_1hop',
        value: `via ${[...oneHopSources].slice(0, 2).join(', ')}`,
        weight
      });
    }

    if (reasons.length === 0) {
      continue;
    }

    const deterministicScore = item.priority + signalScore;
    matches.push({
      item,
      score: deterministicScore,
      deterministicScore,
      llmScore: null,
      reasons
    });
  }

  return matches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (right.item.priority !== left.item.priority) {
      return right.item.priority - left.item.priority;
    }
    return left.item.relativePath.localeCompare(right.item.relativePath);
  });
}

function parseLlmMatches(rawOutput: string): Array<{ id: string; score: number; reason: string }> {
  const cleaned = rawOutput
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : (
      parsed
      && typeof parsed === 'object'
      && Array.isArray((parsed as { matches?: unknown[] }).matches)
        ? (parsed as { matches: unknown[] }).matches
        : []
    );

  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return [];
    }
    const id = typeof (row as { id?: unknown }).id === 'string'
      ? (row as { id: string }).id.trim()
      : '';
    const scoreRaw = (row as { score?: unknown }).score;
    const score = typeof scoreRaw === 'number' ? scoreRaw : Number.NaN;
    const reason = typeof (row as { reason?: unknown }).reason === 'string'
      ? (row as { reason: string }).reason.trim()
      : '';
    if (!id || !Number.isFinite(score)) {
      return [];
    }
    return [{
      id,
      score: Math.max(0, Math.min(1, score)),
      reason
    }];
  });
}

async function addLlmIntentMatches(params: {
  message: string;
  items: InjectableItem[];
  matches: InjectMatch[];
  provider: LlmProvider;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<InjectMatch[]> {
  if (params.items.length === 0) {
    return params.matches;
  }

  const existingById = new Map(params.matches.map((match) => [match.item.id, match]));
  const candidates = [...params.items]
    .sort((left, right) => right.priority - left.priority || left.relativePath.localeCompare(right.relativePath))
    .slice(0, 40);

  const prompt = [
    'You rank ClawVault injectable memory items for an agent prompt.',
    'Return strict JSON only in this shape:',
    '{"matches":[{"id":"<candidate id>","score":0.0-1.0,"reason":"short why"}]}',
    'Only include candidate IDs from the list below.',
    'Use higher scores for items that are relevant to the user message intent even if wording differs.',
    '',
    `User message: ${params.message}`,
    '',
    'Candidates:',
    ...candidates.map((item) => {
      const preview = item.content.replace(/\s+/g, ' ').trim().slice(0, 220);
      return [
        `- id: ${item.id}`,
        `  category: ${item.category}`,
        `  title: ${item.title}`,
        `  triggers: ${item.triggers.join(', ') || '(none)'}`,
        `  scope: ${item.scope.join(', ') || '(none)'}`,
        `  content: ${preview || '(empty)'}`
      ].join('\n');
    })
  ].join('\n');

  const output = await requestLlmCompletion({
    provider: params.provider,
    prompt,
    model: params.model,
    temperature: 0.1,
    maxTokens: 1200,
    fetchImpl: params.fetchImpl,
    systemPrompt: 'You are an intent ranking engine. Respond with valid JSON only.'
  });

  const parsed = parseLlmMatches(output);
  if (parsed.length === 0) {
    return params.matches;
  }

  const itemById = new Map(params.items.map((item) => [item.id, item]));
  for (const row of parsed) {
    const candidate = itemById.get(row.id);
    if (!candidate) {
      continue;
    }
    const llmWeight = row.score * 24;
    const reason = row.reason || `intent score ${row.score.toFixed(2)}`;
    const existing = existingById.get(row.id);
    if (existing) {
      existing.llmScore = row.score;
      existing.score += llmWeight;
      existing.reasons.push({
        source: 'llm_intent',
        value: reason,
        weight: llmWeight
      });
      continue;
    }

    if (row.score < 0.45) {
      continue;
    }
    const seededDeterministic = candidate.priority * 0.2;
    existingById.set(row.id, {
      item: candidate,
      deterministicScore: seededDeterministic,
      llmScore: row.score,
      score: seededDeterministic + llmWeight,
      reasons: [{
        source: 'llm_intent',
        value: reason,
        weight: llmWeight
      }]
    });
  }

  return [...existingById.values()].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (right.item.priority !== left.item.priority) {
      return right.item.priority - left.item.priority;
    }
    return left.item.relativePath.localeCompare(right.item.relativePath);
  });
}

async function readGraph(vaultPath: string): Promise<MemoryGraph> {
  const resolvedPath = path.resolve(vaultPath);
  const loaded = loadMemoryGraphIndex(resolvedPath);
  if (loaded?.graph) {
    return loaded.graph;
  }
  try {
    return await getMemoryGraph(resolvedPath);
  } catch {
    return {
      schemaVersion: 1,
      nodes: [],
      edges: [],
      stats: {
        generatedAt: new Date(0).toISOString(),
        nodeCount: 0,
        edgeCount: 0,
        nodeTypeCounts: {},
        edgeTypeCounts: {}
      }
    };
  }
}

export async function runPromptInjection(
  vaultPathInput: string,
  message: string,
  options: InjectRuntimeOptions = {}
): Promise<InjectResult> {
  const vaultPath = path.resolve(vaultPathInput);
  const maxResults = Math.max(1, Math.floor(options.maxResults ?? 8));
  const useLlm = options.useLlm ?? false;
  const startDeterministic = Date.now();

  const items = indexInjectableItems(vaultPath);
  const graph = await readGraph(vaultPath);
  let matches = deterministicInjectMatches({
    message,
    items,
    graph,
    scope: options.scope
  });
  const deterministicMs = Date.now() - startDeterministic;

  let llmProvider: LlmProvider | null = null;
  if (useLlm) {
    llmProvider = resolveLlmProvider();
    if (llmProvider) {
      try {
        matches = await addLlmIntentMatches({
          message,
          items,
          matches,
          provider: llmProvider,
          model: options.model,
          fetchImpl: options.fetchImpl
        });
      } catch {
        // Deterministic matching is the reliability baseline.
      }
    }
  }

  return {
    message,
    generatedAt: new Date().toISOString(),
    deterministicMs,
    llmProvider,
    usedLlm: Boolean(useLlm && llmProvider),
    matches: matches.slice(0, maxResults)
  };
}

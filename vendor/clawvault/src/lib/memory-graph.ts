import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

export const MEMORY_GRAPH_SCHEMA_VERSION = 1;
const GRAPH_INDEX_RELATIVE_PATH = path.join('.clawvault', 'graph-index.json');
const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;
const HASH_TAG_RE = /(^|\s)#([\w-]+)/g;
const FRONTMATTER_RELATION_FIELDS = [
  'related',
  'depends_on',
  'dependsOn',
  'blocked_by',
  'blocks',
  'owner',
  'project',
  'people',
  'links'
];

type NodeCategory =
  | 'note'
  | 'daily'
  | 'observation'
  | 'handoff'
  | 'decision'
  | 'lesson'
  | 'project'
  | 'person'
  | 'commitment'
  | 'tag'
  | 'unresolved';

export type MemoryGraphNodeType = NodeCategory;
export type MemoryGraphEdgeType = 'wiki_link' | 'tag' | 'frontmatter_relation';

export interface MemoryGraphNode {
  id: string;
  title: string;
  type: MemoryGraphNodeType;
  category: string;
  path: string | null;
  tags: string[];
  missing: boolean;
  degree: number;
  modifiedAt: string | null;
}

export interface MemoryGraphEdge {
  id: string;
  source: string;
  target: string;
  type: MemoryGraphEdgeType;
  label?: string;
}

export interface MemoryGraphStats {
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodeTypeCounts: Record<string, number>;
  edgeTypeCounts: Record<string, number>;
}

export interface MemoryGraph {
  schemaVersion: number;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  stats: MemoryGraphStats;
}

interface MemoryGraphFileFragment {
  relativePath: string;
  mtimeMs: number;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
}

export interface MemoryGraphIndex {
  schemaVersion: number;
  vaultPath: string;
  generatedAt: string;
  files: Record<string, MemoryGraphFileFragment>;
  graph: MemoryGraph;
}

interface NoteRegistry {
  byLowerPath: Map<string, string>;
  byLowerBasename: Map<string, string[]>;
}

interface BuildGraphIndexOptions {
  forceFull?: boolean;
}

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join('/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function toNoteKey(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  return normalized.toLowerCase().endsWith('.md') ? normalized.slice(0, -3) : normalized;
}

function toNoteNodeId(noteKey: string): string {
  return `note:${noteKey}`;
}

function toTagNodeId(tag: string): string {
  return `tag:${tag.toLowerCase()}`;
}

function normalizeUnresolvedKey(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
  return normalized || 'unknown';
}

function toUnresolvedNodeId(raw: string): string {
  return `unresolved:${normalizeUnresolvedKey(raw)}`;
}

function titleFromNoteKey(noteKey: string): string {
  const basename = noteKey.split('/').pop() ?? noteKey;
  return basename
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferNodeType(relativePath: string, frontmatter: Record<string, unknown>): NodeCategory {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const category = normalized.split('/')[0] ?? 'note';
  const explicitType = typeof frontmatter.type === 'string' ? frontmatter.type.toLowerCase() : '';

  if (category.includes('daily') || explicitType === 'daily') return 'daily';
  if (category === 'observations' || explicitType === 'observation') return 'observation';
  if (category === 'handoffs' || explicitType === 'handoff') return 'handoff';
  if (category === 'decisions' || explicitType === 'decision') return 'decision';
  if (category === 'lessons' || explicitType === 'lesson') return 'lesson';
  if (category === 'projects' || explicitType === 'project') return 'project';
  if (category === 'people' || explicitType === 'person') return 'person';
  if (category === 'commitments' || explicitType === 'commitment') return 'commitment';

  return 'note';
}

function ensureClawvaultDir(vaultPath: string): string {
  const dirPath = path.join(vaultPath, '.clawvault');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getGraphIndexPath(vaultPath: string): string {
  return path.join(vaultPath, GRAPH_INDEX_RELATIVE_PATH);
}

function normalizeWikiTarget(target: string): string {
  let value = target.trim();
  if (!value) return '';
  const pipeIndex = value.indexOf('|');
  if (pipeIndex >= 0) {
    value = value.slice(0, pipeIndex);
  }
  const hashIndex = value.indexOf('#');
  if (hashIndex >= 0) {
    value = value.slice(0, hashIndex);
  }
  value = value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
  if (value.toLowerCase().endsWith('.md')) {
    value = value.slice(0, -3);
  }
  return value.trim();
}

function collectTags(frontmatter: Record<string, unknown>, markdownContent: string): string[] {
  const tags = new Set<string>();
  const fmTags = frontmatter.tags;

  if (Array.isArray(fmTags)) {
    for (const tag of fmTags) {
      if (typeof tag === 'string' && tag.trim()) tags.add(tag.trim().toLowerCase());
    }
  } else if (typeof fmTags === 'string') {
    for (const token of fmTags.split(',')) {
      const normalized = token.trim().toLowerCase();
      if (normalized) tags.add(normalized);
    }
  }

  const markdownMatches = markdownContent.matchAll(HASH_TAG_RE);
  for (const match of markdownMatches) {
    const tag = match[2]?.trim().toLowerCase();
    if (tag) tags.add(tag);
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}

function extractWikiTargets(markdownContent: string): string[] {
  const targets = new Set<string>();
  for (const match of markdownContent.matchAll(WIKI_LINK_RE)) {
    const candidate = match[1];
    if (!candidate) continue;
    const normalized = normalizeWikiTarget(candidate);
    if (normalized) targets.add(normalized);
  }
  return [...targets];
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

function extractFrontmatterRelations(frontmatter: Record<string, unknown>): Array<{ field: string; target: string }> {
  const relations: Array<{ field: string; target: string }> = [];

  for (const field of FRONTMATTER_RELATION_FIELDS) {
    const raw = frontmatter[field];
    for (const value of toStringArray(raw)) {
      const normalized = normalizeWikiTarget(value);
      if (normalized) relations.push({ field, target: normalized });
    }
  }

  return relations;
}

function buildNoteRegistry(relativePaths: string[]): NoteRegistry {
  const byLowerPath = new Map<string, string>();
  const byLowerBasename = new Map<string, string[]>();

  for (const relativePath of relativePaths) {
    const noteKey = toNoteKey(relativePath);
    const lowerKey = noteKey.toLowerCase();
    if (!byLowerPath.has(lowerKey)) {
      byLowerPath.set(lowerKey, noteKey);
    }

    const base = noteKey.split('/').pop() ?? noteKey;
    const lowerBase = base.toLowerCase();
    const existing = byLowerBasename.get(lowerBase) ?? [];
    existing.push(noteKey);
    byLowerBasename.set(lowerBase, existing);
  }

  return { byLowerPath, byLowerBasename };
}

function resolveTargetNodeId(rawTarget: string, registry: NoteRegistry): string {
  const normalized = normalizeWikiTarget(rawTarget);
  if (!normalized) {
    return toUnresolvedNodeId(rawTarget);
  }

  const lowerTarget = normalized.toLowerCase();
  const direct = registry.byLowerPath.get(lowerTarget);
  if (direct) {
    return toNoteNodeId(direct);
  }

  if (!normalized.includes('/')) {
    const basenameMatches = registry.byLowerBasename.get(lowerTarget) ?? [];
    if (basenameMatches.length === 1) {
      return toNoteNodeId(basenameMatches[0]);
    }
  }

  // Graph guardrail: unresolved links stay unresolved.
  // We never synthesize note nodes for files that do not exist on disk.
  return toUnresolvedNodeId(normalized);
}

function createEdgeId(type: MemoryGraphEdgeType, source: string, target: string, label?: string): string {
  const suffix = label ? `:${label}` : '';
  return `${type}:${source}->${target}${suffix}`;
}

function buildFragmentNode(
  id: string,
  title: string,
  type: MemoryGraphNodeType,
  category: string,
  pathValue: string | null,
  tags: string[],
  missing: boolean,
  modifiedAt: string | null
): MemoryGraphNode {
  return {
    id,
    title,
    type,
    category,
    path: pathValue,
    tags,
    missing,
    degree: 0,
    modifiedAt
  };
}

function parseFileFragment(
  vaultPath: string,
  relativePath: string,
  mtimeMs: number,
  registry: NoteRegistry
): MemoryGraphFileFragment {
  const absolutePath = path.join(vaultPath, relativePath);
  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = matter(raw);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  const noteKey = toNoteKey(relativePath);
  const noteNodeId = toNoteNodeId(noteKey);
  const noteType = inferNodeType(relativePath, frontmatter);
  const tags = collectTags(frontmatter, parsed.content);
  const modifiedAt = new Date(mtimeMs).toISOString();

  const nodes = new Map<string, MemoryGraphNode>();
  const edges = new Map<string, MemoryGraphEdge>();

  nodes.set(
    noteNodeId,
    buildFragmentNode(
      noteNodeId,
      typeof frontmatter.title === 'string' && frontmatter.title.trim()
        ? frontmatter.title.trim()
        : titleFromNoteKey(noteKey),
      noteType,
      noteType,
      normalizeRelativePath(relativePath),
      tags,
      false,
      modifiedAt
    )
  );

  for (const tag of tags) {
    const tagNodeId = toTagNodeId(tag);
    if (!nodes.has(tagNodeId)) {
      nodes.set(tagNodeId, buildFragmentNode(tagNodeId, `#${tag}`, 'tag', 'tag', null, [], false, null));
    }
    const edgeId = createEdgeId('tag', noteNodeId, tagNodeId);
    edges.set(edgeId, {
      id: edgeId,
      source: noteNodeId,
      target: tagNodeId,
      type: 'tag'
    });
  }

  const wikiTargets = extractWikiTargets(parsed.content);
  for (const target of wikiTargets) {
    const targetNodeId = resolveTargetNodeId(target, registry);
    if (targetNodeId.startsWith('unresolved:') && !nodes.has(targetNodeId)) {
      nodes.set(
        targetNodeId,
        buildFragmentNode(targetNodeId, titleFromNoteKey(normalizeUnresolvedKey(target)), 'unresolved', 'unresolved', null, [], true, null)
      );
    }
    const edgeId = createEdgeId('wiki_link', noteNodeId, targetNodeId);
    edges.set(edgeId, {
      id: edgeId,
      source: noteNodeId,
      target: targetNodeId,
      type: 'wiki_link'
    });
  }

  for (const relation of extractFrontmatterRelations(frontmatter)) {
    const targetNodeId = resolveTargetNodeId(relation.target, registry);
    if (targetNodeId.startsWith('unresolved:') && !nodes.has(targetNodeId)) {
      nodes.set(
        targetNodeId,
        buildFragmentNode(
          targetNodeId,
          titleFromNoteKey(normalizeUnresolvedKey(relation.target)),
          'unresolved',
          'unresolved',
          null,
          [],
          true,
          null
        )
      );
    }
    const edgeId = createEdgeId('frontmatter_relation', noteNodeId, targetNodeId, relation.field);
    edges.set(edgeId, {
      id: edgeId,
      source: noteNodeId,
      target: targetNodeId,
      type: 'frontmatter_relation',
      label: relation.field
    });
  }

  return {
    relativePath: normalizeRelativePath(relativePath),
    mtimeMs,
    nodes: [...nodes.values()],
    edges: [...edges.values()]
  };
}

function combineFragments(
  fragments: Record<string, MemoryGraphFileFragment>,
  generatedAt: string
): MemoryGraph {
  const nodes = new Map<string, MemoryGraphNode>();
  const edges = new Map<string, MemoryGraphEdge>();

  for (const fragment of Object.values(fragments)) {
    for (const node of fragment.nodes) {
      const existing = nodes.get(node.id);
      if (!existing) {
        nodes.set(node.id, { ...node, degree: 0 });
      } else if (node.modifiedAt && (!existing.modifiedAt || node.modifiedAt > existing.modifiedAt)) {
        nodes.set(node.id, { ...existing, ...node, degree: 0 });
      }
    }
    for (const edge of fragment.edges) {
      edges.set(edge.id, edge);
    }
  }

  const degreeByNode = new Map<string, number>();
  for (const edge of edges.values()) {
    degreeByNode.set(edge.source, (degreeByNode.get(edge.source) ?? 0) + 1);
    degreeByNode.set(edge.target, (degreeByNode.get(edge.target) ?? 0) + 1);
  }

  for (const node of nodes.values()) {
    node.degree = degreeByNode.get(node.id) ?? 0;
  }

  const nodeTypeCounts: Record<string, number> = {};
  for (const node of nodes.values()) {
    nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] ?? 0) + 1;
  }
  const edgeTypeCounts: Record<string, number> = {};
  for (const edge of edges.values()) {
    edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] ?? 0) + 1;
  }

  const sortedNodes = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges.values()].sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: MEMORY_GRAPH_SCHEMA_VERSION,
    nodes: sortedNodes,
    edges: sortedEdges,
    stats: {
      generatedAt,
      nodeCount: sortedNodes.length,
      edgeCount: sortedEdges.length,
      nodeTypeCounts,
      edgeTypeCounts
    }
  };
}

function isValidIndex(index: unknown): index is MemoryGraphIndex {
  if (!index || typeof index !== 'object') return false;
  const typed = index as MemoryGraphIndex;
  return (
    typed.schemaVersion === MEMORY_GRAPH_SCHEMA_VERSION &&
    typeof typed.vaultPath === 'string' &&
    typeof typed.generatedAt === 'string' &&
    Boolean(typed.files && typeof typed.files === 'object') &&
    Boolean(typed.graph && typeof typed.graph === 'object')
  );
}

export function loadMemoryGraphIndex(vaultPath: string): MemoryGraphIndex | null {
  const indexPath = getGraphIndexPath(path.resolve(vaultPath));
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as unknown;
    if (!isValidIndex(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function buildOrUpdateMemoryGraphIndex(
  vaultPathInput: string,
  options: BuildGraphIndexOptions = {}
): Promise<MemoryGraphIndex> {
  const vaultPath = path.resolve(vaultPathInput);
  ensureClawvaultDir(vaultPath);

  const existing = options.forceFull ? null : loadMemoryGraphIndex(vaultPath);
  const markdownFiles = await glob('**/*.md', {
    cwd: vaultPath,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.obsidian/**', '**/.trash/**', '**/ledger/archive/**']
  });
  const normalizedFiles = markdownFiles.map(normalizeRelativePath).sort((a, b) => a.localeCompare(b));
  const registry = buildNoteRegistry(normalizedFiles);

  const nextFragments: Record<string, MemoryGraphFileFragment> = {};
  const existingFragments = existing?.files ?? {};
  const currentFileSet = new Set(normalizedFiles);

  for (const relativePath of normalizedFiles) {
    const absolutePath = path.join(vaultPath, relativePath);
    const stat = fs.statSync(absolutePath);
    const existingFragment = existingFragments[relativePath];

    if (!options.forceFull && existingFragment && existingFragment.mtimeMs === stat.mtimeMs) {
      nextFragments[relativePath] = existingFragment;
      continue;
    }

    nextFragments[relativePath] = parseFileFragment(vaultPath, relativePath, stat.mtimeMs, registry);
  }

  for (const [relativePath, fragment] of Object.entries(existingFragments)) {
    if (!currentFileSet.has(relativePath)) {
      continue;
    }
    if (!nextFragments[relativePath]) {
      nextFragments[relativePath] = fragment;
    }
  }

  const generatedAt = new Date().toISOString();
  const graph = combineFragments(nextFragments, generatedAt);
  const nextIndex: MemoryGraphIndex = {
    schemaVersion: MEMORY_GRAPH_SCHEMA_VERSION,
    vaultPath,
    generatedAt,
    files: nextFragments,
    graph
  };

  fs.writeFileSync(getGraphIndexPath(vaultPath), JSON.stringify(nextIndex, null, 2));
  return nextIndex;
}

export async function getMemoryGraph(vaultPath: string, options: { refresh?: boolean } = {}): Promise<MemoryGraph> {
  if (options.refresh === true) {
    return (await buildOrUpdateMemoryGraphIndex(vaultPath, { forceFull: true })).graph;
  }
  return (await buildOrUpdateMemoryGraphIndex(vaultPath)).graph;
}

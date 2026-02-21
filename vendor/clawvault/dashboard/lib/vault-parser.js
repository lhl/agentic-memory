import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

export const WIKI_LINK_REGEX = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
const HASH_TAG_REGEX = /(^|\s)#([\w-]+)/g;
const MEMORY_GRAPH_INDEX_PATH = ['.clawvault', 'graph-index.json'];

const MARKDOWN_EXT = '.md';
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.obsidian',
  '.trash',
  'node_modules'
]);
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

/**
 * Build a graph from markdown notes in a vault.
 * @param {string} vaultPath
 * @param {{ includeDangling?: boolean }} [options]
 */
export async function buildVaultGraph(vaultPath, options = {}) {
  const includeDangling = options.includeDangling !== false;
  const root = path.resolve(vaultPath);
  const preferIndex = options.preferIndex !== false;
  const validateIndexFreshness = options.validateIndexFreshness !== false;

  if (preferIndex) {
    const indexedGraph = await loadGraphFromMemoryIndex(root, {
      includeDangling,
      validateFreshness: validateIndexFreshness
    });
    if (indexedGraph) {
      return indexedGraph;
    }
  }

  const markdownFiles = await collectMarkdownFiles(root);

  const nodesById = new Map();
  const edgesByKey = new Map();
  const edgeSet = new Set();

  for (const absoluteFilePath of markdownFiles) {
    const raw = await fs.readFile(absoluteFilePath, 'utf8');
    const parsed = matter(raw);
    const relativePath = path.relative(root, absoluteFilePath);
    const id = toNodeId(relativePath);
    const frontmatter = parsed.data ?? {};

    nodesById.set(id, {
      id,
      title: normalizeString(frontmatter.title) || toDisplayTitle(id),
      category: normalizeString(frontmatter.category) || inferCategory(id),
      type: inferNodeType(id, frontmatter),
      tags: normalizeTags(frontmatter.tags),
      path: toPosixPath(relativePath),
      missing: false,
      _outboundTargets: extractWikiLinks(parsed.content),
      _frontmatterRelations: extractFrontmatterRelations(frontmatter),
      _inlineTags: extractInlineTags(parsed.content)
    });
  }

  const idsByLowercase = new Map();
  const idsByBaseName = new Map();
  for (const id of nodesById.keys()) {
    idsByLowercase.set(id.toLowerCase(), id);
    const baseName = path.posix.basename(id).toLowerCase();
    const existing = idsByBaseName.get(baseName) ?? new Set();
    existing.add(id);
    idsByBaseName.set(baseName, existing);
  }

  function ensureUnresolvedNode(targetId) {
    if (nodesById.has(targetId) || !includeDangling) {
      return;
    }
    nodesById.set(targetId, {
      id: targetId,
      title: toDisplayTitle(targetId),
      category: 'unresolved',
      type: 'unresolved',
      tags: [],
      path: null,
      missing: true,
      _outboundTargets: [],
      _frontmatterRelations: [],
      _inlineTags: []
    });
  }

  function addEdge(sourceId, targetId, type, label) {
    const edgeKey = `${type}:${sourceId}=>${targetId}${label ? `:${label}` : ''}`;
    if (edgeSet.has(edgeKey)) {
      return;
    }
    edgeSet.add(edgeKey);
    edgesByKey.set(edgeKey, {
      source: sourceId,
      target: targetId,
      type,
      label
    });
  }

  for (const node of nodesById.values()) {
    const tagSet = new Set([...(node.tags ?? []), ...(node._inlineTags ?? [])]);
    for (const inlineTag of tagSet) {
      const tagNodeId = `tag:${inlineTag.toLowerCase()}`;
      if (!nodesById.has(tagNodeId)) {
        nodesById.set(tagNodeId, {
          id: tagNodeId,
          title: `#${inlineTag}`,
          category: 'tag',
          type: 'tag',
          tags: [],
          path: null,
          missing: false,
          _outboundTargets: [],
          _frontmatterRelations: [],
          _inlineTags: []
        });
      }
      addEdge(node.id, tagNodeId, 'tag');
    }

    for (const rawTarget of node._outboundTargets) {
      const targetId = resolveTargetId(rawTarget, {
        idsByLowercase,
        idsByBaseName,
        includeDangling
      });
      if (!targetId) {
        continue;
      }
      ensureUnresolvedNode(targetId);
      addEdge(node.id, targetId, 'wiki_link');
    }

    for (const relation of node._frontmatterRelations) {
      const targetId = resolveTargetId(relation.target, {
        idsByLowercase,
        idsByBaseName,
        includeDangling
      });
      if (!targetId) {
        continue;
      }
      ensureUnresolvedNode(targetId);
      addEdge(node.id, targetId, 'frontmatter_relation', relation.field);
    }
  }

  const edges = Array.from(edgesByKey.values());
  const degreeByNodeId = new Map();
  for (const edge of edges) {
    degreeByNodeId.set(edge.source, (degreeByNodeId.get(edge.source) ?? 0) + 1);
    degreeByNodeId.set(edge.target, (degreeByNodeId.get(edge.target) ?? 0) + 1);
  }

  const nodeTypeCounts = {};
  const nodes = Array.from(nodesById.values())
    .map(({ _outboundTargets, _frontmatterRelations, _inlineTags, ...node }) => {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] ?? 0) + 1;
      return {
        ...node,
        degree: degreeByNodeId.get(node.id) ?? 0
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const edgeTypeCounts = {};
  for (const edge of edges) {
    edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] ?? 0) + 1;
  }

  edges.sort((a, b) => {
    const sourceSort = String(a.source).localeCompare(String(b.source));
    if (sourceSort !== 0) return sourceSort;
    const targetSort = String(a.target).localeCompare(String(b.target));
    if (targetSort !== 0) return targetSort;
    const typeSort = String(a.type || '').localeCompare(String(b.type || ''));
    if (typeSort !== 0) return typeSort;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });

  return {
    nodes,
    edges,
    stats: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      fileCount: markdownFiles.length,
      nodeTypeCounts,
      edgeTypeCounts
    }
  };
}

async function loadGraphFromMemoryIndex(root, options = {}) {
  const includeDangling = options.includeDangling !== false;
  const validateFreshness = options.validateFreshness !== false;
  const indexPath = path.join(root, ...MEMORY_GRAPH_INDEX_PATH);

  let parsed;
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const graph = parsed?.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return null;
  }

  if (validateFreshness) {
    const fresh = await isIndexFresh(root, parsed);
    if (!fresh) {
      return null;
    }
  }

  const nodeById = new Map();
  for (const node of graph.nodes) {
    const mappedId = fromIndexedNodeId(node?.id, node?.type);
    if (!mappedId) continue;
    if (node?.missing && !includeDangling) continue;

    nodeById.set(mappedId, {
      id: mappedId,
      title: normalizeString(node?.title) || toDisplayTitle(mappedId),
      category: normalizeString(node?.category) || 'root',
      type: normalizeString(node?.type) || 'note',
      tags: normalizeTags(node?.tags),
      path: typeof node?.path === 'string' ? toPosixPath(node.path) : null,
      missing: Boolean(node?.missing),
      degree: Number(node?.degree ?? 0)
    });
  }

  const edges = [];
  for (const edge of graph.edges) {
    const source = fromIndexedNodeId(edge?.source);
    const target = fromIndexedNodeId(edge?.target);
    if (!source || !target) continue;
    if (!nodeById.has(source) || !nodeById.has(target)) continue;
    edges.push({
      source,
      target,
      type: normalizeString(edge?.type) || 'wiki_link',
      label: normalizeString(edge?.label) || undefined
    });
  }

  const degreeByNodeId = new Map();
  for (const edge of edges) {
    degreeByNodeId.set(edge.source, (degreeByNodeId.get(edge.source) ?? 0) + 1);
    degreeByNodeId.set(edge.target, (degreeByNodeId.get(edge.target) ?? 0) + 1);
  }

  const nodeTypeCounts = {};
  const nodes = Array.from(nodeById.values())
    .map((node) => {
      node.degree = degreeByNodeId.get(node.id) ?? 0;
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] ?? 0) + 1;
      return node;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const edgeTypeCounts = {};
  for (const edge of edges) {
    edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] ?? 0) + 1;
  }

  edges.sort((a, b) => {
    const sourceSort = String(a.source).localeCompare(String(b.source));
    if (sourceSort !== 0) return sourceSort;
    const targetSort = String(a.target).localeCompare(String(b.target));
    if (targetSort !== 0) return targetSort;
    const typeSort = String(a.type || '').localeCompare(String(b.type || ''));
    if (typeSort !== 0) return typeSort;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });

  return {
    nodes,
    edges,
    stats: {
      generatedAt: normalizeString(graph?.stats?.generatedAt) || new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      fileCount: Number.isFinite(Number(parsed?.files ? Object.keys(parsed.files).length : graph?.stats?.fileCount))
        ? Number(parsed?.files ? Object.keys(parsed.files).length : graph?.stats?.fileCount)
        : 0,
      nodeTypeCounts,
      edgeTypeCounts
    }
  };
}

async function isIndexFresh(root, parsedIndex) {
  const indexedFiles = parsedIndex?.files;
  if (!indexedFiles || typeof indexedFiles !== 'object') {
    return false;
  }

  const markdownFiles = await collectMarkdownFiles(root);
  const normalizedCurrent = markdownFiles
    .map((absolutePath) => toPosixPath(path.relative(root, absolutePath)))
    .sort((a, b) => a.localeCompare(b));
  const indexedPaths = Object.keys(indexedFiles).sort((a, b) => a.localeCompare(b));

  if (normalizedCurrent.length !== indexedPaths.length) {
    return false;
  }

  for (let index = 0; index < normalizedCurrent.length; index += 1) {
    if (normalizedCurrent[index] !== indexedPaths[index]) {
      return false;
    }
  }

  for (const relativePath of indexedPaths) {
    const fragment = indexedFiles[relativePath];
    const expectedMtime = Number(fragment?.mtimeMs);
    if (!Number.isFinite(expectedMtime)) {
      return false;
    }
    const absolutePath = path.join(root, relativePath);
    let stat;
    try {
      stat = await fs.stat(absolutePath);
    } catch {
      return false;
    }
    if (Math.abs(stat.mtimeMs - expectedMtime) > 1) {
      return false;
    }
  }

  return true;
}

async function collectMarkdownFiles(root) {
  const pending = [root];
  const files = [];

  while (pending.length > 0) {
    const currentDir = pending.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          pending.push(absolutePath);
        }
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(MARKDOWN_EXT)) {
        files.push(absolutePath);
      }
    }
  }

  return files;
}

function extractWikiLinks(markdown) {
  const links = [];
  const regex = new RegExp(WIKI_LINK_REGEX.source, 'g');
  let match = regex.exec(markdown);

  while (match) {
    const rawTarget = match[1]?.trim();
    if (rawTarget) {
      links.push(rawTarget);
    }
    match = regex.exec(markdown);
  }

  return links;
}

function extractInlineTags(markdown) {
  const tags = new Set();
  for (const match of markdown.matchAll(HASH_TAG_REGEX)) {
    const tag = normalizeString(match[2])?.toLowerCase();
    if (tag) {
      tags.add(tag);
    }
  }
  return [...tags];
}

function extractFrontmatterRelations(frontmatter) {
  const relations = [];
  for (const field of FRONTMATTER_RELATION_FIELDS) {
    const raw = frontmatter?.[field];
    if (typeof raw === 'string') {
      for (const target of raw.split(',').map((value) => normalizeWikiTarget(value)).filter(Boolean)) {
        relations.push({ field, target });
      }
      continue;
    }
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (typeof entry !== 'string') continue;
        for (const target of entry.split(',').map((value) => normalizeWikiTarget(value)).filter(Boolean)) {
          relations.push({ field, target });
        }
      }
    }
  }
  return relations;
}

function resolveTargetId(target, context) {
  const normalized = normalizeWikiTarget(target);
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  const exact = context.idsByLowercase.get(lower);
  if (exact) {
    return exact;
  }

  if (!normalized.includes('/')) {
    const maybeMatches = context.idsByBaseName.get(lower);
    if (maybeMatches?.size === 1) {
      return Array.from(maybeMatches)[0];
    }
  }

  return context.includeDangling ? normalized : null;
}

function normalizeWikiTarget(target) {
  let value = normalizeString(target);
  if (!value) {
    return null;
  }

  const hashIndex = value.indexOf('#');
  if (hashIndex >= 0) {
    value = value.slice(0, hashIndex);
  }

  const caretIndex = value.indexOf('^');
  if (caretIndex >= 0) {
    value = value.slice(0, caretIndex);
  }

  value = value.replace(/\\/g, '/');
  value = value.replace(/^\.\//, '');
  value = value.replace(/^\/+/, '');
  value = value.replace(/\/+/g, '/');

  if (value.toLowerCase().endsWith(MARKDOWN_EXT)) {
    value = value.slice(0, -MARKDOWN_EXT.length);
  }

  return normalizeString(value);
}

function fromIndexedNodeId(value, nodeType = '') {
  const raw = normalizeString(value);
  if (!raw) return '';
  if (raw.startsWith('note:')) {
    return raw.slice(5);
  }
  if (raw.startsWith('tag:')) {
    return raw;
  }
  if (raw.startsWith('unresolved:')) {
    return raw.slice('unresolved:'.length) || raw;
  }
  if (normalizeString(nodeType).toLowerCase() === 'tag') {
    return raw.startsWith('tag:') ? raw : `tag:${raw}`;
  }
  return raw;
}

function toNodeId(relativePath) {
  const normalized = toPosixPath(relativePath);
  return normalized.toLowerCase().endsWith(MARKDOWN_EXT)
    ? normalized.slice(0, -MARKDOWN_EXT.length)
    : normalized;
}

function inferCategory(id) {
  const category = id.split('/')[0];
  return normalizeString(category) || 'root';
}

function inferNodeType(id, frontmatter) {
  const category = inferCategory(id).toLowerCase();
  const explicitType = normalizeString(frontmatter?.type).toLowerCase();
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

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(normalizeString).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => normalizeString(tag))
      .filter(Boolean);
  }
  return [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toDisplayTitle(id) {
  const base = path.posix.basename(id);
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

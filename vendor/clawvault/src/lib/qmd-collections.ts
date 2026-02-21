import { execFileSync } from 'child_process';

const COLLECTION_HEADER_RE = /^(\S+)\s+\(qmd:\/\/([^)]+)\)\s*$/;
const DETAIL_LINE_RE = /^\s+([A-Za-z][A-Za-z0-9 _-]*):\s*(.+)\s*$/;

export interface QmdCollectionInfo {
  name: string;
  uri: string;
  details: Record<string, string>;
  root?: string;
  files?: number;
  vectors?: number;
  pendingEmbeddings?: number;
}

function normalizeDetailKey(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, '_');
}

function parseCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/-?\d[\d,]*/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0].replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickDetail(details: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickCount(details: Record<string, string>, keys: string[]): number | undefined {
  for (const key of keys) {
    const parsed = parseCount(details[key]);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

export function parseQmdCollectionList(raw: string): QmdCollectionInfo[] {
  const collections: QmdCollectionInfo[] = [];
  let current: QmdCollectionInfo | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const headerMatch = line.match(COLLECTION_HEADER_RE);
    if (headerMatch) {
      current = {
        name: headerMatch[1],
        uri: headerMatch[2],
        details: {}
      };
      collections.push(current);
      continue;
    }

    if (!current) continue;

    const detailMatch = line.match(DETAIL_LINE_RE);
    if (!detailMatch) continue;

    const key = normalizeDetailKey(detailMatch[1]);
    current.details[key] = detailMatch[2].trim();
  }

  for (const collection of collections) {
    const root = pickDetail(collection.details, ['root', 'path', 'directory']);
    if (root) {
      collection.root = root;
    }

    collection.files = pickCount(collection.details, ['files', 'documents', 'docs']);
    collection.vectors = pickCount(collection.details, ['vectors', 'embeddings', 'vector_embeddings']);

    collection.pendingEmbeddings = pickCount(collection.details, [
      'pending',
      'pending_vectors',
      'pending_embeddings',
      'unembedded',
      'without_embeddings'
    ]);

    if (
      collection.pendingEmbeddings === undefined
      && collection.files !== undefined
      && collection.vectors !== undefined
    ) {
      collection.pendingEmbeddings = Math.max(collection.files - collection.vectors, 0);
    }
  }

  return collections;
}

export function listQmdCollections(): QmdCollectionInfo[] {
  const output = execFileSync('qmd', ['collection', 'list'], {
    encoding: 'utf-8'
  });
  return parseQmdCollectionList(output);
}

export function removeQmdCollection(name: string): void {
  try {
    execFileSync('qmd', ['collection', 'remove', name], { stdio: 'ignore' });
    return;
  } catch {
    execFileSync('qmd', ['collection', 'rm', name], { stdio: 'ignore' });
  }
}

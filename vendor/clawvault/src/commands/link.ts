import * as fs from 'fs';
import * as path from 'path';
import { buildEntityIndex, type EntityIndex } from '../lib/entity-index.js';
import { autoLink, dryRunLink, findUnlinkedMentions } from '../lib/auto-linker.js';
import { readBacklinksIndex, rebuildBacklinksIndex, scanVaultLinks } from '../lib/backlinks.js';
import { resolveVaultPath } from '../lib/config.js';
import { buildOrUpdateMemoryGraphIndex } from '../lib/memory-graph.js';

interface LinkOptions {
  all?: boolean;
  dryRun?: boolean;
  backlinks?: string;
  orphans?: boolean;
  rebuild?: boolean;
  vaultPath?: string;
}

export async function linkCommand(file: string | undefined, options: LinkOptions): Promise<void> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const index = buildEntityIndex(vaultPath);
  const suggestionIndex = filterIndex(index, new Set(['people', 'projects', 'decisions']));
  const modeCount = [options.backlinks ? 1 : 0, options.orphans ? 1 : 0, options.rebuild ? 1 : 0]
    .reduce((sum, value) => sum + value, 0);

  if (modeCount > 1) {
    console.error('Error: Use only one of --backlinks, --orphans, or --rebuild');
    process.exit(1);
  }

  if (options.rebuild) {
    const result = rebuildBacklinksIndex(vaultPath, { entityIndex: index });
    const orphanSuffix = result.orphans.length > 0 ? `, ${result.orphans.length} orphan(s)` : '';
    console.log(`✓ Rebuilt backlinks (${result.backlinks.size} targets, ${result.linkCount} links${orphanSuffix})`);
    return;
  }

  if (options.backlinks) {
    if (file) {
      console.error('Error: Use --backlinks without a file argument');
      process.exit(1);
    }
    const target = resolveBacklinkTarget(options.backlinks, vaultPath, index);
    if (!target) {
      console.error('Error: Invalid target for --backlinks');
      process.exit(1);
    }
    const backlinks = readBacklinksIndex(vaultPath)
      ?? rebuildBacklinksIndex(vaultPath, { entityIndex: index }).backlinks;
    const sources = backlinks.get(target) || [];
    if (sources.length === 0) {
      console.log(`No backlinks found for ${target}`);
      return;
    }
    console.log(`Backlinks → ${target}`);
    for (const source of sources.sort()) {
      console.log(`  - ${source}`);
    }
    return;
  }

  if (options.orphans) {
    if (file || options.all) {
      console.error('Error: --orphans does not accept a file or --all');
      process.exit(1);
    }
    const result = scanVaultLinks(vaultPath, { entityIndex: index });
    if (result.orphans.length === 0) {
      console.log('✓ No orphan links found');
      return;
    }
    const orphans = result.orphans
      .slice()
      .sort((a, b) => a.target.localeCompare(b.target) || a.source.localeCompare(b.source));
    console.log(`⚠ ${orphans.length} orphan link(s) found`);
    for (const orphan of orphans) {
      console.log(`  - ${orphan.source} → [[${orphan.target}]]`);
    }
    return;
  }
  
  if (options.all) {
    await linkAllFiles(vaultPath, index, suggestionIndex, options.dryRun);
    if (!options.dryRun) {
      await buildOrUpdateMemoryGraphIndex(vaultPath);
    }
    return;
  }
  
  if (!file) {
    console.error('Error: Specify a file or use --all');
    process.exit(1);
  }
  
  const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const linked = await linkFile(filePath, index, suggestionIndex, options.dryRun);
  if (!options.dryRun && linked > 0) {
    await buildOrUpdateMemoryGraphIndex(vaultPath);
  }
}

function filterIndex(index: EntityIndex, categories: Set<string>): EntityIndex {
  const entries = new Map<string, string>();
  const byPath = new Map<string, { path: string; aliases: string[] }>();

  for (const [alias, targetPath] of index.entries) {
    const category = targetPath.split('/')[0];
    if (categories.has(category)) {
      entries.set(alias, targetPath);
    }
  }

  for (const [targetPath, entry] of index.byPath) {
    const category = targetPath.split('/')[0];
    if (categories.has(category)) {
      byPath.set(targetPath, entry);
    }
  }

  return { entries, byPath };
}

function resolveBacklinkTarget(input: string, vaultPath: string, index: EntityIndex): string | null {
  let target = input.trim();
  if (!target) return null;
  if (target.startsWith('[[') && target.endsWith(']]')) {
    target = target.slice(2, -2);
  }
  const pipeIndex = target.indexOf('|');
  if (pipeIndex !== -1) {
    target = target.slice(0, pipeIndex);
  }
  const hashIndex = target.indexOf('#');
  if (hashIndex !== -1) {
    target = target.slice(0, hashIndex);
  }
  target = target.trim();
  if (!target) return null;
  if (target.endsWith('.md')) {
    target = target.slice(0, -3);
  }
  if (target.startsWith('/')) {
    target = target.slice(1);
  }

  const candidate = path.isAbsolute(target) ? target : path.join(vaultPath, target);
  const withExtension = candidate.endsWith('.md') ? candidate : `${candidate}.md`;
  if (fs.existsSync(candidate) && candidate.endsWith('.md')) {
    return toVaultId(vaultPath, candidate);
  }
  if (fs.existsSync(withExtension)) {
    return toVaultId(vaultPath, withExtension);
  }

  const aliasKey = target.toLowerCase();
  if (index.entries.has(aliasKey)) {
    return index.entries.get(aliasKey)!;
  }

  return target.replace(/\\/g, '/');
}

function toVaultId(vaultPath: string, filePath: string): string {
  const relative = path.relative(vaultPath, filePath).replace(/\.md$/, '');
  return relative.split(path.sep).join('/');
}

function logSuggestions(filePath: string, suggestions: Array<{ alias: string; path: string; line: number }>): void {
  if (suggestions.length === 0) return;
  console.log(`\n💡 Suggested links in ${path.basename(filePath)}`);
  for (const suggestion of suggestions) {
    console.log(`  Line ${suggestion.line}: "${suggestion.alias}" → [[${suggestion.path}]]`);
  }
}

async function linkFile(
  filePath: string,
  index: ReturnType<typeof buildEntityIndex>,
  suggestionIndex: EntityIndex,
  dryRun?: boolean
): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const linkedContent = autoLink(content, index);
  const suggestions = findUnlinkedMentions(linkedContent, suggestionIndex);

  if (dryRun) {
    const matches = dryRunLink(content, index);
    if (matches.length > 0) {
      console.log(`\n📄 ${filePath}`);
      for (const m of matches) {
        console.log(`  Line ${m.line}: "${m.alias}" → [[${m.path}]]`);
      }
    }
    logSuggestions(filePath, suggestions);
    return matches.length;
  }

  if (linkedContent !== content) {
    fs.writeFileSync(filePath, linkedContent);
    const matches = dryRunLink(content, index);
    console.log(`✓ Linked ${matches.length} entities in ${path.basename(filePath)}`);
    logSuggestions(filePath, suggestions);
    return matches.length;
  }

  logSuggestions(filePath, suggestions);
  return 0;
}

async function linkAllFiles(
  vaultPath: string,
  index: ReturnType<typeof buildEntityIndex>,
  suggestionIndex: EntityIndex,
  dryRun?: boolean
): Promise<void> {
  const files: string[] = [];
  
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden folders and archive
        if (!entry.name.startsWith('.') && entry.name !== 'archive' && entry.name !== 'templates') {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(vaultPath);
  
  let totalLinks = 0;
  let filesModified = 0;
  
  for (const file of files) {
    const links = await linkFile(file, index, suggestionIndex, dryRun);
    if (links > 0) {
      totalLinks += links;
      filesModified++;
    }
  }
  
  console.log(`\n${dryRun ? '(dry run) ' : ''}${totalLinks} links in ${filesModified} files`);
}

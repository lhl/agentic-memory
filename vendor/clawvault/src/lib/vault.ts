/**
 * ClawVault - The elephant's memory
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { glob } from 'glob';
import {
  VaultConfig,
  VaultMeta,
  Document,
  SearchResult,
  SearchOptions,
  StoreOptions,
  SyncOptions,
  SyncResult,
  DEFAULT_CATEGORIES,
  Category,
  MemoryType,
  TYPE_TO_CATEGORY,
  HandoffDocument,
  SessionRecap
} from '../types.js';
import { SearchEngine, extractWikiLinks, extractTags, hasQmd, qmdUpdate, qmdEmbed, QmdUnavailableError } from './search.js';
import { buildOrUpdateMemoryGraphIndex } from './memory-graph.js';

const CONFIG_FILE = '.clawvault.json';
const INDEX_FILE = '.clawvault-index.json';

export class ClawVault {
  private config: VaultConfig;
  private search: SearchEngine;
  private initialized: boolean = false;

  constructor(vaultPath: string) {
    if (!hasQmd()) {
      throw new QmdUnavailableError();
    }
    this.config = {
      path: path.resolve(vaultPath),
      name: path.basename(vaultPath),
      categories: DEFAULT_CATEGORIES,
      qmdCollection: undefined,
      qmdRoot: undefined
    };
    this.search = new SearchEngine();
    this.applyQmdConfig();
  }

  /**
   * Initialize a new vault
   */
  async init(options: Partial<VaultConfig> = {}, initFlags?: { skipBases?: boolean; skipTasks?: boolean; skipGraph?: boolean }): Promise<void> {
    if (!hasQmd()) {
      throw new QmdUnavailableError();
    }
    const vaultPath = this.config.path;
    const flags = initFlags || {};
    
    // Merge options
    this.config = { ...this.config, ...options };
    this.applyQmdConfig();

    // If skipTasks, remove tasks/backlog from categories
    if (flags.skipTasks) {
      this.config.categories = this.config.categories.filter(
        c => !['tasks', 'backlog'].includes(c)
      );
    }
    
    // Create vault directory
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true });
    }

    // Create category directories
    for (const category of this.config.categories) {
      const catPath = path.join(vaultPath, category);
      if (!fs.existsSync(catPath)) {
        fs.mkdirSync(catPath, { recursive: true });
      }
    }

    // Create ledger structure for observational memory
    const ledgerDirs = ['ledger/raw', 'ledger/observations', 'ledger/reflections'];
    for (const dir of ledgerDirs) {
      const dirPath = path.join(vaultPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create templates
    await this.createTemplates();

    // Create README
    const readmePath = path.join(vaultPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, this.generateReadme());
    }

    // Create welcome note so context has something from day one
    await this.createWelcomeNote();

    // Save config
    const configPath = path.join(vaultPath, CONFIG_FILE);
    const meta: VaultMeta = {
      name: this.config.name,
      version: '1.0.0',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      categories: this.config.categories,
      documentCount: 0,
      qmdCollection: this.getQmdCollection(),
      qmdRoot: this.getQmdRoot()
    };
    fs.writeFileSync(configPath, JSON.stringify(meta, null, 2));

    // Generate Obsidian Bases files for task management views (only if tasks category exists)
    if (!flags.skipBases && this.config.categories.includes('tasks')) {
      this.createBasesFiles();
    }

    if (!flags.skipGraph) {
      await this.syncMemoryGraphIndex({ forceFull: true });
    }
    this.initialized = true;
  }

  private createBasesFiles(): void {
    const vaultPath = this.config.path;
    const basesFiles: Record<string, string> = {
      'all-tasks.base': [
        'filters:', '  and:', '    - file.inFolder("tasks")', '    - status != "done"',
        'formulas:', '  age: (now() - file.ctime).days',
        '  status_icon: if(status == "blocked", "🔴", if(status == "in-progress", "🔨", if(status == "open", "⚪", "✅")))',
        'views:', '  - type: table', '    name: All Active Tasks', '    groupBy:', '      property: status',
        '      direction: ASC', '    order:', '      - formula.status_icon', '      - file.name',
        '      - status', '      - owner', '      - project', '      - priority', '      - blocked_by', '      - formula.age',
        '  - type: cards', '    name: Task Board', '    groupBy:', '      property: status',
        '      direction: ASC', '    order:', '      - file.name', '      - owner', '      - project', '      - priority',
      ].join('\n'),
      'blocked.base': [
        'filters:', '  and:', '    - file.inFolder("tasks")', '    - status == "blocked"',
        'formulas:', '  days_blocked: (now() - file.ctime).days',
        'views:', '  - type: table', '    name: Blocked Tasks', '    order:',
        '      - file.name', '      - owner', '      - project', '      - blocked_by', '      - formula.days_blocked', '      - priority',
      ].join('\n'),
      'by-project.base': [
        'filters:', '  and:', '    - file.inFolder("tasks")', '    - status != "done"',
        'formulas:', '  status_icon: if(status == "blocked", "🔴", if(status == "in-progress", "🔨", "⚪"))',
        'views:', '  - type: table', '    name: By Project', '    groupBy:', '      property: project',
        '      direction: ASC', '    order:', '      - formula.status_icon', '      - file.name',
        '      - status', '      - owner', '      - priority',
      ].join('\n'),
      'backlog.base': [
        'filters:', '  and:', '    - file.inFolder("backlog")',
        'views:', '  - type: table', '    name: Backlog', '    order:',
        '      - file.name', '      - source', '      - project', '      - file.ctime',
      ].join('\n'),
    };

    for (const [filename, content] of Object.entries(basesFiles)) {
      const filePath = path.join(vaultPath, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
      }
    }
  }

  /**
   * Load an existing vault
   */
  async load(): Promise<void> {
    if (!hasQmd()) {
      throw new QmdUnavailableError();
    }
    const vaultPath = this.config.path;
    const configPath = path.join(vaultPath, CONFIG_FILE);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Not a ClawVault: ${vaultPath} (missing ${CONFIG_FILE})`);
    }

    const meta: VaultMeta = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.config.name = meta.name;
    this.config.categories = meta.categories;
    this.config.qmdCollection = meta.qmdCollection;
    this.config.qmdRoot = meta.qmdRoot;

    if (!meta.qmdCollection || !meta.qmdRoot) {
      meta.qmdCollection = meta.qmdCollection || meta.name;
      meta.qmdRoot = meta.qmdRoot || this.config.path;
      fs.writeFileSync(configPath, JSON.stringify(meta, null, 2));
    }

    // Configure search engine with vault info
    this.applyQmdConfig(meta);

    // Index all documents (local cache)
    await this.reindex();
    this.initialized = true;
  }

  /**
   * Reindex all documents
   */
  async reindex(): Promise<number> {
    this.search.clear();
    
    const files = await glob('**/*.md', {
      cwd: this.config.path,
      ignore: ['**/node_modules/**', '**/.*', '**/ledger/archive/**']
    });

    for (const file of files) {
      const doc = await this.loadDocument(file);
      if (doc) {
        this.search.addDocument(doc);
      }
    }

    // Save index
    await this.saveIndex();
    await this.syncMemoryGraphIndex();

    return this.search.size;
  }

  /**
   * Load a document from disk
   */
  private async loadDocument(relativePath: string): Promise<Document | null> {
    try {
      const fullPath = path.join(this.config.path, relativePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);
      const stats = fs.statSync(fullPath);

      const parts = relativePath.split(path.sep);
      const category = parts.length > 1 ? parts[0] : 'root';
      const filename = path.basename(relativePath, '.md');

      return {
        id: relativePath.replace(/\.md$/, ''),
        path: fullPath,
        category,
        title: (frontmatter.title as string) || filename,
        content: body,
        frontmatter,
        links: extractWikiLinks(body),
        tags: extractTags(body),
        modified: stats.mtime
      };
    } catch (err) {
      console.error(`Error loading ${relativePath}:`, err);
      return null;
    }
  }

  /**
   * Store a new document
   */
  async store(options: StoreOptions): Promise<Document> {
    const { 
      category, 
      title, 
      content, 
      frontmatter = {}, 
      overwrite = false,
      qmdUpdate: triggerUpdate = false,
      qmdEmbed: triggerEmbed = false,
      qmdIndexName
    } = options;

    // Create filename from title
    const filename = this.slugify(title) + '.md';
    const relativePath = path.join(category, filename);
    const fullPath = path.join(this.config.path, relativePath);

    // Check if exists
    if (fs.existsSync(fullPath) && !overwrite) {
      throw new Error(`Document already exists: ${relativePath}. Use overwrite: true to replace.`);
    }

    // Ensure category directory exists
    const categoryPath = path.join(this.config.path, category);
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    // Build frontmatter with date
    const fm = {
      title,
      date: new Date().toISOString().split('T')[0],
      ...frontmatter
    };

    // Write file
    const fileContent = matter.stringify(content, fm);
    fs.writeFileSync(fullPath, fileContent);

    // Load and index the document
    const doc = await this.loadDocument(relativePath);
    if (doc) {
      this.search.addDocument(doc);
      await this.saveIndex();
      await this.syncMemoryGraphIndex();
    }

    // Trigger qmd reindex if requested
    if (triggerUpdate || triggerEmbed) {
      qmdUpdate(this.getQmdCollection(), qmdIndexName);
      if (triggerEmbed) {
        qmdEmbed(this.getQmdCollection(), qmdIndexName);
      }
    }

    return doc!;
  }

  /**
   * Quick store to inbox
   */
  async capture(note: string, title?: string): Promise<Document> {
    const autoTitle = title || `note-${Date.now()}`;
    return this.store({
      category: 'inbox',
      title: autoTitle,
      content: note
    });
  }

  /**
   * Search the vault (BM25 via qmd)
   */
  async find(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.search(query, options);
  }

  /**
   * Semantic/vector search (via qmd vsearch)
   */
  async vsearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.vsearch(query, options);
  }

  /**
   * Combined search with query expansion (via qmd query)
   */
  async query(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.query(query, options);
  }

  /**
   * Get a document by ID or path
   */
  async get(idOrPath: string): Promise<Document | null> {
    // Normalize path
    const normalized = idOrPath.replace(/\.md$/, '');
    const docs = this.search.getAllDocuments();
    return docs.find(d => d.id === normalized) || null;
  }

  /**
   * List documents in a category
   */
  async list(category?: string): Promise<Document[]> {
    const docs = this.search.getAllDocuments();
    if (category) {
      return docs.filter(d => d.category === category);
    }
    return docs;
  }

  /**
   * Sync vault to another location (for Obsidian on Windows, etc.)
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const { target, deleteOrphans = false, dryRun = false } = options;
    const result: SyncResult = {
      copied: [],
      deleted: [],
      unchanged: [],
      errors: []
    };

    // Get all source files
    const sourceFiles = await glob('**/*.md', {
      cwd: this.config.path,
      ignore: ['**/node_modules/**']
    });

    // Ensure target exists
    if (!dryRun && !fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    // Copy files
    for (const file of sourceFiles) {
      const sourcePath = path.join(this.config.path, file);
      const targetPath = path.join(target, file);

      try {
        const sourceStats = fs.statSync(sourcePath);
        let shouldCopy = true;

        if (fs.existsSync(targetPath)) {
          const targetStats = fs.statSync(targetPath);
          if (sourceStats.mtime <= targetStats.mtime) {
            result.unchanged.push(file);
            shouldCopy = false;
          }
        }

        if (shouldCopy) {
          if (!dryRun) {
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            fs.copyFileSync(sourcePath, targetPath);
          }
          result.copied.push(file);
        }
      } catch (err) {
        result.errors.push(`${file}: ${err}`);
      }
    }

    // Handle orphans in target
    if (deleteOrphans) {
      const targetFiles = await glob('**/*.md', { cwd: target });
      const sourceSet = new Set(sourceFiles);
      
      for (const file of targetFiles) {
        if (!sourceSet.has(file)) {
          if (!dryRun) {
            fs.unlinkSync(path.join(target, file));
          }
          result.deleted.push(file);
        }
      }
    }

    return result;
  }

  /**
   * Get vault statistics
   */
  async stats(): Promise<{
    documents: number;
    categories: { [key: string]: number };
    links: number;
    tags: string[];
  }> {
    const docs = this.search.getAllDocuments();
    const categories: { [key: string]: number } = {};
    const allTags = new Set<string>();
    let totalLinks = 0;

    for (const doc of docs) {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
      totalLinks += doc.links.length;
      doc.tags.forEach(t => allTags.add(t));
    }

    return {
      documents: docs.length,
      categories,
      links: totalLinks,
      tags: [...allTags].sort()
    };
  }

  /**
   * Get all categories
   */
  getCategories(): Category[] {
    return this.config.categories;
  }

  /**
   * Check if vault is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get vault path
   */
  getPath(): string {
    return this.config.path;
  }

  /**
   * Get vault name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get qmd collection name
   */
  getQmdCollection(): string {
    return this.config.qmdCollection || this.config.name;
  }

  /**
   * Get qmd collection root
   */
  getQmdRoot(): string {
    return this.config.qmdRoot || this.config.path;
  }

  // === Memory Type System ===

  /**
   * Store a memory with type classification
   * Automatically routes to correct category based on type
   */
  async remember(
    type: MemoryType,
    title: string,
    content: string,
    frontmatter: Record<string, unknown> = {}
  ): Promise<Document> {
    const category = TYPE_TO_CATEGORY[type];
    return this.store({
      category,
      title,
      content,
      frontmatter: { ...frontmatter, memoryType: type }
    });
  }

  // === Handoff System ===

  /**
   * Create a session handoff document
   * Call this before context death or long pauses
   */
  async createHandoff(handoff: Omit<HandoffDocument, 'created'>): Promise<Document> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].slice(0, 5).replace(':', '');
    
    const fullHandoff: HandoffDocument = {
      ...handoff,
      created: now.toISOString()
    };

    const content = this.formatHandoff(fullHandoff);
    
    // Filter out undefined values to avoid yaml dump errors
    const frontmatter: Record<string, unknown> = {
      type: 'handoff',
      workingOn: handoff.workingOn,
      blocked: handoff.blocked,
      nextSteps: handoff.nextSteps
    };
    if (handoff.sessionKey) frontmatter.sessionKey = handoff.sessionKey;
    if (handoff.feeling) frontmatter.feeling = handoff.feeling;
    if (handoff.decisions) frontmatter.decisions = handoff.decisions;
    if (handoff.openQuestions) frontmatter.openQuestions = handoff.openQuestions;
    
    return this.store({
      category: 'handoffs',
      title: `handoff-${dateStr}-${timeStr}`,
      content,
      frontmatter
    });
  }

  /**
   * Format handoff as readable markdown
   */
  private formatHandoff(h: HandoffDocument): string {
    let md = `# Session Handoff\n\n`;
    md += `**Created:** ${h.created}\n`;
    if (h.sessionKey) md += `**Session:** ${h.sessionKey}\n`;
    if (h.feeling) md += `**Feeling:** ${h.feeling}\n`;
    md += `\n`;
    
    md += `## Working On\n`;
    h.workingOn.forEach(w => md += `- ${w}\n`);
    md += `\n`;
    
    md += `## Blocked\n`;
    if (h.blocked.length === 0) md += `- Nothing currently blocked\n`;
    else h.blocked.forEach(b => md += `- ${b}\n`);
    md += `\n`;
    
    md += `## Next Steps\n`;
    h.nextSteps.forEach(n => md += `- ${n}\n`);
    
    if (h.decisions && h.decisions.length > 0) {
      md += `\n## Decisions Made\n`;
      h.decisions.forEach(d => md += `- ${d}\n`);
    }
    
    if (h.openQuestions && h.openQuestions.length > 0) {
      md += `\n## Open Questions\n`;
      h.openQuestions.forEach(q => md += `- ${q}\n`);
    }
    
    return md;
  }

  // === Session Recap (Bootstrap Hook) ===

  /**
   * Generate a session recap - who I was
   * Call this on bootstrap to restore context
   */
  async generateRecap(options: { handoffLimit?: number; brief?: boolean } = {}): Promise<SessionRecap> {
    const { handoffLimit = 3, brief = false } = options;
    
    // Get recent handoffs
    const handoffDocs = await this.list('handoffs');
    const recentHandoffs = handoffDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, handoffLimit)
      .map(doc => this.parseHandoff(doc));
    
    // Get active projects
    const projectDocs = await this.list('projects');
    const activeProjects = projectDocs
      .filter(d => d.frontmatter.status !== 'completed' && d.frontmatter.status !== 'archived')
      .map(d => d.title);
    
    // Get pending commitments
    const commitmentDocs = await this.list('commitments');
    const pendingCommitments = commitmentDocs
      .filter(d => d.frontmatter.status !== 'done')
      .map(d => d.title);
    
    // Get recent decisions (new!)
    const decisionDocs = await this.list('decisions');
    const recentDecisions = decisionDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, brief ? 3 : 5)
      .map(d => d.title);
    
    // Get recent lessons
    const lessonDocs = await this.list('lessons');
    const recentLessons = lessonDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, brief ? 3 : 5)
      .map(d => d.title);
    
    // Get key relationships (skip in brief mode)
    let keyRelationships: string[] = [];
    if (!brief) {
      const peopleDocs = await this.list('people');
      keyRelationships = peopleDocs
        .filter(d => d.frontmatter.importance === 'high' || d.frontmatter.role)
        .map(d => `${d.title}${d.frontmatter.role ? ` (${d.frontmatter.role})` : ''}`);
    }
    
    // Derive emotional arc from recent handoffs
    const feelings = recentHandoffs
      .map(h => h.feeling)
      .filter(Boolean);
    const emotionalArc = feelings.length > 0 ? feelings.join(' → ') : undefined;
    
    return {
      generated: new Date().toISOString(),
      recentHandoffs,
      activeProjects,
      pendingCommitments,
      recentDecisions,
      recentLessons,
      keyRelationships,
      emotionalArc
    };
  }

  /**
   * Format recap as readable markdown for injection
   */
  formatRecap(recap: SessionRecap, options: { brief?: boolean } = {}): string {
    const { brief = false } = options;
    
    let md = `# Who I Was\n\n`;
    md += `*Generated: ${recap.generated}*\n\n`;
    
    if (recap.emotionalArc) {
      md += `**Emotional arc:** ${recap.emotionalArc}\n\n`;
    }
    
    if (recap.recentHandoffs.length > 0) {
      md += `## Recent Sessions\n`;
      for (const h of recap.recentHandoffs) {
        if (brief) {
          // Compact format for brief mode
          md += `- **${h.created.split('T')[0]}:** ${h.workingOn.slice(0, 2).join(', ')}`;
          if (h.nextSteps.length > 0) md += ` → ${h.nextSteps[0]}`;
          md += `\n`;
        } else {
          md += `\n### ${h.created.split('T')[0]}\n`;
          md += `**Working on:** ${h.workingOn.join(', ')}\n`;
          if (h.blocked.length > 0) md += `**Blocked:** ${h.blocked.join(', ')}\n`;
          md += `**Next:** ${h.nextSteps.join(', ')}\n`;
        }
      }
      md += `\n`;
    }
    
    if (recap.activeProjects.length > 0) {
      md += `## Active Projects\n`;
      recap.activeProjects.forEach(p => md += `- ${p}\n`);
      md += `\n`;
    }
    
    if (recap.pendingCommitments.length > 0) {
      md += `## Pending Commitments\n`;
      recap.pendingCommitments.forEach(c => md += `- ${c}\n`);
      md += `\n`;
    }
    
    if (recap.recentDecisions && recap.recentDecisions.length > 0) {
      md += `## Recent Decisions\n`;
      recap.recentDecisions.forEach(d => md += `- ${d}\n`);
      md += `\n`;
    }
    
    if (recap.recentLessons.length > 0) {
      md += `## Recent Lessons\n`;
      recap.recentLessons.forEach(l => md += `- ${l}\n`);
      md += `\n`;
    }
    
    if (!brief && recap.keyRelationships.length > 0) {
      md += `## Key People\n`;
      recap.keyRelationships.forEach(r => md += `- ${r}\n`);
    }
    
    return md;
  }

  /**
   * Parse a handoff document back into structured form
   */
  private parseHandoff(doc: Document): HandoffDocument {
    return {
      created: doc.frontmatter.date as string || doc.modified.toISOString(),
      sessionKey: doc.frontmatter.sessionKey as string,
      workingOn: (doc.frontmatter.workingOn as string[]) || [],
      blocked: (doc.frontmatter.blocked as string[]) || [],
      nextSteps: (doc.frontmatter.nextSteps as string[]) || [],
      decisions: doc.frontmatter.decisions as string[] | undefined,
      openQuestions: doc.frontmatter.openQuestions as string[] | undefined,
      feeling: doc.frontmatter.feeling as string
    };
  }

  // === Private helpers ===

  private applyQmdConfig(meta?: VaultMeta): void {
    const collection = meta?.qmdCollection || this.config.qmdCollection || this.config.name;
    const root = meta?.qmdRoot || this.config.qmdRoot || this.config.path;

    this.config.qmdCollection = collection;
    this.config.qmdRoot = root;

    this.search.setVaultPath(this.config.path);
    this.search.setCollection(collection);
    this.search.setCollectionRoot(root);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.config.path, INDEX_FILE);
    const data = this.search.export();
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));

    // Update config
    const configPath = path.join(this.config.path, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const meta: VaultMeta = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      meta.lastUpdated = new Date().toISOString();
      meta.documentCount = this.search.size;
      fs.writeFileSync(configPath, JSON.stringify(meta, null, 2));
    }
  }

  private async createTemplates(): Promise<void> {
    const templatesPath = path.join(this.config.path, 'templates');
    if (!fs.existsSync(templatesPath)) {
      fs.mkdirSync(templatesPath, { recursive: true });
    }

    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(moduleDir, '../templates'),
      path.resolve(moduleDir, '../../templates')
    ];
    const builtinDir = candidates.find(dir => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
    if (!builtinDir) return;

    for (const entry of fs.readdirSync(builtinDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      if (entry.name === 'daily.md') continue;
      const sourcePath = path.join(builtinDir, entry.name);
      const targetPath = path.join(templatesPath, entry.name);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  private async createWelcomeNote(): Promise<void> {
    // Only create if inbox category exists
    if (!this.config.categories.includes('inbox')) return;
    const inboxPath = path.join(this.config.path, 'inbox', 'welcome.md');
    if (fs.existsSync(inboxPath)) return;
    const now = new Date().toISOString().split('T')[0];
    const content = `---
title: "Welcome to ${this.config.name}"
date: ${now}
type: fact
tags: [welcome, getting-started]
---

# Welcome to ${this.config.name}

Your vault is ready. Here's what you can do:

## Quick Start

- **Capture a thought:** \`clawvault capture "your note here"\`
- **Store structured memory:** \`clawvault store --category decisions --title "My Choice" --content "..."\`
- **Search your vault:** \`clawvault search "query"\`
- **See your knowledge graph:** \`clawvault graph\`
- **Get context for a topic:** \`clawvault context "topic"\`

## Vault Structure

Your vault organizes memories by type — decisions, lessons, people, projects, and more.
Each category is a folder. Each memory is a markdown file with frontmatter.

## Observational Memory

When connected to an AI agent (like OpenClaw), your vault can automatically observe
conversations and extract important memories — decisions, lessons, commitments — without
manual effort.

## Wiki-Links

Use \`[[double brackets]]\` to link between notes. Your memory graph tracks these
connections, building a knowledge network that grows with you.

---

*Delete this file anytime. It's just here to say hello.*
`;
    fs.writeFileSync(inboxPath, content);
  }

  private async syncMemoryGraphIndex(options: { forceFull?: boolean } = {}): Promise<void> {
    try {
      await buildOrUpdateMemoryGraphIndex(this.config.path, options);
    } catch {
      // Graph index sync is best-effort and should never block core vault operations.
    }
  }

  private generateReadme(): string {
    const coreCategories = this.config.categories.filter(c => !['templates', 'tasks', 'backlog'].includes(c));
    const workCategories = this.config.categories.filter(c => ['tasks', 'backlog'].includes(c));
    return `# ${this.config.name}

An elephant never forgets.

## Structure

### Memory Categories
${coreCategories.map(c => `- \`${c}/\` — ${this.getCategoryDescription(c)}`).join('\n')}

### Work Tracking
${workCategories.map(c => `- \`${c}/\` — ${this.getCategoryDescription(c)}`).join('\n')}

### Observational Memory
- \`ledger/raw/\` — Raw session transcripts (source of truth)
- \`ledger/observations/\` — Compressed observations with importance scores
- \`ledger/reflections/\` — Weekly reflection summaries

## Quick Reference

\`\`\`bash
# Capture a thought
clawvault capture "important insight about X"

# Store structured memory
clawvault store --category decisions --title "Choice" --content "We chose X because..."

# Search
clawvault search "query"
clawvault vsearch "semantic query"    # vector search

# Knowledge graph
clawvault graph                       # vault stats
clawvault context "topic"             # graph-aware context retrieval

# Session lifecycle
clawvault checkpoint --working-on "task"
clawvault sleep "what I did" --next "what's next"
clawvault wake                        # restore context on startup
\`\`\`

---

*Managed by [ClawVault](https://clawvault.dev)*
`;
  }

  private getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      // Memory type categories (Benthic's taxonomy)
      facts: 'Raw information, data points, things that are true',
      feelings: 'Emotional states, reactions, energy levels',
      decisions: 'Choices made with context and reasoning',
      rules: 'Injectable operational constraints, guardrails, and runbooks',
      lessons: 'What I learned, insights, patterns observed',
      commitments: 'Promises, goals, obligations to fulfill',
      preferences: 'Likes, dislikes, how I want things',
      people: 'Relationships, one file per person',
      projects: 'Active work, ventures, ongoing efforts',
      // System categories
      handoffs: 'Session bridges — what I was doing, what comes next',
      transcripts: 'Session summaries and logs',
      goals: 'Long-term and short-term objectives',
      patterns: 'Recurring behaviors (→ lessons)',
      inbox: 'Quick capture → process later',
      templates: 'Templates for each document type',
      agents: 'Other agents — capabilities, trust levels, coordination notes',
      research: 'Deep dives, analysis, reference material',
      tasks: 'Active work items with status and context',
      backlog: 'Future work — ideas and tasks not yet started'
    };
    return descriptions[category] || category;
  }
}

/**
 * Find and open the nearest vault (walks up directory tree)
 */
export async function findVault(startPath: string = process.cwd()): Promise<ClawVault | null> {
  let current = path.resolve(startPath);
  
  while (current !== path.dirname(current)) {
    const configPath = path.join(current, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const vault = new ClawVault(current);
      await vault.load();
      return vault;
    }
    current = path.dirname(current);
  }
  
  return null;
}

/**
 * Create a new vault
 */
export async function createVault(vaultPath: string, options: Partial<VaultConfig> = {}, initFlags?: { skipBases?: boolean; skipTasks?: boolean; skipGraph?: boolean }): Promise<ClawVault> {
  const vault = new ClawVault(vaultPath);
  await vault.init(options, initFlags);
  return vault;
}

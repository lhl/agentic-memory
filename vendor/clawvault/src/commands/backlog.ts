/**
 * Backlog command for ClawVault
 * Manages backlog add/list/promote operations
 */

/** Normalize a date value (Date object, ISO string, or bare date) to YYYY-MM-DD */
function toDateStr(val: unknown): string {
  if (!val) return 'unknown';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  if (s.includes('T')) return s.split('T')[0];
  return s;
}

import {
  createBacklogItem,
  listBacklogItems,
  promoteBacklogItem,
  type BacklogItem,
  type BacklogFilterOptions,
  type TaskPriority,
  type Task
} from '../lib/task-utils.js';

export interface BacklogAddOptions {
  source?: string;
  project?: string;
  content?: string;
  tags?: string[];
}

export interface BacklogListOptions {
  project?: string;
  json?: boolean;
}

export interface BacklogPromoteOptions {
  owner?: string;
  priority?: TaskPriority;
  due?: string;
}

/**
 * Add a new backlog item
 */
export function backlogAdd(vaultPath: string, title: string, options: BacklogAddOptions = {}): BacklogItem {
  return createBacklogItem(vaultPath, title, {
    source: options.source,
    project: options.project,
    content: options.content,
    tags: options.tags
  });
}

/**
 * List backlog items with optional filters
 */
export function backlogList(vaultPath: string, options: BacklogListOptions = {}): BacklogItem[] {
  const filters: BacklogFilterOptions = {};
  
  if (options.project) filters.project = options.project;

  return listBacklogItems(vaultPath, filters);
}

/**
 * Promote a backlog item to a task
 */
export function backlogPromote(vaultPath: string, slug: string, options: BacklogPromoteOptions = {}): Task {
  return promoteBacklogItem(vaultPath, slug, {
    owner: options.owner,
    priority: options.priority,
    due: options.due
  });
}

/**
 * Format backlog list for terminal display
 */
export function formatBacklogList(items: BacklogItem[]): string {
  if (items.length === 0) {
    return 'No backlog items found.\n';
  }

  // Calculate column widths
  const headers = ['SOURCE', 'PROJECT', 'CREATED', 'TITLE'];
  const widths = [12, 16, 12, 40];

  // Build header row
  let output = headers.map((h, i) => h.padEnd(widths[i])).join('  ') + '\n';

  // Build item rows
  for (const item of items) {
    const source = item.frontmatter.source || '-';
    const project = item.frontmatter.project || '-';
    const created = toDateStr(item.frontmatter.created);
    const title = item.title.length > widths[3] 
      ? item.title.slice(0, widths[3] - 3) + '...'
      : item.title;

    const row = [
      source.padEnd(widths[0]),
      project.padEnd(widths[1]),
      created.padEnd(widths[2]),
      title
    ];

    output += row.join('  ') + '\n';
  }

  return output;
}

/**
 * Format backlog item details for display
 */
export function formatBacklogDetails(item: BacklogItem): string {
  let output = '';
  
  output += `# ${item.title}\n`;
  output += '-'.repeat(40) + '\n';
  
  if (item.frontmatter.source) {
    output += `Source: ${item.frontmatter.source}\n`;
  }
  if (item.frontmatter.project) {
    output += `Project: ${item.frontmatter.project}\n`;
  }
  if (item.frontmatter.tags && item.frontmatter.tags.length > 0) {
    output += `Tags: ${item.frontmatter.tags.join(', ')}\n`;
  }
  
  output += `Created: ${item.frontmatter.created}\n`;
  output += `File: ${item.path}\n`;
  output += '-'.repeat(40) + '\n';
  
  // Show content (without the title line)
  const contentWithoutTitle = item.content.replace(/^#\s+.+\n/, '').trim();
  if (contentWithoutTitle) {
    output += '\n' + contentWithoutTitle + '\n';
  }

  return output;
}

/**
 * Backlog command handler for CLI
 * Note: The CLI uses "clawvault backlog <title>" as shorthand for add
 */
export async function backlogCommand(
  vaultPath: string,
  action: 'add' | 'list' | 'promote',
  args: {
    title?: string;
    slug?: string;
    options?: BacklogAddOptions & BacklogListOptions & BacklogPromoteOptions;
  }
): Promise<void> {
  const options = args.options || {};

  switch (action) {
    case 'add': {
      if (!args.title) {
        throw new Error('Title is required for backlog add');
      }
      const item = backlogAdd(vaultPath, args.title, options);
      console.log(`✓ Added to backlog: ${item.slug}`);
      console.log(`  Path: ${item.path}`);
      break;
    }

    case 'list': {
      const items = backlogList(vaultPath, options);
      if (options.json) {
        console.log(JSON.stringify(items, null, 2));
      } else {
        console.log(formatBacklogList(items));
      }
      break;
    }

    case 'promote': {
      if (!args.slug) {
        throw new Error('Backlog item slug is required for promote');
      }
      const task = backlogPromote(vaultPath, args.slug, options);
      console.log(`✓ Promoted to task: ${task.slug}`);
      console.log(`  Path: ${task.path}`);
      break;
    }

    default:
      throw new Error(`Unknown backlog action: ${action}`);
  }
}

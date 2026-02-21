/**
 * Task utilities for ClawVault task tracking
 * Handles task and backlog file read/write/query operations
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import {
  appendTransition,
  buildTransitionEvent,
  countBlockedTransitions,
  isRegression,
} from './transition-ledger.js';
import {
  loadSchemaTemplateDefinition,
  renderDocumentFromTemplate,
} from './primitive-templates.js';

// Task status types
export type TaskStatus = 'open' | 'in-progress' | 'blocked' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// Task frontmatter interface
export interface TaskFrontmatter {
  status: TaskStatus;
  source?: string;
  created: string;
  updated: string;
  owner?: string;
  project?: string;
  priority?: TaskPriority;
  blocked_by?: string;
  completed?: string;
  escalation?: boolean;
  confidence?: number;
  reason?: string;
  due?: string;
  tags?: string[];
  description?: string;
  estimate?: string;
  parent?: string;
  depends_on?: string[];
}

// Full task interface
export interface Task {
  slug: string;
  title: string;
  content: string;
  frontmatter: TaskFrontmatter;
  path: string;
}

// Backlog frontmatter interface
export interface BacklogFrontmatter {
  source?: string;
  project?: string;
  created: string;
  lastSeen?: string;
  tags?: string[];
}

// Full backlog item interface
export interface BacklogItem {
  slug: string;
  title: string;
  content: string;
  frontmatter: BacklogFrontmatter;
  path: string;
}

// Task filter options
export interface TaskFilterOptions {
  status?: TaskStatus;
  owner?: string;
  project?: string;
  priority?: TaskPriority;
  due?: boolean;
  tag?: string;
  overdue?: boolean;
}

// Backlog filter options
export interface BacklogFilterOptions {
  project?: string;
  source?: string;
}

export interface TaskTransitionOptions {
  skipTransition?: boolean;
  confidence?: number;
  reason?: string | null;
}

type CreateTaskOptions = {
  source?: string;
  owner?: string;
  project?: string;
  priority?: TaskPriority;
  due?: string;
  content?: string;
  tags?: string[];
  description?: string;
  estimate?: string;
  parent?: string;
  depends_on?: string[];
};

/**
 * Slugify a title for use as filename
 * Deterministic: same title = same slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Get the tasks directory path
 */
export function getTasksDir(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), 'tasks');
}

/**
 * Get the backlog directory path
 */
export function getBacklogDir(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), 'backlog');
}

/**
 * Ensure the tasks directory exists
 */
export function ensureTasksDir(vaultPath: string): void {
  const tasksDir = getTasksDir(vaultPath);
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
}

/**
 * Ensure the backlog directory exists
 */
export function ensureBacklogDir(vaultPath: string): void {
  const backlogDir = getBacklogDir(vaultPath);
  if (!fs.existsSync(backlogDir)) {
    fs.mkdirSync(backlogDir, { recursive: true });
  }
}

/**
 * Get task file path from slug
 */
export function getTaskPath(vaultPath: string, slug: string): string {
  return path.join(getTasksDir(vaultPath), `${slug}.md`);
}

/**
 * Get backlog file path from slug
 */
export function getBacklogPath(vaultPath: string, slug: string): string {
  return path.join(getBacklogDir(vaultPath), `${slug}.md`);
}

/**
 * Extract title from markdown content (first H1 heading)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function parseDueDate(value?: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return timestamp;
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function buildTaskFrontmatterFallback(now: string, options: CreateTaskOptions): TaskFrontmatter {
  const frontmatter: TaskFrontmatter = {
    status: 'open',
    created: now,
    updated: now
  };

  if (options.source) frontmatter.source = options.source;
  if (options.owner) frontmatter.owner = options.owner;
  if (options.project) frontmatter.project = options.project;
  if (options.priority) frontmatter.priority = options.priority;
  if (options.due) frontmatter.due = options.due;
  if (options.tags && options.tags.length > 0) frontmatter.tags = options.tags;
  if (options.description) frontmatter.description = options.description;
  if (options.estimate) frontmatter.estimate = options.estimate;
  if (options.parent) frontmatter.parent = options.parent;
  if (options.depends_on && options.depends_on.length > 0) frontmatter.depends_on = options.depends_on;

  return frontmatter;
}

function buildTaskContentFallback(title: string, options: CreateTaskOptions): string {
  let content = `# ${title}\n`;

  const links: string[] = [];
  if (options.owner) links.push(`[[${options.owner}]]`);
  if (options.project) links.push(`[[${options.project}]]`);
  if (links.length > 0) {
    content += `\n${links.join(' | ')}\n`;
  }

  if (options.content) {
    content += `\n${options.content}\n`;
  }

  return content;
}

function buildTaskTemplateOverrides(options: CreateTaskOptions): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  if (options.source) overrides.source = options.source;
  if (options.owner) overrides.owner = options.owner;
  if (options.project) overrides.project = options.project;
  if (options.priority) overrides.priority = options.priority;
  if (options.due) overrides.due = options.due;
  if (options.tags && options.tags.length > 0) overrides.tags = options.tags;
  if (options.description) overrides.description = options.description;
  if (options.estimate) overrides.estimate = options.estimate;
  if (options.parent) overrides.parent = options.parent;
  if (options.depends_on && options.depends_on.length > 0) overrides.depends_on = options.depends_on;

  return overrides;
}

function buildTaskTemplateVariables(
  title: string,
  slug: string,
  options: CreateTaskOptions
): Record<string, unknown> {
  const ownerLink = options.owner ? `[[${options.owner}]]` : '';
  const projectLink = options.project ? `[[${options.project}]]` : '';
  const linksLine = [ownerLink, projectLink].filter(Boolean).join(' | ');

  return {
    title,
    slug,
    source: options.source ?? '',
    owner: options.owner ?? '',
    project: options.project ?? '',
    priority: options.priority ?? '',
    due: options.due ?? '',
    tags_csv: (options.tags || []).join(', '),
    description: options.description ?? '',
    estimate: options.estimate ?? '',
    parent: options.parent ?? '',
    depends_on_csv: (options.depends_on || []).join(', '),
    content: options.content ?? '',
    owner_link: ownerLink,
    project_link: projectLink,
    links_line: linksLine
  };
}

const VALID_TASK_STATUSES = new Set<TaskStatus>([
  'open',
  'in-progress',
  'blocked',
  'done'
]);

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && VALID_TASK_STATUSES.has(value as TaskStatus);
}

function persistTaskFrontmatter(task: Task, frontmatter: TaskFrontmatter): void {
  fs.writeFileSync(task.path, matter.stringify(task.content, frontmatter));
}

function resolveStatusTransition(
  previousStatus: unknown,
  nextStatus: unknown
): { fromStatus: TaskStatus; toStatus: TaskStatus } | null {
  if (!isTaskStatus(previousStatus) || !isTaskStatus(nextStatus)) {
    return null;
  }
  if (previousStatus === nextStatus) {
    return null;
  }
  return { fromStatus: previousStatus, toStatus: nextStatus };
}

interface LogStatusTransitionParams {
  vaultPath: string;
  task: Task;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  frontmatter: TaskFrontmatter;
  options: Pick<TaskTransitionOptions, 'confidence' | 'reason'>;
}

function logStatusTransition({
  vaultPath,
  task,
  fromStatus,
  toStatus,
  frontmatter,
  options,
}: LogStatusTransitionParams): TaskFrontmatter {
  const normalizedReason = typeof options.reason === 'string' ? options.reason.trim() : '';
  const reason = normalizedReason || (isRegression(fromStatus, toStatus) ? `regression: ${fromStatus} -> ${toStatus}` : undefined);

  const event = buildTransitionEvent(task.slug, fromStatus, toStatus, {
    confidence: options.confidence,
    reason,
  });
  try {
    appendTransition(vaultPath, event);
  } catch {
    // Transition logging is best-effort; task updates should still succeed.
    return frontmatter;
  }

  if (toStatus !== 'blocked' || frontmatter.escalation) {
    return frontmatter;
  }

  // Escalate tasks that have been blocked 3+ times.
  let blockedCount = 0;
  try {
    blockedCount = countBlockedTransitions(vaultPath, task.slug);
  } catch {
    return frontmatter;
  }

  if (blockedCount < 3) {
    return frontmatter;
  }

  const escalatedFrontmatter: TaskFrontmatter = {
    ...frontmatter,
    escalation: true,
  };

  try {
    persistTaskFrontmatter(task, escalatedFrontmatter);
    return escalatedFrontmatter;
  } catch {
    return frontmatter;
  }
}

/**
 * Read a task file and parse it
 */
export function readTask(vaultPath: string, slug: string): Task | null {
  const taskPath = getTaskPath(vaultPath, slug);
  if (!fs.existsSync(taskPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(taskPath, 'utf-8');
    const { data, content } = matter(raw);
    const title = extractTitle(content) || slug;

    return {
      slug,
      title,
      content,
      frontmatter: data as TaskFrontmatter,
      path: taskPath
    };
  } catch {
    return null;
  }
}

/**
 * Read a backlog item file and parse it
 */
export function readBacklogItem(vaultPath: string, slug: string): BacklogItem | null {
  const backlogPath = getBacklogPath(vaultPath, slug);
  if (!fs.existsSync(backlogPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(backlogPath, 'utf-8');
    const { data, content } = matter(raw);
    const title = extractTitle(content) || slug;

    return {
      slug,
      title,
      content,
      frontmatter: data as BacklogFrontmatter,
      path: backlogPath
    };
  } catch {
    return null;
  }
}

/**
 * List all tasks in the vault
 */
export function listTasks(vaultPath: string, filters?: TaskFilterOptions): Task[] {
  const tasksDir = getTasksDir(vaultPath);
  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  const tasks: Task[] = [];
  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  const today = startOfToday();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const slug = entry.name.replace(/\.md$/, '');
    const task = readTask(vaultPath, slug);
    if (!task) continue;

    // Apply filters
    if (filters) {
      if (filters.status && task.frontmatter.status !== filters.status) continue;
      if (filters.owner && task.frontmatter.owner !== filters.owner) continue;
      if (filters.project && task.frontmatter.project !== filters.project) continue;
      if (filters.priority && task.frontmatter.priority !== filters.priority) continue;
      if (filters.due && !task.frontmatter.due) continue;
      if (filters.tag) {
        const tags = task.frontmatter.tags || [];
        const hasTag = tags.some(tag => tag.toLowerCase() === filters.tag?.toLowerCase());
        if (!hasTag) continue;
      }
      if (filters.overdue) {
        const dueTime = parseDueDate(task.frontmatter.due);
        if (task.frontmatter.status === 'done' || dueTime === null || dueTime >= today) continue;
      }
    }

    tasks.push(task);
  }

  // Sort by priority (critical > high > medium > low), then by created date
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  if (filters?.due || filters?.overdue) {
    return tasks.sort((a, b) => {
      const aDue = parseDueDate(a.frontmatter.due);
      const bDue = parseDueDate(b.frontmatter.due);
      if (aDue !== null && bDue !== null && aDue !== bDue) {
        return aDue - bDue;
      }
      if (aDue !== null && bDue === null) return -1;
      if (aDue === null && bDue !== null) return 1;
      return new Date(b.frontmatter.created).getTime() - new Date(a.frontmatter.created).getTime();
    });
  }

  return tasks.sort((a, b) => {
    const aPriority = priorityOrder[a.frontmatter.priority || 'low'];
    const bPriority = priorityOrder[b.frontmatter.priority || 'low'];
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return new Date(b.frontmatter.created).getTime() - new Date(a.frontmatter.created).getTime();
  });
}

/**
 * List all backlog items in the vault
 */
export function listBacklogItems(vaultPath: string, filters?: BacklogFilterOptions): BacklogItem[] {
  const backlogDir = getBacklogDir(vaultPath);
  if (!fs.existsSync(backlogDir)) {
    return [];
  }

  const items: BacklogItem[] = [];
  const entries = fs.readdirSync(backlogDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const slug = entry.name.replace(/\.md$/, '');
    const item = readBacklogItem(vaultPath, slug);
    if (!item) continue;

    // Apply filters
    if (filters) {
      if (filters.project && item.frontmatter.project !== filters.project) continue;
      if (filters.source && item.frontmatter.source !== filters.source) continue;
    }

    items.push(item);
  }

  // Sort by created date (newest first)
  return items.sort((a, b) => {
    return new Date(b.frontmatter.created).getTime() - new Date(a.frontmatter.created).getTime();
  });
}

/**
 * Create a new task
 */
export function createTask(
  vaultPath: string,
  title: string,
  options: CreateTaskOptions = {}
): Task {
  ensureTasksDir(vaultPath);
  const slug = slugify(title);
  const taskPath = getTaskPath(vaultPath, slug);

  if (fs.existsSync(taskPath)) {
    throw new Error(`Task already exists: ${slug}`);
  }

  const now = new Date().toISOString();
  const template = loadSchemaTemplateDefinition('task', {
    vaultPath: path.resolve(vaultPath),
  });

  let frontmatter: TaskFrontmatter;
  let content: string;

  if (template) {
    const rendered = renderDocumentFromTemplate(template, {
      title,
      type: 'task',
      now: new Date(now),
      variables: buildTaskTemplateVariables(title, slug, options),
      overrides: buildTaskTemplateOverrides(options),
      frontmatter: { pruneEmpty: true },
    });
    const templateFrontmatter = rendered.frontmatter as unknown as TaskFrontmatter;
    frontmatter = {
      ...templateFrontmatter,
      status: isTaskStatus(templateFrontmatter.status) ? templateFrontmatter.status : 'open',
      created: typeof templateFrontmatter.created === 'string' && templateFrontmatter.created
        ? templateFrontmatter.created
        : now,
      updated: typeof templateFrontmatter.updated === 'string' && templateFrontmatter.updated
        ? templateFrontmatter.updated
        : now,
    };
    content = rendered.content;
  } else {
    frontmatter = buildTaskFrontmatterFallback(now, options);
    content = buildTaskContentFallback(title, options);
  }

  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(taskPath, fileContent);

  return {
    slug,
    title,
    content,
    frontmatter,
    path: taskPath
  };
}

/**
 * Update an existing task
 */
export function updateTask(
  vaultPath: string,
  slug: string,
  updates: {
    status?: TaskStatus;
    source?: string | null;
    owner?: string | null;
    project?: string | null;
    priority?: TaskPriority | null;
    blocked_by?: string | null;
    due?: string | null;
    tags?: string[] | null;
    completed?: string | null;
    escalation?: boolean | null;
    confidence?: number | null;
    reason?: string | null;
    description?: string | null;
    estimate?: string | null;
    parent?: string | null;
    depends_on?: string[] | null;
  },
  options: TaskTransitionOptions = {}
): Task {
  const task = readTask(vaultPath, slug);
  if (!task) {
    throw new Error(`Task not found: ${slug}`);
  }

  if (updates.status !== undefined && !isTaskStatus(updates.status)) {
    throw new Error(`Invalid task status: ${String(updates.status)}`);
  }

  const previousStatus = task.frontmatter.status;

  const now = new Date().toISOString();
  let newFrontmatter: TaskFrontmatter = {
    ...task.frontmatter,
    updated: now
  };

  if (updates.status !== undefined) {
    newFrontmatter.status = updates.status;
    if (updates.status === 'done' && !newFrontmatter.completed) {
      newFrontmatter.completed = now;
    }
    if (updates.status !== 'done') {
      delete newFrontmatter.completed;
    }
  }

  if (updates.source !== undefined) {
    if (updates.source === null || updates.source.trim() === '') {
      delete newFrontmatter.source;
    } else {
      newFrontmatter.source = updates.source;
    }
  }

  if (updates.owner !== undefined) {
    if (updates.owner === null || updates.owner.trim() === '') {
      delete newFrontmatter.owner;
    } else {
      newFrontmatter.owner = updates.owner;
    }
  }

  if (updates.project !== undefined) {
    if (updates.project === null || updates.project.trim() === '') {
      delete newFrontmatter.project;
    } else {
      newFrontmatter.project = updates.project;
    }
  }

  if (updates.priority !== undefined) {
    if (updates.priority === null) {
      delete newFrontmatter.priority;
    } else {
      newFrontmatter.priority = updates.priority;
    }
  }

  if (updates.due !== undefined) {
    if (updates.due === null || updates.due.trim() === '') {
      delete newFrontmatter.due;
    } else {
      newFrontmatter.due = updates.due;
    }
  }

  if (updates.tags !== undefined) {
    if (updates.tags === null) {
      delete newFrontmatter.tags;
    } else {
      const normalizedTags = updates.tags.map(tag => tag.trim()).filter(Boolean);
      if (normalizedTags.length === 0) {
        delete newFrontmatter.tags;
      } else {
        newFrontmatter.tags = normalizedTags;
      }
    }
  }

  if (updates.completed !== undefined) {
    if (updates.completed === null || updates.completed.trim() === '') {
      delete newFrontmatter.completed;
    } else {
      newFrontmatter.completed = updates.completed;
    }
  }

  if (updates.escalation !== undefined) {
    if (updates.escalation === null) {
      delete newFrontmatter.escalation;
    } else {
      newFrontmatter.escalation = updates.escalation;
    }
  }

  if (updates.confidence !== undefined) {
    if (updates.confidence === null) {
      delete newFrontmatter.confidence;
    } else {
      newFrontmatter.confidence = updates.confidence;
    }
  }

  if (updates.reason !== undefined) {
    if (updates.reason === null || updates.reason.trim() === '') {
      delete newFrontmatter.reason;
    } else {
      newFrontmatter.reason = updates.reason;
    }
  }

  if (updates.description !== undefined) {
    if (updates.description === null || updates.description.trim() === '') {
      delete newFrontmatter.description;
    } else {
      newFrontmatter.description = updates.description;
    }
  }

  if (updates.estimate !== undefined) {
    if (updates.estimate === null || updates.estimate.trim() === '') {
      delete newFrontmatter.estimate;
    } else {
      newFrontmatter.estimate = updates.estimate;
    }
  }

  if (updates.parent !== undefined) {
    if (updates.parent === null || updates.parent.trim() === '') {
      delete newFrontmatter.parent;
    } else {
      newFrontmatter.parent = updates.parent;
    }
  }

  if (updates.depends_on !== undefined) {
    if (updates.depends_on === null) {
      delete newFrontmatter.depends_on;
    } else {
      const normalizedDeps = updates.depends_on.map(dep => dep.trim()).filter(Boolean);
      if (normalizedDeps.length === 0) {
        delete newFrontmatter.depends_on;
      } else {
        newFrontmatter.depends_on = normalizedDeps;
      }
    }
  }

  // Handle blocked_by specially - clear if status is not blocked
  if (updates.blocked_by !== undefined) {
    if (updates.blocked_by === null || updates.blocked_by.trim() === '') {
      delete newFrontmatter.blocked_by;
    } else {
      newFrontmatter.blocked_by = updates.blocked_by;
    }
  } else if (updates.status !== undefined && updates.status !== 'blocked') {
    delete newFrontmatter.blocked_by;
  }

  persistTaskFrontmatter(task, newFrontmatter);

  const transition = options.skipTransition
    ? null
    : resolveStatusTransition(previousStatus, newFrontmatter.status);

  if (transition) {
    const confidence = options.confidence ?? (typeof updates.confidence === 'number' ? updates.confidence : undefined);
    const reason = options.reason ?? updates.reason ?? null;
    newFrontmatter = logStatusTransition({
      vaultPath,
      task,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      frontmatter: newFrontmatter,
      options: {
        confidence,
        reason,
      },
    });
  }

  return {
    ...task,
    frontmatter: newFrontmatter
  };
}

/**
 * Mark a task as done
 */
export function completeTask(vaultPath: string, slug: string, options: TaskTransitionOptions = {}): Task {
  return updateTask(vaultPath, slug, { status: 'done' }, options);
}

/**
 * Create a new backlog item
 */
export function createBacklogItem(
  vaultPath: string,
  title: string,
  options: {
    source?: string;
    project?: string;
    content?: string;
    tags?: string[];
  } = {}
): BacklogItem {
  ensureBacklogDir(vaultPath);
  const slug = slugify(title);
  const backlogPath = getBacklogPath(vaultPath, slug);

  if (fs.existsSync(backlogPath)) {
    throw new Error(`Backlog item already exists: ${slug}`);
  }

  const now = new Date().toISOString();
  const frontmatter: BacklogFrontmatter = {
    created: now
  };

  if (options.source) frontmatter.source = options.source;
  if (options.project) frontmatter.project = options.project;
  if (options.tags && options.tags.length > 0) frontmatter.tags = options.tags;

  // Build content with wiki-links
  let content = `# ${title}\n`;
  
  const links: string[] = [];
  if (options.source) links.push(`[[${options.source}]]`);
  if (options.project) links.push(`[[${options.project}]]`);
  if (links.length > 0) {
    content += `\n${links.join(' | ')}\n`;
  }

  if (options.content) {
    content += `\n${options.content}\n`;
  }

  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(backlogPath, fileContent);

  return {
    slug,
    title,
    content,
    frontmatter,
    path: backlogPath
  };
}

/**
 * Update an existing backlog item frontmatter.
 */
export function updateBacklogItem(
  vaultPath: string,
  slug: string,
  updates: {
    source?: string;
    project?: string;
    tags?: string[];
    lastSeen?: string;
  }
): BacklogItem {
  const backlogItem = readBacklogItem(vaultPath, slug);
  if (!backlogItem) {
    throw new Error(`Backlog item not found: ${slug}`);
  }

  const newFrontmatter: BacklogFrontmatter = {
    ...backlogItem.frontmatter
  };

  if (updates.source !== undefined) newFrontmatter.source = updates.source;
  if (updates.project !== undefined) newFrontmatter.project = updates.project;
  if (updates.tags !== undefined) newFrontmatter.tags = updates.tags;
  if (updates.lastSeen !== undefined) newFrontmatter.lastSeen = updates.lastSeen;

  const fileContent = matter.stringify(backlogItem.content, newFrontmatter);
  fs.writeFileSync(backlogItem.path, fileContent);

  return {
    ...backlogItem,
    frontmatter: newFrontmatter
  };
}

/**
 * Promote a backlog item to a task
 */
export function promoteBacklogItem(
  vaultPath: string,
  slug: string,
  options: {
    owner?: string;
    priority?: TaskPriority;
    due?: string;
  } = {}
): Task {
  const backlogItem = readBacklogItem(vaultPath, slug);
  if (!backlogItem) {
    throw new Error(`Backlog item not found: ${slug}`);
  }

  // Create the task
  const task = createTask(vaultPath, backlogItem.title, {
    owner: options.owner,
    project: backlogItem.frontmatter.project,
    priority: options.priority,
    due: options.due,
    content: backlogItem.content.replace(/^#\s+.+\n/, '').trim(), // Remove title from content
    tags: backlogItem.frontmatter.tags
  });

  // Delete the backlog item
  fs.unlinkSync(backlogItem.path);

  return task;
}

/**
 * Get blocked tasks
 */
export function getBlockedTasks(vaultPath: string, project?: string): Task[] {
  const filters: TaskFilterOptions = { status: 'blocked' };
  if (project) filters.project = project;
  return listTasks(vaultPath, filters);
}

/**
 * Get active tasks (open or in-progress)
 */
export function getActiveTasks(vaultPath: string, filters?: Omit<TaskFilterOptions, 'status'>): Task[] {
  const allTasks = listTasks(vaultPath, filters);
  return allTasks.filter(t => t.frontmatter.status === 'open' || t.frontmatter.status === 'in-progress');
}

/**
 * List subtasks for a parent task slug.
 */
export function listSubtasks(vaultPath: string, parentSlug: string): Task[] {
  return listTasks(vaultPath).filter(task => task.frontmatter.parent === parentSlug);
}

/**
 * List tasks that depend on a given task slug.
 */
export function listDependentTasks(vaultPath: string, dependencySlug: string): Task[] {
  return listTasks(vaultPath).filter(task => {
    const dependencies = task.frontmatter.depends_on || [];
    return dependencies.includes(dependencySlug);
  });
}

/**
 * Get recently completed tasks
 */
export function getRecentlyCompletedTasks(vaultPath: string, limit: number = 10): Task[] {
  const allTasks = listTasks(vaultPath, { status: 'done' });
  return allTasks
    .filter(t => t.frontmatter.completed)
    .sort((a, b) => {
      const aCompleted = new Date(a.frontmatter.completed || 0).getTime();
      const bCompleted = new Date(b.frontmatter.completed || 0).getTime();
      return bCompleted - aCompleted;
    })
    .slice(0, limit);
}

/**
 * Format task status icon
 */
export function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case 'in-progress':
      return '●';
    case 'blocked':
      return '■';
    case 'open':
      return '○';
    case 'done':
      return '✓';
    default:
      return '○';
  }
}

/**
 * Format task status display name
 */
export function getStatusDisplay(status: TaskStatus): string {
  switch (status) {
    case 'in-progress':
      return 'active';
    case 'blocked':
      return 'blocked';
    case 'open':
      return 'open';
    case 'done':
      return 'done';
    default:
      return status;
  }
}

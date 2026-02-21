/**
 * Task command for ClawVault
 * Manages task add/list/update/done/show operations
 */

import {
  createTask,
  listTasks,
  readTask,
  updateTask,
  completeTask,
  getStatusIcon,
  getStatusDisplay,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type TaskFilterOptions
} from '../lib/task-utils.js';
import {
  queryTransitions,
  formatTransitionsTable,
} from '../lib/transition-ledger.js';

export interface TaskAddOptions {
  owner?: string;
  project?: string;
  priority?: TaskPriority;
  due?: string;
  content?: string;
  tags?: string[];
  description?: string;
  estimate?: string;
  parent?: string;
  dependsOn?: string[];
}

export interface TaskListOptions {
  status?: TaskStatus;
  owner?: string;
  project?: string;
  priority?: TaskPriority;
  due?: boolean;
  tag?: string;
  overdue?: boolean;
  json?: boolean;
}

export interface TaskUpdateOptions {
  status?: TaskStatus;
  owner?: string | null;
  project?: string | null;
  priority?: TaskPriority | null;
  blockedBy?: string | null;
  due?: string | null;
  tags?: string[] | null;
  description?: string | null;
  estimate?: string | null;
  parent?: string | null;
  dependsOn?: string[] | null;
  confidence?: number;
  reason?: string | null;
}

export interface TaskTransitionsOptions {
  agent?: string;
  failed?: boolean;
  json?: boolean;
}

export interface TaskShowOptions {
  json?: boolean;
}

/**
 * Add a new task
 */
export function taskAdd(vaultPath: string, title: string, options: TaskAddOptions = {}): Task {
  return createTask(vaultPath, title, {
    owner: options.owner,
    project: options.project,
    priority: options.priority,
    due: options.due,
    content: options.content,
    tags: options.tags,
    description: options.description,
    estimate: options.estimate,
    parent: options.parent,
    depends_on: options.dependsOn
  });
}

/**
 * List tasks with optional filters
 */
export function taskList(vaultPath: string, options: TaskListOptions = {}): Task[] {
  const filters: TaskFilterOptions = {};
  
  if (options.status) filters.status = options.status;
  if (options.owner) filters.owner = options.owner;
  if (options.project) filters.project = options.project;
  if (options.priority) filters.priority = options.priority;
  if (options.due) filters.due = true;
  if (options.tag) filters.tag = options.tag;
  if (options.overdue) filters.overdue = true;

  const listed = listTasks(vaultPath, filters);

  // By default, show open and in-progress tasks (not done).
  // Overdue list already excludes done tasks in listTasks.
  if (!options.status && !options.overdue) {
    return listed.filter(t => t.frontmatter.status !== 'done');
  }

  return listed;
}

/**
 * Update a task
 */
export function taskUpdate(vaultPath: string, slug: string, options: TaskUpdateOptions): Task {
  return updateTask(vaultPath, slug, {
    status: options.status,
    owner: options.owner,
    project: options.project,
    priority: options.priority,
    blocked_by: options.blockedBy,
    due: options.due,
    tags: options.tags,
    description: options.description,
    estimate: options.estimate,
    parent: options.parent,
    depends_on: options.dependsOn,
    confidence: options.confidence,
    reason: options.reason
  });
}

/**
 * Mark a task as done
 */
export function taskDone(vaultPath: string, slug: string, options: { confidence?: number; reason?: string } = {}): Task {
  return completeTask(vaultPath, slug, {
    confidence: options.confidence,
    reason: options.reason ?? undefined,
  });
}

/**
 * Query task transitions
 */
export function taskTransitions(
  vaultPath: string,
  taskId?: string,
  options: TaskTransitionsOptions = {}
): string {
  const events = queryTransitions(vaultPath, {
    taskId,
    agent: options.agent,
    failed: options.failed,
  });

  if (options.json) {
    return JSON.stringify(events, null, 2);
  }
  return formatTransitionsTable(events);
}

/**
 * Show task details
 */
export function taskShow(vaultPath: string, slug: string): Task | null {
  return readTask(vaultPath, slug);
}

/**
 * Format task list as terminal table
 */
export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) {
    return 'No tasks found.\n';
  }

  const headers = ['STATUS', 'OWNER', 'PRIORITY', 'PROJECT', 'META', 'TITLE'];
  const widths = [10, 12, 8, 14, 64, 32];
  const truncate = (value: string, width: number): string => {
    if (value.length <= width) return value;
    return value.slice(0, width - 3) + '...';
  };

  // Build header row
  let output = headers.map((h, i) => h.padEnd(widths[i])).join('  ') + '\n';

  // Build task rows
  for (const task of tasks) {
    const icon = getStatusIcon(task.frontmatter.status);
    const statusDisplay = getStatusDisplay(task.frontmatter.status);
    const status = `${icon} ${statusDisplay}`;
    const owner = task.frontmatter.owner || '-';
    const priority = task.frontmatter.priority || 'low';
    const project = task.frontmatter.project || '-';
    const metaParts: string[] = [];
    if (task.frontmatter.due) metaParts.push(`due:${task.frontmatter.due.split('T')[0]}`);
    if (task.frontmatter.tags?.length) metaParts.push(task.frontmatter.tags.map(tag => `#${tag}`).join(','));
    if (task.frontmatter.parent) metaParts.push(`parent:${task.frontmatter.parent}`);
    if (task.frontmatter.depends_on?.length) {
      metaParts.push(`deps:${task.frontmatter.depends_on.join('|')}`);
    }
    const meta = metaParts.length > 0 ? metaParts.join(' ') : '-';
    const title = truncate(task.title, widths[5]);

    const row = [
      status.padEnd(widths[0]),
      owner.padEnd(widths[1]),
      priority.padEnd(widths[2]),
      project.padEnd(widths[3]),
      truncate(meta, widths[4]).padEnd(widths[4]),
      title
    ];

    output += row.join('  ') + '\n';
  }

  return output;
}

/**
 * Format task details for display
 */
export function formatTaskDetails(task: Task): string {
  let output = '';
  
  output += `# ${task.title}\n`;
  output += '-'.repeat(40) + '\n';
  output += `Status: ${getStatusIcon(task.frontmatter.status)} ${getStatusDisplay(task.frontmatter.status)}\n`;
  
  if (task.frontmatter.owner) {
    output += `Owner: ${task.frontmatter.owner}\n`;
  }
  if (task.frontmatter.project) {
    output += `Project: ${task.frontmatter.project}\n`;
  }
  if (task.frontmatter.priority) {
    output += `Priority: ${task.frontmatter.priority}\n`;
  }
  if (task.frontmatter.description) {
    output += `Description: ${task.frontmatter.description}\n`;
  }
  if (task.frontmatter.estimate) {
    output += `Estimate: ${task.frontmatter.estimate}\n`;
  }
  if (task.frontmatter.parent) {
    output += `Parent: ${task.frontmatter.parent}\n`;
  }
  if (task.frontmatter.depends_on && task.frontmatter.depends_on.length > 0) {
    output += `Depends on: ${task.frontmatter.depends_on.join(', ')}\n`;
  }
  if (task.frontmatter.due) {
    output += `Due: ${task.frontmatter.due}\n`;
  }
  if (task.frontmatter.blocked_by) {
    output += `Blocked by: ${task.frontmatter.blocked_by}\n`;
  }
  if (task.frontmatter.tags && task.frontmatter.tags.length > 0) {
    output += `Tags: ${task.frontmatter.tags.join(', ')}\n`;
  }
  if (task.frontmatter.escalation) {
    output += 'Escalation: true\n';
  }
  if (task.frontmatter.confidence !== undefined) {
    output += `Confidence: ${task.frontmatter.confidence}\n`;
  }
  if (task.frontmatter.reason) {
    output += `Reason: ${task.frontmatter.reason}\n`;
  }
  
  output += `Created: ${task.frontmatter.created}\n`;
  output += `Updated: ${task.frontmatter.updated}\n`;
  
  if (task.frontmatter.completed) {
    output += `Completed: ${task.frontmatter.completed}\n`;
  }
  
  output += `File: ${task.path}\n`;
  output += '-'.repeat(40) + '\n';
  
  // Show content (without the title line)
  const contentWithoutTitle = task.content.replace(/^#\s+.+\n/, '').trim();
  if (contentWithoutTitle) {
    output += '\n' + contentWithoutTitle + '\n';
  }

  return output;
}

/**
 * Task command handler for CLI
 */
export async function taskCommand(
  vaultPath: string,
  action: 'add' | 'list' | 'update' | 'done' | 'show' | 'transitions',
  args: {
    title?: string;
    slug?: string;
    options?: TaskAddOptions & TaskListOptions & TaskUpdateOptions & TaskShowOptions & TaskTransitionsOptions;
  }
): Promise<void> {
  const options = args.options || {};

  switch (action) {
    case 'add': {
      if (!args.title) {
        throw new Error('Title is required for task add');
      }
      const task = taskAdd(vaultPath, args.title, options);
      console.log(`✓ Created task: ${task.slug}`);
      console.log(`  Path: ${task.path}`);
      break;
    }

    case 'list': {
      const tasks = taskList(vaultPath, options);
      if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
      } else {
        console.log(formatTaskList(tasks));
      }
      break;
    }

    case 'update': {
      if (!args.slug) {
        throw new Error('Task slug is required for update');
      }
      const task = taskUpdate(vaultPath, args.slug, options);
      console.log(`✓ Updated task: ${task.slug}`);
      break;
    }

    case 'done': {
      if (!args.slug) {
        throw new Error('Task slug is required for done');
      }
      const task = taskDone(vaultPath, args.slug, {
        confidence: options.confidence,
        reason: options.reason ?? undefined,
      });
      console.log(`✓ Completed task: ${task.slug}`);
      break;
    }

    case 'transitions': {
      const output = taskTransitions(vaultPath, args.slug, {
        agent: (options as TaskTransitionsOptions).agent,
        failed: (options as TaskTransitionsOptions).failed,
        json: options.json,
      });
      console.log(output);
      break;
    }

    case 'show': {
      if (!args.slug) {
        throw new Error('Task slug is required for show');
      }
      const task = taskShow(vaultPath, args.slug);
      if (!task) {
        throw new Error(`Task not found: ${args.slug}`);
      }
      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(formatTaskDetails(task));
      }
      break;
    }

    default:
      throw new Error(`Unknown task action: ${action}`);
  }
}

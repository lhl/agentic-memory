/**
 * Blocked command for ClawVault
 * Quick view of blocked tasks
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
  getBlockedTasks,
  type Task
} from '../lib/task-utils.js';

export interface BlockedOptions {
  project?: string;
  json?: boolean;
  escalated?: boolean;
}

/**
 * Get blocked tasks
 */
export function blockedList(vaultPath: string, options: BlockedOptions = {}): Task[] {
  let tasks = getBlockedTasks(vaultPath, options.project);
  if (options.escalated) {
    tasks = tasks.filter(t => t.frontmatter.escalation === true);
  }
  return tasks;
}

/**
 * Format blocked tasks for terminal display
 */
export function formatBlockedList(tasks: Task[]): string {
  if (tasks.length === 0) {
    return 'No blocked tasks.\n';
  }

  let output = `BLOCKED TASKS (${tasks.length})\n\n`;

  for (const task of tasks) {
    const owner = task.frontmatter.owner || 'unassigned';
    const project = task.frontmatter.project || 'no project';
    const blockedBy = task.frontmatter.blocked_by || 'unknown';
    
    // Calculate "since" date from updated timestamp
    const updatedDate = toDateStr(task.frontmatter.updated);
    
    output += `■ ${task.title} (${owner}, ${project})\n`;
    output += `  Blocked by: ${blockedBy}\n`;
    output += `  Since: ${updatedDate}\n`;
    output += '\n';
  }

  return output;
}

/**
 * Blocked command handler for CLI
 */
export async function blockedCommand(
  vaultPath: string,
  options: BlockedOptions = {}
): Promise<void> {
  const tasks = blockedList(vaultPath, options);
  
  if (options.json) {
    console.log(JSON.stringify(tasks, null, 2));
  } else {
    console.log(formatBlockedList(tasks));
  }
}

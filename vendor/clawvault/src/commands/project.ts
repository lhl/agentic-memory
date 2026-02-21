/**
 * Project command for ClawVault
 * Manages project add/update/archive/list/show/tasks/board operations
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  archiveProject,
  createProject,
  getProjectActivity,
  getProjectTasks,
  listProjects,
  readProject,
  updateProject,
  type Project,
  type ProjectStatus
} from '../lib/project-utils.js';
import { formatTaskList, taskList } from './task.js';

export interface ProjectAddOptions {
  status?: ProjectStatus;
  owner?: string;
  team?: string[];
  client?: string;
  tags?: string[];
  description?: string;
  deadline?: string;
  repo?: string;
  url?: string;
  content?: string;
}

export interface ProjectUpdateOptions {
  status?: ProjectStatus;
  owner?: string | null;
  team?: string[] | null;
  client?: string | null;
  tags?: string[] | null;
  description?: string | null;
  deadline?: string | null;
  repo?: string | null;
  url?: string | null;
}

export interface ProjectArchiveOptions {
  reason?: string;
}

export interface ProjectListOptions {
  status?: ProjectStatus;
  owner?: string;
  client?: string;
  tag?: string;
  json?: boolean;
}

export interface ProjectShowOptions {
  json?: boolean;
}

export interface ProjectTasksOptions {
  json?: boolean;
}

export type ProjectBoardGroupBy = 'status' | 'owner' | 'client';

export interface ProjectBoardOptions {
  output?: string;
  groupBy?: ProjectBoardGroupBy | string;
  now?: Date;
}

export interface ProjectBoardLane {
  name: string;
  cards: string[];
}

export interface ProjectBoardResult {
  outputPath: string;
  groupBy: ProjectBoardGroupBy;
  markdown: string;
  lanes: ProjectBoardLane[];
  projectCount: number;
}

function toDateStr(value?: string): string {
  if (!value) return '-';
  return value.includes('T') ? value.split('T')[0] : value;
}

function toHashTag(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9/_-]/g, '');
}

function toMention(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '');
}

function normalizeBoardGroupBy(value?: string): ProjectBoardGroupBy {
  const normalized = String(value || 'status').trim().toLowerCase();
  if (normalized === 'status' || normalized === 'owner' || normalized === 'client') {
    return normalized;
  }
  throw new Error(`Unsupported project board group field: ${normalized}`);
}

function resolveBoardPath(vaultPath: string, output?: string): string {
  const resolvedVaultPath = path.resolve(vaultPath);
  if (!output) {
    return path.join(resolvedVaultPath, 'Projects-Board.md');
  }
  if (path.isAbsolute(output)) {
    return output;
  }
  return path.join(resolvedVaultPath, output);
}

function parseDeadlineTimestamp(project: Project): number {
  if (!project.frontmatter.deadline) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(project.frontmatter.deadline);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function sortProjectsForCards(projects: Project[]): Project[] {
  return [...projects].sort((left, right) => {
    const deadlineDiff = parseDeadlineTimestamp(left) - parseDeadlineTimestamp(right);
    if (deadlineDiff !== 0) return deadlineDiff;
    return new Date(right.frontmatter.updated).getTime() - new Date(left.frontmatter.updated).getTime();
  });
}

function laneNameForStatus(status: ProjectStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return 'Active';
  }
}

function laneNameForProject(project: Project, groupBy: ProjectBoardGroupBy): string {
  switch (groupBy) {
    case 'status':
      return laneNameForStatus(project.frontmatter.status);
    case 'owner':
      return project.frontmatter.owner?.trim() || 'Unassigned';
    case 'client':
      return project.frontmatter.client?.trim() || 'No Client';
    default:
      return laneNameForStatus(project.frontmatter.status);
  }
}

function defaultLaneOrder(groupBy: ProjectBoardGroupBy, projects: Project[]): string[] {
  if (groupBy === 'status') {
    return ['Active', 'Paused', 'Completed', 'Archived'];
  }

  const fallback = groupBy === 'owner' ? 'Unassigned' : 'No Client';
  const names = new Set<string>();
  for (const project of projects) {
    names.add(laneNameForProject(project, groupBy));
  }
  if (names.size === 0) {
    return [fallback];
  }
  const sorted = Array.from(names).sort((left, right) => left.localeCompare(right));
  if (sorted.includes(fallback)) {
    return [...sorted.filter((name) => name !== fallback), fallback];
  }
  return sorted;
}

function formatProjectCard(project: Project): string {
  const checkbox = project.frontmatter.status === 'completed' || project.frontmatter.status === 'archived' ? 'x' : ' ';
  const parts: string[] = [`[[projects/${project.slug}|${project.title}]]`];

  if (project.frontmatter.owner) {
    const mention = toMention(project.frontmatter.owner);
    if (mention) parts.push(`@${mention}`);
  }
  if (project.frontmatter.client) {
    const clientTag = toHashTag(project.frontmatter.client);
    if (clientTag) parts.push(`#client/${clientTag}`);
  }
  if (project.frontmatter.tags && project.frontmatter.tags.length > 0) {
    for (const tag of project.frontmatter.tags) {
      const normalizedTag = toHashTag(tag);
      if (normalizedTag) parts.push(`#${normalizedTag}`);
    }
  }
  if (project.frontmatter.deadline) {
    parts.push(`📅 ${toDateStr(project.frontmatter.deadline)}`);
  }
  if (project.frontmatter.description) {
    parts.push(`— ${project.frontmatter.description}`);
  }

  return `- [${checkbox}] ${parts.join(' ')}`;
}

export function buildProjectBoardLanes(projects: Project[], groupBy: ProjectBoardGroupBy): ProjectBoardLane[] {
  const laneOrder = defaultLaneOrder(groupBy, projects);
  const lanes = new Map<string, string[]>();

  for (const laneName of laneOrder) {
    lanes.set(laneName, []);
  }

  for (const project of sortProjectsForCards(projects)) {
    const laneName = laneNameForProject(project, groupBy);
    if (!lanes.has(laneName)) {
      lanes.set(laneName, []);
    }
    lanes.get(laneName)?.push(formatProjectCard(project));
  }

  return Array.from(lanes.entries()).map(([name, cards]) => ({ name, cards }));
}

export function generateProjectBoardMarkdown(
  projects: Project[],
  options: { groupBy?: ProjectBoardGroupBy | string; now?: Date } = {}
): string {
  const groupBy = normalizeBoardGroupBy(options.groupBy);
  const syncedAt = (options.now || new Date()).toISOString();
  const lanes = buildProjectBoardLanes(projects, groupBy);
  const sections = lanes
    .map((lane) => {
      const cardsBlock = lane.cards.length > 0 ? lane.cards.join('\n') : '';
      return `## ${lane.name}\n\n${cardsBlock}`.trimEnd();
    })
    .join('\n\n');

  return [
    '---',
    'kanban-plugin: basic',
    `clawvault-group-by: ${groupBy}`,
    `clawvault-last-sync: '${syncedAt}'`,
    '---',
    '',
    sections,
    '',
    '%% kanban:settings',
    '{"kanban-plugin":"basic","list-collapse":["Completed","Archived"],"show-checkboxes":true}',
    '%%',
    ''
  ].join('\n');
}

export function syncProjectBoard(vaultPath: string, options: ProjectBoardOptions = {}): ProjectBoardResult {
  const groupBy = normalizeBoardGroupBy(options.groupBy);
  const outputPath = resolveBoardPath(vaultPath, options.output);
  const projects = listProjects(vaultPath);
  const markdown = generateProjectBoardMarkdown(projects, { groupBy, now: options.now });
  fs.writeFileSync(outputPath, markdown);

  return {
    outputPath,
    groupBy,
    markdown,
    lanes: buildProjectBoardLanes(projects, groupBy),
    projectCount: projects.length
  };
}

export function projectAdd(vaultPath: string, title: string, options: ProjectAddOptions = {}): Project {
  return createProject(vaultPath, title, {
    status: options.status,
    owner: options.owner,
    team: options.team,
    client: options.client,
    tags: options.tags,
    description: options.description,
    deadline: options.deadline,
    repo: options.repo,
    url: options.url,
    content: options.content
  });
}

export function projectUpdate(vaultPath: string, slug: string, options: ProjectUpdateOptions): Project {
  return updateProject(vaultPath, slug, {
    status: options.status,
    owner: options.owner,
    team: options.team,
    client: options.client,
    tags: options.tags,
    description: options.description,
    deadline: options.deadline,
    repo: options.repo,
    url: options.url
  });
}

export function projectArchive(vaultPath: string, slug: string, options: ProjectArchiveOptions = {}): Project {
  return archiveProject(vaultPath, slug, options.reason);
}

export function projectList(vaultPath: string, options: ProjectListOptions = {}): Project[] {
  const projects = listProjects(vaultPath, {
    status: options.status,
    owner: options.owner,
    client: options.client,
    tag: options.tag
  });

  if (!options.status) {
    return projects.filter((project) => project.frontmatter.status !== 'archived');
  }
  return projects;
}

export function formatProjectList(projects: Project[]): string {
  if (projects.length === 0) {
    return 'No projects found.\n';
  }

  const headers = ['STATUS', 'OWNER', 'DEADLINE', 'TITLE'];
  const widths = [10, 12, 12, 40];
  const truncate = (value: string, width: number): string => {
    if (value.length <= width) return value;
    return value.slice(0, width - 3) + '...';
  };

  let output = headers.map((header, index) => header.padEnd(widths[index])).join('  ') + '\n';

  for (const project of projects) {
    const row = [
      project.frontmatter.status.padEnd(widths[0]),
      (project.frontmatter.owner || '-').padEnd(widths[1]),
      toDateStr(project.frontmatter.deadline).padEnd(widths[2]),
      truncate(project.title, widths[3])
    ];
    output += row.join('  ') + '\n';
  }

  return output;
}

function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '-';
  }
  return String(value);
}

function countTasksByStatus(projectSlug: string, vaultPath: string): {
  open: number;
  inProgress: number;
  done: number;
} {
  const tasks = getProjectTasks(vaultPath, projectSlug);
  return {
    open: tasks.filter((task) => task.frontmatter.status === 'open').length,
    inProgress: tasks.filter((task) => task.frontmatter.status === 'in-progress').length,
    done: tasks.filter((task) => task.frontmatter.status === 'done').length
  };
}

export function formatProjectDetails(
  vaultPath: string,
  project: Project,
  options: { activityLimit?: number } = {}
): string {
  const lines: string[] = [];
  const taskSummary = countTasksByStatus(project.slug, vaultPath);
  const activity = getProjectActivity(vaultPath, project.slug).slice(0, options.activityLimit ?? 5);

  lines.push(`# ${project.title}`);
  lines.push('-'.repeat(40));

  const orderedFields: Array<keyof Project['frontmatter']> = [
    'type',
    'status',
    'owner',
    'team',
    'client',
    'tags',
    'description',
    'started',
    'deadline',
    'repo',
    'url',
    'created',
    'updated',
    'completed',
    'reason'
  ];

  for (const field of orderedFields) {
    const value = project.frontmatter[field];
    if (value === undefined) continue;
    lines.push(`${field}: ${formatFieldValue(value)}`);
  }

  lines.push('');
  lines.push(`Linked tasks: ${taskSummary.open} open, ${taskSummary.inProgress} in-progress, ${taskSummary.done} done`);

  if (project.frontmatter.team && project.frontmatter.team.length > 0) {
    lines.push('Team members:');
    for (const member of project.frontmatter.team) {
      lines.push(`- ${member}`);
    }
  }

  lines.push('');
  lines.push('Recent activity:');
  if (activity.length === 0) {
    lines.push('- none');
  } else {
    for (const filePath of activity) {
      lines.push(`- ${path.basename(filePath)}`);
    }
  }

  return lines.join('\n');
}

export async function projectCommand(
  vaultPath: string,
  action: 'add' | 'update' | 'archive' | 'list' | 'show' | 'tasks' | 'board',
  args: {
    title?: string;
    slug?: string;
    options?: ProjectAddOptions &
      ProjectUpdateOptions &
      ProjectArchiveOptions &
      ProjectListOptions &
      ProjectShowOptions &
      ProjectTasksOptions &
      ProjectBoardOptions;
  }
): Promise<void> {
  const options = args.options || {};

  switch (action) {
    case 'add': {
      if (!args.title) {
        throw new Error('Title is required for project add');
      }
      const project = projectAdd(vaultPath, args.title, options);
      console.log(`✓ Created project: ${project.slug}`);
      console.log(`  Path: ${path.join(path.resolve(vaultPath), 'projects', `${project.slug}.md`)}`);
      break;
    }

    case 'update': {
      if (!args.slug) {
        throw new Error('Project slug is required for update');
      }
      const project = projectUpdate(vaultPath, args.slug, options);
      console.log(`✓ Updated project: ${project.slug}`);
      break;
    }

    case 'archive': {
      if (!args.slug) {
        throw new Error('Project slug is required for archive');
      }
      const project = projectArchive(vaultPath, args.slug, options);
      console.log(`✓ Archived project: ${project.slug}`);
      break;
    }

    case 'list': {
      const projects = projectList(vaultPath, options);
      if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
      } else {
        console.log(formatProjectList(projects));
      }
      break;
    }

    case 'show': {
      if (!args.slug) {
        throw new Error('Project slug is required for show');
      }
      const project = readProject(vaultPath, args.slug);
      if (!project) {
        throw new Error(`Project not found: ${args.slug}`);
      }
      const taskSummary = countTasksByStatus(project.slug, vaultPath);
      const recentActivity = getProjectActivity(vaultPath, project.slug).slice(0, 5);

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              project,
              taskSummary,
              team: project.frontmatter.team || [],
              recentActivity
            },
            null,
            2
          )
        );
      } else {
        console.log(formatProjectDetails(vaultPath, project, { activityLimit: 5 }));
      }
      break;
    }

    case 'tasks': {
      if (!args.slug) {
        throw new Error('Project slug is required for tasks');
      }
      const tasks = taskList(vaultPath, { project: args.slug });
      if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
      } else {
        console.log(formatTaskList(tasks));
      }
      break;
    }

    case 'board': {
      const result = syncProjectBoard(vaultPath, options);
      console.log(`✓ Synced project board: ${result.outputPath}`);
      console.log(`  Grouped by: ${result.groupBy}`);
      console.log(`  Projects included: ${result.projectCount}`);
      break;
    }

    default:
      throw new Error(`Unknown project action: ${action}`);
  }
}

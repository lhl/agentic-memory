/**
 * Project utilities for ClawVault project tracking
 * Handles project definition and activity file read/write/query operations
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { listTasks, slugify, type Task } from './task-utils.js';
import {
  loadSchemaTemplateDefinition,
  renderDocumentFromTemplate,
} from './primitive-templates.js';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ProjectFrontmatter {
  type: 'project';
  status: ProjectStatus;
  created: string;
  updated: string;
  owner?: string;
  team?: string[];
  client?: string;
  tags?: string[];
  description?: string;
  started?: string;
  deadline?: string;
  repo?: string;
  url?: string;
  completed?: string;
  reason?: string;
}

export interface Project {
  slug: string;
  title: string;
  content: string;
  frontmatter: ProjectFrontmatter;
}

export interface ProjectFilterOptions {
  status?: ProjectStatus;
  owner?: string;
  client?: string;
  tag?: string;
}

export interface CreateProjectOptions {
  status?: ProjectStatus;
  owner?: string;
  team?: string[];
  client?: string;
  tags?: string[];
  description?: string;
  started?: string;
  deadline?: string;
  repo?: string;
  url?: string;
  completed?: string;
  reason?: string;
  content?: string;
}

export interface UpdateProjectOptions {
  status?: ProjectStatus;
  owner?: string | null;
  team?: string[] | null;
  client?: string | null;
  tags?: string[] | null;
  description?: string | null;
  started?: string | null;
  deadline?: string | null;
  repo?: string | null;
  url?: string | null;
  completed?: string | null;
  reason?: string | null;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function isDateSlug(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(slug);
}

function normalizeStringArray(value: string[]): string[] {
  return value
    .map((item) => item.trim())
    .filter(Boolean);
}

function getProjectsDir(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), 'projects');
}

function ensureProjectsDir(vaultPath: string): void {
  const projectsDir = getProjectsDir(vaultPath);
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
}

function getProjectPath(vaultPath: string, slug: string): string {
  return path.join(getProjectsDir(vaultPath), `${slug}.md`);
}

function parseProjectDateValue(filePath: string): number {
  const filename = path.basename(filePath, '.md');
  if (/^\d{4}-\d{2}-\d{2}$/.test(filename)) {
    const dateTs = Date.parse(`${filename}T00:00:00.000Z`);
    if (!Number.isNaN(dateTs)) {
      return dateTs;
    }
  }
  return fs.statSync(filePath).mtime.getTime();
}

function parseSortableTimestamp(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  if (value === 'active' || value === 'paused' || value === 'completed' || value === 'archived') {
    return value;
  }
  return 'active';
}

function buildProjectFrontmatterFallback(now: string, options: CreateProjectOptions): ProjectFrontmatter {
  const frontmatter: ProjectFrontmatter = {
    type: 'project',
    status: options.status ?? 'active',
    created: now,
    updated: now
  };

  if (options.owner) frontmatter.owner = options.owner;
  if (options.team && options.team.length > 0) {
    const team = normalizeStringArray(options.team);
    if (team.length > 0) frontmatter.team = team;
  }
  if (options.client) frontmatter.client = options.client;
  if (options.tags && options.tags.length > 0) {
    const tags = normalizeStringArray(options.tags);
    if (tags.length > 0) frontmatter.tags = tags;
  }
  if (options.description) frontmatter.description = options.description;
  if (options.started) frontmatter.started = options.started;
  if (options.deadline) frontmatter.deadline = options.deadline;
  if (options.repo) frontmatter.repo = options.repo;
  if (options.url) frontmatter.url = options.url;
  if (options.completed) frontmatter.completed = options.completed;
  if (options.reason) frontmatter.reason = options.reason;

  return frontmatter;
}

function buildProjectContentFallback(title: string, options: CreateProjectOptions): string {
  let content = `# ${title}\n`;
  const wikiLinks = new Set<string>();
  if (options.owner) wikiLinks.add(options.owner);
  if (options.client) wikiLinks.add(options.client);
  for (const member of options.team || []) {
    const trimmed = member.trim();
    if (trimmed) wikiLinks.add(trimmed);
  }
  if (wikiLinks.size > 0) {
    content += `\n${Array.from(wikiLinks).map((link) => `[[${link}]]`).join(' | ')}\n`;
  }

  if (options.content) {
    content += `\n${options.content}\n`;
  }

  return content;
}

function buildProjectTemplateOverrides(options: CreateProjectOptions): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  if (options.status) overrides.status = options.status;
  if (options.owner) overrides.owner = options.owner;
  if (options.team && options.team.length > 0) {
    const team = normalizeStringArray(options.team);
    if (team.length > 0) overrides.team = team;
  }
  if (options.client) overrides.client = options.client;
  if (options.tags && options.tags.length > 0) {
    const tags = normalizeStringArray(options.tags);
    if (tags.length > 0) overrides.tags = tags;
  }
  if (options.description) overrides.description = options.description;
  if (options.started) overrides.started = options.started;
  if (options.deadline) overrides.deadline = options.deadline;
  if (options.repo) overrides.repo = options.repo;
  if (options.url) overrides.url = options.url;
  if (options.completed) overrides.completed = options.completed;
  if (options.reason) overrides.reason = options.reason;
  return overrides;
}

function buildProjectTemplateVariables(
  title: string,
  slug: string,
  options: CreateProjectOptions
): Record<string, unknown> {
  const ownerLink = options.owner ? `[[${options.owner}]]` : '';
  const clientLink = options.client ? `[[${options.client}]]` : '';
  const teamLinks = (options.team || [])
    .map((member) => member.trim())
    .filter(Boolean)
    .map((member) => `[[${member}]]`);
  const linksLine = [ownerLink, clientLink, ...teamLinks].filter(Boolean).join(' | ');

  return {
    title,
    slug,
    status: options.status ?? '',
    owner: options.owner ?? '',
    client: options.client ?? '',
    team_csv: (options.team || []).join(', '),
    tags_csv: (options.tags || []).join(', '),
    description: options.description ?? '',
    started: options.started ?? '',
    deadline: options.deadline ?? '',
    repo: options.repo ?? '',
    url: options.url ?? '',
    completed: options.completed ?? '',
    reason: options.reason ?? '',
    content: options.content ?? '',
    owner_link: ownerLink,
    client_link: clientLink,
    team_links_line: teamLinks.join(' | '),
    links_line: linksLine
  };
}

function normalizeProjectFrontmatter(frontmatter: ProjectFrontmatter): ProjectFrontmatter {
  const normalizedCreated = typeof frontmatter.created === 'string' && frontmatter.created
    ? frontmatter.created
    : new Date(0).toISOString();
  const normalizedUpdated = typeof frontmatter.updated === 'string' && frontmatter.updated
    ? frontmatter.updated
    : normalizedCreated;

  const normalized: ProjectFrontmatter = {
    ...frontmatter,
    type: 'project',
    status: normalizeProjectStatus(frontmatter.status),
    created: normalizedCreated,
    updated: normalizedUpdated
  };

  if (normalized.team) {
    const team = normalizeStringArray(normalized.team);
    if (team.length === 0) {
      delete normalized.team;
    } else {
      normalized.team = team;
    }
  }

  if (normalized.tags) {
    const tags = normalizeStringArray(normalized.tags);
    if (tags.length === 0) {
      delete normalized.tags;
    } else {
      normalized.tags = tags;
    }
  }

  return normalized;
}

/**
 * List all project definition files in the vault.
 * Includes only root-level projects/*.md files with type: project frontmatter.
 */
export function listProjects(vaultPath: string, filters?: ProjectFilterOptions): Project[] {
  const projectsDir = getProjectsDir(vaultPath);
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const projects: Project[] = [];
  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const slug = entry.name.replace(/\.md$/, '');
    if (isDateSlug(slug)) {
      continue;
    }

    const project = readProject(vaultPath, slug);
    if (!project) continue;

    if (filters) {
      if (filters.status && project.frontmatter.status !== filters.status) continue;
      if (filters.owner && project.frontmatter.owner !== filters.owner) continue;
      if (filters.client && project.frontmatter.client !== filters.client) continue;
      if (filters.tag) {
        const tags = project.frontmatter.tags || [];
        const hasTag = tags.some((tag) => tag.toLowerCase() === filters.tag?.toLowerCase());
        if (!hasTag) continue;
      }
    }

    projects.push(project);
  }

  return projects.sort((left, right) => {
    const rightTime = parseSortableTimestamp(right.frontmatter.updated || right.frontmatter.created);
    const leftTime = parseSortableTimestamp(left.frontmatter.updated || left.frontmatter.created);
    return rightTime - leftTime;
  });
}

/**
 * Read a project definition file from projects/{slug}.md
 */
export function readProject(vaultPath: string, slug: string): Project | null {
  if (!slug || isDateSlug(slug) || slug.includes(path.sep)) {
    return null;
  }

  const projectPath = getProjectPath(vaultPath, slug);
  if (!fs.existsSync(projectPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(projectPath, 'utf-8');
    const { data, content } = matter(raw);
    if (data.type !== 'project') {
      return null;
    }

    const frontmatter = normalizeProjectFrontmatter(data as ProjectFrontmatter);
    const title = extractTitle(content) || slug;

    return {
      slug,
      title,
      content,
      frontmatter
    };
  } catch {
    return null;
  }
}

/**
 * Create a new project definition at projects/{slug}.md
 */
export function createProject(
  vaultPath: string,
  title: string,
  options: CreateProjectOptions = {}
): Project {
  ensureProjectsDir(vaultPath);
  const slug = slugify(title);
  const projectPath = getProjectPath(vaultPath, slug);

  if (fs.existsSync(projectPath)) {
    throw new Error(`Project already exists: ${slug}`);
  }

  const now = new Date().toISOString();
  const template = loadSchemaTemplateDefinition('project', {
    vaultPath: path.resolve(vaultPath),
  });

  let frontmatter: ProjectFrontmatter;
  let content: string;

  if (template) {
    const rendered = renderDocumentFromTemplate(template, {
      title,
      type: 'project',
      now: new Date(now),
      variables: buildProjectTemplateVariables(title, slug, options),
      overrides: buildProjectTemplateOverrides(options),
      frontmatter: { pruneEmpty: true },
    });
    const templateFrontmatter = rendered.frontmatter as unknown as ProjectFrontmatter;
    frontmatter = normalizeProjectFrontmatter({
      ...templateFrontmatter,
      type: 'project',
      status: normalizeProjectStatus(templateFrontmatter.status),
      created: typeof templateFrontmatter.created === 'string' && templateFrontmatter.created
        ? templateFrontmatter.created
        : now,
      updated: typeof templateFrontmatter.updated === 'string' && templateFrontmatter.updated
        ? templateFrontmatter.updated
        : now,
    });
    content = rendered.content;
  } else {
    frontmatter = buildProjectFrontmatterFallback(now, options);
    content = buildProjectContentFallback(title, options);
  }

  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(projectPath, fileContent);
  return {
    slug,
    title,
    content,
    frontmatter
  };
}

/**
 * Update an existing project's frontmatter
 */
export function updateProject(vaultPath: string, slug: string, updates: UpdateProjectOptions): Project {
  const project = readProject(vaultPath, slug);
  if (!project) {
    throw new Error(`Project not found: ${slug}`);
  }

  const now = new Date().toISOString();
  const nextFrontmatter: ProjectFrontmatter = {
    ...project.frontmatter,
    type: 'project',
    updated: now
  };

  if (updates.status !== undefined) {
    nextFrontmatter.status = updates.status;
    if (updates.status === 'completed' && !updates.completed && !nextFrontmatter.completed) {
      nextFrontmatter.completed = now;
    }
  }

  if (updates.owner !== undefined) {
    if (updates.owner === null || updates.owner.trim() === '') {
      delete nextFrontmatter.owner;
    } else {
      nextFrontmatter.owner = updates.owner;
    }
  }

  if (updates.team !== undefined) {
    if (updates.team === null) {
      delete nextFrontmatter.team;
    } else {
      const team = normalizeStringArray(updates.team);
      if (team.length === 0) {
        delete nextFrontmatter.team;
      } else {
        nextFrontmatter.team = team;
      }
    }
  }

  if (updates.client !== undefined) {
    if (updates.client === null || updates.client.trim() === '') {
      delete nextFrontmatter.client;
    } else {
      nextFrontmatter.client = updates.client;
    }
  }

  if (updates.tags !== undefined) {
    if (updates.tags === null) {
      delete nextFrontmatter.tags;
    } else {
      const tags = normalizeStringArray(updates.tags);
      if (tags.length === 0) {
        delete nextFrontmatter.tags;
      } else {
        nextFrontmatter.tags = tags;
      }
    }
  }

  if (updates.description !== undefined) {
    if (updates.description === null || updates.description.trim() === '') {
      delete nextFrontmatter.description;
    } else {
      nextFrontmatter.description = updates.description;
    }
  }

  if (updates.started !== undefined) {
    if (updates.started === null || updates.started.trim() === '') {
      delete nextFrontmatter.started;
    } else {
      nextFrontmatter.started = updates.started;
    }
  }

  if (updates.deadline !== undefined) {
    if (updates.deadline === null || updates.deadline.trim() === '') {
      delete nextFrontmatter.deadline;
    } else {
      nextFrontmatter.deadline = updates.deadline;
    }
  }

  if (updates.repo !== undefined) {
    if (updates.repo === null || updates.repo.trim() === '') {
      delete nextFrontmatter.repo;
    } else {
      nextFrontmatter.repo = updates.repo;
    }
  }

  if (updates.url !== undefined) {
    if (updates.url === null || updates.url.trim() === '') {
      delete nextFrontmatter.url;
    } else {
      nextFrontmatter.url = updates.url;
    }
  }

  if (updates.completed !== undefined) {
    if (updates.completed === null || updates.completed.trim() === '') {
      delete nextFrontmatter.completed;
    } else {
      nextFrontmatter.completed = updates.completed;
    }
  }

  if (updates.reason !== undefined) {
    if (updates.reason === null || updates.reason.trim() === '') {
      delete nextFrontmatter.reason;
    } else {
      nextFrontmatter.reason = updates.reason;
    }
  }

  const projectPath = getProjectPath(vaultPath, slug);
  fs.writeFileSync(projectPath, matter.stringify(project.content, nextFrontmatter));

  return {
    ...project,
    frontmatter: nextFrontmatter
  };
}

/**
 * Archive a project with optional reason and completion date
 */
export function archiveProject(vaultPath: string, slug: string, reason?: string): Project {
  return updateProject(vaultPath, slug, {
    status: 'archived',
    reason: reason ?? null,
    completed: new Date().toISOString()
  });
}

/**
 * List tasks linked to a project by task.frontmatter.project === project slug
 */
export function getProjectTasks(vaultPath: string, slug: string): Task[] {
  return listTasks(vaultPath, { project: slug });
}

/**
 * List files in projects/{slug}/ sorted by date (newest first)
 */
export function getProjectActivity(vaultPath: string, slug: string): string[] {
  const projectActivityDir = path.join(getProjectsDir(vaultPath), slug);
  if (!fs.existsSync(projectActivityDir) || !fs.statSync(projectActivityDir).isDirectory()) {
    return [];
  }

  const entries = fs.readdirSync(projectActivityDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(projectActivityDir, entry.name));

  return files.sort((left, right) => parseProjectDateValue(right) - parseProjectDateValue(left));
}

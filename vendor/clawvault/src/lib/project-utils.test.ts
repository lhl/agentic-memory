import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createTask, updateTask } from './task-utils.js';
import {
  archiveProject,
  createProject,
  getProjectActivity,
  getProjectTasks,
  listProjects,
  readProject,
  updateProject
} from './project-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-project-utils-'));
}

describe('project-utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates project with all fields', () => {
    const project = createProject(tempDir, 'Apollo Launch', {
      status: 'paused',
      owner: 'alice',
      team: ['alice', 'bob'],
      client: 'Acme Corp',
      tags: ['platform', 'release'],
      description: 'Launch customer-facing alpha',
      started: '2026-02-01',
      deadline: '2026-03-01',
      repo: 'https://github.com/acme/apollo',
      url: 'https://apollo.acme.dev',
      completed: '2026-03-02',
      reason: 'Accepted by client',
      content: 'Rollout sequence and release notes.'
    });

    const projectPath = path.join(tempDir, 'projects', `${project.slug}.md`);
    const raw = fs.readFileSync(projectPath, 'utf-8');

    expect(project.slug).toBe('apollo-launch');
    expect(project.frontmatter.type).toBe('project');
    expect(project.frontmatter.status).toBe('paused');
    expect(project.frontmatter.owner).toBe('alice');
    expect(project.frontmatter.team).toEqual(['alice', 'bob']);
    expect(project.frontmatter.client).toBe('Acme Corp');
    expect(project.frontmatter.tags).toEqual(['platform', 'release']);
    expect(project.frontmatter.description).toBe('Launch customer-facing alpha');
    expect(project.frontmatter.started).toBe('2026-02-01');
    expect(project.frontmatter.deadline).toBe('2026-03-01');
    expect(project.frontmatter.repo).toBe('https://github.com/acme/apollo');
    expect(project.frontmatter.url).toBe('https://apollo.acme.dev');
    expect(project.frontmatter.completed).toBe('2026-03-02');
    expect(project.frontmatter.reason).toBe('Accepted by client');
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(raw).toContain('# Apollo Launch');
    expect(raw).toContain('[[alice]]');
    expect(raw).toContain('[[bob]]');
    expect(raw).toContain('[[Acme Corp]]');
  });

  it('reads project schema defaults and body scaffold from vault templates', () => {
    const templatesDir = path.join(tempDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(templatesDir, 'project.md'),
      `---
primitive: project
fields:
  type:
    type: string
    default: project
  status:
    type: string
    default: paused
  created:
    type: datetime
    default: "{{datetime}}"
  updated:
    type: datetime
    default: "{{datetime}}"
  owner:
    type: string
  client:
    type: string
  repo:
    type: string
  stack:
    type: string
    default: "repo={{repo}}"
---
# Project: {{title}}
{{links_line}}
{{content}}
`
    );

    const project = createProject(tempDir, 'Template Project', {
      owner: 'alice',
      client: 'Acme',
      repo: 'https://github.com/acme/template-project',
      content: 'Ship the onboarding flow.'
    });

    expect(project.frontmatter.status).toBe('paused');
    expect(project.frontmatter.owner).toBe('alice');
    expect(project.frontmatter.client).toBe('Acme');
    expect(project.frontmatter.repo).toBe('https://github.com/acme/template-project');
    expect((project.frontmatter as unknown as Record<string, unknown>).stack).toBe('repo=https://github.com/acme/template-project');

    const raw = fs.readFileSync(path.join(tempDir, 'projects', 'template-project.md'), 'utf-8');
    expect(raw).toContain('# Project: Template Project');
    expect(raw).toContain('[[alice]] | [[Acme]]');
    expect(raw).toContain('Ship the onboarding flow.');
  });

  it('lists projects with filters and ignores non-definition files', () => {
    createProject(tempDir, 'Apollo', {
      status: 'active',
      owner: 'alice',
      client: 'Acme',
      tags: ['platform']
    });
    createProject(tempDir, 'Borealis', {
      status: 'paused',
      owner: 'bob',
      client: 'Beta',
      tags: ['infra']
    });
    createProject(tempDir, 'Cronus', {
      status: 'archived',
      owner: 'alice',
      client: 'Acme',
      tags: ['legacy']
    });

    const projectsDir = path.join(tempDir, 'projects');
    fs.writeFileSync(path.join(projectsDir, '2026-02-14.md'), '# Daily project note');
    fs.mkdirSync(path.join(projectsDir, 'apollo'), { recursive: true });
    fs.writeFileSync(path.join(projectsDir, 'apollo', '2026-02-14.md'), '# Activity');
    fs.writeFileSync(path.join(projectsDir, 'misc.md'), '---\ntype: fact\n---\n# Not a project');

    const allProjects = listProjects(tempDir);
    expect(allProjects).toHaveLength(3);

    const active = listProjects(tempDir, { status: 'active' });
    expect(active).toHaveLength(1);
    expect(active[0].slug).toBe('apollo');

    const byOwner = listProjects(tempDir, { owner: 'alice' });
    expect(byOwner).toHaveLength(2);
    expect(byOwner.every((project) => project.frontmatter.owner === 'alice')).toBe(true);

    const byClient = listProjects(tempDir, { client: 'Acme' });
    expect(byClient).toHaveLength(2);
    expect(byClient.every((project) => project.frontmatter.client === 'Acme')).toBe(true);

    const byTag = listProjects(tempDir, { tag: 'infra' });
    expect(byTag).toHaveLength(1);
    expect(byTag[0].slug).toBe('borealis');
  });

  it('updates project status and frontmatter fields', () => {
    createProject(tempDir, 'Update Me', { status: 'active', owner: 'alice' });
    const updated = updateProject(tempDir, 'update-me', {
      status: 'paused',
      owner: 'bob',
      team: ['bob', 'carol'],
      tags: ['migration', 'ops']
    });

    expect(updated.frontmatter.status).toBe('paused');
    expect(updated.frontmatter.owner).toBe('bob');
    expect(updated.frontmatter.team).toEqual(['bob', 'carol']);
    expect(updated.frontmatter.tags).toEqual(['migration', 'ops']);
  });

  it('archives project with reason', () => {
    createProject(tempDir, 'Archive Me', { status: 'active' });
    const archived = archiveProject(tempDir, 'archive-me', 'Sunset after migration');

    expect(archived.frontmatter.status).toBe('archived');
    expect(archived.frontmatter.reason).toBe('Sunset after migration');
    expect(archived.frontmatter.completed).toBeDefined();
  });

  it('gets project tasks by project slug', () => {
    createProject(tempDir, 'Task Project');
    createTask(tempDir, 'Task One', { project: 'task-project' });
    createTask(tempDir, 'Task Two', { project: 'task-project' });
    const doneTask = createTask(tempDir, 'Task Three', { project: 'task-project' });
    updateTask(tempDir, doneTask.slug, { status: 'done' });
    createTask(tempDir, 'Task Other', { project: 'different-project' });

    const tasks = getProjectTasks(tempDir, 'task-project');
    expect(tasks).toHaveLength(3);
    expect(tasks.every((task) => task.frontmatter.project === 'task-project')).toBe(true);
  });

  it('gets project activity sorted by date descending', () => {
    createProject(tempDir, 'Activity Project');
    const activityDir = path.join(tempDir, 'projects', 'activity-project');
    fs.mkdirSync(activityDir, { recursive: true });
    fs.writeFileSync(path.join(activityDir, '2026-02-11.md'), '# Day 1');
    fs.writeFileSync(path.join(activityDir, '2026-02-13.md'), '# Day 3');
    fs.writeFileSync(path.join(activityDir, '2026-02-12.md'), '# Day 2');
    fs.writeFileSync(path.join(activityDir, 'notes.txt'), 'ignore');

    const activity = getProjectActivity(tempDir, 'activity-project');
    expect(activity.map((entry) => path.basename(entry))).toEqual([
      '2026-02-13.md',
      '2026-02-12.md',
      '2026-02-11.md'
    ]);
  });

  it('generates deterministic project slug from title', () => {
    const project = createProject(tempDir, 'My Big Project: V2');
    expect(project.slug).toBe('my-big-project-v2');

    const readBack = readProject(tempDir, 'my-big-project-v2');
    expect(readBack?.title).toBe('My Big Project: V2');
  });
});

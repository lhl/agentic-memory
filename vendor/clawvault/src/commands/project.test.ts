import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createTask, updateTask } from '../lib/task-utils.js';
import { createProject } from '../lib/project-utils.js';
import {
  formatProjectDetails,
  generateProjectBoardMarkdown,
  projectList,
  syncProjectBoard
} from './project.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-project-cmd-'));
}

describe('project command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists non-archived projects by default', () => {
    createProject(tempDir, 'Active Project', { status: 'active', owner: 'alice' });
    createProject(tempDir, 'Archived Project', { status: 'archived', owner: 'alice' });

    const projects = projectList(tempDir);
    expect(projects).toHaveLength(1);
    expect(projects[0].slug).toBe('active-project');
  });

  it('generates project board markdown grouped by status', () => {
    const active = createProject(tempDir, 'Active Project', {
      status: 'active',
      owner: 'alice',
      client: 'Acme',
      tags: ['platform'],
      deadline: '2026-03-01'
    });
    createProject(tempDir, 'Completed Project', { status: 'completed' });

    const markdown = generateProjectBoardMarkdown([active], {
      groupBy: 'status',
      now: new Date('2026-02-14T12:00:00.000Z')
    });

    expect(markdown).toContain('kanban-plugin: basic');
    expect(markdown).toContain('clawvault-group-by: status');
    expect(markdown).toContain("clawvault-last-sync: '2026-02-14T12:00:00.000Z'");
    expect(markdown).toContain('## Active');
    expect(markdown).toContain('[[projects/active-project|Active Project]]');
    expect(markdown).toContain('@alice');
    expect(markdown).toContain('#client/Acme');
    expect(markdown).toContain('📅 2026-03-01');
  });

  it('syncs project board to disk', () => {
    createProject(tempDir, 'Board Project', { status: 'paused' });
    const boardPath = path.join(tempDir, 'Projects-Board.md');
    const result = syncProjectBoard(tempDir, {
      output: boardPath,
      groupBy: 'status'
    });

    expect(result.projectCount).toBe(1);
    expect(fs.existsSync(boardPath)).toBe(true);
    expect(fs.readFileSync(boardPath, 'utf-8')).toContain('Board Project');
  });

  it('formats project details with task summary and recent activity', () => {
    const project = createProject(tempDir, 'Detail Project', {
      status: 'active',
      owner: 'alice',
      team: ['alice', 'bob']
    });
    createTask(tempDir, 'Open Task', { project: project.slug });
    const inProgress = createTask(tempDir, 'In Progress Task', { project: project.slug });
    updateTask(tempDir, inProgress.slug, { status: 'in-progress' });
    const done = createTask(tempDir, 'Done Task', { project: project.slug });
    updateTask(tempDir, done.slug, { status: 'done' });

    const activityDir = path.join(tempDir, 'projects', project.slug);
    fs.mkdirSync(activityDir, { recursive: true });
    fs.writeFileSync(path.join(activityDir, '2026-02-10.md'), '# Activity');

    const output = formatProjectDetails(tempDir, project);
    expect(output).toContain('status: active');
    expect(output).toContain('Linked tasks: 1 open, 1 in-progress, 1 done');
    expect(output).toContain('Team members:');
    expect(output).toContain('2026-02-10.md');
  });
});

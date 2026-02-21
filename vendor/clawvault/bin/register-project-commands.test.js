import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerProjectCommands } from './register-project-commands.js';
import { chalkStub } from './test-helpers/cli-command-fixtures.js';

const { projectCommandMock } = vi.hoisted(() => ({
  projectCommandMock: vi.fn()
}));

vi.mock('../dist/commands/project.js', () => ({
  projectCommand: projectCommandMock
}));

function buildProgram() {
  const program = new Command();
  registerProjectCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: (value) => value ?? '/vault'
  });
  return program;
}

async function runCommand(args) {
  const program = buildProgram();
  await program.parseAsync(args, { from: 'user' });
}

describe('register-project-commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers add/update/archive/list/show/tasks/board subcommands', () => {
    const program = buildProgram();
    const projectCommand = program.commands.find((command) => command.name() === 'project');
    expect(projectCommand).toBeDefined();

    const subcommandNames = projectCommand?.commands.map((command) => command.name()) ?? [];
    expect(subcommandNames).toEqual(expect.arrayContaining([
      'add',
      'update',
      'archive',
      'list',
      'show',
      'tasks',
      'board'
    ]));

    const addCommand = projectCommand?.commands.find((command) => command.name() === 'add');
    const addFlags = addCommand?.options.map((option) => option.flags) ?? [];
    expect(addFlags).toEqual(expect.arrayContaining([
      '--owner <owner>',
      '--status <status>',
      '--team <team>',
      '--client <client>',
      '--tags <tags>',
      '--description <description>',
      '--deadline <date>',
      '--repo <url>',
      '--url <url>'
    ]));

    const listCommand = projectCommand?.commands.find((command) => command.name() === 'list');
    const listFlags = listCommand?.options.map((option) => option.flags) ?? [];
    expect(listFlags).toEqual(expect.arrayContaining([
      '--status <status>',
      '--owner <owner>',
      '--client <client>',
      '--tag <tag>',
      '--json'
    ]));

    const boardCommand = projectCommand?.commands.find((command) => command.name() === 'board');
    const boardFlags = boardCommand?.options.map((option) => option.flags) ?? [];
    expect(boardFlags).toEqual(expect.arrayContaining([
      '--output <path>',
      '--group-by <field>'
    ]));

    expect(listCommand?.description()).toContain('archived projects are hidden');

    const boardGroupByOption = boardCommand?.options.find((option) => option.flags === '--group-by <field>');
    expect(boardGroupByOption?.description).toContain('default: status');
  });

  it('dispatches project subcommands to project command handler', async () => {
    await runCommand([
      'project',
      'add',
      'Apollo Launch',
      '--owner',
      'alice',
      '--status',
      'active',
      '--team',
      'alice,bob',
      '--client',
      'Acme',
      '--tags',
      'platform,release',
      '--description',
      'Launch project',
      '--deadline',
      '2026-03-01',
      '--repo',
      'https://github.com/acme/apollo',
      '--url',
      'https://apollo.acme.dev'
    ]);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'add', {
      title: 'Apollo Launch',
      options: {
        owner: 'alice',
        status: 'active',
        team: ['alice', 'bob'],
        client: 'Acme',
        tags: ['platform', 'release'],
        description: 'Launch project',
        deadline: '2026-03-01',
        repo: 'https://github.com/acme/apollo',
        url: 'https://apollo.acme.dev'
      }
    });

    await runCommand([
      'project',
      'update',
      'apollo-launch',
      '--status',
      'paused',
      '--owner',
      'carol',
      '--team',
      'carol,dave',
      '--client',
      'Acme',
      '--tags',
      'ops',
      '--description',
      'Paused pending review',
      '--deadline',
      '2026-03-10',
      '--repo',
      'https://github.com/acme/apollo-v2',
      '--url',
      'https://staging.acme.dev'
    ]);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'update', {
      slug: 'apollo-launch',
      options: {
        status: 'paused',
        owner: 'carol',
        team: ['carol', 'dave'],
        client: 'Acme',
        tags: ['ops'],
        description: 'Paused pending review',
        deadline: '2026-03-10',
        repo: 'https://github.com/acme/apollo-v2',
        url: 'https://staging.acme.dev'
      }
    });

    await runCommand(['project', 'archive', 'apollo-launch', '--reason', 'Client offboarded']);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'archive', {
      slug: 'apollo-launch',
      options: {
        reason: 'Client offboarded'
      }
    });

    await runCommand(['project', 'list', '--status', 'active', '--owner', 'alice', '--client', 'Acme', '--tag', 'platform', '--json']);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'list', {
      options: {
        status: 'active',
        owner: 'alice',
        client: 'Acme',
        tag: 'platform',
        json: true
      }
    });

    await runCommand(['project', 'show', 'apollo-launch']);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'show', {
      slug: 'apollo-launch',
      options: {
        json: undefined
      }
    });

    await runCommand(['project', 'tasks', 'apollo-launch', '--json']);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'tasks', {
      slug: 'apollo-launch',
      options: {
        json: true
      }
    });

    await runCommand(['project', 'board', '--output', 'Projects-Board.md', '--group-by', 'client']);
    expect(projectCommandMock).toHaveBeenCalledWith('/vault', 'board', {
      options: {
        output: 'Projects-Board.md',
        groupBy: 'client'
      }
    });
  });
});

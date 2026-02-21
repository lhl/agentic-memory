import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerKanbanCommands } from './register-kanban-commands.js';
import { chalkStub } from './test-helpers/cli-command-fixtures.js';

const { kanbanCommandMock } = vi.hoisted(() => ({
  kanbanCommandMock: vi.fn()
}));

vi.mock('../dist/commands/kanban.js', () => ({
  kanbanCommand: kanbanCommandMock
}));

function buildProgram() {
  const program = new Command();
  registerKanbanCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: (value) => value ?? '/vault'
  });
  return program;
}

async function runCommand(args) {
  const program = buildProgram();
  await program.parseAsync(args, { from: 'user' });
}

describe('register-kanban-commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers sync and import subcommands with expected options', () => {
    const program = buildProgram();
    const kanbanCommand = program.commands.find((command) => command.name() === 'kanban');
    expect(kanbanCommand).toBeDefined();

    const syncCommand = kanbanCommand?.commands.find((command) => command.name() === 'sync');
    expect(syncCommand).toBeDefined();
    const syncFlags = syncCommand?.options.map((option) => option.flags) ?? [];
    expect(syncFlags).toEqual(expect.arrayContaining([
      '--output <path>',
      '--group-by <field>',
      '--filter-project <project>',
      '--filter-owner <owner>',
      '--include-done'
    ]));

    const importCommand = kanbanCommand?.commands.find((command) => command.name() === 'import');
    expect(importCommand).toBeDefined();
    const importFlags = importCommand?.options.map((option) => option.flags) ?? [];
    expect(importFlags).toEqual(expect.arrayContaining(['--output <path>']));
  });

  it('dispatches sync and import actions to the kanban command handler', async () => {
    await runCommand([
      'kanban',
      'sync',
      '--group-by',
      'priority',
      '--output',
      'Board.md',
      '--filter-project',
      'apollo',
      '--filter-owner',
      'alice',
      '--include-done'
    ]);

    expect(kanbanCommandMock).toHaveBeenCalledWith('/vault', 'sync', {
      output: 'Board.md',
      groupBy: 'priority',
      filterProject: 'apollo',
      filterOwner: 'alice',
      includeDone: true
    });

    await runCommand(['kanban', 'import', '--output', 'Board.md']);
    expect(kanbanCommandMock).toHaveBeenCalledWith('/vault', 'import', {
      output: 'Board.md'
    });
  });
});

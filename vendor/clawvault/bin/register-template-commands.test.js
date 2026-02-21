import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerTemplateCommands } from './register-template-commands.js';
import { chalkStub } from './test-helpers/cli-command-fixtures.js';

const {
  listTemplateDefinitionsMock,
  createFromTemplateMock,
  addTemplateMock
} = vi.hoisted(() => ({
  listTemplateDefinitionsMock: vi.fn(),
  createFromTemplateMock: vi.fn(),
  addTemplateMock: vi.fn()
}));

vi.mock('../dist/commands/template.js', () => ({
  listTemplateDefinitions: listTemplateDefinitionsMock,
  createFromTemplate: createFromTemplateMock,
  addTemplate: addTemplateMock
}));

function buildProgram() {
  const program = new Command();
  registerTemplateCommands(program, { chalk: chalkStub });
  return program;
}

async function runCommand(args) {
  const program = buildProgram();
  await program.parseAsync(args, { from: 'user' });
}

describe('register-template-commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplateDefinitionsMock.mockReturnValue([]);
  });

  it('registers list/create/add template subcommands', () => {
    const program = buildProgram();
    const templateCommand = program.commands.find((command) => command.name() === 'template');
    expect(templateCommand).toBeDefined();
    expect(templateCommand?.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining(['list', 'create', 'add'])
    );
  });

  it('prints template fields in list output', async () => {
    listTemplateDefinitionsMock.mockReturnValue([
      { name: 'task', fields: ['status', 'owner'] },
      { name: 'project', fields: ['status', 'client'] }
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCommand(['template', 'list']);
      expect(logSpy).toHaveBeenCalledWith('- task (status, owner)');
      expect(logSpy).toHaveBeenCalledWith('- project (status, client)');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('dispatches create and add operations to template command handlers', async () => {
    createFromTemplateMock.mockReturnValue({
      outputPath: '/tmp/task.md',
      templatePath: '/templates/task.md',
      variables: { title: 'Task', type: 'task', date: '2026-02-16', datetime: '2026-02-16T00:00:00.000Z' }
    });
    addTemplateMock.mockReturnValue({
      templatePath: '/vault/templates/custom.md',
      name: 'custom'
    });

    await runCommand(['template', 'create', 'task', '--title', 'Ship It']);
    expect(createFromTemplateMock).toHaveBeenCalledWith('task', {
      title: 'Ship It',
      vaultPath: undefined
    });

    await runCommand(['template', 'add', 'source.md', '--name', 'custom']);
    expect(addTemplateMock).toHaveBeenCalledWith('source.md', {
      name: 'custom',
      vaultPath: undefined
    });
  });
});

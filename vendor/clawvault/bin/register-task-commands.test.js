import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { registerTaskCommands } from './register-task-commands.js';
import { chalkStub, stubResolveVaultPath } from './test-helpers/cli-command-fixtures.js';

describe('register-task-commands', () => {
  it('adds enriched task add/list/update options', () => {
    const program = new Command();
    registerTaskCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath
    });

    const taskCommand = program.commands.find((command) => command.name() === 'task');
    expect(taskCommand).toBeDefined();

    const addCommand = taskCommand?.commands.find((command) => command.name() === 'add');
    const addFlags = addCommand?.options.map((option) => option.flags) ?? [];
    expect(addFlags).toEqual(expect.arrayContaining([
      '--due <date>',
      '--tags <tags>',
      '--description <description>',
      '--estimate <estimate>',
      '--parent <slug>',
      '--depends-on <slugs>'
    ]));

    const listCommand = taskCommand?.commands.find((command) => command.name() === 'list');
    const listFlags = listCommand?.options.map((option) => option.flags) ?? [];
    expect(listFlags).toEqual(expect.arrayContaining([
      '--due',
      '--tag <tag>',
      '--overdue'
    ]));

    const updateCommand = taskCommand?.commands.find((command) => command.name() === 'update');
    const updateFlags = updateCommand?.options.map((option) => option.flags) ?? [];
    expect(updateFlags).toEqual(expect.arrayContaining([
      '--tags <tags>',
      '--description <description>',
      '--estimate <estimate>',
      '--parent <slug>',
      '--depends-on <slugs>',
      '--clear-due',
      '--clear-tags',
      '--clear-description',
      '--clear-estimate',
      '--clear-parent',
      '--clear-depends-on'
    ]));
  });

  it('adds simplified canvas flags', () => {
    const program = new Command();
    registerTaskCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath
    });

    const canvasCommand = program.commands.find((command) => command.name() === 'canvas');
    expect(canvasCommand).toBeDefined();

    const optionFlags = canvasCommand?.options.map((option) => option.flags) ?? [];
    expect(optionFlags).toEqual(expect.arrayContaining([
      '-v, --vault <path>',
      '--output <path>'
    ]));
  });
});

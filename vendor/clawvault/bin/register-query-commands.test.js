import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { registerQueryCommands } from './register-query-commands.js';
import {
  chalkStub,
  createGetVaultStub,
  stubResolveVaultPath
} from './test-helpers/cli-command-fixtures.js';

function buildProgram() {
  const program = new Command();
  registerQueryCommands(program, {
    chalk: chalkStub,
    getVault: createGetVaultStub({ find: async () => [], vsearch: async () => [] }),
    resolveVaultPath: stubResolveVaultPath,
    QmdUnavailableError: class extends Error {},
    printQmdMissing: () => {}
  });
  return program;
}

describe('register-query-commands', () => {
  it('documents inject command options and config-backed defaults', () => {
    const program = buildProgram();
    const injectCommand = program.commands.find((command) => command.name() === 'inject');
    expect(injectCommand).toBeDefined();

    const injectFlags = injectCommand?.options.map((option) => option.flags) ?? [];
    expect(injectFlags).toEqual(expect.arrayContaining([
      '-n, --max-results <n>',
      '--scope <scope>',
      '--enable-llm',
      '--disable-llm',
      '--format <format>',
      '--model <model>',
      '-v, --vault <path>'
    ]));

    const maxResultsOption = injectCommand?.options.find((option) => option.flags === '-n, --max-results <n>');
    const scopeOption = injectCommand?.options.find((option) => option.flags === '--scope <scope>');
    const formatOption = injectCommand?.options.find((option) => option.flags === '--format <format>');
    expect(maxResultsOption?.description).toContain('inject.maxResults');
    expect(scopeOption?.description).toContain('inject.scope');
    expect(formatOption?.description).toContain('default: markdown');
  });

  it('documents observe extraction toggles and threshold defaults', () => {
    const program = buildProgram();
    const observeCommand = program.commands.find((command) => command.name() === 'observe');
    expect(observeCommand).toBeDefined();

    const observeFlags = observeCommand?.options.map((option) => option.flags) ?? [];
    expect(observeFlags).toEqual(expect.arrayContaining([
      '--extract-tasks',
      '--no-extract-tasks',
      '--threshold <n>',
      '--reflect-threshold <n>'
    ]));

    const thresholdOption = observeCommand?.options.find((option) => option.flags === '--threshold <n>');
    const reflectThresholdOption = observeCommand?.options.find((option) => option.flags === '--reflect-threshold <n>');
    expect(thresholdOption?.description).toContain('default: 30000');
    expect(reflectThresholdOption?.description).toContain('default: 40000');
  });
});

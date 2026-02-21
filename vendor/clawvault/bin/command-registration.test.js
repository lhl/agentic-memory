import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { registerCoreCommands } from './register-core-commands.js';
import { registerMaintenanceCommands } from './register-maintenance-commands.js';
import { registerQueryCommands } from './register-query-commands.js';
import { registerResilienceCommands } from './register-resilience-commands.js';
import { registerSessionLifecycleCommands } from './register-session-lifecycle-commands.js';
import { registerTemplateCommands } from './register-template-commands.js';
import { registerVaultOperationsCommands } from './register-vault-operations-commands.js';
import { registerConfigCommands } from './register-config-commands.js';
import { registerRouteCommands } from './register-route-commands.js';
import {
  chalkStub,
  createGetVaultStub,
  registerAllCommandModules,
  stubResolveVaultPath
} from './test-helpers/cli-command-fixtures.js';

function listCommandNames(program) {
  return program.commands.map((command) => command.name()).sort((a, b) => a.localeCompare(b));
}

describe('CLI command registration modules', () => {
  it('registers core lifecycle commands', () => {
    const program = new Command();
    registerCoreCommands(program, {
      chalk: chalkStub,
      path,
      fs,
      createVault: async () => ({ getCategories: () => [], getQmdRoot: () => '', getQmdCollection: () => '' }),
      getVault: createGetVaultStub({ store: async () => ({}), capture: async () => ({}) }),
      runQmd: async () => {}
    });

    const names = listCommandNames(program);
    expect(names).toEqual(expect.arrayContaining(['init', 'setup', 'store', 'capture']));
  });

  it('registers query commands with profile option', () => {
    const program = new Command();
    registerQueryCommands(program, {
      chalk: chalkStub,
      getVault: createGetVaultStub({ find: async () => [], vsearch: async () => [] }),
      resolveVaultPath: stubResolveVaultPath,
      QmdUnavailableError: class extends Error {},
      printQmdMissing: () => {}
    });

    const names = listCommandNames(program);
    expect(names).toEqual(expect.arrayContaining(['search', 'vsearch', 'context', 'inject', 'observe', 'reflect', 'session-recap']));

    const contextCommand = program.commands.find((command) => command.name() === 'context');
    const profileOption = contextCommand?.options.find((option) => option.flags.includes('--profile <profile>'));
    expect(profileOption?.description).toContain('auto');
  });

  it('registers vault operation commands', () => {
    const program = new Command();
    registerVaultOperationsCommands(program, {
      chalk: chalkStub,
      fs,
      getVault: createGetVaultStub({
        list: async () => [],
        get: async () => null,
        stats: async () => ({ tags: [], categories: {} }),
        sync: async () => ({ copied: [], deleted: [], unchanged: [], errors: [] }),
        reindex: async () => 0,
        remember: async () => ({ id: '' }),
        getQmdCollection: () => ''
      }),
      runQmd: async () => {},
      resolveVaultPath: stubResolveVaultPath,
      path
    });

    const names = listCommandNames(program);
    expect(names).toEqual(expect.arrayContaining([
      'list',
      'get',
      'stats',
      'sync',
      'reindex',
      'remember',
      'shell-init',
      'dashboard'
    ]));
  });

  it('registers maintenance, resilience, session-lifecycle and template commands', () => {
    const program = new Command();
    registerMaintenanceCommands(program, { chalk: chalkStub });
    registerResilienceCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath
    });
    registerSessionLifecycleCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath,
      QmdUnavailableError: class extends Error {},
      printQmdMissing: () => {},
      getVault: createGetVaultStub({
        createHandoff: async () => ({ id: '', path: '' }),
        getQmdCollection: () => '',
        generateRecap: async () => ({}),
        formatRecap: () => ''
      }),
      runQmd: async () => {}
    });
    registerTemplateCommands(program, { chalk: chalkStub });
    registerConfigCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath
    });
    registerRouteCommands(program, {
      chalk: chalkStub,
      resolveVaultPath: stubResolveVaultPath
    });

    const names = listCommandNames(program);
    expect(names).toEqual(expect.arrayContaining([
      'doctor',
      'embed',
      'compat',
      'graph',
      'entities',
      'link',
      'rebuild',
      'archive',
      'migrate-observations',
      'replay',
      'sync-bd',
      'checkpoint',
      'recover',
      'status',
      'clean-exit',
      'repair-session',
      'wake',
      'sleep',
      'handoff',
      'recap',
      'template',
      'config',
      'route'
    ]));

    const templateCommand = program.commands.find((command) => command.name() === 'template');
    const templateSubcommands = templateCommand?.commands.map((command) => command.name()) ?? [];
    expect(templateSubcommands).toEqual(expect.arrayContaining(['list', 'create', 'add']));

    const compatCommand = program.commands.find((command) => command.name() === 'compat');
    const strictOption = compatCommand?.options.find((option) => option.flags.includes('--strict'));
    const baseDirOption = compatCommand?.options.find((option) => option.flags.includes('--base-dir <path>'));
    expect(strictOption).toBeTruthy();
    expect(baseDirOption).toBeTruthy();
  });

  it('keeps top-level command names unique when modules are combined', () => {
    const program = registerAllCommandModules(new Command());

    const names = program.commands.map((command) => command.name());
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

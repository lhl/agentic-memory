import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { registerCoreCommands } from '../register-core-commands.js';
import { registerMaintenanceCommands } from '../register-maintenance-commands.js';
import { registerQueryCommands } from '../register-query-commands.js';
import { registerResilienceCommands } from '../register-resilience-commands.js';
import { registerSessionLifecycleCommands } from '../register-session-lifecycle-commands.js';
import { registerTemplateCommands } from '../register-template-commands.js';
import { registerVaultOperationsCommands } from '../register-vault-operations-commands.js';
import { registerConfigCommands } from '../register-config-commands.js';
import { registerRouteCommands } from '../register-route-commands.js';
import { registerTaskCommands } from '../register-task-commands.js';
import { registerKanbanCommands } from '../register-kanban-commands.js';
import { registerProjectCommands } from '../register-project-commands.js';

export const chalkStub = {
  cyan: (value) => value,
  green: (value) => value,
  red: (value) => value,
  dim: (value) => value,
  yellow: (value) => value,
  white: (value) => value
};

export function stubResolveVaultPath(value) {
  return value ?? '/vault';
}

export function createVaultStub(overrides = {}) {
  return {
    store: async () => ({}),
    capture: async () => ({}),
    find: async () => [],
    vsearch: async () => [],
    list: async () => [],
    get: async () => null,
    stats: async () => ({ tags: [], categories: {} }),
    sync: async () => ({ copied: [], deleted: [], unchanged: [], errors: [] }),
    reindex: async () => 0,
    remember: async () => ({ id: '' }),
    getQmdCollection: () => '',
    createHandoff: async () => ({ id: '', path: '' }),
    generateRecap: async () => ({}),
    formatRecap: () => '',
    ...overrides
  };
}

export function createGetVaultStub(overrides = {}) {
  return async () => createVaultStub(overrides);
}

export function registerAllCommandModules(program = new Command()) {
  const getVault = createGetVaultStub();

  registerCoreCommands(program, {
    chalk: chalkStub,
    path,
    fs,
    createVault: async () => ({ getCategories: () => [], getQmdRoot: () => '', getQmdCollection: () => '' }),
    getVault,
    runQmd: async () => {}
  });

  registerQueryCommands(program, {
    chalk: chalkStub,
    getVault,
    resolveVaultPath: stubResolveVaultPath,
    QmdUnavailableError: class extends Error {},
    printQmdMissing: () => {}
  });

  registerVaultOperationsCommands(program, {
    chalk: chalkStub,
    fs,
    getVault,
    runQmd: async () => {},
    resolveVaultPath: stubResolveVaultPath,
    path
  });

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
    getVault,
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
  registerTaskCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: stubResolveVaultPath
  });
  registerKanbanCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: stubResolveVaultPath
  });
  registerProjectCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: stubResolveVaultPath
  });

  return program;
}

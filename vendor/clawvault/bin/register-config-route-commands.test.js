import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerConfigCommands } from './register-config-commands.js';
import { registerRouteCommands } from './register-route-commands.js';
import { chalkStub } from './test-helpers/cli-command-fixtures.js';

const {
  getConfigValueMock,
  setConfigValueMock,
  listConfigMock,
  resetConfigMock,
  addRouteRuleMock,
  listRouteRulesMock,
  removeRouteRuleMock,
  testRouteRuleMock
} = vi.hoisted(() => ({
  getConfigValueMock: vi.fn(),
  setConfigValueMock: vi.fn(),
  listConfigMock: vi.fn(),
  resetConfigMock: vi.fn(),
  addRouteRuleMock: vi.fn(),
  listRouteRulesMock: vi.fn(),
  removeRouteRuleMock: vi.fn(),
  testRouteRuleMock: vi.fn()
}));

vi.mock('../dist/index.js', () => ({
  SUPPORTED_CONFIG_KEYS: [
    'name',
    'categories',
    'theme',
    'observe.model',
    'observe.provider',
    'observer.compression.provider',
    'observer.compression.model',
    'observer.compression.baseUrl',
    'observer.compression.apiKey',
    'context.maxResults',
    'context.defaultProfile',
    'graph.maxHops',
    'inject.maxResults',
    'inject.useLlm',
    'inject.scope'
  ],
  getConfigValue: getConfigValueMock,
  setConfigValue: setConfigValueMock,
  listConfig: listConfigMock,
  resetConfig: resetConfigMock,
  addRouteRule: addRouteRuleMock,
  listRouteRules: listRouteRulesMock,
  removeRouteRule: removeRouteRuleMock,
  testRouteRule: testRouteRuleMock
}));

function buildProgram() {
  const program = new Command();
  const resolveVaultPath = (value) => value ?? '/vault';
  registerConfigCommands(program, { chalk: chalkStub, resolveVaultPath });
  registerRouteCommands(program, { chalk: chalkStub, resolveVaultPath });
  return program;
}

async function runCommand(args) {
  const program = buildProgram();
  await program.parseAsync(args, { from: 'user' });
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfigValueMock.mockReturnValue('demo-vault');
  setConfigValueMock.mockReturnValue({ value: 'demo-vault' });
  listConfigMock.mockReturnValue({ name: 'demo-vault', context: { maxResults: 5 } });
  resetConfigMock.mockReturnValue(undefined);
  addRouteRuleMock.mockReturnValue({ pattern: 'Pedro', target: 'people/pedro', priority: 1 });
  listRouteRulesMock.mockReturnValue([{ pattern: 'Pedro', target: 'people/pedro', priority: 1 }]);
  removeRouteRuleMock.mockReturnValue(true);
  testRouteRuleMock.mockReturnValue({ pattern: 'Pedro', target: 'people/pedro', priority: 1 });
});

describe('config and route command registrations', () => {
  it('executes config get/set/list subcommands', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCommand(['config', 'get', 'name']);
      expect(getConfigValueMock).toHaveBeenCalledWith('/vault', 'name');

      await runCommand(['config', 'set', 'categories', 'people,projects']);
      expect(setConfigValueMock).toHaveBeenCalledWith('/vault', 'categories', 'people,projects');

      await runCommand(['config', 'list']);
      expect(listConfigMock).toHaveBeenCalledWith('/vault');

      const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(output).toContain('context.maxResults');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('executes route add/remove/test subcommands', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCommand(['route', 'add', 'Pedro', 'people/pedro']);
      expect(addRouteRuleMock).toHaveBeenCalledWith('/vault', 'Pedro', 'people/pedro');

      await runCommand(['route', 'remove', 'Pedro']);
      expect(removeRouteRuleMock).toHaveBeenCalledWith('/vault', 'Pedro');

      await runCommand(['route', 'test', 'Talked to Pedro']);
      expect(testRouteRuleMock).toHaveBeenCalledWith('/vault', 'Talked to Pedro');

      await runCommand(['route', 'list']);
      expect(listRouteRulesMock).toHaveBeenCalledWith('/vault');

      const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(output).toContain('Route matched');
    } finally {
      logSpy.mockRestore();
    }
  });
});

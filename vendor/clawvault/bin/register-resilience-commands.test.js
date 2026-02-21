import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerResilienceCommands } from './register-resilience-commands.js';
import { chalkStub } from './test-helpers/cli-command-fixtures.js';

const {
  recoverMock,
  formatRecoveryInfoMock,
  checkRecoveryStatusMock,
  formatRecoveryCheckStatusMock,
  listCheckpointsMock,
  formatCheckpointListMock
} = vi.hoisted(() => ({
  recoverMock: vi.fn(),
  formatRecoveryInfoMock: vi.fn(),
  checkRecoveryStatusMock: vi.fn(),
  formatRecoveryCheckStatusMock: vi.fn(),
  listCheckpointsMock: vi.fn(),
  formatCheckpointListMock: vi.fn()
}));

vi.mock('../dist/commands/recover.js', () => ({
  recover: recoverMock,
  formatRecoveryInfo: formatRecoveryInfoMock,
  checkRecoveryStatus: checkRecoveryStatusMock,
  formatRecoveryCheckStatus: formatRecoveryCheckStatusMock,
  listCheckpoints: listCheckpointsMock,
  formatCheckpointList: formatCheckpointListMock
}));

function buildProgram() {
  const program = new Command();
  registerResilienceCommands(program, {
    chalk: chalkStub,
    resolveVaultPath: (value) => value ?? '/vault'
  });
  return program;
}

async function runCommand(args) {
  const program = buildProgram();
  await program.parseAsync(args, { from: 'user' });
}

beforeEach(() => {
  vi.clearAllMocks();
  recoverMock.mockResolvedValue({ died: false });
  formatRecoveryInfoMock.mockReturnValue('recover');
  checkRecoveryStatusMock.mockResolvedValue({ died: false, deathTime: null, checkpoint: null });
  formatRecoveryCheckStatusMock.mockReturnValue('check');
  listCheckpointsMock.mockReturnValue([]);
  formatCheckpointListMock.mockReturnValue('list');
});

describe('register-resilience-commands', () => {
  it('routes recover --check through check helpers', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCommand(['recover', '--check']);
      expect(checkRecoveryStatusMock).toHaveBeenCalledWith('/vault');
      expect(formatRecoveryCheckStatusMock).toHaveBeenCalled();
      expect(recoverMock).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('check');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('routes recover --list through checkpoint listing helpers', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCommand(['recover', '--list']);
      expect(listCheckpointsMock).toHaveBeenCalledWith('/vault');
      expect(formatCheckpointListMock).toHaveBeenCalled();
      expect(recoverMock).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('list');
    } finally {
      logSpy.mockRestore();
    }
  });
});

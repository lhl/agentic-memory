/**
 * Context-resilience and session-repair command registrations.
 */

export function registerResilienceCommands(program, { chalk, resolveVaultPath }) {
  // === CHECKPOINT ===
  program
    .command('checkpoint')
    .description('Quick state checkpoint for context death resilience')
    .option('--working-on <text>', 'What you are currently working on')
    .option('--focus <text>', 'Current focus area')
    .option('--blocked <text>', 'What is blocking progress')
    .option('--urgent', 'Trigger OpenClaw wake after checkpoint')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { checkpoint } = await import('../dist/commands/checkpoint.js');
        const data = await checkpoint({
          vaultPath: resolveVaultPath(options.vault),
          workingOn: options.workingOn,
          focus: options.focus,
          blocked: options.blocked,
          urgent: options.urgent
        });

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(chalk.green('✓ Checkpoint saved'));
          console.log(chalk.dim(`  Timestamp: ${data.timestamp}`));
          if (data.workingOn) console.log(chalk.dim(`  Working on: ${data.workingOn}`));
          if (data.focus) console.log(chalk.dim(`  Focus: ${data.focus}`));
          if (data.blocked) console.log(chalk.dim(`  Blocked: ${data.blocked}`));
          if (data.urgent) console.log(chalk.dim('  Urgent: yes'));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === RECOVER ===
  program
    .command('recover')
    .description('Check for context death and recover state')
    .option('--clear', 'Clear the dirty death flag after recovery')
    .option('--check', 'Check dirty death flag without clearing it')
    .option('--list', 'List saved checkpoints (newest first)')
    .option('--verbose', 'Show full checkpoint and handoff content')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        if (options.check && options.list) {
          throw new Error('--check and --list cannot be used together.');
        }

        const {
          recover,
          formatRecoveryInfo,
          checkRecoveryStatus,
          formatRecoveryCheckStatus,
          listCheckpoints,
          formatCheckpointList
        } = await import('../dist/commands/recover.js');
        const vaultPath = resolveVaultPath(options.vault);

        if (options.check) {
          const status = await checkRecoveryStatus(vaultPath);
          if (options.json) {
            console.log(JSON.stringify(status, null, 2));
          } else {
            console.log(formatRecoveryCheckStatus(status));
          }
          return;
        }

        if (options.list) {
          const checkpoints = listCheckpoints(vaultPath);
          if (options.json) {
            console.log(JSON.stringify(checkpoints, null, 2));
          } else {
            console.log(formatCheckpointList(checkpoints));
          }
          return;
        }

        const info = await recover(vaultPath, {
          clearFlag: options.clear,
          verbose: options.verbose
        });

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
        } else {
          console.log(formatRecoveryInfo(info, { verbose: options.verbose }));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === STATUS ===
  program
    .command('status')
    .description('Show vault health and status')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { statusCommand } = await import('../dist/commands/status.js');
        await statusCommand(resolveVaultPath(options.vault), { json: options.json });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === CLEAN-EXIT ===
  program
    .command('clean-exit')
    .description('Mark session as cleanly exited (clears dirty death flag)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { cleanExit } = await import('../dist/commands/checkpoint.js');
        await cleanExit(resolveVaultPath(options.vault));
        console.log(chalk.green('✓ Clean exit recorded'));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === REPAIR-SESSION ===
  program
    .command('repair-session')
    .description('Repair corrupted OpenClaw session transcripts')
    .option('-s, --session <id>', 'Session ID (defaults to current main session)')
    .option('-a, --agent <id>', 'Agent ID (defaults to configured agent)')
    .option('--backup', 'Create backup before repair (default: true)', true)
    .option('--no-backup', 'Skip backup creation')
    .option('--dry-run', 'Show what would be repaired without writing')
    .option('--list', 'List available sessions')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const {
          repairSessionCommand,
          formatRepairResult,
          listAgentSessions
        } = await import('../dist/commands/repair-session.js');

        if (options.list) {
          console.log(listAgentSessions(options.agent));
          return;
        }

        const result = await repairSessionCommand({
          sessionId: options.session,
          agentId: options.agent,
          backup: options.backup,
          dryRun: options.dryRun
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatRepairResult(result, { dryRun: options.dryRun }));
        }

        if (result.corruptedEntries.length > 0 && !result.repaired) {
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

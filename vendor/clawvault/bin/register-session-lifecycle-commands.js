/**
 * Session lifecycle command registrations (wake/sleep/handoff/recap).
 */

export function registerSessionLifecycleCommands(
  program,
  { chalk, resolveVaultPath, QmdUnavailableError, printQmdMissing, getVault, runQmd }
) {
  // === WAKE (session start) ===
  program
    .command('wake')
    .description('Start a session (recover + recap + summary)')
    .option('-n, --handoff-limit <n>', 'Number of recent handoffs to include (default: 3)', '3')
    .option('--full', 'Show full recap (default: brief)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { wake } = await import('../dist/commands/wake.js');
        const { formatRecoveryInfo } = await import('../dist/commands/recover.js');
        const result = await wake({
          vaultPath,
          handoffLimit: parseInt(options.handoffLimit, 10),
          brief: !options.full
        });

        console.log(chalk.cyan('\n🌅 ClawVault Wake\n'));
        console.log(formatRecoveryInfo(result.recovery));
        console.log();
        console.log(chalk.cyan('Recap'));
        console.log(result.recapMarkdown.trim());
        console.log();
        console.log(chalk.green(`You were working on: ${result.summary}`));

        process.exitCode = result.recovery.died ? 1 : 0;
      } catch (err) {
        if (err instanceof QmdUnavailableError) {
          printQmdMissing();
          process.exit(1);
        }
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === SLEEP (session end) ===
  program
    .command('sleep <summary>')
    .description('End a session with a handoff (and optional git commit)')
    .option('-n, --next <items>', 'Next steps (comma-separated)')
    .option('-b, --blocked <items>', 'Blocked items (comma-separated)')
    .option('-d, --decisions <items>', 'Key decisions made (comma-separated)')
    .option('-q, --questions <items>', 'Open questions (comma-separated)')
    .option('-f, --feeling <state>', 'Emotional/energy state')
    .option('-s, --session <key>', 'Session key')
    .option('--session-transcript <path>', 'Session transcript path for auto-observe')
    .option('--reflect', 'Run weekly reflection pass after sleep handoff')
    .option('--index', 'Update qmd index after handoff (default: disabled)')
    .option('--no-git', 'Skip git commit prompt')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (summary, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { sleep } = await import('../dist/commands/sleep.js');
        const result = await sleep({
          workingOn: summary,
          next: options.next,
          blocked: options.blocked,
          decisions: options.decisions,
          questions: options.questions,
          feeling: options.feeling,
          sessionKey: options.session,
          sessionTranscript: options.sessionTranscript,
          reflect: options.reflect,
          vaultPath,
          index: options.index,
          git: options.git
        });

        console.log(chalk.green(`✓ Handoff saved: ${result.document.id}`));
        console.log(chalk.dim(`  Path: ${result.document.path}`));
        console.log(chalk.dim(`  Working on: ${result.handoff.workingOn.join(', ')}`));
        if (result.handoff.nextSteps.length > 0) {
          console.log(chalk.dim(`  Next: ${result.handoff.nextSteps.join(', ')}`));
        } else {
          console.log(chalk.dim('  Next: (none)'));
        }
        if (result.handoff.blocked.length > 0) {
          console.log(chalk.dim(`  Blocked: ${result.handoff.blocked.join(', ')}`));
        } else {
          console.log(chalk.dim('  Blocked: (none)'));
        }
        if (result.handoff.decisions?.length) {
          console.log(chalk.dim(`  Decisions: ${result.handoff.decisions.join(', ')}`));
        }
        if (result.handoff.openQuestions?.length) {
          console.log(chalk.dim(`  Questions: ${result.handoff.openQuestions.join(', ')}`));
        }
        if (result.handoff.feeling) {
          console.log(chalk.dim(`  Feeling: ${result.handoff.feeling}`));
        }
        if (options.index) {
          console.log(chalk.dim('  qmd: index updated'));
        }
        if (result.git) {
          if (result.git.committed) {
            console.log(chalk.green(`✓ Git commit created${result.git.message ? `: ${result.git.message}` : ''}`));
          } else if (result.git.skippedReason === 'clean') {
            console.log(chalk.dim('  Git: clean'));
          } else if (result.git.skippedReason === 'declined') {
            console.log(chalk.dim('  Git: commit skipped'));
          }
        }
        if (result.observationRoutingSummary) {
          console.log(chalk.dim(`  Observe: ${result.observationRoutingSummary}`));
        }
      } catch (err) {
        if (err instanceof QmdUnavailableError) {
          printQmdMissing();
          process.exit(1);
        }
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === HANDOFF (session bridge) ===
  program
    .command('handoff')
    .description('Create a session handoff document')
    .requiredOption('-w, --working-on <items>', 'What I was working on (comma-separated)')
    .option('-b, --blocked <items>', 'What is blocked (comma-separated)')
    .option('-n, --next <items>', 'What comes next (comma-separated)')
    .option('-d, --decisions <items>', 'Key decisions made (comma-separated)')
    .option('-q, --questions <items>', 'Open questions (comma-separated)')
    .option('-f, --feeling <state>', 'Emotional/energy state')
    .option('-s, --session <key>', 'Session key')
    .option('-v, --vault <path>', 'Vault path')
    .option('--no-index', 'Skip qmd index update (auto-updates by default)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const vault = await getVault(options.vault);

        const handoff = {
          workingOn: options.workingOn.split(',').map((item) => item.trim()),
          blocked: options.blocked ? options.blocked.split(',').map((item) => item.trim()) : [],
          nextSteps: options.next ? options.next.split(',').map((item) => item.trim()) : [],
          decisions: options.decisions ? options.decisions.split(',').map((item) => item.trim()) : undefined,
          openQuestions: options.questions ? options.questions.split(',').map((item) => item.trim()) : undefined,
          feeling: options.feeling,
          sessionKey: options.session
        };

        const doc = await vault.createHandoff(handoff);

        if (!options.json) {
          console.log(chalk.green(`✓ Handoff created: ${doc.id}`));
          console.log(chalk.dim(`  Path: ${doc.path}`));
        }

        if (options.index !== false) {
          const collection = vault.getQmdCollection();
          await runQmd(collection ? ['update', '-c', collection] : ['update']);
        }

        if (options.json) {
          console.log(JSON.stringify({ id: doc.id, path: doc.path, handoff }, null, 2));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === RECAP (session bootstrap) ===
  program
    .command('recap')
    .description('Generate a session recap - who I was (bootstrap hook)')
    .option('-n, --handoff-limit <n>', 'Number of recent handoffs to include (default: 3)', '3')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .option('--markdown', 'Output as markdown (default)')
    .option('--brief', 'Minimal output for token savings')
    .action(async (options) => {
      try {
        const vault = await getVault(options.vault);

        const recap = await vault.generateRecap({
          handoffLimit: parseInt(options.handoffLimit, 10),
          brief: options.brief
        });

        if (options.json) {
          console.log(JSON.stringify(recap, null, 2));
          return;
        }

        const markdown = vault.formatRecap(recap, { brief: options.brief });
        console.log(markdown);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

/**
 * Maintenance and graph-oriented command registrations.
 * Split from the main CLI entrypoint to keep bin/clawvault.js maintainable.
 */

export function registerMaintenanceCommands(program, { chalk }) {
  // === DOCTOR (health check) ===
  program
    .command('doctor')
    .description('Diagnose vault health and optionally apply fixes')
    .option('-v, --vault <path>', 'Vault path')
    .option('--fix', 'Apply safe auto-fixes for qmd index, embeddings, and dead collections')
    .option('--json', 'Output machine-readable JSON')
    .action(async (options) => {
      try {
        const { doctor } = await import('../dist/commands/doctor.js');
        const report = await doctor({
          vaultPath: options.vault,
          fix: options.fix
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        console.log(chalk.cyan('\n🩺 ClawVault Health Check\n'));
        console.log(chalk.dim(`Vault: ${report.vaultPath}`));
        console.log(chalk.dim(`qmd collection: ${report.qmdCollection}`));
        console.log(chalk.dim(`qmd root: ${report.qmdRoot}`));
        console.log();

        for (const check of report.checks) {
          const prefix = check.status === 'ok'
            ? chalk.green('✓')
            : check.status === 'warn'
              ? chalk.yellow('⚠')
              : chalk.red('✗');
          const line = `${check.label}: ${check.detail}`;
          const renderedLine = check.status === 'ok'
            ? chalk.green(line)
            : check.status === 'warn'
              ? chalk.yellow(line)
              : chalk.red(line);
          console.log(`${prefix} ${renderedLine}`);
          if (check.hint) {
            console.log(chalk.dim(`  ${check.hint}`));
          }
        }

        const issues = report.warnings + report.errors;
        console.log();
        if (issues === 0) {
          console.log(chalk.green('✅ ClawVault is healthy!\n'));
        } else {
          const summary = `${report.errors} error(s), ${report.warnings} warning(s)`;
          const colorized = report.errors > 0 ? chalk.red(summary) : chalk.yellow(summary);
          console.log(`${report.errors > 0 ? '✗' : '⚠'} ${colorized}\n`);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === EMBED ===
  program
    .command('embed')
    .description('Run qmd embedding for pending vault documents')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { embedCommand } = await import('../dist/commands/embed.js');
        await embedCommand({
          vaultPath: options.vault
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === COMPAT (OpenClaw compatibility) ===
  program
    .command('compat')
    .description('Check OpenClaw compatibility status')
    .option('--strict', 'Exit non-zero when warnings are present')
    .option('--base-dir <path>', 'Validate compatibility against alternate project root')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { compatCommand, compatibilityExitCode } = await import('../dist/commands/compat.js');
        const report = await compatCommand({
          json: options.json,
          strict: options.strict,
          baseDir: options.baseDir
        });
        const exitCode = compatibilityExitCode(report, { strict: options.strict });
        if (exitCode !== 0) {
          process.exitCode = exitCode;
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === GRAPH ===
  program
    .command('graph')
    .description('Show typed memory graph summary')
    .option('-v, --vault <path>', 'Vault path')
    .option('--refresh', 'Rebuild graph index before showing summary')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { graphCommand } = await import('../dist/commands/graph.js');
        await graphCommand({
          vaultPath: options.vault,
          refresh: options.refresh,
          json: options.json
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === ENTITIES ===
  program
    .command('entities')
    .description('List all linkable entities in the vault')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { entitiesCommand } = await import('../dist/commands/entities.js');
        await entitiesCommand({ json: options.json, vaultPath: options.vault });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === LINK ===
  program
    .command('link [file]')
    .description('Auto-link entity mentions in markdown files')
    .option('--all', 'Link all files in vault')
    .option('--backlinks <file>', 'Show backlinks to a file')
    .option('--dry-run', 'Show what would be linked without changing files')
    .option('--orphans', 'List broken wiki-links')
    .option('--rebuild', 'Rebuild backlinks index')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (file, options) => {
      try {
        const { linkCommand } = await import('../dist/commands/link.js');
        await linkCommand(file, {
          all: options.all,
          dryRun: options.dryRun,
          backlinks: options.backlinks,
          orphans: options.orphans,
          rebuild: options.rebuild,
          vaultPath: options.vault
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === REBUILD ===
  program
    .command('rebuild')
    .description('Rebuild observations from ledger/raw transcripts')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { rebuildCommand } = await import('../dist/commands/rebuild.js');
        await rebuildCommand({
          vaultPath: options.vault,
          from: options.from,
          to: options.to
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === ARCHIVE ===
  program
    .command('archive')
    .description('Archive old observations into ledger/archive')
    .option('--older-than <days>', 'Archive observations older than this many days (default: 14)', '14')
    .option('--dry-run', 'Show archive candidates without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { archiveCommand } = await import('../dist/commands/archive.js');
        const olderThan = Number.parseInt(options.olderThan, 10);
        if (!Number.isFinite(olderThan) || olderThan <= 0) {
          throw new Error(`Invalid --older-than value: ${options.olderThan}`);
        }
        await archiveCommand({
          vaultPath: options.vault,
          olderThan,
          dryRun: options.dryRun
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === MIGRATE-OBSERVATIONS ===
  program
    .command('migrate-observations')
    .description('Convert legacy emoji observations to scored format')
    .option('--dry-run', 'Show migration candidates without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { migrateObservationsCommand } = await import('../dist/commands/migrate-observations.js');
        await migrateObservationsCommand({
          vaultPath: options.vault,
          dryRun: options.dryRun
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === REPLAY ===
  program
    .command('replay')
    .description('Replay historical conversation exports through observe pipeline')
    .requiredOption('--source <platform>', 'Source platform (chatgpt|claude|opencode|openclaw)')
    .requiredOption('--input <path>', 'Input export file or directory')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--dry-run', 'Preview replay candidates without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { replayCommand } = await import('../dist/commands/replay.js');
        await replayCommand({
          source: options.source,
          inputPath: options.input,
          from: options.from,
          to: options.to,
          dryRun: options.dryRun,
          vaultPath: options.vault
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === SYNC-BD ===
  program
    .command('sync-bd')
    .description('Sync active Beads tasks into views/now.md (optional)')
    .option('--dry-run', 'Show sync output without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { syncBdCommand } = await import('../dist/commands/sync-bd.js');
        await syncBdCommand({
          vaultPath: options.vault,
          dryRun: options.dryRun
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

/**
 * Vault operation command registrations (browse/sync/reindex/remember/shell-init/dashboard).
 */

import { validatePathWithinBase } from './command-runtime.js';

export function registerVaultOperationsCommands(
  program,
  {
    chalk,
    fs,
    getVault,
    runQmd,
    resolveVaultPath,
    path
  }
) {
  // === LIST ===
  program
    .command('list [category]')
    .description('List vault documents (optionally filtered by category)')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (category, options) => {
      try {
        const vault = await getVault(options.vault);
        const docs = await vault.list(category);

        if (options.json) {
          console.log(JSON.stringify(docs.map((doc) => ({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            tags: doc.tags,
            modified: doc.modified
          })), null, 2));
          return;
        }

        if (docs.length === 0) {
          console.log(chalk.yellow('No documents found.'));
          return;
        }

        console.log(chalk.cyan(`\n📚 ${docs.length} document(s)${category ? ` in ${category}` : ''}:\n`));

        const grouped = {};
        for (const doc of docs) {
          grouped[doc.category] = grouped[doc.category] || [];
          grouped[doc.category].push(doc);
        }

        for (const [cat, catDocs] of Object.entries(grouped)) {
          console.log(chalk.yellow(`${cat}/`));
          for (const doc of catDocs) {
            console.log(chalk.dim(`  - ${doc.title}`));
          }
        }
        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === GET ===
  program
    .command('get <id>')
    .description('Get a document by ID')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const vault = await getVault(options.vault);
        const doc = await vault.get(id);

        if (!doc) {
          console.error(chalk.red(`Document not found: ${id}`));
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(doc, null, 2));
          return;
        }

        console.log(chalk.cyan(`\n📄 ${doc.title}\n`));
        console.log(chalk.dim(`Category: ${doc.category}`));
        console.log(chalk.dim(`Path: ${doc.path}`));
        console.log(chalk.dim(`Tags: ${doc.tags.join(', ') || 'none'}`));
        console.log(chalk.dim(`Links: ${doc.links.join(', ') || 'none'}`));
        console.log(chalk.dim(`Modified: ${doc.modified.toISOString()}`));
        console.log(chalk.dim('---'));
        console.log(doc.content);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === STATS ===
  program
    .command('stats')
    .description('Show vault statistics')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const vault = await getVault(options.vault);
        const stats = await vault.stats();

        if (options.json) {
          console.log(JSON.stringify(stats, null, 2));
          return;
        }

        console.log(chalk.cyan(`\n🐘 ${vault.getName()} Stats\n`));
        console.log(chalk.dim(`Path: ${vault.getPath()}`));
        console.log(`Documents: ${chalk.green(stats.documents)}`);
        console.log(`Links: ${chalk.blue(stats.links)}`);
        console.log(`Tags: ${chalk.yellow(stats.tags.length)}`);
        console.log();
        console.log(chalk.dim('By category:'));
        for (const [cat, count] of Object.entries(stats.categories)) {
          console.log(chalk.dim(`  ${cat}: ${count}`));
        }
        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === SYNC ===
  program
    .command('sync <target>')
    .description('Sync vault files to a target path')
    .option('--delete', 'Delete orphan files in target')
    .option('--dry-run', 'Show what would be synced without syncing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (target, options) => {
      try {
        const vault = await getVault(options.vault);
        console.log(chalk.cyan(`\n🔄 Syncing to ${target}...\n`));

        const result = await vault.sync({
          target,
          deleteOrphans: options.delete,
          dryRun: options.dryRun
        });

        if (options.dryRun) {
          console.log(chalk.yellow('DRY RUN - no changes made\n'));
        }

        if (result.copied.length > 0) {
          console.log(chalk.green(`Copied: ${result.copied.length} files`));
          for (const filePath of result.copied.slice(0, 5)) {
            console.log(chalk.dim(`  + ${filePath}`));
          }
          if (result.copied.length > 5) {
            console.log(chalk.dim(`  ... and ${result.copied.length - 5} more`));
          }
        }

        if (result.deleted.length > 0) {
          console.log(chalk.red(`Deleted: ${result.deleted.length} files`));
        }

        if (result.unchanged.length > 0) {
          console.log(chalk.dim(`Unchanged: ${result.unchanged.length} files`));
        }

        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          for (const error of result.errors) {
            console.log(chalk.red(`  ${error}`));
          }
        }

        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === REINDEX ===
  program
    .command('reindex')
    .description('Rebuild the search index')
    .option('-v, --vault <path>', 'Vault path')
    .option('--qmd', 'Also update qmd embeddings')
    .action(async (options) => {
      try {
        const vault = await getVault(options.vault);
        console.log(chalk.cyan('\n🔄 Reindexing...\n'));

        const count = await vault.reindex();
        console.log(chalk.green(`✓ Indexed ${count} documents`));

        if (options.qmd) {
          console.log(chalk.cyan('Updating qmd embeddings...'));
          const collection = vault.getQmdCollection();
          await runQmd(collection ? ['update', '-c', collection] : ['update']);
          console.log(chalk.green('✓ qmd updated'));
        }

        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === REMEMBER ===
  program
    .command('remember <type> <title>')
    .description('Store a typed memory (fact|feeling|decision|lesson|commitment|preference|relationship|project)')
    .option('--content <content>', 'Content body')
    .option('-f, --file <file>', 'Read content from file (validated against current working directory)')
    .option('--stdin', 'Read content from stdin')
    .option('-v, --vault <path>', 'Vault path')
    .option('--no-index', 'Skip qmd index update (auto-updates by default)')
    .action(async (type, title, options) => {
      const validTypes = ['fact', 'feeling', 'decision', 'lesson', 'commitment', 'preference', 'relationship', 'project'];
      if (!validTypes.includes(type)) {
        console.error(chalk.red(`Invalid type: ${type}`));
        console.error(chalk.dim(`Valid types: ${validTypes.join(', ')}`));
        process.exit(1);
      }

      try {
        const vault = await getVault(options.vault);
        let content = options.content || '';
        if (options.file) {
          // Validate file path is within current working directory to prevent path traversal
          const cwd = process.cwd();
          const resolvedFilePath = validatePathWithinBase(options.file, cwd);
          content = fs.readFileSync(resolvedFilePath, 'utf-8');
        } else if (options.stdin) {
          content = fs.readFileSync(0, 'utf-8');
        }

        const doc = await vault.remember(type, title, content);
        console.log(chalk.green(`✓ Remembered (${type}): ${doc.id}`));

        if (options.index !== false) {
          const collection = vault.getQmdCollection();
          await runQmd(collection ? ['update', '-c', collection] : ['update']);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === SHELL INIT ===
  program
    .command('shell-init')
    .description('Output shell integration for ClawVault')
    .action(async () => {
      try {
        const { shellInit } = await import('../dist/commands/shell-init.js');
        console.log(shellInit());
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === DASHBOARD ===
  program
    .command('dashboard')
    .description('Run the local vault graph dashboard server')
    .option('-p, --port <port>', 'Dashboard port (default: 3377)', '3377')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const parsedPort = Number.parseInt(options.port, 10);
        if (Number.isNaN(parsedPort)) {
          console.error(chalk.red(`Error: Invalid port: ${options.port}`));
          process.exit(1);
        }

        const vaultPath = options.vault
          ? path.resolve(options.vault)
          : resolveVaultPath(undefined);

        const { startDashboard } = await import('../dashboard/server.js');
        await startDashboard({
          port: parsedPort,
          vaultPath
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

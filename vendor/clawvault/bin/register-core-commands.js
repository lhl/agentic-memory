/**
 * Core vault lifecycle and write command registrations.
 */

import { validatePathWithinBase } from './command-runtime.js';

export function registerCoreCommands(
  program,
  { chalk, path, fs, createVault, getVault, runQmd }
) {
  // === INIT ===
  program
    .command('init [path]')
    .description('Initialize a new ClawVault vault')
    .option('-n, --name <name>', 'Vault name (default: target directory name)')
    .option('--qmd', 'Set up qmd semantic search collection')
    .option('--qmd-collection <name>', 'qmd collection name (defaults to vault name)')
    .option('--no-bases', 'Skip Obsidian Bases file generation')
    .option('--no-tasks', 'Skip tasks/ and backlog/ directories')
    .option('--no-graph', 'Skip initial graph build')
    .option('--categories <list>', 'Comma-separated list of custom categories to create')
    .option('--canvas', 'Generate a vault status canvas dashboard on init')
    .option('--theme <style>', 'Graph color theme to apply (neural, minimal, none) (default: none)', 'none')
    .option('--minimal', 'Create minimal vault (memory categories only, no tasks/bases/graph)')
    .action(async (vaultPath, options) => {
      const targetPath = vaultPath || '.';
      const resolvedPath = path.resolve(targetPath);
      console.log(chalk.cyan(`\n🐘 Initializing ClawVault at ${resolvedPath}...\n`));

      // Check for existing vault
      const existingConfig = path.join(resolvedPath, '.clawvault.json');
      if (fs.existsSync(existingConfig)) {
        console.error(chalk.red(`Error: A ClawVault already exists at ${resolvedPath}`));
        console.error(chalk.dim('  Use --force to reinitialize (not yet supported) or choose a different path.'));
        process.exit(1);
      }

      try {
        // Resolve --minimal shorthand
        const isMinimal = !!options.minimal;
        const skipBases = isMinimal || options.bases === false;
        const skipTasks = isMinimal || !!options.noTasks;
        const skipGraph = isMinimal || !!options.noGraph;

        // Resolve custom categories
        const { DEFAULT_CATEGORIES } = await import('../dist/index.js');
        let categories = [...DEFAULT_CATEGORIES];
        if (options.categories) {
          const customCats = options.categories.split(',').map(c => c.trim()).filter(Boolean);
          categories = customCats;
        }

        const vault = await createVault(targetPath, {
          name: options.name || path.basename(resolvedPath),
          qmdCollection: options.qmdCollection,
          categories
        }, { skipBases, skipTasks, skipGraph });

        const vaultCategories = vault.getCategories();
        const memoryCategories = vaultCategories.filter(c => !['templates', 'tasks', 'backlog'].includes(c));
        const workCategories = vaultCategories.filter(c => ['tasks', 'backlog'].includes(c));

        console.log(chalk.green('✓ Vault created'));
        console.log(chalk.dim(`  Memory:  ${memoryCategories.join(', ')}`));
        if (workCategories.length > 0) {
          console.log(chalk.dim(`  Work:    ${workCategories.join(', ')}`));
        }
        console.log(chalk.dim(`  Ledger:  ledger/raw, ledger/observations, ledger/reflections`));
        if (skipBases) console.log(chalk.dim('  Bases:   skipped'));
        if (skipGraph) console.log(chalk.dim('  Graph:   skipped'));

        console.log(chalk.cyan('\nSetting up qmd collection...'));
        try {
          await runQmd([
            'collection',
            'add',
            vault.getQmdRoot(),
            '--name',
            vault.getQmdCollection(),
            '--mask',
            '**/*.md'
          ]);
          console.log(chalk.green('✓ qmd collection created'));
        } catch {
          console.log(chalk.yellow('⚠ qmd collection may already exist'));
        }

        // Apply theme if requested
        if (options.theme && options.theme !== 'none') {
          try {
            const { setupCommand } = await import('../dist/commands/setup.js');
            await setupCommand({
              graphColors: true,
              bases: false,
              canvas: false,
              theme: options.theme,
              vault: resolvedPath
            });
          } catch {
            console.log(chalk.yellow(`⚠ Could not apply ${options.theme} theme`));
          }
        }

        // Generate canvas if requested
        if (options.canvas) {
          try {
            const { setupCommand } = await import('../dist/commands/setup.js');
            await setupCommand({
              graphColors: false,
              bases: false,
              canvas: true,
              theme: 'none',
              vault: resolvedPath
            });
          } catch {
            console.log(chalk.yellow(`⚠ Could not generate canvas`));
          }
        }

        console.log(chalk.green('\n✅ ClawVault ready!\n'));
        console.log('  ' + chalk.bold('Try these:'));
        console.log(chalk.dim('  clawvault capture "my first thought"     # quick capture'));
        console.log(chalk.dim('  clawvault graph                          # see your knowledge graph'));
        console.log(chalk.dim('  clawvault context "topic"                # graph-aware context'));
        console.log(chalk.dim('  clawvault checkpoint --working-on "task"  # save progress'));
        console.log();
        console.log(chalk.dim('  Full docs: https://docs.clawvault.dev'));
        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === SETUP ===
  program
    .command('setup')
    .description('Auto-discover and configure an existing ClawVault vault')
    .option('--graph-colors', 'Set up graph color scheme for Obsidian')
    .option('--no-graph-colors', 'Skip graph color configuration')
    .option('--bases', 'Generate Obsidian Bases views for task management')
    .option('--no-bases', 'Skip Bases file generation')
    .option('--canvas', 'Generate vault status canvas dashboard')
    .option('--no-canvas', 'Skip canvas generation')
    .option('--theme <style>', 'Graph color theme (neural, minimal, none) (default: neural)', 'neural')
    .option('--force', 'Overwrite existing configuration files')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { setupCommand } = await import('../dist/commands/setup.js');
        await setupCommand({
          graphColors: options.graphColors,
          bases: options.bases,
          canvas: options.canvas,
          theme: options.theme,
          force: options.force,
          vault: options.vault
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === STORE ===
  program
    .command('store')
    .description('Store a new memory document')
    .requiredOption('-c, --category <category>', 'Category (preferences, decisions, patterns, people, projects, goals, transcripts, inbox)')
    .requiredOption('-t, --title <title>', 'Document title')
    .option('--content <content>', 'Content body')
    .option('-f, --file <file>', 'Read content from file (validated against current working directory)')
    .option('--stdin', 'Read content from stdin')
    .option('--overwrite', 'Overwrite if exists')
    .option('--no-index', 'Skip qmd index update (auto-updates by default)')
    .option('--embed', 'Also update qmd embeddings for vector search')
    .option('-v, --vault <path>', 'Vault path (default: find nearest)')
    .action(async (options) => {
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

        const doc = await vault.store({
          category: options.category,
          title: options.title,
          content,
          overwrite: options.overwrite
        });

        console.log(chalk.green(`✓ Stored: ${doc.id}`));
        console.log(chalk.dim(`  Path: ${doc.path}`));

        if (options.index !== false) {
          const collection = vault.getQmdCollection();
          await runQmd(collection ? ['update', '-c', collection] : ['update']);
          if (options.embed) {
            await runQmd(collection ? ['embed', '-c', collection] : ['embed']);
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === CAPTURE ===
  program
    .command('capture <note>')
    .description('Quick-capture a note to inbox')
    .option('-t, --title <title>', 'Note title')
    .option('-v, --vault <path>', 'Vault path')
    .option('--no-index', 'Skip qmd index update (auto-updates by default)')
    .action(async (note, options) => {
      try {
        const vault = await getVault(options.vault);
        const doc = await vault.capture(note, options.title);
        console.log(chalk.green(`✓ Captured: ${doc.id}`));

        if (options.index !== false) {
          const collection = vault.getQmdCollection();
          await runQmd(collection ? ['update', '-c', collection] : ['update']);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

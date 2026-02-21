/**
 * Kanban command registrations for ClawVault.
 */

export function registerKanbanCommands(
  program,
  { chalk, resolveVaultPath }
) {
  const kanbanCmd = program
    .command('kanban')
    .description('Manage Obsidian Kanban sync for task frontmatter');

  kanbanCmd
    .command('sync')
    .description('Generate and sync an Obsidian Kanban board from tasks')
    .option('-v, --vault <path>', 'Vault path (default: find nearest)')
    .option('--output <path>', 'Board markdown path (default: Board.md)')
    .option('--group-by <field>', 'Grouping field (status, priority, project, owner) (default: status)')
    .option('--filter-project <project>', 'Only include tasks from a project')
    .option('--filter-owner <owner>', 'Only include tasks for an owner')
    .option('--include-done', 'Include done tasks (default: hidden)')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { kanbanCommand } = await import('../dist/commands/kanban.js');
        await kanbanCommand(vaultPath, 'sync', {
          output: options.output,
          groupBy: options.groupBy,
          filterProject: options.filterProject,
          filterOwner: options.filterOwner,
          includeDone: options.includeDone
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  kanbanCmd
    .command('import')
    .description('Import lane state from an Obsidian Kanban board into tasks')
    .option('-v, --vault <path>', 'Vault path (default: find nearest)')
    .option('--output <path>', 'Board markdown path (default: Board.md)')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { kanbanCommand } = await import('../dist/commands/kanban.js');
        await kanbanCommand(vaultPath, 'import', {
          output: options.output
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

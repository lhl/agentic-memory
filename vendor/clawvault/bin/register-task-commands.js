/**
 * Task tracking command registrations for ClawVault
 * Registers task, backlog, blocked, and canvas commands
 */

function parseCsvList(value) {
  if (!value) return undefined;
  const items = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function clearableValue(value, shouldClear) {
  if (shouldClear) return null;
  return value;
}

export function registerTaskCommands(
  program,
  { chalk, resolveVaultPath }
) {
  // === TASK ===
  const taskCmd = program
    .command('task')
    .description('Manage tasks');

  // task add
  taskCmd
    .command('add <title>')
    .description('Add a new task')
    .option('-v, --vault <path>', 'Vault path')
    .option('--owner <owner>', 'Task owner')
    .option('--project <project>', 'Project name')
    .option('--priority <priority>', 'Priority (critical, high, medium, low)')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--description <description>', 'One-line task summary')
    .option('--estimate <estimate>', 'Estimate (for example: 2h, 1d, 1w)')
    .option('--parent <slug>', 'Parent task slug')
    .option('--depends-on <slugs>', 'Comma-separated dependency slugs')
    .action(async (title, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'add', {
          title,
          options: {
            owner: options.owner,
            project: options.project,
            priority: options.priority,
            due: options.due,
            tags: parseCsvList(options.tags),
            description: options.description,
            estimate: options.estimate,
            parent: options.parent,
            dependsOn: parseCsvList(options.dependsOn)
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // task list
  taskCmd
    .command('list')
    .description('List tasks with optional filters')
    .option('-v, --vault <path>', 'Vault path')
    .option('--owner <owner>', 'Filter by owner')
    .option('--project <project>', 'Filter by project')
    .option('--status <status>', 'Filter by status (open, in-progress, blocked, done)')
    .option('--priority <priority>', 'Filter by priority')
    .option('--due', 'Show only tasks with due dates (sorted by due date)')
    .option('--tag <tag>', 'Filter by tag')
    .option('--overdue', 'Show overdue tasks that are not done')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'list', {
          options: {
            owner: options.owner,
            project: options.project,
            status: options.status,
            priority: options.priority,
            due: options.due,
            tag: options.tag,
            overdue: options.overdue,
            json: options.json
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // task update
  taskCmd
    .command('update <slug>')
    .description('Update a task')
    .option('-v, --vault <path>', 'Vault path')
    .option('--status <status>', 'New status')
    .option('--owner <owner>', 'New owner')
    .option('--clear-owner', 'Clear owner')
    .option('--project <project>', 'New project')
    .option('--clear-project', 'Clear project')
    .option('--priority <priority>', 'New priority')
    .option('--clear-priority', 'Clear priority')
    .option('--blocked-by <blocker>', 'What is blocking this task')
    .option('--clear-blocked-by', 'Clear blocked-by field')
    .option('--due <date>', 'New due date')
    .option('--clear-due', 'Clear due date')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--clear-tags', 'Clear tags')
    .option('--description <description>', 'One-line task summary')
    .option('--clear-description', 'Clear description')
    .option('--estimate <estimate>', 'Estimate (for example: 2h, 1d, 1w)')
    .option('--clear-estimate', 'Clear estimate')
    .option('--parent <slug>', 'Parent task slug')
    .option('--clear-parent', 'Clear parent task')
    .option('--depends-on <slugs>', 'Comma-separated dependency slugs')
    .option('--clear-depends-on', 'Clear dependencies')
    .option('--confidence <value>', 'Transition confidence (0-1)', parseFloat)
    .option('--reason <reason>', 'Reason for status change')
    .option('--clear-reason', 'Clear reason')
    .action(async (slug, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'update', {
          slug,
          options: {
            status: options.status,
            owner: clearableValue(options.owner, options.clearOwner),
            project: clearableValue(options.project, options.clearProject),
            priority: clearableValue(options.priority, options.clearPriority),
            blockedBy: clearableValue(options.blockedBy, options.clearBlockedBy),
            due: clearableValue(options.due, options.clearDue),
            tags: options.clearTags ? null : parseCsvList(options.tags),
            description: clearableValue(options.description, options.clearDescription),
            estimate: clearableValue(options.estimate, options.clearEstimate),
            parent: clearableValue(options.parent, options.clearParent),
            dependsOn: options.clearDependsOn ? null : parseCsvList(options.dependsOn),
            confidence: options.confidence,
            reason: clearableValue(options.reason, options.clearReason)
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // task done
  taskCmd
    .command('done <slug>')
    .description('Mark a task as done')
    .option('-v, --vault <path>', 'Vault path')
    .option('--confidence <value>', 'Transition confidence (0-1)', parseFloat)
    .option('--reason <reason>', 'Reason for completion')
    .action(async (slug, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'done', {
          slug,
          options: {
            confidence: options.confidence,
            reason: options.reason
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // task transitions
  taskCmd
    .command('transitions [task_id]')
    .description('Show transition history')
    .option('-v, --vault <path>', 'Vault path')
    .option('--agent <id>', 'Filter by agent')
    .option('--failed', 'Show only regression transitions')
    .option('--json', 'Output as JSON')
    .action(async (taskId, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'transitions', {
          slug: taskId,
          options: {
            agent: options.agent,
            failed: options.failed,
            json: options.json
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // task show
  taskCmd
    .command('show <slug>')
    .description('Show task details')
    .option('-v, --vault <path>', 'Vault path')
    .option('--json', 'Output as JSON')
    .action(async (slug, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { taskCommand } = await import('../dist/commands/task.js');
        await taskCommand(vaultPath, 'show', {
          slug,
          options: { json: options.json }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === BACKLOG ===
  const backlogCmd = program
    .command('backlog')
    .description('Manage backlog items');

  // backlog add (also supports "backlog <title>" shorthand)
  backlogCmd
    .command('add <title>')
    .description('Add item to backlog')
    .option('-v, --vault <path>', 'Vault path')
    .option('--source <source>', 'Source of the idea')
    .option('--project <project>', 'Project name')
    .action(async (title, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { backlogCommand } = await import('../dist/commands/backlog.js');
        await backlogCommand(vaultPath, 'add', {
          title,
          options: {
            source: options.source,
            project: options.project
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // backlog list
  backlogCmd
    .command('list')
    .description('List backlog items')
    .option('-v, --vault <path>', 'Vault path')
    .option('--project <project>', 'Filter by project')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { backlogCommand } = await import('../dist/commands/backlog.js');
        await backlogCommand(vaultPath, 'list', {
          options: {
            project: options.project,
            json: options.json
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // backlog promote
  backlogCmd
    .command('promote <slug>')
    .description('Promote backlog item to task')
    .option('-v, --vault <path>', 'Vault path')
    .option('--owner <owner>', 'Task owner')
    .option('--priority <priority>', 'Task priority')
    .option('--due <date>', 'Due date')
    .action(async (slug, options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { backlogCommand } = await import('../dist/commands/backlog.js');
        await backlogCommand(vaultPath, 'promote', {
          slug,
          options: {
            owner: options.owner,
            priority: options.priority,
            due: options.due
          }
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === BLOCKED ===
  program
    .command('blocked')
    .description('View blocked tasks')
    .option('-v, --vault <path>', 'Vault path')
    .option('--project <project>', 'Filter by project')
    .option('--escalated', 'Show only escalated tasks (3+ blocked transitions)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { blockedCommand } = await import('../dist/commands/blocked.js');
        await blockedCommand(vaultPath, {
          project: options.project,
          escalated: options.escalated,
          json: options.json
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === CANVAS ===
  program
    .command('canvas')
    .description('Generate an Obsidian canvas dashboard file')
    .option('-v, --vault <path>', 'Vault path (default: find nearest)')
    .option('--output <path>', 'Output file path (default: dashboard.canvas)')
    .action(async (options) => {
      try {
        const vaultPath = resolveVaultPath(options.vault);
        const { canvasCommand } = await import('../dist/commands/canvas.js');
        await canvasCommand(vaultPath, {
          output: options.output
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

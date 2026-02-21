/**
 * Route command registrations for custom observation entity routing.
 */

function printRoutesTable(routes) {
  if (routes.length === 0) {
    console.log('No custom routes configured.');
    return;
  }

  const priorityWidth = Math.max(
    'PRIORITY'.length,
    ...routes.map((route) => String(route.priority).length)
  );
  const patternWidth = Math.max(
    'PATTERN'.length,
    ...routes.map((route) => route.pattern.length)
  );
  const targetWidth = Math.max(
    'TARGET'.length,
    ...routes.map((route) => route.target.length)
  );

  const header = `${'PRIORITY'.padEnd(priorityWidth)}  ${'PATTERN'.padEnd(patternWidth)}  ${'TARGET'.padEnd(targetWidth)}`;
  const divider = `${'-'.repeat(priorityWidth)}  ${'-'.repeat(patternWidth)}  ${'-'.repeat(targetWidth)}`;

  console.log(header);
  console.log(divider);
  for (const route of routes) {
    console.log(
      `${String(route.priority).padEnd(priorityWidth)}  ${route.pattern.padEnd(patternWidth)}  ${route.target}`
    );
  }
}

export function registerRouteCommands(program, { chalk, resolveVaultPath }) {
  const route = program
    .command('route')
    .description('Manage custom observation routing rules');

  route
    .command('list')
    .description('List custom routing rules')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { listRouteRules } = await import('../dist/index.js');
        const rules = listRouteRules(resolveVaultPath(options.vault));
        printRoutesTable(rules);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  route
    .command('add <pattern> <target>')
    .description('Add a custom routing rule')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (pattern, target, options) => {
      try {
        const { addRouteRule } = await import('../dist/index.js');
        const rule = addRouteRule(resolveVaultPath(options.vault), pattern, target);
        console.log(chalk.green('✓ Route added'));
        console.log(chalk.dim(`  Pattern: ${rule.pattern}`));
        console.log(chalk.dim(`  Target: ${rule.target}`));
        console.log(chalk.dim(`  Priority: ${rule.priority}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  route
    .command('remove <pattern>')
    .description('Remove a custom routing rule by pattern')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (pattern, options) => {
      try {
        const { removeRouteRule } = await import('../dist/index.js');
        const removed = removeRouteRule(resolveVaultPath(options.vault), pattern);
        if (!removed) {
          console.log(chalk.yellow(`No route found for pattern: ${pattern}`));
          return;
        }
        console.log(chalk.green(`✓ Removed route: ${pattern}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  route
    .command('test <text>')
    .description('Test custom routes against text')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (text, options) => {
      try {
        const { testRouteRule } = await import('../dist/index.js');
        const match = testRouteRule(resolveVaultPath(options.vault), text);
        if (!match) {
          console.log('No route matched.');
          return;
        }
        console.log(chalk.green('✓ Route matched'));
        console.log(chalk.dim(`  Pattern: ${match.pattern}`));
        console.log(chalk.dim(`  Target: ${match.target}`));
        console.log(chalk.dim(`  Priority: ${match.priority}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

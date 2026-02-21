/**
 * Template command registrations split from main CLI entrypoint.
 */

export function registerTemplateCommands(program, { chalk }) {
  const template = program
    .command('template')
    .description('Manage document templates');

  template
    .command('list')
    .description('List available templates')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { listTemplateDefinitions } = await import('../dist/commands/template.js');
        const templates = listTemplateDefinitions({ vaultPath: options.vault });
        if (templates.length === 0) {
          console.log(chalk.yellow('No templates found.'));
          return;
        }
        console.log(chalk.cyan('\n📄 Templates:\n'));
        for (const templateDef of templates) {
          const fieldSummary = templateDef.fields.length > 0
            ? ` (${templateDef.fields.join(', ')})`
            : '';
          console.log(`- ${templateDef.name}${fieldSummary}`);
        }
        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  template
    .command('create <name>')
    .description('Create a file from a template')
    .option('-t, --title <title>', 'Document title')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (name, options) => {
      try {
        const { createFromTemplate } = await import('../dist/commands/template.js');
        const result = createFromTemplate(name, {
          title: options.title,
          vaultPath: options.vault
        });
        console.log(chalk.green(`✓ Created from template: ${name}`));
        console.log(chalk.dim(`  Output: ${result.outputPath}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  template
    .command('add <file>')
    .description('Add a custom template')
    .requiredOption('--name <name>', 'Template name')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (file, options) => {
      try {
        const { addTemplate } = await import('../dist/commands/template.js');
        const result = addTemplate(file, {
          name: options.name,
          vaultPath: options.vault
        });
        console.log(chalk.green(`✓ Template added: ${result.name}`));
        console.log(chalk.dim(`  Path: ${result.templatePath}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

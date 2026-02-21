/**
 * Runtime config command registrations backed by .clawvault.json.
 */

function stringifyValue(value) {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      return value.join(', ');
    }
    return JSON.stringify(value);
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) {
    return '(unset)';
  }
  return String(value);
}

function flattenConfig(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [{ key: prefix || '(root)', value: stringifyValue(value) }];
  }

  const rows = [];
  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key;
    const entry = value[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      rows.push(...flattenConfig(entry, next));
      continue;
    }
    rows.push({ key: next, value: stringifyValue(entry) });
  }
  return rows;
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('No config values found.');
    return;
  }
  const keyWidth = Math.max(
    'KEY'.length,
    ...rows.map((row) => row.key.length)
  );
  const valueWidth = Math.max(
    'VALUE'.length,
    ...rows.map((row) => row.value.length)
  );
  const header = `${'KEY'.padEnd(keyWidth)}  ${'VALUE'.padEnd(valueWidth)}`;
  const divider = `${'-'.repeat(keyWidth)}  ${'-'.repeat(valueWidth)}`;
  console.log(header);
  console.log(divider);
  for (const row of rows) {
    console.log(`${row.key.padEnd(keyWidth)}  ${row.value}`);
  }
}

function normalizeConfigKey(key) {
  return String(key || '').trim();
}

export function registerConfigCommands(program, { chalk, resolveVaultPath }) {
  const config = program
    .command('config')
    .description('Read and modify runtime configuration');

  config
    .command('get <key>')
    .description('Read a runtime config value (dot-notation supported)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (key, options) => {
      try {
        const { getConfigValue, SUPPORTED_CONFIG_KEYS } = await import('../dist/index.js');
        const normalizedKey = normalizeConfigKey(key);
        if (!SUPPORTED_CONFIG_KEYS.includes(normalizedKey)) {
          throw new Error(`Unsupported config key: ${normalizedKey}`);
        }

        const value = getConfigValue(resolveVaultPath(options.vault), normalizedKey);
        if (Array.isArray(value)) {
          console.log(value.join(','));
          return;
        }
        if (value && typeof value === 'object') {
          console.log(JSON.stringify(value, null, 2));
          return;
        }
        console.log(value === undefined || value === null ? '' : String(value));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  config
    .command('set <key> <value>')
    .description('Set a runtime config value')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (key, value, options) => {
      try {
        const { setConfigValue, SUPPORTED_CONFIG_KEYS } = await import('../dist/index.js');
        const normalizedKey = normalizeConfigKey(key);
        if (!SUPPORTED_CONFIG_KEYS.includes(normalizedKey)) {
          throw new Error(`Unsupported config key: ${normalizedKey}`);
        }
        const result = setConfigValue(resolveVaultPath(options.vault), normalizedKey, value);
        console.log(chalk.green(`✓ Updated ${normalizedKey}`));
        console.log(chalk.dim(`  Value: ${stringifyValue(result.value)}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  config
    .command('list')
    .description('List all config values')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        const { listConfig } = await import('../dist/index.js');
        const values = listConfig(resolveVaultPath(options.vault));
        const rows = flattenConfig(values);
        printTable(rows);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  config
    .command('reset')
    .description('Reset runtime config values to defaults')
    .option('--confirm', 'Confirm reset (required)')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (options) => {
      try {
        if (!options.confirm) {
          throw new Error('Refusing to reset config without --confirm.');
        }
        const { resetConfig } = await import('../dist/index.js');
        resetConfig(resolveVaultPath(options.vault));
        console.log(chalk.green('✓ Config reset to defaults'));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

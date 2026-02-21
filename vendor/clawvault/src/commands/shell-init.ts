import * as fs from 'fs';
import * as path from 'path';

function detectVaultPath(startPath: string): string | null {
  let current = path.resolve(startPath);
  while (true) {
    const configPath = path.join(current, '.clawvault.json');
    if (fs.existsSync(configPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface ShellInitOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export function shellInit(options: ShellInitOptions = {}): string {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const detected = env.CLAWVAULT_PATH || detectVaultPath(cwd);

  const lines: string[] = [];
  lines.push('# ClawVault shell integration');

  if (detected) {
    lines.push('if [ -z "$CLAWVAULT_PATH" ]; then');
    lines.push(`  export CLAWVAULT_PATH=${shellQuote(path.resolve(detected))}`);
    lines.push('fi');
  } else {
    lines.push('# Set CLAWVAULT_PATH to your vault directory:');
    lines.push('# export CLAWVAULT_PATH="/path/to/vault"');
  }

  lines.push("alias cvwake='clawvault wake'");
  lines.push("alias cvsleep='clawvault sleep'");
  lines.push("alias cvcheck='clawvault doctor'");

  return lines.join('\n');
}

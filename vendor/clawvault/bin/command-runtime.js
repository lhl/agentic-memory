import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import {
  ClawVault,
  QmdUnavailableError,
  QMD_INSTALL_COMMAND,
  resolveVaultPath as resolveConfiguredVaultPath
} from '../dist/index.js';

const QMD_INDEX_ENV_VAR = 'CLAWVAULT_QMD_INDEX';

/**
 * Validates that a path is within an allowed base directory.
 * Prevents path traversal attacks.
 * @param {string} inputPath - The path to validate
 * @param {string} basePath - The allowed base directory
 * @returns {string} The resolved, validated path
 * @throws {Error} If the path escapes the base directory
 */
export function validatePathWithinBase(inputPath, basePath) {
  const resolvedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(basePath, inputPath);

  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new Error(`Path traversal detected: ${inputPath} escapes ${basePath}`);
  }

  return resolvedPath;
}

/**
 * Sanitizes an argument that may contain a path to prevent injection.
 * @param {unknown} arg - The argument to sanitize
 * @returns {string} The sanitized argument
 */
export function sanitizeQmdArg(arg) {
  const normalizedArg = String(arg);
  // Reject arguments with null bytes (injection attempt)
  if (normalizedArg.includes('\0')) {
    throw new Error('Invalid argument: contains null byte');
  }
  return normalizedArg;
}

function withQmdIndex(args) {
  if (args.includes('--index')) {
    return [...args];
  }

  const indexName = process.env[QMD_INDEX_ENV_VAR]?.trim();
  if (!indexName) {
    return [...args];
  }

  return ['--index', indexName, ...args];
}

export function resolveVaultPath(vaultPath) {
  return resolveConfiguredVaultPath({ explicitPath: vaultPath });
}

export async function getVault(vaultPath) {
  const vault = new ClawVault(resolveVaultPath(vaultPath));
  await vault.load();
  return vault;
}

export async function runQmd(args) {
  return new Promise((resolve, reject) => {
    // Sanitize all arguments before passing to spawn
    const sanitizedArgs = withQmdIndex(args).map(sanitizeQmdArg);
    const proc = spawn('qmd', sanitizedArgs, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`qmd exited with code ${code}`));
    });
    proc.on('error', (err) => {
      if (err?.code === 'ENOENT') {
        reject(new QmdUnavailableError());
      } else {
        reject(err);
      }
    });
  });
}

export function printQmdMissing() {
  console.error(chalk.red('Error: ClawVault requires qmd.'));
  console.log(chalk.dim(`Install: ${QMD_INSTALL_COMMAND}`));
}

export { QmdUnavailableError };

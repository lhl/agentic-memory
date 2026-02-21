import { execFileSync, spawnSync } from 'child_process';

const QMD_INDEX_ENV_VAR = 'CLAWVAULT_QMD_INDEX';
const DEFAULT_TEST_QMD_INDEX = 'clawvault-test';

function hasQmdBinary(): boolean {
  const probe = spawnSync('qmd', ['--version'], { stdio: 'ignore' });
  return !probe.error;
}

function parseCollectionNames(raw: string): string[] {
  const names: string[] = [];
  const regex = /^(\S+)\s+\(qmd:\/\/\1\/\)/gm;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    names.push(match[1]);
  }

  return names;
}

function listCollections(indexName: string): string[] {
  try {
    const output = execFileSync('qmd', ['--index', indexName, 'collection', 'list'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return parseCollectionNames(output);
  } catch {
    return [];
  }
}

function removeCollection(indexName: string, name: string): void {
  const removalVariants: string[][] = [
    ['collection', 'remove', name],
    ['collection', 'rm', name],
    ['collection', 'delete', name]
  ];

  for (const args of removalVariants) {
    try {
      execFileSync('qmd', ['--index', indexName, ...args], { stdio: 'ignore' });
      return;
    } catch {
      // Try alternate subcommand names for different qmd versions.
    }
  }
}

function cleanupQmdTestIndex(indexName: string): void {
  if (!hasQmdBinary()) {
    return;
  }

  const collections = listCollections(indexName);
  for (const collection of collections) {
    removeCollection(indexName, collection);
  }
}

export default function globalSetup(): () => void {
  const configuredTestIndex = process.env.CLAWVAULT_TEST_QMD_INDEX?.trim() || DEFAULT_TEST_QMD_INDEX;
  if (!process.env[QMD_INDEX_ENV_VAR]?.trim()) {
    process.env[QMD_INDEX_ENV_VAR] = configuredTestIndex;
  }
  const activeIndexName = process.env[QMD_INDEX_ENV_VAR] || configuredTestIndex;

  cleanupQmdTestIndex(activeIndexName);

  return () => {
    cleanupQmdTestIndex(activeIndexName);
  };
}

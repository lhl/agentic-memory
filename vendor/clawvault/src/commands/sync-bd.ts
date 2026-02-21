import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { Command } from 'commander';
import { resolveVaultPath } from '../lib/config.js';

export interface SyncBdCommandOptions {
  vaultPath?: string;
  dryRun?: boolean;
}

interface BdTask {
  title: string;
  status?: string;
}

function hasBdBinary(): boolean {
  const probe = spawnSync('bd', ['--version'], { stdio: 'ignore' });
  return !probe.error;
}

function parseBdTasksFromJson(raw: string): BdTask[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((entry): BdTask | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string'
        ? record.title.trim()
        : typeof record.name === 'string'
          ? record.name.trim()
          : '';
      const status = typeof record.status === 'string' ? record.status.trim().toLowerCase() : undefined;
      if (!title) return null;
      return status ? { title, status } : { title };
    })
    .filter((entry): entry is BdTask => entry !== null);
}

function loadActiveBdTasks(): BdTask[] {
  const jsonAttempt = spawnSync('bd', ['list', '--json'], { encoding: 'utf-8' });
  if (!jsonAttempt.error && typeof jsonAttempt.stdout === 'string' && jsonAttempt.stdout.trim()) {
    const tasks = parseBdTasksFromJson(jsonAttempt.stdout);
    if (tasks.length > 0) {
      return tasks.filter((task) => task.status !== 'done' && task.status !== 'completed' && task.status !== 'closed');
    }
  }

  const textAttempt = spawnSync('bd', ['list'], { encoding: 'utf-8' });
  if (textAttempt.error || typeof textAttempt.stdout !== 'string') {
    return [];
  }
  return textAttempt.stdout
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .map((title) => ({ title }));
}

function upsertSection(markdown: string, heading: string, bulletLines: string[]): string {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  const sectionContent = [heading, ...bulletLines];

  if (headingIndex === -1) {
    const prefix = markdown.trim() ? `${markdown.trim()}\n\n` : '';
    return `${prefix}${sectionContent.join('\n')}\n`;
  }

  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      sectionEnd = index;
      break;
    }
  }

  const updated = [
    ...lines.slice(0, headingIndex),
    ...sectionContent,
    ...lines.slice(sectionEnd)
  ];
  return `${updated.join('\n').trim()}\n`;
}

export async function syncBdCommand(options: SyncBdCommandOptions): Promise<void> {
  if (!hasBdBinary()) {
    console.log('bd binary not found; skipping sync-bd.');
    return;
  }

  const tasks = loadActiveBdTasks();
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const nowViewPath = path.join(vaultPath, 'views', 'now.md');
  const heading = '## Active Tasks (from bd)';
  const bulletLines = tasks.length > 0
    ? tasks.map((task) => `- ${task.title}`)
    : ['- No active bd tasks.'];

  const existing = fs.existsSync(nowViewPath) ? fs.readFileSync(nowViewPath, 'utf-8') : '# Now\n';
  const next = upsertSection(existing, heading, bulletLines);

  if (options.dryRun) {
    console.log(`Dry run: would sync ${tasks.length} active bd task(s) to views/now.md.`);
    return;
  }

  fs.mkdirSync(path.dirname(nowViewPath), { recursive: true });
  fs.writeFileSync(nowViewPath, next, 'utf-8');
  console.log(`Synced ${tasks.length} active bd task(s) to views/now.md.`);
}

export function registerSyncBdCommand(program: Command): void {
  program
    .command('sync-bd')
    .description('Sync active bd tasks into views/now.md')
    .option('--dry-run', 'Show task sync output without writing')
    .option('-v, --vault <path>', 'Vault path')
    .action(async (rawOptions: { dryRun?: boolean; vault?: string }) => {
      await syncBdCommand({
        vaultPath: rawOptions.vault,
        dryRun: rawOptions.dryRun
      });
    });
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { canvasCommand, generateCanvas } from './canvas.js';
import { createTask, completeTask, updateTask } from '../lib/task-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-canvas-cmd-'));
}

function canvasText(canvas: { nodes: Array<{ type: string; text?: string }> }): string {
  return canvas.nodes
    .filter((node) => node.type === 'text')
    .map((node) => node.text ?? '')
    .join('\n');
}

describe('canvas command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    fs.mkdirSync(path.join(tempDir, '.clawvault'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateCanvas', () => {
    it('generates valid canvas structure', () => {
      const canvas = generateCanvas(tempDir);
      const groupLabels = canvas.nodes
        .filter((node) => node.type === 'group')
        .map((node) => node.label);

      expect(Array.isArray(canvas.nodes)).toBe(true);
      expect(Array.isArray(canvas.edges)).toBe(true);
      expect(groupLabels).toEqual(expect.arrayContaining([
        'Vault Status',
        'Recent Observations',
        'Graph Stats'
      ]));
    });

    it('renders task status counts in the vault status node', () => {
      createTask(tempDir, 'Open task');
      const active = createTask(tempDir, 'Active task');
      const blocked = createTask(tempDir, 'Blocked task');
      const done = createTask(tempDir, 'Done task');

      updateTask(tempDir, active.slug, { status: 'in-progress' });
      updateTask(tempDir, blocked.slug, { status: 'blocked', blocked_by: 'dep' });
      completeTask(tempDir, done.slug);

      const text = canvasText(generateCanvas(tempDir));
      expect(text).toContain('Tasks by Status');
      expect(text).toContain('In Progress: 1');
      expect(text).toContain('Open: 1');
      expect(text).toContain('Blocked: 1');
      expect(text).toContain('Done: 1');
    });

    it('generates valid node IDs', () => {
      createTask(tempDir, 'Test Task');
      const canvas = generateCanvas(tempDir);

      for (const node of canvas.nodes) {
        expect(node.id).toHaveLength(16);
        expect(/^[0-9a-f]+$/.test(node.id)).toBe(true);
      }
    });
  });

  describe('canvasCommand', () => {
    it('writes dashboard.canvas by default', async () => {
      const outputPath = path.join(tempDir, 'dashboard.canvas');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      try {
        await canvasCommand(tempDir);
      } finally {
        logSpy.mockRestore();
      }

      expect(fs.existsSync(outputPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as {
        nodes: Array<{ type: string; label?: string }>;
      };
      const labels = parsed.nodes
        .filter((node) => node.type === 'group')
        .map((node) => node.label);
      expect(labels).toEqual(expect.arrayContaining(['Vault Status', 'Recent Observations', 'Graph Stats']));
    });

    it('supports custom output paths', async () => {
      createTask(tempDir, 'Custom output task');
      const outputPath = path.join(tempDir, 'status.canvas');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      try {
        await canvasCommand(tempDir, { output: outputPath });
      } finally {
        logSpy.mockRestore();
      }

      expect(fs.existsSync(outputPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as {
        nodes: Array<{ type: string; text?: string }>;
      };
      const text = canvasText(parsed);
      expect(text).toContain('Custom output task');
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateCanvas } from './canvas-templates.js';
import { buildOrUpdateMemoryGraphIndex } from './memory-graph.js';
import { createTask, completeTask, updateTask } from './task-utils.js';
import { ensureLedgerStructure, getObservationPath } from './ledger.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-canvas-templates-'));
}

function getCanvasText(canvas: { nodes: Array<{ type: string; text?: string }> }): string {
  return canvas.nodes
    .filter((node) => node.type === 'text')
    .map((node) => node.text ?? '')
    .join('\n');
}

describe('canvas generator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    fs.mkdirSync(path.join(tempDir, '.clawvault'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates a valid single canvas layout', () => {
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

  it('shows tasks grouped by status', () => {
    createTask(tempDir, 'Open task');
    const inProgress = createTask(tempDir, 'In progress task');
    const blocked = createTask(tempDir, 'Blocked task');
    const done = createTask(tempDir, 'Done task');

    updateTask(tempDir, inProgress.slug, { status: 'in-progress' });
    updateTask(tempDir, blocked.slug, { status: 'blocked', blocked_by: 'api-outage' });
    completeTask(tempDir, done.slug);

    const text = getCanvasText(generateCanvas(tempDir));
    expect(text).toContain('Tasks by Status');
    expect(text).toContain('In Progress (1)');
    expect(text).toContain('Open (1)');
    expect(text).toContain('Blocked (1)');
    expect(text).toContain('Done (1)');
  });

  it('includes recent observations in the output', () => {
    ensureLedgerStructure(tempDir);
    const observationPath = getObservationPath(tempDir, '2026-02-14');
    fs.mkdirSync(path.dirname(observationPath), { recursive: true });
    fs.writeFileSync(observationPath, '# Daily Sync\n\nCaptured insights.');

    const text = getCanvasText(generateCanvas(tempDir));
    expect(text).toContain('Total days: 1');
    expect(text).toContain('2026-02-14: Daily Sync');
  });

  it('includes graph stats when graph index is available', async () => {
    fs.mkdirSync(path.join(tempDir, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'people'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'projects', 'alpha.md'), '# Alpha\n[[people/alice]]\n');
    fs.writeFileSync(path.join(tempDir, 'people', 'alice.md'), '# Alice\n[[projects/alpha]]\n');
    await buildOrUpdateMemoryGraphIndex(tempDir, { forceFull: true });

    const text = getCanvasText(generateCanvas(tempDir));
    expect(text).toContain('Graph Stats');
    expect(text).toContain('Nodes:');
    expect(text).toContain('Edges:');
    expect(text).toContain('Node types:');
  });
});

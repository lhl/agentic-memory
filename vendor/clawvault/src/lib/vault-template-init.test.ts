import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import matter from 'gray-matter';

const { hasQmdMock } = vi.hoisted(() => ({
  hasQmdMock: vi.fn(),
}));

vi.mock('./search.js', async () => {
  const actual = await vi.importActual<typeof import('./search.js')>('./search.js');
  return {
    ...actual,
    hasQmd: hasQmdMock,
  };
});

import { createVault } from './vault.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-vault-template-init-'));
}

describe('vault init template generation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    hasQmdMock.mockReturnValue(true);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('copies canonical schema templates during init', async () => {
    await createVault(tempDir, { name: 'Template Init Vault' }, {
      skipGraph: true,
      skipBases: true,
    });

    const templatesDir = path.join(tempDir, 'templates');
    const expectedTemplates: Array<{ file: string; primitive: string }> = [
      { file: 'task.md', primitive: 'task' },
      { file: 'project.md', primitive: 'project' },
      { file: 'decision.md', primitive: 'decision' },
      { file: 'person.md', primitive: 'person' },
      { file: 'lesson.md', primitive: 'lesson' },
      { file: 'checkpoint.md', primitive: 'checkpoint' },
      { file: 'handoff.md', primitive: 'handoff' },
      { file: 'daily-note.md', primitive: 'daily-note' },
    ];

    for (const template of expectedTemplates) {
      const templatePath = path.join(templatesDir, template.file);
      expect(fs.existsSync(templatePath)).toBe(true);

      const parsed = matter(fs.readFileSync(templatePath, 'utf-8'));
      expect(parsed.data.primitive).toBe(template.primitive);
      expect(parsed.data.fields).toBeTypeOf('object');
    }
  });

  it('keeps generated base views aligned with task template fields', async () => {
    await createVault(tempDir, { name: 'Template Base Alignment Vault' }, {
      skipGraph: true,
      skipBases: false,
    });

    const taskTemplatePath = path.join(tempDir, 'templates', 'task.md');
    const taskTemplate = matter(fs.readFileSync(taskTemplatePath, 'utf-8'));
    const taskFields = new Set(Object.keys((taskTemplate.data.fields as Record<string, unknown>) || {}));

    const allTasksBase = fs.readFileSync(path.join(tempDir, 'all-tasks.base'), 'utf-8');
    const blockedBase = fs.readFileSync(path.join(tempDir, 'blocked.base'), 'utf-8');
    const byProjectBase = fs.readFileSync(path.join(tempDir, 'by-project.base'), 'utf-8');

    for (const field of ['status', 'owner', 'project', 'priority', 'blocked_by']) {
      expect(taskFields.has(field)).toBe(true);
    }

    expect(allTasksBase).toContain('status');
    expect(allTasksBase).toContain('owner');
    expect(allTasksBase).toContain('project');
    expect(allTasksBase).toContain('priority');
    expect(allTasksBase).toContain('blocked_by');
    expect(blockedBase).toContain('blocked_by');
    expect(byProjectBase).toContain('project');
  });
});

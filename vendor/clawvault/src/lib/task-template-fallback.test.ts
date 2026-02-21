import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { loadSchemaTemplateDefinitionMock } = vi.hoisted(() => ({
  loadSchemaTemplateDefinitionMock: vi.fn(() => null),
}));

vi.mock('./primitive-templates.js', async () => {
  const actual = await vi.importActual<typeof import('./primitive-templates.js')>('./primitive-templates.js');
  return {
    ...actual,
    loadSchemaTemplateDefinition: loadSchemaTemplateDefinitionMock,
  };
});

import { createTask } from './task-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-task-template-fallback-'));
}

describe('task template fallback', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    loadSchemaTemplateDefinitionMock.mockReturnValue(null);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('falls back to hardcoded defaults when task template is unavailable', () => {
    const task = createTask(tempDir, 'Fallback Task', {
      owner: 'alice',
      project: 'core',
      priority: 'high',
    });

    expect(task.frontmatter.status).toBe('open');
    expect(task.frontmatter.owner).toBe('alice');
    expect(task.frontmatter.project).toBe('core');
    expect(task.frontmatter.priority).toBe('high');

    const raw = fs.readFileSync(task.path, 'utf-8');
    expect(raw).toContain('[[alice]]');
    expect(raw).toContain('[[core]]');
  });
});

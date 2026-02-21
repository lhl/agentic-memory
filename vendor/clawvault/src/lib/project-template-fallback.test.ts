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

import { createProject } from './project-utils.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-project-template-fallback-'));
}

describe('project template fallback', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    loadSchemaTemplateDefinitionMock.mockReturnValue(null);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('falls back to hardcoded defaults when project template is unavailable', () => {
    const project = createProject(tempDir, 'Fallback Project', {
      owner: 'alice',
      client: 'Acme',
      status: 'paused',
    });

    expect(project.frontmatter.type).toBe('project');
    expect(project.frontmatter.status).toBe('paused');
    expect(project.frontmatter.owner).toBe('alice');
    expect(project.frontmatter.client).toBe('Acme');

    const raw = fs.readFileSync(path.join(tempDir, 'projects', 'fallback-project.md'), 'utf-8');
    expect(raw).toContain('[[alice]]');
    expect(raw).toContain('[[Acme]]');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import matter from 'gray-matter';
import { addTemplate, createFromTemplate, listTemplateDefinitions, listTemplates } from './template.js';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('template command', () => {
  it('lists templates and creates a file from a custom template', () => {
    const vaultDir = makeTempDir('clawvault-template-vault-');
    const templatesDir = path.join(vaultDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(templatesDir, 'custom.md'),
      `---
title: "{{title}}"
date: {{date}}
type: {{type}}
---
# {{title}}
`
    );

    const builtinDir = makeTempDir('clawvault-template-builtin-');
    fs.writeFileSync(path.join(builtinDir, 'builtin.md'), '# Builtin');

    const names = listTemplates({ vaultPath: vaultDir, builtinDir });
    expect(names).toEqual(expect.arrayContaining(['custom', 'builtin']));

    const outputDir = makeTempDir('clawvault-template-out-');
    const result = createFromTemplate('custom', {
      vaultPath: vaultDir,
      builtinDir,
      cwd: outputDir,
      title: 'Alpha Plan',
      type: 'custom'
    });

    expect(result.outputPath).toBe(path.join(outputDir, 'alpha-plan.md'));
    const content = fs.readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain('Alpha Plan');
    expect(content).not.toContain('{{title}}');
  });

  it('adds a template to the vault templates folder', () => {
    const vaultDir = makeTempDir('clawvault-template-vault-');
    const sourceDir = makeTempDir('clawvault-template-src-');
    const sourcePath = path.join(sourceDir, 'source.md');
    fs.writeFileSync(sourcePath, '# Custom Template');

    const result = addTemplate(sourcePath, { vaultPath: vaultDir, name: 'added' });
    const saved = fs.readFileSync(result.templatePath, 'utf-8');
    expect(saved).toBe('# Custom Template');
  });

  it('shows schema fields in template definitions and renders schema defaults', () => {
    const vaultDir = makeTempDir('clawvault-template-vault-');
    const templatesDir = path.join(vaultDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(templatesDir, 'task.md'),
      `---
primitive: task
fields:
  status:
    type: string
    default: open
  created:
    type: datetime
    default: "{{datetime}}"
  updated:
    type: datetime
    default: "{{datetime}}"
---
# {{title}}
{{content}}
`
    );

    const definitions = listTemplateDefinitions({ vaultPath: vaultDir });
    const task = definitions.find((definition) => definition.name === 'task');
    expect(task).toBeDefined();
    expect(task?.fields).toEqual(expect.arrayContaining(['status', 'created', 'updated']));

    const outputDir = makeTempDir('clawvault-template-out-');
    const result = createFromTemplate('task', {
      vaultPath: vaultDir,
      cwd: outputDir,
      title: 'Ship API',
      type: 'task'
    });

    const rendered = fs.readFileSync(result.outputPath, 'utf-8');
    const parsed = matter(rendered);
    expect(parsed.data.status).toBe('open');
    expect(parsed.data.created).toBeTypeOf('string');
    expect(parsed.data.updated).toBeTypeOf('string');
    expect(parsed.content).toContain('# Ship API');
  });
});

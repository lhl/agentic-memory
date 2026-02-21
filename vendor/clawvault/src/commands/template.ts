import * as fs from 'fs';
import * as path from 'path';
import { buildTemplateVariables, renderTemplate, TemplateVariables } from '../lib/template-engine.js';
import {
  buildTemplateIndex,
  normalizeTemplateName,
  parseTemplateDefinition,
  renderDocumentFromTemplate,
  listTemplateDefinitions as listPrimitiveTemplateDefinitions,
  TEMPLATE_EXTENSION
} from '../lib/primitive-templates.js';

const VAULT_CONFIG_FILE = '.clawvault.json';
const TEMPLATE_LIST_IGNORED_BUILTINS = new Set(['daily']);

export interface TemplateCommandContext {
  vaultPath?: string;
  cwd?: string;
  builtinDir?: string;
}

export interface TemplateCreateOptions extends TemplateCommandContext {
  title?: string;
  type?: string;
}

export interface TemplateAddOptions extends TemplateCommandContext {
  name: string;
  overwrite?: boolean;
}

function findVaultRoot(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, VAULT_CONFIG_FILE))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function resolveVaultPath(options: TemplateCommandContext): string | null {
  if (options.vaultPath) {
    return path.resolve(options.vaultPath);
  }

  const envPath = process.env.CLAWVAULT_PATH;
  if (envPath) {
    return path.resolve(envPath);
  }

  const cwd = options.cwd ?? process.cwd();
  return findVaultRoot(cwd);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function buildTemplateIndexForContext(options: TemplateCommandContext): Map<string, string> {
  const vaultPath = resolveVaultPath(options) ?? undefined;
  return buildTemplateIndex({
    vaultPath,
    builtinDir: options.builtinDir,
    ignoreBuiltinNames: TEMPLATE_LIST_IGNORED_BUILTINS,
  });
}

export interface TemplateDefinitionInfo {
  name: string;
  primitive: string;
  description?: string;
  fields: string[];
  path: string;
  format: 'schema' | 'legacy';
}

export function listTemplateDefinitions(options: TemplateCommandContext = {}): TemplateDefinitionInfo[] {
  const vaultPath = resolveVaultPath(options) ?? undefined;
  return listPrimitiveTemplateDefinitions({
    vaultPath,
    builtinDir: options.builtinDir,
    ignoreBuiltinNames: TEMPLATE_LIST_IGNORED_BUILTINS,
  }).map((definition) => ({
    name: definition.name,
    primitive: definition.primitive,
    description: definition.description,
    fields: Object.keys(definition.fields),
    path: definition.path,
    format: definition.format,
  }));
}

export function listTemplates(options: TemplateCommandContext = {}): string[] {
  return listTemplateDefinitions(options).map((definition) => definition.name);
}

export function createFromTemplate(
  name: string,
  options: TemplateCreateOptions = {}
): { outputPath: string; templatePath: string; variables: TemplateVariables } {
  const templateName = normalizeTemplateName(name);
  if (!templateName) {
    throw new Error('Template name is required.');
  }

  const index = buildTemplateIndexForContext(options);
  const templatePath = index.get(templateName);
  if (!templatePath) {
    const available = [...index.keys()].sort();
    const hint = available.length > 0 ? ` Available: ${available.join(', ')}` : '';
    throw new Error(`Template not found: ${templateName}.${hint}`);
  }

  const raw = fs.readFileSync(templatePath, 'utf-8');
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const type = options.type ?? templateName;
  const title = options.title ?? `${type} ${date}`.trim();

  const variables = buildTemplateVariables({ title, type, date }, now);
  const parsedTemplate = parseTemplateDefinition(raw, templateName, templatePath);
  const rendered = parsedTemplate.format === 'schema'
    ? renderDocumentFromTemplate(parsedTemplate, {
      title,
      type,
      now,
      variables: {
        ...variables,
        content: '',
        links_line: '',
        owner_link: '',
        project_link: '',
        team_links_line: '',
      },
    }).markdown
    : renderTemplate(raw, variables);

  const cwd = options.cwd ?? process.cwd();
  const slug = slugify(title) || slugify(templateName) || `template-${date}`;
  const outputPath = path.join(cwd, `${slug}${TEMPLATE_EXTENSION}`);

  if (fs.existsSync(outputPath)) {
    throw new Error(`File already exists: ${outputPath}`);
  }

  fs.writeFileSync(outputPath, rendered);
  return { outputPath, templatePath, variables };
}

export function addTemplate(
  file: string,
  options: TemplateAddOptions
): { templatePath: string; name: string } {
  const name = normalizeTemplateName(options.name);
  if (!name) {
    throw new Error('Template name is required.');
  }

  const vaultPath = resolveVaultPath(options);
  if (!vaultPath) {
    throw new Error('No vault found. Set CLAWVAULT_PATH or use --vault.');
  }

  const cwd = options.cwd ?? process.cwd();
  const sourcePath = path.resolve(cwd, file);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Template file not found: ${sourcePath}`);
  }

  const templatesDir = path.join(vaultPath, 'templates');
  fs.mkdirSync(templatesDir, { recursive: true });

  const targetPath = path.join(templatesDir, `${name}${TEMPLATE_EXTENSION}`);
  if (fs.existsSync(targetPath) && !options.overwrite) {
    throw new Error(`Template already exists: ${targetPath}`);
  }

  fs.copyFileSync(sourcePath, targetPath);
  return { templatePath: targetPath, name };
}

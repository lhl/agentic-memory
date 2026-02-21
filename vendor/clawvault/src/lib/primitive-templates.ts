import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import {
  buildTemplateVariables,
  renderTemplate,
  type TemplateVariables,
} from './template-engine.js';

export const TEMPLATE_EXTENSION = '.md';

export interface PrimitiveTemplateFieldDefinition {
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
}

export type PrimitiveTemplateFormat = 'schema' | 'legacy';

export interface PrimitiveTemplateDefinition {
  name: string;
  primitive: string;
  description?: string;
  fields: Record<string, PrimitiveTemplateFieldDefinition>;
  body: string;
  format: PrimitiveTemplateFormat;
  sourcePath?: string;
}

export interface PrimitiveTemplateLoadOptions {
  vaultPath?: string;
  builtinDir?: string;
  ignoreBuiltinNames?: Set<string>;
}

export interface ListedPrimitiveTemplateDefinition extends PrimitiveTemplateDefinition {
  path: string;
}

export type TemplateRenderVariables = TemplateVariables & Record<string, string | number | boolean | null | undefined>;

export interface BuildTemplateFrontmatterOptions {
  pruneEmpty?: boolean;
  dropEmptyStrings?: boolean;
  dropEmptyArrays?: boolean;
}

export interface RenderDocumentFromTemplateOptions {
  title?: string;
  type?: string;
  now?: Date;
  variables?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  frontmatter?: BuildTemplateFrontmatterOptions;
}

export interface RenderedTemplateDocument {
  frontmatter: Record<string, unknown>;
  content: string;
  markdown: string;
  variables: TemplateRenderVariables;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeTemplateName(name: string): string {
  const base = path.basename(name, path.extname(name));
  return base.trim();
}

export function resolveBuiltinTemplatesDir(override?: string): string | null {
  if (override) {
    const resolved = path.resolve(override);
    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : null;
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, '../templates'),
    path.resolve(moduleDir, '../../templates'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return null;
}

function listTemplateFiles(dir: string, ignore?: Set<string>): Map<string, string> {
  const entries = new Map<string, string>();
  if (!fs.existsSync(dir)) return entries;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(TEMPLATE_EXTENSION)) continue;
    const name = normalizeTemplateName(entry.name);
    if (!name) continue;
    if (ignore?.has(name)) continue;
    entries.set(name, path.join(dir, entry.name));
  }

  return entries;
}

export function buildTemplateIndex(options: PrimitiveTemplateLoadOptions = {}): Map<string, string> {
  const index = new Map<string, string>();
  const builtinDir = resolveBuiltinTemplatesDir(options.builtinDir);
  if (builtinDir) {
    for (const [name, filePath] of listTemplateFiles(builtinDir, options.ignoreBuiltinNames)) {
      index.set(name, filePath);
    }
  }

  if (options.vaultPath) {
    const vaultTemplatesDir = path.join(path.resolve(options.vaultPath), 'templates');
    for (const [name, filePath] of listTemplateFiles(vaultTemplatesDir)) {
      index.set(name, filePath);
    }
  }

  return index;
}

function inferFieldType(defaultValue: unknown): string {
  if (Array.isArray(defaultValue)) {
    const uniqueItemTypes = [...new Set(defaultValue.map((value) => typeof value))];
    if (uniqueItemTypes.length === 1 && uniqueItemTypes[0] === 'string') {
      return 'string[]';
    }
    return 'array';
  }

  switch (typeof defaultValue) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      if (defaultValue === null) return 'string';
      return 'object';
    default:
      return 'string';
  }
}

function normalizeFieldDefinition(rawField: unknown): PrimitiveTemplateFieldDefinition {
  if (!isRecord(rawField)) {
    return {
      type: inferFieldType(rawField),
      default: rawField,
    };
  }

  const rawType = typeof rawField.type === 'string' ? rawField.type.trim() : '';
  const normalized: PrimitiveTemplateFieldDefinition = {
    type: rawType || inferFieldType(rawField.default),
  };

  if (typeof rawField.description === 'string' && rawField.description.trim()) {
    normalized.description = rawField.description.trim();
  }
  if (typeof rawField.required === 'boolean') {
    normalized.required = rawField.required;
  }
  if (Object.prototype.hasOwnProperty.call(rawField, 'default')) {
    normalized.default = rawField.default;
  }
  if (Array.isArray(rawField.enum)) {
    normalized.enum = rawField.enum;
  }

  return normalized;
}

function normalizeFieldDefinitions(
  rawFields: Record<string, unknown>
): Record<string, PrimitiveTemplateFieldDefinition> {
  const normalized: Record<string, PrimitiveTemplateFieldDefinition> = {};
  for (const [fieldName, rawField] of Object.entries(rawFields)) {
    const normalizedName = String(fieldName).trim();
    if (!normalizedName) continue;
    normalized[normalizedName] = normalizeFieldDefinition(rawField);
  }
  return normalized;
}

interface ExtractedSchemaDefinition {
  primitive: string;
  description?: string;
  fields: Record<string, unknown>;
}

function extractSchemaDefinition(
  frontmatter: Record<string, unknown>
): ExtractedSchemaDefinition | null {
  const primitive = typeof frontmatter.primitive === 'string' ? frontmatter.primitive.trim() : '';
  const description = typeof frontmatter.description === 'string'
    ? frontmatter.description.trim()
    : undefined;

  if (primitive && isRecord(frontmatter.fields)) {
    return {
      primitive,
      description,
      fields: frontmatter.fields,
    };
  }

  const containerCandidates = [frontmatter.schema, frontmatter.template];
  for (const candidate of containerCandidates) {
    if (!isRecord(candidate)) continue;
    const nestedPrimitive = typeof candidate.primitive === 'string'
      ? candidate.primitive.trim()
      : primitive;
    if (!nestedPrimitive || !isRecord(candidate.fields)) continue;
    const nestedDescription = typeof candidate.description === 'string'
      ? candidate.description.trim()
      : description;
    return {
      primitive: nestedPrimitive,
      description: nestedDescription,
      fields: candidate.fields,
    };
  }

  return null;
}

function inferLegacyFieldDefinitions(
  frontmatter: Record<string, unknown>
): Record<string, PrimitiveTemplateFieldDefinition> {
  const normalized: Record<string, PrimitiveTemplateFieldDefinition> = {};
  const ignoredKeys = new Set(['primitive', 'fields', 'schema', 'template']);

  for (const [key, value] of Object.entries(frontmatter)) {
    if (ignoredKeys.has(key)) continue;
    normalized[key] = {
      type: inferFieldType(value),
      default: value,
    };
  }

  return normalized;
}

export function parseTemplateDefinition(
  rawTemplate: string,
  templateName: string,
  sourcePath?: string
): PrimitiveTemplateDefinition {
  const normalizedName = normalizeTemplateName(templateName);
  const { data, content } = matter(rawTemplate);
  const frontmatter = isRecord(data) ? data : {};
  const extractedSchema = extractSchemaDefinition(frontmatter);

  if (extractedSchema) {
    return {
      name: normalizedName,
      primitive: extractedSchema.primitive,
      description: extractedSchema.description,
      fields: normalizeFieldDefinitions(extractedSchema.fields),
      body: content,
      format: 'schema',
      sourcePath,
    };
  }

  return {
    name: normalizedName,
    primitive: normalizedName,
    description: typeof frontmatter.description === 'string'
      ? frontmatter.description.trim()
      : undefined,
    fields: inferLegacyFieldDefinitions(frontmatter),
    body: content,
    format: 'legacy',
    sourcePath,
  };
}

function readTemplateDefinitionFromPath(filePath: string, templateName: string): PrimitiveTemplateDefinition | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseTemplateDefinition(raw, templateName, filePath);
  } catch {
    return null;
  }
}

export function loadTemplateDefinition(
  templateName: string,
  options: PrimitiveTemplateLoadOptions = {}
): PrimitiveTemplateDefinition | null {
  const normalizedName = normalizeTemplateName(templateName);
  if (!normalizedName) return null;

  const index = buildTemplateIndex(options);
  const filePath = index.get(normalizedName);
  if (!filePath) return null;
  return readTemplateDefinitionFromPath(filePath, normalizedName);
}

export function loadSchemaTemplateDefinition(
  templateName: string,
  options: PrimitiveTemplateLoadOptions = {}
): PrimitiveTemplateDefinition | null {
  const definition = loadTemplateDefinition(templateName, options);
  if (!definition || definition.format !== 'schema') {
    return null;
  }
  return definition;
}

export function listTemplateDefinitions(
  options: PrimitiveTemplateLoadOptions = {}
): ListedPrimitiveTemplateDefinition[] {
  const index = buildTemplateIndex(options);
  const entries: ListedPrimitiveTemplateDefinition[] = [];

  for (const [name, filePath] of [...index.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const definition = readTemplateDefinitionFromPath(filePath, name);
    if (!definition) continue;
    entries.push({
      ...definition,
      path: filePath,
    });
  }

  return entries;
}

function resolveInterpolatedValue(value: unknown, variables: TemplateRenderVariables): unknown {
  if (typeof value === 'string') {
    return renderTemplate(value, variables);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveInterpolatedValue(item, variables));
  }
  if (isRecord(value)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      resolved[key] = resolveInterpolatedValue(nested, variables);
    }
    return resolved;
  }
  return value;
}

function pruneFrontmatter(
  frontmatter: Record<string, unknown>,
  options: BuildTemplateFrontmatterOptions
): Record<string, unknown> {
  const dropEmptyStrings = options.dropEmptyStrings ?? true;
  const dropEmptyArrays = options.dropEmptyArrays ?? true;
  const pruned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;
    if (dropEmptyStrings && typeof value === 'string' && value.trim() === '') continue;
    if (dropEmptyArrays && Array.isArray(value) && value.length === 0) continue;
    pruned[key] = value;
  }

  return pruned;
}

export function buildFrontmatterFromTemplate(
  definition: PrimitiveTemplateDefinition,
  variables: TemplateRenderVariables,
  overrides: Record<string, unknown> = {},
  options: BuildTemplateFrontmatterOptions = {}
): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {};

  for (const [fieldName, schema] of Object.entries(definition.fields)) {
    if (!Object.prototype.hasOwnProperty.call(schema, 'default')) continue;
    frontmatter[fieldName] = resolveInterpolatedValue(schema.default, variables);
  }

  for (const [fieldName, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    if (value === null) {
      delete frontmatter[fieldName];
      continue;
    }
    frontmatter[fieldName] = value;
  }

  if (!options.pruneEmpty) {
    return frontmatter;
  }

  return pruneFrontmatter(frontmatter, options);
}

export function renderDocumentFromTemplate(
  definition: PrimitiveTemplateDefinition,
  options: RenderDocumentFromTemplateOptions = {}
): RenderedTemplateDocument {
  const now = options.now ?? new Date();
  const variables = {
    ...buildTemplateVariables(
      {
        title: options.title ?? '',
        type: options.type ?? definition.primitive,
      },
      now
    ),
    ...(options.variables ?? {}),
  } as TemplateRenderVariables;

  const frontmatter = buildFrontmatterFromTemplate(
    definition,
    variables,
    options.overrides,
    options.frontmatter
  );
  const content = renderTemplate(definition.body, variables);
  const markdown = matter.stringify(content, frontmatter);

  return {
    frontmatter,
    content,
    markdown,
    variables,
  };
}

export function getTemplateFieldNames(
  templateName: string,
  options: PrimitiveTemplateLoadOptions = {}
): string[] {
  const definition = loadTemplateDefinition(templateName, options);
  if (!definition) return [];
  return Object.keys(definition.fields);
}

export interface TemplateValidationError {
  field: string;
  message: string;
  kind: 'required' | 'enum' | 'type';
}

/**
 * Validate frontmatter against the template schema.
 * Returns an empty array if valid, or a list of constraint violations.
 * This is advisory — callers decide whether to block or warn.
 */
export function validateFrontmatter(
  definition: PrimitiveTemplateDefinition,
  frontmatter: Record<string, unknown>
): TemplateValidationError[] {
  const errors: TemplateValidationError[] = [];

  for (const [fieldName, schema] of Object.entries(definition.fields)) {
    const value = frontmatter[fieldName];

    if (schema.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        message: `Required field "${fieldName}" is missing.`,
        kind: 'required',
      });
      continue;
    }

    if (value !== undefined && value !== null && schema.enum && schema.enum.length > 0) {
      if (!schema.enum.includes(value)) {
        errors.push({
          field: fieldName,
          message: `"${String(value)}" is not a valid value for "${fieldName}". Expected one of: ${schema.enum.join(', ')}.`,
          kind: 'enum',
        });
      }
    }
  }

  return errors;
}

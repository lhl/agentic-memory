import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CATEGORIES } from '../types.js';

const CONFIG_FILE = '.clawvault.json';
const OBSERVE_PROVIDERS = ['anthropic', 'openai', 'gemini'] as const;
const OBSERVER_COMPRESSION_PROVIDERS = [
  'anthropic',
  'openai',
  'gemini',
  'openai-compatible',
  'ollama'
] as const;
const THEMES = ['neural', 'minimal', 'none'] as const;
const CONTEXT_PROFILES = ['default', 'planning', 'incident', 'handoff', 'auto'] as const;

export type ObserveProvider = (typeof OBSERVE_PROVIDERS)[number];
export type ObserverCompressionProvider = (typeof OBSERVER_COMPRESSION_PROVIDERS)[number];
export type Theme = (typeof THEMES)[number];
export type ContextProfile = (typeof CONTEXT_PROFILES)[number];
export type ManagedConfigKey =
  | 'name'
  | 'categories'
  | 'theme'
  | 'observe.model'
  | 'observe.provider'
  | 'observer.compression.provider'
  | 'observer.compression.model'
  | 'observer.compression.baseUrl'
  | 'observer.compression.apiKey'
  | 'context.maxResults'
  | 'context.defaultProfile'
  | 'graph.maxHops'
  | 'inject.maxResults'
  | 'inject.useLlm'
  | 'inject.scope';

export interface RouteRule {
  pattern: string;
  target: string;
  priority: number;
}

export interface ManagedDefaults {
  name: string;
  categories: string[];
  theme: Theme;
  observe: {
    model: string;
    provider: ObserveProvider;
  };
  observer: {
    compression: {
      provider?: ObserverCompressionProvider;
      model?: string;
      baseUrl?: string;
      apiKey?: string;
    };
  };
  context: {
    maxResults: number;
    defaultProfile: ContextProfile;
  };
  graph: {
    maxHops: number;
  };
  inject: {
    maxResults: number;
    useLlm: boolean;
    scope: string[];
  };
  routes: RouteRule[];
}

export const SUPPORTED_CONFIG_KEYS: ManagedConfigKey[] = [
  'name',
  'categories',
  'theme',
  'observe.model',
  'observe.provider',
  'observer.compression.provider',
  'observer.compression.model',
  'observer.compression.baseUrl',
  'observer.compression.apiKey',
  'context.maxResults',
  'context.defaultProfile',
  'graph.maxHops',
  'inject.maxResults',
  'inject.useLlm',
  'inject.scope'
];

const DEFAULT_THEME: Theme = 'none';
const DEFAULT_OBSERVE_MODEL = 'gemini-2.0-flash';
const DEFAULT_OBSERVE_PROVIDER: ObserveProvider = 'gemini';
const DEFAULT_CONTEXT_MAX_RESULTS = 5;
const DEFAULT_CONTEXT_PROFILE: ContextProfile = 'default';
const DEFAULT_GRAPH_MAX_HOPS = 2;
const DEFAULT_INJECT_MAX_RESULTS = 8;
const DEFAULT_INJECT_USE_LLM = true;
const DEFAULT_INJECT_SCOPE = ['global'];

function configPathFor(vaultPath: string): string {
  return path.join(path.resolve(vaultPath), CONFIG_FILE);
}

function readConfigDocument(vaultPath: string): Record<string, unknown> {
  const configPath = configPathFor(vaultPath);
  if (!fs.existsSync(configPath)) {
    throw new Error(`No ClawVault config found at ${configPath}`);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Config root must be a JSON object.');
    }
    return { ...(parsed as Record<string, unknown>) };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse ${CONFIG_FILE}: ${error.message}`);
    }
    throw new Error(`Failed to parse ${CONFIG_FILE}.`);
  }
}

function writeConfigDocument(vaultPath: string, config: Record<string, unknown>): void {
  const configPath = configPathFor(vaultPath);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const output = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return output.length > 0 ? output : null;
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function isObserveProvider(value: unknown): value is ObserveProvider {
  return typeof value === 'string' && OBSERVE_PROVIDERS.includes(value as ObserveProvider);
}

function isObserverCompressionProvider(value: unknown): value is ObserverCompressionProvider {
  return typeof value === 'string'
    && OBSERVER_COMPRESSION_PROVIDERS.includes(value as ObserverCompressionProvider);
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.includes(value as Theme);
}

function isContextProfile(value: unknown): value is ContextProfile {
  return typeof value === 'string' && CONTEXT_PROFILES.includes(value as ContextProfile);
}

function normalizeRouteTarget(target: string): string {
  const trimmed = target.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('Route target cannot be empty.');
  }
  const segments = trimmed.split('/').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error('Route target cannot be empty.');
  }
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Route target cannot contain relative path segments: ${target}`);
  }
  return segments.join('/');
}

function normalizeRouteRule(raw: unknown): RouteRule | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const pattern = typeof record.pattern === 'string' ? record.pattern.trim() : '';
  const target = typeof record.target === 'string' ? record.target.trim() : '';
  const priority = asPositiveInteger(record.priority);
  if (!pattern || !target || priority === null) {
    return null;
  }
  return {
    pattern,
    target: normalizeRouteTarget(target),
    priority
  };
}

function normalizeRoutes(value: unknown): RouteRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeRouteRule(entry))
    .filter((entry): entry is RouteRule => entry !== null)
    .sort((left, right) => right.priority - left.priority || left.pattern.localeCompare(right.pattern));
}

function getNestedValue(source: Record<string, unknown>, dottedPath: string): unknown {
  const parts = dottedPath.split('.');
  let cursor: unknown = source;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function setNestedValue(source: Record<string, unknown>, dottedPath: string, value: unknown): void {
  const parts = dottedPath.split('.');
  let cursor: Record<string, unknown> = source;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const current = cursor[part];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function parseRegexLiteral(pattern: string): RegExp | null {
  const match = pattern.match(/^\/(.+)\/([a-z]*)$/i);
  if (!match) {
    return null;
  }
  try {
    return new RegExp(match[1], match[2]);
  } catch (error) {
    throw new Error(`Invalid route regex pattern "${pattern}": ${error instanceof Error ? error.message : 'parse error'}`);
  }
}

function withDefaults(vaultPath: string, config: Record<string, unknown>): Record<string, unknown> {
  const resolvedPath = path.resolve(vaultPath);
  const defaults: ManagedDefaults = {
    name: path.basename(resolvedPath),
    categories: [...DEFAULT_CATEGORIES],
    theme: DEFAULT_THEME,
    observe: {
      model: DEFAULT_OBSERVE_MODEL,
      provider: DEFAULT_OBSERVE_PROVIDER
    },
    observer: {
      compression: {}
    },
    context: {
      maxResults: DEFAULT_CONTEXT_MAX_RESULTS,
      defaultProfile: DEFAULT_CONTEXT_PROFILE
    },
    graph: {
      maxHops: DEFAULT_GRAPH_MAX_HOPS
    },
    inject: {
      maxResults: DEFAULT_INJECT_MAX_RESULTS,
      useLlm: DEFAULT_INJECT_USE_LLM,
      scope: [...DEFAULT_INJECT_SCOPE]
    },
    routes: []
  };

  const observeRecord = (
    config.observe && typeof config.observe === 'object' && !Array.isArray(config.observe)
      ? config.observe
      : {}
  ) as Record<string, unknown>;
  const contextRecord = (
    config.context && typeof config.context === 'object' && !Array.isArray(config.context)
      ? config.context
      : {}
  ) as Record<string, unknown>;
  const observerRecord = (
    config.observer && typeof config.observer === 'object' && !Array.isArray(config.observer)
      ? config.observer
      : {}
  ) as Record<string, unknown>;
  const compressionRecord = (
    observerRecord.compression && typeof observerRecord.compression === 'object' && !Array.isArray(observerRecord.compression)
      ? observerRecord.compression
      : {}
  ) as Record<string, unknown>;
  const graphRecord = (
    config.graph && typeof config.graph === 'object' && !Array.isArray(config.graph)
      ? config.graph
      : {}
  ) as Record<string, unknown>;
  const compressionProvider = isObserverCompressionProvider(compressionRecord.provider)
    ? compressionRecord.provider
    : undefined;
  const compressionModel = typeof compressionRecord.model === 'string' && compressionRecord.model.trim()
    ? compressionRecord.model.trim()
    : undefined;
  const compressionBaseUrl = typeof compressionRecord.baseUrl === 'string' && compressionRecord.baseUrl.trim()
    ? compressionRecord.baseUrl.trim()
    : undefined;
  const compressionApiKey = typeof compressionRecord.apiKey === 'string' && compressionRecord.apiKey.trim()
    ? compressionRecord.apiKey.trim()
    : undefined;

  const normalizedCompression: ManagedDefaults['observer']['compression'] = {};
  if (compressionProvider) {
    normalizedCompression.provider = compressionProvider;
  }
  if (compressionModel) {
    normalizedCompression.model = compressionModel;
  }
  if (compressionBaseUrl) {
    normalizedCompression.baseUrl = compressionBaseUrl;
  }
  if (compressionApiKey) {
    normalizedCompression.apiKey = compressionApiKey;
  }
  const injectRecord = (
    config.inject && typeof config.inject === 'object' && !Array.isArray(config.inject)
      ? config.inject
      : {}
  ) as Record<string, unknown>;

  return {
    ...config,
    name: typeof config.name === 'string' && config.name.trim() ? config.name.trim() : defaults.name,
    categories: asStringArray(config.categories) ?? defaults.categories,
    theme: isTheme(config.theme) ? config.theme : defaults.theme,
    observe: {
      ...observeRecord,
      model: typeof observeRecord.model === 'string' && observeRecord.model.trim()
        ? observeRecord.model.trim()
        : defaults.observe.model,
      provider: isObserveProvider(observeRecord.provider)
        ? observeRecord.provider
        : defaults.observe.provider
    },
    observer: {
      ...observerRecord,
      compression: normalizedCompression
    },
    context: {
      ...contextRecord,
      maxResults: asPositiveInteger(contextRecord.maxResults) ?? defaults.context.maxResults,
      defaultProfile: isContextProfile(contextRecord.defaultProfile)
        ? contextRecord.defaultProfile
        : defaults.context.defaultProfile
    },
    graph: {
      ...graphRecord,
      maxHops: asPositiveInteger(graphRecord.maxHops) ?? defaults.graph.maxHops
    },
    inject: {
      ...injectRecord,
      maxResults: asPositiveInteger(injectRecord.maxResults) ?? defaults.inject.maxResults,
      useLlm: asBoolean(injectRecord.useLlm) ?? defaults.inject.useLlm,
      scope: (
        asStringArray(injectRecord.scope)
        ?? (
          typeof injectRecord.scope === 'string'
            ? injectRecord.scope.split(',').map((entry) => entry.trim()).filter(Boolean)
            : null
        )
        ?? [...defaults.inject.scope]
      )
    },
    routes: normalizeRoutes(config.routes)
  };
}

function coerceManagedValue(key: ManagedConfigKey, value: unknown): unknown {
  if (key === 'name') {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Config key "name" must be a non-empty string.');
    }
    return value.trim();
  }

  if (key === 'categories') {
    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
      if (normalized.length === 0) {
        throw new Error('Config key "categories" must include at least one category.');
      }
      return normalized;
    }
    if (typeof value !== 'string') {
      throw new Error('Config key "categories" must be a comma-separated string.');
    }
    const categories = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (categories.length === 0) {
      throw new Error('Config key "categories" must include at least one category.');
    }
    return categories;
  }

  if (key === 'theme') {
    if (!isTheme(value)) {
      throw new Error(`Config key "theme" must be one of: ${THEMES.join(', ')}`);
    }
    return value;
  }

  if (key === 'observe.provider') {
    if (!isObserveProvider(value)) {
      throw new Error(`Config key "observe.provider" must be one of: ${OBSERVE_PROVIDERS.join(', ')}`);
    }
    return value;
  }

  if (key === 'observe.model') {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Config key "observe.model" must be a non-empty string.');
    }
    return value.trim();
  }

  if (key === 'observer.compression.provider') {
    if (!isObserverCompressionProvider(value)) {
      throw new Error(
        `Config key "observer.compression.provider" must be one of: ${OBSERVER_COMPRESSION_PROVIDERS.join(', ')}`
      );
    }
    return value;
  }

  if (key === 'observer.compression.model') {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Config key "observer.compression.model" must be a non-empty string.');
    }
    return value.trim();
  }

  if (key === 'observer.compression.baseUrl') {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Config key "observer.compression.baseUrl" must be a non-empty string.');
    }
    return value.trim();
  }

  if (key === 'observer.compression.apiKey') {
    if (typeof value !== 'string') {
      throw new Error('Config key "observer.compression.apiKey" must be a string.');
    }
    return value.trim();
  }

  if (key === 'context.maxResults') {
    const parsed = asPositiveInteger(value);
    if (parsed === null) {
      throw new Error('Config key "context.maxResults" must be a positive integer.');
    }
    return parsed;
  }

  if (key === 'context.defaultProfile') {
    if (!isContextProfile(value)) {
      throw new Error(`Config key "context.defaultProfile" must be one of: ${CONTEXT_PROFILES.join(', ')}`);
    }
    return value;
  }

  if (key === 'graph.maxHops') {
    const parsed = asPositiveInteger(value);
    if (parsed === null) {
      throw new Error('Config key "graph.maxHops" must be a positive integer.');
    }
    return parsed;
  }

  if (key === 'inject.maxResults') {
    const parsed = asPositiveInteger(value);
    if (parsed === null) {
      throw new Error('Config key "inject.maxResults" must be a positive integer.');
    }
    return parsed;
  }

  if (key === 'inject.useLlm') {
    const parsed = asBoolean(value);
    if (parsed === null) {
      throw new Error('Config key "inject.useLlm" must be a boolean.');
    }
    return parsed;
  }

  if (key === 'inject.scope') {
    const normalized = Array.isArray(value)
      ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
      : typeof value === 'string'
        ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
        : [];
    if (normalized.length === 0) {
      throw new Error('Config key "inject.scope" must be a non-empty string list.');
    }
    return normalized;
  }

  throw new Error(`Unsupported config key: ${key}`);
}

function toComparablePattern(pattern: string): string {
  return pattern.trim().toLowerCase();
}

export function listConfig(vaultPath: string): Record<string, unknown> {
  const config = readConfigDocument(vaultPath);
  return withDefaults(vaultPath, config);
}

export function getConfig(vaultPath: string): Record<string, unknown> {
  return listConfig(vaultPath);
}

export function getConfigValue(vaultPath: string, key: ManagedConfigKey): unknown {
  if (!SUPPORTED_CONFIG_KEYS.includes(key)) {
    throw new Error(`Unsupported config key: ${key}`);
  }
  const config = listConfig(vaultPath);
  return getNestedValue(config, key);
}

export function setConfigValue(
  vaultPath: string,
  key: ManagedConfigKey,
  value: unknown
): { value: unknown; config: Record<string, unknown> } {
  if (!SUPPORTED_CONFIG_KEYS.includes(key)) {
    throw new Error(`Unsupported config key: ${key}`);
  }

  const document = readConfigDocument(vaultPath);
  const coerced = coerceManagedValue(key, value);
  setNestedValue(document, key, coerced);

  if (typeof document.lastUpdated === 'string') {
    document.lastUpdated = new Date().toISOString();
  }

  writeConfigDocument(vaultPath, document);
  return {
    value: coerced,
    config: withDefaults(vaultPath, document)
  };
}

export function resetConfig(vaultPath: string): Record<string, unknown> {
  const document = readConfigDocument(vaultPath);
  const defaultName = path.basename(path.resolve(vaultPath));

  document.name = defaultName;
  document.categories = [...DEFAULT_CATEGORIES];
  document.theme = DEFAULT_THEME;
  document.observe = {
    model: DEFAULT_OBSERVE_MODEL,
    provider: DEFAULT_OBSERVE_PROVIDER
  };
  const observerRecord = (
    document.observer && typeof document.observer === 'object' && !Array.isArray(document.observer)
      ? document.observer
      : {}
  ) as Record<string, unknown>;
  document.observer = {
    ...observerRecord,
    compression: {}
  };
  document.context = {
    maxResults: DEFAULT_CONTEXT_MAX_RESULTS,
    defaultProfile: DEFAULT_CONTEXT_PROFILE
  };
  document.graph = {
    maxHops: DEFAULT_GRAPH_MAX_HOPS
  };
  document.inject = {
    maxResults: DEFAULT_INJECT_MAX_RESULTS,
    useLlm: DEFAULT_INJECT_USE_LLM,
    scope: [...DEFAULT_INJECT_SCOPE]
  };
  document.routes = [];
  if (typeof document.lastUpdated === 'string') {
    document.lastUpdated = new Date().toISOString();
  }

  writeConfigDocument(vaultPath, document);
  return withDefaults(vaultPath, document);
}

export function listRouteRules(vaultPath: string): RouteRule[] {
  const config = listConfig(vaultPath);
  return normalizeRoutes(config.routes);
}

export function addRouteRule(vaultPath: string, pattern: string, target: string): RouteRule {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern) {
    throw new Error('Route pattern cannot be empty.');
  }
  const normalizedTarget = normalizeRouteTarget(target);
  const document = readConfigDocument(vaultPath);
  const existingRoutes = normalizeRoutes(document.routes);
  const duplicate = existingRoutes.find(
    (rule) => toComparablePattern(rule.pattern) === toComparablePattern(normalizedPattern)
  );
  if (duplicate) {
    throw new Error(`Route pattern already exists: ${pattern}`);
  }

  const maxPriority = existingRoutes.reduce((max, rule) => Math.max(max, rule.priority), 0);
  const nextRule: RouteRule = {
    pattern: normalizedPattern,
    target: normalizedTarget,
    priority: maxPriority + 1
  };
  document.routes = [...existingRoutes, nextRule];
  if (typeof document.lastUpdated === 'string') {
    document.lastUpdated = new Date().toISOString();
  }

  writeConfigDocument(vaultPath, document);
  return nextRule;
}

export function removeRouteRule(vaultPath: string, pattern: string): boolean {
  const normalizedPattern = toComparablePattern(pattern);
  const document = readConfigDocument(vaultPath);
  const existingRoutes = normalizeRoutes(document.routes);
  const nextRoutes = existingRoutes.filter(
    (rule) => toComparablePattern(rule.pattern) !== normalizedPattern
  );

  if (nextRoutes.length === existingRoutes.length) {
    return false;
  }

  document.routes = nextRoutes;
  if (typeof document.lastUpdated === 'string') {
    document.lastUpdated = new Date().toISOString();
  }
  writeConfigDocument(vaultPath, document);
  return true;
}

export function matchRouteRule(text: string, routes: RouteRule[]): RouteRule | null {
  for (const route of routes) {
    const regex = parseRegexLiteral(route.pattern);
    if (regex) {
      if (regex.test(text)) {
        return route;
      }
      continue;
    }
    if (text.toLowerCase().includes(route.pattern.toLowerCase())) {
      return route;
    }
  }
  return null;
}

export function testRouteRule(vaultPath: string, text: string): RouteRule | null {
  const routes = listRouteRules(vaultPath);
  return matchRouteRule(text, routes);
}

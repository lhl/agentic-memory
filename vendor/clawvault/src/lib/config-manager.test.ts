import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  addRouteRule,
  getConfigValue,
  listConfig,
  listRouteRules,
  removeRouteRule,
  resetConfig,
  setConfigValue,
  testRouteRule
} from './config-manager.js';
import { DEFAULT_CATEGORIES } from '../types.js';

function createTempVault(): string {
  const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-config-manager-'));
  const now = new Date().toISOString();
  const baseConfig = {
    name: 'test-vault',
    version: '1.0.0',
    created: now,
    lastUpdated: now,
    categories: ['inbox', 'people'],
    documentCount: 0,
    qmdCollection: 'test-vault',
    qmdRoot: vaultPath
  };
  fs.writeFileSync(path.join(vaultPath, '.clawvault.json'), JSON.stringify(baseConfig, null, 2), 'utf-8');
  return vaultPath;
}

describe('config-manager', () => {
  it('supports config set/get/list for managed keys', () => {
    const vaultPath = createTempVault();
    try {
      setConfigValue(vaultPath, 'name', 'clawvault-dev');
      setConfigValue(vaultPath, 'categories', 'people,projects,decisions');
      setConfigValue(vaultPath, 'theme', 'minimal');
      setConfigValue(vaultPath, 'observe.provider', 'openai');
      setConfigValue(vaultPath, 'observe.model', 'gpt-5-mini');
      setConfigValue(vaultPath, 'observer.compression.provider', 'openai-compatible');
      setConfigValue(vaultPath, 'observer.compression.model', 'llama3.2');
      setConfigValue(vaultPath, 'observer.compression.baseUrl', 'http://localhost:11434/v1');
      setConfigValue(vaultPath, 'observer.compression.apiKey', 'config-api-key');
      setConfigValue(vaultPath, 'context.maxResults', '11');
      setConfigValue(vaultPath, 'context.defaultProfile', 'planning');
      setConfigValue(vaultPath, 'graph.maxHops', '4');
      setConfigValue(vaultPath, 'inject.maxResults', '9');
      setConfigValue(vaultPath, 'inject.useLlm', 'false');
      setConfigValue(vaultPath, 'inject.scope', 'project,incident');

      expect(getConfigValue(vaultPath, 'name')).toBe('clawvault-dev');
      expect(getConfigValue(vaultPath, 'categories')).toEqual(['people', 'projects', 'decisions']);
      expect(getConfigValue(vaultPath, 'theme')).toBe('minimal');
      expect(getConfigValue(vaultPath, 'observe.provider')).toBe('openai');
      expect(getConfigValue(vaultPath, 'observe.model')).toBe('gpt-5-mini');
      expect(getConfigValue(vaultPath, 'observer.compression.provider')).toBe('openai-compatible');
      expect(getConfigValue(vaultPath, 'observer.compression.model')).toBe('llama3.2');
      expect(getConfigValue(vaultPath, 'observer.compression.baseUrl')).toBe('http://localhost:11434/v1');
      expect(getConfigValue(vaultPath, 'observer.compression.apiKey')).toBe('config-api-key');
      expect(getConfigValue(vaultPath, 'context.maxResults')).toBe(11);
      expect(getConfigValue(vaultPath, 'context.defaultProfile')).toBe('planning');
      expect(getConfigValue(vaultPath, 'graph.maxHops')).toBe(4);
      expect(getConfigValue(vaultPath, 'inject.maxResults')).toBe(9);
      expect(getConfigValue(vaultPath, 'inject.useLlm')).toBe(false);
      expect(getConfigValue(vaultPath, 'inject.scope')).toEqual(['project', 'incident']);

      const listed = listConfig(vaultPath);
      expect(listed).toMatchObject({
        name: 'clawvault-dev',
        categories: ['people', 'projects', 'decisions'],
        theme: 'minimal',
        observe: {
          provider: 'openai',
          model: 'gpt-5-mini'
        },
        observer: {
          compression: {
            provider: 'openai-compatible',
            model: 'llama3.2',
            baseUrl: 'http://localhost:11434/v1',
            apiKey: 'config-api-key'
          }
        },
        context: {
          maxResults: 11,
          defaultProfile: 'planning'
        },
        graph: {
          maxHops: 4
        },
        inject: {
          maxResults: 9,
          useLlm: false,
          scope: ['project', 'incident']
        }
      });
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('resets managed config fields to defaults', () => {
    const vaultPath = createTempVault();
    try {
      setConfigValue(vaultPath, 'name', 'custom-name');
      setConfigValue(vaultPath, 'categories', 'custom-a,custom-b');
      setConfigValue(vaultPath, 'theme', 'neural');
      setConfigValue(vaultPath, 'observer.compression.provider', 'ollama');
      setConfigValue(vaultPath, 'observer.compression.model', 'llama3.2:latest');
      addRouteRule(vaultPath, 'Pedro', 'people/pedro');

      const reset = resetConfig(vaultPath);
      expect(reset).toMatchObject({
        name: path.basename(vaultPath),
        categories: DEFAULT_CATEGORIES,
        theme: 'none',
        observe: {
          provider: 'gemini',
          model: 'gemini-2.0-flash'
        },
        observer: {
          compression: {}
        },
        context: {
          maxResults: 5,
          defaultProfile: 'default'
        },
        graph: {
          maxHops: 2
        },
        inject: {
          maxResults: 8,
          useLlm: true,
          scope: ['global']
        },
        routes: []
      });
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('adds, removes, and tests route rules', () => {
    const vaultPath = createTempVault();
    try {
      const pedro = addRouteRule(vaultPath, 'Pedro', 'people/pedro');
      const maria = addRouteRule(vaultPath, '/maria/i', 'people/maria');

      const routes = listRouteRules(vaultPath);
      expect(routes).toHaveLength(2);
      expect(routes[0].priority).toBeGreaterThan(routes[1].priority);
      expect(routes[0].pattern).toBe(maria.pattern);
      expect(routes[1].pattern).toBe(pedro.pattern);

      const matchedMaria = testRouteRule(vaultPath, 'Met with Maria for launch prep');
      expect(matchedMaria?.target).toBe('people/maria');

      const matchedPedro = testRouteRule(vaultPath, 'Talked to pedro about cutover');
      expect(matchedPedro?.target).toBe('people/pedro');

      expect(removeRouteRule(vaultPath, 'Pedro')).toBe(true);
      expect(removeRouteRule(vaultPath, 'Pedro')).toBe(false);
      expect(listRouteRules(vaultPath)).toHaveLength(1);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

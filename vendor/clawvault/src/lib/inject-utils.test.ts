import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { indexInjectableItems, runPromptInjection } from './inject-utils.js';

function makeVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-inject-'));
}

function writeVaultFile(vaultPath: string, relativePath: string, content: string): void {
  const absolutePath = path.join(vaultPath, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
}

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalOpenAiKey;
  process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  process.env.GEMINI_API_KEY = originalGeminiKey;
});

describe('inject-utils indexing', () => {
  it('indexes rules, decisions, and preferences with frontmatter defaults', () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(
        vaultPath,
        'rules/kanban-import.md',
        `---
title: Kanban import guardrails
triggers:
  - kanban import
  - board sync
scope:
  - project
priority: 95
---
Always use dry-run before importing kanban changes.
`
      );
      writeVaultFile(vaultPath, 'decisions/kanban-sync-strategy.md', '# Sync strategy\n\nUse incremental import.');
      writeVaultFile(vaultPath, 'preferences/release-style.md', '# Release preference\n\nPrefer staged rollout.');

      const indexed = indexInjectableItems(vaultPath);
      expect(indexed).toHaveLength(3);

      const rule = indexed.find((item) => item.category === 'rules');
      expect(rule?.title).toBe('Kanban import guardrails');
      expect(rule?.priority).toBe(95);
      expect(rule?.scope).toEqual(['project']);
      expect(rule?.triggers).toEqual(expect.arrayContaining(['kanban import', 'board sync']));
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

describe('inject-utils deterministic matching', () => {
  it('uses one-hop memory graph expansion to match related rules', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(
        vaultPath,
        'rules/workflow-constraints.md',
        `---
title: Workflow constraints
triggers:
  - csv pipeline
priority: 90
---
When touching imports, follow the project path [[projects/kanban]].
`
      );
      writeVaultFile(vaultPath, 'projects/kanban.md', '# Kanban');

      const result = await runPromptInjection(vaultPath, 'fix the kanban import', {
        useLlm: false,
        maxResults: 5
      });
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].item.relativePath).toBe('rules/workflow-constraints.md');
      expect(result.matches[0].reasons.some((reason) => reason.source === 'graph_1hop')).toBe(true);
      expect(result.usedLlm).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

describe('inject-utils llm fuzzy layer', () => {
  it('adds llm intent matches when deterministic signals are missing', async () => {
    const vaultPath = makeVault();
    try {
      writeVaultFile(
        vaultPath,
        'rules/production-gates.md',
        `---
title: Production gates
triggers:
  - governance policy
priority: 88
---
Production deploys require gate checks.
`
      );

      process.env.ANTHROPIC_API_KEY = '';
      process.env.GEMINI_API_KEY = '';
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const fetchImpl: typeof fetch = async () => {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    matches: [
                      {
                        id: 'rules/production-gates.md',
                        score: 0.91,
                        reason: 'Shipping changes should pass production gate checks'
                      }
                    ]
                  })
                }
              }
            ]
          })
        } as Response;
      };

      const result = await runPromptInjection(vaultPath, 'ship a hotfix tonight', {
        useLlm: true,
        maxResults: 5,
        fetchImpl
      });

      expect(result.usedLlm).toBe(true);
      expect(result.llmProvider).toBe('openai');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].item.relativePath).toBe('rules/production-gates.md');
      expect(result.matches[0].llmScore).toBeCloseTo(0.91, 2);
      expect(result.matches[0].reasons.some((reason) => reason.source === 'llm_intent')).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

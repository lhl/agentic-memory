import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Router } from './router.js';

function makeTempVault(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-router-'));
  fs.writeFileSync(path.join(root, '.clawvault.json'), JSON.stringify({ name: 'test' }));
  return root;
}

describe('Router', () => {
  it('applies custom routes before default entity slug routing', () => {
    const vaultPath = makeTempVault();
    fs.writeFileSync(
      path.join(vaultPath, '.clawvault.json'),
      JSON.stringify({
        name: 'test',
        routes: [
          {
            pattern: 'Pedro',
            target: 'people/high-touch/pedro',
            priority: 100
          }
        ]
      })
    );
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [relationship|c=0.90|i=0.80] 09:00 talked to Pedro about enterprise renewal'
    ].join('\n');

    try {
      router.route(markdown);

      const customFile = path.join(vaultPath, 'people', 'high-touch', 'pedro', '2026-02-11.md');
      const defaultFile = path.join(vaultPath, 'people', 'pedro', '2026-02-11.md');
      expect(fs.existsSync(customFile)).toBe(true);
      expect(fs.existsSync(defaultFile)).toBe(false);
      expect(fs.readFileSync(customFile, 'utf-8')).toContain('talked to [[Pedro]]');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('routes people observations to entity-slug subfolders', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [relationship|c=0.80|i=0.60] 09:00 talked to Pedro about deployment cutover',
      '- [relationship|c=0.80|i=0.60] 09:10 met with Maria to review logs',
      '- [relationship|c=0.80|i=0.60] 09:20 Justin from ops mentioned latency spikes',
      '- [relationship|c=0.80|i=0.60] 09:30 Alex said rollback drills are complete'
    ].join('\n');

    try {
      const { routed } = router.route(markdown);
      const peopleItems = routed.filter((item) => item.category === 'people');
      expect(peopleItems).toHaveLength(4);

      // Each person gets their own subfolder with date-based file
      const pedroFile = path.join(vaultPath, 'people', 'pedro', '2026-02-11.md');
      expect(fs.existsSync(pedroFile)).toBe(true);
      const pedroContent = fs.readFileSync(pedroFile, 'utf-8');
      expect(pedroContent).toContain('talked to [[Pedro]]');

      const mariaFile = path.join(vaultPath, 'people', 'maria', '2026-02-11.md');
      expect(fs.existsSync(mariaFile)).toBe(true);
      expect(fs.readFileSync(mariaFile, 'utf-8')).toContain('met with [[Maria]]');

      const justinFile = path.join(vaultPath, 'people', 'justin', '2026-02-11.md');
      expect(fs.existsSync(justinFile)).toBe(true);
      expect(fs.readFileSync(justinFile, 'utf-8')).toContain('[[Justin]] from ops');

      const alexFile = path.join(vaultPath, 'people', 'alex', '2026-02-11.md');
      expect(fs.existsSync(alexFile)).toBe(true);
      expect(fs.readFileSync(alexFile, 'utf-8')).toContain('[[Alex]] said');

      // No date file at people root level
      const rootDateFile = path.join(vaultPath, 'people', '2026-02-11.md');
      expect(fs.existsSync(rootDateFile)).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('routes known project observations to project subfolders', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);
    const projectsDir = path.join(vaultPath, 'projects');
    fs.mkdirSync(projectsDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectsDir, 'apollo.md'),
      [
        '---',
        'type: project',
        'status: active',
        'created: 2026-02-01T00:00:00.000Z',
        'updated: 2026-02-01T00:00:00.000Z',
        '---',
        '',
        '# Apollo',
        ''
      ].join('\n')
    );

    const markdown = [
      '## 2026-02-11',
      '',
      '- [project|c=0.90|i=0.82] 09:00 shipped [[apollo]] with zero rollback incidents'
    ].join('\n');

    try {
      router.route(markdown);

      const projectFile = path.join(vaultPath, 'projects', 'apollo', '2026-02-11.md');
      const rootDateFile = path.join(vaultPath, 'projects', '2026-02-11.md');
      expect(fs.existsSync(projectFile)).toBe(true);
      expect(fs.existsSync(rootDateFile)).toBe(false);
      expect(fs.readFileSync(projectFile, 'utf-8')).toContain('shipped [[apollo]]');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('routes unknown project observations to projects root date file', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);
    const projectsDir = path.join(vaultPath, 'projects');
    fs.mkdirSync(projectsDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectsDir, 'apollo.md'),
      [
        '---',
        'type: project',
        'status: active',
        'created: 2026-02-01T00:00:00.000Z',
        'updated: 2026-02-01T00:00:00.000Z',
        '---',
        '',
        '# Apollo',
        ''
      ].join('\n')
    );

    const markdown = [
      '## 2026-02-11',
      '',
      '- [project|c=0.88|i=0.75] 10:20 launched [[zeus]] API diagnostics endpoint'
    ].join('\n');

    try {
      router.route(markdown);

      const rootDateFile = path.join(vaultPath, 'projects', '2026-02-11.md');
      const unknownProjectFile = path.join(vaultPath, 'projects', 'zeus', '2026-02-11.md');
      expect(fs.existsSync(rootDateFile)).toBe(true);
      expect(fs.existsSync(unknownProjectFile)).toBe(false);
      expect(fs.readFileSync(rootDateFile, 'utf-8')).toContain('launched [[zeus]] API diagnostics endpoint');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('does not create files at vault root', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [decision|c=0.90|i=0.88] 09:00 decided to use PostgreSQL over SQLite',
    ].join('\n');

    try {
      router.route(markdown);
      // Should be in decisions/, not vault root
      const rootFiles = fs.readdirSync(vaultPath).filter(f => f.endsWith('.md'));
      expect(rootFiles).toHaveLength(0);
      expect(fs.existsSync(path.join(vaultPath, 'decisions', '2026-02-11.md'))).toBe(true);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('routes task and todo observations into backlog with observer source/context', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [todo|c=0.86|i=0.66] 10:05 TODO: review the PR before the demo',
      "- [task|c=0.83|i=0.65] 10:10 I'll deploy the patch by Friday"
    ].join('\n');

    try {
      const { routed } = router.route(markdown, {
        source: 'openclaw',
        sessionKey: 'agent:clawdious:main',
        transcriptId: 'session-abc',
        timestamp: new Date('2026-02-11T10:15:00.000Z')
      });

      const backlogItems = routed.filter((item) => item.category === 'backlog');
      expect(backlogItems).toHaveLength(2);

      const backlogDir = path.join(vaultPath, 'backlog');
      const backlogFiles = fs.readdirSync(backlogDir).filter((entry) => entry.endsWith('.md'));
      expect(backlogFiles).toHaveLength(2);

      const joined = backlogFiles
        .map((file) => fs.readFileSync(path.join(backlogDir, file), 'utf-8'))
        .join('\n');
      expect(joined).toContain('source: observer');
      expect(joined).toContain('Session: agent:clawdious:main');
      expect(joined).toContain('Transcript: session-abc');
      expect(joined).toContain('Approximate timestamp: 2026-02-11T10:15:00.000Z');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('skips past-tense completed task candidates without future intent', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [task|c=0.84|i=0.70] 10:00 Completed deployment runbook and merged the release PR'
    ].join('\n');

    try {
      const { routed, summary } = router.route(markdown, { sessionKey: 'agent:clawdious:main' });
      const backlogItems = routed.filter((item) => item.category === 'backlog');
      expect(backlogItems).toHaveLength(0);
      expect(summary).toBe('No items routed to vault categories.');
      expect(fs.existsSync(path.join(vaultPath, 'backlog'))).toBe(false);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('keeps past-tense task candidates when future intent is present', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);

    const markdown = [
      '## 2026-02-11',
      '',
      '- [task|c=0.84|i=0.70] 10:00 Fixed auth fallback and need to add integration tests'
    ].join('\n');

    try {
      const { routed } = router.route(markdown, { sessionKey: 'agent:clawdious:main' });
      const backlogItems = routed.filter((item) => item.category === 'backlog');
      expect(backlogItems).toHaveLength(1);
      const backlogDir = path.join(vaultPath, 'backlog');
      expect(fs.existsSync(backlogDir)).toBe(true);
      const entries = fs.readdirSync(backlogDir).filter((entry) => entry.endsWith('.md'));
      expect(entries).toHaveLength(1);
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });

  it('deduplicates repeated task observations into a single backlog item', () => {
    const vaultPath = makeTempVault();
    const router = new Router(vaultPath);
    const markdown = [
      '## 2026-02-11',
      '',
      '- [todo|c=0.82|i=0.66] 09:00 TODO: fix flaky tests'
    ].join('\n');

    try {
      router.route(markdown, { sessionKey: 'agent:clawdious:main' });
      const second = router.route(markdown, { sessionKey: 'agent:clawdious:main' });

      const backlogDir = path.join(vaultPath, 'backlog');
      const backlogFiles = fs.readdirSync(backlogDir).filter((entry) => entry.endsWith('.md'));
      expect(backlogFiles).toHaveLength(1);
      expect(second.summary).toContain('dedup hits: 1');
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true });
    }
  });
});

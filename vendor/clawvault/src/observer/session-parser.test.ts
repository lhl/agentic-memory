import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseSessionFile } from './session-parser.js';

function writeTempSession(content: string, extension: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-session-parser-'));
  const filePath = path.join(dir, `session${extension}`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('parseSessionFile', () => {
  it('parses plain text files as line-delimited messages', () => {
    const filePath = writeTempSession('first message\n\nsecond message\n  third message  \n', '.txt');
    const messages = parseSessionFile(filePath);
    expect(messages).toEqual(['first message', 'second message', 'third message']);
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  });

  it('parses JSON lines with role/content fields', () => {
    const filePath = writeTempSession(
      [
        '{"role":"user","content":"Need a migration plan"}',
        '{"role":"assistant","content":[{"text":"Use phased rollout"}]}',
        '{"type":"message","message":{"role":"assistant","content":"Add a fallback path"}}'
      ].join('\n'),
      '.jsonl'
    );

    const messages = parseSessionFile(filePath);
    expect(messages).toEqual([
      'user: Need a migration plan',
      'assistant: Use phased rollout',
      'assistant: Add a fallback path'
    ]);
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  });

  it('parses markdown transcripts into message chunks', () => {
    const filePath = writeTempSession(
      [
        '# Session',
        '',
        '## User',
        '- Need robust retries for wake.',
        '',
        '## Assistant',
        'Proposed adding observer flush in sleep.',
        '',
        '> User: Also include recent observations in wake summary.'
      ].join('\n'),
      '.md'
    );

    const messages = parseSessionFile(filePath);
    expect(messages).toContain('Session');
    expect(messages.join(' ')).toContain('Need robust retries for wake.');
    expect(messages.join(' ')).toContain('Proposed adding observer flush in sleep.');
    expect(messages).toContain('user: Also include recent observations in wake summary.');
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  });
});

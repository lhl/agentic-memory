import {
  DATE_HEADING_RE,
  inferObservationType,
  normalizeObservationContent,
  parseObservationMarkdown,
  renderObservationMarkdown,
  type ParsedObservationRecord,
  type ObservationType
} from '../lib/observation-format.js';
import { requestLlmCompletion, resolveLlmProvider } from '../lib/llm-provider.js';

export interface CompressorOptions {
  provider?: CompressionProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}

export type CompressionProvider =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'openai-compatible'
  | 'ollama';

type ResolvedCompressionBackend = {
  provider: CompressionProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_PROVIDER_MODELS: Record<CompressionProvider, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  'openai-compatible': 'gpt-4o-mini',
  ollama: 'llama3.2'
};

const CRITICAL_RE =
  /(?:\b(?:decision|decided|chose|chosen|selected|picked|opted|switched to)\s*:?|\bdecid(?:e|ed|ing|ion)\b|\berror\b|\bfail(?:ed|ure|ing)?\b|\bblock(?:ed|er)?\b|\bbreaking(?:\s+change)?s?\b|\bcritical\b|\b\w+\s+chosen\s+(?:for|over|as)\b|\bpublish(?:ed)?\b.*@?\d+\.\d+|\bmerge[d]?\s+(?:PR|pull\s+request)\b|\bshipped\b|\breleased?\b.*v?\d+\.\d+|\bsigned\b.*\b(?:contract|agreement|deal)\b|\bpricing\b.*\$|\bdemo\b.*\b(?:completed?|done|finished)\b|\bmeeting\b.*\b(?:completed?|done|finished)\b|\bstrategy\b.*\b(?:pivot|change|shift)\b)/i;
const DEADLINE_WITH_DATE_RE = /(?:(?:\bdeadline\b|\bdue(?:\s+date)?\b|\bcutoff\b).*(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})|(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}).*(?:\bdeadline\b|\bdue(?:\s+date)?\b|\bcutoff\b))/i;
const NOTABLE_RE = /\b(prefer(?:ence|s)?|likes?|dislikes?|context|pattern|architecture|approach|trade[- ]?off|milestone|stakeholder|teammate|collaborat(?:e|ed|ion)|discussion|notable|deadline|due|timeline|deploy(?:ed|ment)?|built|configured|launched|proposal|pitch|onboard(?:ed|ing)?|migrat(?:e|ed|ion)|domain|DNS|infra(?:structure)?)\b/i;
const TODO_SIGNAL_RE = /(?:\btodo:\s*|\bwe need to\b|\bdon't forget(?: to)?\b|\bremember to\b|\bmake sure to\b)/i;
const COMMITMENT_TASK_SIGNAL_RE = /\b(?:i'?ll|i will|let me|(?:i'?m\s+)?going to|plan to|should)\b/i;
const UNRESOLVED_COMMITMENT_RE = /\b(?:need to figure out|tbd|to be determined)\b/i;
const DEADLINE_SIGNAL_RE = /\b(?:by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)|before\s+the\s+\w+|deadline is)\b/i;

export class Compressor {
  private readonly provider?: CompressionProvider;
  private readonly model?: string;
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly now: () => Date;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CompressorOptions = {}) {
    this.provider = options.provider;
    this.model = options.model;
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.now = options.now ?? (() => new Date());
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async compress(messages: string[], existingObservations: string): Promise<string> {
    const cleanedMessages = messages.map((message) => message.trim()).filter(Boolean);
    if (cleanedMessages.length === 0) {
      return existingObservations.trim();
    }

    const prompt = this.buildPrompt(cleanedMessages, existingObservations);
    const backend = this.resolveProvider();

    if (backend) {
      try {
        const llmOutput = backend.provider === 'anthropic'
          ? await this.callAnthropic(prompt, backend)
          : backend.provider === 'gemini'
          ? await this.callGemini(prompt, backend)
          : backend.provider === 'openai'
          ? await this.callOpenAI(prompt, backend)
          : await this.callOpenAICompatible(prompt, backend);
        const normalized = this.normalizeLlmOutput(llmOutput);
        if (normalized) {
          return this.mergeObservations(existingObservations, normalized);
        }
      } catch {
        // Fall back to deterministic extraction to keep observer flow stable.
      }
    }

    const fallback = this.fallbackCompression(cleanedMessages);
    return this.mergeObservations(existingObservations, fallback);
  }

  private resolveProvider(): ResolvedCompressionBackend | null {
    if (process.env.CLAWVAULT_NO_LLM) return null;

    if (this.provider) {
      const configured = this.resolveConfiguredProvider(this.provider);
      if (configured) {
        return configured;
      }
      return this.resolveProviderFromEnv(false);
    }

    return this.resolveProviderFromEnv(true);
  }

  private resolveConfiguredProvider(provider: CompressionProvider): ResolvedCompressionBackend | null {
    const model = this.resolveModel(provider);
    if (provider === 'anthropic') {
      const apiKey = this.resolveApiKey(provider);
      if (!apiKey) {
        return null;
      }
      return {
        provider,
        model,
        apiKey
      };
    }

    if (provider === 'gemini') {
      const apiKey = this.resolveApiKey(provider);
      if (!apiKey) {
        return null;
      }
      return {
        provider,
        model,
        apiKey
      };
    }

    if (provider === 'openai') {
      const apiKey = this.resolveApiKey(provider);
      if (!apiKey) {
        return null;
      }
      return {
        provider,
        model,
        apiKey,
        baseUrl: this.resolveBaseUrl(provider)
      };
    }

    const apiKey = this.resolveApiKey(provider) ?? undefined;
    return {
      provider,
      model,
      apiKey,
      baseUrl: this.resolveBaseUrl(provider)
    };
  }

  private resolveProviderFromEnv(allowConfiguredModel: boolean): ResolvedCompressionBackend | null {
    const anthropicApiKey = this.readEnvValue('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      return {
        provider: 'anthropic',
        model: allowConfiguredModel ? this.resolveModel('anthropic') : DEFAULT_PROVIDER_MODELS.anthropic,
        apiKey: anthropicApiKey
      };
    }

    const openAiApiKey = this.readEnvValue('OPENAI_API_KEY');
    if (openAiApiKey) {
      return {
        provider: 'openai',
        model: allowConfiguredModel ? this.resolveModel('openai') : DEFAULT_PROVIDER_MODELS.openai,
        apiKey: openAiApiKey,
        baseUrl: OPENAI_BASE_URL
      };
    }

    const geminiApiKey = this.readEnvValue('GEMINI_API_KEY');
    if (geminiApiKey) {
      return {
        provider: 'gemini',
        model: allowConfiguredModel ? this.resolveModel('gemini') : DEFAULT_PROVIDER_MODELS.gemini,
        apiKey: geminiApiKey
      };
    }

    return null;
  }

  private resolveModel(provider: CompressionProvider): string {
    const configuredModel = this.model?.trim();
    if (configuredModel) {
      return configuredModel;
    }
    return DEFAULT_PROVIDER_MODELS[provider];
  }

  private resolveApiKey(provider: CompressionProvider): string | null {
    const configuredApiKey = this.apiKey?.trim();
    if (configuredApiKey) {
      return configuredApiKey;
    }

    if (provider === 'anthropic') {
      return this.readEnvValue('ANTHROPIC_API_KEY');
    }
    if (provider === 'gemini') {
      return this.readEnvValue('GEMINI_API_KEY');
    }
    return this.readEnvValue('OPENAI_API_KEY');
  }

  private resolveBaseUrl(provider: CompressionProvider): string {
    const configuredBaseUrl = this.baseUrl?.trim();
    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/+$/, '');
    }
    if (provider === 'ollama') {
      return OLLAMA_BASE_URL;
    }
    return OPENAI_BASE_URL;
  }

  private readEnvValue(name: string): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
  }

  private buildPrompt(messages: string[], existingObservations: string): string {
    return [
      'You are an observer that compresses raw AI session messages into durable, human-meaningful observations.',
      '',
      'Rules:',
      '- Output markdown only.',
      '- Group observations by date heading: ## YYYY-MM-DD',
      '- Each observation line MUST follow: - [type|c=<0.00-1.00>|i=<0.00-1.00>] <observation>',
      '- Allowed type tags: decision, preference, fact, commitment, task, todo, commitment-unresolved, milestone, lesson, relationship, project',
      '- i >= 0.80 for structural/persistent observations (major decisions, blockers, releases, commitments)',
      '- i 0.40-0.79 for potentially important observations (notable context, preferences, milestones)',
      '- i < 0.40 for contextual/routine observations',
      '- Confidence c reflects extraction certainty, not importance.',
      '- Preserve source tags when present (e.g., [main], [telegram-dm], [discord], [telegram-group]).',
      '',
      'TASK EXTRACTION (required):',
      '- Emit [todo] for explicit TODO phrasing: "TODO:", "we need to", "don\'t forget", "remember to", "make sure to".',
      '- Emit [task] for commitments/action intent: "I\'ll", "I will", "let me", "going to", "plan to", "should".',
      '- Emit [commitment-unresolved] for unresolved commitments/questions: "need to figure out", "TBD", "to be determined".',
      '- Deadline language ("by Friday", "before the demo", "deadline is") should increase importance and usually map to [task] unless unresolved.',
      '',
      'QUALITY FILTERS (important):',
      '- DO NOT observe: CLI errors, command failures, tool output parsing issues, retry attempts, debug logs.',
      '  These are transient noise, not memories. Only observe errors if they represent a BLOCKER or an unresolved problem.',
      '- DO NOT observe: "acknowledged the conversation", "said okay", routine confirmations.',
      '- MERGE related events into single observations. If 5 images were generated, say "Generated 5 images for X" not 5 separate lines.',
      '- MERGE retry sequences: "Tried X, failed, tried Y, succeeded" → "Resolved X using Y (after initial failure)"',
      '- Prefer OUTCOMES over PROCESSES: "Deployed v1.2 to Railway" not "Started deploy... build finished... deploy succeeded"',
      '',
      'AGENT ATTRIBUTION:',
      '- If the transcript shows multiple speakers/agents, prefix observations with who did it: "Pedro asked...", "Clawdious deployed...", "Zeca generated..."',
      '- If only one agent is acting, attribution is optional.',
      '',
      'PROJECT MILESTONES (critical — these are the most valuable observations):',
      'Projects are NOT just code. Milestones include business, strategy, client, and operational events.',
      '- Use milestone/decision/commitment types for strategic events with high importance.',
      '- Use preference/lesson/relationship/project/fact when appropriate.',
      '- Examples:',
      '  "- [decision|c=0.95|i=0.90] 14:00 Pricing decision: $33K one-time + $3K/mo for Artemisa"',
      '  "- [milestone|c=0.93|i=0.88] 14:00 Published clawvault@2.1.0 to npm"',
      '  "- [project|c=0.84|i=0.58] 14:00 Deployed pitch deck to artemisa-pitch-deck.vercel.app"',
      '- Do NOT collapse multiple milestones into one line — each matters for history.',
      '',
      'COMMITMENT FORMAT (when someone promises/agrees to something):',
      '- Prefer: "- [commitment|c=...|i=...] HH:MM [COMMITMENT] <who> committed to <what> by <when>"',
      '',
      'Keep observations concise and factual. Aim for signal, not completeness.',
      '',
      'Existing observations (may be empty):',
      existingObservations.trim() || '(none)',
      '',
      'Raw messages:',
      ...messages.map((message, index) => `[${index + 1}] ${message}`),
      '',
      'Return only the updated observation markdown.'
    ].join('\n');
  }

  private buildOpenAICompatibleUrl(baseUrl: string): string {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    return `${normalizedBaseUrl}/chat/completions`;
  }

  private buildOpenAICompatibleHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  private extractOpenAIContent(content: unknown): string {
    if (typeof content === 'string') {
      return content.trim();
    }

    if (!Array.isArray(content)) {
      return '';
    }

    const parts = content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (!part || typeof part !== 'object') {
          return '';
        }
        const candidate = part as { text?: unknown };
        return typeof candidate.text === 'string' ? candidate.text : '';
      })
      .filter((part) => part.trim().length > 0);

    return parts.join('\n').trim();
  }

  private async callAnthropic(
    prompt: string,
    backend: ResolvedCompressionBackend
  ): Promise<string> {
    if (!backend.apiKey) {
      return '';
    }

    const response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': backend.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: backend.model,
        temperature: 0.1,
        max_tokens: 1400,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed (${response.status})`);
    }

    const payload = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    return payload.content
      ?.filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text as string)
      .join('\n')
      .trim() ?? '';
  }

  private async callOpenAI(
    prompt: string,
    backend: ResolvedCompressionBackend
  ): Promise<string> {
    return this.callOpenAICompatible(prompt, backend);
  }

  private async callOpenAICompatible(
    prompt: string,
    backend: ResolvedCompressionBackend
  ): Promise<string> {
    const baseUrl = backend.baseUrl ?? this.resolveBaseUrl(backend.provider);
    const response = await this.fetchImpl(this.buildOpenAICompatibleUrl(baseUrl), {
      method: 'POST',
      headers: this.buildOpenAICompatibleHeaders(backend.apiKey),
      body: JSON.stringify({
        model: backend.model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'You transform session logs into concise observations.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed (${response.status})`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    return this.extractOpenAIContent(payload.choices?.[0]?.message?.content);
  }

  private async callGemini(
    prompt: string,
    backend: ResolvedCompressionBackend
  ): Promise<string> {
    if (!backend.apiKey) {
      return '';
    }

    const model = encodeURIComponent(backend.model);
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${backend.apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1400 }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed (${response.status})`);
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  private normalizeLlmOutput(output: string): string {
    if (!output.trim()) {
      return '';
    }

    const cleaned = output
      .replace(/^```(?:markdown)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const hasObservationLine = lines.some((line) => line.startsWith('- [') || /^(?:-\s*)?(🔴|🟡|🟢)\s+/.test(line));
    if (!hasObservationLine) {
      return '';
    }

    const hasDateHeading = lines.some((line) => DATE_HEADING_RE.test(line));
    const result = hasDateHeading ? cleaned : `## ${this.formatDate(this.now())}\n\n${cleaned}`;

    // Post-process: fix wiki-link corruption, then enforce importance rules
    // LLMs often fuse preceding words into wiki-links: "reque[[people/pedro]]"
    const sanitized = this.sanitizeWikiLinks(result);
    return this.enforceImportanceRules(sanitized);
  }

  /**
   * Fix wiki-link corruption from LLM compression.
   * LLMs often fuse preceding word fragments into wiki-links during rewriting:
   *   "reque[[people/pedro]]" → "[[people/pedro]]"
   *   "Linke[[agents/zeca]]" → "[[agents/zeca]]"
   *   "taske[[people/pedro]]a" → "[[people/pedro]]"
   * Also fixes trailing word fragments fused after closing brackets.
   */
  private sanitizeWikiLinks(markdown: string): string {
    // Fix word fragments fused BEFORE opening [[ — e.g. "reque[[foo]]" → " [[foo]]"
    let result = markdown.replace(/\w+\[\[/g, ' [[');
    // Fix word fragments fused AFTER closing ]] — e.g. "[[foo]]sted" → "[[foo]]"
    result = result.replace(/\]\]\w+/g, ']]');
    // Clean up any double spaces introduced
    result = result.replace(/ {2,}/g, ' ');
    return result;
  }

  private enforceImportanceRules(markdown: string): string {
    const parsed = parseObservationMarkdown(markdown);
    if (parsed.length === 0) {
      return '';
    }

    const grouped = new Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>();

    for (const record of parsed) {
      const adjusted = this.enforceImportanceForRecord(record);
      const bucket = grouped.get(record.date) ?? [];
      bucket.push(adjusted);
      grouped.set(record.date, bucket);
    }

    return renderObservationMarkdown(grouped);
  }

  private enforceImportanceForRecord(record: ParsedObservationRecord): {
    type: ObservationType;
    confidence: number;
    importance: number;
    content: string;
  } {
    let importance = record.importance;
    let confidence = record.confidence;
    let type = record.type;
    const inferredTaskType = this.inferTaskType(record.content);

    if (this.isCriticalContent(record.content)) {
      importance = Math.max(importance, 0.85);
      confidence = Math.max(confidence, 0.85);
      if (type === 'fact') {
        type = inferObservationType(record.content);
      }
    } else if (this.isNotableContent(record.content)) {
      importance = Math.max(importance, 0.5);
      confidence = Math.max(confidence, 0.75);
    }

    if (inferredTaskType) {
      type = type === 'fact' || type === 'commitment' ? inferredTaskType : type;
      importance = Math.max(importance, inferredTaskType === 'commitment-unresolved' ? 0.72 : 0.65);
      confidence = Math.max(confidence, 0.8);
    }

    if (type === 'decision' || type === 'commitment' || type === 'milestone') {
      importance = Math.max(importance, 0.6);
    }

    return {
      type,
      confidence: this.clamp01(confidence),
      importance: this.clamp01(importance),
      content: record.content
    };
  }

  private fallbackCompression(messages: string[]): string {
    const sections = new Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>();
    const seen = new Set<string>();

    for (const message of messages) {
      const normalized = this.normalizeText(message);
      if (!normalized) continue;

      const date = this.extractDate(message) ?? this.formatDate(this.now());
      const time = this.extractTime(message) ?? this.formatTime(this.now());
      const line = `${time} ${normalized}`;
      const type = inferObservationType(line);
      const importance = this.inferImportance(line, type);
      const confidence = this.inferConfidence(line, type, importance);
      const dedupeKey = `${date}|${type}|${normalizeObservationContent(line)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const bucket = sections.get(date) ?? [];
      bucket.push({ type, confidence, importance, content: line });
      sections.set(date, bucket);
    }

    if (sections.size === 0) {
      const date = this.formatDate(this.now());
      sections.set(date, [{
        type: 'fact',
        confidence: 0.7,
        importance: 0.2,
        content: `${this.formatTime(this.now())} Processed session updates.`
      }]);
    }

    return this.renderSections(sections);
  }

  private mergeObservations(existing: string, incoming: string): string {
    const existingRecords = parseObservationMarkdown(existing);
    const incomingRecords = parseObservationMarkdown(incoming);

    if (incomingRecords.length === 0) {
      return existing.trim();
    }

    const merged = new Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>();

    for (const record of existingRecords) {
      this.mergeRecord(merged, {
        date: record.date,
        type: record.type,
        confidence: record.confidence,
        importance: record.importance,
        content: record.content
      });
    }
    for (const record of incomingRecords) {
      this.mergeRecord(merged, {
        date: record.date,
        type: record.type,
        confidence: record.confidence,
        importance: record.importance,
        content: record.content
      });
    }

    return this.renderSections(merged);
  }

  private mergeRecord(
    sections: Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>,
    input: {
      date: string;
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }
  ): void {
    const bucket = sections.get(input.date) ?? [];
    const key = normalizeObservationContent(input.content);
    const index = bucket.findIndex((line) => normalizeObservationContent(line.content) === key);
    if (index === -1) {
      bucket.push({
        type: input.type,
        confidence: this.clamp01(input.confidence),
        importance: this.clamp01(input.importance),
        content: input.content.trim()
      });
      sections.set(input.date, bucket);
      return;
    }

    const existing = bucket[index];
    bucket[index] = {
      type: input.importance >= existing.importance ? input.type : existing.type,
      confidence: this.clamp01(Math.max(existing.confidence, input.confidence)),
      importance: this.clamp01(Math.max(existing.importance, input.importance)),
      content: existing.content.length >= input.content.length ? existing.content : input.content
    };
    sections.set(input.date, bucket);
  }

  private renderSections(
    sections: Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>
  ): string {
    return renderObservationMarkdown(sections);
  }

  private inferImportance(text: string, type: ObservationType): number {
    const inferredTaskType = this.inferTaskType(text);
    if (this.isCriticalContent(text)) return 0.9;
    if (inferredTaskType === 'commitment-unresolved') return 0.72;
    if (inferredTaskType === 'task' || inferredTaskType === 'todo') return 0.65;
    if (this.isNotableContent(text)) return 0.6;
    if (type === 'decision' || type === 'commitment' || type === 'milestone') return 0.55;
    if (type === 'preference' || type === 'lesson' || type === 'relationship' || type === 'project') return 0.45;
    return 0.2;
  }

  private inferConfidence(text: string, type: ObservationType, importance: number): number {
    const inferredTaskType = this.inferTaskType(text);
    let confidence = 0.72;
    if (importance >= 0.8) confidence += 0.12;
    if (type === 'decision' || type === 'commitment' || type === 'milestone') confidence += 0.06;
    if (inferredTaskType) confidence += 0.06;
    if (/\b(?:decided|chose|committed|deadline|released|merged)\b/i.test(text)) {
      confidence += 0.05;
    }
    return this.clamp01(confidence);
  }

  private isCriticalContent(text: string): boolean {
    return CRITICAL_RE.test(text) || DEADLINE_WITH_DATE_RE.test(text);
  }

  private isNotableContent(text: string): boolean {
    return NOTABLE_RE.test(text);
  }

  private inferTaskType(text: string): 'task' | 'todo' | 'commitment-unresolved' | null {
    if (UNRESOLVED_COMMITMENT_RE.test(text)) {
      return 'commitment-unresolved';
    }
    if (TODO_SIGNAL_RE.test(text)) {
      return 'todo';
    }
    if (COMMITMENT_TASK_SIGNAL_RE.test(text) || DEADLINE_SIGNAL_RE.test(text)) {
      return 'task';
    }
    return null;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()
      .slice(0, 280);
  }

  private extractDate(text: string): string | null {
    const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    return match?.[1] ?? null;
  }

  private extractTime(text: string): string | null {
    const match = text.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
    if (!match) {
      return null;
    }
    return `${match[1]}:${match[2]}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toISOString().slice(11, 16);
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}

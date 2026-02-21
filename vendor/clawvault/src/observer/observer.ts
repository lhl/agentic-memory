import * as fs from 'fs';
import * as path from 'path';
import { Compressor, type CompressionProvider } from './compressor.js';
import { Reflector } from './reflector.js';
import { Router } from './router.js';
import { listConfig } from '../lib/config-manager.js';
import {
  ensureLedgerStructure,
  ensureParentDir,
  getLegacyObservationPath,
  getObservationPath,
  getRawTranscriptPath,
  toDateKey
} from '../lib/ledger.js';
import {
  normalizeObservationContent,
  parseObservationMarkdown,
  renderObservationMarkdown,
  type ObservationType
} from '../lib/observation-format.js';

export interface ObserverCompressor {
  compress(messages: string[], existingObservations: string): Promise<string>;
}

export interface ObserverReflector {
  reflect(observations: string): string;
}

export interface ObserverOptions {
  tokenThreshold?: number;
  reflectThreshold?: number;
  model?: string;
  compressionProvider?: CompressionProvider;
  compressionBaseUrl?: string;
  compressionApiKey?: string;
  compressor?: ObserverCompressor;
  reflector?: ObserverReflector;
  now?: () => Date;
  rawCapture?: boolean;
  extractTasks?: boolean;
}

export interface ObserverProcessOptions {
  source?: string;
  sessionKey?: string;
  transcriptId?: string;
  timestamp?: Date;
}

type CompressionConfigSnapshot = {
  provider?: CompressionProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
};

const COMPRESSION_PROVIDERS = new Set<CompressionProvider>([
  'anthropic',
  'openai',
  'gemini',
  'openai-compatible',
  'ollama'
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asCompressionProvider(value: unknown): CompressionProvider | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim() as CompressionProvider;
  return COMPRESSION_PROVIDERS.has(normalized) ? normalized : undefined;
}

function readCompressionConfig(vaultPath: string): CompressionConfigSnapshot {
  try {
    const config = listConfig(vaultPath);
    const root = asRecord(config);
    const observer = asRecord(root?.observer);
    const compression = asRecord(observer?.compression);
    if (!compression) {
      return {};
    }
    return {
      provider: asCompressionProvider(compression.provider),
      model: asNonEmptyString(compression.model),
      baseUrl: asNonEmptyString(compression.baseUrl),
      apiKey: asNonEmptyString(compression.apiKey)
    };
  } catch {
    return {};
  }
}

export class Observer {
  private readonly vaultPath: string;
  private readonly tokenThreshold: number;
  // Kept for backwards API compatibility with callers that still pass this.
  // Reflection now runs explicitly via clawvault reflect.
  private readonly reflectThreshold: number;
  private readonly compressor: ObserverCompressor;
  private readonly reflector: ObserverReflector;
  private readonly now: () => Date;
  private readonly rawCapture: boolean;

  private readonly router: Router;
  private pendingMessages: string[] = [];
  private pendingRouteContext: ObserverProcessOptions = {};
  private observationsCache = '';
  private lastRoutingSummary = '';

  constructor(vaultPath: string, options: ObserverOptions = {}) {
    this.vaultPath = path.resolve(vaultPath);
    this.tokenThreshold = options.tokenThreshold ?? 30000;
    this.reflectThreshold = options.reflectThreshold ?? 40000;
    this.now = options.now ?? (() => new Date());
    const compressionConfig = readCompressionConfig(this.vaultPath);
    this.compressor = options.compressor ?? new Compressor({
      provider: options.compressionProvider ?? compressionConfig.provider,
      model: options.model ?? compressionConfig.model,
      baseUrl: options.compressionBaseUrl ?? compressionConfig.baseUrl,
      apiKey: options.compressionApiKey ?? compressionConfig.apiKey,
      now: this.now
    });
    this.reflector = options.reflector ?? new Reflector({ now: this.now });
    this.rawCapture = options.rawCapture ?? true;

    this.router = new Router(vaultPath, {
      extractTasks: options.extractTasks,
      now: this.now
    });

    ensureLedgerStructure(this.vaultPath);
    this.observationsCache = this.readTodayObservations();
  }

  async processMessages(messages: string[], options: ObserverProcessOptions = {}): Promise<void> {
    const incoming = messages.map((message) => message.trim()).filter(Boolean);
    if (incoming.length === 0) {
      return;
    }

    if (this.rawCapture) {
      this.persistRawMessages(incoming, options);
    }

    this.pendingMessages.push(...incoming);
    this.pendingRouteContext = this.mergeRouteContext(this.pendingRouteContext, options);
    const buffered = this.pendingMessages.join('\n');
    if (this.estimateTokens(buffered) < this.tokenThreshold) {
      return;
    }

    const today = this.now();
    const todayPath = getObservationPath(this.vaultPath, today);
    const existingRaw = this.readObservationForDate(today);
    const existing = this.deduplicateObservationMarkdown(existingRaw);
    if (existingRaw.trim() !== existing) {
      this.writeObservationFile(todayPath, existing);
    }
    const compressedRaw = (await this.compressor.compress(this.pendingMessages, existing)).trim();
    const routeContext = this.pendingRouteContext;
    this.pendingMessages = [];
    this.pendingRouteContext = {};
    const compressed = this.deduplicateObservationMarkdown(compressedRaw);

    if (!compressed) {
      return;
    }

    this.writeObservationFile(todayPath, compressed);
    this.observationsCache = compressed;

    // Route observations to vault categories (decisions/, lessons/, etc.)
    const { summary } = this.router.route(compressed, routeContext);
    if (summary) {
      this.lastRoutingSummary = summary;
    }
  }

  /**
   * Force-flush pending messages regardless of threshold.
   * Call this on session end to capture everything.
   */
  async flush(): Promise<{ observations: string; routingSummary: string }> {
    if (this.pendingMessages.length === 0) {
      return { observations: this.observationsCache, routingSummary: this.lastRoutingSummary };
    }

    const today = this.now();
    const todayPath = getObservationPath(this.vaultPath, today);
    const existingRaw = this.readObservationForDate(today);
    const existing = this.deduplicateObservationMarkdown(existingRaw);
    if (existingRaw.trim() !== existing) {
      this.writeObservationFile(todayPath, existing);
    }
    const compressedRaw = (await this.compressor.compress(this.pendingMessages, existing)).trim();
    const routeContext = this.pendingRouteContext;
    this.pendingMessages = [];
    this.pendingRouteContext = {};
    const compressed = this.deduplicateObservationMarkdown(compressedRaw);

    if (compressed) {
      this.writeObservationFile(todayPath, compressed);
      this.observationsCache = compressed;
      const { summary } = this.router.route(compressed, routeContext);
      this.lastRoutingSummary = summary;
    }

    return { observations: this.observationsCache, routingSummary: this.lastRoutingSummary };
  }

  getObservations(): string {
    this.observationsCache = this.readTodayObservations();
    return this.observationsCache;
  }

  private estimateTokens(input: string): number {
    return Math.ceil(input.length / 4);
  }

  private readTodayObservations(): string {
    return this.readObservationForDate(this.now());
  }

  private readObservationForDate(date: Date): string {
    const ledgerPath = getObservationPath(this.vaultPath, date);
    const ledgerValue = this.readObservationFile(ledgerPath);
    if (ledgerValue) {
      return ledgerValue;
    }
    return this.readObservationFile(getLegacyObservationPath(this.vaultPath, toDateKey(date)));
  }

  private readObservationFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf-8').trim();
  }

  private writeObservationFile(filePath: string, content: string): void {
    ensureParentDir(filePath);
    fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf-8');
  }

  private deduplicateObservationMarkdown(markdown: string): string {
    const parsed = parseObservationMarkdown(markdown);
    if (parsed.length === 0) {
      return markdown.trim();
    }

    const grouped = new Map<string, Array<{
      type: ObservationType;
      confidence: number;
      importance: number;
      content: string;
    }>>();

    for (const record of parsed) {
      const bucket = grouped.get(record.date) ?? [];
      const normalized = normalizeObservationContent(record.content);
      const existingIndex = bucket.findIndex(
        (line) => normalizeObservationContent(line.content) === normalized
      );

      if (existingIndex === -1) {
        bucket.push({
          type: record.type,
          confidence: record.confidence,
          importance: record.importance,
          content: record.content
        });
      } else {
        const existing = bucket[existingIndex];
        bucket[existingIndex] = {
          type: record.importance >= existing.importance ? record.type : existing.type,
          confidence: Math.max(existing.confidence, record.confidence),
          importance: Math.max(existing.importance, record.importance),
          content: existing.content.length >= record.content.length ? existing.content : record.content
        };
      }

      grouped.set(record.date, bucket);
    }

    return renderObservationMarkdown(grouped);
  }

  private persistRawMessages(
    messages: string[],
    options: ObserverProcessOptions
  ): void {
    const source = this.sanitizeSource(options.source ?? 'openclaw');
    const messageTimestamp = options.timestamp ?? this.now();
    const rawPath = getRawTranscriptPath(this.vaultPath, source, messageTimestamp);
    ensureParentDir(rawPath);

    const records = messages.map((message) => JSON.stringify({
      recordedAt: this.now().toISOString(),
      timestamp: messageTimestamp.toISOString(),
      source,
      sessionKey: options.sessionKey ?? null,
      transcriptId: options.transcriptId ?? null,
      message
    }));
    fs.appendFileSync(rawPath, `${records.join('\n')}\n`, 'utf-8');
  }

  private sanitizeSource(source: string): string {
    const normalized = source.trim().toLowerCase();
    if (/^[a-z0-9_-]{1,64}$/.test(normalized)) {
      return normalized;
    }
    return 'openclaw';
  }

  private mergeRouteContext(
    existing: ObserverProcessOptions,
    incoming: ObserverProcessOptions
  ): ObserverProcessOptions {
    const merged: ObserverProcessOptions = { ...existing };
    if (incoming.source) merged.source = incoming.source;
    if (incoming.sessionKey) merged.sessionKey = incoming.sessionKey;
    if (incoming.transcriptId) merged.transcriptId = incoming.transcriptId;
    if (incoming.timestamp) merged.timestamp = incoming.timestamp;
    return merged;
  }
}

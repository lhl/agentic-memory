import * as fs from 'fs';
import * as path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Observer } from './observer.js';

export interface SessionWatcherOptions {
  ignoreInitial?: boolean;
  debounceMs?: number;
  flushThresholdChars?: number;
}

const DEFAULT_FLUSH_THRESHOLD_CHARS = 500;

export class SessionWatcher {
  private readonly watchPath: string;
  private readonly observer: Observer;
  private readonly ignoreInitial: boolean;
  private readonly debounceMs: number;
  private readonly flushThresholdChars: number;
  private watcher: FSWatcher | null = null;
  private fileOffsets = new Map<string, number>();
  private pendingPaths = new Set<string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private processingQueue: Promise<void> = Promise.resolve();
  private bufferedChars = 0;

  constructor(watchPath: string, observer: Observer, options: SessionWatcherOptions = {}) {
    this.watchPath = path.resolve(watchPath);
    this.observer = observer;
    this.ignoreInitial = options.ignoreInitial ?? false;
    this.debounceMs = options.debounceMs ?? 500;
    this.flushThresholdChars = Math.max(1, options.flushThresholdChars ?? DEFAULT_FLUSH_THRESHOLD_CHARS);
  }

  async start(): Promise<void> {
    if (!fs.existsSync(this.watchPath)) {
      throw new Error(`Watch path does not exist: ${this.watchPath}`);
    }

    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignoreInitial: this.ignoreInitial,
      awaitWriteFinish: {
        stabilityThreshold: 120,
        pollInterval: 30
      }
    });

    const enqueue = (changedPath: string): void => {
      this.pendingPaths.add(path.resolve(changedPath));
      this.scheduleDrain();
    };

    this.watcher.on('add', enqueue);
    this.watcher.on('change', enqueue);
    this.watcher.on('unlink', (deletedPath: string) => {
      const resolved = path.resolve(deletedPath);
      this.fileOffsets.delete(resolved);
      this.pendingPaths.delete(resolved);
    });

    await new Promise<void>((resolve, reject) => {
      this.watcher?.once('ready', () => resolve());
      this.watcher?.once('error', (error) => reject(error));
    });

    if (this.ignoreInitial) {
      // Prime offsets so existing files only stream new bytes after watch starts.
      this.primeInitialOffsets();
    }
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      this.drainPendingPaths();
    }
    await this.processingQueue.catch(() => undefined);
    if (this.bufferedChars > 0) {
      await this.observer.flush();
      this.bufferedChars = 0;
    }
    this.pendingPaths.clear();
    await this.watcher?.close();
    this.watcher = null;
  }

  private scheduleDrain(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.drainPendingPaths();
    }, this.debounceMs);
  }

  private drainPendingPaths(): void {
    const nextPaths = [...this.pendingPaths];
    this.pendingPaths.clear();

    for (const changedPath of nextPaths) {
      this.processingQueue = this.processingQueue
        .then(() => this.consumeFile(changedPath))
        .catch(() => undefined);
    }
  }

  private async consumeFile(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return;
    }

    const stats = fs.statSync(resolved);
    if (!stats.isFile()) {
      return;
    }

    const previousOffset = this.fileOffsets.get(resolved) ?? 0;
    const startOffset = stats.size < previousOffset ? 0 : previousOffset;
    if (stats.size <= startOffset) {
      this.fileOffsets.set(resolved, stats.size);
      return;
    }

    const bytesToRead = stats.size - startOffset;
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(resolved, 'r');

    try {
      fs.readSync(fd, buffer, 0, bytesToRead, startOffset);
    } finally {
      fs.closeSync(fd);
    }

    this.fileOffsets.set(resolved, stats.size);
    const chunk = buffer.toString('utf-8');
    const messages = chunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (messages.length === 0) {
      return;
    }

    await this.observer.processMessages(messages);
    this.bufferedChars += chunk.length;
    if (this.bufferedChars >= this.flushThresholdChars) {
      await this.observer.flush();
      this.bufferedChars = 0;
    }
  }

  private primeInitialOffsets(): void {
    for (const filePath of this.collectFiles(this.watchPath)) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          this.fileOffsets.set(filePath, stats.size);
        }
      } catch {
        // Best-effort priming: watcher events still keep offsets accurate.
      }
    }
  }

  private collectFiles(targetPath: string): string[] {
    if (!fs.existsSync(targetPath)) {
      return [];
    }

    const resolved = path.resolve(targetPath);
    const stats = fs.statSync(resolved);
    if (stats.isFile()) {
      return [resolved];
    }
    if (!stats.isDirectory()) {
      return [];
    }

    const collected: string[] = [];
    for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
      const childPath = path.join(resolved, entry.name);
      if (entry.isDirectory()) {
        collected.push(...this.collectFiles(childPath));
      } else if (entry.isFile()) {
        collected.push(path.resolve(childPath));
      }
    }
    return collected;
  }
}

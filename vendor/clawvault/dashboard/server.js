import express from 'express';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import { buildVaultGraph } from './lib/vault-parser.js';
import { diffGraphs } from './lib/graph-diff.js';

const DEFAULT_PORT = 3377;
const HOST = '0.0.0.0';

export async function startDashboard(options = {}) {
  const port = normalizePort(options.port ?? DEFAULT_PORT);
  const vaultPath = resolveVaultPath(options.vaultPath);
  await assertVaultPath(vaultPath);

  const app = express();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const projectDir = path.resolve(serverDir, '..');
  const publicDir = path.join(serverDir, 'public');
  const forceGraphDistDir = path.join(projectDir, 'node_modules', 'force-graph', 'dist');

  const graphStore = createLiveGraphStore(vaultPath);
  await graphStore.init();

  app.get('/api/graph', async (req, res) => {
    try {
      const shouldRefresh = req.query.refresh === '1';
      if (shouldRefresh) {
        await graphStore.refresh({ reason: 'api:refresh' });
      }
      res.json(graphStore.getGraph());
    } catch (error) {
      res.status(500).json({
        error: 'Failed to build graph',
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      vaultPath
    });
  });

  app.use('/vendor', express.static(forceGraphDistDir));
  app.use(express.static(publicDir, { extensions: ['html'] }));

  const server = await new Promise((resolve, reject) => {
    const runningServer = app
      .listen(port, HOST, () => resolve(runningServer))
      .on('error', reject);
  });

  const wsServer = new WebSocketServer({
    server,
    path: '/ws'
  });

  const unsubscribeGraphUpdates = graphStore.subscribe((update) => {
    broadcast(wsServer, {
      type: 'graph:patch',
      payload: {
        version: update.version,
        reason: update.reason,
        changedPaths: update.changedPaths,
        ...update.patch
      }
    });
  });

  wsServer.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        type: 'graph:init',
        payload: {
          version: graphStore.getVersion(),
          graph: graphStore.getGraph()
        }
      })
    );
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of wsServer.clients) {
      if (client.readyState === 1) {
        client.ping();
      }
    }
  }, 20_000);

  await graphStore.startWatching();

  logStartup({
    port,
    vaultPath
  });

  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    clearInterval(heartbeatInterval);
    unsubscribeGraphUpdates();
    await graphStore.close();
    await new Promise((resolve) => wsServer.close(() => resolve()));
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  return server;
}

function createLiveGraphStore(vaultPath) {
  const subscribers = new Set();
  const changedPathBuffer = new Set();
  const refreshDebounceMs = 240;
  let graph = null;
  let version = 0;
  let refreshTimer = null;
  let watcher = null;
  let inFlightRefresh = null;
  let refreshQueued = false;

  async function init() {
    graph = await buildVaultGraph(vaultPath);
    version = 1;
  }

  function getGraph() {
    return graph;
  }

  function getVersion() {
    return version;
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }

  function emit(update) {
    for (const listener of subscribers) {
      listener(update);
    }
  }

  function queueRefresh({ reason, changedPath }) {
    if (changedPath) {
      changedPathBuffer.add(changedPath);
    }
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh({ reason });
    }, refreshDebounceMs);
  }

  async function refresh({ reason = 'manual' } = {}) {
    if (inFlightRefresh) {
      refreshQueued = true;
      return inFlightRefresh;
    }

    const changedPaths = Array.from(changedPathBuffer).sort((a, b) => a.localeCompare(b));
    changedPathBuffer.clear();

    inFlightRefresh = buildVaultGraph(vaultPath)
      .then((nextGraph) => {
        const patch = diffGraphs(graph, nextGraph);
        graph = nextGraph;
        if (!patch.hasChanges) {
          return;
        }
        version += 1;
        emit({
          version,
          reason,
          changedPaths,
          patch
        });
      })
      .finally(async () => {
        inFlightRefresh = null;
        if (refreshQueued) {
          refreshQueued = false;
          await refresh({ reason: 'coalesced' });
        }
      });

    return inFlightRefresh;
  }

  async function startWatching() {
    watcher = chokidar.watch(path.join(vaultPath, '**', '*.md'), {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 180,
        pollInterval: 50
      },
      ignored: (watchedPath) => isIgnoredPath(vaultPath, watchedPath)
    });

    watcher
      .on('add', (filePath) => {
        queueRefresh({
          reason: 'fs:add',
          changedPath: toRelativeVaultPath(vaultPath, filePath)
        });
      })
      .on('change', (filePath) => {
        queueRefresh({
          reason: 'fs:change',
          changedPath: toRelativeVaultPath(vaultPath, filePath)
        });
      })
      .on('unlink', (filePath) => {
        queueRefresh({
          reason: 'fs:unlink',
          changedPath: toRelativeVaultPath(vaultPath, filePath)
        });
      })
      .on('error', (error) => {
        console.error(`Dashboard file watcher error: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  async function close() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
  }

  return {
    init,
    getGraph,
    getVersion,
    subscribe,
    refresh,
    startWatching,
    close
  };
}

function broadcast(wsServer, data) {
  const payload = JSON.stringify(data);
  for (const client of wsServer.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function isIgnoredPath(vaultPath, watchedPath) {
  const relativePath = toRelativeVaultPath(vaultPath, watchedPath);
  const segments = relativePath.split('/').filter(Boolean);

  return segments.some((segment) =>
    segment === '.git' || segment === '.obsidian' || segment === '.trash' || segment === 'node_modules'
  );
}

function toRelativeVaultPath(vaultPath, absolutePath) {
  return path.relative(vaultPath, absolutePath).split(path.sep).join('/');
}

function parseArgs(argv) {
  const options = {
    port: DEFAULT_PORT,
    vaultPath: undefined
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      options.port = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--vault' || arg === '-v') {
      options.vaultPath = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

function normalizePort(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsed;
}

function resolveVaultPath(input) {
  const candidate = input || process.env.CLAWVAULT_PATH || process.cwd();
  return path.resolve(candidate);
}

async function assertVaultPath(vaultPath) {
  let stat;
  try {
    stat = await fs.stat(vaultPath);
  } catch (error) {
    throw new Error(`Vault path not found: ${vaultPath}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Vault path is not a directory: ${vaultPath}`);
  }
}

function logStartup({ port, vaultPath }) {
  const interfaces = os.networkInterfaces();
  const networkUrls = [];

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) {
        continue;
      }
      networkUrls.push(`http://${address.address}:${port}`);
    }
  }

  console.log('\nClawVault Dashboard');
  console.log(`Vault: ${vaultPath}`);
  console.log(`Local: http://localhost:${port}`);
  for (const url of networkUrls) {
    console.log(`Network: ${url}`);
  }
  console.log('\nPress Ctrl+C to stop.\n');
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === executedFile) {
  startDashboard(parseArgs(process.argv.slice(2))).catch((error) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
      console.error('Port already in use.');
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  });
}

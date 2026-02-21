/**
 * Tailscale Integration for ClawVault
 * 
 * Provides native Tailscale networking capabilities for vault synchronization
 * across devices on a Tailscale network (tailnet).
 * 
 * Features:
 * - Tailscale status detection and peer discovery
 * - MagicDNS hostname resolution
 * - Secure peer-to-peer vault sync
 * - Tailscale Funnel/Serve integration for vault sharing
 */

import { spawnSync, spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { createWebDAVHandler, WEBDAV_PREFIX } from './webdav.js';

// ============================================================================
// Types
// ============================================================================

export interface TailscaleStatus {
  /** Whether Tailscale is installed */
  installed: boolean;
  /** Whether Tailscale daemon is running */
  running: boolean;
  /** Whether connected to tailnet */
  connected: boolean;
  /** Current device's Tailscale IP */
  selfIP?: string;
  /** Current device's MagicDNS hostname */
  selfHostname?: string;
  /** Current device's full domain name */
  selfDNSName?: string;
  /** Tailnet name */
  tailnetName?: string;
  /** Backend state (Running, Stopped, etc.) */
  backendState?: string;
  /** List of peers on the tailnet */
  peers: TailscalePeer[];
  /** Error message if any */
  error?: string;
}

export interface TailscalePeer {
  /** Peer's hostname */
  hostname: string;
  /** Peer's MagicDNS name */
  dnsName: string;
  /** Peer's Tailscale IP addresses */
  tailscaleIPs: string[];
  /** Whether peer is currently online */
  online: boolean;
  /** Operating system */
  os?: string;
  /** Whether this peer is the exit node */
  exitNode?: boolean;
  /** Whether this peer is a tagged device */
  tags?: string[];
  /** Last seen timestamp */
  lastSeen?: string;
  /** Whether peer is running ClawVault serve */
  clawvaultServing?: boolean;
  /** ClawVault serve port if detected */
  clawvaultPort?: number;
}

export interface TailscaleServeConfig {
  /** Port to serve on (default: 8384) */
  port?: number;
  /** Whether to use HTTPS (via Tailscale) */
  https?: boolean;
  /** Whether to expose via Tailscale Funnel (public internet) */
  funnel?: boolean;
  /** Path prefix for the serve endpoint */
  pathPrefix?: string;
  /** Optional WebDAV Basic Auth credentials */
  webdavAuth?: {
    username: string;
    password: string;
  };
}

export interface TailscaleSyncOptions {
  /** Target peer hostname or IP */
  peer: string;
  /** Port on the peer (default: 8384) */
  port?: number;
  /** Direction: push, pull, or bidirectional */
  direction?: 'push' | 'pull' | 'bidirectional';
  /** Dry run - don't actually sync */
  dryRun?: boolean;
  /** Delete files on target that don't exist on source */
  deleteOrphans?: boolean;
  /** Categories to sync (default: all) */
  categories?: string[];
  /** Use HTTPS for connection */
  https?: boolean;
}

export interface TailscaleSyncResult {
  /** Files pushed to peer */
  pushed: string[];
  /** Files pulled from peer */
  pulled: string[];
  /** Files deleted */
  deleted: string[];
  /** Files unchanged */
  unchanged: string[];
  /** Errors encountered */
  errors: string[];
  /** Sync statistics */
  stats: {
    bytesTransferred: number;
    filesProcessed: number;
    duration: number;
  };
}

export interface VaultManifest {
  /** Vault name */
  name: string;
  /** Vault version */
  version: string;
  /** Last updated timestamp */
  lastUpdated: string;
  /** File manifest with checksums */
  files: VaultFileEntry[];
}

export interface VaultFileEntry {
  /** Relative path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modified: string;
  /** SHA-256 checksum */
  checksum: string;
  /** Category */
  category: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_SERVE_PORT = 8384;
export const CLAWVAULT_SERVE_PATH = '/.clawvault';
export const MANIFEST_ENDPOINT = '/.clawvault/manifest';
export const SYNC_ENDPOINT = '/.clawvault/sync';
export const FILE_ENDPOINT = '/.clawvault/files';

// ============================================================================
// Tailscale CLI Detection and Status
// ============================================================================

/**
 * Check if Tailscale CLI is installed
 */
export function hasTailscale(): boolean {
  const probe = spawnSync('tailscale', ['version'], { 
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 5000
  });
  return !probe.error && probe.status === 0;
}

/**
 * Get Tailscale version
 */
export function getTailscaleVersion(): string | null {
  const result = spawnSync('tailscale', ['version'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 5000
  });
  
  if (result.error || result.status !== 0) {
    return null;
  }
  
  // Parse version from output (first line typically contains version)
  const lines = result.stdout.trim().split('\n');
  return lines[0] || null;
}

/**
 * Get comprehensive Tailscale status
 */
export function getTailscaleStatus(): TailscaleStatus {
  const status: TailscaleStatus = {
    installed: false,
    running: false,
    connected: false,
    peers: []
  };
  
  // Check if installed
  if (!hasTailscale()) {
    status.error = 'Tailscale CLI not found. Install from https://tailscale.com/download';
    return status;
  }
  status.installed = true;
  
  // Get status JSON
  const result = spawnSync('tailscale', ['status', '--json'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 10000
  });
  
  if (result.error) {
    status.error = `Failed to get Tailscale status: ${result.error.message}`;
    return status;
  }
  
  if (result.status !== 0) {
    // Tailscale might not be running
    status.error = result.stderr?.trim() || 'Tailscale daemon not running';
    return status;
  }
  
  try {
    const data = JSON.parse(result.stdout) as TailscaleStatusJSON;
    
    status.running = true;
    status.backendState = data.BackendState;
    status.connected = data.BackendState === 'Running';
    status.tailnetName = data.CurrentTailnet?.Name;
    
    // Self info
    if (data.Self) {
      status.selfIP = data.Self.TailscaleIPs?.[0];
      status.selfHostname = data.Self.HostName;
      status.selfDNSName = data.Self.DNSName;
    }
    
    // Parse peers
    if (data.Peer) {
      for (const [_, peerData] of Object.entries(data.Peer)) {
        const peer: TailscalePeer = {
          hostname: peerData.HostName || '',
          dnsName: peerData.DNSName || '',
          tailscaleIPs: peerData.TailscaleIPs || [],
          online: peerData.Online || false,
          os: peerData.OS,
          exitNode: peerData.ExitNode,
          tags: peerData.Tags,
          lastSeen: peerData.LastSeen
        };
        status.peers.push(peer);
      }
    }
  } catch (err) {
    status.error = `Failed to parse Tailscale status: ${err}`;
  }
  
  return status;
}

// Internal type for Tailscale JSON output
interface TailscaleStatusJSON {
  BackendState: string;
  CurrentTailnet?: {
    Name: string;
    MagicDNSSuffix: string;
  };
  Self?: {
    TailscaleIPs?: string[];
    HostName?: string;
    DNSName?: string;
  };
  Peer?: Record<string, {
    HostName?: string;
    DNSName?: string;
    TailscaleIPs?: string[];
    Online?: boolean;
    OS?: string;
    ExitNode?: boolean;
    Tags?: string[];
    LastSeen?: string;
  }>;
}

/**
 * Find a peer by hostname (partial match supported)
 */
export function findPeer(hostname: string): TailscalePeer | null {
  const status = getTailscaleStatus();
  if (!status.connected) {
    return null;
  }
  
  const normalizedSearch = hostname.toLowerCase();
  
  // Try exact hostname match first
  let peer = status.peers.find(p => 
    p.hostname.toLowerCase() === normalizedSearch
  );
  
  if (peer) return peer;
  
  // Try DNS name match
  peer = status.peers.find(p =>
    p.dnsName.toLowerCase().startsWith(normalizedSearch)
  );
  
  if (peer) return peer;
  
  // Try partial hostname match
  peer = status.peers.find(p =>
    p.hostname.toLowerCase().includes(normalizedSearch)
  );
  
  return peer || null;
}

/**
 * Get online peers only
 */
export function getOnlinePeers(): TailscalePeer[] {
  const status = getTailscaleStatus();
  return status.peers.filter(p => p.online);
}

/**
 * Resolve a peer hostname to its Tailscale IP
 */
export function resolvePeerIP(hostname: string): string | null {
  const peer = findPeer(hostname);
  return peer?.tailscaleIPs[0] || null;
}

// ============================================================================
// Vault Manifest Generation
// ============================================================================

import * as crypto from 'crypto';

/**
 * Calculate SHA-256 checksum of a file
 */
function calculateChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate vault manifest for synchronization
 */
export function generateVaultManifest(vaultPath: string): VaultManifest {
  const configPath = path.join(vaultPath, '.clawvault.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Not a ClawVault: ${vaultPath}`);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const files: VaultFileEntry[] = [];
  
  // Walk the vault directory
  function walkDir(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      // Skip hidden files/dirs except .clawvault.json
      if (entry.name.startsWith('.') && entry.name !== '.clawvault.json') {
        continue;
      }
      
      // Skip node_modules
      if (entry.name === 'node_modules') {
        continue;
      }
      
      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name === '.clawvault.json')) {
        const stats = fs.statSync(fullPath);
        const category = relativePath.split(path.sep)[0] || 'root';
        
        files.push({
          path: relPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          checksum: calculateChecksum(fullPath),
          category
        });
      }
    }
  }
  
  walkDir(vaultPath);
  
  return {
    name: config.name,
    version: config.version || '1.0.0',
    lastUpdated: new Date().toISOString(),
    files
  };
}

/**
 * Compare two manifests and return differences
 */
export function compareManifests(
  local: VaultManifest,
  remote: VaultManifest
): {
  toPush: VaultFileEntry[];
  toPull: VaultFileEntry[];
  conflicts: Array<{ path: string; local: VaultFileEntry; remote: VaultFileEntry }>;
  unchanged: string[];
} {
  const localFiles = new Map(local.files.map(f => [f.path, f]));
  const remoteFiles = new Map(remote.files.map(f => [f.path, f]));
  
  const toPush: VaultFileEntry[] = [];
  const toPull: VaultFileEntry[] = [];
  const conflicts: Array<{ path: string; local: VaultFileEntry; remote: VaultFileEntry }> = [];
  const unchanged: string[] = [];
  
  // Check local files against remote
  for (const [filePath, localFile] of localFiles) {
    const remoteFile = remoteFiles.get(filePath);
    
    if (!remoteFile) {
      // File only exists locally - push
      toPush.push(localFile);
    } else if (localFile.checksum === remoteFile.checksum) {
      // Files are identical
      unchanged.push(filePath);
    } else {
      // Files differ - check timestamps
      const localTime = new Date(localFile.modified).getTime();
      const remoteTime = new Date(remoteFile.modified).getTime();
      
      if (localTime > remoteTime) {
        // Local is newer - push
        toPush.push(localFile);
      } else if (remoteTime > localTime) {
        // Remote is newer - pull
        toPull.push(remoteFile);
      } else {
        // Same timestamp but different content - conflict
        conflicts.push({ path: filePath, local: localFile, remote: remoteFile });
      }
    }
  }
  
  // Check for files only on remote
  for (const [filePath, remoteFile] of remoteFiles) {
    if (!localFiles.has(filePath)) {
      toPull.push(remoteFile);
    }
  }
  
  return { toPush, toPull, conflicts, unchanged };
}

// ============================================================================
// HTTP Server for Vault Serving
// ============================================================================

export interface ServeInstance {
  server: http.Server;
  port: number;
  stop: () => Promise<void>;
}

/**
 * Start serving a vault over HTTP for Tailscale sync
 * Includes WebDAV support at /webdav/ for Obsidian mobile sync
 */
export function serveVault(
  vaultPath: string,
  options: TailscaleServeConfig = {}
): ServeInstance {
  const port = options.port || DEFAULT_SERVE_PORT;
  const pathPrefix = options.pathPrefix || CLAWVAULT_SERVE_PATH;
  
  if (!fs.existsSync(path.join(vaultPath, '.clawvault.json'))) {
    throw new Error(`Not a ClawVault: ${vaultPath}`);
  }
  
  // Create WebDAV handler
  const webdavHandler = createWebDAVHandler({
    rootPath: vaultPath,
    prefix: WEBDAV_PREFIX,
    auth: options.webdavAuth
  });
  
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;
    
    // Route WebDAV requests first
    if (pathname.startsWith(WEBDAV_PREFIX)) {
      try {
        const handled = await webdavHandler(req, res);
        if (handled) return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`WebDAV Error: ${err}`);
        return;
      }
    }
    
    // CORS headers for Tailscale access (for non-WebDAV routes)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Health check
    if (pathname === `${pathPrefix}/health`) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', vault: path.basename(vaultPath) }));
      return;
    }
    
    // Manifest endpoint
    if (pathname === `${pathPrefix}/manifest`) {
      try {
        const manifest = generateVaultManifest(vaultPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }
    
    // File download endpoint
    if (pathname.startsWith(`${pathPrefix}/files/`)) {
      const relativePath = decodeURIComponent(pathname.slice(`${pathPrefix}/files/`.length));
      const filePath = path.join(vaultPath, relativePath);
      
      // Security: ensure path is within vault
      const resolvedPath = path.resolve(filePath);
      const resolvedVault = path.resolve(vaultPath);
      
      if (!resolvedPath.startsWith(resolvedVault)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        
        res.writeHead(200, {
          'Content-Type': 'text/markdown',
          'Content-Length': Buffer.byteLength(content),
          'Last-Modified': stats.mtime.toUTCString()
        });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }
    
    // File upload endpoint (POST)
    if (pathname.startsWith(`${pathPrefix}/upload/`) && req.method === 'POST') {
      const relativePath = decodeURIComponent(pathname.slice(`${pathPrefix}/upload/`.length));
      const filePath = path.join(vaultPath, relativePath);
      
      // Security: ensure path is within vault
      const resolvedPath = path.resolve(filePath);
      const resolvedVault = path.resolve(vaultPath);
      
      if (!resolvedPath.startsWith(resolvedVault)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }
      
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          // Ensure directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, path: relativePath }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }
    
    // Root endpoint - info
    if (pathname === pathPrefix || pathname === `${pathPrefix}/`) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'clawvault-sync',
        version: '1.0.0',
        vault: path.basename(vaultPath),
        endpoints: {
          health: `${pathPrefix}/health`,
          manifest: `${pathPrefix}/manifest`,
          files: `${pathPrefix}/files/<path>`,
          upload: `${pathPrefix}/upload/<path>`,
          webdav: `${WEBDAV_PREFIX}/`
        }
      }));
      return;
    }
    
    // 404 for unknown paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  server.listen(port, '0.0.0.0');
  
  return {
    server,
    port,
    stop: () => new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    })
  };
}

// ============================================================================
// Sync Client
// ============================================================================

/**
 * Fetch remote vault manifest
 */
export async function fetchRemoteManifest(
  host: string,
  port: number = DEFAULT_SERVE_PORT,
  useHttps: boolean = false
): Promise<VaultManifest> {
  return new Promise((resolve, reject) => {
    const protocol = useHttps ? https : http;
    const url = `${useHttps ? 'https' : 'http'}://${host}:${port}${CLAWVAULT_SERVE_PATH}/manifest`;
    
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch manifest: HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid manifest response: ${err}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

/**
 * Fetch a file from remote vault
 */
export async function fetchRemoteFile(
  host: string,
  filePath: string,
  port: number = DEFAULT_SERVE_PORT,
  useHttps: boolean = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = useHttps ? https : http;
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    const url = `${useHttps ? 'https' : 'http'}://${host}:${port}${CLAWVAULT_SERVE_PATH}/files/${encodedPath}`;
    
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch file: HTTP ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

/**
 * Push a file to remote vault
 */
export async function pushFileToRemote(
  host: string,
  filePath: string,
  content: string,
  port: number = DEFAULT_SERVE_PORT,
  useHttps: boolean = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = useHttps ? https : http;
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    const url = new URL(`${useHttps ? 'https' : 'http'}://${host}:${port}${CLAWVAULT_SERVE_PATH}/upload/${encodedPath}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Length': Buffer.byteLength(content)
      },
      timeout: 30000
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to push file: HTTP ${res.statusCode}`));
          return;
        }
        resolve();
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.write(content);
    req.end();
  });
}

/**
 * Sync vault with a remote peer
 */
export async function syncWithPeer(
  vaultPath: string,
  options: TailscaleSyncOptions
): Promise<TailscaleSyncResult> {
  const startTime = Date.now();
  const result: TailscaleSyncResult = {
    pushed: [],
    pulled: [],
    deleted: [],
    unchanged: [],
    errors: [],
    stats: {
      bytesTransferred: 0,
      filesProcessed: 0,
      duration: 0
    }
  };
  
  const {
    peer,
    port = DEFAULT_SERVE_PORT,
    direction = 'bidirectional',
    dryRun = false,
    deleteOrphans = false,
    categories,
    https: useHttps = false
  } = options;
  
  // Resolve peer to IP if needed
  let host = peer;
  if (!peer.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    const resolvedIP = resolvePeerIP(peer);
    if (!resolvedIP) {
      result.errors.push(`Could not resolve peer: ${peer}`);
      result.stats.duration = Date.now() - startTime;
      return result;
    }
    host = resolvedIP;
  }
  
  try {
    // Get local manifest
    const localManifest = generateVaultManifest(vaultPath);
    
    // Get remote manifest
    const remoteManifest = await fetchRemoteManifest(host, port, useHttps);
    
    // Compare manifests
    let { toPush, toPull, conflicts, unchanged } = compareManifests(localManifest, remoteManifest);
    
    // Filter by categories if specified
    if (categories && categories.length > 0) {
      const categorySet = new Set(categories);
      toPush = toPush.filter(f => categorySet.has(f.category));
      toPull = toPull.filter(f => categorySet.has(f.category));
    }
    
    result.unchanged = unchanged;
    
    // Handle conflicts (for now, newer wins - already handled in compareManifests)
    for (const conflict of conflicts) {
      result.errors.push(`Conflict: ${conflict.path} (local and remote have same timestamp but different content)`);
    }
    
    // Push files (if direction allows)
    if (direction === 'push' || direction === 'bidirectional') {
      for (const file of toPush) {
        try {
          if (!dryRun) {
            const content = fs.readFileSync(path.join(vaultPath, file.path), 'utf-8');
            await pushFileToRemote(host, file.path, content, port, useHttps);
            result.stats.bytesTransferred += file.size;
          }
          result.pushed.push(file.path);
          result.stats.filesProcessed++;
        } catch (err) {
          result.errors.push(`Failed to push ${file.path}: ${err}`);
        }
      }
    }
    
    // Pull files (if direction allows)
    if (direction === 'pull' || direction === 'bidirectional') {
      for (const file of toPull) {
        try {
          if (!dryRun) {
            const content = await fetchRemoteFile(host, file.path, port, useHttps);
            const filePath = path.join(vaultPath, file.path);
            const dir = path.dirname(filePath);
            
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, content, 'utf-8');
            result.stats.bytesTransferred += file.size;
          }
          result.pulled.push(file.path);
          result.stats.filesProcessed++;
        } catch (err) {
          result.errors.push(`Failed to pull ${file.path}: ${err}`);
        }
      }
    }
    
    // Handle orphan deletion (files that exist locally but not remotely)
    if (deleteOrphans && direction === 'pull') {
      const remoteFiles = new Set(remoteManifest.files.map(f => f.path));
      for (const file of localManifest.files) {
        if (!remoteFiles.has(file.path)) {
          if (!categories || categories.includes(file.category)) {
            try {
              if (!dryRun) {
                fs.unlinkSync(path.join(vaultPath, file.path));
              }
              result.deleted.push(file.path);
            } catch (err) {
              result.errors.push(`Failed to delete ${file.path}: ${err}`);
            }
          }
        }
      }
    }
    
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`);
  }
  
  result.stats.duration = Date.now() - startTime;
  return result;
}

// ============================================================================
// Tailscale Serve/Funnel Integration
// ============================================================================

/**
 * Configure Tailscale serve for the vault
 * This uses `tailscale serve` to expose the vault server via Tailscale's HTTPS
 */
export function configureTailscaleServe(
  localPort: number,
  options: { funnel?: boolean; background?: boolean } = {}
): ChildProcess | null {
  if (!hasTailscale()) {
    return null;
  }
  
  const args = ['serve'];
  
  if (options.funnel) {
    args.push('--bg');
    args.push('funnel');
  } else if (options.background) {
    args.push('--bg');
  }
  
  args.push(`localhost:${localPort}`);
  
  const proc = spawn('tailscale', args, {
    stdio: 'inherit',
    detached: options.background
  });
  
  if (options.background) {
    proc.unref();
  }
  
  return proc;
}

/**
 * Stop Tailscale serve
 */
export function stopTailscaleServe(): boolean {
  if (!hasTailscale()) {
    return false;
  }
  
  const result = spawnSync('tailscale', ['serve', 'off'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 5000
  });
  
  return result.status === 0;
}

/**
 * Check if a peer is serving ClawVault
 */
export async function checkPeerClawVault(
  host: string,
  port: number = DEFAULT_SERVE_PORT
): Promise<boolean> {
  try {
    const response = await new Promise<boolean>((resolve) => {
      const req = http.get(
        `http://${host}:${port}${CLAWVAULT_SERVE_PATH}/health`,
        { timeout: 5000 },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
    return response;
  } catch {
    return false;
  }
}

/**
 * Discover ClawVault peers on the tailnet
 */
export async function discoverClawVaultPeers(
  port: number = DEFAULT_SERVE_PORT
): Promise<TailscalePeer[]> {
  const status = getTailscaleStatus();
  if (!status.connected) {
    return [];
  }
  
  const clawvaultPeers: TailscalePeer[] = [];
  
  // Check each online peer
  const checkPromises = status.peers
    .filter(p => p.online)
    .map(async (peer) => {
      const ip = peer.tailscaleIPs[0];
      if (!ip) return;
      
      const isServing = await checkPeerClawVault(ip, port);
      if (isServing) {
        peer.clawvaultServing = true;
        peer.clawvaultPort = port;
        clawvaultPeers.push(peer);
      }
    });
  
  await Promise.all(checkPromises);
  
  return clawvaultPeers;
}

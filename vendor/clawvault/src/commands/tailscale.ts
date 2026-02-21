/**
 * Tailscale Commands for ClawVault
 * 
 * CLI commands for Tailscale-based vault synchronization:
 * - tailscale-status: Show Tailscale connection status and peers
 * - tailscale-sync: Sync vault with a peer on the tailnet
 * - tailscale-serve: Serve vault for sync over Tailscale
 * - tailscale-discover: Discover ClawVault peers on the tailnet
 */

import type { Command } from 'commander';
import * as path from 'path';
import { resolveVaultPath } from '../lib/config.js';
import {
  hasTailscale,
  getTailscaleVersion,
  getTailscaleStatus,
  findPeer,
  getOnlinePeers,
  serveVault,
  syncWithPeer,
  discoverClawVaultPeers,
  configureTailscaleServe,
  stopTailscaleServe,
  DEFAULT_SERVE_PORT,
  type TailscaleStatus,
  type TailscalePeer,
  type TailscaleSyncOptions,
  type TailscaleSyncResult,
  type TailscaleServeConfig,
  type ServeInstance
} from '../lib/tailscale.js';

// ============================================================================
// Command Options Types
// ============================================================================

export interface TailscaleStatusCommandOptions {
  json?: boolean;
  peers?: boolean;
}

export interface TailscaleSyncCommandOptions {
  vaultPath?: string;
  peer: string;
  port?: number;
  direction?: 'push' | 'pull' | 'bidirectional';
  dryRun?: boolean;
  deleteOrphans?: boolean;
  categories?: string[];
  https?: boolean;
  json?: boolean;
}

export interface TailscaleServeCommandOptions {
  vaultPath?: string;
  port?: number;
  funnel?: boolean;
  background?: boolean;
  stop?: boolean;
}

export interface TailscaleDiscoverCommandOptions {
  port?: number;
  json?: boolean;
}

// ============================================================================
// tailscale-status Command
// ============================================================================

export async function tailscaleStatusCommand(
  options: TailscaleStatusCommandOptions = {}
): Promise<TailscaleStatus> {
  const status = getTailscaleStatus();
  
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return status;
  }
  
  // Human-readable output
  if (!status.installed) {
    console.log('Tailscale: Not installed');
    console.log('  Install from: https://tailscale.com/download');
    return status;
  }
  
  const version = getTailscaleVersion();
  console.log(`Tailscale: ${version || 'installed'}`);
  
  if (!status.running) {
    console.log('  Status: Daemon not running');
    if (status.error) {
      console.log(`  Error: ${status.error}`);
    }
    return status;
  }
  
  console.log(`  Status: ${status.backendState}`);
  
  if (status.connected) {
    console.log(`  Tailnet: ${status.tailnetName || 'unknown'}`);
    console.log(`  Self IP: ${status.selfIP || 'unknown'}`);
    console.log(`  Hostname: ${status.selfHostname || 'unknown'}`);
    if (status.selfDNSName) {
      console.log(`  DNS Name: ${status.selfDNSName}`);
    }
    
    if (options.peers || status.peers.length > 0) {
      const onlinePeers = status.peers.filter(p => p.online);
      const offlinePeers = status.peers.filter(p => !p.online);
      
      console.log(`\nPeers (${onlinePeers.length} online, ${offlinePeers.length} offline):`);
      
      for (const peer of onlinePeers) {
        const ip = peer.tailscaleIPs[0] || 'no-ip';
        const os = peer.os ? ` (${peer.os})` : '';
        const clawvault = peer.clawvaultServing ? ' [ClawVault]' : '';
        console.log(`  ● ${peer.hostname}${os} - ${ip}${clawvault}`);
      }
      
      if (options.peers) {
        for (const peer of offlinePeers) {
          const ip = peer.tailscaleIPs[0] || 'no-ip';
          const os = peer.os ? ` (${peer.os})` : '';
          console.log(`  ○ ${peer.hostname}${os} - ${ip} [offline]`);
        }
      }
    }
  } else {
    console.log('  Status: Not connected to tailnet');
    if (status.error) {
      console.log(`  Error: ${status.error}`);
    }
  }
  
  return status;
}

export function registerTailscaleStatusCommand(program: Command): void {
  program
    .command('tailscale-status')
    .alias('ts-status')
    .description('Show Tailscale connection status and peers')
    .option('--json', 'Output as JSON')
    .option('--peers', 'Show all peers including offline')
    .action(async (rawOptions: { json?: boolean; peers?: boolean }) => {
      await tailscaleStatusCommand({
        json: rawOptions.json,
        peers: rawOptions.peers
      });
    });
}

// ============================================================================
// tailscale-sync Command
// ============================================================================

export async function tailscaleSyncCommand(
  options: TailscaleSyncCommandOptions
): Promise<TailscaleSyncResult> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  
  // Check Tailscale status
  const status = getTailscaleStatus();
  if (!status.installed) {
    const error: TailscaleSyncResult = {
      pushed: [],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: ['Tailscale not installed. Install from https://tailscale.com/download'],
      stats: { bytesTransferred: 0, filesProcessed: 0, duration: 0 }
    };
    if (options.json) {
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.error('Error: Tailscale not installed');
    }
    return error;
  }
  
  if (!status.connected) {
    const error: TailscaleSyncResult = {
      pushed: [],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: ['Not connected to Tailscale. Run `tailscale up` to connect.'],
      stats: { bytesTransferred: 0, filesProcessed: 0, duration: 0 }
    };
    if (options.json) {
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.error('Error: Not connected to Tailscale');
    }
    return error;
  }
  
  // Resolve peer
  const peer = findPeer(options.peer);
  if (!peer) {
    const error: TailscaleSyncResult = {
      pushed: [],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: [`Peer not found: ${options.peer}`],
      stats: { bytesTransferred: 0, filesProcessed: 0, duration: 0 }
    };
    if (options.json) {
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.error(`Error: Peer not found: ${options.peer}`);
      console.log('\nAvailable online peers:');
      for (const p of getOnlinePeers()) {
        console.log(`  - ${p.hostname} (${p.tailscaleIPs[0]})`);
      }
    }
    return error;
  }
  
  if (!peer.online) {
    const error: TailscaleSyncResult = {
      pushed: [],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: [`Peer is offline: ${peer.hostname}`],
      stats: { bytesTransferred: 0, filesProcessed: 0, duration: 0 }
    };
    if (options.json) {
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.error(`Error: Peer is offline: ${peer.hostname}`);
    }
    return error;
  }
  
  const syncOptions: TailscaleSyncOptions = {
    peer: peer.tailscaleIPs[0],
    port: options.port || DEFAULT_SERVE_PORT,
    direction: options.direction || 'bidirectional',
    dryRun: options.dryRun,
    deleteOrphans: options.deleteOrphans,
    categories: options.categories,
    https: options.https
  };
  
  if (!options.json && !options.dryRun) {
    console.log(`Syncing with ${peer.hostname} (${peer.tailscaleIPs[0]})...`);
  }
  
  const result = await syncWithPeer(vaultPath, syncOptions);
  
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Human-readable output
    const prefix = options.dryRun ? '[dry-run] ' : '';
    
    if (result.pushed.length > 0) {
      console.log(`\n${prefix}Pushed ${result.pushed.length} file(s):`);
      for (const file of result.pushed.slice(0, 10)) {
        console.log(`  → ${file}`);
      }
      if (result.pushed.length > 10) {
        console.log(`  ... and ${result.pushed.length - 10} more`);
      }
    }
    
    if (result.pulled.length > 0) {
      console.log(`\n${prefix}Pulled ${result.pulled.length} file(s):`);
      for (const file of result.pulled.slice(0, 10)) {
        console.log(`  ← ${file}`);
      }
      if (result.pulled.length > 10) {
        console.log(`  ... and ${result.pulled.length - 10} more`);
      }
    }
    
    if (result.deleted.length > 0) {
      console.log(`\n${prefix}Deleted ${result.deleted.length} file(s):`);
      for (const file of result.deleted.slice(0, 10)) {
        console.log(`  ✗ ${file}`);
      }
      if (result.deleted.length > 10) {
        console.log(`  ... and ${result.deleted.length - 10} more`);
      }
    }
    
    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      for (const error of result.errors) {
        console.log(`  ! ${error}`);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`  Pushed: ${result.pushed.length}`);
    console.log(`  Pulled: ${result.pulled.length}`);
    console.log(`  Deleted: ${result.deleted.length}`);
    console.log(`  Unchanged: ${result.unchanged.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Duration: ${result.stats.duration}ms`);
    console.log(`  Transferred: ${formatBytes(result.stats.bytesTransferred)}`);
  }
  
  return result;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function registerTailscaleSyncCommand(program: Command): void {
  program
    .command('tailscale-sync')
    .alias('ts-sync')
    .description('Sync vault with a peer on the Tailscale network')
    .requiredOption('--peer <hostname>', 'Peer hostname or IP to sync with')
    .option('-v, --vault <path>', 'Vault path')
    .option('--port <number>', 'Port on the peer', parseInt)
    .option('--direction <dir>', 'Sync direction: push, pull, or bidirectional', 'bidirectional')
    .option('--dry-run', 'Show what would be synced without making changes')
    .option('--delete-orphans', 'Delete files that exist locally but not on peer (pull only)')
    .option('--categories <list>', 'Comma-separated list of categories to sync')
    .option('--https', 'Use HTTPS for connection')
    .option('--json', 'Output as JSON')
    .action(async (rawOptions: {
      peer: string;
      vault?: string;
      port?: number;
      direction?: string;
      dryRun?: boolean;
      deleteOrphans?: boolean;
      categories?: string;
      https?: boolean;
      json?: boolean;
    }) => {
      await tailscaleSyncCommand({
        peer: rawOptions.peer,
        vaultPath: rawOptions.vault,
        port: rawOptions.port,
        direction: rawOptions.direction as 'push' | 'pull' | 'bidirectional',
        dryRun: rawOptions.dryRun,
        deleteOrphans: rawOptions.deleteOrphans,
        categories: rawOptions.categories?.split(',').map(c => c.trim()),
        https: rawOptions.https,
        json: rawOptions.json
      });
    });
}

// ============================================================================
// tailscale-serve Command
// ============================================================================

let activeServeInstance: ServeInstance | null = null;

export async function tailscaleServeCommand(
  options: TailscaleServeCommandOptions
): Promise<void> {
  // Handle stop
  if (options.stop) {
    if (activeServeInstance) {
      await activeServeInstance.stop();
      activeServeInstance = null;
      console.log('ClawVault serve stopped.');
    }
    
    // Also stop Tailscale serve if running
    stopTailscaleServe();
    return;
  }
  
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const port = options.port || DEFAULT_SERVE_PORT;
  
  // Check Tailscale status
  const status = getTailscaleStatus();
  
  console.log(`Starting ClawVault serve...`);
  console.log(`  Vault: ${path.basename(vaultPath)}`);
  console.log(`  Port: ${port}`);
  
  // Start HTTP server
  activeServeInstance = serveVault(vaultPath, { port });
  
  console.log(`  Local URL: http://localhost:${port}/.clawvault`);
  
  if (status.connected) {
    console.log(`  Tailscale URL: http://${status.selfIP}:${port}/.clawvault`);
    
    if (status.selfDNSName) {
      const dnsHost = status.selfDNSName.replace(/\.$/, '');
      console.log(`  MagicDNS URL: http://${dnsHost}:${port}/.clawvault`);
    }
    
    // Configure Tailscale serve if requested
    if (options.funnel || options.background) {
      console.log('\nConfiguring Tailscale serve...');
      configureTailscaleServe(port, {
        funnel: options.funnel,
        background: options.background
      });
      
      if (options.funnel) {
        console.log('  Funnel enabled - vault is accessible from the public internet');
      }
    }
  } else {
    console.log('\n  Note: Not connected to Tailscale. Only local access available.');
  }
  
  console.log('\nEndpoints:');
  console.log(`  Health: /.clawvault/health`);
  console.log(`  Manifest: /.clawvault/manifest`);
  console.log(`  Files: /.clawvault/files/<path>`);
  
  if (!options.background) {
    console.log('\nPress Ctrl+C to stop serving.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nStopping ClawVault serve...');
      if (activeServeInstance) {
        await activeServeInstance.stop();
        activeServeInstance = null;
      }
      stopTailscaleServe();
      process.exit(0);
    });
    
    // Keep process running
    await new Promise(() => {});
  }
}

export function registerTailscaleServeCommand(program: Command): void {
  program
    .command('tailscale-serve')
    .alias('ts-serve')
    .description('Serve vault for sync over Tailscale')
    .option('-v, --vault <path>', 'Vault path')
    .option('--port <number>', `Port to serve on (default: ${DEFAULT_SERVE_PORT})`, parseInt)
    .option('--funnel', 'Expose via Tailscale Funnel (public internet)')
    .option('--background', 'Run in background')
    .option('--stop', 'Stop serving')
    .action(async (rawOptions: {
      vault?: string;
      port?: number;
      funnel?: boolean;
      background?: boolean;
      stop?: boolean;
    }) => {
      await tailscaleServeCommand({
        vaultPath: rawOptions.vault,
        port: rawOptions.port,
        funnel: rawOptions.funnel,
        background: rawOptions.background,
        stop: rawOptions.stop
      });
    });
}

// ============================================================================
// tailscale-discover Command
// ============================================================================

export async function tailscaleDiscoverCommand(
  options: TailscaleDiscoverCommandOptions = {}
): Promise<TailscalePeer[]> {
  const port = options.port || DEFAULT_SERVE_PORT;
  
  // Check Tailscale status
  const status = getTailscaleStatus();
  if (!status.connected) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'Not connected to Tailscale', peers: [] }));
    } else {
      console.error('Error: Not connected to Tailscale');
    }
    return [];
  }
  
  if (!options.json) {
    console.log('Discovering ClawVault peers on tailnet...');
  }
  
  const peers = await discoverClawVaultPeers(port);
  
  if (options.json) {
    console.log(JSON.stringify({ peers }, null, 2));
  } else {
    if (peers.length === 0) {
      console.log('\nNo ClawVault peers found.');
      console.log('  Run `clawvault tailscale-serve` on other devices to enable sync.');
    } else {
      console.log(`\nFound ${peers.length} ClawVault peer(s):`);
      for (const peer of peers) {
        const ip = peer.tailscaleIPs[0] || 'no-ip';
        const os = peer.os ? ` (${peer.os})` : '';
        console.log(`  ● ${peer.hostname}${os}`);
        console.log(`    IP: ${ip}`);
        console.log(`    Port: ${peer.clawvaultPort}`);
        if (peer.dnsName) {
          console.log(`    DNS: ${peer.dnsName.replace(/\.$/, '')}`);
        }
      }
    }
  }
  
  return peers;
}

export function registerTailscaleDiscoverCommand(program: Command): void {
  program
    .command('tailscale-discover')
    .alias('ts-discover')
    .description('Discover ClawVault peers on the Tailscale network')
    .option('--port <number>', `Port to check (default: ${DEFAULT_SERVE_PORT})`, parseInt)
    .option('--json', 'Output as JSON')
    .action(async (rawOptions: { port?: number; json?: boolean }) => {
      await tailscaleDiscoverCommand({
        port: rawOptions.port,
        json: rawOptions.json
      });
    });
}

// ============================================================================
// Register All Tailscale Commands
// ============================================================================

export function registerTailscaleCommands(program: Command): void {
  registerTailscaleStatusCommand(program);
  registerTailscaleSyncCommand(program);
  registerTailscaleServeCommand(program);
  registerTailscaleDiscoverCommand(program);
}

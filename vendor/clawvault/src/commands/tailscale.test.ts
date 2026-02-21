/**
 * Tests for Tailscale CLI commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock the tailscale module
vi.mock('../lib/tailscale.js', () => ({
  hasTailscale: vi.fn(),
  getTailscaleVersion: vi.fn(),
  getTailscaleStatus: vi.fn(),
  findPeer: vi.fn(),
  getOnlinePeers: vi.fn(),
  resolvePeerIP: vi.fn(),
  serveVault: vi.fn(),
  syncWithPeer: vi.fn(),
  discoverClawVaultPeers: vi.fn(),
  configureTailscaleServe: vi.fn(),
  stopTailscaleServe: vi.fn(),
  DEFAULT_SERVE_PORT: 8384
}));

// Mock config module
vi.mock('../lib/config.js', () => ({
  resolveVaultPath: vi.fn()
}));

import {
  tailscaleStatusCommand,
  tailscaleSyncCommand,
  tailscaleDiscoverCommand,
  type TailscaleStatusCommandOptions,
  type TailscaleSyncCommandOptions,
  type TailscaleDiscoverCommandOptions
} from './tailscale.js';

import {
  hasTailscale,
  getTailscaleVersion,
  getTailscaleStatus,
  findPeer,
  getOnlinePeers,
  syncWithPeer,
  discoverClawVaultPeers,
  type TailscaleStatus,
  type TailscalePeer,
  type TailscaleSyncResult
} from '../lib/tailscale.js';

import { resolveVaultPath } from '../lib/config.js';

describe('tailscale-status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns status when tailscale is connected', async () => {
    const mockStatus: TailscaleStatus = {
      installed: true,
      running: true,
      connected: true,
      selfIP: '100.64.0.1',
      selfHostname: 'my-laptop',
      selfDNSName: 'my-laptop.example.ts.net.',
      tailnetName: 'example.ts.net',
      backendState: 'Running',
      peers: [
        {
          hostname: 'desktop',
          dnsName: 'desktop.example.ts.net.',
          tailscaleIPs: ['100.64.0.2'],
          online: true,
          os: 'linux'
        }
      ]
    };

    vi.mocked(getTailscaleStatus).mockReturnValue(mockStatus);
    vi.mocked(getTailscaleVersion).mockReturnValue('tailscale version 1.56.1');

    const result = await tailscaleStatusCommand({});

    expect(result.connected).toBe(true);
    expect(result.selfIP).toBe('100.64.0.1');
    expect(result.peers).toHaveLength(1);
  });

  it('outputs JSON when --json flag is set', async () => {
    const mockStatus: TailscaleStatus = {
      installed: true,
      running: true,
      connected: true,
      selfIP: '100.64.0.1',
      selfHostname: 'my-laptop',
      backendState: 'Running',
      peers: []
    };

    vi.mocked(getTailscaleStatus).mockReturnValue(mockStatus);

    await tailscaleStatusCommand({ json: true });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"connected": true')
    );
  });

  it('handles not installed state', async () => {
    const mockStatus: TailscaleStatus = {
      installed: false,
      running: false,
      connected: false,
      peers: [],
      error: 'Tailscale CLI not found'
    };

    vi.mocked(getTailscaleStatus).mockReturnValue(mockStatus);

    const result = await tailscaleStatusCommand({});

    expect(result.installed).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Not installed')
    );
  });
});

describe('tailscale-sync command', () => {
  const testVaultPath = '/tmp/test-vault';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(resolveVaultPath).mockReturnValue(testVaultPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when tailscale is not installed', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: false,
      running: false,
      connected: false,
      peers: []
    });

    const result = await tailscaleSyncCommand({
      peer: 'desktop'
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.toLowerCase().includes('not installed'))).toBe(true);
  });

  it('returns error when not connected to tailscale', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: false,
      peers: []
    });

    const result = await tailscaleSyncCommand({
      peer: 'desktop'
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.toLowerCase().includes('not connected'))).toBe(true);
  });

  it('returns error when peer is not found', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: []
    });
    vi.mocked(findPeer).mockReturnValue(null);
    vi.mocked(getOnlinePeers).mockReturnValue([]);

    const result = await tailscaleSyncCommand({
      peer: 'nonexistent'
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.toLowerCase().includes('not found'))).toBe(true);
  });

  it('returns error when peer is offline', async () => {
    const offlinePeer: TailscalePeer = {
      hostname: 'desktop',
      dnsName: 'desktop.example.ts.net.',
      tailscaleIPs: ['100.64.0.2'],
      online: false
    };

    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: [offlinePeer]
    });
    vi.mocked(findPeer).mockReturnValue(offlinePeer);

    const result = await tailscaleSyncCommand({
      peer: 'desktop'
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.toLowerCase().includes('offline'))).toBe(true);
  });

  it('performs sync when peer is online', async () => {
    const onlinePeer: TailscalePeer = {
      hostname: 'desktop',
      dnsName: 'desktop.example.ts.net.',
      tailscaleIPs: ['100.64.0.2'],
      online: true
    };

    const mockSyncResult: TailscaleSyncResult = {
      pushed: ['decisions/new.md'],
      pulled: ['lessons/remote.md'],
      deleted: [],
      unchanged: ['people/john.md'],
      errors: [],
      stats: {
        bytesTransferred: 1024,
        filesProcessed: 2,
        duration: 500
      }
    };

    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: [onlinePeer]
    });
    vi.mocked(findPeer).mockReturnValue(onlinePeer);
    vi.mocked(syncWithPeer).mockResolvedValue(mockSyncResult);

    const result = await tailscaleSyncCommand({
      peer: 'desktop'
    });

    expect(result.pushed).toContain('decisions/new.md');
    expect(result.pulled).toContain('lessons/remote.md');
    expect(syncWithPeer).toHaveBeenCalledWith(
      testVaultPath,
      expect.objectContaining({
        peer: '100.64.0.2',
        direction: 'bidirectional'
      })
    );
  });

  it('respects direction option', async () => {
    const onlinePeer: TailscalePeer = {
      hostname: 'desktop',
      dnsName: 'desktop.example.ts.net.',
      tailscaleIPs: ['100.64.0.2'],
      online: true
    };

    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: [onlinePeer]
    });
    vi.mocked(findPeer).mockReturnValue(onlinePeer);
    vi.mocked(syncWithPeer).mockResolvedValue({
      pushed: [],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: [],
      stats: { bytesTransferred: 0, filesProcessed: 0, duration: 100 }
    });

    await tailscaleSyncCommand({
      peer: 'desktop',
      direction: 'push'
    });

    expect(syncWithPeer).toHaveBeenCalledWith(
      testVaultPath,
      expect.objectContaining({
        direction: 'push'
      })
    );
  });

  it('outputs JSON when --json flag is set', async () => {
    const onlinePeer: TailscalePeer = {
      hostname: 'desktop',
      dnsName: 'desktop.example.ts.net.',
      tailscaleIPs: ['100.64.0.2'],
      online: true
    };

    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: [onlinePeer]
    });
    vi.mocked(findPeer).mockReturnValue(onlinePeer);
    vi.mocked(syncWithPeer).mockResolvedValue({
      pushed: ['test.md'],
      pulled: [],
      deleted: [],
      unchanged: [],
      errors: [],
      stats: { bytesTransferred: 100, filesProcessed: 1, duration: 200 }
    });

    await tailscaleSyncCommand({
      peer: 'desktop',
      json: true
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"pushed"')
    );
  });
});

describe('tailscale-discover command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when not connected', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: false,
      peers: []
    });

    const result = await tailscaleDiscoverCommand({});

    expect(result).toEqual([]);
  });

  it('discovers ClawVault peers', async () => {
    const clawvaultPeers: TailscalePeer[] = [
      {
        hostname: 'desktop',
        dnsName: 'desktop.example.ts.net.',
        tailscaleIPs: ['100.64.0.2'],
        online: true,
        clawvaultServing: true,
        clawvaultPort: 8384
      }
    ];

    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: clawvaultPeers
    });
    vi.mocked(discoverClawVaultPeers).mockResolvedValue(clawvaultPeers);

    const result = await tailscaleDiscoverCommand({});

    expect(result).toHaveLength(1);
    expect(result[0].hostname).toBe('desktop');
    expect(result[0].clawvaultServing).toBe(true);
  });

  it('outputs JSON when --json flag is set', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: []
    });
    vi.mocked(discoverClawVaultPeers).mockResolvedValue([]);

    await tailscaleDiscoverCommand({ json: true });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"peers"')
    );
  });

  it('uses custom port when specified', async () => {
    vi.mocked(getTailscaleStatus).mockReturnValue({
      installed: true,
      running: true,
      connected: true,
      peers: []
    });
    vi.mocked(discoverClawVaultPeers).mockResolvedValue([]);

    await tailscaleDiscoverCommand({ port: 9999 });

    expect(discoverClawVaultPeers).toHaveBeenCalledWith(9999);
  });
});

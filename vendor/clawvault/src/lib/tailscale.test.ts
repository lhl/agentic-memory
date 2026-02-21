/**
 * Tests for Tailscale integration module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  hasTailscale,
  getTailscaleVersion,
  getTailscaleStatus,
  findPeer,
  getOnlinePeers,
  resolvePeerIP,
  generateVaultManifest,
  compareManifests,
  DEFAULT_SERVE_PORT,
  type TailscaleStatus,
  type TailscalePeer,
  type VaultManifest,
  type VaultFileEntry
} from './tailscale.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
  spawn: vi.fn()
}));

import { spawnSync } from 'child_process';

describe('Tailscale Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasTailscale', () => {
    it('returns true when tailscale CLI is available', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: undefined,
        status: 0,
        stdout: 'tailscale version 1.56.1',
        stderr: '',
        signal: null,
        pid: 1234,
        output: []
      });

      expect(hasTailscale()).toBe(true);
      expect(spawnSync).toHaveBeenCalledWith(
        'tailscale',
        ['version'],
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('returns false when tailscale CLI is not found', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: new Error('ENOENT'),
        status: null,
        stdout: '',
        stderr: '',
        signal: null,
        pid: 0,
        output: []
      });

      expect(hasTailscale()).toBe(false);
    });

    it('returns false when tailscale command fails', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: undefined,
        status: 1,
        stdout: '',
        stderr: 'command not found',
        signal: null,
        pid: 1234,
        output: []
      });

      expect(hasTailscale()).toBe(false);
    });
  });

  describe('getTailscaleVersion', () => {
    it('returns version string when available', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: undefined,
        status: 0,
        stdout: 'tailscale version 1.56.1\n  go version: go1.21.5',
        stderr: '',
        signal: null,
        pid: 1234,
        output: []
      });

      expect(getTailscaleVersion()).toBe('tailscale version 1.56.1');
    });

    it('returns null when tailscale is not available', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: new Error('ENOENT'),
        status: null,
        stdout: '',
        stderr: '',
        signal: null,
        pid: 0,
        output: []
      });

      expect(getTailscaleVersion()).toBeNull();
    });
  });

  describe('getTailscaleStatus', () => {
    it('returns not installed status when tailscale is missing', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: new Error('ENOENT'),
        status: null,
        stdout: '',
        stderr: '',
        signal: null,
        pid: 0,
        output: []
      });

      const status = getTailscaleStatus();
      expect(status.installed).toBe(false);
      expect(status.running).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.error).toContain('not found');
    });

    it('parses full status JSON correctly', () => {
      // First call for hasTailscale check
      vi.mocked(spawnSync)
        .mockReturnValueOnce({
          error: undefined,
          status: 0,
          stdout: 'tailscale version 1.56.1',
          stderr: '',
          signal: null,
          pid: 1234,
          output: []
        })
        // Second call for status --json
        .mockReturnValueOnce({
          error: undefined,
          status: 0,
          stdout: JSON.stringify({
            BackendState: 'Running',
            CurrentTailnet: {
              Name: 'example.ts.net',
              MagicDNSSuffix: 'example.ts.net'
            },
            Self: {
              TailscaleIPs: ['100.64.0.1'],
              HostName: 'my-laptop',
              DNSName: 'my-laptop.example.ts.net.'
            },
            Peer: {
              'nodekey:abc123': {
                HostName: 'desktop',
                DNSName: 'desktop.example.ts.net.',
                TailscaleIPs: ['100.64.0.2'],
                Online: true,
                OS: 'linux'
              },
              'nodekey:def456': {
                HostName: 'server',
                DNSName: 'server.example.ts.net.',
                TailscaleIPs: ['100.64.0.3'],
                Online: false,
                OS: 'linux'
              }
            }
          }),
          stderr: '',
          signal: null,
          pid: 1234,
          output: []
        });

      const status = getTailscaleStatus();
      
      expect(status.installed).toBe(true);
      expect(status.running).toBe(true);
      expect(status.connected).toBe(true);
      expect(status.backendState).toBe('Running');
      expect(status.tailnetName).toBe('example.ts.net');
      expect(status.selfIP).toBe('100.64.0.1');
      expect(status.selfHostname).toBe('my-laptop');
      expect(status.selfDNSName).toBe('my-laptop.example.ts.net.');
      expect(status.peers).toHaveLength(2);
      
      const onlinePeer = status.peers.find(p => p.hostname === 'desktop');
      expect(onlinePeer).toBeDefined();
      expect(onlinePeer?.online).toBe(true);
      expect(onlinePeer?.tailscaleIPs).toContain('100.64.0.2');
      
      const offlinePeer = status.peers.find(p => p.hostname === 'server');
      expect(offlinePeer).toBeDefined();
      expect(offlinePeer?.online).toBe(false);
    });

    it('handles daemon not running', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({
          error: undefined,
          status: 0,
          stdout: 'tailscale version 1.56.1',
          stderr: '',
          signal: null,
          pid: 1234,
          output: []
        })
        .mockReturnValueOnce({
          error: undefined,
          status: 1,
          stdout: '',
          stderr: 'Tailscale is not running',
          signal: null,
          pid: 1234,
          output: []
        });

      const status = getTailscaleStatus();
      expect(status.installed).toBe(true);
      expect(status.running).toBe(false);
      expect(status.error).toContain('not running');
    });
  });
});

describe('Peer Discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConnectedStatus = () => {
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        error: undefined,
        status: 0,
        stdout: 'tailscale version 1.56.1',
        stderr: '',
        signal: null,
        pid: 1234,
        output: []
      })
      .mockReturnValueOnce({
        error: undefined,
        status: 0,
        stdout: JSON.stringify({
          BackendState: 'Running',
          Self: { TailscaleIPs: ['100.64.0.1'], HostName: 'my-laptop' },
          Peer: {
            'nodekey:abc': {
              HostName: 'desktop',
              DNSName: 'desktop.example.ts.net.',
              TailscaleIPs: ['100.64.0.2'],
              Online: true
            },
            'nodekey:def': {
              HostName: 'work-laptop',
              DNSName: 'work-laptop.example.ts.net.',
              TailscaleIPs: ['100.64.0.3'],
              Online: true
            },
            'nodekey:ghi': {
              HostName: 'server',
              DNSName: 'server.example.ts.net.',
              TailscaleIPs: ['100.64.0.4'],
              Online: false
            }
          }
        }),
        stderr: '',
        signal: null,
        pid: 1234,
        output: []
      });
  };

  describe('findPeer', () => {
    it('finds peer by exact hostname', () => {
      mockConnectedStatus();
      const peer = findPeer('desktop');
      expect(peer).toBeDefined();
      expect(peer?.hostname).toBe('desktop');
    });

    it('finds peer by DNS name prefix', () => {
      mockConnectedStatus();
      const peer = findPeer('work-laptop.example');
      expect(peer).toBeDefined();
      expect(peer?.hostname).toBe('work-laptop');
    });

    it('finds peer by partial hostname match', () => {
      mockConnectedStatus();
      const peer = findPeer('work');
      expect(peer).toBeDefined();
      expect(peer?.hostname).toBe('work-laptop');
    });

    it('returns null for non-existent peer', () => {
      mockConnectedStatus();
      const peer = findPeer('nonexistent');
      expect(peer).toBeNull();
    });
  });

  describe('getOnlinePeers', () => {
    it('returns only online peers', () => {
      mockConnectedStatus();
      const peers = getOnlinePeers();
      expect(peers).toHaveLength(2);
      expect(peers.every(p => p.online)).toBe(true);
      expect(peers.map(p => p.hostname)).toContain('desktop');
      expect(peers.map(p => p.hostname)).toContain('work-laptop');
      expect(peers.map(p => p.hostname)).not.toContain('server');
    });
  });

  describe('resolvePeerIP', () => {
    it('resolves hostname to IP', () => {
      mockConnectedStatus();
      const ip = resolvePeerIP('desktop');
      expect(ip).toBe('100.64.0.2');
    });

    it('returns null for unknown peer', () => {
      mockConnectedStatus();
      const ip = resolvePeerIP('unknown');
      expect(ip).toBeNull();
    });
  });
});

describe('Vault Manifest', () => {
  const testVaultPath = '/tmp/test-clawvault-manifest';

  beforeEach(() => {
    // Create test vault structure
    fs.mkdirSync(testVaultPath, { recursive: true });
    fs.writeFileSync(
      path.join(testVaultPath, '.clawvault.json'),
      JSON.stringify({ name: 'test-vault', version: '1.0.0' })
    );
    
    // Create some test files
    fs.mkdirSync(path.join(testVaultPath, 'decisions'), { recursive: true });
    fs.writeFileSync(
      path.join(testVaultPath, 'decisions', 'test-decision.md'),
      '# Test Decision\n\nThis is a test.'
    );
    
    fs.mkdirSync(path.join(testVaultPath, 'lessons'), { recursive: true });
    fs.writeFileSync(
      path.join(testVaultPath, 'lessons', 'test-lesson.md'),
      '# Test Lesson\n\nLearned something.'
    );
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(testVaultPath, { recursive: true, force: true });
  });

  describe('generateVaultManifest', () => {
    it('generates manifest with all vault files', () => {
      const manifest = generateVaultManifest(testVaultPath);
      
      expect(manifest.name).toBe('test-vault');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.files.length).toBeGreaterThanOrEqual(2);
      
      const decisionFile = manifest.files.find(f => f.path.includes('test-decision'));
      expect(decisionFile).toBeDefined();
      expect(decisionFile?.category).toBe('decisions');
      expect(decisionFile?.checksum).toBeDefined();
      expect(decisionFile?.checksum.length).toBe(64); // SHA-256 hex
    });

    it('throws error for non-vault directory', () => {
      expect(() => generateVaultManifest('/tmp/nonexistent')).toThrow();
    });

    it('includes .clawvault.json in manifest', () => {
      const manifest = generateVaultManifest(testVaultPath);
      const configFile = manifest.files.find(f => f.path === '.clawvault.json');
      expect(configFile).toBeDefined();
    });
  });

  describe('compareManifests', () => {
    it('identifies files to push (local only)', () => {
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/new.md', size: 100, modified: '2024-01-01T00:00:00Z', checksum: 'abc123', category: 'decisions' }
        ]
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: []
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.toPush).toHaveLength(1);
      expect(diff.toPush[0].path).toBe('decisions/new.md');
      expect(diff.toPull).toHaveLength(0);
    });

    it('identifies files to pull (remote only)', () => {
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: []
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'lessons/remote.md', size: 200, modified: '2024-01-01T00:00:00Z', checksum: 'def456', category: 'lessons' }
        ]
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.toPull).toHaveLength(1);
      expect(diff.toPull[0].path).toBe('lessons/remote.md');
      expect(diff.toPush).toHaveLength(0);
    });

    it('identifies unchanged files', () => {
      const file: VaultFileEntry = {
        path: 'decisions/same.md',
        size: 100,
        modified: '2024-01-01T00:00:00Z',
        checksum: 'same123',
        category: 'decisions'
      };
      
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [file]
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [{ ...file }]
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.unchanged).toContain('decisions/same.md');
      expect(diff.toPush).toHaveLength(0);
      expect(diff.toPull).toHaveLength(0);
    });

    it('pushes newer local files', () => {
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/updated.md', size: 150, modified: '2024-01-02T00:00:00Z', checksum: 'new123', category: 'decisions' }
        ]
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/updated.md', size: 100, modified: '2024-01-01T00:00:00Z', checksum: 'old123', category: 'decisions' }
        ]
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.toPush).toHaveLength(1);
      expect(diff.toPull).toHaveLength(0);
    });

    it('pulls newer remote files', () => {
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/updated.md', size: 100, modified: '2024-01-01T00:00:00Z', checksum: 'old123', category: 'decisions' }
        ]
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/updated.md', size: 150, modified: '2024-01-02T00:00:00Z', checksum: 'new123', category: 'decisions' }
        ]
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.toPull).toHaveLength(1);
      expect(diff.toPush).toHaveLength(0);
    });

    it('detects conflicts (same timestamp, different content)', () => {
      const local: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/conflict.md', size: 100, modified: '2024-01-01T00:00:00Z', checksum: 'local123', category: 'decisions' }
        ]
      };
      
      const remote: VaultManifest = {
        name: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: [
          { path: 'decisions/conflict.md', size: 100, modified: '2024-01-01T00:00:00Z', checksum: 'remote456', category: 'decisions' }
        ]
      };
      
      const diff = compareManifests(local, remote);
      expect(diff.conflicts).toHaveLength(1);
      expect(diff.conflicts[0].path).toBe('decisions/conflict.md');
    });
  });
});

describe('Constants', () => {
  it('has correct default serve port', () => {
    expect(DEFAULT_SERVE_PORT).toBe(8384);
  });
});

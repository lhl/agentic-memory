/**
 * Tests for WebDAV handler module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import type { AddressInfo } from 'net';
import {
  isPathSafe,
  resolveWebDAVPath,
  checkAuth,
  generatePropfindResponse,
  createWebDAVHandler,
  WEBDAV_PREFIX
} from './webdav.js';

// ============================================================================
// Test Utilities
// ============================================================================

const TEST_ROOT_BASE = path.join(os.tmpdir(), 'test-webdav-vault');
let TEST_ROOT = TEST_ROOT_BASE;

function setupTestVault(): void {
  TEST_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-webdav-'));
  
  // Create test vault structure
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  fs.writeFileSync(
    path.join(TEST_ROOT, '.clawvault.json'),
    JSON.stringify({ name: 'test-vault', version: '1.0.0' })
  );
  
  // Create some test files and directories
  fs.mkdirSync(path.join(TEST_ROOT, 'tasks'), { recursive: true });
  fs.writeFileSync(
    path.join(TEST_ROOT, 'tasks', 'my-task.md'),
    '# My Task\n\nThis is a test task.'
  );
  
  fs.mkdirSync(path.join(TEST_ROOT, 'notes'), { recursive: true });
  fs.writeFileSync(
    path.join(TEST_ROOT, 'notes', 'note1.md'),
    '# Note 1\n\nFirst note.'
  );
  fs.writeFileSync(
    path.join(TEST_ROOT, 'notes', 'note2.md'),
    '# Note 2\n\nSecond note.'
  );
  
  // Create blocked directories (these should be inaccessible)
  fs.mkdirSync(path.join(TEST_ROOT, '.git'), { recursive: true });
  fs.writeFileSync(path.join(TEST_ROOT, '.git', 'config'), 'git config');
  
  fs.mkdirSync(path.join(TEST_ROOT, '.clawvault'), { recursive: true });
  fs.writeFileSync(path.join(TEST_ROOT, '.clawvault', 'internal.json'), '{}');
}

function cleanupTestVault(): void {
  if (!TEST_ROOT) return;
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

async function makeRequest(
  port: number,
  method: string,
  urlPath: string,
  options: {
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: options.headers
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body
          });
        });
      }
    );
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

interface TestServer {
  server: http.Server;
  port: number;
  close: () => Promise<void>;
}

async function createTestServer(auth?: { username: string; password: string }): Promise<TestServer> {
  const handler = createWebDAVHandler({
    rootPath: TEST_ROOT,
    prefix: WEBDAV_PREFIX,
    auth
  });
  
  const server = http.createServer(async (req, res) => {
    try {
      const handled = await handler(req, res);
      if (!handled) {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(`Error: ${err}`);
      }
    }
  });
  
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        server,
        port: address.port,
        close: () => new Promise<void>((res) => {
          server.close(() => res());
        })
      });
    });
  });
}

// ============================================================================
// Security Tests
// ============================================================================

describe('Path Security', () => {
  describe('isPathSafe', () => {
    it('allows normal paths', () => {
      expect(isPathSafe('/tasks/my-task.md', TEST_ROOT_BASE)).toBe(true);
      expect(isPathSafe('/notes/note1.md', TEST_ROOT_BASE)).toBe(true);
      expect(isPathSafe('/', TEST_ROOT_BASE)).toBe(true);
      expect(isPathSafe('/subfolder/deep/file.md', TEST_ROOT_BASE)).toBe(true);
    });
    
    it('blocks path traversal attempts', () => {
      expect(isPathSafe('/../../../etc/passwd', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/tasks/../../etc/passwd', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/../', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/..', TEST_ROOT_BASE)).toBe(false);
    });
    
    it('blocks .clawvault directory', () => {
      expect(isPathSafe('/.clawvault/internal.json', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/.clawvault/', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/.clawvault', TEST_ROOT_BASE)).toBe(false);
    });
    
    it('blocks .git directory', () => {
      expect(isPathSafe('/.git/config', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/.git/', TEST_ROOT_BASE)).toBe(false);
      expect(isPathSafe('/.git', TEST_ROOT_BASE)).toBe(false);
    });
    
    it('blocks .obsidian directory', () => {
      expect(isPathSafe('/.obsidian/config', TEST_ROOT_BASE)).toBe(false);
    });
    
    it('blocks node_modules directory', () => {
      expect(isPathSafe('/node_modules/package/index.js', TEST_ROOT_BASE)).toBe(false);
    });
  });
  
  describe('resolveWebDAVPath', () => {
    it('resolves valid paths', () => {
      const resolved = resolveWebDAVPath('/tasks/my-task.md', TEST_ROOT_BASE);
      expect(resolved).toBe(path.resolve(TEST_ROOT_BASE, 'tasks', 'my-task.md'));
    });
    
    it('returns null for path traversal', () => {
      expect(resolveWebDAVPath('/../../../etc/passwd', TEST_ROOT_BASE)).toBe(null);
    });
    
    it('handles root path', () => {
      const resolved = resolveWebDAVPath('/', TEST_ROOT_BASE);
      expect(resolved).toBe(path.resolve(TEST_ROOT_BASE));
    });
  });
  
  describe('checkAuth', () => {
    it('allows access when no auth configured', () => {
      const req = { headers: {} } as http.IncomingMessage;
      expect(checkAuth(req, undefined)).toBe(true);
    });
    
    it('requires auth header when auth is configured', () => {
      const req = { headers: {} } as http.IncomingMessage;
      expect(checkAuth(req, { username: 'user', password: 'pass' })).toBe(false);
    });
    
    it('validates correct credentials', () => {
      const credentials = Buffer.from('user:pass').toString('base64');
      const req = { headers: { authorization: `Basic ${credentials}` } } as http.IncomingMessage;
      expect(checkAuth(req, { username: 'user', password: 'pass' })).toBe(true);
    });
    
    it('rejects incorrect credentials', () => {
      const credentials = Buffer.from('user:wrong').toString('base64');
      const req = { headers: { authorization: `Basic ${credentials}` } } as http.IncomingMessage;
      expect(checkAuth(req, { username: 'user', password: 'pass' })).toBe(false);
    });
  });
});

// ============================================================================
// XML Generation Tests
// ============================================================================

describe('XML Generation', () => {
  describe('generatePropfindResponse', () => {
    it('generates valid XML for files', () => {
      const entries = [{
        href: '/webdav/tasks/my-task.md',
        stats: {
          size: 1234,
          mtime: new Date('2026-02-14T08:00:00Z'),
          isDirectory: () => false
        } as unknown as fs.Stats,
        isCollection: false
      }];
      
      const xml = generatePropfindResponse(entries);
      
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<D:multistatus xmlns:D="DAV:">');
      expect(xml).toContain('<D:href>/webdav/tasks/my-task.md</D:href>');
      expect(xml).toContain('<D:getcontentlength>1234</D:getcontentlength>');
      expect(xml).toContain('<D:resourcetype/>');
      expect(xml).toContain('<D:status>HTTP/1.1 200 OK</D:status>');
    });
    
    it('generates valid XML for directories', () => {
      const entries = [{
        href: '/webdav/tasks/',
        stats: {
          size: 0,
          mtime: new Date('2026-02-14T08:00:00Z'),
          isDirectory: () => true
        } as unknown as fs.Stats,
        isCollection: true
      }];
      
      const xml = generatePropfindResponse(entries);
      
      expect(xml).toContain('<D:resourcetype><D:collection/></D:resourcetype>');
    });
    
    it('escapes XML special characters', () => {
      const entries = [{
        href: '/webdav/file<with>&special"chars.md',
        stats: null,
        isCollection: false
      }];
      
      const xml = generatePropfindResponse(entries);
      
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });
  });
});

// ============================================================================
// WebDAV Handler Integration Tests
// ============================================================================

describe('WebDAV Handler', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestVault();
    testServer = await createTestServer();
  });
  
  afterEach(async () => {
    if (testServer) {
      await testServer.close();
    }
    cleanupTestVault();
  });
  
  describe('OPTIONS', () => {
    it('returns allowed methods and DAV header', async () => {
      const res = await makeRequest(testServer.port, 'OPTIONS', '/webdav/');
      
      expect(res.status).toBe(200);
      expect(res.headers.allow).toContain('GET');
      expect(res.headers.allow).toContain('PUT');
      expect(res.headers.allow).toContain('DELETE');
      expect(res.headers.allow).toContain('MKCOL');
      expect(res.headers.allow).toContain('PROPFIND');
      expect(res.headers.dav).toContain('1');
      expect(res.headers.dav).toContain('2');
    });
  });
  
  describe('GET', () => {
    it('returns file contents for existing file', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/tasks/my-task.md');
      
      expect(res.status).toBe(200);
      expect(res.body).toContain('# My Task');
      expect(res.body).toContain('This is a test task.');
    });
    
    it('returns 404 for missing file', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/nonexistent.md');
      
      expect(res.status).toBe(404);
    });
    
    it('returns directory listing for directories', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/notes/');
      
      expect(res.status).toBe(200);
      expect(res.body).toContain('note1.md');
      expect(res.body).toContain('note2.md');
    });
  });
  
  describe('PUT', () => {
    it('creates new file and returns 201', async () => {
      const content = '# New File\n\nNew content.';
      const res = await makeRequest(testServer.port, 'PUT', '/webdav/tasks/new-task.md', {
        body: content
      });
      
      expect(res.status).toBe(201);
      
      // Verify file was created
      const filePath = path.join(TEST_ROOT, 'tasks', 'new-task.md');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });
    
    it('updates existing file and returns 204', async () => {
      const content = '# Updated Task\n\nUpdated content.';
      const res = await makeRequest(testServer.port, 'PUT', '/webdav/tasks/my-task.md', {
        body: content
      });
      
      expect(res.status).toBe(204);
      
      // Verify file was updated
      const filePath = path.join(TEST_ROOT, 'tasks', 'my-task.md');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });
    
    it('creates parent directories if needed', async () => {
      const content = '# Deep File';
      const res = await makeRequest(testServer.port, 'PUT', '/webdav/deep/nested/folder/file.md', {
        body: content
      });
      
      expect(res.status).toBe(201);
      
      const filePath = path.join(TEST_ROOT, 'deep', 'nested', 'folder', 'file.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
  
  describe('DELETE', () => {
    it('deletes file and returns 204', async () => {
      const filePath = path.join(TEST_ROOT, 'tasks', 'my-task.md');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const res = await makeRequest(testServer.port, 'DELETE', '/webdav/tasks/my-task.md');
      
      expect(res.status).toBe(204);
      expect(fs.existsSync(filePath)).toBe(false);
    });
    
    it('returns 404 for non-existent file', async () => {
      const res = await makeRequest(testServer.port, 'DELETE', '/webdav/nonexistent.md');
      
      expect(res.status).toBe(404);
    });
    
    it('deletes directory recursively', async () => {
      const dirPath = path.join(TEST_ROOT, 'notes');
      expect(fs.existsSync(dirPath)).toBe(true);
      
      const res = await makeRequest(testServer.port, 'DELETE', '/webdav/notes/');
      
      expect(res.status).toBe(204);
      expect(fs.existsSync(dirPath)).toBe(false);
    });
  });
  
  describe('MKCOL', () => {
    it('creates directory and returns 201', async () => {
      const res = await makeRequest(testServer.port, 'MKCOL', '/webdav/new-folder/');
      
      expect(res.status).toBe(201);
      
      const dirPath = path.join(TEST_ROOT, 'new-folder');
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });
    
    it('returns 405 if resource already exists', async () => {
      const res = await makeRequest(testServer.port, 'MKCOL', '/webdav/tasks/');
      
      expect(res.status).toBe(405);
    });
    
    it('returns 409 if parent does not exist', async () => {
      const res = await makeRequest(testServer.port, 'MKCOL', '/webdav/nonexistent/subfolder/');
      
      expect(res.status).toBe(409);
    });
  });
  
  describe('PROPFIND', () => {
    it('returns 207 multistatus for directory', async () => {
      const res = await makeRequest(testServer.port, 'PROPFIND', '/webdav/notes/', {
        headers: { 'Depth': '1' }
      });
      
      expect(res.status).toBe(207);
      expect(res.headers['content-type']).toContain('application/xml');
      expect(res.body).toContain('<D:multistatus');
      expect(res.body).toContain('note1.md');
      expect(res.body).toContain('note2.md');
    });
    
    it('returns 207 for single file', async () => {
      const res = await makeRequest(testServer.port, 'PROPFIND', '/webdav/tasks/my-task.md', {
        headers: { 'Depth': '0' }
      });
      
      expect(res.status).toBe(207);
      expect(res.body).toContain('<D:multistatus');
      expect(res.body).toContain('my-task.md');
      expect(res.body).toContain('<D:resourcetype/>');
    });
    
    it('returns 404 for non-existent path', async () => {
      const res = await makeRequest(testServer.port, 'PROPFIND', '/webdav/nonexistent/', {
        headers: { 'Depth': '1' }
      });
      
      expect(res.status).toBe(404);
    });
    
    it('excludes blocked directories from listing', async () => {
      const res = await makeRequest(testServer.port, 'PROPFIND', '/webdav/', {
        headers: { 'Depth': '1' }
      });
      
      expect(res.status).toBe(207);
      // .git and .clawvault directories should be excluded
      expect(res.body).not.toContain('/webdav/.git');
      expect(res.body).not.toContain('/webdav/.clawvault/');
      // .clawvault.json file is allowed (it's not a blocked directory)
      expect(res.body).toContain('.clawvault.json');
    });
  });
  
  describe('HEAD', () => {
    it('returns file metadata without body', async () => {
      const res = await makeRequest(testServer.port, 'HEAD', '/webdav/tasks/my-task.md');
      
      expect(res.status).toBe(200);
      expect(res.headers['content-length']).toBeDefined();
      expect(res.headers['last-modified']).toBeDefined();
      expect(res.body).toBe('');
    });
    
    it('returns 404 for missing file', async () => {
      const res = await makeRequest(testServer.port, 'HEAD', '/webdav/nonexistent.md');
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('MOVE', () => {
    it('moves file to new location', async () => {
      const sourcePath = path.join(TEST_ROOT, 'tasks', 'my-task.md');
      const destPath = path.join(TEST_ROOT, 'notes', 'moved-task.md');
      
      expect(fs.existsSync(sourcePath)).toBe(true);
      
      const res = await makeRequest(testServer.port, 'MOVE', '/webdav/tasks/my-task.md', {
        headers: {
          'Destination': `http://127.0.0.1:${testServer.port}/webdav/notes/moved-task.md`
        }
      });
      
      expect(res.status).toBe(201);
      expect(fs.existsSync(sourcePath)).toBe(false);
      expect(fs.existsSync(destPath)).toBe(true);
    });
    
    it('returns 404 for non-existent source', async () => {
      const res = await makeRequest(testServer.port, 'MOVE', '/webdav/nonexistent.md', {
        headers: {
          'Destination': `http://127.0.0.1:${testServer.port}/webdav/notes/moved.md`
        }
      });
      
      expect(res.status).toBe(404);
    });
    
    it('returns 400 without Destination header', async () => {
      const res = await makeRequest(testServer.port, 'MOVE', '/webdav/tasks/my-task.md');
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('COPY', () => {
    it('copies file to new location', async () => {
      const sourcePath = path.join(TEST_ROOT, 'tasks', 'my-task.md');
      const destPath = path.join(TEST_ROOT, 'notes', 'copied-task.md');
      
      const res = await makeRequest(testServer.port, 'COPY', '/webdav/tasks/my-task.md', {
        headers: {
          'Destination': `http://127.0.0.1:${testServer.port}/webdav/notes/copied-task.md`
        }
      });
      
      expect(res.status).toBe(201);
      expect(fs.existsSync(sourcePath)).toBe(true); // Source still exists
      expect(fs.existsSync(destPath)).toBe(true);
      
      // Verify content is the same
      expect(fs.readFileSync(destPath, 'utf-8')).toBe(fs.readFileSync(sourcePath, 'utf-8'));
    });
  });
  
  describe('Security', () => {
    it('blocks path traversal attempts', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/../../../etc/passwd');
      
      expect(res.status).toBe(403);
    });
    
    it('blocks access to .clawvault directory', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/.clawvault/internal.json');
      
      expect(res.status).toBe(403);
    });
    
    it('blocks access to .git directory', async () => {
      const res = await makeRequest(testServer.port, 'GET', '/webdav/.git/config');
      
      expect(res.status).toBe(403);
    });
    
    it('blocks PUT to blocked paths', async () => {
      const res = await makeRequest(testServer.port, 'PUT', '/webdav/.git/malicious', {
        body: 'malicious content'
      });
      
      expect(res.status).toBe(403);
    });
    
    it('blocks MOVE destination to blocked paths', async () => {
      const res = await makeRequest(testServer.port, 'MOVE', '/webdav/tasks/my-task.md', {
        headers: {
          'Destination': `http://127.0.0.1:${testServer.port}/webdav/.git/malicious`
        }
      });
      
      expect(res.status).toBe(403);
    });
  });
});

// ============================================================================
// WebDAV Handler with Authentication
// ============================================================================

describe('WebDAV Handler with Authentication', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestVault();
    testServer = await createTestServer({ username: 'testuser', password: 'testpass' });
  });
  
  afterEach(async () => {
    if (testServer) {
      await testServer.close();
    }
    cleanupTestVault();
  });
  
  it('returns 401 without credentials', async () => {
    const res = await makeRequest(testServer.port, 'GET', '/webdav/tasks/my-task.md');
    
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Basic');
  });
  
  it('returns 401 with wrong credentials', async () => {
    const credentials = Buffer.from('wrong:creds').toString('base64');
    const res = await makeRequest(testServer.port, 'GET', '/webdav/tasks/my-task.md', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    
    expect(res.status).toBe(401);
  });
  
  it('allows access with correct credentials', async () => {
    const credentials = Buffer.from('testuser:testpass').toString('base64');
    const res = await makeRequest(testServer.port, 'GET', '/webdav/tasks/my-task.md', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    
    expect(res.status).toBe(200);
    expect(res.body).toContain('# My Task');
  });
  
  it('OPTIONS works without auth (CORS preflight)', async () => {
    const res = await makeRequest(testServer.port, 'OPTIONS', '/webdav/');
    
    expect(res.status).toBe(200);
  });
});

/**
 * WebDAV Handler for ClawVault
 * 
 * Implements WebDAV protocol support for Obsidian mobile sync via Remotely Save plugin.
 * Uses only Node built-in modules (http, fs, path) - zero external dependencies.
 * 
 * Supported methods:
 * - GET: Serve file contents
 * - PUT: Write/create file (creates parent dirs if needed)
 * - DELETE: Delete file or directory
 * - MKCOL: Create directory
 * - PROPFIND: List directory contents or file properties (XML response)
 * - OPTIONS: Return allowed methods + DAV header
 * - HEAD: File metadata without body
 * - MOVE: Rename/move file (uses Destination header)
 * - COPY: Copy file
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// Types
// ============================================================================

export interface WebDAVConfig {
  /** Root path for WebDAV files (vault path) */
  rootPath: string;
  /** URL prefix for WebDAV routes (default: /webdav) */
  prefix?: string;
  /** Optional Basic Auth credentials */
  auth?: {
    username: string;
    password: string;
  };
}

export interface WebDAVRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: string;
}

export interface WebDAVResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const WEBDAV_PREFIX = '/webdav';

/** Paths that are blocked from WebDAV access */
const BLOCKED_PATHS = [
  '.clawvault',
  '.git',
  '.obsidian',
  'node_modules'
];

/** WebDAV methods supported */
const SUPPORTED_METHODS = ['GET', 'PUT', 'DELETE', 'MKCOL', 'PROPFIND', 'OPTIONS', 'HEAD', 'MOVE', 'COPY'];

// ============================================================================
// Security Utilities
// ============================================================================

function toRequestSegments(requestPath: string): string[] {
  return requestPath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
}

function isWithinRoot(fullPath: string, rootPath: string): boolean {
  const resolvedRoot = path.resolve(rootPath);
  const relative = path.relative(resolvedRoot, fullPath);
  return !(relative.startsWith('..') || path.isAbsolute(relative));
}

/**
 * Check if a path is safe (no traversal attacks, not blocked)
 */
export function isPathSafe(requestPath: string, rootPath: string): boolean {
  const pathParts = toRequestSegments(requestPath);
  if (pathParts.includes('..')) {
    return false;
  }

  const normalizedRelativePath = path.normalize(pathParts.join(path.sep));
  const fullPath = path.resolve(rootPath, normalizedRelativePath);
  if (!isWithinRoot(fullPath, rootPath)) {
    return false;
  }

  // Check for blocked paths
  for (const part of pathParts) {
    if (BLOCKED_PATHS.includes(part)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Resolve a WebDAV path to filesystem path
 */
export function resolveWebDAVPath(requestPath: string, rootPath: string): string | null {
  const pathParts = toRequestSegments(requestPath);
  if (pathParts.includes('..')) {
    return null;
  }

  const normalizedRelativePath = path.normalize(pathParts.join(path.sep));
  const fullPath = path.resolve(rootPath, normalizedRelativePath);
  if (!isWithinRoot(fullPath, rootPath)) {
    return null;
  }

  return fullPath;
}

/**
 * Check Basic Auth credentials
 */
export function checkAuth(
  req: IncomingMessage,
  auth?: { username: string; password: string }
): boolean {
  // If no auth configured, allow access
  if (!auth) {
    return true;
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  return username === auth.username && password === auth.password;
}

// ============================================================================
// XML Generation
// ============================================================================

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date for WebDAV (RFC 2822 format)
 */
function formatWebDAVDate(date: Date): string {
  return date.toUTCString();
}

/**
 * Generate PROPFIND response XML for a single resource
 */
function generatePropfindEntry(
  href: string,
  stats: fs.Stats | null,
  isCollection: boolean
): string {
  const resourceType = isCollection 
    ? '<D:resourcetype><D:collection/></D:resourcetype>'
    : '<D:resourcetype/>';
  
  const contentLength = stats && !isCollection 
    ? `<D:getcontentlength>${stats.size}</D:getcontentlength>` 
    : '';
  
  const lastModified = stats 
    ? `<D:getlastmodified>${formatWebDAVDate(stats.mtime)}</D:getlastmodified>` 
    : '';
  
  const etag = stats 
    ? `<D:getetag>"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"</D:getetag>`
    : '';
  
  const contentType = !isCollection 
    ? '<D:getcontenttype>application/octet-stream</D:getcontenttype>' 
    : '';

  return `  <D:response>
    <D:href>${escapeXml(href)}</D:href>
    <D:propstat>
      <D:prop>
        ${resourceType}
        ${contentLength}
        ${lastModified}
        ${etag}
        ${contentType}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
}

/**
 * Generate full PROPFIND response XML
 */
export function generatePropfindResponse(
  entries: Array<{ href: string; stats: fs.Stats | null; isCollection: boolean }>
): string {
  const responseEntries = entries.map(e => 
    generatePropfindEntry(e.href, e.stats, e.isCollection)
  ).join('\n');
  
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responseEntries}
</D:multistatus>`;
}

// ============================================================================
// WebDAV Method Handlers
// ============================================================================

/**
 * Handle OPTIONS request
 */
export function handleOptions(res: ServerResponse, prefix: string): void {
  res.writeHead(200, {
    'Allow': SUPPORTED_METHODS.join(', '),
    'DAV': '1, 2',
    'Content-Length': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': SUPPORTED_METHODS.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, Depth, Destination, Overwrite, Authorization',
    'MS-Author-Via': 'DAV'
  });
  res.end();
}

/**
 * Handle HEAD request
 */
export function handleHead(
  res: ServerResponse,
  filePath: string
): void {
  try {
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      res.writeHead(200, {
        'Content-Type': 'httpd/unix-directory',
        'Last-Modified': formatWebDAVDate(stats.mtime),
        'ETag': `"${stats.mtime.getTime().toString(16)}"`,
        'Access-Control-Allow-Origin': '*'
      });
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size.toString(),
        'Last-Modified': formatWebDAVDate(stats.mtime),
        'ETag': `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`,
        'Access-Control-Allow-Origin': '*'
      });
    }
    res.end();
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('Not Found');
  }
}

/**
 * Handle GET request
 */
export function handleGet(
  res: ServerResponse,
  filePath: string
): void {
  try {
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Return directory listing as simple text
      const entries = fs.readdirSync(filePath);
      const listing = entries.join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(listing).toString(),
        'Access-Control-Allow-Origin': '*'
      });
      res.end(listing);
    } else {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.length.toString(),
        'Last-Modified': formatWebDAVDate(stats.mtime),
        'ETag': `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('Not Found');
  }
}

/**
 * Handle PUT request
 */
export function handlePut(
  res: ServerResponse,
  filePath: string,
  body: Buffer
): void {
  try {
    const exists = fs.existsSync(filePath);
    
    // Create parent directories if needed
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, body);
    
    // 201 Created for new files, 204 No Content for updates
    const status = exists ? 204 : 201;
    res.writeHead(status, {
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Handle DELETE request
 */
export function handleDelete(
  res: ServerResponse,
  filePath: string
): void {
  try {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Not Found');
      return;
    }
    
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
    
    res.writeHead(204, {
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Handle MKCOL request (create directory)
 */
export function handleMkcol(
  res: ServerResponse,
  filePath: string
): void {
  try {
    if (fs.existsSync(filePath)) {
      // 405 Method Not Allowed if resource already exists
      res.writeHead(405, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Resource already exists');
      return;
    }
    
    // Check if parent exists
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      // 409 Conflict if parent doesn't exist
      res.writeHead(409, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Parent directory does not exist');
      return;
    }
    
    fs.mkdirSync(filePath);
    
    res.writeHead(201, {
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Handle PROPFIND request
 */
export function handlePropfind(
  res: ServerResponse,
  filePath: string,
  webdavPath: string,
  prefix: string,
  depth: string
): void {
  try {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Not Found');
      return;
    }
    
    const stats = fs.statSync(filePath);
    const entries: Array<{ href: string; stats: fs.Stats | null; isCollection: boolean }> = [];
    
    // Ensure webdavPath starts with /
    const normalizedWebdavPath = webdavPath.startsWith('/') ? webdavPath : '/' + webdavPath;
    const href = prefix + normalizedWebdavPath;
    
    // Add the requested resource itself
    entries.push({
      href: href.endsWith('/') || stats.isDirectory() ? href : href,
      stats,
      isCollection: stats.isDirectory()
    });
    
    // If it's a directory and depth is not 0, list children
    if (stats.isDirectory() && depth !== '0') {
      try {
        const children = fs.readdirSync(filePath);
        
        for (const child of children) {
          // Skip blocked paths
          if (BLOCKED_PATHS.includes(child)) {
            continue;
          }
          
          const childPath = path.join(filePath, child);
          const childWebdavPath = normalizedWebdavPath.endsWith('/') 
            ? normalizedWebdavPath + child 
            : normalizedWebdavPath + '/' + child;
          
          try {
            const childStats = fs.statSync(childPath);
            entries.push({
              href: prefix + childWebdavPath,
              stats: childStats,
              isCollection: childStats.isDirectory()
            });
          } catch {
            // Skip files we can't stat
          }
        }
      } catch {
        // Can't read directory, just return the resource itself
      }
    }
    
    const xml = generatePropfindResponse(entries);
    
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Length': Buffer.byteLength(xml).toString(),
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xml);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Handle MOVE request
 */
export function handleMove(
  res: ServerResponse,
  sourcePath: string,
  destinationPath: string | null,
  overwrite: boolean
): void {
  try {
    if (!fs.existsSync(sourcePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Source not found');
      return;
    }
    
    if (!destinationPath) {
      res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Destination header required');
      return;
    }
    
    const destExists = fs.existsSync(destinationPath);
    
    if (destExists && !overwrite) {
      res.writeHead(412, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Destination exists and Overwrite is F');
      return;
    }
    
    // Create parent directory if needed
    const destDir = path.dirname(destinationPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // If destination exists and overwrite is allowed, remove it first
    if (destExists) {
      const destStats = fs.statSync(destinationPath);
      if (destStats.isDirectory()) {
        fs.rmSync(destinationPath, { recursive: true });
      } else {
        fs.unlinkSync(destinationPath);
      }
    }
    
    fs.renameSync(sourcePath, destinationPath);
    
    // 201 Created if destination didn't exist, 204 No Content if it did
    const status = destExists ? 204 : 201;
    res.writeHead(status, {
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Handle COPY request
 */
export function handleCopy(
  res: ServerResponse,
  sourcePath: string,
  destinationPath: string | null,
  overwrite: boolean
): void {
  try {
    if (!fs.existsSync(sourcePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Source not found');
      return;
    }
    
    if (!destinationPath) {
      res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Destination header required');
      return;
    }
    
    const destExists = fs.existsSync(destinationPath);
    
    if (destExists && !overwrite) {
      res.writeHead(412, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Destination exists and Overwrite is F');
      return;
    }
    
    // Create parent directory if needed
    const destDir = path.dirname(destinationPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const sourceStats = fs.statSync(sourcePath);
    
    if (sourceStats.isDirectory()) {
      // Recursive copy for directories
      copyDirRecursive(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
    
    // 201 Created if destination didn't exist, 204 No Content if it did
    const status = destExists ? 204 : 201;
    res.writeHead(status, {
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Error: ${err}`);
  }
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ============================================================================
// Main WebDAV Handler
// ============================================================================

/**
 * Parse Destination header and resolve to filesystem path
 */
function parseDestinationHeader(
  destinationHeader: string | undefined,
  prefix: string,
  rootPath: string
): string | null {
  if (!destinationHeader) {
    return null;
  }
  
  try {
    // Destination can be a full URL or a path
    let destPath: string;
    
    if (destinationHeader.startsWith('http://') || destinationHeader.startsWith('https://')) {
      const url = new URL(destinationHeader);
      destPath = decodeURIComponent(url.pathname);
    } else {
      destPath = decodeURIComponent(destinationHeader);
    }
    
    // Remove the prefix
    if (destPath.startsWith(prefix)) {
      destPath = destPath.slice(prefix.length);
    }
    
    // Resolve to filesystem path
    return resolveWebDAVPath(destPath, rootPath);
  } catch {
    return null;
  }
}

/**
 * Create WebDAV request handler
 */
export function createWebDAVHandler(config: WebDAVConfig) {
  const { rootPath, prefix = WEBDAV_PREFIX, auth } = config;
  
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    // Use raw URL to detect path traversal before URL normalization
    const rawUrl = req.url || '/';
    
    // Check for path traversal in raw URL (before normalization)
    if (rawUrl.includes('..')) {
      if (rawUrl.startsWith(prefix)) {
        res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Forbidden');
        return true;
      }
    }
    
    const url = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    
    // Check if this is a WebDAV request
    if (!pathname.startsWith(prefix)) {
      return false;
    }
    
    // Extract the path relative to the WebDAV prefix
    let webdavPath = pathname.slice(prefix.length);
    if (!webdavPath.startsWith('/')) {
      webdavPath = '/' + webdavPath;
    }
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      handleOptions(res, prefix);
      return true;
    }
    
    // Check authentication
    if (!checkAuth(req, auth)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="ClawVault WebDAV"',
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      });
      res.end('Unauthorized');
      return true;
    }
    
    // Check path safety (double-check after URL parsing)
    if (!isPathSafe(webdavPath, rootPath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Forbidden');
      return true;
    }
    
    // Resolve filesystem path
    const filePath = resolveWebDAVPath(webdavPath, rootPath);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Forbidden');
      return true;
    }
    
    // Get common headers
    const depth = (req.headers.depth as string) || 'infinity';
    const overwrite = (req.headers.overwrite as string)?.toUpperCase() !== 'F';
    const destinationHeader = req.headers.destination as string | undefined;
    
    // Handle each method
    switch (req.method) {
      case 'HEAD':
        handleHead(res, filePath);
        return true;
        
      case 'GET':
        handleGet(res, filePath);
        return true;
        
      case 'PUT': {
        // Collect request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks);
        handlePut(res, filePath, body);
        return true;
      }
        
      case 'DELETE':
        handleDelete(res, filePath);
        return true;
        
      case 'MKCOL':
        handleMkcol(res, filePath);
        return true;
        
      case 'PROPFIND':
        handlePropfind(res, filePath, webdavPath, prefix, depth);
        return true;
        
      case 'MOVE': {
        const destPath = parseDestinationHeader(destinationHeader, prefix, rootPath);
        
        // Check destination path safety
        if (destPath && destinationHeader) {
          const destWebdavPath = destinationHeader.includes(prefix) 
            ? destinationHeader.slice(destinationHeader.indexOf(prefix) + prefix.length)
            : destinationHeader;
          if (!isPathSafe(destWebdavPath, rootPath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Forbidden');
            return true;
          }
        }
        
        handleMove(res, filePath, destPath, overwrite);
        return true;
      }
        
      case 'COPY': {
        const destPath = parseDestinationHeader(destinationHeader, prefix, rootPath);
        
        // Check destination path safety
        if (destPath && destinationHeader) {
          const destWebdavPath = destinationHeader.includes(prefix) 
            ? destinationHeader.slice(destinationHeader.indexOf(prefix) + prefix.length)
            : destinationHeader;
          if (!isPathSafe(destWebdavPath, rootPath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Forbidden');
            return true;
          }
        }
        
        handleCopy(res, filePath, destPath, overwrite);
        return true;
      }
        
      default:
        res.writeHead(405, {
          'Allow': SUPPORTED_METHODS.join(', '),
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Method Not Allowed');
        return true;
    }
  };
}

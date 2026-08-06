// Inkwell — Preview server
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { resolve, normalize } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '4321', 10);

// Parse args
const args = process.argv.slice(2);
const skipBuild = args.includes('--dist');

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
};

// ─── Build ──────────────────────────────────────────────────────────
if (!skipBuild) {
  console.log('Building site...\n');
  try {
    execSync(`node "${join(__dirname, 'build.js')}"`, { cwd: __dirname, stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed. Starting server with existing dist/ (if any).');
  }
}

// ─── Server ─────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Normalize and check for path traversal
  const relPath = urlPath.replace(/^\//, '').replace(/\\/g, '/');
  const resolved = resolve(DIST, relPath);
  if (!resolved.startsWith(resolve(DIST))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }
  const filePath = resolved;

  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      // Serve 404
      const notFoundPath = join(DIST, '404.html');
      if (existsSync(notFoundPath)) {
        const content = readFileSync(notFoundPath);
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      }
      return;
    }

    const content = readFileSync(filePath);
    const headers = {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };
    res.writeHead(200, headers);
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`\n  Inkwell preview server running at:`);
  console.log(`  \x1b[36mhttp://localhost:${PORT}\x1b[0m\n`);
  console.log('  Press Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  Shutting down...');
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

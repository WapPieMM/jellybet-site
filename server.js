import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const staticDir = path.join(__dirname, 'jellybet-site');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(req, res, filePath, cacheControl = 'public, max-age=0, must-revalidate') {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Accept-Ranges': 'bytes',
    };

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        if (start >= 0 && start <= end && end < stat.size) {
          res.writeHead(206, {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Content-Length': end - start + 1,
          });
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }
      }
    }

    res.writeHead(200, {
      ...headers,
      'Content-Length': stat.size,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/';
  const pathname = decodeURIComponent(rawUrl.split('?')[0]);

  if (pathname === '/' || pathname === '/index.html') {
    sendFile(req, res, path.join(staticDir, 'index.html'));
    return;
  }
  if (pathname === '/accounting' || pathname === '/accounting/') {
    sendFile(req, res, path.join(staticDir, 'accounting.html'));
    return;
  }
  if (pathname === '/accounts' || pathname === '/accounts/') {
    sendFile(req, res, path.join(staticDir, 'accounts.html'));
    return;
  }
  if (/^\/account\/[^/]+\/?$/.test(pathname)) {
    sendFile(req, res, path.join(staticDir, 'account.html'));
    return;
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(staticDir, safePath);
  if (!fullPath.startsWith(staticDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const isStaticAsset = pathname.startsWith('/assets/');
  const cacheHeader = isStaticAsset
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, must-revalidate';

  sendFile(req, res, fullPath, cacheHeader);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(
  fileURLToPath(new URL('../dist/luctiv-maintenance-app/browser/', import.meta.url)),
);
const host = process.env.LUCTIV_HOST || '127.0.0.1';
const port = Number(process.env.LUCTIV_PORT || 4200);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

if (!existsSync(join(root, 'index.html'))) {
  console.error('No existe un build. Ejecuta "npm run build" antes de preview.');
  process.exitCode = 1;
} else {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const relativePath = normalize(decodedPath).replace(/^[/\\]+/, '');
    const requestedPath = resolve(root, relativePath);
    const isInsideRoot =
      requestedPath === root || requestedPath.startsWith(`${root}\\`) || requestedPath.startsWith(`${root}/`);
    const existingPath =
      isInsideRoot && existsSync(requestedPath) && statSync(requestedPath).isFile()
        ? requestedPath
        : join(root, 'index.html');
    const contentType =
      contentTypes.get(extname(existingPath).toLowerCase()) ??
      'application/octet-stream';

    response.writeHead(200, {
      'Cache-Control': existingPath.endsWith('index.html')
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
      'Content-Type': contentType,
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(existingPath).pipe(response);
  });

  server.listen(port, host, () => {
    console.log(`LUCTIV preview disponible en http://${host}:${port}`);
  });
}

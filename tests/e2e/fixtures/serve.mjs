// Minimal static file server for e2e fixtures.
//
// Chrome extensions cannot inject content scripts into file:// URLs unless
// the user manually enables "Allow access to file URLs" for the extension —
// something that cannot be toggled via CLI launch flags. Serving fixtures
// over http://localhost instead lets the extension's <all_urls> content
// script matches apply normally during Playwright e2e runs.

import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.E2E_FIXTURES_PORT ?? 4173);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const resolvedPath = path.normalize(
    path.join(ROOT, requestedPath === "/" ? "/test-table.html" : requestedPath)
  );

  // ROOT + sep なので、fixtures-evil のような兄弟ディレクトリを弾ける
  if (!(resolvedPath.startsWith(ROOT + path.sep) && existsSync(resolvedPath))) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  if (statSync(resolvedPath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(resolvedPath);
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
  });
  createReadStream(resolvedPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`e2e fixtures server listening on http://localhost:${PORT}`);
});

// Minimal static server for local preview.
// Reads each file WHOLE, sets Content-Length and writes once, so a short read
// becomes a client error instead of a silently truncated page. (Python's
// http.server has truncated a large file at a buffer boundary on this box,
// which presents as "the last script tag does nothing" and is intermittent.)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.argv[2] ?? ".";
const port = Number(process.argv[3] ?? 8791);
const TYPES = { ".html":"text/html; charset=utf-8", ".json":"application/json; charset=utf-8",
                ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml" };

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const rel = normalize(url === "/" ? "index.html" : url.replace(/^\/+/, ""));
    if (rel.startsWith("..")) { res.writeHead(403).end("forbidden"); return; }
    const file = join(root, rel);
    await stat(file);
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
                         "Content-Length": buf.length, "Cache-Control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));

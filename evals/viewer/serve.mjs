import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = resolve(projectRoot, process.argv[2] || "evals/viewer/dist");
const port = Number(process.env.KAMDAR_EVAL_VIEWER_PORT || 4179);
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8" };

createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const path = resolve(root, relative);
  if (!path.startsWith(`${root}/`) || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
  createReadStream(path).pipe(response);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Seed evidence viewer: http://127.0.0.1:${port}/\n`);
});

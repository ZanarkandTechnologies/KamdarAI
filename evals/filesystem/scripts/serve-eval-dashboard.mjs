/** Build and serve the current eval dashboard from any working directory. */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVercelShowcase } from "./build-vercel-showcase.mjs";

const outputDirectory = resolve(fileURLToPath(new URL("../.vercel-static/", import.meta.url)));
const host = process.env.EVAL_DASHBOARD_HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4179);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
]);

function targetFor(pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = resolve(outputDirectory, relativePath);
  if (target !== outputDirectory && !target.startsWith(`${outputDirectory}/`)) return null;
  return target;
}

export function createEvalDashboardServer() {
  return createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" });
      return response.end("Method not allowed\n");
    }
    const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
    const target = targetFor(pathname);
    if (!target || !existsSync(target) || !statSync(target).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return response.end("Not found\n");
    }
    response.writeHead(200, {
      "content-type": types.get(extname(target)) || "application/octet-stream",
      "cache-control": "no-store",
    });
    if (request.method === "HEAD") return response.end();
    return createReadStream(target).pipe(response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.env.EVAL_DASHBOARD_MODE || "presentation";
  if (!['presentation', 'internal'].includes(mode)) throw new Error("EVAL_DASHBOARD_MODE must be presentation or internal.");
  const built = buildVercelShowcase({
    outputDirectory,
    mode,
    presentationManifestPath: process.env.PRESENTATION_ELIGIBILITY_MANIFEST || null,
  });
  const server = createEvalDashboardServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Set another port with PORT=4180.`);
      process.exitCode = 1;
      return;
    }
    throw error;
  });
  server.listen(port, host, () => {
    console.log(`Kamdar eval dashboard: http://${host}:${port}`);
    console.log(`Mode: ${mode}`);
    console.log(`${built.totals.cases} scenarios · ${built.totals.checks} checks`);
  });
}

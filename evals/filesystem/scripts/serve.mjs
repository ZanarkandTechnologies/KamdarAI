/** Local HTTP surface for the approved template-first frozen proof. */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(root, "../..");
const uiPath = resolve(root, "ui/index.html");
// A frozen UI comparison must never overwrite the receipt-backed operated
// showcase. `AUTHORED_EVAL_RUNS_DIR` remains a compact test override for both
// roots; production defaults deliberately keep the two lifecycles separate.
const configuredRunsRoot = process.env.AUTHORED_EVAL_RUNS_DIR;
const operatedOutputRoot = resolve(
  process.env.AUTHORED_EVAL_OPERATED_RUNS_DIR
  || configuredRunsRoot
  || resolve(root, "runs/kamdar-template-first-latest")
);
const frozenOutputRoot = resolve(
  process.env.AUTHORED_EVAL_FROZEN_RUNS_DIR
  || configuredRunsRoot
  || resolve(root, "runs/kamdar-template-first-frozen-latest")
);
const host = process.env.AUTHORED_EVAL_HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4179);
const maxBodyBytes = 512 * 1024;
let runnerPromise;

function runner() {
  runnerPromise ||= import("./template-first-kamdar.mjs");
  return runnerPromise;
}

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(`${JSON.stringify(value)}\n`);
}

function sendText(response, status, contentType, value) {
  response.writeHead(status, { "content-type": `${contentType}; charset=utf-8`, "cache-control": "no-store" });
  response.end(value);
}

function readJson(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try { resolveBody(body ? JSON.parse(body) : {}); }
      catch (error) { reject(new Error(`Invalid JSON: ${error.message}`)); }
    });
    request.on("error", reject);
  });
}

async function latestAt(api, outputRoot) {
  return typeof api.latestRun === "function" ? await api.latestRun({ outputRoot }) : null;
}

async function loadProofSurface(api) {
  const operated = await latestAt(api, operatedOutputRoot);
  if (operated) return { latest: operated, outputRoot: operatedOutputRoot };
  const frozen = await latestAt(api, frozenOutputRoot);
  return { latest: frozen, outputRoot: frozenOutputRoot };
}

async function loadFile(api, path, outputRoot) {
  if (!path) throw new Error("A result file path is required.");
  if (typeof api.readRunFile !== "function") throw new Error("The runner does not expose file inspection.");
  return await api.readRunFile(path, { outputRoot });
}

function readSource(path) {
  if (typeof path !== "string" || !path) throw new Error("A source path is required.");
  const target = resolve(projectRoot, path);
  const inner = relative(projectRoot, target);
  const approved = ["docs/features/", "docs/systems/", "templates/"];
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`) || !approved.some((prefix) => inner.startsWith(prefix)) || !existsSync(target)) {
    throw new Error("That source path is not available to the proof UI.");
  }
  return readFileSync(target, "utf8");
}

async function handleApi(request, response, url) {
  const api = await runner();
  if (request.method === "GET" && url.pathname === "/api/case") {
    if (typeof api.loadCase !== "function") throw new Error("The runner does not expose the proof case.");
    const snapshot = typeof api.loadFrozenSnapshot === "function" ? await api.loadFrozenSnapshot() : null;
    return sendJson(response, 200, { case: await api.loadCase(), snapshot });
  }
  if (request.method === "GET" && url.pathname === "/api/result/latest") {
    const { latest } = await loadProofSurface(api);
    return sendJson(response, 200, { latest });
  }
  if (request.method === "GET" && url.pathname === "/api/files") {
    const path = url.searchParams.get("path") || "";
    const { outputRoot } = await loadProofSurface(api);
    const file = await loadFile(api, path, outputRoot);
    return sendJson(response, 200, typeof file === "string" ? { path, content: file } : { path, ...file });
  }
  if (request.method === "GET" && url.pathname === "/api/source") {
    const path = url.searchParams.get("path") || "";
    return sendJson(response, 200, { path, content: readSource(path) });
  }
  if (request.method === "POST" && url.pathname === "/api/run") {
    const body = await readJson(request);
    if (body.mode && body.mode !== "mock" && body.mode !== "frozen-mock") {
      throw new Error("The browser proof surface is read-only. Run operate-kamdar-v4.mjs --operate-v4 from the reviewed v4 operator edge; it writes only the isolated v4 Notion workspace and records receipts for this dashboard.");
    }
    if (typeof api.runTemplateFirstProof !== "function") throw new Error("The runner does not expose the template-first proof.");
    const result = await api.runTemplateFirstProof({ outputRoot: frozenOutputRoot, reset: body.reset !== false });
    return sendJson(response, 200, { result });
  }
  return sendJson(response, 404, { error: "Route not found." });
}

async function handleShowcase(response) {
  const api = await runner();
  const { latest, outputRoot } = await loadProofSurface(api);
  const showcasePath = latest?.outputs?.showcase_html;
  if (!showcasePath) {
    return sendText(response, 404, "text/html", "<!doctype html><title>Kamdar proof</title><p>Run the frozen baseline to generate the showcase.</p>");
  }
  const file = await loadFile(api, showcasePath, outputRoot);
  const content = typeof file === "string" ? file : file?.content;
  if (typeof content !== "string") throw new Error("The showcase output could not be read.");
  return sendText(response, 200, "text/html", content);
}

export function createEvalServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
      if (url.pathname === "/showcase" && request.method === "GET") return await handleShowcase(response);
      if (url.pathname === "/" && request.method === "GET") {
        return sendText(response, 200, "text/html", "<!doctype html><meta http-equiv=\"refresh\" content=\"0;url=/showcase\"><title>Kamdar proof</title><p>Opening the buyer proof… <a href=\"/showcase\">Continue</a></p>");
      }
      return sendText(response, 404, "text/plain", "Not found");
    } catch (error) {
      const status = /requires?|Invalid|too large|cannot score|frozen|out of scope|read-only|not available|escaped|not found/i.test(error.message) ? 400 : 500;
      return sendJson(response, status, { error: error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(uiPath)) throw new Error(`Proof UI not found: ${uiPath}`);
  createEvalServer().listen(port, host, () => console.log(`Kamdar Proof: http://${host}:${port}`));
}

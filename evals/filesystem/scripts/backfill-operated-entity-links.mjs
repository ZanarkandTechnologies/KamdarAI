#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadKamdarSeedConfig } from "./kamdar-seed-config.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "../../..");

function readJson(path, label = path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); }
}

function stable(value) { return `${JSON.stringify(value, null, 2)}\n`; }

function propertyText(property) {
  return (property?.title || property?.rich_text || []).map((item) => item.plain_text || item.text?.content || "").join("");
}

function defaultCommandRunner(args) {
  const result = spawnSync("ntn", args, { encoding: "utf8", timeout: 120_000, maxBuffer: 5_000_000 });
  return { status: Number.isInteger(result.status) ? result.status : 1, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function queryDataSource(commandRunner, dataSourceId, label) {
  const result = commandRunner(["datasources", "query", dataSourceId, "--limit", "100", "--json"]);
  if (result.status !== 0) throw new Error(`Notion query failed for ${label}: ${(result.stderr || result.stdout || "command failed").trim()}`);
  const response = JSON.parse(result.stdout);
  if (response.next_cursor) throw new Error(`${label} exceeds the bounded 100-page query limit`);
  return response.results || [];
}

function entityCatalog(seed) {
  const rows = [];
  for (const entityType of ["projects", "work_items", "meetings", "reports", "people"]) {
    for (const entity of seed.entities?.[entityType] || []) rows.push({ entity_id: entity.id, entity_type: entityType, label: entity.properties?.name || entity.id });
  }
  return new Map(rows.map((row) => [row.entity_id, row]));
}

function requiredEntityIds(suites) {
  return new Set(suites.flatMap((suite) => suite.evals || []).flatMap((row) => row.metadata?.extensions?.kamdar?.entity_ids || []));
}

export function backfillOperatedEntityLinks({ evidencePath, statePath, seedPath, suitePaths, apply = false, commandRunner = defaultCommandRunner }) {
  const evidence = readJson(evidencePath, "operated evidence");
  const state = readJson(statePath, "isolated Notion state");
  const rawSeed = readJson(seedPath, "eval seed");
  const seed = rawSeed.tables ? loadKamdarSeedConfig({ path: seedPath }) : rawSeed;
  const suites = suitePaths.map((path) => readJson(path, `eval suite ${path}`));
  if (!state.root?.url || state.root.url !== evidence.root_url) throw new Error("isolated Notion state root does not match operated evidence root_url");

  const catalog = entityCatalog(seed);
  const requiredIds = requiredEntityIds(suites);
  const unknownIds = [...requiredIds].filter((id) => !catalog.has(id)).sort();
  if (unknownIds.length) throw new Error(`eval suites reference unknown seed entities: ${unknownIds.join(", ")}`);

  const databaseForType = { projects: "projects", work_items: "work_items", meetings: "work_items", reports: "reports", people: "people" };
  const neededDatabases = new Set([...requiredIds].map((id) => databaseForType[catalog.get(id).entity_type]));
  const providerPages = new Map();
  for (const databaseKey of neededDatabases) {
    const dataSourceId = state.databases?.[databaseKey]?.data_source_id;
    if (!dataSourceId) throw new Error(`isolated Notion state is missing ${databaseKey} data source`);
    for (const page of queryDataSource(commandRunner, dataSourceId, databaseKey)) {
      const entityId = propertyText(page.properties?.ID);
      if (entityId && page.url) providerPages.set(entityId, page.url);
    }
  }

  const unresolvedProviderIds = [...requiredIds].filter((id) => !providerPages.has(id)).sort();
  if (unresolvedProviderIds.length) throw new Error(`Notion pages not found: ${unresolvedProviderIds.join(", ")}`);

  const entityLinks = [...requiredIds].sort().map((entityId) => ({ ...catalog.get(entityId), url: providerPages.get(entityId) }));
  const current = new Map((evidence.entity_links || []).map((link) => [link.entity_id, link.url]));
  const missingBefore = entityLinks.filter((link) => current.get(link.entity_id) !== link.url).map(({ entity_id }) => entity_id);
  if (apply) {
    evidence.schema_version = "kamdar-operated-evidence@2.1.0";
    evidence.entity_links = entityLinks;
    writeFileSync(evidencePath, stable(evidence));
  }
  const missingAfter = apply ? [] : missingBefore;
  return { mode: apply ? "apply" : "check", required: entityLinks.length, added_or_corrected: missingBefore.length, missing: missingAfter.length, missing_entity_ids: missingAfter };
}

function parseArgs(argv) {
  const values = {};
  let mode = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply" || arg === "--check") { if (mode) throw new Error("choose exactly one of --apply or --check"); mode = arg.slice(2); continue; }
    if (["--evidence", "--state", "--seed", "--daily-suite", "--weekly-suite"].includes(arg)) { values[arg.slice(2)] = argv[++index]; continue; }
    throw new Error(`unknown argument ${arg}`);
  }
  if (!mode || !values.evidence || !values.state) throw new Error("usage: backfill-operated-entity-links.mjs (--apply|--check) --evidence <json> --state <json> [--seed <json>] [--daily-suite <json>] [--weekly-suite <json>]");
  return {
    apply: mode === "apply",
    evidencePath: resolve(values.evidence),
    statePath: resolve(values.state),
    seedPath: resolve(values.seed || repoRoot, values.seed ? "" : "seed/manifest.json"),
    suitePaths: [resolve(values["daily-suite"] || repoRoot, values["daily-suite"] ? "" : "evals/daily/suite.json"), resolve(values["weekly-suite"] || repoRoot, values["weekly-suite"] ? "" : "evals/weekly/suite.json")],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = backfillOperatedEntityLinks(parseArgs(process.argv.slice(2)));
    process.stdout.write(stable(result));
    if (result.missing) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(stable({ status: "blocked", reason: error.message }));
    process.exitCode = 1;
  }
}

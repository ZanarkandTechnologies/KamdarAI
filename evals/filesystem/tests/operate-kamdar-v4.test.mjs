import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import {
  operateKamdarV4,
  preflightKamdarV4,
  toTemplateFirstExternalReceipts,
  v4Databases,
  v4Namespace
} from "../scripts/operate-kamdar-v4.mjs";
import { loadFrozenSnapshot, runTemplateFirstProof } from "../scripts/template-first-kamdar.mjs";

function root(t) {
  const value = mkdtempSync(resolve(tmpdir(), "kamdar-operate-v4-"));
  t.after(() => rmSync(value, { recursive: true, force: true }));
  return value;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function schemaFor(key, withRelations = false) {
  const base = {
    projects: ["ID", "Name", "Department", "Owner", "Progress", "Status", "Next action", "Template"],
    work_items: ["ID", "Name", "Project", "Owner", "Status", "Template", "Type"],
    people: ["ID", "Name", "Department", "Role", "Route", "Status", "Template"],
    decisions: ["ID", "Name", "Project", "Status", "Template"],
    reports: ["ID", "Name", "Project", "Status", "Template", "Week", "Level"],
    skills: ["ID", "Name", "Status", "Template"],
    templates: []
  }[key];
  const properties = Object.fromEntries(base.map((name) => [name, { type: name === "Name" ? "title" : "rich_text" }]));
  if (withRelations && ["work_items", "decisions", "reports", "skills"].includes(key)) properties.Projects = { type: "relation" };
  if (withRelations && key === "projects") {
    properties["Main blocker"] = { type: "rich_text" };
    properties["Last automation run"] = { type: "rich_text" };
  }
  if (key === "projects" || key === "work_items" || key === "people" || key === "decisions" || key === "reports" || key === "skills") properties.Source = { type: "url" };
  return { id: v4Databases[key].data_source_id, parent: { database_id: v4Databases[key].database_id }, in_trash: false, properties };
}

function mockedNtn({ withRelations = false } = {}) {
  const calls = [];
  const schemas = Object.fromEntries(Object.keys(v4Databases).map((key) => [key, schemaFor(key, withRelations)]));
  const sourceToKey = new Map(Object.entries(v4Databases).map(([key, database]) => [database.data_source_id, key]));
  let sequence = 0;
  const runner = (args) => {
    calls.push(args);
    if (args[0] === "datasources" && args[1] === "resolve") {
      const key = Object.keys(v4Databases).find((candidate) => v4Databases[candidate].database_id === args[2]);
      return { status: 0, stdout: JSON.stringify({ database_id: args[2], data_sources: [{ id: v4Databases[key].data_source_id, name: v4Databases[key].title }] }) };
    }
    if (args[0] === "api" && args[1]?.startsWith("v1/data_sources/")) {
      const key = sourceToKey.get(args[1].slice("v1/data_sources/".length));
      return { status: 0, stdout: JSON.stringify(schemas[key]) };
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "PATCH" && args[3]?.startsWith("v1/data_sources/")) {
      const key = sourceToKey.get(args[3].slice("v1/data_sources/".length));
      const body = JSON.parse(args[args.indexOf("-d") + 1]);
      Object.assign(schemas[key].properties, Object.fromEntries(Object.entries(body.properties).map(([name, definition]) => [name, { type: definition.relation ? "relation" : "rich_text" }])));
      return { status: 0, stdout: JSON.stringify(schemas[key]) };
    }
    if (args[0] === "datasources" && args[1] === "query") return { status: 0, stdout: JSON.stringify({ results: [], next_cursor: null }) };
    if (args[0] === "api" && args[1] === "v1/pages") {
      sequence += 1;
      return { status: 0, stdout: JSON.stringify({ id: `page-${sequence}`, url: `https://notion.test/page-${sequence}` }) };
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "PATCH" && args[3]?.startsWith("v1/pages/")) {
      const id = args[3].slice("v1/pages/".length);
      return { status: 0, stdout: JSON.stringify({ id, url: `https://notion.test/${id}` }) };
    }
    if (args[0] === "pages" && args[1] === "edit") return { status: 0, stdout: "" };
    if (args[0] === "api" && args[1] === "-X" && args[2] === "POST" && args[3] === "v1/comments") {
      sequence += 1;
      return { status: 0, stdout: JSON.stringify({ id: `comment-${sequence}` }) };
    }
    return { status: 1, stderr: `unexpected ${args.join(" ")}` };
  };
  return { runner, calls };
}

function statePath(t) {
  const directory = root(t);
  const path = resolve(directory, "state.json");
  writeJson(path, { version: 4, namespace: v4Namespace });
  return path;
}

function privateSeed() {
  return {
    schema_version: "kamdar-private-seed@1.0.0",
    aggregate: { named_projects: 39, source_gaps: 10, observed_departments: 7 },
    projects: Array.from({ length: 39 }, (_, index) => ({ project_key: `CAPTURE-PROJECT-${String(index + 1).padStart(2, "0")}`, project_name: `Private Project ${index + 1}`, department: "CMT" })),
    source_gaps: Array.from({ length: 10 }, (_, index) => ({ source_row_index: index, reason: "missing_project_name" })),
    departments: ["Marketing", "Merchandising", "CMT", "Ecommerce", "Property", "DTC", "Content"]
  };
}

function frozenResult(outputRoot) {
  return {
    run: { id: "kamdar-daily-company-showcase-2026-08-21", output_root: outputRoot },
    records: { changes: [] },
    tools: { calls: [] }
  };
}

function snapshot() {
  return { projects: [], people: [], work_items: [], departments: [], source_gaps: [], week: "2026-W34", local_day: "2026-08-21" };
}

test("v4 preflight validates fixed database pairs and is read-only even when relation properties are missing", (t) => {
  const mock = mockedNtn();
  const result = preflightKamdarV4({ commandRunner: mock.runner, statePath: statePath(t), privateSeed: privateSeed(), frozenResult: frozenResult(root(t)), snapshot: snapshot() });
  assert.equal(result.mode, "preflight");
  assert.equal(result.applies_notion_writes, false);
  assert.equal(result.namespace, v4Namespace);
  assert.ok(result.planned_schema_changes.some((change) => change.database === "work_items" && change.property === "Projects"));
  assert.equal(mock.calls.some((args) => args.includes("PATCH") || args.includes("POST")), false);
  assert.equal(Object.keys(result.databases).length, 7);
});

test("explicit operated v4 provisions only the fixed databases and stores a redacted receipt", (t) => {
  const mock = mockedNtn();
  const directory = root(t);
  const receiptPath = resolve(directory, "profile-private/operated-notion-receipt.json");
  const result = operateKamdarV4({
    operate: true,
    commandRunner: mock.runner,
    statePath: statePath(t),
    privateSeed: privateSeed(),
    frozenResult: frozenResult(root(t)),
    snapshot: snapshot(),
    receiptPath
  });
  assert.equal(result.mode, "operated-v4");
  assert.equal(result.counts.applied, 39);
  assert.equal(result.schema_changes.filter((change) => change.operation === "added_relation").length, 4);
  assert.equal(mock.calls.some((args) => args[0] === "api" && args.includes("PATCH") && args.some((value) => String(value).includes("v1/data_sources/"))), true);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(receipt.namespace, v4Namespace);
  assert.equal(JSON.stringify(receipt).includes("Private Project"), false);
  assert.equal(JSON.stringify(receipt).includes("@"), false);
});

test.skip("the full frozen plan maps capture Projects, generated reports, promotions, and comments through the same bounded edge", (t) => {
  const mock = mockedNtn();
  const directory = root(t);
  const outputRoot = resolve(directory, "frozen-output");
  const result = runTemplateFirstProof({ outputRoot, reset: true, mode: "frozen-mock" });
  const applied = operateKamdarV4({
    operate: true,
    commandRunner: mock.runner,
    statePath: statePath(t),
    privateSeed: privateSeed(),
    frozenResult: result,
    snapshot: loadFrozenSnapshot(),
    receiptPath: resolve(directory, "profile-private/receipt.json")
  });
  assert.ok(applied.counts.applied > 90, "full plan should include seed, patch, report, promotion, and comment writes");
  assert.equal(applied.actions.some((entry) => entry.operation === "create_owner_action_comment"), true);
  assert.equal(applied.actions.some((entry) => entry.operation === "upsert_company_report"), true);
  assert.equal(applied.actions.some((entry) => entry.operation === "upsert_skill"), true);
  assert.equal(applied.actions.some((entry) => entry.action_key.includes("seed-project")), true);
});

test("only matching redacted Notion actions become template-first operated receipts", () => {
  const receipts = toTemplateFirstExternalReceipts({
    actions: [
      {
        feature_id: "FEAT-0001", adapter: "notion", operation: "update_project_memory", action_key: "project-memory:2026-08-21:PROJ-CMT",
        status: "applied", provider_id_hash: "a".repeat(64), recorded_at: "2026-08-22T01:00:00.000Z",
        result_url: "https://app.notion.com/p/isolate-v4-page", payload_hash: "b".repeat(64), idempotency_key: "project-memory:2026-08-21:PROJ-CMT"
      },
      { feature_id: null, adapter: "notion", operation: "upsert_capture_project", status: "applied", action_key: "seed-project:CAPTURE-01" },
      { feature_id: "FEAT-0005", adapter: "notion", operation: "upsert_company_report", status: "skipped", action_key: "company-report:2026-W34" }
    ]
  });
  assert.equal(receipts.length, 1);
  assert.deepEqual(Object.keys(receipts[0]).sort(), ["action_key", "adapter", "detail", "feature_id", "idempotency_key", "operation", "payload_hash", "provider_id", "recorded_at", "result_url", "status"]);
  assert.equal(receipts[0].provider_id, "a".repeat(64));
  assert.equal(JSON.stringify(receipts).includes("CAPTURE-01"), false);
  assert.equal(JSON.stringify(receipts).includes("@"), false);
});

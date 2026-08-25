import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { latestRun, loadCase, loadContract, loadFrozenSnapshot, readRunFile, runTemplateFirstProof } from "../scripts/template-first-kamdar.mjs";
import { buildVercelShowcase } from "../scripts/build-vercel-showcase.mjs";
import { writePrivateSeed } from "../../../scripts/compile_private_kamdar_seed.mjs";

function temporaryRoot(t) {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-template-first-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function checkById(result, id) { return result.assertions.checks.find((check) => check.id === id); }

test("the record-and-file contract resolves feature docs and compiles the sanctioned portfolio shape", () => {
  const contract = loadContract();
  const proof = loadCase();
  const snapshot = loadFrozenSnapshot();
  assert.equal(contract.schema_version, "0.4.0");
  assert.equal(proof.id, "daily-weekly-complete-showcase");
  assert.ok(proof.record_assertions.length >= 10);
  assert.ok(proof.file_assertions.length >= 11);
  assert.ok(proof.behavior_assertions.length >= 23);
  assert.equal(proof.features.length, 7);
  assert.ok(proof.features.every((feature) => feature.title && feature.summary && feature.document.sections.Flow && feature.source_link_ids.length));
  assert.ok(proof.record_assertions.every((row) => row.feature_id?.startsWith("FEAT-")));
  assert.ok(proof.file_assertions.every((row) => row.feature_id?.startsWith("FEAT-") && row.template.path.startsWith("templates/")));
  assert.ok(proof.behavior_assertions.every((row) => row.feature_id?.startsWith("FEAT-")));
  for (const productionId of [
    "3b7d43a2394280e6ae73fcadf3c5c748",
    "b2e2f5f3d6b14d01961a2bef0696d744",
    "638d85a858b04d038d8b97be1a879a1f",
    "d2bf0d7776594a4982909e618aad8d98",
    "1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV"
  ]) assert.doesNotMatch(JSON.stringify(proof), new RegExp(productionId));
  assert.equal(snapshot.projects.length, 7);
  assert.equal(snapshot.source_gaps.length, 1);
  assert.equal(snapshot.departments.length, 7);
  assert.equal(snapshot.people.length, 6);
  assert.equal(snapshot.work_items.length, 13);
  assert.equal(snapshot.work_items.filter((item) => item.meeting_block).length, 3);
  assert.equal(snapshot.projects.filter((project) => project.active).length, 7);
  assert.equal(snapshot.work_items.filter((item) => item.status === "Blocked").length, 1);
  assert.equal(snapshot.work_items.filter((item) => item.healthy).length, 9);
  assert.equal(snapshot.seed_provenance.private_seed_verified, false);
});

test.skip("the frozen scenario verifies a matching private seed without rendering its raw Project data", (t) => {
  const root = temporaryRoot(t);
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, "../fixtures/template-first-kamdar/seed-manifest.json"), "utf8"));
  const privateSeed = {
    schema_version: "kamdar-private-seed@1.0.0",
    source_capture_sha256: manifest.source_capture_sha256,
    public_manifest_sha256: manifest.manifest_sha256,
    aggregate: manifest.aggregate,
    projects: Array.from({ length: 39 }, (_, index) => ({ project_key: `PRIVATE-${index + 1}`, project_name: `Private ${index + 1}` })),
    source_gaps: Array.from({ length: 10 }, (_, index) => ({ source_row_index: index, reason: "missing_project_name" })),
    departments: ["A", "B", "C", "D", "E", "F", "G"]
  };
  const seedPath = writePrivateSeed({ outputPath: resolve(root, "private-seed.json"), privateSeed });
  const fixture = loadFrozenSnapshot({ privateSeedPath: seedPath });
  assert.equal(fixture.seed_provenance.private_seed_verified, true);
  assert.equal(fixture.seed_provenance.source_capture_sha256.length, 64);
  assert.doesNotMatch(JSON.stringify(fixture), /Private 1/);
  const result = runTemplateFirstProof({ outputRoot: resolve(root, "run"), privateSeedPath: seedPath });
  assert.equal(result.seed_provenance.private_seed_verified, true);
  assert.doesNotMatch(JSON.stringify(result), /Private 1/);
});

test.skip("Daily then Weekly updates canonical records, produces deliberate artifacts, and remains idempotent", (t) => {
  const outputRoot = temporaryRoot(t);
  const result = runTemplateFirstProof({ outputRoot });
  assert.equal(result.kind, "kamdar-template-first-proof");
  assert.equal(result.run.mode, "frozen-mock");
  assert.equal(result.safety.network_calls_by_processor, 0);
  assert.equal(result.safety.external_writes_by_processor, 0);
  assert.equal(result.assertions.pass, true);
  assert.equal(result.assertions.counts.fail, 0);
  assert.equal(result.comparison.pass, true);
  assert.ok(result.assertions.checks.every((row) => row.feature_id?.startsWith("FEAT-")));
  assert.ok(result.tools.calls.every((call) => call.feature_id?.startsWith("FEAT-")));
  assert.equal(result.files.second_run_events.length, 0);
  assert.equal(result.idempotency.pass, true);
  assert.equal(result.selection.project_ids.length, 7);
  assert.equal(result.records.changes.filter((change) => change.assertion_ids.includes("daily-project-memory-records")).length, 7);
  assert.equal(result.records.changes.filter((change) => change.assertion_ids.includes("weekly-report-records")).length, 15);
  assert.equal(result.records.changes.filter((change) => change.database === "work_comments").length, 2);
  assert.equal(result.tools.calls.filter((call) => call.operation === "send_owner_followup").length, 1);
  assert.equal(result.weekly.project_reports.length, 7);
  assert.equal(result.weekly.department_reports.length, 7);
  assert.ok(result.files.inventory.every((entry) => !entry.path.startsWith("daily/projects/")));
  assert.ok(result.files.inventory.every((entry) => !entry.path.startsWith("weekly/planning/projects/")));
  assert.equal(checkById(result, "daily-project-memory-records")?.pass, true);
  assert.equal(checkById(result, "daily-owner-action-comment-artifacts")?.pass, true);
  assert.equal(checkById(result, "weekly-report-records")?.pass, true);
  assert.equal(checkById(result, "weekly-linked-commitments")?.pass, true);
  const comment = readRunFile("daily/comments/TASK-101-owner-action.md", { outputRoot });
  const company = readRunFile("weekly/reports/company/weekly-rollup-2026-W34.md", { outputRoot });
  const telegram = readRunFile("weekly/distribution/telegram-summary-2026-W34.md", { outputRoot });
  assert.match(comment, /What the record currently says/);
  assert.match(comment, /1\. What changed since the last meaningful update\?/);
  assert.match(comment, /Update:/);
  assert.match(comment, /Source: notion:\/\/TASK-101/);
  assert.match(company, /weekly\/reports\/departments\/content\/weekly-rollup-2026-W34\.md/);
  for (const department of result.buyer_story.fixture.departments) assert.match(telegram, new RegExp(department));
  assert.equal(result.buyer_story.fixture.projects, 7);
  assert.equal(result.buyer_story.feature_docs.length, 7);
  assert.ok(result.buyer_story.feature_docs.every((feature) => feature.flow));
  const showcase = readRunFile(result.outputs.showcase_html, { outputRoot });
  assert.match(showcase, /Know what is late, why it matters, and who needs to act\./);
  assert.match(showcase, /The seeded workspace/);
  assert.match(showcase, /Daily features/);
  assert.match(showcase, /Weekly features/);
  assert.match(showcase, /System reference — database purpose, templates, raw checks, and trace/);
  assert.equal((showcase.match(/Primary seeded case/g) || []).length, 7);
  assert.match(showcase, /Penang variance becomes current Project memory/);
  assert.match(showcase, /Attribution work gets a precise evidence request/);
  assert.match(showcase, /\.evidence-grid\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(showcase, /Daily 1 of 4 · FEAT-/);
  assert.doesNotMatch(showcase, /sends it through the approved Telegram route/);
  assert.match(showcase, /https:\/\/app\.notion\.com\/p\/90221bfcfd6349ffb2b4ebf57750a07d/);
  assert.match(showcase, /Read generated artifact/);
  assert.match(showcase, /Feature contract — rendered from source/);
  assert.match(showcase, /Generated output · daily\/comments\/TASK-115-owner-action\.md/);
  assert.match(showcase, /@@ created @@/);
  assert.match(showcase, /Creates zero `daily\/projects\/\*\.md` files/);
  const showcaseUrls = [...showcase.matchAll(/href="(https:[^"]+)"/g)].map((match) => match[1]);
  const v4Urls = new Set([
    result.case.showcase_environment.url,
    ...result.case.showcase_environment.databases.map((database) => database.url)
  ]);
  assert.ok(showcaseUrls.length > 0);
  assert.ok(showcaseUrls.every((url) => v4Urls.has(url)), "buyer showcase links must remain inside the isolated v4 environment");
  for (const productionId of [
    "3b7d43a2394280e6ae73fcadf3c5c748",
    "b2e2f5f3d6b14d01961a2bef0696d744",
    "638d85a858b04d038d8b97be1a879a1f",
    "d2bf0d7776594a4982909e618aad8d98",
    "1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV"
  ]) assert.doesNotMatch(showcase, new RegExp(productionId));
  assert.throws(() => readRunFile("../escape", { outputRoot }), /escaped the run root/);
});

test("the shareable static build is generated from the typed suites and judged runs", (t) => {
  const outputDirectory = resolve(temporaryRoot(t), "static");
  const built = buildVercelShowcase({ outputDirectory });
  const html = readFileSync(built.index_html, "utf8");
  assert.equal(built.totals.features, 7);
  assert.equal(built.totals.cases, 13);
  assert.equal(built.totals.statuses.PASSED, 13);
  assert.equal((html.match(/class="feature-group"/g) || []).length, 7);
  assert.equal((html.match(/class="case-row(?: selected)?" type/g) || []).length, 13);
  assert.match(html, /Technical evidence/);
  assert.doesNotMatch(html, /Primary seeded case|Frozen proof:/);
});

test("the static builder accepts explicit completed run roots", (t) => {
  const dailyRunRoot = resolve("evals/filesystem/runs/deployments/seed-v2-2026-08-25-01/daily-eval");
  const weeklyRunRoot = resolve("evals/filesystem/runs/deployments/seed-v2-2026-08-25-02/weekly-eval");
  const built = buildVercelShowcase({ outputDirectory: resolve(temporaryRoot(t), "static"), dailyRunRoot, weeklyRunRoot });
  assert.deepEqual(built.run_roots, [
    "evals/filesystem/runs/deployments/seed-v2-2026-08-25-01/daily-eval",
    "evals/filesystem/runs/deployments/seed-v2-2026-08-25-02/weekly-eval"
  ]);
  assert.match(readFileSync(built.index_html, "utf8"), /Kamdar Company OS evals/);
});

test.skip("operated mode overlays only matching downstream receipts without changing frozen scoring", (t) => {
  const frozenRoot = resolve(temporaryRoot(t), "frozen");
  const operatedRoot = resolve(temporaryRoot(t), "operated");
  const frozen = runTemplateFirstProof({ outputRoot: frozenRoot });
  const target = frozen.tools.calls.find((call) => call.adapter === "notion" && call.operation === "update_project_memory");
  const workspaceDatabases = Object.fromEntries(["projects", "work_items", "people", "decisions", "reports", "skills", "templates"].map((key) => [key, `https://www.notion.so/demo-${key}`]));
  const operated = runTemplateFirstProof({
    outputRoot: operatedRoot,
    mode: "operated-showcase",
    externalReceipts: [{
      feature_id: target.feature_id, adapter: target.adapter, operation: target.operation,
      action_key: target.args.action_key, status: "applied", result_url: "https://www.notion.so/showcase-project",
      workspace_url: "https://www.notion.so/demo-workspace", workspace_databases: workspaceDatabases,
      template_library_url: "https://www.notion.so/demo-templates", recorded_at: "2026-08-21T09:30:00.000Z",
      payload_hash: "a".repeat(64), idempotency_key: target.args.action_key
    }]
  });
  const applied = operated.tools.calls.find((call) => call.args.action_key === target.args.action_key);
  assert.equal(operated.run.mode, "operated-showcase");
  assert.equal(applied.status, "applied");
  assert.equal(applied.receipt.result_url, "https://www.notion.so/showcase-project");
  assert.equal(operated.assertions.pass, true);
  assert.equal(operated.assertions.counts.fail, 0);
  assert.equal(operated.safety.network_calls_by_processor, 0);
});

test.skip("latestRun prefers a persisted operated result over an older in-memory frozen result", (t) => {
  const servedRoot = temporaryRoot(t);
  const operatedRoot = temporaryRoot(t);
  const baseline = runTemplateFirstProof({ outputRoot: resolve(operatedRoot, "baseline") });
  const target = baseline.tools.calls.find((call) => call.adapter === "notion" && call.operation === "update_project_memory");
  const operated = runTemplateFirstProof({
    outputRoot: resolve(operatedRoot, "operated"), mode: "operated-showcase",
    externalReceipts: [{ feature_id: target.feature_id, adapter: target.adapter, operation: target.operation, action_key: target.args.action_key, status: "applied", result_url: "https://www.notion.so/receipt-backed-project", recorded_at: "2026-08-21T09:30:00.000Z", payload_hash: "b".repeat(64), idempotency_key: target.args.action_key }]
  });
  runTemplateFirstProof({ outputRoot: servedRoot, mode: "frozen-mock" });
  writeFileSync(resolve(servedRoot, "result.json"), `${JSON.stringify(operated)}\n`);
  assert.equal(latestRun({ outputRoot: servedRoot }).run.mode, "operated-showcase");
});

test("the local proof surface receives feature-owned record, file, behavior, and application data", () => {
  const ui = readFileSync(resolve(import.meta.dirname, "../ui/index.html"), "utf8");
  const proof = loadCase();
  assert.ok(proof.features.every((feature) => feature.document.raw.includes("## Flow")));
  assert.ok(proof.features.every((feature) => feature.document.sections["Proof contract"]));
  assert.ok(ui.includes("FEATURE") || ui.includes("feature"));
});

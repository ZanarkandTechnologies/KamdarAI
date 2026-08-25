import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  latestRun,
  loadCase,
  loadFrozenSnapshot,
  readRunFile,
  runAutomationSnapshot,
  runMockAutomation
} from "../scripts/mock-kamdar-automation.mjs";
import { runTemplateFirstProof } from "../scripts/template-first-kamdar.mjs";

function temporaryRoot(t) {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-company-showcase-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("the suite has one natural comprehensive case and sanitized frozen inputs", () => {
  const definition = loadCase();
  const snapshot = loadFrozenSnapshot();
  assert.equal(definition.id, "kamdar-daily-company-showcase");
  assert.match(definition.operator_request, /Run today's company operating update/);
  assert.equal(definition.reference_points.length, 7);
  assert.equal(snapshot.notion.tasks.length, 4);
  assert.equal(snapshot.notion.projects.length, 3);
  assert.equal(snapshot.notion.people.length, 3);
  assert.equal(snapshot.drive.resources.length, 4);
  const serialized = JSON.stringify({ definition, snapshot });
  assert.doesNotMatch(serialized, /@outlook\.com|@znrknd\.com/i);
  assert.match(serialized, /@example\.test/);
});

test("the mock automation proves source selection, reports, chases, delivery, and idempotency", (t) => {
  const outputRoot = temporaryRoot(t);
  const result = runMockAutomation({ outputRoot });

  assert.equal(result.kind, "kamdar-automation-proof");
  assert.equal(result.run.mode, "mock");
  assert.equal(result.safety.mocked, true);
  assert.equal(result.safety.network_calls_by_processor, 0);
  assert.equal(result.safety.external_writes_by_processor, 0);
  assert.deepEqual(result.selection.included_task_ids, ["TASK-101", "TASK-102", "TASK-103"]);
  assert.deepEqual(result.selection.excluded_task_ids, ["TASK-104"]);
  assert.equal(result.outputs.area_reports.length, 2);
  assert.equal(result.assertions.pass, true);
  assert.deepEqual(result.assertions.counts, { pass: 37, fail: 0, total: 37 });
  assert.equal(result.assertions.reference_points.every((point) => point.pass), true);

  const eventMap = new Map(result.files.events.map((event) => [event.path, event.event]));
  assert.equal(eventMap.get("reports/areas/retail-operations/weekly-report-2026-W34.md"), "modified");
  assert.equal(eventMap.get("reports/areas/digital-commerce/weekly-report-2026-W34.md"), "created");
  assert.equal(eventMap.get("reports/company/weekly-report-2026-W34.md"), "created");
  assert.deepEqual(result.files.second_run_events, []);

  const retail = readRunFile(result.outputs.area_reports.find((path) => path.includes("retail-operations")), { outputRoot });
  const digital = readRunFile(result.outputs.area_reports.find((path) => path.includes("digital-commerce")), { outputRoot });
  const company = readRunFile(result.outputs.company_rollup, { outputRoot });
  const email = readRunFile(result.outputs.email_archive, { outputRoot });
  const telegram = readRunFile(result.outputs.telegram_archive, { outputRoot });
  assert.match(retail, /412-unit variance/);
  assert.match(retail, /approved version 3/);
  assert.match(digital, /Acceptance evidence, Rollout owner/);
  assert.doesNotMatch(`${retail}\n${digital}\n${company}\n${email}\n${telegram}`, /TASK-104|{{/);
  assert.match(company, /3 tasks changed this week across 2 areas/);
  assert.match(email, /MOCK DELIVERY ARCHIVE/);
  assert.match(email, /aisha\.operations@example\.test/);
  assert.match(email, /darren\.commerce@example\.test/);
  assert.match(telegram, /2 follow-ups/);

  const contactOperations = new Set([
    "notion:create_task_comment",
    "email:send_message",
    "telegram:send_message"
  ]);
  const runOneContactCalls = result.tools.calls.filter((call) => call.phase === "run-1" && contactOperations.has(`${call.adapter}:${call.operation}`));
  const runTwoContactCalls = result.tools.calls.filter((call) => call.phase === "run-2" && contactOperations.has(`${call.adapter}:${call.operation}`));
  assert.equal(runOneContactCalls.length, 5);
  assert.equal(runTwoContactCalls.length, 0);
  assert.equal(result.idempotency.pass, true);
  assert.equal(result.idempotency.skipped_actions, 5);
  assert.equal(result.idempotency.duplicate_files, 0);
  assert.equal(result.idempotency.duplicate_actions, 0);
  assert.equal(result.idempotency.second_run_new_external_actions, 0);

  assert.equal(latestRun({ outputRoot }).assertions.pass, true);
  assert.match(readRunFile(result.outputs.showcase_markdown, { outputRoot }), /No network calls were made/);
  assert.match(readRunFile(result.outputs.showcase_html, { outputRoot }), /Mocked connector proof/);
  assert.throws(() => readRunFile("../escape", { outputRoot }), /escaped the run root/);
});

test("the same processor accepts a live snapshot and scores supplied connector receipts", (t) => {
  const mockRoot = resolve(temporaryRoot(t), "mock");
  const liveRoot = resolve(temporaryRoot(t), "live");
  const mock = runMockAutomation({ outputRoot: mockRoot });
  const externalReceipts = mock.tools.calls.map(({ adapter, operation, args, result, phase, recorded_at }) => ({ adapter, operation, args, result, phase, recorded_at }));
  const privateEmailReceipt = externalReceipts.find((receipt) => receipt.adapter === "email" && receipt.args.recipient_id === "PERSON-AISHA");
  privateEmailReceipt.args.to = "private.person@example.com";
  privateEmailReceipt.args.authorization = "Bearer secret-token";
  privateEmailReceipt.result.access_token = "secret-token";
  const live = runAutomationSnapshot({
    snapshot: loadFrozenSnapshot(),
    outputRoot: liveRoot,
    mode: "live-poc",
    externalReceipts
  });

  assert.equal(live.run.mode, "live-poc");
  assert.equal(live.safety.mocked, false);
  assert.equal(live.safety.network_calls_by_processor, 0);
  assert.equal(live.tools.calls.every((call) => call.source === "external-receipt" && call.mocked === false), true);
  assert.equal(live.assertions.pass, true);
  const serialized = JSON.stringify(live);
  assert.doesNotMatch(serialized, /private\.person@example\.com|secret-token/);
  assert.match(serialized, /REDACTED_CONTACT|REDACTED_SECRET/);
  assert.match(readFileSync(resolve(liveRoot, "showcase/index.md"), "utf8"), /externally supplied live POC receipts/);
});

test.skip("POST /api/run exposes only the approved frozen template-first proof", async (t) => {
  const outputRoot = temporaryRoot(t);
  const previousOutputRoot = process.env.AUTHORED_EVAL_RUNS_DIR;
  process.env.AUTHORED_EVAL_RUNS_DIR = outputRoot;
  const { createEvalServer } = await import(`../scripts/serve.mjs?live-route-test=${Date.now()}`);
  if (previousOutputRoot === undefined) delete process.env.AUTHORED_EVAL_RUNS_DIR;
  else process.env.AUTHORED_EVAL_RUNS_DIR = previousOutputRoot;

  const server = createEvalServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  t.after(() => new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose())));
  const address = server.address();
  const caseResponse = await fetch(`http://127.0.0.1:${address.port}/api/case`);
  const caseBody = await caseResponse.json();
  assert.equal(caseResponse.status, 200);
  assert.ok(caseBody.case.record_assertions.length >= 10);
  assert.ok(caseBody.case.file_assertions.length >= 12);
  assert.ok(caseBody.case.behavior_assertions.length >= 25);
  assert.equal(caseBody.case.source_links.length, 5);

  const featureSourceResponse = await fetch(`http://127.0.0.1:${address.port}/api/source?path=docs%2Ffeatures%2FFEAT-0001-daily-project-memory.md`);
  const featureSource = await featureSourceResponse.json();
  assert.equal(featureSourceResponse.status, 200);
  assert.match(featureSource.content, /Keep Project pages current|Daily project memory/);
  const rejectedSourceResponse = await fetch(`http://127.0.0.1:${address.port}/api/source?path=workspace.hermes.md`);
  assert.equal(rejectedSourceResponse.status, 400);

  const response = await fetch(`http://127.0.0.1:${address.port}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "mock" })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.result.run.mode, "frozen-mock");
  assert.equal(body.result.assertions.counts.fail, 0);
  assert.equal(body.result.assertions.counts.pass, body.result.assertions.counts.total);
  assert.ok(body.result.assertions.counts.total >= 45);
  const escapedFileResponse = await fetch(`http://127.0.0.1:${address.port}/api/files?path=..%2Fescape`);
  assert.equal(escapedFileResponse.status, 400);
  const liveResponse = await fetch(`http://127.0.0.1:${address.port}/api/run`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "live" })
  });
  assert.equal(liveResponse.status, 400);
});

test.skip("a frozen UI comparison cannot replace the operated showcase surface", async (t) => {
  const root = temporaryRoot(t);
  const operatedRoot = resolve(root, "operated");
  const frozenRoot = resolve(root, "frozen");
  runTemplateFirstProof({ outputRoot: operatedRoot, mode: "operated-showcase", externalReceipts: [] });

  const previousOperated = process.env.AUTHORED_EVAL_OPERATED_RUNS_DIR;
  const previousFrozen = process.env.AUTHORED_EVAL_FROZEN_RUNS_DIR;
  process.env.AUTHORED_EVAL_OPERATED_RUNS_DIR = operatedRoot;
  process.env.AUTHORED_EVAL_FROZEN_RUNS_DIR = frozenRoot;
  const { createEvalServer } = await import(`../scripts/serve.mjs?operated-surface-test=${Date.now()}`);
  if (previousOperated === undefined) delete process.env.AUTHORED_EVAL_OPERATED_RUNS_DIR;
  else process.env.AUTHORED_EVAL_OPERATED_RUNS_DIR = previousOperated;
  if (previousFrozen === undefined) delete process.env.AUTHORED_EVAL_FROZEN_RUNS_DIR;
  else process.env.AUTHORED_EVAL_FROZEN_RUNS_DIR = previousFrozen;

  const server = createEvalServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  t.after(() => new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose())));
  const address = server.address();

  const runResponse = await fetch(`http://127.0.0.1:${address.port}/api/run`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "mock" })
  });
  assert.equal(runResponse.status, 200);
  const latestResponse = await fetch(`http://127.0.0.1:${address.port}/api/result/latest`);
  const latest = await latestResponse.json();
  assert.equal(latestResponse.status, 200);
  assert.equal(latest.latest.run.mode, "operated-showcase");
  const showcase = await fetch(`http://127.0.0.1:${address.port}/showcase`);
  assert.equal(showcase.status, 200);
  assert.match(await showcase.text(), /receipt-backed operated proof/);
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderEvidenceHtml } from "../../viewer/build.mjs";
import { buildEvidenceModel } from "../../viewer/model.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const operatedEvidencePath = resolve(projectRoot, "tickets/archive/TASK-0006/artifacts/qa/deployments/operated-w34-2026-08-26/operated-evidence.json");

function model(options = {}) {
  return buildEvidenceModel({ projectRoot, evidencePath: operatedEvidencePath, ...options });
}

function tempRoot(prefix) {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

function writeJudge(root, featureId, assertions, { tier = "A", failedIndex = null } = {}) {
  const path = resolve(root, `eval/judges/${featureId}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({
    target: featureId,
    tier,
    assertions: assertions.map((assertion, index) => ({
      assertion,
      met: index !== failedIndex,
      evidence: [`result.json#${featureId}-${index + 1}`],
    })),
  }, null, 2)}\n`);
}

test("viewer projects eight feature checks and fourteen unique cases from the consolidated suites", () => {
  const evidence = model();
  assert.equal(evidence.metrics.features.total, 8);
  assert.equal(evidence.metrics.cases.total, 14);
  assert.equal(evidence.features.length, 8);
  assert.deepEqual(evidence.features.map((feature) => feature.id), [
    "FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004", "FEAT-0005", "FEAT-0006", "FEAT-0007", "FEAT-0010",
  ]);
});

test("source input is the complete canonical seed record and never the mutable Notion source link", () => {
  const evidence = model();
  const feature = evidence.features.find((row) => row.id === "FEAT-0001");
  const task = feature.sources.find((row) => row.id === "TASK-101");
  const canonical = JSON.parse(readFileSync(resolve(projectRoot, "seed/tasks.json"), "utf8")).find((row) => row.id === "TASK-101");
  assert.deepEqual(task.record, canonical);
  assert.equal("url" in task, false);
  assert.match(task.record.body, /1\.5 cm wider at the collar/);
});

test("legacy source_inputs URLs are ignored while final output URLs remain linked", () => {
  const root = tempRoot("kamdar-viewer-evidence-");
  try {
    const legacy = JSON.parse(readFileSync(operatedEvidencePath, "utf8"));
    legacy.features[0].cases[0].source_inputs = [{
      id: "mutable-source",
      label: "Mutable Notion input",
      kind: "work",
      url: "https://mutable-source.example.invalid/TASK-101",
    }];
    const path = resolve(root, "evidence.json");
    writeFileSync(path, `${JSON.stringify(legacy, null, 2)}\n`);
    const evidence = buildEvidenceModel({ projectRoot, evidencePath: path });
    const serialized = JSON.stringify(evidence);
    assert.doesNotMatch(serialized, /mutable-source\.example\.invalid/);
    assert.match(serialized, /https:\/\/app\.notion\.com\/p\/CMT-Pipeline-/);
    assert.equal(evidence.metrics.outputs.total, 15);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malformed final output URLs fail the build", () => {
  const root = tempRoot("kamdar-viewer-invalid-url-");
  try {
    const evidence = JSON.parse(readFileSync(operatedEvidencePath, "utf8"));
    evidence.features[0].cases[0].output_artifacts[0].url = "https://";
    const path = resolve(root, "evidence.json");
    writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
    assert.throws(
      () => buildEvidenceModel({ projectRoot, evidencePath: path }),
      /output URL must be a valid HTTP or HTTPS URL/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("database setup contributes no feature check or score", () => {
  const evidence = model();
  const authoredChecks = evidence.features.flatMap((feature) => feature.assertions);
  const expectedCount = ["evals/daily/suite.json", "evals/weekly/suite.json", "evals/meeting-intake/suite.json"]
    .map((path) => JSON.parse(readFileSync(resolve(projectRoot, path), "utf8")))
    .flatMap((suite) => suite.features)
    .reduce((count, feature) => count + feature.assertions.length, 0);
  assert.equal(evidence.metrics.checks.total, expectedCount);
  assert.equal(evidence.metrics.checks.passed, 0);
  assert.equal(authoredChecks.some((row) => /seed|database|workspace contained/i.test(row.assertion)), false);
});

test("PASS is derived only from a matching A-tier feature judge", () => {
  const root = tempRoot("kamdar-viewer-judge-");
  try {
    const dailySuite = JSON.parse(readFileSync(resolve(projectRoot, "evals/daily/suite.json"), "utf8"));
    const feature = dailySuite.features[0];
    writeJudge(root, feature.feature_id, feature.assertions);
    const passed = model({ dailyRunRoot: root });
    assert.equal(passed.features[0].status, "pass");
    assert.equal(passed.metrics.features.passed, 1);
    assert.equal(passed.metrics.checks.passed, feature.assertions.length);

    writeJudge(root, feature.feature_id, feature.assertions, { failedIndex: 1 });
    const failed = model({ dailyRunRoot: root });
    assert.equal(failed.features[0].status, "fail");
    assert.equal(failed.metrics.features.passed, 0);
    assert.equal(failed.features[0].assertions[1].status, "fail");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing judges remain UNJUDGED instead of inheriting an operated output link", () => {
  const evidence = model();
  assert.ok(evidence.features.every((feature) => feature.status === "unjudged"));
  assert.equal(evidence.metrics.features.passed, 0);
  assert.ok(evidence.features.some((feature) => feature.outputs.length > 0));
});

test("meeting commitment workflow is source-backed and unjudged until operated Work output exists", () => {
  const evidence = model();
  const feature = evidence.features.find((row) => row.id === "FEAT-0010");
  assert.equal(feature.status, "unjudged");
  assert.equal(feature.outputs.length, 0);
  assert.equal(feature.sources.some((source) => source.id === "TASK-204" && source.kind === "meeting"), true);
  assert.match(JSON.stringify(feature.sources.find((source) => source.id === "TASK-204").record), /TASK-307/);
});

test("static dossier renders seed values inline and output links inside feature detail", () => {
  const html = renderEvidenceHtml(model());
  assert.match(html, /Source input · seed JSON/);
  assert.match(html, /Actual agent output/);
  assert.match(html, /feature checks · grouped by workflow/);
  assert.match(html, /grid-template-columns:minmax\(300px,40fr\) minmax\(520px,60fr\)/);
  assert.match(html, /evaluation-workbench\{display:grid;grid-template-columns:1fr/);
  assert.match(html, /class="topbar"/);
  assert.match(html, /class="metric-pill"/);
  assert.match(html, /Confirm corrected baju kurung tech pack/);
  assert.match(html, /https:\/\/mail\.google\.com\/mail\/u\/0\/\#all\/1a03d03e43458a87/);
  assert.doesNotMatch(html, /Confirm-corrected-baju-kurung-tech-pack-3c8d43a23942813c8006db6ffc189dd7/);
});

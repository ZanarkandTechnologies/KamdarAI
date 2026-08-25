import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildFeatureJudgePacket,
  loadDailyReviewEvalSuite,
  reconcileJudgedRun,
  validateUnifiedDailyRun,
} from "../scripts/unified-daily-review-eval.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const resultGolden = resolve(projectRoot, "automations/examples/golden/daily-review-result-2026-08-25.json");
const receiptGolden = resolve(projectRoot, "automations/examples/golden/daily-integration-receipt-2026-08-25.json");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function prepareRun() {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-unified-daily-eval-"));
  const resultPath = resolve(root, "daily/review/daily-review-result-2026-08-25.json");
  const receiptPath = resolve(root, "daily/receipts/daily-integration-receipt-2026-08-25.json");
  mkdirSync(dirname(resultPath), { recursive: true });
  mkdirSync(dirname(receiptPath), { recursive: true });
  cpSync(resultGolden, resultPath);
  cpSync(receiptGolden, receiptPath);
  writeJson(resolve(root, "daily/context/daily-context-diff-2026-08-25.json"), {
    artifact_type: "kamdar-daily-context-diff",
    artifact_version: "0.2.0",
    context_id: "daily-context-2026-08-25",
    projects: ["PROJ-CMT-CMT_PIPELINE", "PROJ-MERCH-INDIA_SOURCING", "PROJ-MKT-DEEPAVALI_MARKETING", "PROJ-ECOM-LISTING_PIPELINE"].map((id) => ({ id, source_id: id })),
    work_items: ["TASK-101", "TASK-102", "TASK-104", "TASK-105", "TASK-110", "TASK-115", "TASK-116"].map((id) => ({ id, source_id: id })),
    meetings: ["TASK-201", "TASK-203"].map((id) => ({ id, source_id: id })),
    people: ["PERSON-AISHA", "PERSON-JUN", "PERSON-NUR"].map((id) => ({ id, source_id: id })),
  });
  return root;
}

const integrationGateIds = [
  "effects-match-receipt",
  "read-back-matches-intent",
  "processing-safety",
  "idempotency",
];

function featureVerdict(root, feature, overrides = {}) {
  const evidenceRef = `${feature.entity_ids[0]} at ${feature.result_path}`;
  return {
    feature_id: feature.feature_id,
    tier: "A",
    verdict: "pass",
    assertions: feature.assertions.map((assertion) => ({ assertion, met: true, evidence_refs: [evidenceRef] })),
    evidence_refs: [evidenceRef],
    failures: [],
    verdict_path: resolve(root, `eval/judges/${feature.feature_id}.json`),
    ...overrides,
  };
}

function integrationChecks(overrides = {}) {
  return {
    pass: true,
    gates: integrationGateIds.map((gateId) => ({
      gate_id: gateId,
      pass: true,
      evidence_refs: [`daily/receipts/daily-integration-receipt-2026-08-25.json#${gateId}`],
      failures: [],
    })),
    failures: [],
    ...overrides,
  };
}

function prepareJudgedRun(root, suite = loadDailyReviewEvalSuite()) {
  writeJson(resolve(root, "eval/deterministic.json"), { pass: true });
  writeJson(resolve(root, "eval/integrations.json"), integrationChecks());
  writeJson(resolve(root, "eval/result.json"), { pass: true });
  for (const feature of suite.features) writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), featureVerdict(root, feature));
  writeJson(resolve(root, "eval/evidence-review.json"), {
    independent: true,
    verdict: "pass",
    reviewed_feature_ids: suite.features.map((feature) => feature.feature_id),
  });
  const resultPath = resolve(root, "daily/review/daily-review-result-2026-08-25.json");
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  const check = (pointer) => ({ pass: true, evidence_refs: [`daily/review/daily-review-result-2026-08-25.json#${pointer}`], findings: [] });
  const pointers = ["project_updates", "completed_ticket_comments", "weekly_progress_chases", "knowledge_updates"]
    .flatMap((key) => result[key].map((_, index) => `/${key}/${index}`));
  writeJson(resolve(root, "eval/artifact-quality-review.json"), {
    schema_version: "kamdar-artifact-quality-review@1.0.0",
    lane: "artifact-quality-review",
    independent: true,
    scope: "daily",
    context_id: result.context_id,
    result_sha256: createHash("sha256").update(readFileSync(resultPath)).digest("hex"),
    rubric_path: "evals/rubrics/end-user-artifact-quality.md",
    tier: "A",
    verdict: "pass",
    artifacts: pointers.map((pointer) => ({ artifact_pointer: pointer, checks: { referential_clarity: check(pointer), end_user_value: check(pointer), readability: check(pointer), template_fidelity: check(pointer), groundedness: check(pointer) } })),
    hard_gate_failures: [],
    repair_route: "none",
    review_path: resolve(root, "eval/artifact-quality-review.json"),
  });
}

test("one unified Daily run passes schema, provenance, receipt, and feature-slice gates", () => {
  const root = prepareRun();
  try {
    const validated = validateUnifiedDailyRun({ runRoot: root });
    assert.equal(validated.pass, true);
    assert.deepEqual(validated.feature_checks.map((row) => row.feature_id), ["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"]);
    assert.deepEqual(validated.feature_checks.map((row) => row.rows), [1, 1, 1, 3]);
    const suite = loadDailyReviewEvalSuite();
    for (const feature of suite.features) {
      const packet = buildFeatureJudgePacket({ featureId: feature.feature_id, result: validated.result, runRoot: root, suite });
      assert.equal(packet.feature_id, feature.feature_id);
      assert.ok(packet.candidate.length);
      assert.equal(packet.assertions.length, feature.assertions.length);
      assert.equal(packet.judge_policy.pass_tier, "A");
      assert.equal(packet.judge_policy.output_shape.verdict_path, resolve(root, `eval/judges/${feature.feature_id}.json`));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the exact manifest rejects undeclared intermediate files", () => {
  const root = prepareRun();
  try {
    writeJson(resolve(root, "daily/review/hidden-plan.json"), { unexpected: true });
    assert.throws(() => validateUnifiedDailyRun({ runRoot: root }), /unexpected=\[daily\/review\/hidden-plan\.json\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("four feature verdicts require a separate evidence review before acceptance", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    const reconciled = reconcileJudgedRun({ runRoot: root, deterministic, suite });
    assert.equal(reconciled.pass, true);
    assert.equal(reconciled.feature_verdicts.length, 4);
    assert.equal(reconciled.evidence_review, "pass");
    assert.deepEqual(reconciled.artifact_quality_review, { pass: true, tier: "A" });
    assert.equal(reconciled.integrations.pass, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("judged reconciliation rejects partial or non-A artifact quality review", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const reviewPath = resolve(root, "eval/artifact-quality-review.json");
    const review = JSON.parse(readFileSync(reviewPath, "utf8"));
    review.artifacts.pop();
    writeJson(reviewPath, review);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /must cover every target exactly once/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("judged reconciliation fails when an integration gate fails", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const integrations = integrationChecks();
    integrations.gates[1] = {
      gate_id: "read-back-matches-intent",
      pass: false,
      evidence_refs: [],
      failures: ["mock read-back did not match the intended comment"],
    };
    integrations.pass = false;
    integrations.failures = ["read-back gate failed"];
    writeJson(resolve(root, "eval/integrations.json"), integrations);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    const reconciled = reconcileJudgedRun({ runRoot: root, deterministic, suite });
    assert.equal(reconciled.pass, false);
    assert.equal(reconciled.integrations.pass, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("judged reconciliation rejects a missing integration artifact", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    rmSync(resolve(root, "eval/integrations.json"));
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /integration checks artifact is missing: eval\/integrations\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("feature verdict requires the exact manifest verdict_path", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const feature = suite.features[0];
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), featureVerdict(root, feature, { verdict_path: resolve(root, "eval/judges/wrong.json") }));
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /FEAT-0001 judge verdict_path must equal/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("feature verdict rejects a missing verdict_path", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const feature = suite.features[0];
    const verdict = featureVerdict(root, feature);
    delete verdict.verdict_path;
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), verdict);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /FEAT-0001 judge verdict is malformed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("feature output cannot cite a record absent from the collected context", () => {
  const root = prepareRun();
  try {
    const path = resolve(root, "daily/context/daily-context-diff-2026-08-25.json");
    const context = JSON.parse(readFileSync(path, "utf8"));
    context.work_items = context.work_items.filter((row) => row.id !== "TASK-101");
    writeJson(path, context);
    assert.throws(() => validateUnifiedDailyRun({ runRoot: root }), /output cites TASK-101, which is absent from the collected context/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

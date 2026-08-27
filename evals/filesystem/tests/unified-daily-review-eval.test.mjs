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
import { DailyReviewResultSchema } from "../../../schemas/automations/daily-review-result.zod.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const expectedContext = resolve(projectRoot, "evals/daily/expected/context.json");
const expectedResult = resolve(projectRoot, "evals/daily/expected/result.json");
const expectedReceipt = resolve(projectRoot, "evals/daily/expected/integration-receipt.json");
const expectedRerunReceipt = resolve(projectRoot, "evals/daily/expected/idempotency-receipt.json");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function prepareRun() {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-unified-daily-eval-"));
  const resultPath = resolve(root, "daily/review/daily-review-result-2026-08-25.json");
  const receiptPath = resolve(root, "daily/receipts/daily-integration-receipt-2026-08-25.json");
  const rerunPath = resolve(root, "daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json");
  const contextPath = resolve(root, "daily/context/daily-context-diff-2026-08-25.json");
  mkdirSync(dirname(resultPath), { recursive: true });
  mkdirSync(dirname(receiptPath), { recursive: true });
  cpSync(expectedResult, resultPath);
  cpSync(expectedReceipt, receiptPath);
  cpSync(expectedRerunReceipt, rerunPath);
  cpSync(expectedContext, contextPath);
  return root;
}

const integrationGateIds = [
  "effects-match-receipt",
  "read-back-matches-intent",
  "processing-safety",
  "idempotency",
];

function featureVerdict(root, feature, packetSha256, overrides = {}) {
  const evidenceRef = `${feature.entity_ids[0]} at ${feature.result_path}`;
  return {
    feature_id: feature.feature_id,
    tier: "A",
    verdict: "pass",
    rubric: {
      groundedness: "A",
      completeness: "A",
      usefulness: "A",
      repeatability: "A",
      length_balance: "A",
    },
    assertions: feature.assertions.map((assertion) => ({ assertion, met: true, evidence_refs: [evidenceRef] })),
    evidence_refs: [evidenceRef],
    failures: [],
    verdict_path: resolve(root, `eval/judges/${feature.feature_id}.json`),
    packet_sha256: packetSha256,
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
  const resultPath = resolve(root, "daily/review/daily-review-result-2026-08-25.json");
  writeJson(resolve(root, "eval/deterministic.json"), {
    pass: true,
    context_id: "daily-context-2026-08-25",
    daily_result_sha256: createHash("sha256").update(readFileSync(resultPath)).digest("hex"),
  });
  writeJson(resolve(root, "eval/integrations.json"), integrationChecks());
  writeJson(resolve(root, "eval/result.json"), {
    pass: true,
    deterministic: true,
    feature_verdicts: suite.features.map((feature) => ({ feature_id: feature.feature_id, pass: true, tier: "A" })),
    evidence_review: "pass",
    artifact_quality_review: { pass: true, tier: "A" },
    integrations: {
      pass: true,
      gates: integrationGateIds.map((gate_id) => ({ gate_id, pass: true })),
    },
  });
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  const context = JSON.parse(readFileSync(resolve(root, "daily/context/daily-context-diff-2026-08-25.json"), "utf8"));
  for (const feature of suite.features) {
    const packet = buildFeatureJudgePacket({ featureId: feature.feature_id, result, context, runRoot: root, suite });
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), featureVerdict(root, feature, packet.packet_sha256));
  }
  writeJson(resolve(root, "eval/evidence-review.json"), {
    independent: true,
    verdict: "pass",
    reviewed_feature_ids: suite.features.map((feature) => feature.feature_id),
  });
  const check = (pointer) => ({ pass: true, evidence_refs: [`daily/review/daily-review-result-2026-08-25.json#${pointer}`], findings: [] });
  const pointers = ["project_updates", "documentation_reviews", "weekly_progress_chases", "knowledge_updates"]
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
    artifacts: pointers.map((pointer) => ({ artifact_pointer: pointer, checks: { referential_clarity: check(pointer), end_user_value: check(pointer), readability: check(pointer), template_fidelity: check(pointer), groundedness: check(pointer), workflow_reconstructability: check(pointer), baseline_integrity: check(pointer) } })),
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
    assert.deepEqual(validated.feature_checks.map((row) => row.rows), [1, 6, 1, 2]);
    const suite = loadDailyReviewEvalSuite();
    for (const feature of suite.features) {
      const packet = buildFeatureJudgePacket({ featureId: feature.feature_id, result: validated.result, runRoot: root, suite });
      assert.equal(packet.feature_id, feature.feature_id);
      assert.ok(packet.candidate.length);
      assert.equal(packet.assertions.length, feature.assertions.length);
      assert.equal(packet.judge_policy.pass_tier, "A");
      assert.deepEqual(Object.keys(packet.judge_policy.output_shape.rubric), ["groundedness", "completeness", "usefulness", "repeatability", "length_balance"]);
      assert.equal(packet.judge_policy.output_shape.verdict_path, resolve(root, `eval/judges/${feature.feature_id}.json`));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Daily showcase rejects a chase without explicit eval-sink delivery proof", () => {
  const root = prepareRun();
  try {
    const receiptPath = resolve(root, "daily/receipts/daily-integration-receipt-2026-08-25.json");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    const chase = receipt.effects.find((effect) => effect.feature_id === "FEAT-0003");
    chase.outcome.state = "duplicate";
    delete chase.outcome.delivery_scope;
    delete chase.outcome.intended_recipient_person_id;
    delete chase.outcome.configured_destination_hash;
    delete chase.outcome.provider_destination_hash;
    delete chase.outcome.destination_matched;
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const rerunPath = resolve(root, "daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json");
    const rerun = JSON.parse(readFileSync(rerunPath, "utf8"));
    rerun.original_receipt_sha256 = createHash("sha256").update(readFileSync(receiptPath)).digest("hex");
    rerun.audit_effects.find((row) => row.original_effect_id === chase.effect_id).original_outcome = "duplicate";
    writeJson(rerunPath, rerun);
    assert.throws(() => validateUnifiedDailyRun({ runRoot: root }), /destination-bound eval-sink provider proof/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Daily workflow and problem entries preserve structured baselines and reject invented cost", () => {
  const result = JSON.parse(readFileSync(expectedResult, "utf8"));
  assert.equal(DailyReviewResultSchema.safeParse(result).success, true);

  const missingWorkflow = structuredClone(result);
  missingWorkflow.knowledge_updates[0].draft_entries.find((entry) => entry.kind === "sop").workflow_observation = null;
  assert.equal(DailyReviewResultSchema.safeParse(missingWorkflow).success, false);

  const inventedCost = structuredClone(result);
  const baseline = inventedCost.knowledge_updates[0].draft_entries.find((entry) => entry.kind === "problem").problem_baseline;
  baseline.direct_cost_per_week_myr = 147;
  baseline.direct_cost_formula = null;
  assert.equal(DailyReviewResultSchema.safeParse(inventedCost).success, false);

  const craftedCost = structuredClone(result);
  const craftedBaseline = craftedCost.knowledge_updates[0].draft_entries.find((entry) => entry.kind === "problem").problem_baseline;
  craftedBaseline.direct_cost_per_week_myr = 999;
  craftedBaseline.direct_cost_formula = "unsupported estimate";
  assert.equal(DailyReviewResultSchema.safeParse(craftedCost).success, false);

  const wrongArithmetic = structuredClone(result);
  const arithmeticBaseline = wrongArithmetic.knowledge_updates[0].draft_entries.find((entry) => entry.kind === "problem").problem_baseline;
  arithmeticBaseline.volume_per_week = 4;
  arithmeticBaseline.time_lost_minutes_per_occurrence = 30;
  arithmeticBaseline.loaded_hourly_cost_myr = 100;
  arithmeticBaseline.direct_cost_per_week_myr = 999;
  arithmeticBaseline.direct_cost_formula = "4 × 30 minutes ÷ 60 × MYR 100/hour";
  assert.equal(DailyReviewResultSchema.safeParse(wrongArithmetic).success, false);
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
    const suiteResult = JSON.parse(readFileSync(resolve(root, "eval/result.json"), "utf8"));
    suiteResult.pass = false;
    suiteResult.integrations = {
      pass: false,
      gates: integrations.gates.map(({ gate_id, pass }) => ({ gate_id, pass })),
    };
    writeJson(resolve(root, "eval/result.json"), suiteResult);
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

test("judged reconciliation rejects stale deterministic or suite-result summaries", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    writeJson(resolve(root, "eval/deterministic.json"), { pass: true, context_id: deterministic.context.context_id, daily_result_sha256: "stale" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /saved deterministic evidence does not match/);

    prepareJudgedRun(root, suite);
    writeJson(resolve(root, "eval/result.json"), { pass: true });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /saved suite result does not match/);
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
    const verdictPath = resolve(root, `eval/judges/${feature.feature_id}.json`);
    const verdict = JSON.parse(readFileSync(verdictPath, "utf8"));
    verdict.verdict_path = resolve(root, "eval/judges/wrong.json");
    writeJson(verdictPath, verdict);
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
    const verdict = JSON.parse(readFileSync(resolve(root, `eval/judges/${feature.feature_id}.json`), "utf8"));
    delete verdict.verdict_path;
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), verdict);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /FEAT-0001 judge verdict is malformed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("feature verdict rejects a missing five-grade rubric", () => {
  const root = prepareRun();
  try {
    const suite = loadDailyReviewEvalSuite();
    prepareJudgedRun(root, suite);
    const feature = suite.features[0];
    const verdict = JSON.parse(readFileSync(resolve(root, `eval/judges/${feature.feature_id}.json`), "utf8"));
    delete verdict.rubric;
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), verdict);
    const deterministic = validateUnifiedDailyRun({ runRoot: root, suite, stage: "judged" });
    assert.throws(() => reconcileJudgedRun({ runRoot: root, deterministic, suite }), /missing the required five-grade rubric/);
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
    const rerunPath = resolve(root, "daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json");
    const rerun = JSON.parse(readFileSync(rerunPath, "utf8"));
    rerun.source_context_sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
    writeJson(rerunPath, rerun);
    assert.throws(() => validateUnifiedDailyRun({ runRoot: root }), /output cites TASK-101, which is absent from the collected context/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

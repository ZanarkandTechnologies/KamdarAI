import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadKamdarSeedConfig } from "../scripts/kamdar-seed-config.mjs";
import {
  buildWeeklyFeatureJudgePacket,
  loadWeeklyReviewEvalSuite,
  reconcileJudgedWeeklyRun,
  validateUnifiedWeeklyRun,
} from "../scripts/unified-weekly-review-eval.mjs";
import { WeeklyReviewResultSchema } from "../../../automations/schemas/weekly-review-result.zod.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const suitePath = resolve(projectRoot, "evals/weekly-review-evals.json");
const automationPath = resolve(projectRoot, "automations/evaluate-weekly-review.md");
const goldenRoot = resolve(projectRoot, "automations/examples/golden");

function loadSuite() { return JSON.parse(readFileSync(suitePath, "utf8")); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function goldenRun() {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-weekly-eval-"));
  const mappings = [
    ["weekly-run-manifest-2026-W34.json", "weekly/run-manifest-2026-W34.json"],
    ["weekly-context-2026-W34.json", "weekly/context/weekly-context-2026-W34.json"],
    ["weekly-review-result-2026-W34.json", "weekly/review/weekly-review-result-2026-W34.json"],
    ["weekly-integration-receipt-2026-W34.json", "weekly/receipts/weekly-integration-receipt-2026-W34.json"],
    ["weekly-integration-read-back-2026-W34.json", "weekly/read-back/weekly-integration-read-back-2026-W34.json"],
  ];
  for (const [source, destination] of mappings) {
    const target = resolve(root, destination);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(goldenRoot, source), target);
  }
  return root;
}
function refreshManifest(root, relativePath) {
  const manifestPath = resolve(root, "weekly/run-manifest-2026-W34.json");
  const manifest = json(manifestPath);
  const bytes = readFileSync(resolve(root, relativePath));
  const row = manifest.immutable_inputs.find((item) => item.path === relativePath);
  row.bytes = bytes.length;
  row.sha256 = sha256(bytes);
  writeJson(manifestPath, manifest);
}
function addJudgedEvidence(root, deterministic) {
  const suite = loadWeeklyReviewEvalSuite();
  const resultBytes = readFileSync(resolve(root, "weekly/review/weekly-review-result-2026-W34.json"));
  mkdirSync(resolve(root, "eval/judges"), { recursive: true });
  writeJson(resolve(root, "eval/deterministic.json"), {
    pass: true,
    context_id: deterministic.context.context_id,
    weekly_result_sha256: sha256(resultBytes),
    checks: ["manifest", "inventory", "zod", "source-closure", "mock-integrations"],
  });
  for (const feature of suite.features) writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), {
    lane: "tester",
    target: feature.feature_id,
    claim_under_test: feature.claim,
    tier: "A",
    test_cases: [`${feature.feature_id}-golden-W34`],
    assertions: feature.assertions.map((assertion, index) => ({ assertion, met: true, evidence: [`${feature.result_path}#assertion-${index + 1}`] })),
    evidence: [`weekly/review/weekly-review-result-2026-W34.json:${feature.result_path}`],
    failures: [],
    artifacts: ["weekly/run-manifest-2026-W34.json", "weekly/review/weekly-review-result-2026-W34.json"],
    blockers: [],
    verdict_path: resolve(root, `eval/judges/${feature.feature_id}.json`),
  });
  writeJson(resolve(root, "eval/evidence-review.json"), {
    lane: "evidence-review",
    independent: true,
    verdict: "pass",
    claim_under_test: "Every Weekly feature tier is supported by the immutable run evidence and complete authored assertions.",
    reviewed_tiers: { "FEAT-0005": "A", "FEAT-0006": "A", "FEAT-0007": "A" },
    unsupported_claims: [],
    scope_mismatch: [],
    missing_evidence: [],
    weak_artifacts: [],
    rerun_instructions: [],
    fix_candidates: [],
  });
  writeJson(resolve(root, "eval/integrations.json"), {
    pass: true,
    receipt_sha256: deterministic.integrations.receipt_sha256,
    read_back_sha256: deterministic.integrations.read_back_sha256,
    effects: deterministic.integrations.effects,
    read_backs: deterministic.integrations.read_backs,
  });
  const result = json(resolve(root, "weekly/review/weekly-review-result-2026-W34.json"));
  const check = (pointer) => ({ pass: true, evidence_refs: [`weekly/review/weekly-review-result-2026-W34.json#${pointer}`], findings: [] });
  const pointers = ["report_results", "promotion_dispositions", "next_week_project_replacements", "configuration_gaps"]
    .flatMap((key) => result[key].map((_, index) => `/${key}/${index}`));
  writeJson(resolve(root, "eval/artifact-quality-review.json"), {
    schema_version: "kamdar-artifact-quality-review@1.0.0",
    lane: "artifact-quality-review",
    independent: true,
    scope: "weekly",
    context_id: result.context_id,
    result_sha256: sha256(resultBytes),
    rubric_path: "evals/rubrics/end-user-artifact-quality.md",
    tier: "A",
    verdict: "pass",
    artifacts: pointers.map((pointer) => ({ artifact_pointer: pointer, checks: { referential_clarity: check(pointer), end_user_value: check(pointer), readability: check(pointer), template_fidelity: check(pointer), groundedness: check(pointer) } })),
    hard_gate_failures: [],
    repair_route: "none",
    review_path: resolve(root, "eval/artifact-quality-review.json"),
  });
  writeJson(resolve(root, "eval/result.json"), {
    pass: true,
    deterministic: true,
    integrations: true,
    evidence_review: "pass",
    artifact_quality_review: { pass: true, tier: "A" },
    feature_tiers: { "FEAT-0005": "A", "FEAT-0006": "A", "FEAT-0007": "A" },
  });
}

test("Weekly acceptance owns FEAT-0005 through FEAT-0007 from one immutable run", () => {
  const suite = loadSuite();
  assert.equal(suite.schema_version, "kamdar-weekly-review-evals@1.0.0");
  assert.deepEqual(suite.features.map((feature) => feature.feature_id), ["FEAT-0005", "FEAT-0006", "FEAT-0007"]);
  assert.deepEqual(suite.cases.flatMap((row) => row.feature_ids).sort(), ["FEAT-0005", "FEAT-0006", "FEAT-0007"]);
  for (const feature of suite.features) {
    assert.ok(feature.result_path);
    assert.ok(feature.entity_ids.length);
    assert.ok(feature.assertions.length >= 3);
    assert.ok(feature.falsifier);
  }
});

test("Weekly feature evidence resolves to the reviewed seed", () => {
  const suite = loadSuite();
  const seed = loadKamdarSeedConfig();
  const ids = new Set(["projects", "people", "work_items", "meetings", "reports"]
    .flatMap((group) => seed.entities[group].map((entity) => entity.id)));
  for (const feature of suite.features) for (const id of feature.entity_ids) assert.ok(ids.has(id), `${feature.feature_id}:${id}`);
  for (const evaluationCase of suite.cases) for (const id of evaluationCase.entity_ids) assert.ok(ids.has(id), `${evaluationCase.id}:${id}`);
});

test("FEAT-0006 judges Draft-backed candidates without treating raw Work as runtime input", () => {
  const suite = loadSuite();
  const feature = suite.features.find((item) => item.feature_id === "FEAT-0006");
  const evaluationCase = suite.cases.find((item) => item.feature_ids.includes("FEAT-0006"));
  const reportIds = [
    "RPT-PROJ-CMT-CMT_PIPELINE-W34",
    "RPT-PROJ-MKT-DEEPAVALI_MARKETING-W34",
    "RPT-PROJ-ECOM-ECOM_FIXES-W34",
  ];
  const candidateSourceIds = ["TASK-101", "TASK-110", "TASK-201", "TASK-203", "TASK-102"];

  assert.equal(suite.artifact_policy.seed_is_judge_reference_not_runtime_input, true);
  assert.deepEqual(feature.entity_ids, [...candidateSourceIds, ...reportIds]);
  assert.deepEqual(evaluationCase.entity_ids, [...candidateSourceIds, ...reportIds]);
  assert.match(feature.claim, /Project Drafts/);
  assert.match(feature.claim, /never rescans raw Work or Meetings/);
  assert.match(evaluationCase.prompt, /Project reports/);
});

test("Weekly eval uses separate tester and evidence-review subagents and mocked integrations", () => {
  const automation = readFileSync(automationPath, "utf8");
  assert.match(automation, /Spawn three native read-only tester subagents/);
  assert.match(automation, /separate native read-only\s+evidence reviewer/);
  assert.match(automation, /tester lane cannot\s+self-approve proof/i);
  assert.match(automation, /All\s+integration behavior is mocked/i);
  assert.match(automation, /receipt link alone is not proof/i);
});

test("Weekly Zod contract blocks false Company finalization", () => {
  const base = {
    schema_version: "kamdar-weekly-review-result@1.0.0",
    context_id: "weekly-context-2026-W34",
    week: "2026-W34",
    report_results: [{
      report_id: "RPT-COMPANY-W34",
      report_level: "Company",
      project_id: null,
      area: null,
      previous_report_id: null,
      source_report_ids: ["RPT-AREA-CMT-W34"],
      prior_version: null,
      report_version: 1,
      report_status: "Blocked",
      finalized_at: null,
      report_markdown: "## Summary\n\nCompany rollup awaits the missing Content Area report.",
      configuration_gaps: ["Content Area report missing"],
    }],
    promotion_dispositions: [],
    next_week_project_replacements: [],
    configuration_gaps: [{ code: "missing-area-report", scope_id: "AREA-CONTENT", detail: "Content Area report is absent.", blocks_company_finalization: true }],
    run_notes: "",
  };
  assert.equal(WeeklyReviewResultSchema.safeParse(base).success, true);
  base.report_results[0].report_status = "Final";
  base.report_results[0].finalized_at = "2026-08-25T17:00:00+08:00";
  assert.equal(WeeklyReviewResultSchema.safeParse(base).success, false);
});

test("promoted knowledge renders the complete destination template", () => {
  const result = json(resolve(goldenRoot, "weekly-review-result-2026-W34.json"));
  const promoted = Object.fromEntries(result.promotion_dispositions
    .filter((row) => row.disposition === "promoted")
    .map((row) => [row.kind, row.rendered_markdown]));
  const required = {
    problem: ["template_id: kamdar-issue", "## Problem and impact", "## Evidence and reproduction", "## Diagnosis", "## Containment and next action", "## Resolution and verification", "## Related records"],
    decision: ["template_id: company-os-decision", "## Context", "## Options and tradeoffs", "## Decision rationale", "## Consequences and review trigger", "## Evidence and related records"],
    sop: ["template_id: company-os-skill", "## Capability", "## Proven use", "## Boundaries and dependencies", "## Source and proof"],
  };
  for (const [kind, markers] of Object.entries(required)) {
    assert.ok(promoted[kind], `${kind} promotion is missing`);
    for (const marker of markers) assert.match(promoted[kind], new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("golden Weekly run passes manifest, inventory, Zod, provenance, and mock integration checks", () => {
  const proof = validateUnifiedWeeklyRun({ runRoot: goldenRun() });
  assert.equal(proof.pass, true);
  assert.equal(proof.immutable_inputs.length, 4);
  assert.deepEqual(proof.feature_checks.map((row) => row.rows), [7, 5, 1]);
  assert.deepEqual({ effects: proof.integrations.effects, read_backs: proof.integrations.read_backs }, { effects: 13, read_backs: 11 });
  assert.equal("work_items" in proof.context, false);
  assert.equal("meetings" in proof.context, false);
});

test("feature judge packets use Draft-backed result slices and named seed evidence", () => {
  const proof = validateUnifiedWeeklyRun({ runRoot: goldenRun() });
  const packets = ["FEAT-0005", "FEAT-0006", "FEAT-0007"].map((featureId) => buildWeeklyFeatureJudgePacket({ featureId, result: proof.result }));
  assert.deepEqual(packets.map((packet) => packet.candidate.length), [7, 5, 1]);
  assert.ok(packets.every((packet) => packet.seed_evidence.every(Boolean)));
  assert.match(packets[1].claim, /never rescans raw Work or Meetings/);
});

test("judged Weekly run requires three tier-A testers, a separate reviewer, and matching integration checks", () => {
  const root = goldenRun();
  const base = validateUnifiedWeeklyRun({ runRoot: root });
  addJudgedEvidence(root, base);
  const deterministic = validateUnifiedWeeklyRun({ runRoot: root, stage: "judged" });
  assert.deepEqual(reconcileJudgedWeeklyRun({ runRoot: root, deterministic }), {
    pass: true,
    deterministic: true,
    integrations: true,
    evidence_review: "pass",
    artifact_quality_review: { pass: true, tier: "A" },
    feature_tiers: { "FEAT-0005": "A", "FEAT-0006": "A", "FEAT-0007": "A" },
  });
});

test("judged Weekly runner rejects a stale artifact quality review", () => {
  const root = goldenRun();
  const base = validateUnifiedWeeklyRun({ runRoot: root });
  addJudgedEvidence(root, base);
  const qualityPath = resolve(root, "eval/artifact-quality-review.json");
  const quality = json(qualityPath);
  quality.result_sha256 = "0".repeat(64);
  writeJson(qualityPath, quality);
  const deterministic = validateUnifiedWeeklyRun({ runRoot: root, stage: "judged" });
  assert.throws(() => reconcileJudgedWeeklyRun({ runRoot: root, deterministic }), /not bound to the exact result and context/);
});

test("Weekly runner rejects changed immutable bytes and undeclared intermediates", () => {
  const changed = goldenRun();
  const contextPath = resolve(changed, "weekly/context/weekly-context-2026-W34.json");
  const context = json(contextPath);
  context.source_gaps.push("tampered");
  writeJson(contextPath, context);
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: changed }), /manifest hash or byte count/);

  const extra = goldenRun();
  writeFileSync(resolve(extra, "weekly/debug.json"), "{}\n");
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: extra }), /unexpected=\[weekly\/debug\.json\]/);
});

test("Weekly runner rejects raw Work runtime input and missing Draft provenance even with refreshed hashes", () => {
  const rawWork = goldenRun();
  const contextPath = resolve(rawWork, "weekly/context/weekly-context-2026-W34.json");
  const context = json(contextPath);
  context.work_items = [{ id: "TASK-101", body: "raw Work must not be loaded Weekly" }];
  writeJson(contextPath, context);
  refreshManifest(rawWork, "weekly/context/weekly-context-2026-W34.json");
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: rawWork }), /must not contain raw Work or Meeting/);

  const missing = goldenRun();
  const missingPath = resolve(missing, "weekly/context/weekly-context-2026-W34.json");
  const missingContext = json(missingPath);
  missingContext.draft_candidate_refs[0].source_ids = missingContext.draft_candidate_refs[0].source_ids.filter((id) => id !== "TASK-110");
  missingContext.reports.find((row) => row.id === "RPT-PROJ-CMT-CMT_PIPELINE-W34").source_ids = ["TASK-101", "TASK-104", "TASK-105"];
  writeJson(missingPath, missingContext);
  refreshManifest(missing, "weekly/context/weekly-context-2026-W34.json");
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: missing }), /promotion candidate cites TASK-110/);
});

test("Weekly runner rejects forged payload hashes and receipt-only applied claims", () => {
  const forged = goldenRun();
  const receiptPath = resolve(forged, "weekly/receipts/weekly-integration-receipt-2026-W34.json");
  const receipt = json(receiptPath);
  receipt.effects[0].payload_sha256 = "0".repeat(64);
  writeJson(receiptPath, receipt);
  refreshManifest(forged, "weekly/receipts/weekly-integration-receipt-2026-W34.json");
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: forged }), /does not match exact result payload/);

  const receiptOnly = goldenRun();
  const readBackPath = resolve(receiptOnly, "weekly/read-back/weekly-integration-read-back-2026-W34.json");
  const readBack = json(readBackPath);
  readBack.observations = readBack.observations.filter((row) => row.result_pointer !== "/next_week_project_replacements/0");
  writeJson(readBackPath, readBack);
  refreshManifest(receiptOnly, "weekly/read-back/weekly-integration-read-back-2026-W34.json");
  assert.throws(() => validateUnifiedWeeklyRun({ runRoot: receiptOnly }), /lacks exact read-back/);
});

test("judged Weekly runner rejects tester self-approval and mismatched saved reconciliation", () => {
  const root = goldenRun();
  const base = validateUnifiedWeeklyRun({ runRoot: root });
  addJudgedEvidence(root, base);
  const reviewPath = resolve(root, "eval/evidence-review.json");
  const review = json(reviewPath);
  review.independent = false;
  writeJson(reviewPath, review);
  const deterministic = validateUnifiedWeeklyRun({ runRoot: root, stage: "judged" });
  assert.throws(() => reconcileJudgedWeeklyRun({ runRoot: root, deterministic }), /independent evidence review is malformed/);
});

test("judged Weekly runner rejects missing or wrong tester verdict_path", () => {
  const missing = goldenRun();
  const missingBase = validateUnifiedWeeklyRun({ runRoot: missing });
  addJudgedEvidence(missing, missingBase);
  const missingVerdictPath = resolve(missing, "eval/judges/FEAT-0005.json");
  const missingVerdict = json(missingVerdictPath);
  delete missingVerdict.verdict_path;
  writeJson(missingVerdictPath, missingVerdict);
  const missingDeterministic = validateUnifiedWeeklyRun({ runRoot: missing, stage: "judged" });
  assert.throws(() => reconcileJudgedWeeklyRun({ runRoot: missing, deterministic: missingDeterministic }), /exact absolute manifest verdict path/);

  const wrong = goldenRun();
  const wrongBase = validateUnifiedWeeklyRun({ runRoot: wrong });
  addJudgedEvidence(wrong, wrongBase);
  const wrongVerdictPath = resolve(wrong, "eval/judges/FEAT-0006.json");
  const wrongVerdict = json(wrongVerdictPath);
  wrongVerdict.verdict_path = resolve(wrong, "eval/judges/FEAT-0005.json");
  writeJson(wrongVerdictPath, wrongVerdict);
  const wrongDeterministic = validateUnifiedWeeklyRun({ runRoot: wrong, stage: "judged" });
  assert.throws(() => reconcileJudgedWeeklyRun({ runRoot: wrong, deterministic: wrongDeterministic }), /exact absolute manifest verdict path/);
});

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
import { ArtifactQualityReviewSchema } from "../../../automations/schemas/artifact-quality-review.zod.mjs";

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
  for (const feature of suite.features) {
    const packet = buildWeeklyFeatureJudgePacket({ featureId: feature.feature_id, result: deterministic.result, context: deterministic.context, runRoot: root, suite });
    writeJson(resolve(root, `eval/judges/${feature.feature_id}.json`), {
    lane: "tester",
    target: feature.feature_id,
    claim_under_test: feature.claim,
    tier: "A",
    rubric: {
      groundedness: "A",
      completeness: "A",
      usefulness: "A",
      repeatability: "A",
      length_balance: "A",
    },
    test_cases: [`${feature.feature_id}-golden-W34`],
    assertions: feature.assertions.map((assertion, index) => ({ assertion, met: true, evidence: [`${feature.result_path}#assertion-${index + 1}`] })),
    evidence: [`weekly/review/weekly-review-result-2026-W34.json:${feature.result_path}`],
    failures: [],
    artifacts: ["weekly/run-manifest-2026-W34.json", "weekly/review/weekly-review-result-2026-W34.json"],
    blockers: [],
    verdict_path: resolve(root, `eval/judges/${feature.feature_id}.json`),
    packet_sha256: packet.packet_sha256,
    });
  }
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
    artifacts: pointers.map((pointer) => ({ artifact_pointer: pointer, checks: { referential_clarity: check(pointer), end_user_value: check(pointer), readability: check(pointer), template_fidelity: check(pointer), groundedness: check(pointer), workflow_reconstructability: check(pointer), baseline_integrity: check(pointer) } })),
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
  assert.equal(suite.schema_version, "kamdar-weekly-review-evals@2.0.0");
  assert.deepEqual(suite.features.map((feature) => feature.feature_id), ["FEAT-0005", "FEAT-0006", "FEAT-0007"]);
  assert.deepEqual(suite.evals.flatMap((row) => row.metadata.extensions.kamdar.feature_ids).sort(), ["FEAT-0005", "FEAT-0006", "FEAT-0007"]);
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
  for (const evaluationCase of suite.evals) for (const id of evaluationCase.metadata.extensions.kamdar.entity_ids) assert.ok(ids.has(id), `${evaluationCase.id}:${id}`);
});

test("FEAT-0006 judges Draft-backed candidates without treating raw Work as runtime input", () => {
  const suite = loadSuite();
  const feature = suite.features.find((item) => item.feature_id === "FEAT-0006");
  const evaluationCase = suite.evals.find((item) => item.metadata.extensions.kamdar.feature_ids.includes("FEAT-0006"));
  const reportIds = [
    "RPT-PROJ-CMT-CMT_PIPELINE-W34",
    "RPT-PROJ-MKT-DEEPAVALI_MARKETING-W34",
    "RPT-PROJ-ECOM-ECOM_FIXES-W34",
  ];
  const candidateSourceIds = ["TASK-101", "TASK-110", "TASK-201", "TASK-203", "TASK-102"];

  assert.equal(suite.artifact_policy.seed_is_judge_reference_not_runtime_input, true);
  assert.deepEqual(feature.entity_ids, [...candidateSourceIds, ...reportIds]);
  assert.deepEqual(evaluationCase.metadata.extensions.kamdar.entity_ids, [...candidateSourceIds, ...reportIds]);
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
      report_markdown: "## Summary\n\nCompany rollup awaits the missing Content Area report.\n\n## Problems and inefficiencies\n\nMissing Content report blocks the Company view\n\nLeadership cannot inspect the complete company week.\n\nOne expected Area report is absent; confidence is high.\n\nCreate the missing report and verify the Company source chain.\n\n## Decisions\n\nKeep the Company report blocked\n\nFinalizing would hide missing evidence.\n\nThe Weekly reviewer holds finalization now.\n\nFinalize only after every expected Area report exists.\n\n## SOPs\n\nDo not promote a workflow from incomplete evidence\n\nRetain candidates in the report until evidence is complete.\n\nThe Weekly reviewer owns this control.",
      company_executive_context: {
        problems: [{ title: "Missing Content report blocks the Company view", context_and_operating_impact: "Leadership cannot inspect the complete company week.", measurement_and_confidence: "One expected Area report is absent; confidence is high.", intervention_and_test: "Create the missing report and verify the Company source chain.", evidence_ids: ["RPT-AREA-CMT-W34"] }],
        decisions: [{ title: "Keep the Company report blocked", context_rationale_and_tradeoff: "Finalizing would hide missing evidence.", authority_and_timing: "The Weekly reviewer holds finalization now.", consequence_and_review_trigger: "Finalize only after every expected Area report exists.", evidence_ids: ["RPT-AREA-CMT-W34"] }],
        sops: [{ title: "Do not promote a workflow from incomplete evidence", workflow_and_output: "Retain candidates in the report until evidence is complete.", proof_scope_and_owner: "The Weekly reviewer owns this control.", disposition: "deferred", destination_id: null, evidence_ids: ["RPT-AREA-CMT-W34"] }],
      },
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
    problem: ["template_id: kamdar-issue", "## Problem and impact", "## Before baseline and economics", "## Evidence and reproduction", "## Diagnosis", "## Containment and next action", "## Intervention and measurement plan", "## Resolution and verification", "## After measurement and verified value", "## Related records"],
    decision: ["template_id: company-os-decision", "## Context", "## Options and tradeoffs", "## Decision rationale", "## Consequences and review trigger", "## Evidence and related records"],
    sop: ["template_id: kamdar-employee-sop", "## Purpose and outcome", "## Trigger, actors, and inputs", "## Current workflow", "## Timing and volume baseline", "## Exceptions and controls", "## Improvement and verification", "## Evidence and related records"],
  };
  for (const [kind, markers] of Object.entries(required)) {
    assert.ok(promoted[kind], `${kind} promotion is missing`);
    for (const marker of markers) assert.match(promoted[kind], new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Weekly promotion rejects software skill cards for employee workflows", () => {
  const result = json(resolve(goldenRoot, "weekly-review-result-2026-W34.json"));
  const invalid = structuredClone(result);
  const workflow = invalid.promotion_dispositions.find((row) => row.kind === "sop" && row.disposition === "promoted");
  workflow.rendered_markdown = workflow.rendered_markdown.replace("template_id: kamdar-employee-sop", "template_id: company-os-skill");
  assert.equal(WeeklyReviewResultSchema.safeParse(invalid).success, false);
});

test("Weekly promotion rejects missing or placeholder problem baselines", () => {
  const result = json(resolve(goldenRoot, "weekly-review-result-2026-W34.json"));
  const missingProof = structuredClone(result);
  missingProof.promotion_dispositions[0].problem_baseline_proof = null;
  assert.equal(WeeklyReviewResultSchema.safeParse(missingProof).success, false);

  const emptyProof = structuredClone(result);
  emptyProof.promotion_dispositions[0].problem_baseline_proof.measured_metrics = [];
  emptyProof.promotion_dispositions[0].problem_baseline_proof.measurement_gaps = [];
  assert.equal(WeeklyReviewResultSchema.safeParse(emptyProof).success, false);

  const placeholder = structuredClone(result);
  placeholder.promotion_dispositions[0].rendered_markdown = placeholder.promotion_dispositions[0].rendered_markdown.replace(
    /## Before baseline and economics[\s\S]*?## Evidence and reproduction/,
    "## Before baseline and economics\n\nNo baseline.\n\n## Evidence and reproduction",
  );
  assert.equal(WeeklyReviewResultSchema.safeParse(placeholder).success, false);
});

test("Weekly promotion preserves only reusable or material Decisions with advise-style options", () => {
  const result = json(resolve(goldenRoot, "weekly-review-result-2026-W34.json"));
  const decision = result.promotion_dispositions.find((row) => row.kind === "decision" && row.disposition === "promoted");
  assert.ok(decision.decision_preservation_proof);
  assert.ok(decision.decision_preservation_proof.options_considered.length >= 2);

  const missingProof = structuredClone(result);
  missingProof.promotion_dispositions.find((row) => row.kind === "decision" && row.disposition === "promoted").decision_preservation_proof = null;
  assert.equal(WeeklyReviewResultSchema.safeParse(missingProof).success, false);

  const fakeSelection = structuredClone(result);
  fakeSelection.promotion_dispositions.find((row) => row.kind === "decision" && row.disposition === "promoted").decision_preservation_proof.selected_option = "An option that was never considered";
  assert.equal(WeeklyReviewResultSchema.safeParse(fakeSelection).success, false);

  const missingOption = structuredClone(result);
  const row = missingOption.promotion_dispositions.find((item) => item.kind === "decision" && item.disposition === "promoted");
  row.rendered_markdown = row.rendered_markdown.replace(row.decision_preservation_proof.options_considered[1].option, "Unlabelled alternative");
  assert.equal(WeeklyReviewResultSchema.safeParse(missingOption).success, false);
});

test("Company reports require structured executive context rendered into the report", () => {
  const result = json(resolve(goldenRoot, "weekly-review-result-2026-W34.json"));
  const company = result.report_results.find((row) => row.report_level === "Company");
  assert.ok(company.company_executive_context.problems.length);
  assert.ok(company.company_executive_context.decisions.length);
  assert.ok(company.company_executive_context.sops.length);

  const missing = structuredClone(result);
  missing.report_results.find((row) => row.report_level === "Company").company_executive_context = null;
  assert.equal(WeeklyReviewResultSchema.safeParse(missing).success, false);

  const omitted = structuredClone(result);
  const omittedCompany = omitted.report_results.find((row) => row.report_level === "Company");
  omittedCompany.report_markdown = omittedCompany.report_markdown.replace(omittedCompany.company_executive_context.decisions[0].title, "Context-free directive");
  assert.equal(WeeklyReviewResultSchema.safeParse(omitted).success, false);

  const surfaceOnly = structuredClone(result);
  const surfaceCompany = surfaceOnly.report_results.find((row) => row.report_level === "Company");
  surfaceCompany.report_markdown = surfaceCompany.report_markdown.replace(surfaceCompany.company_executive_context.problems[0].measurement_and_confidence, "Impact exists.");
  assert.equal(WeeklyReviewResultSchema.safeParse(surfaceOnly).success, false);
});

test("artifact quality review requires workflow reconstruction and baseline integrity", () => {
  const pointer = "/report_results/0";
  const check = { pass: true, evidence_refs: [`result.json#${pointer}`], findings: [] };
  const review = {
    schema_version: "kamdar-artifact-quality-review@1.0.0", lane: "artifact-quality-review", independent: true,
    scope: "weekly", context_id: "weekly-context-2026-W34", result_sha256: "a".repeat(64), rubric_path: "evals/rubrics/end-user-artifact-quality.md",
    tier: "A", verdict: "pass", artifacts: [{ artifact_pointer: pointer, checks: { referential_clarity: check, end_user_value: check, readability: check, template_fidelity: check, groundedness: check, workflow_reconstructability: check, baseline_integrity: check } }],
    hard_gate_failures: [], repair_route: "none", review_path: "/tmp/review.json",
  };
  assert.equal(ArtifactQualityReviewSchema.safeParse(review).success, true);
  delete review.artifacts[0].checks.workflow_reconstructability;
  assert.equal(ArtifactQualityReviewSchema.safeParse(review).success, false);
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

test("feature judge packets use exact frozen Draft-backed evidence", () => {
  const root = goldenRun();
  const rerunProof = validateUnifiedWeeklyRun({ runRoot: root });
  const packets = ["FEAT-0005", "FEAT-0006", "FEAT-0007"].map((featureId) => buildWeeklyFeatureJudgePacket({ featureId, result: rerunProof.result, context: rerunProof.context, runRoot: root }));
  assert.deepEqual(packets.map((packet) => packet.candidate.length), [7, 5, 1]);
  assert.ok(packets.every((packet) => packet.seed_controls.every(Boolean)));
  assert.ok(packets.every((packet) => packet.frozen_context_evidence.reports.length > 0));
  assert.ok(packets.every((packet) => !Object.hasOwn(packet, "seed_evidence")));
  assert.ok(packets.every((packet) => /^[a-f0-9]{64}$/.test(packet.packet_sha256)));
  assert.ok(packets.every((packet) => Object.keys(packet.judge_policy.output_shape.rubric).length === 5));
  assert.equal("runtime_evidence" in packets[0], false);
  assert.equal("runtime_evidence" in packets[1], false);
  assert.deepEqual(packets[2].runtime_evidence.replacement_counts, { candidates: 1, receipt_effects: 1, read_back_observations: 1 });
  assert.deepEqual(packets[2].runtime_evidence.work_target_boundary, { target_ids: ["TASK-101", "TASK-104", "TASK-110"], matching_effects: [] });
  assert.equal(packets[2].runtime_evidence.replacement_read_back.matched, true);
  assert.equal(packets[2].runtime_evidence.rerun.duplicate_effects_created, 0);
  assert.match(packets[2].judge_policy.evidence_rule, /bound runtime_evidence/);
  assert.match(packets[1].claim, /never rescans raw Work or Meetings/);
});

test("FEAT-0007 packet rejects missing, stale, or extra runtime evidence", () => {
  const baseRoot = goldenRun();
  const base = validateUnifiedWeeklyRun({ runRoot: baseRoot });
  const suite = loadWeeklyReviewEvalSuite();
  const build = (root) => buildWeeklyFeatureJudgePacket({ featureId: "FEAT-0007", result: base.result, context: base.context, runRoot: root, suite });

  const missing = goldenRun();
  const missingReceiptPath = resolve(missing, "weekly/receipts/weekly-integration-receipt-2026-W34.json");
  const missingReceipt = json(missingReceiptPath);
  missingReceipt.effects = missingReceipt.effects.filter((row) => row.feature_id !== "FEAT-0007");
  writeJson(missingReceiptPath, missingReceipt);
  assert.throws(() => build(missing), /exactly one matching receipt effect/);

  const stale = goldenRun();
  const staleReadBackPath = resolve(stale, "weekly/read-back/weekly-integration-read-back-2026-W34.json");
  const staleReadBack = json(staleReadBackPath);
  staleReadBack.observations.find((row) => row.feature_id === "FEAT-0007").observed_sha256 = "0".repeat(64);
  writeJson(staleReadBackPath, staleReadBack);
  assert.throws(() => build(stale), /read-back is stale/);

  const extra = goldenRun();
  const extraReceiptPath = resolve(extra, "weekly/receipts/weekly-integration-receipt-2026-W34.json");
  const extraReceipt = json(extraReceiptPath);
  extraReceipt.effects.push({
    ...structuredClone(extraReceipt.effects.find((row) => row.feature_id === "FEAT-0007")),
    feature_id: "FEAT-0006",
    result_pointer: "/promotion_dispositions/0",
    target_id: "TASK-101",
  });
  writeJson(extraReceiptPath, extraReceipt);
  assert.throws(() => build(extra), /forbidden Work-targeting effects: TASK-101/);
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

test("judged Weekly runner rejects a missing five-grade rubric", () => {
  const root = goldenRun();
  const base = validateUnifiedWeeklyRun({ runRoot: root });
  addJudgedEvidence(root, base);
  const verdictPath = resolve(root, "eval/judges/FEAT-0005.json");
  const verdict = json(verdictPath);
  delete verdict.rubric;
  writeJson(verdictPath, verdict);
  const deterministic = validateUnifiedWeeklyRun({ runRoot: root, stage: "judged" });
  assert.throws(() => reconcileJudgedWeeklyRun({ runRoot: root, deterministic }), /missing the required five-grade rubric/);
});

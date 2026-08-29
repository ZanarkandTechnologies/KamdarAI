import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  compareFeatureOutcome,
  evaluateFeatureOutcomeSuite,
} from "../scripts/feature-outcome-eval.mjs";
import { FEATURE_OUTCOME_LABELS } from "../../../schemas/automations/feature-outcome.zod.mjs";

const suite = JSON.parse(readFileSync(fileURLToPath(new URL("../../feature-outcomes/suite.json", import.meta.url)), "utf8"));

test("insufficient information has the intended nontechnical label", () => {
  assert.equal(FEATURE_OUTCOME_LABELS.insufficient_information, "I don't know — not enough information");
});

test("feature outcome suite covers produced, no-change, and insufficient-information", () => {
  const report = evaluateFeatureOutcomeSuite(suite);
  assert.equal(report.pass, true);
  assert.deepEqual(report.summary, { total: 3, passed: 3, failed: 0 });
  assert.deepEqual(
    report.cases.map((item) => item.generated_response.outcome),
    ["produced", "no_change_needed", "insufficient_information"],
  );
  for (const evaluationCase of report.cases) {
    assert.ok(evaluationCase.generated_response);
    assert.ok(evaluationCase.expected_response);
    assert.ok(evaluationCase.reference_points.length > 0);
  }
});

test("no-change requires checked evidence and cannot emit an output", () => {
  const evaluationCase = structuredClone(suite.cases[1]);
  evaluationCase.generated_response.evidence = [];
  evaluationCase.generated_response.output_refs = ["/next_week_project_replacements/0"];
  const report = compareFeatureOutcome(evaluationCase);
  assert.equal(report.pass, false);
  assert.equal(report.checks.generated_response_matches_schema, false);
  assert.ok(report.schema_errors.length > 0);
});

test("insufficient information must remain distinct from no change", () => {
  const evaluationCase = structuredClone(suite.cases[2]);
  evaluationCase.generated_response.outcome = "no_change_needed";
  evaluationCase.generated_response.information_gaps = [];
  const report = compareFeatureOutcome(evaluationCase);
  assert.equal(report.pass, false);
  assert.equal(report.checks.outcome_matches, false);
});

test("produced requires at least one output reference", () => {
  const evaluationCase = structuredClone(suite.cases[0]);
  evaluationCase.generated_response.output_refs = [];
  const report = compareFeatureOutcome(evaluationCase);
  assert.equal(report.pass, false);
  assert.equal(report.checks.generated_response_matches_schema, false);
});

test("comparison rejects the wrong feature or ungrounded reasoning", () => {
  const wrongFeature = structuredClone(suite.cases[0]);
  wrongFeature.generated_response.feature_id = "FEAT-0002";
  assert.equal(compareFeatureOutcome(wrongFeature).checks.feature_id_matches, false);

  const vagueReasoning = structuredClone(suite.cases[0]);
  vagueReasoning.generated_response.reasoning_summary = "Something useful happened.";
  assert.equal(compareFeatureOutcome(vagueReasoning).checks.reasoning_matches_reference, false);
});

test("comparison rejects fabricated evidence and downstream write claims", () => {
  const fabricatedEvidence = structuredClone(suite.cases[0]);
  fabricatedEvidence.generated_response.evidence[0].observation = "An unrelated record exists.";
  assert.equal(compareFeatureOutcome(fabricatedEvidence).checks.evidence_observations_match, false);

  const writeClaim = structuredClone(suite.cases[0]);
  writeClaim.generated_response.reasoning_summary = "The approval supports an update and the Notion page was updated.";
  assert.equal(compareFeatureOutcome(writeClaim).checks.no_downstream_write_claims, false);

  const readOnlyClaim = structuredClone(suite.cases[0]);
  readOnlyClaim.generated_response.reasoning_summary = "The source record was checked; its approval supports this update candidate.";
  assert.equal(compareFeatureOutcome(readOnlyClaim).checks.no_downstream_write_claims, true);
});

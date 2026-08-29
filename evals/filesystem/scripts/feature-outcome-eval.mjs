import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { FeatureOutcomeSchema } from "../../../schemas/automations/feature-outcome.zod.mjs";

const FORBIDDEN_SIDE_EFFECT_CLAIM_PATTERNS = [
  /\b(?:notion|provider|integration|page|record|task|message)\b[^.\n]{0,80}\b(?:updated|created|applied|sent|delivered|written|posted|pushed|saved)\b/i,
  /\b(?:updated|created|applied|sent|delivered|wrote|posted|pushed|saved)\b[^.\n]{0,80}\b(?:notion|provider|integration|page|record|task|message)\b/i,
];

function sorted(values) {
  return [...values].sort();
}

function sameValues(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

export function compareFeatureOutcome(evaluationCase) {
  const generated = evaluationCase.generated_response;
  const expected = evaluationCase.expected_response;
  const parsed = FeatureOutcomeSchema.safeParse(generated);
  const evidenceSourceIds = parsed.success ? generated.evidence.map((item) => item.source_id) : [];
  const informationGapCodes = parsed.success ? generated.information_gaps.map((item) => item.code) : [];
  const normalizedReasoning = parsed.success ? generated.reasoning_summary.toLowerCase() : "";
  const normalizedObservations = parsed.success ? generated.evidence.map((item) => item.observation.toLowerCase()).join("\n") : "";
  const normalizedGeneratedText = parsed.success ? JSON.stringify(generated).toLowerCase() : "";
  const checks = {
    generated_response_matches_schema: parsed.success,
    feature_id_matches: parsed.success && generated.feature_id === expected.feature_id,
    outcome_matches: parsed.success && generated.outcome === expected.outcome,
    evidence_sources_match: parsed.success && sameValues(evidenceSourceIds, expected.evidence_source_ids),
    output_refs_match: parsed.success && sameValues(generated.output_refs, expected.output_refs),
    information_gaps_match: parsed.success && sameValues(informationGapCodes, expected.information_gap_codes),
    reasoning_matches_reference: parsed.success && expected.reasoning_must_include.every((term) => normalizedReasoning.includes(term.toLowerCase())),
    evidence_observations_match: parsed.success && expected.evidence_observations_must_include.every((term) => normalizedObservations.includes(term.toLowerCase())),
    no_downstream_write_claims: parsed.success && FORBIDDEN_SIDE_EFFECT_CLAIM_PATTERNS.every((pattern) => !pattern.test(normalizedGeneratedText)),
    reference_points_present: evaluationCase.reference_points.length > 0,
  };
  return {
    id: evaluationCase.id,
    description: evaluationCase.description,
    pass: Object.values(checks).every(Boolean),
    generated_response: generated,
    expected_response: expected,
    reference_points: evaluationCase.reference_points,
    checks,
    schema_errors: parsed.success ? [] : parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function evaluateFeatureOutcomeSuite(suite) {
  const cases = suite.cases.map(compareFeatureOutcome);
  return {
    schema_version: "kamdar-feature-outcome-eval-report@1.0.0",
    suite: suite.suite,
    pass: cases.every((item) => item.pass),
    summary: {
      total: cases.length,
      passed: cases.filter((item) => item.pass).length,
      failed: cases.filter((item) => !item.pass).length,
    },
    cases,
  };
}

function main() {
  const defaultSuite = resolve(fileURLToPath(new URL("../../feature-outcomes/suite.json", import.meta.url)));
  const suitePath = resolve(process.argv[2] ?? defaultSuite);
  const suite = JSON.parse(readFileSync(suitePath, "utf8"));
  const report = evaluateFeatureOutcomeSuite(suite);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.pass ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

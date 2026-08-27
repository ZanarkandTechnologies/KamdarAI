import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateCompanyOperatingEvalSuite,
  validateJudgeRubric,
} from "../scripts/company-operating-eval-contract.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dailySuite = JSON.parse(readFileSync(resolve(projectRoot, "evals/daily/suite.json"), "utf8"));
const dailyGates = ["effects-match-receipt", "read-back-matches-intent", "processing-safety", "idempotency"];

function validate(suite) {
  return validateCompanyOperatingEvalSuite(suite, {
    knownIntegrationGateIds: dailyGates,
    label: "test suite",
  });
}

test("shared Company operating contract accepts canonical Farplane Daily evals", () => {
  const parsed = validate(structuredClone(dailySuite));
  assert.equal(parsed.evals.length, 8);
  for (const scenario of parsed.evals) {
    assert.deepEqual(Object.keys(scenario).sort(), ["assertions", "expected_output", "files", "id", "metadata", "prompt"]);
    assert.equal(Object.hasOwn(scenario.metadata, "farplane"), false);
  }
  assert.deepEqual(parsed.evals.map((scenario) => scenario.metadata.title), [
    "Updates Project context from operating progress",
    "Checks completed work for missing documentation",
    "Chases the right owner when progress is stalled",
    "Updates the Weekly Draft with problems, decisions, and SOPs",
    "Applies prepared changes and verifies them",
    "Keeps work open when a required change fails",
    "Treats nothing needed as successfully reviewed",
    "Creates nothing twice when the review is rerun",
  ]);
});

test("shared Company operating contract rejects missing fields and unknown bindings", () => {
  const missingTitle = structuredClone(dailySuite);
  delete missingTitle.evals[0].metadata.title;
  assert.throws(() => validate(missingTitle), /evals\.0.*title/);

  const unknownFeature = structuredClone(dailySuite);
  unknownFeature.evals[0].metadata.extensions.kamdar.feature_ids[0] = "FEAT-9999";
  assert.throws(() => validate(unknownFeature), /binds unknown feature FEAT-9999/);

  const unknownEntity = structuredClone(dailySuite);
  unknownEntity.evals[0].metadata.extensions.kamdar.entity_ids[0] = "TASK-9999";
  assert.throws(() => validate(unknownEntity), /binds entity TASK-9999 outside its bound features/);

  const unknownResultPath = structuredClone(dailySuite);
  unknownResultPath.evals[0].metadata.extensions.kamdar.result_paths[0] = "unknown_results";
  assert.throws(() => validate(unknownResultPath), /binds result path unknown_results outside its bound features/);

  const unknownGate = structuredClone(dailySuite);
  unknownGate.evals[4].metadata.extensions.kamdar.integration_gate_ids[0] = "provider-magic";
  assert.throws(() => validate(unknownGate), /binds unknown integration gate provider-magic/);

  const unboundProof = structuredClone(dailySuite);
  delete unboundProof.evals[0].metadata.extensions.kamdar.result_paths;
  assert.throws(() => validate(unboundProof), /must bind at least one result path or integration gate/);

  const nestedMetadata = structuredClone(dailySuite);
  nestedMetadata.evals[0].metadata = { farplane: nestedMetadata.evals[0].metadata };
  assert.throws(() => validate(nestedMetadata), /evals\.0.*title/);
});

test("shared Company operating contract rejects duplicate scenario and binding IDs", () => {
  const duplicateCase = structuredClone(dailySuite);
  duplicateCase.evals[1].id = duplicateCase.evals[0].id;
  assert.throws(() => validate(duplicateCase), /duplicate scenario ID/);

  const duplicateBinding = structuredClone(dailySuite);
  duplicateBinding.evals[0].metadata.extensions.kamdar.feature_ids.push(duplicateBinding.evals[0].metadata.extensions.kamdar.feature_ids[0]);
  assert.throws(() => validate(duplicateBinding), /must not contain duplicate values/);
});

test("feature judge rubric requires the five canonical A-D grades", () => {
  assert.deepEqual(validateJudgeRubric({
    groundedness: "A",
    completeness: "B",
    usefulness: "C",
    repeatability: "D",
    length_balance: "A",
  }), {
    groundedness: "A",
    completeness: "B",
    usefulness: "C",
    repeatability: "D",
    length_balance: "A",
  });
  assert.throws(() => validateJudgeRubric({ groundedness: "A" }), /completeness/);
  assert.throws(() => validateJudgeRubric({
    groundedness: "A",
    completeness: "A",
    usefulness: "E",
    repeatability: "A",
    length_balance: "A",
  }), /usefulness/);
});

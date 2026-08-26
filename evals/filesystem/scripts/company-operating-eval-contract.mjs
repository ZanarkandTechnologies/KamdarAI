import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const uniqueStrings = (minimum = 0) => z.array(NonEmptyString).min(minimum).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "must not contain duplicate values" });
  }
});
const UniqueStringList = uniqueStrings(1);

export const JudgeRubricDimensions = Object.freeze([
  { key: "groundedness", label: "Groundedness" },
  { key: "completeness", label: "Completeness" },
  { key: "usefulness", label: "Usefulness" },
  { key: "repeatability", label: "Repeatability" },
  { key: "length_balance", label: "Length balance" },
]);

export const JudgeRubricSchema = z.object(Object.fromEntries(
  JudgeRubricDimensions.map(({ key }) => [key, z.enum(["A", "B", "C", "D"])])
)).strict();

export function validateJudgeRubric(rubric, label = "Feature judge rubric") {
  const parsed = JudgeRubricSchema.safeParse(rubric);
  if (!parsed.success) throw new Error(`${label}: ${formatIssues(parsed.error)}.`);
  return parsed.data;
}

export const CompanyOperatingEvalBindingsSchema = z.object({
  feature_ids: UniqueStringList,
  entity_ids: UniqueStringList,
  result_paths: UniqueStringList.optional(),
  integration_gate_ids: UniqueStringList.optional(),
}).strict().superRefine((bindings, context) => {
  if (!bindings.result_paths?.length && !bindings.integration_gate_ids?.length) {
    context.addIssue({ code: "custom", message: "must bind at least one result path or integration gate" });
  }
});

export const CompanyOperatingEvalCaseSchema = z.object({
  id: NonEmptyString.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  prompt: NonEmptyString,
  expected_output: NonEmptyString,
  files: uniqueStrings(),
  assertions: UniqueStringList,
  metadata: z.object({
    title: NonEmptyString,
    context: NonEmptyString,
    tags: UniqueStringList,
    notes: NonEmptyString.optional(),
    extensions: z.object({
      kamdar: CompanyOperatingEvalBindingsSchema,
    }).strict(),
  }).strict(),
}).strict();

function formatIssues(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "suite"}: ${issue.message}`).join("; ");
}

/**
 * Validate the shared Farplane-shaped scenario layer and its Kamdar proof
 * bindings. Daily and Weekly loaders remain responsible for their distinct
 * artifact, feature-judge, and integration contracts.
 */
export function validateCompanyOperatingEvalSuite(suite, {
  knownIntegrationGateIds = [],
  label = "Company operating eval suite",
} = {}) {
  if (!suite || typeof suite !== "object" || Array.isArray(suite)) throw new Error(`${label}: suite must be an object.`);
  if (!Array.isArray(suite.features) || !suite.features.length) throw new Error(`${label}: features must be a non-empty array.`);
  if (!Array.isArray(suite.evals) || !suite.evals.length) throw new Error(`${label}: evals must be a non-empty array.`);

  const featureIds = new Set();
  const resultPathByFeature = new Map();
  const entityIdsByFeature = new Map();
  for (const [index, feature] of suite.features.entries()) {
    const featureId = NonEmptyString.safeParse(feature?.feature_id);
    if (!featureId.success) throw new Error(`${label}: features.${index}.feature_id must be a non-empty string.`);
    if (featureIds.has(featureId.data)) throw new Error(`${label}: duplicate feature ID ${featureId.data}.`);
    featureIds.add(featureId.data);
    resultPathByFeature.set(featureId.data, feature?.result_path);
    entityIdsByFeature.set(featureId.data, new Set(Array.isArray(feature?.entity_ids) ? feature.entity_ids : []));
  }

  const knownGates = new Set(knownIntegrationGateIds);
  const caseIds = new Set();
  const parsedEvals = suite.evals.map((candidate, index) => {
    const parsed = CompanyOperatingEvalCaseSchema.safeParse(candidate);
    if (!parsed.success) throw new Error(`${label}: evals.${index} is invalid: ${formatIssues(parsed.error)}.`);
    const scenario = parsed.data;
    const bindings = scenario.metadata.extensions.kamdar;
    if (caseIds.has(scenario.id)) throw new Error(`${label}: duplicate scenario ID ${scenario.id}.`);
    caseIds.add(scenario.id);

    for (const featureId of bindings.feature_ids) {
      if (!featureIds.has(featureId)) throw new Error(`${label}: ${scenario.id} binds unknown feature ${featureId}.`);
    }

    const boundResultPaths = new Set(bindings.feature_ids.map((featureId) => resultPathByFeature.get(featureId)));
    for (const resultPath of bindings.result_paths || []) {
      if (!boundResultPaths.has(resultPath)) throw new Error(`${label}: ${scenario.id} binds result path ${resultPath} outside its bound features.`);
    }

    const boundEntityIds = new Set(bindings.feature_ids.flatMap((featureId) => [...entityIdsByFeature.get(featureId)]));
    for (const entityId of bindings.entity_ids) {
      if (!boundEntityIds.has(entityId)) throw new Error(`${label}: ${scenario.id} binds entity ${entityId} outside its bound features.`);
    }

    for (const gateId of bindings.integration_gate_ids || []) {
      if (!knownGates.has(gateId)) throw new Error(`${label}: ${scenario.id} binds unknown integration gate ${gateId}.`);
    }
    return scenario;
  });

  return { ...suite, evals: parsedEvals };
}

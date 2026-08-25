/**
 * Acceptance validator for one unified Daily operating-update run.
 *
 * Structural facts are checked deterministically. Semantic quality is judged
 * independently per feature by native subagents using packets built here.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DailyReviewResultSchema } from "../../../automations/schemas/daily-review-result.zod.mjs";
import {
  DailyIntegrationReceiptSchema,
  assertDailyProcessingSafety,
} from "../../../automations/schemas/daily-integration-receipt.zod.mjs";
import { loadKamdarSeedConfig } from "./kamdar-seed-config.mjs";
import { validateArtifactQualityReview } from "./quality-review-contracts.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(filesystemRoot, "../..");
export const defaultSuitePath = resolve(projectRoot, "evals/daily-review-evals.json");
const featureIds = Object.freeze(["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"]);
const integrationGateIds = Object.freeze([
  "effects-match-receipt",
  "read-back-matches-intent",
  "processing-safety",
  "idempotency",
]);

function fail(message) { throw new Error(`Unified Daily review eval: ${message}`); }
function readJson(path, label = relative(projectRoot, path)) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
}
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function safeRelativePath(value, label) {
  if (typeof value !== "string" || !value || isAbsolute(value)) fail(`${label} must be a non-empty relative path.`);
  const normalized = value.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) fail(`${label} escapes its run root.`);
  return normalized;
}
function ensureInside(root, path, label) {
  const inner = relative(root, path);
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`) || isAbsolute(inner)) fail(`${label} escaped its run root.`);
}

export function loadDailyReviewEvalSuite({ path = defaultSuitePath } = {}) {
  const suite = readJson(path);
  if (suite.schema_version !== "kamdar-daily-review-evals@1.0.0") fail("suite schema_version is unsupported.");
  if (!Array.isArray(suite.run_artifacts) || !suite.run_artifacts.length) fail("suite needs run_artifacts.");
  const artifactPaths = new Set();
  for (const [index, artifact] of suite.run_artifacts.entries()) {
    if (!isObject(artifact) || !["base", "judged"].includes(artifact.stage) || typeof artifact.kind !== "string") fail(`run_artifacts[${index}] is invalid.`);
    artifact.path = safeRelativePath(artifact.path, `run_artifacts[${index}].path`);
    if (artifactPaths.has(artifact.path)) fail(`run_artifacts repeats ${artifact.path}.`);
    artifactPaths.add(artifact.path);
  }
  if (!Array.isArray(suite.features) || suite.features.length !== featureIds.length) fail("suite must define four Daily feature judges.");
  const observedIds = suite.features.map((feature) => feature.feature_id).sort();
  if (JSON.stringify(observedIds) !== JSON.stringify([...featureIds])) fail("suite feature judges must cover FEAT-0001 through FEAT-0004 exactly once.");
  for (const feature of suite.features) {
    if (!feature.result_path || !Array.isArray(feature.entity_ids) || !feature.entity_ids.length || !feature.claim || !Array.isArray(feature.assertions) || !feature.assertions.length) {
      fail(`${feature.feature_id} needs result_path, entity_ids, claim, and assertions.`);
    }
  }
  return suite;
}

export function inventoryRun(root) {
  const resolvedRoot = resolve(root);
  if (!existsSync(resolvedRoot)) fail(`run root does not exist: ${resolvedRoot}`);
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) fail(`run artifact cannot be a symbolic link: ${relative(resolvedRoot, path)}`);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) {
        const content = readFileSync(path);
        files.push({ path: relative(resolvedRoot, path).replaceAll("\\", "/"), bytes: content.length, sha256: sha256(content) });
      }
    }
  };
  visit(resolvedRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function assertExactRunArtifacts(root, suite, { stage = "base" } = {}) {
  if (!["base", "judged"].includes(stage)) fail(`unknown artifact stage ${stage}.`);
  const expected = suite.run_artifacts
    .filter((artifact) => artifact.stage === "base" || stage === "judged")
    .map((artifact) => artifact.path)
    .sort();
  const observed = inventoryRun(root).map((artifact) => artifact.path);
  const missing = expected.filter((path) => !observed.includes(path));
  const unexpected = observed.filter((path) => !expected.includes(path));
  if (missing.length || unexpected.length) fail(`artifact inventory mismatch; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}].`);
  return observed;
}

function entityIndex(seed) {
  const groups = ["projects", "people", "work_items", "meetings", "reports"];
  return new Map(groups.flatMap((group) => seed.entities[group].map((entity) => [entity.id, { group, ...entity }])));
}
function resultSlice(result, path) {
  const parts = String(path).replace(/^\//, "").split(/[./]/).filter(Boolean);
  let current = result;
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) fail(`result_path ${path} does not resolve.`);
    current = current[part];
  }
  return current;
}
function rowSourceIds(row) {
  const ids = new Set(Array.isArray(row?.source_ids) ? row.source_ids : []);
  for (const key of ["project_id", "work_item_id", "owner_person_id"]) if (row?.[key]) ids.add(row[key]);
  for (const id of row?.related_work_item_ids || []) ids.add(id);
  return [...ids];
}

export function validateUnifiedDailyRun({ runRoot, suite = loadDailyReviewEvalSuite(), seed = loadKamdarSeedConfig(), stage = "base" }) {
  const inventory = assertExactRunArtifacts(runRoot, suite, { stage });
  const artifact = (kind) => suite.run_artifacts.find((item) => item.kind === kind)?.path;
  for (const kind of ["daily-context", "daily-review-result", "daily-integration-receipt"]) if (!artifact(kind)) fail(`suite lacks ${kind} artifact.`);
  const context = readJson(resolve(runRoot, artifact("daily-context")), "Daily context");
  const resultPath = resolve(runRoot, artifact("daily-review-result"));
  const resultBytes = readFileSync(resultPath);
  const rawResult = readJson(resultPath, "Daily review result");
  const rawReceipt = readJson(resolve(runRoot, artifact("daily-integration-receipt")), "Daily integration receipt");
  const parsedResult = DailyReviewResultSchema.safeParse(rawResult);
  if (!parsedResult.success) fail(`Daily review result failed Zod validation: ${parsedResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const parsedReceipt = DailyIntegrationReceiptSchema.safeParse(rawReceipt);
  if (!parsedReceipt.success) fail(`Daily integration receipt failed Zod validation: ${parsedReceipt.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  assertDailyProcessingSafety(parsedReceipt.data);
  if (!isObject(context) || context.artifact_type !== "kamdar-daily-context-diff" || !context.context_id) fail("Daily context has the wrong artifact contract.");
  for (const key of ["projects", "work_items", "meetings", "people"]) if (!Array.isArray(context[key])) fail(`Daily context ${key} must be an array.`);
  if (parsedResult.data.context_id !== context.context_id) fail("Daily result context_id does not match the collected context.");
  if (parsedReceipt.data.source_context_id !== context.context_id || parsedReceipt.data.daily_result_sha256 !== sha256(resultBytes)) fail("receipt linkage does not match the exact context/result artifacts.");

  const entities = entityIndex(seed);
  const contextIds = new Set(["projects", "work_items", "meetings", "people"]
    .flatMap((key) => context[key])
    .flatMap((row) => [row.id, row.source_id].filter(Boolean)));
  const featureChecks = suite.features.map((feature) => {
    for (const id of feature.entity_ids) if (!entities.has(id)) fail(`${feature.feature_id} references unknown seed entity ${id}.`);
    const slice = resultSlice(parsedResult.data, feature.result_path);
    if (!Array.isArray(slice) || !slice.length) fail(`${feature.feature_id} result slice ${feature.result_path} must be populated in the showcase run.`);
    const usedIds = new Set(slice.flatMap(rowSourceIds));
    for (const id of usedIds) if (!entities.has(id)) fail(`${feature.feature_id} output cites unknown seed entity ${id}.`);
    for (const id of usedIds) if (!contextIds.has(id)) fail(`${feature.feature_id} output cites ${id}, which is absent from the collected context.`);
    if (![...usedIds].some((id) => feature.entity_ids.includes(id))) fail(`${feature.feature_id} output is not grounded in its declared seed case.`);
    return { feature_id: feature.feature_id, result_path: feature.result_path, rows: slice.length, source_ids: [...usedIds].sort() };
  });
  return { pass: true, stage, inventory, context, result: parsedResult.data, receipt: parsedReceipt.data, feature_checks: featureChecks };
}

export function buildFeatureJudgePacket({ featureId, result, runRoot = "<run_root>", suite = loadDailyReviewEvalSuite(), seed = loadKamdarSeedConfig() }) {
  const feature = suite.features.find((item) => item.feature_id === featureId);
  if (!feature) fail(`unknown judge feature ${featureId}.`);
  const entities = entityIndex(seed);
  const verdictArtifact = suite.run_artifacts.find((item) => item.kind === `feature-judge:${feature.feature_id}`);
  if (!verdictArtifact) fail(`suite lacks judge artifact for ${feature.feature_id}.`);
  const verdictPath = runRoot === "<run_root>" ? `<run_root>/${verdictArtifact.path}` : resolve(runRoot, verdictArtifact.path);
  return {
    schema_version: "kamdar-feature-judge-packet@1.0.0",
    feature_id: feature.feature_id,
    claim: feature.claim,
    candidate: resultSlice(result, feature.result_path),
    seed_evidence: feature.entity_ids.map((id) => entities.get(id)),
    assertions: feature.assertions,
    judge_policy: {
      tiers: ["A", "B", "C", "D"],
      pass_tier: "A",
      evidence_rule: "Judge visible seeded evidence and candidate JSON only; cite exact entity IDs and JSON paths.",
      output_shape: {
        feature_id: feature.feature_id,
        tier: "A|B|C|D",
        verdict: "pass|fail|blocked",
        assertions: [{ assertion: "exact authored assertion", met: true, evidence_refs: ["seed ID plus candidate JSON path"] }],
        evidence_refs: ["all unique evidence references cited by assertions"],
        failures: [],
        verdict_path: verdictPath,
      },
    },
  };
}

export function validateFeatureJudgeVerdict(verdict, feature, { expectedVerdictPath } = {}) {
  if (!isObject(verdict)
    || verdict.feature_id !== feature.feature_id
    || !["A", "B", "C", "D"].includes(verdict.tier)
    || !["pass", "fail", "blocked"].includes(verdict.verdict)
    || !Array.isArray(verdict.assertions)
    || !Array.isArray(verdict.evidence_refs)
    || !Array.isArray(verdict.failures)
    || typeof verdict.verdict_path !== "string") {
    fail(`${feature.feature_id} judge verdict is malformed.`);
  }
  if (verdict.verdict_path !== expectedVerdictPath) fail(`${feature.feature_id} judge verdict_path must equal ${expectedVerdictPath}.`);
  if (!verdict.evidence_refs.length || verdict.evidence_refs.some((reference) => typeof reference !== "string" || !reference.trim())) fail(`${feature.feature_id} judge evidence_refs must contain non-empty references.`);
  if (verdict.failures.some((failure) => typeof failure !== "string" || !failure.trim())) fail(`${feature.feature_id} judge failures must contain non-empty strings.`);
  if (verdict.assertions.length !== feature.assertions.length) fail(`${feature.feature_id} judge must return one result per assertion.`);
  for (const assertion of feature.assertions) {
    const check = verdict.assertions.find((item) => item.assertion === assertion);
    if (!isObject(check) || typeof check.met !== "boolean" || !Array.isArray(check.evidence_refs) || !check.evidence_refs.length) fail(`${feature.feature_id} judge lacks evidence for: ${assertion}`);
    for (const reference of check.evidence_refs) {
      if (typeof reference !== "string" || !reference.trim() || !verdict.evidence_refs.includes(reference)) fail(`${feature.feature_id} judge has an invalid evidence reference for: ${assertion}`);
    }
  }
  const pass = verdict.tier === "A" && verdict.verdict === "pass" && verdict.assertions.every((check) => check.met) && verdict.failures.length === 0;
  return { feature_id: feature.feature_id, pass, tier: verdict.tier };
}

export function validateIntegrationChecks(integrations) {
  if (!isObject(integrations) || typeof integrations.pass !== "boolean" || !Array.isArray(integrations.gates) || !Array.isArray(integrations.failures)) fail("integration checks are malformed.");
  if (integrations.failures.some((failure) => typeof failure !== "string" || !failure.trim())) fail("integration check failures must contain non-empty strings.");
  const observedGateIds = integrations.gates.map((gate) => gate?.gate_id).sort();
  if (JSON.stringify(observedGateIds) !== JSON.stringify([...integrationGateIds].sort())) fail(`integration checks must cover ${integrationGateIds.join(", ")} exactly once.`);
  for (const gate of integrations.gates) {
    if (!isObject(gate) || typeof gate.pass !== "boolean" || !Array.isArray(gate.evidence_refs) || !Array.isArray(gate.failures)) fail(`integration gate ${gate?.gate_id || "unknown"} is malformed.`);
    if (gate.evidence_refs.some((reference) => typeof reference !== "string" || !reference.trim()) || gate.failures.some((failure) => typeof failure !== "string" || !failure.trim())) fail(`integration gate ${gate.gate_id} has malformed evidence or failures.`);
    if (gate.pass && (!gate.evidence_refs.length || gate.failures.length)) fail(`passing integration gate ${gate.gate_id} needs evidence and no failures.`);
  }
  const computedPass = integrations.gates.every((gate) => gate.pass) && integrations.failures.length === 0;
  if (integrations.pass !== computedPass) fail("integration checks pass does not match its gates and failures.");
  return { pass: computedPass, gates: integrations.gates.map((gate) => ({ gate_id: gate.gate_id, pass: gate.pass })) };
}

export function reconcileJudgedRun({ runRoot, deterministic, suite = loadDailyReviewEvalSuite() }) {
  const featureVerdicts = suite.features.map((feature) => {
    const artifact = suite.run_artifacts.find((item) => item.kind === `feature-judge:${feature.feature_id}`);
    if (!artifact) fail(`suite lacks judge artifact for ${feature.feature_id}.`);
    const verdictPath = resolve(runRoot, artifact.path);
    return validateFeatureJudgeVerdict(readJson(verdictPath), feature, { expectedVerdictPath: verdictPath });
  });
  const reviewArtifact = suite.run_artifacts.find((item) => item.kind === "evidence-review");
  if (!reviewArtifact) fail("suite lacks an independent evidence-review artifact.");
  const review = readJson(resolve(runRoot, reviewArtifact.path));
  if (!isObject(review) || review.independent !== true || !["pass", "fail", "blocked"].includes(review.verdict) || !Array.isArray(review.reviewed_feature_ids)) fail("independent evidence review is malformed.");
  if (JSON.stringify([...review.reviewed_feature_ids].sort()) !== JSON.stringify([...featureIds])) fail("evidence review must inspect all four feature verdicts.");
  const integrationsArtifact = suite.run_artifacts.find((item) => item.kind === "integration-checks");
  if (!integrationsArtifact) fail("suite lacks an integration-checks artifact.");
  const integrationsPath = resolve(runRoot, integrationsArtifact.path);
  if (!existsSync(integrationsPath)) fail(`integration checks artifact is missing: ${integrationsArtifact.path}.`);
  const integrations = validateIntegrationChecks(readJson(integrationsPath));
  const qualityArtifact = suite.run_artifacts.find((item) => item.kind === "artifact-quality-review");
  if (!qualityArtifact) fail("suite lacks an artifact-quality-review artifact.");
  const qualityPath = resolve(runRoot, qualityArtifact.path);
  const resultArtifact = suite.run_artifacts.find((item) => item.kind === "daily-review-result");
  const quality = validateArtifactQualityReview({
    rawReview: readJson(qualityPath),
    result: deterministic.result,
    resultBytes: readFileSync(resolve(runRoot, resultArtifact.path)),
    scope: "daily",
    expectedReviewPath: qualityPath,
  });
  const pass = deterministic.pass && featureVerdicts.every((item) => item.pass) && review.verdict === "pass" && quality.pass && integrations.pass;
  return { pass, deterministic: deterministic.pass, feature_verdicts: featureVerdicts, evidence_review: review.verdict, artifact_quality_review: quality, integrations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const runRoot = process.argv[2];
  const stage = process.argv.includes("--judged") ? "judged" : "base";
  if (!runRoot) fail("usage: node unified-daily-review-eval.mjs <run-root> [--judged]");
  const deterministic = validateUnifiedDailyRun({ runRoot, stage });
  const output = stage === "judged" ? reconcileJudgedRun({ runRoot, deterministic }) : deterministic;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.pass) process.exitCode = 1;
}

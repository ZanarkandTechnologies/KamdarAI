/**
 * Acceptance validator for one immutable Weekly operating-review run.
 *
 * Weekly runtime evidence is Project/Report-only. Raw Work and Meeting records
 * remain seed-backed judge references and may appear only as IDs already cited
 * by an immutable Project Draft.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { WeeklyReviewResultSchema } from "../../../schemas/automations/weekly-review-result.zod.mjs";
import { WeeklyContextSchema } from "../../../schemas/automations/weekly-context.zod.mjs";
import {
  validateCompanyOperatingEvalSuite,
  validateJudgeRubric,
} from "./company-operating-eval-contract.mjs";
import { loadKamdarSeedConfig } from "./kamdar-seed-config.mjs";
import { validateArtifactQualityReview } from "./quality-review-contracts.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(filesystemRoot, "../..");
export const defaultSuitePath = resolve(projectRoot, "evals/weekly/suite.json");
const featureIds = Object.freeze(["FEAT-0005", "FEAT-0006", "FEAT-0007"]);
const immutableKinds = Object.freeze(["weekly-context", "weekly-review-result", "mock-integration-receipt", "mock-provider-read-back"]);

function fail(message) { throw new Error(`Unified Weekly review eval: ${message}`); }
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function readJson(path, label = relative(projectRoot, path)) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
}
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}
export function payloadSha256(value) { return sha256(stableJson(value)); }
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
function artifactByKind(suite, kind) {
  const row = suite.run_artifacts.find((artifact) => artifact.kind === kind);
  if (!row) fail(`suite lacks ${kind} artifact.`);
  return row.path;
}

export function loadWeeklyReviewEvalSuite({ path = defaultSuitePath } = {}) {
  const suite = readJson(path);
  if (suite.schema_version !== "kamdar-weekly-review-evals@2.0.0") fail("suite schema_version is unsupported.");
  if (!Array.isArray(suite.run_artifacts) || !suite.run_artifacts.length) fail("suite needs run_artifacts.");
  const paths = new Set();
  for (const [index, artifact] of suite.run_artifacts.entries()) {
    if (!isObject(artifact) || typeof artifact.kind !== "string" || typeof artifact.stage !== "string") fail(`run_artifacts[${index}] is invalid.`);
    artifact.path = safeRelativePath(artifact.path, `run_artifacts[${index}].path`);
    if (paths.has(artifact.path)) fail(`run_artifacts repeats ${artifact.path}.`);
    paths.add(artifact.path);
  }
  for (const kind of ["immutable-run-manifest", ...immutableKinds, "deterministic-checks", "independent-evidence-review", "mock-integration-checks", "suite-result"]) artifactByKind(suite, kind);
  if (!Array.isArray(suite.features) || suite.features.length !== featureIds.length) fail("suite must define three Weekly feature judges.");
  if (JSON.stringify(suite.features.map((feature) => feature.feature_id)) !== JSON.stringify(featureIds)) fail("suite feature judges must cover FEAT-0005 through FEAT-0007 in order.");
  for (const feature of suite.features) {
    if (!feature.result_path || !Array.isArray(feature.entity_ids) || !feature.entity_ids.length || !feature.claim || !Array.isArray(feature.assertions) || !feature.assertions.length || !feature.falsifier) fail(`${feature.feature_id} is incomplete.`);
    artifactByKind(suite, `feature-judge:${feature.feature_id}`);
  }
  return validateCompanyOperatingEvalSuite(suite, { label: "Unified Weekly review eval" });
}

export function inventoryWeeklyRun(root) {
  const runRoot = resolve(root);
  if (!existsSync(runRoot)) fail(`run root does not exist: ${runRoot}`);
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      ensureInside(runRoot, path, "run artifact");
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) fail(`run artifact cannot be a symbolic link: ${relative(runRoot, path)}`);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) {
        const content = readFileSync(path);
        files.push({ path: relative(runRoot, path).replaceAll("\\", "/"), bytes: content.length, sha256: sha256(content) });
      }
    }
  };
  visit(runRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function assertExactWeeklyRunArtifacts(root, suite, { stage = "base" } = {}) {
  if (!["base", "judged"].includes(stage)) fail(`unknown artifact stage ${stage}.`);
  const expected = suite.run_artifacts.filter((artifact) => stage === "judged" || artifact.path.startsWith("weekly/")).map((artifact) => artifact.path).sort();
  const observed = inventoryWeeklyRun(root).map((artifact) => artifact.path);
  const missing = expected.filter((path) => !observed.includes(path));
  const unexpected = observed.filter((path) => !expected.includes(path));
  if (missing.length || unexpected.length) fail(`artifact inventory mismatch; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}].`);
  return observed;
}

function seedEntityIndex(seed) {
  return new Map(["projects", "people", "work_items", "meetings", "reports"].flatMap((group) => seed.entities[group].map((entity) => [entity.id, { group, ...entity }])));
}
function contextEntityIds(context) {
  return new Set([
    ...context.projects.map((row) => row.id),
    ...context.reports.map((row) => row.id),
    ...context.reports.flatMap((row) => [row.project_id, row.previous_report_id, ...(row.source_ids || [])].filter(Boolean)),
    ...context.draft_candidate_refs.flatMap((row) => [row.source_report_id, ...row.source_ids]),
  ]);
}
function validateWeeklyContext(context, seed) {
  if (isObject(context) && ("work_items" in context || "meetings" in context)) fail("Weekly runtime context must not contain raw Work or Meeting records.");
  const parsed = WeeklyContextSchema.safeParse(context);
  if (!parsed.success) fail(`Weekly context failed Zod validation: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  context = parsed.data;
  const entities = seedEntityIndex(seed);
  for (const id of contextEntityIds(context)) if (!entities.has(id)) fail(`Weekly context references unknown seed entity ${id}.`);
  const draftIds = new Set(context.reports.filter((report) => report.status === "Draft").map((report) => report.id));
  for (const row of context.draft_candidate_refs) if (!draftIds.has(row.source_report_id)) fail(`candidate refs must come from an immutable Project Draft: ${row.source_report_id}.`);
  return { context, ids: contextEntityIds(context), entities };
}

function weeklyRowSourceIds(row) {
  return [
    row?.project_id,
    row?.previous_report_id,
    row?.candidate_id,
    row?.source_report_id,
    ...(row?.source_report_ids || []),
    ...(row?.source_ids || []),
  ].filter(Boolean);
}

function weeklyContextSlice(context, feature, candidate) {
  const wanted = new Set([...feature.entity_ids, ...candidate.flatMap(weeklyRowSourceIds)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const report of context.reports) {
      if (!wanted.has(report.id) && !report.source_ids.some((id) => wanted.has(id))) continue;
      for (const id of [report.id, report.project_id, report.previous_report_id, ...report.source_ids].filter(Boolean)) {
        if (!wanted.has(id)) { wanted.add(id); changed = true; }
      }
    }
    for (const ref of context.draft_candidate_refs) {
      if (!wanted.has(ref.source_report_id) && !ref.source_ids.some((id) => wanted.has(id))) continue;
      for (const id of [ref.source_report_id, ...ref.source_ids]) {
        if (!wanted.has(id)) { wanted.add(id); changed = true; }
      }
    }
  }
  return {
    schema_version: context.schema_version,
    artifact_type: context.artifact_type,
    context_id: context.context_id,
    week: context.week,
    collected_at: context.collected_at,
    runtime_input_policy: context.runtime_input_policy,
    projects: context.projects.filter((row) => wanted.has(row.id)),
    reports: context.reports.filter((row) => wanted.has(row.id)),
    draft_candidate_refs: context.draft_candidate_refs.filter((row) => wanted.has(row.source_report_id)),
    expected_areas: context.expected_areas,
    source_gaps: context.source_gaps,
  };
}

function packetDigest(packetWithoutHash) { return sha256(stableJson(packetWithoutHash)); }

function weeklyFeature7RuntimeEvidence({ runRoot, suite, feature, result }) {
  const receiptPath = resolve(runRoot, artifactByKind(suite, "mock-integration-receipt"));
  const readBackPath = resolve(runRoot, artifactByKind(suite, "mock-provider-read-back"));
  const receiptBytes = readFileSync(receiptPath);
  const readBackBytes = readFileSync(readBackPath);
  const receipt = readJson(receiptPath, "Weekly integration receipt");
  const readBack = readJson(readBackPath, "Weekly provider read-back");
  const candidates = result.next_week_project_replacements;
  if (!Array.isArray(candidates) || candidates.length !== 1) fail("FEAT-0007 runtime evidence requires exactly one Project replacement candidate.");
  const pointer = "/next_week_project_replacements/0";
  const effects = receipt.effects?.filter((row) => row.feature_id === feature.feature_id && row.result_pointer === pointer) ?? [];
  if (effects.length !== 1) fail("FEAT-0007 runtime evidence requires exactly one matching receipt effect.");
  const observations = readBack.observations?.filter((row) => row.feature_id === feature.feature_id && row.result_pointer === pointer) ?? [];
  if (observations.length !== 1) fail("FEAT-0007 runtime evidence requires exactly one matching read-back observation.");
  const effect = effects[0];
  const observation = observations[0];
  const candidateHash = payloadSha256(candidates[0]);
  if (effect.operation !== "replace_project_attention"
    || effect.target_id !== candidates[0].project_id
    || effect.payload_sha256 !== candidateHash
    || !["applied", "duplicate"].includes(effect.outcome)) fail("FEAT-0007 receipt effect is stale or does not describe the exact replacement.");
  if (observation.target_id !== effect.target_id
    || observation.provider_id_or_url !== effect.provider_id_or_url
    || observation.observed_sha256 !== candidateHash
    || payloadSha256(observation.observed_payload) !== candidateHash
    || observation.matched !== true) fail("FEAT-0007 read-back is stale or does not match the exact replacement.");

  const workTargetIds = feature.entity_ids.filter((id) => /^TASK-/.test(id));
  const workTargetEffects = receipt.effects?.filter((row) => workTargetIds.includes(row.target_id)) ?? [];
  if (workTargetEffects.length) fail(`FEAT-0007 runtime evidence found forbidden Work-targeting effects: ${workTargetEffects.map((row) => row.target_id).join(", ")}.`);
  if (!Array.isArray(readBack.source_invariants) || !readBack.source_invariants.length
    || readBack.source_invariants.some((row) => row.changed !== false || !/^[a-f0-9]{64}$/.test(row.observed_sha256))) {
    fail("FEAT-0007 runtime evidence requires unchanged source invariants.");
  }
  if (readBack.rerun?.idempotent !== true || readBack.rerun?.duplicate_effects_created !== 0) {
    fail("FEAT-0007 runtime evidence requires an idempotent rerun with zero duplicate effects.");
  }

  return {
    receipt_sha256: sha256(receiptBytes),
    read_back_sha256: sha256(readBackBytes),
    replacement_counts: { candidates: 1, receipt_effects: 1, read_back_observations: 1 },
    replacement_effect: effect,
    replacement_read_back: observation,
    work_target_boundary: { target_ids: workTargetIds, matching_effects: [] },
    source_invariants: readBack.source_invariants,
    rerun: {
      idempotent: true,
      duplicate_effects_created: 0,
    },
  };
}
function reportPayload(report) {
  return {
    report_id: report.report_id,
    report_level: report.report_level,
    project_id: report.project_id,
    area: report.area,
    report_version: report.report_version,
    report_status: report.report_status,
    finalized_at: report.finalized_at,
    source_report_ids: report.source_report_ids,
    report_markdown_sha256: sha256(report.report_markdown),
    configuration_gaps: report.configuration_gaps,
  };
}
export function integrationPayloadForPointer(result, pointer) {
  const match = pointer.match(/^\/(report_results|promotion_dispositions|next_week_project_replacements)\/(\d+)$/);
  if (!match) fail(`integration result pointer is unsupported: ${pointer}`);
  const row = result[match[1]][Number(match[2])];
  if (!row) fail(`integration result pointer does not resolve: ${pointer}`);
  return match[1] === "report_results" ? reportPayload(row) : row;
}
function resultSlice(result, path) {
  const match = path.match(/^\$\.(report_results|promotion_dispositions|next_week_project_replacements)\[\*\]$/);
  if (!match) fail(`result_path ${path} is unsupported.`);
  return result[match[1]];
}
function validateResultSourceClosure(result, contextIds) {
  const reports = new Map(result.report_results.map((row) => [row.report_id, row]));
  const resolving = new Set();
  const resolves = (id) => {
    if (contextIds.has(id)) return true;
    const row = reports.get(id);
    if (!row || resolving.has(id)) return false;
    resolving.add(id);
    const pass = row.source_report_ids.every(resolves);
    resolving.delete(id);
    return pass;
  };
  for (const row of result.report_results) {
    for (const id of [row.project_id, row.previous_report_id].filter(Boolean)) if (!contextIds.has(id)) fail(`${row.report_id} cites ${id}, which is absent from Weekly context.`);
    for (const id of row.source_report_ids) if (!resolves(id)) fail(`${row.report_id} source ${id} does not resolve through generated reports to immutable Weekly context.`);
  }
  for (const row of result.promotion_dispositions) for (const id of [row.candidate_id, row.source_report_id, ...row.source_ids]) if (!contextIds.has(id)) fail(`promotion candidate cites ${id}, which is absent from Draft-backed Weekly context.`);
  for (const row of result.next_week_project_replacements) for (const id of [row.project_id, row.source_report_id, ...row.source_ids]) if (!contextIds.has(id)) fail(`Project replacement cites ${id}, which is absent from Weekly context.`);
}

function validateManifest({ runRoot, suite, manifest, inventory }) {
  if (!isObject(manifest) || manifest.schema_version !== "kamdar-weekly-run-manifest@1.0.0" || manifest.live_provider_calls !== false || !Array.isArray(manifest.immutable_inputs)) fail("immutable run manifest is malformed or permits live provider calls.");
  const expectedPaths = immutableKinds.map((kind) => artifactByKind(suite, kind)).sort();
  const expectedKinds = new Map(immutableKinds.map((kind) => [artifactByKind(suite, kind), kind]));
  const rows = [...manifest.immutable_inputs].sort((left, right) => left.path.localeCompare(right.path));
  if (JSON.stringify(rows.map((row) => row.path)) !== JSON.stringify(expectedPaths)) fail("manifest must cover every and only immutable Weekly input.");
  const observed = new Map(inventory.map((row) => [row.path, row]));
  for (const row of rows) {
    const file = observed.get(row.path);
    if (!file || row.sha256 !== file.sha256 || row.bytes !== file.bytes) fail(`manifest hash or byte count does not match ${row.path}.`);
    if (row.kind !== expectedKinds.get(row.path)) fail(`manifest kind does not match ${row.path}.`);
    if (!/^[a-f0-9]{64}$/.test(row.sha256)) fail(`manifest SHA-256 is malformed for ${row.path}.`);
  }
  return rows;
}
function expectedOutcome(pointer, row) {
  if (pointer.startsWith("/report_results/") || pointer.startsWith("/next_week_project_replacements/")) return "applied";
  return row.disposition === "promoted" ? "applied" : row.disposition;
}
function isSyntheticProviderUrl(value) {
  if (value === null) return true;
  try {
    const hostname = new URL(value).hostname;
    return hostname === "example.test" || hostname.endsWith(".example.test");
  } catch { return false; }
}
function validateMockIntegrations({ result, context, receipt, readBack, resultBytes }) {
  if (!isObject(receipt) || receipt.schema_version !== "kamdar-weekly-integration-receipt@1.0.0" || receipt.context_id !== context.context_id || receipt.weekly_result_sha256 !== sha256(resultBytes) || receipt.live_provider_calls !== false || !Array.isArray(receipt.effects)) fail("mock integration receipt is malformed or is not linked to the exact Weekly result.");
  if (!isObject(readBack) || readBack.schema_version !== "kamdar-weekly-integration-read-back@1.0.0" || readBack.receipt_id !== receipt.receipt_id || readBack.weekly_result_sha256 !== receipt.weekly_result_sha256 || readBack.live_provider_calls !== false || !Array.isArray(readBack.observations)) fail("mock provider read-back is malformed or is not linked to its receipt.");
  const expectedPointers = [
    ...result.report_results.map((_, index) => `/report_results/${index}`),
    ...result.promotion_dispositions.map((_, index) => `/promotion_dispositions/${index}`),
    ...result.next_week_project_replacements.map((_, index) => `/next_week_project_replacements/${index}`),
  ];
  if (receipt.effects.length !== expectedPointers.length || new Set(receipt.effects.map((effect) => effect.result_pointer)).size !== expectedPointers.length) fail("receipt must contain exactly one effect for every Weekly result row.");
  const observations = new Map(readBack.observations.map((row) => [row.result_pointer, row]));
  for (const pointer of expectedPointers) {
    const effect = receipt.effects.find((row) => row.result_pointer === pointer);
    if (!effect) fail(`receipt lacks effect for ${pointer}.`);
    const payload = integrationPayloadForPointer(result, pointer);
    const hash = payloadSha256(payload);
    const row = pointer.split("/")[1] === "promotion_dispositions" ? result.promotion_dispositions[Number(pointer.split("/")[2])] : null;
    const expectedFeature = pointer.startsWith("/report_results/") ? "FEAT-0005" : pointer.startsWith("/promotion_dispositions/") ? "FEAT-0006" : "FEAT-0007";
    if (effect.feature_id !== expectedFeature || effect.payload_sha256 !== hash || effect.outcome !== expectedOutcome(pointer, row) || !effect.action_key || !effect.operation || !effect.target_id) fail(`receipt effect does not match exact result payload at ${pointer}.`);
    if (!isSyntheticProviderUrl(effect.provider_id_or_url)) fail(`receipt contains a non-synthetic provider URL at ${pointer}.`);
    const needsReadBack = ["applied", "duplicate"].includes(effect.outcome);
    const observation = observations.get(pointer);
    if (needsReadBack && (!observation || observation.feature_id !== effect.feature_id || observation.target_id !== effect.target_id || observation.provider_id_or_url !== effect.provider_id_or_url || !isSyntheticProviderUrl(observation.provider_id_or_url) || observation.observed_sha256 !== hash || payloadSha256(observation.observed_payload) !== hash || observation.matched !== true)) fail(`applied or duplicate effect lacks exact read-back at ${pointer}.`);
    if (!needsReadBack && (effect.provider_id_or_url !== null || observation)) fail(`non-writing outcome must not create provider evidence at ${pointer}.`);
    if (effect.outcome === "duplicate" && observation.created !== false) fail(`duplicate effect must prove no new row at ${pointer}.`);
    if (effect.outcome === "applied" && observation.created !== true) fail(`applied effect must prove one created or updated row at ${pointer}.`);
  }
  const prior = context.reports.find((row) => row.id === "RPT-PROJ-CMT-CMT_PIPELINE-W33");
  const invariant = readBack.source_invariants?.find((row) => row.id === prior?.id);
  if (!prior || !invariant || invariant.observed_sha256 !== payloadSha256(prior) || invariant.changed !== false) fail("read-back does not prove the prior Final Project report remained unchanged.");
  if (readBack.rerun?.duplicate_effects_created !== 0 || readBack.rerun?.idempotent !== true) fail("read-back does not prove an unchanged rerun is idempotent.");
  return { pass: true, effects: receipt.effects.length, read_backs: readBack.observations.length, receipt_sha256: payloadSha256(receipt), read_back_sha256: payloadSha256(readBack) };
}

export function validateUnifiedWeeklyRun({ runRoot, suite = loadWeeklyReviewEvalSuite(), seed = loadKamdarSeedConfig(), stage = "base" }) {
  const inventoryPaths = assertExactWeeklyRunArtifacts(runRoot, suite, { stage });
  const inventory = inventoryWeeklyRun(runRoot);
  const manifest = readJson(resolve(runRoot, artifactByKind(suite, "immutable-run-manifest")), "Weekly manifest");
  const contextPath = resolve(runRoot, artifactByKind(suite, "weekly-context"));
  const contextBytes = readFileSync(contextPath);
  const rawContext = readJson(contextPath, "Weekly context");
  const resultPath = resolve(runRoot, artifactByKind(suite, "weekly-review-result"));
  const resultBytes = readFileSync(resultPath);
  const rawResult = readJson(resultPath, "Weekly review result");
  const receipt = readJson(resolve(runRoot, artifactByKind(suite, "mock-integration-receipt")), "Weekly integration receipt");
  const readBack = readJson(resolve(runRoot, artifactByKind(suite, "mock-provider-read-back")), "Weekly provider read-back");
  const manifestRows = validateManifest({ runRoot, suite, manifest, inventory });
  const { context, ids: contextIds } = validateWeeklyContext(rawContext, seed);
  const parsed = WeeklyReviewResultSchema.safeParse(rawResult);
  if (!parsed.success) fail(`Weekly review result failed Zod validation: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  if (parsed.data.context_id !== context.context_id || parsed.data.week !== context.week) fail("Weekly result context or week does not match collected context.");
  validateResultSourceClosure(parsed.data, contextIds);
  const featureChecks = suite.features.map((feature) => {
    const slice = resultSlice(parsed.data, feature.result_path);
    if (!slice.length) fail(`${feature.feature_id} result slice must be populated in the showcase run.`);
    return { feature_id: feature.feature_id, result_path: feature.result_path, rows: slice.length };
  });
  const integrations = validateMockIntegrations({ result: parsed.data, context, receipt, readBack, resultBytes });
  return {
    pass: true,
    stage,
    inventory: inventoryPaths,
    immutable_inputs: manifestRows,
    context,
    context_sha256: sha256(contextBytes),
    result: parsed.data,
    result_sha256: sha256(resultBytes),
    receipt,
    read_back: readBack,
    feature_checks: featureChecks,
    integrations,
  };
}

export function buildWeeklyFeatureJudgePacket({ featureId, result, context, runRoot, suite = loadWeeklyReviewEvalSuite(), seed = loadKamdarSeedConfig() }) {
  const feature = suite.features.find((item) => item.feature_id === featureId);
  if (!feature) fail(`unknown judge feature ${featureId}.`);
  if (!runRoot) fail("Weekly judge packet construction requires the exact run root.");
  const entities = seedEntityIndex(seed);
  const contextPath = resolve(runRoot, artifactByKind(suite, "weekly-context"));
  const resultPath = resolve(runRoot, artifactByKind(suite, "weekly-review-result"));
  const frozenContext = validateWeeklyContext(readJson(contextPath, "Weekly context"), seed).context;
  const fileResult = readJson(resultPath, "Weekly result");
  if (context && stableJson(context) !== stableJson(frozenContext)) fail("Weekly judge packet context does not match the exact frozen context bytes.");
  if (stableJson(result) !== stableJson(fileResult)) fail("Weekly judge packet candidate does not match the exact frozen result bytes.");
  const candidate = resultSlice(result, feature.result_path);
  const runtimeEvidence = feature.feature_id === "FEAT-0007"
    ? weeklyFeature7RuntimeEvidence({ runRoot, suite, feature, result })
    : undefined;
  const packet = {
    schema_version: "kamdar-weekly-feature-judge-packet@2.0.0",
    feature_id: feature.feature_id,
    claim: feature.claim,
    falsifier: feature.falsifier,
    context_id: frozenContext.context_id,
    context_sha256: sha256(readFileSync(contextPath)),
    result_sha256: sha256(readFileSync(resultPath)),
    candidate,
    ...(feature.feature_id === "FEAT-0005" ? { configuration_gaps: result.configuration_gaps } : {}),
    ...(runtimeEvidence ? { runtime_evidence: runtimeEvidence } : {}),
    frozen_context_evidence: weeklyContextSlice(frozenContext, feature, candidate),
    seed_controls: feature.entity_ids.map((id) => ({ id, group: entities.get(id)?.group })).filter((row) => row.group),
    assertions: feature.assertions,
    judge_policy: {
      tiers: ["A", "B", "C", "D"],
      passing_tier: "A",
      evidence_rule: feature.feature_id === "FEAT-0007"
        ? "Judge the candidate against both exact frozen Project-Draft evidence and the bound runtime_evidence receipt/read-back slice. Seed controls establish identity only; missing frozen or runtime evidence is tier D."
        : "Judge only the candidate and exact frozen Project-Draft evidence in this packet. Seed controls establish identity only; missing runtime evidence is tier D.",
      output_shape: {
        packet_sha256: "exact packet_sha256 supplied by this packet",
        rubric: {
          groundedness: "A|B|C|D",
          completeness: "A|B|C|D",
          usefulness: "A|B|C|D",
          repeatability: "A|B|C|D",
          length_balance: "A|B|C|D",
        },
      },
    },
  };
  return { ...packet, packet_sha256: packetDigest(packet) };
}
export function validateWeeklyFeatureJudgeVerdict(verdict, feature, { runRoot, verdictPath, expectedPacketSha256 }) {
  const expectedVerdictPath = resolve(runRoot, verdictPath);
  if (!isObject(verdict)
    || verdict.lane !== "tester"
    || verdict.target !== feature.feature_id
    || verdict.claim_under_test !== feature.claim
    || !["A", "B", "C", "D"].includes(verdict.tier)
    || !Array.isArray(verdict.test_cases)
    || !verdict.test_cases.length
    || !Array.isArray(verdict.assertions)
    || !Array.isArray(verdict.evidence)
    || !verdict.evidence.length
    || !Array.isArray(verdict.failures)
    || !Array.isArray(verdict.artifacts)
    || !verdict.artifacts.length
    || !Array.isArray(verdict.blockers)
    || typeof verdict.verdict_path !== "string"
    || !isAbsolute(verdict.verdict_path)
    || verdict.verdict_path !== expectedVerdictPath
    || typeof verdict.packet_sha256 !== "string") fail(`${feature.feature_id} tester verdict is malformed or lacks the exact absolute manifest verdict path ${expectedVerdictPath}.`);
  if (verdict.packet_sha256 !== expectedPacketSha256) fail(`${feature.feature_id} tester verdict is not bound to the current packet hash.`);
  if (verdict.rubric === undefined) fail(`${feature.feature_id} tester verdict is missing the required five-grade rubric.`);
  validateJudgeRubric(verdict.rubric, `${feature.feature_id} judge rubric`);
  if (verdict.assertions.length !== feature.assertions.length) fail(`${feature.feature_id} must return one check per assertion.`);
  for (const assertion of feature.assertions) {
    const check = verdict.assertions.find((row) => row.assertion === assertion);
    if (!check || typeof check.met !== "boolean" || !Array.isArray(check.evidence) || !check.evidence.length) fail(`${feature.feature_id} lacks cited evidence for: ${assertion}`);
  }
  const pass = verdict.tier === "A" && verdict.assertions.every((row) => row.met) && (!verdict.failures || verdict.failures.length === 0);
  return { feature_id: feature.feature_id, tier: verdict.tier, pass };
}

export function reconcileJudgedWeeklyRun({ runRoot, deterministic, suite = loadWeeklyReviewEvalSuite() }) {
  const deterministicArtifact = readJson(resolve(runRoot, artifactByKind(suite, "deterministic-checks")));
  if (deterministicArtifact.pass !== true || deterministicArtifact.context_id !== deterministic.context.context_id || deterministicArtifact.weekly_result_sha256 !== sha256(readFileSync(resolve(runRoot, artifactByKind(suite, "weekly-review-result"))))) fail("saved deterministic evidence does not match the validated immutable run.");
  const featureVerdicts = suite.features.map((feature) => {
    const verdictPath = artifactByKind(suite, `feature-judge:${feature.feature_id}`);
    const packet = buildWeeklyFeatureJudgePacket({ featureId: feature.feature_id, result: deterministic.result, context: deterministic.context, runRoot, suite });
    return validateWeeklyFeatureJudgeVerdict(readJson(resolve(runRoot, verdictPath)), feature, { runRoot, verdictPath, expectedPacketSha256: packet.packet_sha256 });
  });
  const review = readJson(resolve(runRoot, artifactByKind(suite, "independent-evidence-review")));
  if (!isObject(review)
    || review.lane !== "evidence-review"
    || review.independent !== true
    || !["pass", "fail", "blocked"].includes(review.verdict)
    || typeof review.claim_under_test !== "string"
    || !review.claim_under_test.trim()
    || !isObject(review.reviewed_tiers)
    || !Array.isArray(review.unsupported_claims)
    || !Array.isArray(review.scope_mismatch)
    || !Array.isArray(review.missing_evidence)
    || !Array.isArray(review.weak_artifacts)
    || !Array.isArray(review.rerun_instructions)
    || !Array.isArray(review.fix_candidates)) fail("independent evidence review is malformed.");
  if (JSON.stringify(Object.keys(review.reviewed_tiers).sort()) !== JSON.stringify([...featureIds])) fail("evidence review must inspect all three feature verdicts.");
  for (const verdict of featureVerdicts) if (review.reviewed_tiers[verdict.feature_id] !== verdict.tier) fail(`evidence review cannot silently change ${verdict.feature_id}'s tier.`);
  const integrations = readJson(resolve(runRoot, artifactByKind(suite, "mock-integration-checks")));
  if (!isObject(integrations) || integrations.pass !== true || integrations.receipt_sha256 !== deterministic.integrations.receipt_sha256 || integrations.read_back_sha256 !== deterministic.integrations.read_back_sha256) fail("saved integration checks do not match validated receipt and read-back evidence.");
  const qualityPath = resolve(runRoot, artifactByKind(suite, "artifact-quality-review"));
  const resultPath = resolve(runRoot, artifactByKind(suite, "weekly-review-result"));
  const quality = validateArtifactQualityReview({ rawReview: readJson(qualityPath), result: deterministic.result, resultBytes: readFileSync(resultPath), scope: "weekly", expectedReviewPath: qualityPath });
  const pass = deterministic.pass && featureVerdicts.every((row) => row.pass) && review.verdict === "pass" && quality.pass && integrations.pass;
  const expected = { pass, deterministic: true, integrations: true, evidence_review: review.verdict, artifact_quality_review: quality, feature_tiers: Object.fromEntries(featureVerdicts.map((row) => [row.feature_id, row.tier])) };
  const saved = readJson(resolve(runRoot, artifactByKind(suite, "suite-result")));
  if (stableJson(saved) !== stableJson(expected)) fail("saved suite result does not match reconciled evidence.");
  return expected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const runRoot = process.argv[2];
  const stage = process.argv.includes("--judged") ? "judged" : "base";
  if (!runRoot) fail("usage: node unified-weekly-review-eval.mjs <run-root> [--judged]");
  const deterministic = validateUnifiedWeeklyRun({ runRoot, stage });
  const output = stage === "judged" ? reconcileJudgedWeeklyRun({ runRoot, deterministic }) : deterministic;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.pass) process.exitCode = 1;
}

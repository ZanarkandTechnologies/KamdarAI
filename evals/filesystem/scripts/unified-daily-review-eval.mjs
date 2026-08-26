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
import { DailyContextDiffSchema } from "../../../automations/schemas/daily-context-diff.zod.mjs";
import {
  DailyIntegrationReceiptSchema,
  assertDailyProcessingSafety,
} from "../../../automations/schemas/daily-integration-receipt.zod.mjs";
import { DailyIdempotencyRerunReceiptSchema } from "../../../automations/schemas/daily-idempotency-rerun-receipt.zod.mjs";
import {
  validateCompanyOperatingEvalSuite,
  validateJudgeRubric,
} from "./company-operating-eval-contract.mjs";
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
function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}
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
  if (suite.schema_version !== "kamdar-daily-review-evals@2.0.0") fail("suite schema_version is unsupported.");
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
  return validateCompanyOperatingEvalSuite(suite, {
    knownIntegrationGateIds: integrationGateIds,
    label: "Unified Daily review eval",
  });
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
  for (const entry of row?.draft_entries || []) {
    for (const id of entry.workflow_observation?.actor_person_ids || []) ids.add(id);
    for (const id of entry.problem_baseline?.affected_people || []) ids.add(id);
    if (entry.problem_baseline?.measurement_owner_person_id) ids.add(entry.problem_baseline.measurement_owner_person_id);
  }
  return [...ids];
}

function parsedOrFail(schema, value, label) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) fail(`${label} failed Zod validation: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return parsed.data;
}

function currentSectionText(project, section) {
  return {
    Overview: project.current_sections.overview,
    "Project knowledge": project.current_sections.project_knowledge,
    "This week's attention": project.current_sections.this_weeks_attention,
  }[section];
}

function dailyContextSlice(context, feature, candidate) {
  const wanted = new Set([...feature.entity_ids, ...candidate.flatMap(rowSourceIds)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of [...context.projects, ...context.work_items, ...context.meetings, ...context.people]) {
      if (!wanted.has(row.id) && !wanted.has(row.source_id)) continue;
      for (const id of [row.id, row.source_id, row.project_id, row.owner_person_id].filter(Boolean)) {
        if (!wanted.has(id)) { wanted.add(id); changed = true; }
      }
    }
  }
  const select = (rows) => rows.filter((row) => wanted.has(row.id) || wanted.has(row.source_id));
  const sourceManifest = context.source_manifest.filter((row) => row.source_ids.some((id) => wanted.has(id)));
  return {
    artifact_type: context.artifact_type,
    artifact_version: context.artifact_version,
    context_id: context.context_id,
    local_day: context.local_day,
    evidence_window: context.evidence_window,
    source_manifest: sourceManifest,
    projects: select(context.projects),
    work_items: select(context.work_items),
    meetings: select(context.meetings),
    people: select(context.people),
  };
}

function packetDigest(packetWithoutHash) { return sha256(stableJson(packetWithoutHash)); }

export function validateDailyIdempotencyRerun({
  rawRerun,
  originalReceipt,
  originalReceiptBytes,
  contextBytes,
  resultBytes,
  context,
}) {
  const rerun = parsedOrFail(DailyIdempotencyRerunReceiptSchema, rawRerun, "Daily idempotency rerun receipt");
  if (rerun.original_receipt_id !== originalReceipt.receipt_id
    || rerun.original_receipt_sha256 !== sha256(originalReceiptBytes)
    || rerun.source_context_id !== context.context_id
    || rerun.source_context_sha256 !== sha256(contextBytes)
    || rerun.daily_result_id !== originalReceipt.daily_result_id
    || rerun.daily_result_sha256 !== sha256(resultBytes)) {
    fail("Daily idempotency rerun receipt is not bound to the exact context, result, and original receipt bytes.");
  }

  const audits = new Map(rerun.audit_effects.map((row) => [row.original_effect_id, row]));
  if (audits.size !== originalReceipt.effects.length) fail("Daily idempotency rerun must audit every and only original effect.");
  for (const effect of originalReceipt.effects) {
    const audit = audits.get(effect.effect_id);
    if (!audit) fail(`Daily idempotency rerun lacks original effect ${effect.effect_id}.`);
    if (audit.result_pointer !== effect.result_pointer
      || audit.target_id !== effect.target.target_id
      || audit.payload_hash !== effect.payload_hash) fail(`Daily idempotency rerun evidence is stale for ${effect.effect_id}.`);
    if (audit.original_outcome !== effect.outcome.state) fail(`Daily idempotency rerun does not bind the original outcome for ${effect.effect_id}.`);
    const expectedOutcome = ["applied", "duplicate", "delivered_to_eval_sink"].includes(effect.outcome.state)
      ? "duplicate"
      : effect.outcome.state;
    if (audit.outcome !== expectedOutcome) fail(`Daily idempotency rerun outcome does not match original effect ${effect.effect_id}.`);
    if (expectedOutcome === "duplicate") {
      if (!audit.lookup_read_back
        || audit.lookup_read_back.provider_response_id !== effect.outcome.provider_response?.response_id
        || audit.lookup_read_back.target_id !== effect.target.target_id
        || audit.lookup_read_back.payload_hash !== effect.payload_hash
        || audit.lookup_read_back.matched !== true
        || audit.lookup_read_back.created !== false) fail(`Daily duplicate audit lacks matching lookup/read-back for ${effect.effect_id}.`);
    }
  }

  const processing = new Map(rerun.work_processing.map((row) => [row.work_item_id, row]));
  if (processing.size !== originalReceipt.work_processing.length) fail("Daily idempotency rerun must audit every and only Work processing row.");
  for (const original of originalReceipt.work_processing) {
    const observed = processing.get(original.work_item_id);
    if (!observed
      || observed.original_state !== original.state
      || observed.rerun_state !== original.state
      || observed.status_after !== original.status_after
      || observed.daily_review_version_after !== original.daily_review_version_after
      || observed.changed !== false) fail(`Daily idempotency rerun changed processing state for ${original.work_item_id}.`);
  }
  return {
    pass: true,
    rerun_receipt_sha256: sha256(stableJson(rerun)),
    audited_effects: rerun.audit_effects.length,
    duplicate_effects: rerun.summary.duplicate_count,
    no_findings: rerun.summary.no_finding_count,
    unresolved_nonmutating_effects: rerun.summary.blocked_count + rerun.summary.conflicted_count + rerun.summary.failed_count,
    new_provider_mutations: 0,
    processing_changes: 0,
  };
}

export function validateUnifiedDailyRun({ runRoot, suite = loadDailyReviewEvalSuite(), seed = loadKamdarSeedConfig(), stage = "base" }) {
  const inventory = assertExactRunArtifacts(runRoot, suite, { stage });
  const artifact = (kind) => suite.run_artifacts.find((item) => item.kind === kind)?.path;
  for (const kind of ["daily-context", "daily-review-result", "daily-integration-receipt", "daily-idempotency-rerun-receipt"]) if (!artifact(kind)) fail(`suite lacks ${kind} artifact.`);
  const contextPath = resolve(runRoot, artifact("daily-context"));
  const contextBytes = readFileSync(contextPath);
  const context = parsedOrFail(DailyContextDiffSchema, readJson(contextPath, "Daily context"), "Daily context");
  const resultPath = resolve(runRoot, artifact("daily-review-result"));
  const resultBytes = readFileSync(resultPath);
  const rawResult = readJson(resultPath, "Daily review result");
  const receiptPath = resolve(runRoot, artifact("daily-integration-receipt"));
  const receiptBytes = readFileSync(receiptPath);
  const rawReceipt = readJson(receiptPath, "Daily integration receipt");
  const rawRerun = readJson(resolve(runRoot, artifact("daily-idempotency-rerun-receipt")), "Daily idempotency rerun receipt");
  const parsedResult = DailyReviewResultSchema.safeParse(rawResult);
  if (!parsedResult.success) fail(`Daily review result failed Zod validation: ${parsedResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const parsedReceipt = DailyIntegrationReceiptSchema.safeParse(rawReceipt);
  if (!parsedReceipt.success) fail(`Daily integration receipt failed Zod validation: ${parsedReceipt.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  assertDailyProcessingSafety(parsedReceipt.data);
  if (parsedResult.data.context_id !== context.context_id) fail("Daily result context_id does not match the collected context.");
  if (parsedReceipt.data.source_context_id !== context.context_id || parsedReceipt.data.daily_result_sha256 !== sha256(resultBytes)) fail("receipt linkage does not match the exact context/result artifacts.");
  const idempotency = validateDailyIdempotencyRerun({
    rawRerun,
    originalReceipt: parsedReceipt.data,
    originalReceiptBytes: receiptBytes,
    contextBytes,
    resultBytes,
    context,
  });
  for (const [index, chase] of parsedResult.data.weekly_progress_chases.entries()) {
    const effect = parsedReceipt.data.effects.find((row) => row.result_pointer === `/weekly_progress_chases/${index}`);
    if (!effect || effect.feature_id !== "FEAT-0003" || effect.integration !== "telegram" || effect.operation !== "send_owner_chase") fail(`FEAT-0003 chase ${index} lacks its Telegram integration effect.`);
    if (effect.target.target_id !== chase.owner_person_id || effect.outcome.state !== "delivered_to_eval_sink" || effect.outcome.delivery_scope !== "operator_owned_eval_sink" || effect.outcome.intended_recipient_person_id !== chase.owner_person_id || effect.outcome.destination_matched !== true || effect.outcome.configured_destination_hash !== effect.outcome.provider_destination_hash) fail(`FEAT-0003 chase ${index} lacks destination-bound eval-sink provider proof.`);
    if (!effect.outcome.provider_response.response_id || !effect.outcome.read_back.matched || effect.outcome.read_back.payload_hash !== effect.payload_hash) fail(`FEAT-0003 chase ${index} lacks a matching provider receipt and read-back.`);
  }

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
  const projects = new Map(context.projects.map((row) => [row.id, row]));
  for (const update of parsedResult.data.project_updates) {
    const project = projects.get(update.project_id);
    if (!project) fail(`Project update ${update.project_id} has no frozen Project source.`);
    for (const replacement of update.section_replacements) {
      if (replacement.expected_current_text !== currentSectionText(project, replacement.section)) {
        fail(`${update.project_id} ${replacement.section} expected-current text does not match the frozen Project section.`);
      }
    }
  }
  return {
    pass: true,
    stage,
    inventory,
    context,
    context_sha256: sha256(contextBytes),
    result: parsedResult.data,
    result_sha256: sha256(resultBytes),
    receipt: parsedReceipt.data,
    idempotency,
    feature_checks: featureChecks,
  };
}

export function buildFeatureJudgePacket({ featureId, result, context, runRoot, suite = loadDailyReviewEvalSuite(), seed = loadKamdarSeedConfig() }) {
  const feature = suite.features.find((item) => item.feature_id === featureId);
  if (!feature) fail(`unknown judge feature ${featureId}.`);
  if (!runRoot) fail("judge packet construction requires the exact run root.");
  const entities = entityIndex(seed);
  const verdictArtifact = suite.run_artifacts.find((item) => item.kind === `feature-judge:${feature.feature_id}`);
  if (!verdictArtifact) fail(`suite lacks judge artifact for ${feature.feature_id}.`);
  const verdictPath = resolve(runRoot, verdictArtifact.path);
  const contextPath = resolve(runRoot, suite.run_artifacts.find((item) => item.kind === "daily-context").path);
  const resultPath = resolve(runRoot, suite.run_artifacts.find((item) => item.kind === "daily-review-result").path);
  const fileContext = parsedOrFail(DailyContextDiffSchema, readJson(contextPath, "Daily context"), "Daily context");
  const fileResult = readJson(resultPath, "Daily result");
  if (context && stableJson(context) !== stableJson(fileContext)) fail("judge packet context does not match the exact frozen context bytes.");
  if (stableJson(result) !== stableJson(fileResult)) fail("judge packet candidate does not match the exact frozen result bytes.");
  const frozenContext = fileContext;
  const candidate = resultSlice(result, feature.result_path);
  const packet = {
    schema_version: "kamdar-feature-judge-packet@2.0.0",
    feature_id: feature.feature_id,
    claim: feature.claim,
    context_id: frozenContext.context_id,
    context_sha256: sha256(readFileSync(contextPath)),
    result_sha256: sha256(readFileSync(resultPath)),
    candidate,
    frozen_context_evidence: dailyContextSlice(frozenContext, feature, candidate),
    seed_controls: feature.entity_ids.map((id) => ({ id, group: entities.get(id)?.group })).filter((row) => row.group),
    assertions: feature.assertions,
    judge_policy: {
      tiers: ["A", "B", "C", "D"],
      pass_tier: "A",
      evidence_rule: "Judge only the candidate and exact frozen-context evidence in this packet. Seed controls establish identity only and cannot support a factual claim.",
      output_shape: {
        feature_id: feature.feature_id,
        tier: "A|B|C|D",
        verdict: "pass|fail|blocked",
        rubric: {
          groundedness: "A|B|C|D",
          completeness: "A|B|C|D",
          usefulness: "A|B|C|D",
          repeatability: "A|B|C|D",
          length_balance: "A|B|C|D",
        },
        assertions: [{ assertion: "exact authored assertion", met: true, evidence_refs: ["seed ID plus candidate JSON path"] }],
        evidence_refs: ["all unique evidence references cited by assertions"],
        failures: [],
        verdict_path: verdictPath,
        packet_sha256: "exact packet_sha256 supplied by this packet",
      },
    },
  };
  return { ...packet, packet_sha256: packetDigest(packet) };
}

export function validateFeatureJudgeVerdict(verdict, feature, { expectedVerdictPath, expectedPacketSha256 } = {}) {
  if (!isObject(verdict)
    || verdict.feature_id !== feature.feature_id
    || !["A", "B", "C", "D"].includes(verdict.tier)
    || !["pass", "fail", "blocked"].includes(verdict.verdict)
    || !Array.isArray(verdict.assertions)
    || !Array.isArray(verdict.evidence_refs)
    || !Array.isArray(verdict.failures)
    || typeof verdict.verdict_path !== "string"
    || typeof verdict.packet_sha256 !== "string") {
    fail(`${feature.feature_id} judge verdict is malformed.`);
  }
  if (verdict.rubric === undefined) fail(`${feature.feature_id} judge verdict is missing the required five-grade rubric.`);
  validateJudgeRubric(verdict.rubric, `${feature.feature_id} judge rubric`);
  if (verdict.verdict_path !== expectedVerdictPath) fail(`${feature.feature_id} judge verdict_path must equal ${expectedVerdictPath}.`);
  if (verdict.packet_sha256 !== expectedPacketSha256) fail(`${feature.feature_id} judge verdict is not bound to the current packet hash.`);
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
  const deterministicArtifact = suite.run_artifacts.find((item) => item.kind === "deterministic-checks");
  if (!deterministicArtifact) fail("suite lacks a deterministic-checks artifact.");
  const savedDeterministic = readJson(resolve(runRoot, deterministicArtifact.path));
  if (savedDeterministic.pass !== true
    || savedDeterministic.context_id !== deterministic.context.context_id
    || savedDeterministic.daily_result_sha256 !== sha256(readFileSync(resolve(runRoot, suite.run_artifacts.find((item) => item.kind === "daily-review-result").path)))) {
    fail("saved deterministic evidence does not match the validated Daily run.");
  }
  const featureVerdicts = suite.features.map((feature) => {
    const artifact = suite.run_artifacts.find((item) => item.kind === `feature-judge:${feature.feature_id}`);
    if (!artifact) fail(`suite lacks judge artifact for ${feature.feature_id}.`);
    const verdictPath = resolve(runRoot, artifact.path);
    const packet = buildFeatureJudgePacket({ featureId: feature.feature_id, result: deterministic.result, context: deterministic.context, runRoot, suite });
    return validateFeatureJudgeVerdict(readJson(verdictPath), feature, { expectedVerdictPath: verdictPath, expectedPacketSha256: packet.packet_sha256 });
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
  const expected = { pass, deterministic: deterministic.pass, feature_verdicts: featureVerdicts, evidence_review: review.verdict, artifact_quality_review: quality, integrations };
  const suiteResultArtifact = suite.run_artifacts.find((item) => item.kind === "suite-result");
  if (!suiteResultArtifact) fail("suite lacks a suite-result artifact.");
  const saved = readJson(resolve(runRoot, suiteResultArtifact.path));
  if (stableJson(saved) !== stableJson(expected)) fail("saved suite result does not match reconciled evidence.");
  return expected;
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

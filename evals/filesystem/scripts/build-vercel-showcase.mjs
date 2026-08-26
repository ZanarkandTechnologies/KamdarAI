/** Build an internal or customer-safe eval dashboard from judged runs. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { ArtifactQualityReviewSchema } from "../../../automations/schemas/artifact-quality-review.zod.mjs";
import { validateEvalCandidateProvenance } from "../../../automations/schemas/eval-candidate-provenance.zod.mjs";
import {
  createPresentationEligibilityManifest,
  sha256Bytes,
  validatePresentationEligibilityManifest,
} from "../../../automations/schemas/presentation-eligibility.zod.mjs";
import { JudgeRubricSchema } from "./company-operating-eval-contract.mjs";
import { buildEvalDashboardModel, discoverLatestSuiteRun } from "./eval-dashboard-model.mjs";
import { renderEvalDashboardHtml } from "./eval-dashboard-html.mjs";
import { validateArtifactQualityReview } from "./quality-review-contracts.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");
const defaultOutputDirectory = resolve(filesystemRoot, ".vercel-static");
const dailySuitePath = resolve(repoRoot, "evals/daily-review-evals.json");
const weeklySuitePath = resolve(repoRoot, "evals/weekly-review-evals.json");

function readJson(path, label = path) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new Error(`Invalid JSON in ${label}: ${error.message}`); }
}

function inside(root, path, label) {
  const target = resolve(path);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`${label} escapes the presentation deployment.`);
  return target;
}

function artifactByKind(suite, kind) {
  const artifact = suite.run_artifacts.find((item) => item.kind === kind);
  if (!artifact) throw new Error(`Suite ${suite.suite} does not declare ${kind}.`);
  return artifact;
}

function declaredArtifactPath(runRoot, suite, kind) {
  return inside(runRoot, resolve(runRoot, artifactByKind(suite, kind).path), `${kind} artifact`);
}

function hashFile(path) { return sha256Bytes(readFileSync(path)); }

function laneBinding({ deploymentRoot, runRoot, suitePath }) {
  const suite = readJson(suitePath, "presentation suite");
  return {
    pass: true,
    artifact_quality_pass: true,
    run_root: relative(deploymentRoot, runRoot).replaceAll("\\", "/"),
    suite_sha256: hashFile(suitePath),
    suite_result_sha256: hashFile(declaredArtifactPath(runRoot, suite, "suite-result")),
    artifact_quality_review_sha256: hashFile(declaredArtifactPath(runRoot, suite, "artifact-quality-review")),
    feature_judge_sha256: Object.fromEntries(suite.features.map(({ feature_id }) => [
      feature_id,
      hashFile(declaredArtifactPath(runRoot, suite, `feature-judge:${feature_id}`)),
    ])),
  };
}

function verifyPresentationLane({ deploymentRoot, laneName, lane, suitePath }) {
  const runRoot = inside(deploymentRoot, resolve(deploymentRoot, lane.run_root), `${laneName} run root`);
  const suite = readJson(suitePath, `${laneName} suite`);
  if (hashFile(suitePath) !== lane.suite_sha256) throw new Error(`${laneName} suite hash does not match the eligibility manifest.`);
  const resultPath = declaredArtifactPath(runRoot, suite, "suite-result");
  const qualityPath = declaredArtifactPath(runRoot, suite, "artifact-quality-review");
  if (hashFile(resultPath) !== lane.suite_result_sha256) throw new Error(`${laneName} suite-result hash does not match the eligibility manifest.`);
  if (hashFile(qualityPath) !== lane.artifact_quality_review_sha256) throw new Error(`${laneName} artifact-quality hash does not match the eligibility manifest.`);

  const suiteResult = readJson(resultPath, `${laneName} suite result`);
  if (lane.pass !== true || lane.artifact_quality_pass !== true || suiteResult.pass !== true
    || suiteResult.artifact_quality_review?.pass !== true || suiteResult.artifact_quality_review?.tier !== "A") {
    throw new Error(`${laneName} presentation lane is not fully passing with tier-A artifact quality.`);
  }
  const quality = ArtifactQualityReviewSchema.parse(readJson(qualityPath, `${laneName} artifact quality review`));
  if (quality.tier !== "A" || quality.verdict !== "pass") throw new Error(`${laneName} artifact quality review is not presentation eligible.`);
  const reviewKind = laneName === "daily" ? "daily-review-result" : "weekly-review-result";
  const reviewResultPath = declaredArtifactPath(runRoot, suite, reviewKind);
  const reviewResultBytes = readFileSync(reviewResultPath);
  validateArtifactQualityReview({ rawReview: quality, result: JSON.parse(reviewResultBytes), resultBytes: reviewResultBytes, scope: laneName, expectedReviewPath: qualityPath });

  const expectedFeatureIds = suite.features.map(({ feature_id }) => feature_id).sort();
  if (JSON.stringify(Object.keys(lane.feature_judge_sha256).sort()) !== JSON.stringify(expectedFeatureIds)) throw new Error(`${laneName} manifest does not bind every feature judge exactly once.`);
  for (const featureId of expectedFeatureIds) {
    const judgePath = declaredArtifactPath(runRoot, suite, `feature-judge:${featureId}`);
    if (hashFile(judgePath) !== lane.feature_judge_sha256[featureId]) throw new Error(`${featureId} judge hash does not match the eligibility manifest.`);
    if (!JudgeRubricSchema.safeParse(readJson(judgePath, `${featureId} judge`).rubric).success) throw new Error(`${featureId} presentation judge lacks the five-grade rubric.`);
  }
  return runRoot;
}

export function writePresentationEligibilityManifest({ deploymentRoot, generatedAt = new Date().toISOString(), outputPath = null, dailySuite = dailySuitePath, weeklySuite = weeklySuitePath } = {}) {
  if (!deploymentRoot) throw new Error("deploymentRoot is required to write presentation eligibility.");
  const root = resolve(deploymentRoot);
  const provenancePath = resolve(root, "candidate-provenance.json");
  const provenance = validateEvalCandidateProvenance(readJson(provenancePath, "candidate provenance"));
  if (provenance.origin !== "agent_execution") {
    throw new Error("Presentation eligibility requires a real agent_execution candidate; reference fixtures cannot be presented as evaluated answers.");
  }
  const dailySuiteValue = readJson(resolve(dailySuite), "Daily presentation suite");
  const weeklySuiteValue = readJson(resolve(weeklySuite), "Weekly presentation suite");
  const dailyResultHash = hashFile(declaredArtifactPath(resolve(root, "daily-eval"), dailySuiteValue, "daily-review-result"));
  const weeklyResultHash = hashFile(declaredArtifactPath(resolve(root, "weekly-eval"), weeklySuiteValue, "weekly-review-result"));
  if (provenance.daily_result_sha256 !== dailyResultHash || provenance.weekly_result_sha256 !== weeklyResultHash) {
    throw new Error("Candidate provenance does not bind the exact Daily and Weekly agent outputs.");
  }
  const value = createPresentationEligibilityManifest({
    deploymentId: basename(root),
    generatedAt,
    candidateProvenanceSha256: hashFile(provenancePath),
    daily: laneBinding({ deploymentRoot: root, runRoot: resolve(root, "daily-eval"), suitePath: resolve(dailySuite) }),
    weekly: laneBinding({ deploymentRoot: root, runRoot: resolve(root, "weekly-eval"), suitePath: resolve(weeklySuite) }),
  });
  verifyPresentationLane({ deploymentRoot: root, laneName: "daily", lane: value.daily, suitePath: resolve(dailySuite) });
  verifyPresentationLane({ deploymentRoot: root, laneName: "weekly", lane: value.weekly, suitePath: resolve(weeklySuite) });
  const target = inside(root, resolve(outputPath || resolve(root, "presentation-eligibility.json")), "presentation eligibility manifest");
  if (dirname(target) !== root) throw new Error("Presentation eligibility manifest must be written at the deployment root.");
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  return { path: target, manifest: value, sha256: hashFile(target) };
}

export function resolvePresentationSuiteRuns({ manifestPath, dailySuite = dailySuitePath, weeklySuite = weeklySuitePath }) {
  if (!manifestPath) throw new Error("Presentation builds require a hash-bound eligibility manifest.");
  const path = resolve(manifestPath);
  const deploymentRoot = dirname(path);
  const manifest = validatePresentationEligibilityManifest(readJson(path, "presentation eligibility manifest"));
  const provenancePath = resolve(deploymentRoot, "candidate-provenance.json");
  if (hashFile(provenancePath) !== manifest.candidate_provenance_sha256) throw new Error("Candidate provenance hash does not match the eligibility manifest.");
  const provenance = validateEvalCandidateProvenance(readJson(provenancePath, "candidate provenance"));
  if (provenance.origin !== "agent_execution") throw new Error("Presentation candidate is not a real agent execution.");
  return {
    manifest,
    manifest_path: path,
    manifest_sha256: hashFile(path),
    suite_runs: [
      { suitePath: resolve(dailySuite), runRoot: verifyPresentationLane({ deploymentRoot, laneName: "daily", lane: manifest.daily, suitePath: resolve(dailySuite) }) },
      { suitePath: resolve(weeklySuite), runRoot: verifyPresentationLane({ deploymentRoot, laneName: "weekly", lane: manifest.weekly, suitePath: resolve(weeklySuite) }) },
    ],
  };
}

function publicEntity(entity, labels) {
  const value = {
    presentation: true, entity_type: entity.entity_type, id: entity.name || entity.id, name: entity.name || entity.entity_type,
    status: entity.status, department: entity.department, owner: labels[entity.owner] || entity.owner,
    project: labels[entity.project] || entity.project, due: entity.due, priority: entity.priority, progress: entity.progress,
    completed_at: entity.completed_at, processed: entity.processed, role: entity.role, date: entity.date,
    overview: entity.overview, knowledge: entity.knowledge, attention: entity.attention, notes: entity.notes,
    purpose: entity.purpose, problem: entity.problem, decision: entity.decision, commitments: entity.commitments,
    follow_up: entity.follow_up, attendees: entity.attendees, sections: entity.sections, week_start: entity.week_start,
    version: entity.version, finalized_at: entity.finalized_at,
  };
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined));
}

function publicOutput(output) {
  if (output.kind === "project-section-replacements") return {
    kind: output.kind,
    target_label: output.target_label,
    change_summary: output.change_summary,
    delivery_state: output.delivery_state,
    delivery_reason: output.delivery_reason,
    read_back_state: output.read_back_state,
    sections: output.sections.map(({ section, actual_current_text, replacement_text, matches }) => ({
      section, actual_current_text, replacement_text, matches,
    })),
  };
  return Object.fromEntries(Object.entries({
    kind: output.kind,
    heading: output.heading,
    target_label: output.target_label,
    state: output.state,
    meta: output.meta,
    summary: output.summary,
    body: output.body,
    entries: output.entries,
    note: output.note,
    gaps: output.gaps,
  }).filter(([, value]) => value !== undefined));
}

export function toPublicDashboardModel(model, { deploymentId, validatedAt }) {
  const humanCheck = (value, labels) => {
    const exact = {
      "effects-match-receipt": "Prepared changes match the applied receipt.",
      "read-back-matches-intent": "Read-back matches the approved changes.",
      "processing-safety": "Work stays open when a required change is unresolved.",
      idempotency: "An unchanged rerun creates no new effects.",
    };
    const friendly = Object.entries(exact).reduce((text, [technical, plain]) => text.replaceAll(technical, plain), value);
    return Object.entries(labels)
      .sort(([left], [right]) => right.length - left.length)
      .reduce((text, [id, label]) => text.replaceAll(id, label), friendly);
  };
  const groups = model.groups.map((group, groupIndex) => ({
    suite_id: `workflow-${groupIndex + 1}`,
    title: group.title,
    cases: group.cases.map((row, rowIndex) => ({
      presentation: true,
      row_id: `scenario-${groupIndex + 1}-${rowIndex + 1}`,
      title: row.title,
      tags: [],
      given: row.given,
      when: row.when,
      expected: row.expected,
      status: row.status,
      summary: row.summary,
      starting_entities: row.starting_entities.map((entity) => publicEntity(entity, row.entity_labels)),
      entity_labels: {},
      result: {
        status: row.result.status,
        reason: row.result.reason,
        required_checks: row.result.required_checks.map(({ assertion, met, evidence }) => ({
          assertion: humanCheck(assertion, row.entity_labels),
          met,
          evidence: (evidence || []).map((item) => humanCheck(item, row.entity_labels)
            .replaceAll("candidate", "agent output")
            .replaceAll("frozen_context_evidence", "source context")),
        })),
        required_summary: row.result.required_summary,
        quality_metrics: row.result.quality_metrics.map(({ key, label, grade, score, matched, total, status }) => ({ key, label, grade, score, matched, total, status })),
        artifact_quality: { status: row.result.artifact_quality.status, findings: row.result.artifact_quality.findings },
      },
      observed: {
        facts: row.observed.output_views.length ? [] : row.observed.facts.map(({ state, reason }) => ({ label: "Observed outcome", state, reason })),
        output_views: row.observed.output_views.map(publicOutput),
      },
    })),
  }));
  const validatedDate = new Date(validatedAt);
  if (Number.isNaN(validatedDate.valueOf())) throw new Error("Presentation validation timestamp is invalid.");
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][validatedDate.getUTCMonth()];
  return {
    schema_version: "kamdar-public-eval-dashboard@1.0.0",
    presentation: true,
    title: "Kamdar Company OS evaluation",
    evidence_window: model.evidence_window,
    validated_label: `Validated ${validatedDate.getUTCDate()} ${month} ${validatedDate.getUTCFullYear()}`,
    deployment: { id: deploymentId },
    totals: model.totals,
    features: model.features.map(({ title }) => ({ title })),
    groups,
  };
}

export function buildVercelShowcase({ outputDirectory = defaultOutputDirectory, mode = "presentation", presentationManifestPath = null, dailyRunRoot = null, weeklyRunRoot = null, operatedEvidencePath = null } = {}) {
  if (!["presentation", "internal"].includes(mode)) throw new Error(`Unknown dashboard build mode: ${mode}`);
  const destination = resolve(outputDirectory);
  const selection = mode === "presentation"
    ? resolvePresentationSuiteRuns({ manifestPath: presentationManifestPath })
    : { manifest: null, manifest_sha256: null, suite_runs: [
      { suitePath: dailySuitePath, runRoot: dailyRunRoot ? resolve(dailyRunRoot) : discoverLatestSuiteRun({ suitePath: dailySuitePath }) },
      { suitePath: weeklySuitePath, runRoot: weeklyRunRoot ? resolve(weeklyRunRoot) : discoverLatestSuiteRun({ suitePath: weeklySuitePath }) },
    ] };
  const internalModel = buildEvalDashboardModel({ suiteRuns: selection.suite_runs, operatedEvidencePath });
  const model = mode === "presentation" ? toPublicDashboardModel(internalModel, {
    deploymentId: selection.manifest.deployment_id,
    validatedAt: selection.manifest.generated_at,
  }) : internalModel;
  const html = renderEvalDashboardHtml(model);
  mkdirSync(destination, { recursive: true });
  const htmlBytes = Buffer.from(html, "utf8");
  const modelBytes = Buffer.from(`${JSON.stringify(model, null, 2)}\n`, "utf8");
  const indexPath = resolve(destination, "index.html");
  const modelPath = resolve(destination, mode === "presentation" ? "public-model.json" : "dashboard.json");
  const staleInternalModelPath = resolve(destination, "dashboard.json");
  if (mode === "presentation" && existsSync(staleInternalModelPath)) rmSync(staleInternalModelPath);
  writeFileSync(indexPath, htmlBytes);
  writeFileSync(modelPath, modelBytes);
  const receipt = {
    schema_version: "kamdar-dashboard-build-receipt@1.0.0",
    mode,
    deployment_id: selection.manifest?.deployment_id || null,
    eligibility_manifest_sha256: selection.manifest_sha256,
    index_html_sha256: sha256Bytes(htmlBytes),
    public_model_sha256: sha256Bytes(modelBytes),
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const receiptPath = resolve(destination, "build-receipt.json");
  writeFileSync(receiptPath, receiptBytes);
  return {
    output_directory: destination,
    index_html: indexPath,
    public_model: modelPath,
    build_receipt: receiptPath,
    public_model_sha256: receipt.public_model_sha256,
    build_receipt_sha256: sha256Bytes(receiptBytes),
    totals: model.totals,
    run_roots: selection.suite_runs.map(({ runRoot }) => relative(repoRoot, runRoot).replaceAll("\\", "/")),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const valueAfter = (flag) => {
    const index = process.argv.indexOf(flag);
    if (index < 0) return null;
    if (!process.argv[index + 1]) throw new Error(`Missing value after ${flag}`);
    return process.argv[index + 1];
  };
  const internal = process.argv.includes("--internal");
  const result = buildVercelShowcase({
    mode: internal ? "internal" : "presentation",
    presentationManifestPath: valueAfter("--presentation-manifest"),
    dailyRunRoot: valueAfter("--daily-run"),
    weeklyRunRoot: valueAfter("--weekly-run"),
    operatedEvidencePath: valueAfter("--operated-evidence"),
  });
  console.log(JSON.stringify(result));
}

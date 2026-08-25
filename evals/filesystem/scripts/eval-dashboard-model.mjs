import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");

const ArtifactSchema = z.strictObject({
  path: z.string().min(1),
  stage: z.string().min(1),
  kind: z.string().min(1)
});

const FeatureSchema = z.strictObject({
  feature_id: z.string().regex(/^FEAT-\d{4}$/),
  result_path: z.string().min(1),
  entity_ids: z.array(z.string().min(1)),
  claim: z.string().min(1),
  assertions: z.array(z.string().min(1)).min(1),
  falsifier: z.string().min(1).optional()
});

const CaseSchema = z.strictObject({
  id: z.string().min(1),
  prompt: z.string().min(1),
  feature_ids: z.array(z.string().regex(/^FEAT-\d{4}$/)).min(1),
  entity_ids: z.array(z.string().min(1)),
  hidden_assertions: z.array(z.string().min(1)).min(1)
});

const OperatedEvidenceSchema = z.strictObject({
  schema_version: z.literal("kamdar-operated-evidence@1.0.0"),
  deployment: z.string().min(1),
  root_url: z.string().url(),
  features: z.array(z.strictObject({
    feature_id: z.string().regex(/^FEAT-\d{4}$/),
    summary: z.string().min(1),
    urls: z.array(z.string().url()).min(1)
  })).min(1)
});

export const CompanyOperatingEvalSuiteSchema = z.strictObject({
  schema_version: z.string().min(1),
  suite: z.string().min(1),
  target: z.record(z.string(), z.unknown()),
  run_artifacts: z.array(ArtifactSchema).min(1),
  artifact_policy: z.record(z.string(), z.unknown()),
  features: z.array(FeatureSchema).min(1),
  cases: z.array(CaseSchema).min(1),
  judge_policy: z.record(z.string(), z.unknown()).optional(),
  integration_policy: z.record(z.string(), z.unknown()).optional()
});

function readJson(path, label = path) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}: ${error.message}`);
  }
}

function splitFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { fields: {}, body: markdown };
  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    fields[field[1]] = field[2].replace(/^['"]|['"]$/g, "");
  }
  return { fields, body: markdown.slice(match[0].length) };
}

function markdownSections(body) {
  const sections = {};
  let current = "Introduction";
  for (const line of body.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1];
      sections[current] = "";
      continue;
    }
    sections[current] = `${sections[current] || ""}${line}\n`;
  }
  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.trim()]));
}

function markdownSection(body, heading, level = 2) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = String(body || "");
  const match = new RegExp(`^#{${level}} ${escaped}\\s*$`, "m").exec(source);
  if (!match) return "";
  const start = match.index + match[0].length;
  const next = new RegExp(`^#{1,${level}}\\s+`, "m").exec(source.slice(start));
  return source.slice(start, next ? start + next.index : source.length).trim();
}

function boldField(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(body || "").match(new RegExp(`(?:^- )?\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, "mi"))?.[1]?.trim() || "";
}

function listLines(body) {
  return String(body || "").split("\n")
    .map((line) => line.match(/^[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function checklistLines(body) {
  return String(body || "").split("\n")
    .map((line) => line.match(/^-\s+(\[[x ]\]\s*.+)$/i)?.[1]?.trim())
    .filter(Boolean);
}

function plainText(body) {
  return String(body || "").split("\n")
    .filter((line) => line.trim() && !/^[-|#]/.test(line.trim()) && !/^\*\*.+:\*\*/.test(line.trim()))
    .join(" ").replace(/\*\*/g, "").trim();
}

function reportSection(body) {
  const lines = String(body || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const items = lines
    .filter((line) => /^[-*]\s+/.test(line) || (/^\|/.test(line) && !/^\|\s*[-:]+/.test(line)))
    .filter((line, index) => !(line.startsWith("|") && index === 0))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()).filter(Boolean).join(" · "));
  return { text: plainText(body), items };
}

export function normalizeDashboardEntity(type, row) {
  const properties = row.properties || {};
  const base = {
    ...row,
    ...properties,
    entity_type: type,
    id: row.id,
    name: properties.name || row.name || row.id,
    owner: properties.owner || row.owner,
    project: properties.project || row.project,
    status: properties.status || properties.report_status || row.status,
    priority: properties.priority || row.priority,
    due: properties.due_date || row.due,
  };
  if (type === "projects") {
    const overview = markdownSection(row.body, "Overview");
    const knowledge = markdownSection(row.body, "Project knowledge");
    const attention = markdownSection(row.body, "This week's attention");
    return {
      ...base,
      overview: {
        objective: boldField(overview, "Goal"),
        current_position: boldField(overview, "Current position"),
        main_blocker: boldField(overview, "Main blocker"),
      },
      knowledge: {
        health: boldField(knowledge, "Health"),
        current_context: boldField(knowledge, "Conclusion"),
        research: listLines(markdownSection(knowledge, "Research and evidence", 3)),
        decisions: listLines(markdownSection(knowledge, "Current decisions", 3)),
        blockers: listLines(markdownSection(knowledge, "Blockers and review condition", 3)),
      },
      attention: {
        targets: checklistLines(attention),
        last_meaningful_update: boldField(attention, "Last meaningful update"),
      },
    };
  }
  if (type === "work_items") {
    const notes = markdownSection(row.body, "Notes");
    return {
      ...base,
      completed_at: row.metadata?.completed_at,
      processed: row.metadata?.daily_review_version ? true : false,
      notes: {
        completion_summary: plainText(markdownSection(notes, "Completion summary", 3)),
        blocker: plainText(markdownSection(notes, "Blocker", 3)),
        next_action: plainText(markdownSection(notes, "Next action", 3)),
        missing: listLines(markdownSection(notes, "Documentation missing", 3)),
      },
    };
  }
  if (type === "meetings") {
    const decisions = markdownSection(row.body, "Decisions");
    return {
      ...base,
      completed_at: row.metadata?.completed_at,
      attendees: String(properties.attendees || "").split(";").map((value) => value.trim()).filter(Boolean),
      purpose: plainText(markdownSection(row.body, "Purpose and agenda")),
      problem: { cause: plainText(markdownSection(row.body, "Notes")) },
      decision: { summary: boldField(decisions, "Decision") || plainText(decisions) },
      commitments: listLines(markdownSection(row.body, "Commitments")),
      follow_up: { next_action: plainText(markdownSection(row.body, "Follow-up")) },
    };
  }
  if (type === "reports") {
    return {
      ...base,
      week_start: properties.week_start,
      version: properties.report_version,
      finalized_at: properties.finalized_at,
      sections: Object.fromEntries(Object.entries(markdownSections(row.body || "")).filter(([name]) => name !== "Introduction").map(([name, content]) => [name, reportSection(content)])),
    };
  }
  return base;
}

function loadFeatureDoc(featureId, featureDocsRoot) {
  const filename = readdirSync(featureDocsRoot).find((name) => name.startsWith(`${featureId}-`) && name.endsWith(".md"));
  if (!filename) throw new Error(`Missing feature document for ${featureId} under ${featureDocsRoot}`);
  const path = resolve(featureDocsRoot, filename);
  const markdown = readFileSync(path, "utf8");
  const { fields, body } = splitFrontMatter(markdown);
  const sections = markdownSections(body);
  if (fields.feature_id !== featureId) throw new Error(`Feature document identity mismatch for ${featureId}: ${path}`);
  if (!fields.title || !sections["Why it exists"]) throw new Error(`Feature document lacks title or Why it exists: ${path}`);
  return {
    path,
    title: fields.title,
    category: fields.category || "",
    purpose: sections["Why it exists"],
    example: sections.Example || ""
  };
}

function entityIndex(seed) {
  const index = new Map();
  for (const [type, rows] of Object.entries(seed.entities || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) if (row && typeof row.id === "string") index.set(row.id, normalizeDashboardEntity(type, row));
  }
  return index;
}

function artifactPath(suite, runRoot, predicate, label) {
  const artifact = suite.run_artifacts.find(predicate);
  if (!artifact) throw new Error(`Suite ${suite.suite} does not declare ${label}`);
  const path = resolve(runRoot, artifact.path);
  if (!existsSync(path)) throw new Error(`Missing declared ${label}: ${path}`);
  return { ...artifact, absolute_path: path };
}

function resultKey(resultPath) {
  return resultPath.replace(/^\$\./, "").replace(/\[\*\]$/, "");
}

function normalizeJudgeAssertions(judge) {
  return (judge.assertions || []).map((row) => ({
    assertion: row.assertion,
    met: row.met === true,
    evidence: row.evidence_refs || row.evidence || []
  }));
}

function featureStatus(suiteResult, judge, checks) {
  if (!judge || !suiteResult) return "NOT RUN";
  if (judge.tier === "D" || judge.verdict === "blocked" || (judge.blockers || []).length) return "BLOCKED";
  const pass = suiteResult.pass === true
    && judge.tier === "A"
    && (judge.verdict === undefined || judge.verdict === "pass")
    && (judge.failures || []).length === 0
    && checks.length > 0
    && checks.every((check) => check.met);
  return pass ? "PASSED" : "FAILED";
}

function titleFromId(id) {
  return id.split("-").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function collectFeatureRows(value, featureId, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectFeatureRows(item, featureId, rows);
  } else if (value && typeof value === "object") {
    if (value.feature_id === featureId) rows.push(value);
    for (const child of Object.values(value)) collectFeatureRows(child, featureId, rows);
  }
  return rows;
}

function collectUrls(value, urls = new Set()) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) urls.add(value);
  else if (Array.isArray(value)) for (const item of value) collectUrls(item, urls);
  else if (value && typeof value === "object") for (const child of Object.values(value)) collectUrls(child, urls);
  return [...urls];
}
function publishablePath(path) {
  const value = relative(repoRoot, resolve(path)).replaceAll("\\", "/");
  return value.startsWith("../") ? basename(path) : value;
}

function loadSuiteRun({ suitePath, runRoot, featureDocsRoot, entities, entityLabels }) {
  const suite = CompanyOperatingEvalSuiteSchema.parse(readJson(suitePath, "eval suite"));
  const reviewArtifact = artifactPath(suite, runRoot, ({ kind }) => kind.endsWith("review-result"), "review result");
  const suiteResultArtifact = artifactPath(suite, runRoot, ({ kind }) => kind === "suite-result", "suite result");
  const receiptArtifact = artifactPath(suite, runRoot, ({ kind }) => kind.includes("receipt"), "integration receipt");
  const reviewResult = readJson(reviewArtifact.absolute_path, "review result");
  const suiteResult = readJson(suiteResultArtifact.absolute_path, "suite result");
  const receipt = readJson(receiptArtifact.absolute_path, "integration receipt");
  const featureMap = new Map(suite.features.map((feature) => [feature.feature_id, feature]));

  return suite.features.map((feature) => {
    const featureDoc = loadFeatureDoc(feature.feature_id, featureDocsRoot);
    const judgeArtifact = artifactPath(suite, runRoot, ({ kind }) => kind === `feature-judge:${feature.feature_id}`, `${feature.feature_id} judge`);
    const judge = readJson(judgeArtifact.absolute_path, `${feature.feature_id} judge`);
    const checks = normalizeJudgeAssertions(judge);
    const key = resultKey(feature.result_path);
    if (!Object.hasOwn(reviewResult, key)) throw new Error(`${feature.feature_id} result path does not exist: ${feature.result_path}`);
    const actual = reviewResult[key];
    const receiptRows = collectFeatureRows(receipt, feature.feature_id);
    const cases = suite.cases.filter((testCase) => testCase.feature_ids.includes(feature.feature_id)).map((testCase) => {
      const startingEntities = testCase.entity_ids.map((id) => {
        const entity = entities.get(id);
        if (!entity) throw new Error(`Case ${testCase.id} references missing seed entity ${id}`);
        return entity;
      });
      const status = featureStatus(suiteResult, judge, checks);
      return {
        row_id: `${feature.feature_id}:${testCase.id}`,
        case_id: testCase.id,
        title: titleFromId(testCase.id),
        prompt: testCase.prompt,
        status,
        summary: `${Array.isArray(actual) ? actual.length : 1} result${Array.isArray(actual) && actual.length === 1 ? "" : "s"} · ${checks.filter((check) => check.met).length}/${checks.length} checks`,
        entity_ids: testCase.entity_ids,
        starting_entities: startingEntities,
        entity_labels: entityLabels,
        expected: {
          claim: feature.claim,
          feature_assertions: feature.assertions,
          case_assertions: testCase.hidden_assertions,
          falsifier: feature.falsifier || null
        },
        actual,
        checks,
        technical: {
          suite_path: publishablePath(suitePath),
          run_root: publishablePath(runRoot),
          review_result_path: publishablePath(reviewArtifact.absolute_path),
          judge_path: publishablePath(judgeArtifact.absolute_path),
          receipt_path: publishablePath(receiptArtifact.absolute_path),
          result_path: feature.result_path,
          tier: judge.tier,
          suite_pass: suiteResult.pass === true,
          receipt_rows: receiptRows,
          urls: collectUrls(receiptRows)
        }
      };
    });
    if (!cases.length) throw new Error(`${feature.feature_id} has no eval case`);
    return {
      feature_id: feature.feature_id,
      title: featureDoc.title,
      purpose: featureDoc.purpose,
      example: featureDoc.example,
      category: featureDoc.category,
      source_path: publishablePath(featureDoc.path),
      cases
    };
  });
}

export function buildEvalDashboardModel({
  suiteRuns,
  seedPath = resolve(repoRoot, "evals/seed/kamdar-company-os.seed.json"),
  featureDocsRoot = resolve(repoRoot, "docs/features"),
  operatedEvidencePath = null
}) {
  if (!Array.isArray(suiteRuns) || !suiteRuns.length) throw new Error("suiteRuns must contain at least one typed suite and run root");
  const seed = readJson(seedPath, "seed");
  const entities = entityIndex(seed);
  const entityLabels = Object.fromEntries([...entities].map(([id, entity]) => [id, entity.name || id]));
  let features = suiteRuns.flatMap(({ suitePath, runRoot }) => loadSuiteRun({
    suitePath: resolve(suitePath),
    runRoot: resolve(runRoot),
    featureDocsRoot: resolve(featureDocsRoot),
    entities,
    entityLabels
  }));
  const operatedEvidence = operatedEvidencePath
    ? OperatedEvidenceSchema.parse(readJson(resolve(operatedEvidencePath), "operated evidence"))
    : null;
  if (operatedEvidence) {
    const evidenceByFeature = new Map(operatedEvidence.features.map((row) => [row.feature_id, row]));
    features = features.map((feature) => {
      const evidence = evidenceByFeature.get(feature.feature_id);
      if (!evidence) throw new Error(`Operated evidence is missing ${feature.feature_id}`);
      return {
        ...feature,
        cases: feature.cases.map((row) => ({
          ...row,
          technical: {
            ...row.technical,
            urls: evidence.urls,
            operated_summary: evidence.summary
          }
        }))
      };
    });
  }
  const featureIds = features.map((feature) => feature.feature_id);
  if (featureIds.length !== new Set(featureIds).size) throw new Error("A feature is declared by more than one supplied suite");
  const cases = features.flatMap((feature) => feature.cases);
  const statuses = Object.fromEntries(["PASSED", "FAILED", "BLOCKED", "NOT RUN"].map((status) => [status, cases.filter((row) => row.status === status).length]));
  return {
    schema_version: "kamdar-eval-dashboard@1.0.0",
    title: `${seed.clock.company} Company OS evals`,
    evidence_window: seed.clock,
    source: {
      seed_path: publishablePath(seedPath),
      suite_paths: suiteRuns.map(({ suitePath }) => publishablePath(suitePath)),
      run_roots: suiteRuns.map(({ runRoot }) => publishablePath(runRoot)),
      operated_evidence_path: operatedEvidencePath ? publishablePath(operatedEvidencePath) : null
    },
    deployment: operatedEvidence ? { id: operatedEvidence.deployment, root_url: operatedEvidence.root_url } : null,
    totals: {
      features: features.length,
      cases: cases.length,
      checks: cases.reduce((count, row) => count + row.checks.length, 0),
      statuses
    },
    features
  };
}

export function discoverLatestSuiteRun({ suitePath, deploymentsRoot = resolve(filesystemRoot, "runs/deployments") }) {
  const suite = CompanyOperatingEvalSuiteSchema.parse(readJson(resolve(suitePath), "eval suite"));
  if (!existsSync(deploymentsRoot)) throw new Error(`Deployment evidence root does not exist: ${deploymentsRoot}`);
  const candidates = [];
  for (const deployment of readdirSync(deploymentsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const deploymentRoot = resolve(deploymentsRoot, deployment.name);
    for (const child of readdirSync(deploymentRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const runRoot = resolve(deploymentRoot, child.name);
      const resultArtifact = suite.run_artifacts.find(({ kind }) => kind === "suite-result");
      const resultPath = resultArtifact ? resolve(runRoot, resultArtifact.path) : null;
      if (!resultPath || !existsSync(resultPath)) continue;
      const result = readJson(resultPath, "suite result");
      const tiers = Object.keys(result.feature_tiers || {});
      if (suite.features.every(({ feature_id }) => tiers.includes(feature_id))) candidates.push(runRoot);
    }
  }
  candidates.sort();
  if (!candidates.length) throw new Error(`No completed run found for ${basename(suitePath)}`);
  return candidates.at(-1);
}

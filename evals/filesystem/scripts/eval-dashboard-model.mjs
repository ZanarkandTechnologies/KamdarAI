import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { ArtifactQualityReviewSchema } from "../../../automations/schemas/artifact-quality-review.zod.mjs";
import {
  JudgeRubricDimensions,
  JudgeRubricSchema,
  validateCompanyOperatingEvalSuite,
} from "./company-operating-eval-contract.mjs";
import { validateArtifactQualityReview } from "./quality-review-contracts.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");

const HttpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "must use http or https");

const OperatedEvidenceSchema = z.strictObject({
  schema_version: z.literal("kamdar-operated-evidence@1.0.0"),
  deployment: z.string().min(1),
  root_url: HttpUrlSchema,
  features: z.array(z.strictObject({
    feature_id: z.string().regex(/^FEAT-\d{4}$/),
    summary: z.string().min(1),
    urls: z.array(HttpUrlSchema).min(1)
  })).min(1)
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
    source_url: row.source_url || row.url || null,
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

function normalizeJudgeAssertions(judge) {
  return (judge.assertions || []).map((row) => ({
    assertion: row.assertion,
    met: row.met === true,
    evidence: row.evidence_refs || row.evidence || []
  }));
}

function currentJudgeChecks(judge, feature, judgePath) {
  const observed = normalizeJudgeAssertions(judge);
  const exactCoverage = observed.length === feature.assertions.length
    && feature.assertions.every((assertion) => observed.filter((row) => row.assertion === assertion).length === 1);
  return [
    {
      assertion: `${feature.feature_id} judge covers the current authored assertions`,
      met: exactCoverage,
      evidence: [judgePath],
      kind: exactCoverage ? "judge-coverage" : "stale-proof",
      category: "technical",
    },
    ...feature.assertions.map((assertion) => {
      const match = observed.find((row) => row.assertion === assertion);
      return {
        assertion,
        met: match?.met === true,
        evidence: match?.evidence || [],
        kind: match ? "feature-assertion" : "stale-proof",
        category: "required",
      };
    })
  ];
}

function titleFromId(id) {
  return id.split("-").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function collectUrls(value, urls = new Set()) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) urls.add(value);
  else if (Array.isArray(value)) for (const item of value) collectUrls(item, urls);
  else if (value && typeof value === "object") for (const child of Object.values(value)) collectUrls(child, urls);
  return [...urls];
}

function valueAtPath(value, path) {
  const keys = String(path)
    .replace(/^\$\.?/, "")
    .replace(/^\//, "")
    .replace(/\[\*\]$/, "")
    .split(/[./]/)
    .filter(Boolean);
  return keys.reduce((current, key) => current?.[key], value);
}

const PrimaryEntityFields = [
  "target_id", "project_id", "work_item_id", "report_id", "candidate_id", "record_id", "person_id", "owner_person_id"
];

function scalarIds(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return [];
}

function primaryEntityIds(row) {
  const ids = PrimaryEntityFields.flatMap((field) => scalarIds(row?.[field]));
  return [...ids, ...scalarIds(row?.target?.target_id)];
}

function typedEntityIds(row, ids = []) {
  if (!row || typeof row !== "object") return ids;
  for (const [key, value] of Object.entries(row)) {
    if (key !== "feature_id" && key !== "effect_id" && (key.endsWith("_id") || key.endsWith("_ids"))) ids.push(...scalarIds(value));
    if (value && typeof value === "object") typedEntityIds(value, ids);
  }
  return ids;
}

function referencesBoundEntity(row, entityIds) {
  const bound = new Set(entityIds);
  const primaryIds = primaryEntityIds(row);
  if (primaryIds.length) return primaryIds.some((id) => bound.has(id));
  return typedEntityIds(row).some((id) => bound.has(id));
}

function relevantResultValue(value, entityIds) {
  if (!Array.isArray(value)) return value;
  return value.filter((row) => referencesBoundEntity(row, entityIds));
}

function resultPathKey(path) {
  return String(path).replace(/^\$\.?/, "").replace(/^\//, "").replace(/\[\*\]$/, "").split(/[./]/).filter(Boolean).at(-1) || "result";
}

function relevantResultItems(value, entityIds, path) {
  if (!Array.isArray(value)) return [];
  const key = resultPathKey(path);
  return value.flatMap((row, index) => referencesBoundEntity(row, entityIds)
    ? [{ pointer: `/${key}/${index}`, value: row }]
    : []);
}

function rowReferences(row, featureIds, entityIds) {
  if (!row || typeof row !== "object") return false;
  const isEvidenceRow = ["effect_id", "work_item_id", "record_id", "result_pointer", "feature_id"].some((key) => Object.hasOwn(row, key));
  if (!isEvidenceRow) return false;
  const entityMatch = referencesBoundEntity(row, entityIds);
  return row.feature_id ? featureIds.includes(row.feature_id) && entityMatch : entityMatch;
}

function collectRelevantRows(value, featureIds, entityIds, rows = [], seen = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectRelevantRows(item, featureIds, entityIds, rows, seen);
  } else if (value && typeof value === "object") {
    if (rowReferences(value, featureIds, entityIds)) {
      const key = JSON.stringify(value);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(value);
      }
    }
    for (const child of Object.values(value)) collectRelevantRows(child, featureIds, entityIds, rows, seen);
  }
  return rows;
}

function observedFact(row) {
  const label = row.effect_id || row.work_item_id || row.record_id || row.feature_id || "Evidence";
  const state = (typeof row.outcome === "string" ? row.outcome : row.outcome?.state)
    || row.state
    || (row.pass === true ? "passed" : row.pass === false ? "failed" : "recorded");
  const reason = row.outcome?.reason || row.reason || "";
  return { label, state, reason };
}

function qualityMetrics(judges, featureIds, completion) {
  const rubrics = judges.map((judge, index) => {
    if (judge?.rubric === undefined) return null;
    const parsed = JudgeRubricSchema.safeParse(judge.rubric);
    if (!parsed.success) throw new Error(`${featureIds[index]} judge rubric is malformed.`);
    return parsed.data;
  });
  const complete = rubrics.length > 0 && rubrics.every(Boolean);
  const rank = new Map(["A", "B", "C", "D"].map((grade, index) => [grade, index]));
  return JudgeRubricDimensions.map(({ key, label }) => {
    if (key === "completeness") {
      const evaluated = completion.total > 0;
      return {
        key,
        label,
        grade: null,
        score: evaluated ? Math.round((completion.passed / completion.total) * 100) : null,
        matched: completion.passed,
        total: completion.total,
        status: evaluated ? "evaluated" : "not-evaluated",
        feature_ids: featureIds,
      };
    }
    return {
      key,
      label,
      grade: complete
        ? rubrics.map((rubric) => rubric[key]).sort((left, right) => rank.get(right) - rank.get(left))[0]
        : null,
      status: complete ? "evaluated" : "not-evaluated",
      feature_ids: featureIds,
    };
  });
}

const ArtifactQualityLabels = Object.freeze({
  referential_clarity: "Referential clarity",
  end_user_value: "End-user value",
  readability: "Readability",
  template_fidelity: "Template fidelity",
  groundedness: "Groundedness",
  workflow_reconstructability: "Workflow reconstructability",
  baseline_integrity: "Baseline integrity",
});

function joinedArtifactQuality(observedSlices, reviewByPointer) {
  if (!reviewByPointer) return { status: "NOT EVALUATED", artifact_pointers: [], checks: [], findings: [] };
  const rows = observedSlices.flatMap(({ items }) => items.map(({ pointer }) => {
    const review = reviewByPointer.get(pointer);
    if (!review) throw new Error(`Artifact quality review does not cover ${pointer}.`);
    return review;
  }));
  const checks = rows.flatMap((row) => Object.entries(row.checks).map(([key, check]) => ({
    assertion: `${ArtifactQualityLabels[key] || titleFromId(key)} for ${row.artifact_pointer}`,
    met: check.pass === true && check.findings.length === 0,
    evidence: check.evidence_refs,
    findings: check.findings,
    artifact_pointer: row.artifact_pointer,
    quality_key: key,
    kind: "artifact-quality",
    category: "quality",
  })));
  return {
    status: rows.length && checks.every(({ met }) => met) ? "PASSED" : rows.length ? "FAILED" : "NOT APPLICABLE",
    artifact_pointers: rows.map(({ artifact_pointer }) => artifact_pointer),
    checks,
    findings: checks.flatMap(({ findings }) => findings),
  };
}

function projectUpdateView(observedSlices, startingEntities, receiptRows) {
  const item = observedSlices
    .find(({ path }) => resultPathKey(path) === "project_updates")
    ?.items?.find(({ value }) => Array.isArray(value?.section_replacements));
  if (!item) return null;
  const candidate = item.value;
  const project = startingEntities.find(({ id }) => id === candidate.project_id);
  if (!project) return null;
  const effect = receiptRows.find((row) => row.result_pointer === item.pointer);
  const outcome = typeof effect?.outcome === "string" ? { state: effect.outcome } : effect?.outcome || {};
  return {
    kind: "project-section-replacements",
    target_id: candidate.project_id,
    target_label: project.name || candidate.project_id,
    change_summary: candidate.change_summary || "",
    source_ids: candidate.source_ids || [],
    delivery_state: outcome.state || "not recorded",
    delivery_reason: outcome.reason || "",
    read_back_state: outcome.read_back?.matched === true ? "matched" : outcome.read_back?.matched === false ? "mismatch" : "not recorded",
    sections: candidate.section_replacements.map((replacement) => {
      const actual = markdownSection(project.body, replacement.section);
      return {
        section: replacement.section,
        actual_current_text: actual,
        expected_current_text: replacement.expected_current_text,
        replacement_text: replacement.replacement_text,
        matches: actual === replacement.expected_current_text,
      };
    }),
  };
}

function entityLabel(id, startingEntities) {
  return startingEntities.find((entity) => entity.id === id)?.name || id || "Generated output";
}

function genericOutputView(path, item, startingEntities, receiptRows) {
  const row = item.value || {};
  const effect = receiptRows.find((candidate) => candidate.result_pointer === item.pointer);
  const outcome = typeof effect?.outcome === "string" ? { state: effect.outcome } : effect?.outcome || {};
  const delivery = outcome.state || row.disposition || row.report_status || "generated";
  if (path === "completed_ticket_comments") return {
    kind: "message-output", heading: "Completion follow-up", target_label: entityLabel(row.work_item_id, startingEntities), state: delivery, body: row.comment_text || "",
  };
  if (path === "weekly_progress_chases") return {
    kind: "message-output", heading: "Progress follow-up", target_label: entityLabel(row.owner_person_id, startingEntities), state: delivery, body: row.message_text || "",
  };
  if (path === "knowledge_updates") return {
    kind: "knowledge-output", heading: "Weekly Draft update", target_label: entityLabel(row.work_item_id, startingEntities), state: delivery,
    entries: (row.draft_entries || []).map((entry) => ({ label: entry.anchor || titleFromId(entry.kind || "entry"), body: entry.markdown || "" })),
    note: row.missing_information_comment || "",
  };
  if (path === "report_results") return {
    kind: "document-output", heading: `${row.report_level || "Weekly"} report`, target_label: entityLabel(row.project_id || row.report_id, startingEntities), state: delivery,
    body: row.report_markdown || "", meta: [row.area, row.report_status, row.report_version ? `Version ${row.report_version}` : ""].filter(Boolean),
  };
  if (path === "promotion_dispositions") return {
    kind: "promotion-output", heading: `${titleFromId(row.kind || "candidate")} disposition`, target_label: entityLabel(row.candidate_id, startingEntities), state: row.disposition || delivery,
    summary: row.reason || "", body: row.rendered_markdown || "", gaps: row.gaps || [],
  };
  if (path === "next_week_project_replacements") {
    const project = startingEntities.find(({ id }) => id === row.project_id);
    const actual = markdownSection(project?.body, row.section);
    return {
      kind: "project-section-replacements", target_id: row.project_id, target_label: project?.name || row.project_id,
      change_summary: `Prepare ${row.section || "the Project"} for next week.`, delivery_state: delivery,
      read_back_state: outcome.read_back?.matched === true ? "matched" : outcome.read_back?.matched === false ? "mismatch" : "not recorded",
      sections: [{ section: row.section, actual_current_text: actual, expected_current_text: row.expected_current_text, replacement_text: row.replacement_text, matches: actual === row.expected_current_text }],
    };
  }
  if (path === "configuration_gaps") return {
    kind: "configuration-output", heading: "Configuration gap", target_label: row.name || row.key || "Configuration", state: delivery,
    summary: row.reason || row.description || row.gap || "", body: row.next_action || row.required_action || "",
  };
  return {
    kind: "record-output", heading: titleFromId(path), target_label: entityLabel(primaryEntityIds(row)[0], startingEntities), state: delivery,
    summary: row.summary || row.reason || row.change_summary || "Generated record",
  };
}

function typedOutputViews(observedSlices, startingEntities, receiptRows) {
  const project = projectUpdateView(observedSlices, startingEntities, receiptRows);
  return observedSlices.flatMap((slice) => {
    const key = resultPathKey(slice.path);
    if (key === "project_updates" && project) return [project];
    if (!slice.items.length) return [{ kind: "empty-output", heading: titleFromId(key), target_label: "No output needed", state: "none", summary: "The reviewed run produced no rows for this output." }];
    return slice.items.map((item) => genericOutputView(key, item, startingEntities, receiptRows));
  });
}

function judgeOutcome(judge) {
  if (!judge) return "NOT RUN";
  if (judge.tier === "D" || judge.verdict === "blocked" || (judge.blockers || []).length) return "BLOCKED";
  const passed = judge.tier === "A"
    && (judge.verdict === undefined || judge.verdict === "pass")
    && (judge.failures || []).length === 0;
  return passed ? "PASSED" : "FAILED";
}

function scenarioStatus(judges, gates, checks) {
  if (!judges.length && !gates.length) return "NOT RUN";
  if (checks.some((check) => check.kind === "stale-proof")) return "NOT RUN";
  const judgeOutcomes = judges.map(judgeOutcome);
  if (judgeOutcomes.includes("NOT RUN")) return "NOT RUN";
  if (judgeOutcomes.includes("BLOCKED")) return "BLOCKED";
  if (judgeOutcomes.includes("FAILED") || gates.some((gate) => gate.pass !== true) || checks.some((check) => !check.met)) return "FAILED";
  return "PASSED";
}

function scenarioReason(status, judges, gates, requiredChecks, allChecks) {
  const failedChecks = requiredChecks.filter((check) => !check.met);
  if (status === "PASSED") return `${requiredChecks.length} required check${requiredChecks.length === 1 ? "" : "s"} passed.`;
  if (status === "BLOCKED") return judges.flatMap((judge) => judge.blockers || []).join(" ") || "A bound feature judge is blocked.";
  if (status === "NOT RUN" && allChecks.some((check) => check.kind === "stale-proof")) return "The saved feature judge does not cover the current authored assertions. Rerun this feature eval.";
  if (status === "NOT RUN") return "Required scenario proof has not been produced.";
  const gateFailure = gates.flatMap((gate) => gate.failures || []).find(Boolean);
  if (gateFailure && !failedChecks.length) return gateFailure;
  if (failedChecks.length) return `${failedChecks.length} required check${failedChecks.length === 1 ? "" : "s"} failed: ${failedChecks.map((check) => check.assertion).join(" ")}`;
  return judges.flatMap((judge) => judge.failures || []).find(Boolean) || "A bound scenario check failed.";
}

function publishablePath(path) {
  const value = relative(repoRoot, resolve(path)).replaceAll("\\", "/");
  return value.startsWith("../") ? basename(path) : value;
}

function loadSuiteRun({ suitePath, runRoot, featureDocsRoot, entities, entityLabels }) {
  const rawSuite = readJson(suitePath, "eval suite");
  const integrationArtifact = artifactPath(rawSuite, runRoot, ({ kind }) => kind.includes("integration-checks"), "integration checks");
  const integrationResult = readJson(integrationArtifact.absolute_path, "integration checks");
  const suite = validateCompanyOperatingEvalSuite(rawSuite, {
    knownIntegrationGateIds: (integrationResult.gates || []).map((gate) => gate.gate_id),
    label: `Eval suite ${rawSuite.suite || suitePath}`
  });
  const reviewArtifact = artifactPath(suite, runRoot, ({ kind }) => kind.endsWith("review-result"), "review result");
  const receiptArtifact = artifactPath(suite, runRoot, ({ kind }) => kind.includes("receipt"), "integration receipt");
  const qualityDeclaration = suite.run_artifacts.find(({ kind }) => kind === "artifact-quality-review");
  const qualityPath = qualityDeclaration ? resolve(runRoot, qualityDeclaration.path) : null;
  const qualityArtifact = qualityPath && existsSync(qualityPath) ? { ...qualityDeclaration, absolute_path: qualityPath } : null;
  const reviewResultBytes = readFileSync(reviewArtifact.absolute_path);
  const reviewResult = readJson(reviewArtifact.absolute_path, "review result");
  const receipt = readJson(receiptArtifact.absolute_path, "integration receipt");
  let qualityReviewByPointer = null;
  if (qualityArtifact) {
    const rawQualityReview = readJson(qualityArtifact.absolute_path, "artifact quality review");
    validateArtifactQualityReview({
      rawReview: rawQualityReview,
      result: reviewResult,
      resultBytes: reviewResultBytes,
      scope: rawQualityReview.scope,
      expectedReviewPath: qualityArtifact.absolute_path,
    });
    const qualityReview = ArtifactQualityReviewSchema.parse(rawQualityReview);
    qualityReviewByPointer = new Map(qualityReview.artifacts.map((row) => [row.artifact_pointer, row]));
  }
  const featureMap = new Map(suite.features.map((feature) => [feature.feature_id, feature]));
  const featureDocs = new Map(suite.features.map((feature) => [feature.feature_id, loadFeatureDoc(feature.feature_id, featureDocsRoot)]));
  const judges = new Map(suite.features.map((feature) => {
    const judgeArtifact = artifactPath(suite, runRoot, ({ kind }) => kind === `feature-judge:${feature.feature_id}`, `${feature.feature_id} judge`);
    const judge = readJson(judgeArtifact.absolute_path, `${feature.feature_id} judge`);
    return [feature.feature_id, { artifact: judgeArtifact, value: judge }];
  }));
  const gateMap = new Map((integrationResult.gates || []).map((gate) => [gate.gate_id, gate]));

  const cases = suite.evals.map((testCase) => {
    const metadata = testCase.metadata;
    const bindings = metadata.extensions.kamdar;
    const boundFeatures = bindings.feature_ids.map((featureId) => featureMap.get(featureId));
    const boundJudges = bindings.feature_ids.map((featureId) => judges.get(featureId)?.value).filter(Boolean);
    const gateIds = bindings.integration_gate_ids || [];
    const boundGates = gateIds.map((gateId) => {
      const gate = gateMap.get(gateId);
      if (!gate) throw new Error(`Case ${testCase.id} references missing integration gate ${gateId}`);
      return gate;
    });
    const entityIds = bindings.entity_ids;
    const startingEntities = entityIds.map((id) => {
      const entity = entities.get(id);
      if (!entity) throw new Error(`Case ${testCase.id} references missing seed entity ${id}`);
      return entity;
    });
    const resultPaths = bindings.result_paths?.length
      ? bindings.result_paths
      : boundFeatures.map((feature) => feature.result_path);
    const observedSlices = resultPaths.map((path) => {
      const value = valueAtPath(reviewResult, path);
      if (value === undefined) throw new Error(`Case ${testCase.id} result path does not exist: ${path}`);
      return {
        path,
        value: relevantResultValue(value, entityIds),
        items: relevantResultItems(value, entityIds, path),
      };
    });
    const reviewResultPath = publishablePath(reviewArtifact.absolute_path);
    const artifactChecks = [
      {
        assertion: "The declared output file exists and parses",
        met: true,
        evidence: [reviewResultPath],
        kind: "artifact-file",
        category: "technical",
      },
      ...observedSlices.map(({ path }) => ({
        assertion: `The output contains the asserted content at ${path}`,
        met: true,
        evidence: [`${reviewResultPath}#${path}`],
        kind: "artifact-path",
        category: "technical",
      }))
    ];
    const receiptRows = collectRelevantRows(receipt, bindings.feature_ids, entityIds);
    const artifactQuality = joinedArtifactQuality(observedSlices, qualityReviewByPointer);
    const featureChecks = bindings.feature_ids.flatMap((featureId) => {
      const judge = judges.get(featureId)?.value;
      const feature = featureMap.get(featureId);
      const judgePath = judges.get(featureId) ? publishablePath(judges.get(featureId).artifact.absolute_path) : "";
      const checks = currentJudgeChecks(judge, feature, judgePath);
      return [
        {
          assertion: `${featureId} judge passes at tier A`,
          met: judgeOutcome(judge) === "PASSED" && !checks.some((check) => check.kind === "stale-proof"),
          evidence: judgePath ? [judgePath] : [],
          kind: checks.some((check) => check.kind === "stale-proof") ? "stale-proof" : "judge-tier",
          category: "technical",
        },
        ...checks
      ];
    });
    const gateChecks = boundGates.map((gate) => ({
      assertion: gate.gate_id,
      met: gate.pass === true,
      evidence: gate.evidence_refs || gate.failures || [],
      kind: "integration-gate",
      category: "required",
    }));
    const checks = [...artifactChecks, ...featureChecks, ...gateChecks, ...artifactQuality.checks];
    const requiredChecks = checks.filter(({ category }) => category === "required");
    const technicalChecks = checks.filter(({ category }) => category === "technical");
    const status = scenarioStatus(boundJudges, boundGates, checks);
    const outputViews = typedOutputViews(observedSlices, startingEntities, receiptRows);
    const outputView = outputViews.find(({ kind }) => kind === "project-section-replacements") || null;
    let reason = status === "PASSED" && metadata.notes
      ? metadata.notes
      : scenarioReason(status, boundJudges, boundGates, requiredChecks, checks);
    const mismatchedSections = outputView?.sections.filter(({ matches }) => !matches).length || 0;
    if (status === "FAILED" && mismatchedSections) {
      reason = `The agent used stale text for ${mismatchedSections} of ${outputView.sections.length} Project sections, so the safe update check would reject the replacements.`;
    } else if (status === "FAILED" && artifactQuality.findings.length && requiredChecks.every(({ met }) => met)) {
      reason = artifactQuality.findings[0];
    }
    const passedRequiredChecks = requiredChecks.filter(({ met }) => met).length;
    return {
      row_id: `${suite.suite}:${testCase.id}`,
      case_id: testCase.id,
      title: metadata.title,
      tags: metadata.tags,
      given: metadata.context,
      when: testCase.prompt,
      expected: {
        summary: testCase.expected_output,
        reference_points: testCase.assertions
      },
      observed: {
        result_slices: observedSlices,
        facts: [
          ...receiptRows.map(observedFact),
          ...boundGates.map((gate) => ({
            label: gate.gate_id,
            state: gate.pass === true ? "passed" : "failed",
            reason: (gate.failures || []).join(" ")
          }))
        ],
        receipt_rows: receiptRows,
        integration_gates: boundGates,
        output_view: outputView,
        output_views: outputViews,
      },
      result: {
        status,
        reason,
        checks,
        required_checks: requiredChecks,
        technical_checks: technicalChecks,
        required_summary: { passed: passedRequiredChecks, total: requiredChecks.length },
        quality_metrics: qualityMetrics(boundJudges, bindings.feature_ids, { passed: passedRequiredChecks, total: requiredChecks.length }),
        artifact_quality: artifactQuality,
      },
      status,
      summary: reason,
      entity_ids: entityIds,
      starting_entities: startingEntities,
      entity_labels: entityLabels,
      checks,
      technical: {
        suite_path: publishablePath(suitePath),
        run_root: publishablePath(runRoot),
        review_result_path: publishablePath(reviewArtifact.absolute_path),
        judge_paths: bindings.feature_ids.map((featureId) => publishablePath(judges.get(featureId).artifact.absolute_path)),
        receipt_path: publishablePath(receiptArtifact.absolute_path),
        integration_path: publishablePath(integrationArtifact.absolute_path),
        quality_review_path: qualityArtifact ? publishablePath(qualityArtifact.absolute_path) : "",
        result_paths: resultPaths,
        tiers: Object.fromEntries(bindings.feature_ids.map((featureId) => [featureId, judges.get(featureId).value.tier])),
        feature_ids: bindings.feature_ids,
        integration_gate_ids: gateIds,
        receipt_rows: receiptRows,
        urls: collectUrls(receiptRows)
      }
    };
  });

  return {
    suite_id: suite.suite,
    title: titleFromId(suite.suite.replace(/^kamdar-/, "")),
    cases,
    features: suite.features.map((feature) => {
      const doc = featureDocs.get(feature.feature_id);
      return {
        feature_id: feature.feature_id,
        title: doc.title,
        purpose: doc.purpose,
        example: doc.example,
        category: doc.category,
        source_path: publishablePath(doc.path)
      };
    })
  };
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
  let groups = suiteRuns.map(({ suitePath, runRoot }) => loadSuiteRun({
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
    const knownFeatureIds = new Set(groups.flatMap((group) => group.features.map((feature) => feature.feature_id)));
    for (const featureId of knownFeatureIds) if (!evidenceByFeature.has(featureId)) throw new Error(`Operated evidence is missing ${featureId}`);
    groups = groups.map((group) => ({
      ...group,
      cases: group.cases.map((row) => {
        const evidenceRows = row.technical.feature_ids.map((featureId) => evidenceByFeature.get(featureId));
        return {
          ...row,
          technical: {
            ...row.technical,
            urls: [...new Set(evidenceRows.flatMap((evidence) => evidence.urls))],
            operated_summary: evidenceRows.map((evidence) => evidence.summary).join(" · ")
          }
        };
      })
    }));
  }
  const features = groups.flatMap((group) => group.features);
  const featureIds = features.map((feature) => feature.feature_id);
  if (featureIds.length !== new Set(featureIds).size) throw new Error("A feature is declared by more than one supplied suite");
  const cases = groups.flatMap((group) => group.cases);
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
    features,
    groups
  };
}

export function discoverLatestSuiteRun({ suitePath, deploymentsRoot = resolve(filesystemRoot, "runs/deployments") }) {
  const suite = readJson(resolve(suitePath), "eval suite");
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
      const judgedFeatureIds = new Set([
        ...Object.keys(result.feature_tiers || {}),
        ...(Array.isArray(result.feature_verdicts) ? result.feature_verdicts.map((row) => row?.feature_id).filter(Boolean) : []),
      ]);
      if (suite.features.every(({ feature_id }) => judgedFeatureIds.has(feature_id))) candidates.push(runRoot);
    }
  }
  candidates.sort();
  if (!candidates.length) throw new Error(`No completed run found for ${basename(suitePath)}`);
  return candidates.at(-1);
}

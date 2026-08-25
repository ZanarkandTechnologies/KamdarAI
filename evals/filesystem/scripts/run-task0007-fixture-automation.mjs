/**
 * Deterministic source-safe proof of the corrected TASK-0007 flow.
 * Daily knowledge and control edit one local Markdown Weekly Draft directly.
 * Weekly finalization reads that Draft and never creates another Draft diff.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  draftAnchorText,
  initializeCurrentWeeklyDraft,
  updateCurrentWeeklyDraft,
  validateCurrentWeeklyDraft,
  weeklyDraftAnchors
} from "../../../scripts/current_weekly_draft.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "../../..");
export const dailyContextFixture = resolve(projectRoot, "automations/examples/golden/daily-context-diff-2026-08-24.json");
export const task0007AutomationId = "kamdar-task0007-fixture-automation";
export const fixtureWeek = "2026-W34";

function stable(value) { return JSON.stringify(value, null, 2) + "\n"; }
function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) { writeFileSync(path, stable(value), { mode: 0o600 }); }
function writeText(path, value) { writeFileSync(path, String(value).endsWith("\n") ? String(value) : String(value) + "\n", { mode: 0o600 }); }
function inline(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function sourceIds(items) { return [...new Set(items.flatMap((item) => [item.source_id, ...(item.source_ids || [])]).filter(Boolean))]; }
function idempotency(prefix, value) { return prefix + ":" + sha256(stable(value)).slice(0, 16); }

function safePath(root, path) {
  const resolved = resolve(root, path);
  if (!resolved.startsWith(resolve(root) + "/")) throw new Error("TASK-0007 fixture path escaped run root: " + path);
  return resolved;
}
function ensureRoot(root) {
  const target = resolve(root);
  if (existsSync(target) && readdirSync(target).length) throw new Error("TASK-0007 fixture run root is not empty: " + target);
  mkdirSync(target, { recursive: true, mode: 0o700 });
  return target;
}
function output(root, path, value) {
  const target = safePath(root, path);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  if (path.endsWith(".json")) writeJson(target, value);
  else writeText(target, value);
  return path;
}
function dayDifference(localDay, earlier) {
  if (!earlier) return null;
  const start = new Date(localDay + "T00:00:00+08:00").getTime();
  const end = new Date(earlier + "T00:00:00+08:00").getTime();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((start - end) / 86400000)) : null;
}

export function projectMemoryPlan(context, contextPath) {
  const workByProject = new Map(context.projects.map((project) => [project.id, context.work_items.filter((item) => item.project_id === project.id)]));
  const patches = [];
  for (const project of context.projects) {
    const relatedWork = workByProject.get(project.id) || [];
    const meeting = context.meetings.find((item) => item.project_id === project.id);
    if (meeting) {
      const proposed = [
        "### " + project.name + " — current decision constraint",
        "- **Known:** " + inline(meeting.statements[0]),
        "- **Impact:** The related operating decision stays open until the review condition is met.",
        "- **Evidence:** " + meeting.source_id,
        "- **Review:** " + inline(meeting.review_condition || "Confirm against the next source update.")
      ].join("\n");
      const fields = { project: project.id, target: "project_knowledge", proposed, sources: [meeting.source_id] };
      patches.push({
        patch_id: "project-memory-" + project.id + "-knowledge",
        project: { project_id: project.id, project_source_id: project.source_id, project_url: project.source_url },
        target_section: "project_knowledge",
        operation: "append",
        before_excerpt: project.project_knowledge.slice(0, 240),
        proposed_markdown: proposed,
        source_ids: fields.sources,
        attention_reset: { requested: false, week: null, reason: null, source_id: null },
        gaps: [],
        idempotency_key: idempotency("project-memory", fields)
      });
    }
    const attention = relatedWork.filter((item) => ["blocked", "in_progress"].includes(String(item.status).toLowerCase()) && item.blocker);
    if (!attention.length) continue;
    const reset = project.weekly_attention_reset || {};
    const attentionReset = {
      requested: reset.requested === true,
      week: reset.requested === true ? reset.week || null : null,
      reason: reset.requested === true ? reset.reason || null : null,
      source_id: reset.requested === true ? reset.source_id || project.source_id : null
    };
    const proposed = attention.map((item) => {
      const due = item.due_date ? " · due " + item.due_date : " · due date missing";
      return "- [ ] **P1 · " + item.status + due + "** — " + inline(item.documentation?.mapped_field_state?.["Next action"] || item.blocker) +
        "\n  **Owner:** " + (item.owner_person_id || "unassigned") + " · **Why now:** " + inline(item.blocker) + " · **Evidence:** " + item.source_id;
    }).join("\n");
    const fields = { project: project.id, target: "this_weeks_attention", proposed, sources: sourceIds(attention), attention_reset: attentionReset };
    patches.push({
      patch_id: "project-memory-" + project.id + "-attention",
      project: { project_id: project.id, project_source_id: project.source_id, project_url: project.source_url },
      target_section: "this_weeks_attention",
      operation: attentionReset.requested ? "replace" : "append",
      before_excerpt: project.this_weeks_attention.slice(0, 240),
      proposed_markdown: proposed,
      source_ids: fields.sources,
      attention_reset: attentionReset,
      gaps: attention.filter((item) => !item.due_date).map((item) => item.id + ": due date is not supplied."),
      idempotency_key: idempotency("project-memory", fields)
    });
  }
  return {
    artifact_type: "kamdar-project-diff-plan",
    artifact_version: "0.1.0",
    context: { context_diff_id: context.context_id, context_diff_path: contextPath, local_day: context.local_day, evidence_window: context.evidence_window },
    state: patches.length ? "proposed" : "no_finding",
    patches,
    no_change_project_ids: context.projects.filter((project) => !patches.some((patch) => patch.project.project_id === project.id)).map((project) => project.id),
    source_gaps: [],
    integration_handoff: { owner: "apply-project-diffs", application_state: "prepare", receipt_required_before_applied_claim: true }
  };
}

export function documentationPlan(context, contextPath) {
  const people = new Map(context.people.map((person) => [person.id, person]));
  const groups = new Map();
  const blocked = [];
  for (const item of context.work_items.filter((entry) => entry.full_page_read)) {
    const missing = Object.entries(item.documentation?.mapped_field_state || {}).filter(([, state]) => /^(missing|vague)$/i.test(String(state))).map(([field]) => field);
    if (!missing.length) continue;
    const person = people.get(item.owner_person_id);
    if (!person || !person.preferred_contact_channel || !person.approved_contact_channels?.includes(person.preferred_contact_channel)) {
      blocked.push("- " + item.id + " — missing " + missing.join(", ") + "; approved route incomplete (" + item.source_id + ").");
      continue;
    }
    const group = groups.get(person.id) || { person, items: [] };
    group.items.push({ item, missing });
    groups.set(person.id, group);
  }
  const renderedGroups = [...groups.values()].map(({ person, items }) => [
    "### " + person.name + " — documentation updates",
    "- Person: " + person.id,
    "- Preferred channel: " + person.preferred_contact_channel,
    ...items.flatMap(({ item, missing }) => [
      "", "#### " + item.id,
      "- Update: " + missing.join(", ") + " in " + item.documentation.update_location.join(", ") + ".",
      "- Why: " + inline(item.documentation.known_context),
      "- Source: " + item.source_url + " (" + item.source_id + ")",
      "- Idempotency: " + idempotency("documentation-quality", { item: item.id, missing, day: context.local_day })
    ])
  ].join("\n"));
  return [
    "---", "artifact_type: kamdar-employee-message-plan", "artifact_version: \"0.1.0\"", "context_diff_id: \"" + context.context_id + "\"", "local_day: \"" + context.local_day + "\"", "state: proposed", "delivery_state: proposal-only", "---", "",
    "# Documentation-quality message plan — " + context.local_day, "", "## Provenance", "", "- Context: " + contextPath, "- Source IDs: " + sourceIds(context.work_items).join(", "), "",
    "## Recipient groups", "", renderedGroups.join("\n\n") || "No supported recipient groups.", "", "## Blocked delivery entries", "", blocked.join("\n") || "None.", "",
    "## Handoff", "", "- Delivery state: proposal-only", "- Integration owner: dispatch-employee-messages"
  ].join("\n");
}

function controlFindings(context) {
  return context.work_items.map((item) => ({ item, stale_days: dayDifference(context.local_day, item.last_meaningful_update) }))
    .filter(({ item, stale_days }) => stale_days !== null && stale_days >= 2 && ["blocked", "in_progress"].includes(String(item.status).toLowerCase()));
}

export function dailyKnowledgeEntries(context) {
  const meeting = context.meetings.find((item) => item.id === "MEETING-042" && item.statements?.length >= 2);
  if (!meeting) return [];
  const recurrence = context.work_items.filter((item) => item.project_id === meeting.project_id && /normalis|comparison/i.test([item.blocker, ...(item.evidence || [])].join(" ")));
  if (recurrence.length < 2) return [];
  return [{
    key: "decision:" + meeting.source_id,
    kind: "decision",
    anchor: "Decisions",
    source_ids: [meeting.source_id],
    markdown: [
      "### Five-store rollout gate — Proposed", "",
      "- **Project:** " + meeting.project_id,
      "- **Choice:** " + inline(meeting.statements[0]),
      "- **Tradeoff:** " + inline(meeting.statements[1]),
      "- **Authority:** not supplied; Weekly review must confirm it before promotion.",
      "- **Evidence:** " + meeting.source_url + " (" + meeting.source_id + ")"
    ].join("\n")
  }, {
    key: "sop:" + meeting.source_id,
    kind: "sop",
    anchor: "SOPs",
    source_ids: [meeting.source_id, ...recurrence.map((item) => item.source_id)],
    markdown: [
      "### Normalise before rollout review — Proposed", "",
      "- **Project:** " + meeting.project_id,
      "- **Method:** normalise supplier counts into one comparison before approval review.",
      "- **Trigger / output:** supplier-count evidence → one normalised comparison.",
      "- **Repeat-use / proof:** " + recurrence.length + " related Work records; owner and proof still require Weekly review.",
      "- **Evidence:** " + meeting.source_url + " (" + meeting.source_id + ")"
    ].join("\n")
  }];
}

export function dailyControlEntries(context) {
  return controlFindings(context).flatMap(({ item, stale_days }) => {
    const source = item.source_id;
    const contextLines = ["- **Project:** " + item.project_id, "- **Work:** " + item.id, "- **Evidence:** " + item.source_url + " (" + source + ")"];
    const entries = [{
      key: "pm_attention:" + source,
      kind: "pm_attention",
      anchor: "PM attention",
      source_ids: [source],
      markdown: ["### " + item.id + " — assign accountable owner", "", "- **State:** " + item.status + "; stale " + stale_days + " calendar days; " + (item.due_date ? "due " + item.due_date : "due date not supplied") + ".", "- **Owner:** " + (item.owner_person_id || "unassigned") + ".", "- **Action:** " + inline(item.blocker), ...contextLines].join("\n")
    }, {
      key: "risk:" + source,
      kind: "risk",
      anchor: "Problems and inefficiencies",
      source_ids: [source],
      markdown: ["### " + item.id + " — " + inline(item.blocker), "", "- **Impact:** operating approval cannot proceed.", "- **Confidence:** " + (item.cause?.confidence || "unknown") + "; cause " + (item.cause?.value ? "recorded" : "not supplied") + ".", "- **Next proof:** accountable owner and revised commitment.", ...contextLines].join("\n")
    }];
    if (item.plan_actual?.currency && Number.isFinite(item.plan_actual.actual_amount) && Number.isFinite(item.plan_actual.estimated_amount)) {
      const variance = item.plan_actual.actual_amount - item.plan_actual.estimated_amount;
      entries.push({
        key: "cost:" + source,
        kind: "cost",
        anchor: "Problems and inefficiencies",
        source_ids: [source],
        markdown: ["### " + item.id + " — control variance", "", "- **Amount / basis:** " + item.plan_actual.currency + " " + item.plan_actual.estimated_amount + " estimated; " + item.plan_actual.currency + " " + item.plan_actual.actual_amount + " actual; " + (variance >= 0 ? "+" : "") + item.plan_actual.currency + " " + variance + " = actual − estimate.", "- **Review:** confirm whether owner assignment changes the forecast.", ...contextLines].join("\n")
      });
    }
    return entries;
  });
}

export function projectControlPlan(context, contextPath, draftUpdate, draftPath) {
  const people = new Map(context.people.map((person) => [person.id, person]));
  const findings = controlFindings(context);
  return {
    artifact_type: "kamdar-project-control-plan",
    artifact_version: "0.2.0",
    state: "proposal_only",
    generated_at: context.local_day + "T16:30:00+08:00",
    local_day: context.local_day,
    source_context: { path: contextPath, collector_run_id: context.collector.run_id, evidence_window: context.evidence_window, source_ids: sourceIds(findings.map(({ item }) => item)), source_gaps: [] },
    control_findings: findings.map(({ item, stale_days }) => ({
      finding_id: "control-" + item.id,
      work_item_id: item.id,
      project_id: item.project_id,
      owner_person_id: item.owner_person_id,
      source_id: item.source_id,
      status: item.status,
      stale_days,
      blocker: item.blocker,
      cause: item.cause,
      cost_impact: item.plan_actual?.currency && Number.isFinite(item.plan_actual.actual_amount) && Number.isFinite(item.plan_actual.estimated_amount)
        ? { currency: item.plan_actual.currency, delta: item.plan_actual.actual_amount - item.plan_actual.estimated_amount, basis: "actual_amount - estimated_amount" }
        : null,
      request: "Confirm accountable owner, current evidence, revised commitment, and next action.",
      idempotency_key: idempotency("project-control", { item: item.id, stale_days, day: context.local_day })
    })),
    weekly_draft_update: {
      path: draftPath,
      state: draftUpdate.state,
      owned_anchors: ["PM attention", "Problems and inefficiencies"],
      source_keys: [...(draftUpdate.applied || []), ...(draftUpdate.duplicates || [])],
      conflicts: draftUpdate.conflicts || []
    },
    message_proposals: findings.map(({ item }) => ({
      person_id: item.owner_person_id,
      preferred_channel: people.get(item.owner_person_id)?.preferred_contact_channel || null,
      approved_channels: people.get(item.owner_person_id)?.approved_contact_channels || [],
      work_item_ids: [item.id],
      delivery_state: "proposal-only"
    })),
    unresolved_facts: findings.flatMap(({ item }) => [!item.due_date ? item.id + ": due date missing." : null, !item.cause?.value ? item.id + ": cause remains unconfirmed." : null].filter(Boolean)),
    provider_effects: { performed: false, reason: "The Weekly Draft changed locally; dispatch-employee-messages and the selected channel skill own sends and receipts." }
  };
}

function artifactRecord({ id, pipeline, artifactPath, status, summary }) {
  return { id, pipeline, artifact_path: artifactPath, status, summary, sha256: sha256(readFileSync(artifactPath, "utf8")) };
}
function publicDraftUpdate(update, draftPath) {
  return {
    state: update.state,
    path: draftPath,
    week: update.week || null,
    applied: update.applied || [],
    duplicates: update.duplicates || [],
    conflicts: update.conflicts || [],
    reason: update.reason || null
  };
}
function keysFromDraft(content) { return [...content.matchAll(/<!-- kamdar-weekly-key: ([^ ]+) -->/g)].map((match) => match[1]).sort(); }
function projectDraftContent(content, projectId) {
  return weeklyDraftAnchors.map((anchor) => {
    const entries = draftAnchorText(content, anchor).split(/(?=<!-- kamdar-weekly-key: )/).filter((entry) => entry.includes("**Project:** " + projectId));
    return "## " + anchor + "\n\n" + (entries.join("\n").trim() || "No source-keyed entry for this Project.");
  }).join("\n\n");
}
function weeklyFinalization({ root, context, draftPath }) {
  const draftContent = readFileSync(safePath(root, draftPath), "utf8");
  validateCurrentWeeklyDraft(draftContent, { expectedWeek: fixtureWeek });
  const projectPaths = context.projects.map((project) => {
    const path = "weekly/reports/projects/" + project.id + "-" + fixtureWeek + ".md";
    output(root, path, [
      "---", "artifact_type: kamdar-weekly-project-report", "week: " + fixtureWeek, "project_id: " + project.id, "department: Unassigned", "source_draft: " + draftPath, "---", "",
      "# " + project.name + " — " + fixtureWeek, "", "## Summary", "", "Finalized from the current Weekly Draft; no raw Daily re-synthesis.", "", projectDraftContent(draftContent, project.id), "",
      "## Problems worth solving", "", "No recurring problem promoted without a separate review.", "", "## Next-week handoff", "", "Review the source-linked open items in this report."
    ].join("\n"));
    return path;
  });
  const departmentPath = "weekly/reports/departments/unassigned-" + fixtureWeek + ".md";
  output(root, departmentPath, [
    "---", "artifact_type: kamdar-weekly-department-report", "week: " + fixtureWeek, "department: Unassigned", "---", "",
    "# Unassigned — " + fixtureWeek, "", "## Source project reports", "", ...projectPaths.map((path) => "- " + path), "", "## Results and open attention", "", "See linked Project reports; Department routing is a source gap in this fixture.", "", "## Next-week handoff", "", "Resolve Project Department values before a production rollup."
  ].join("\n"));
  const companyPath = "weekly/reports/company/" + fixtureWeek + ".md";
  output(root, companyPath, [
    "---", "artifact_type: kamdar-weekly-company-report", "week: " + fixtureWeek, "source_draft: " + draftPath, "---", "",
    "# Company operating review — " + fixtureWeek, "", "## Results and open attention", "", "Daily pipelines updated one current Weekly Draft directly before finalization.", "", "## Problems worth solving", "", "Project Department routing is missing in the fixture; do not infer it.", "", "## Decisions and SOPs awaiting review", "", draftAnchorText(draftContent, "Decisions"), "", draftAnchorText(draftContent, "SOPs"), "", "## Next-week handoff", "", "Use the finalized Project reports and preserve Proposed candidates until their review conditions are met."
  ].join("\n"));
  const keys = keysFromDraft(draftContent);
  const planPath = "weekly/finalization/weekly-finalization-plan-" + fixtureWeek + ".md";
  output(root, planPath, [
    "---", "artifact_type: kamdar-weekly-finalization-plan", "artifact_version: \"0.1.0\"", "week: " + fixtureWeek, "state: ready", "current_weekly_draft: " + draftPath, "---", "",
    "# Weekly finalization — " + fixtureWeek, "", "## Input Draft", "", "- Path: " + draftPath, "- Source keys: " + keys.join(", "), "- Source gaps: Project Department routing is not supplied by this Daily fixture.", "", "## Report hierarchy", "", ...projectPaths.map((path) => "- Project: " + path), "- Department: " + departmentPath, "- Company: " + companyPath, "", "## Promotion review", "", ...keys.filter((key) => key.startsWith("decision:") || key.startsWith("sop:")).map((key) => "- " + key + " — retain Proposed; authority/recurrence/owner/proof require Weekly review."), "", "## Completion boundary", "", "- The input Draft was read only.", "- Provider publication and executive delivery were not invoked."
  ].join("\n"));
  const receiptPath = "weekly/receipt-" + fixtureWeek + ".json";
  output(root, receiptPath, {
    artifact_type: "kamdar-weekly-automation-receipt",
    artifact_version: "0.2.0",
    automation_id: "kamdar-weekly-operating-review",
    current_weekly_draft: draftPath,
    draft_sha256: sha256(draftContent),
    finalization_plan: planPath,
    report_hierarchy: { project: projectPaths.length, department: 1, company: 1 },
    source_keys: keys,
    external_effects: { notion_writes: 0, messages_sent: 0, executive_delivery: 0 },
    result: "prepared"
  });
  return { current_weekly_draft: draftPath, finalization_plan: planPath, receipt: receiptPath, project_reports: projectPaths, department_reports: [departmentPath], company_report: companyPath, source_keys: keys };
}

export function runTask0007FixtureAutomation({ outputRoot } = {}) {
  if (!outputRoot) throw new Error("TASK-0007 fixture automation needs an explicit private output root.");
  const root = ensureRoot(outputRoot);
  const context = readJson(dailyContextFixture);
  const contextPath = output(root, "daily/context/daily-context-diff-" + context.local_day + ".json", context);
  const draftPath = "weekly/current/weekly-report-draft-" + fixtureWeek + ".md";
  initializeCurrentWeeklyDraft({ draftPath: safePath(root, draftPath), week: fixtureWeek });

  const projectPlan = projectMemoryPlan(context, contextPath);
  const projectPlanPath = output(root, "daily/project-memory/project-diff-plan-" + context.local_day + ".json", projectPlan);
  const documentationPath = output(root, "daily/documentation-quality/employee-message-plan-" + context.local_day + ".md", documentationPlan(context, contextPath));
  const knowledgeUpdate = updateCurrentWeeklyDraft({ draftPath: safePath(root, draftPath), expectedWeek: fixtureWeek, entries: dailyKnowledgeEntries(context) });
  const controlUpdate = updateCurrentWeeklyDraft({ draftPath: safePath(root, draftPath), expectedWeek: fixtureWeek, entries: dailyControlEntries(context) });
  const controlPlan = projectControlPlan(context, contextPath, controlUpdate, draftPath);
  const controlPath = output(root, "daily/project-control/project-control-plan-" + context.local_day + ".json", controlPlan);

  const rerunBefore = sha256(readFileSync(safePath(root, draftPath), "utf8"));
  const knowledgeRerun = updateCurrentWeeklyDraft({ draftPath: safePath(root, draftPath), expectedWeek: fixtureWeek, entries: dailyKnowledgeEntries(context) });
  const controlRerun = updateCurrentWeeklyDraft({ draftPath: safePath(root, draftPath), expectedWeek: fixtureWeek, entries: dailyControlEntries(context) });
  const rerunAfter = sha256(readFileSync(safePath(root, draftPath), "utf8"));
  if (knowledgeRerun.state !== "duplicate" || controlRerun.state !== "duplicate" || rerunBefore !== rerunAfter) throw new Error("Current Weekly Draft rerun was not a zero-write duplicate.");

  const artifacts = [
    artifactRecord({ id: "daily-context", pipeline: "collector", artifactPath: safePath(root, contextPath), status: "collected", summary: "One bounded source-safe context." }),
    artifactRecord({ id: "project-memory", pipeline: "daily-project-memory", artifactPath: safePath(root, projectPlanPath), status: projectPlan.state, summary: projectPlan.patches.length + " Project section patches proposed." }),
    artifactRecord({ id: "documentation-quality", pipeline: "daily-documentation-quality", artifactPath: safePath(root, documentationPath), status: "proposed", summary: "Grouped documentation requests; delivery remains proposal-only." }),
    artifactRecord({ id: "project-control", pipeline: "daily-project-control", artifactPath: safePath(root, controlPath), status: controlUpdate.state, summary: controlPlan.control_findings.length + " control findings; owned Draft anchors updated directly." }),
    artifactRecord({ id: "knowledge-capture", pipeline: "daily-knowledge-capture", artifactPath: safePath(root, draftPath), status: knowledgeUpdate.state, summary: "Decisions and SOPs updated directly in the current Weekly Draft." })
  ];
  const dailyReceiptPath = output(root, "daily/receipt-" + context.local_day + ".json", {
    artifact_type: "kamdar-daily-automation-receipt",
    artifact_version: "0.2.0",
    automation_id: "kamdar-daily-operating-update",
    context_diff: contextPath,
    current_weekly_draft: {
      path: draftPath,
      sha256: sha256(readFileSync(safePath(root, draftPath), "utf8")),
      knowledge: publicDraftUpdate(knowledgeUpdate, draftPath),
      project_control: publicDraftUpdate(controlUpdate, draftPath)
    },
    pipeline_artifacts: artifacts,
    external_effects: { notion_writes: 0, messages_sent: 0, weekly_finalization: 0 },
    result: "prepared"
  });
  const weekly = weeklyFinalization({ root, context, draftPath });
  const result = {
    schema_version: 2,
    kind: "task0007-fixture-automation-run",
    run: { id: task0007AutomationId + "-" + context.local_day, output_root: root, mode: "local-markdown-draft-projection", provider_effects: false },
    daily: { context_path: contextPath, current_weekly_draft: draftPath, pipeline_artifacts: artifacts, receipt: dailyReceiptPath, idempotency: { knowledge: knowledgeRerun.state, project_control: controlRerun.state, draft_hash_unchanged: rerunBefore === rerunAfter } },
    weekly,
    feature_outcomes: [
      { feature_id: "FEAT-0001", outcome: "Project memory proposes source-linked Project patches." },
      { feature_id: "FEAT-0002", outcome: "Documentation gaps become grouped proposal-only requests." },
      { feature_id: "FEAT-0003", outcome: "Stale/blocked work updates PM/Risk/Cost Draft anchors and prepares no-send outreach." },
      { feature_id: "FEAT-0004", outcome: "Decision/SOP candidates update the current Weekly Draft directly." },
      { feature_id: "FEAT-0005", outcome: "Weekly finalization reads the Draft and renders Project, Department, and Company reports." },
      { feature_id: "FEAT-0006", outcome: "Unreviewed Decisions/SOPs remain Proposed in the finalization plan." },
      { feature_id: "FEAT-0007", outcome: "Project weekly attention remains an in-place Project patch." },
      { feature_id: "FEAT-0008", outcome: "Executive delivery remains absent." },
      { feature_id: "FEAT-0009", outcome: "Direct Draft reruns are source-keyed and zero-write." }
    ],
    limitations: ["This runner is deterministic local Markdown proof, not an LLM invocation or profile-installed scheduled Hermes run.", "No provider request is made; the isolated Notion operator separately exercises guarded Project-memory application."]
  };
  output(root, "result.json", result);
  return result;
}

function parseArgs(argv) {
  const options = { outputRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output") options.outputRoot = argv[++index] || null;
    else throw new Error("usage: node run-task0007-fixture-automation.mjs --output <new-private-run-directory>");
  }
  if (!options.outputRoot) throw new Error("--output is required.");
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(stable(runTask0007FixtureAutomation(parseArgs(process.argv.slice(2))))); }
  catch (error) { process.stderr.write(stable({ status: "blocked", reason: error.message })); process.exitCode = 1; }
}

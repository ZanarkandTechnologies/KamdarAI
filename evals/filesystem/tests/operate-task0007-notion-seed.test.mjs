import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  applyWeeklyReviewResultToNotion,
  canonicalReportText,
  currentEvalSeedEnvironment,
  preflightTask0007NotionSeed,
  provisionTask0007NotionSeed,
  repairCurrentNotionTemplateOwnership,
  rootTitle,
  seedCurrentNotionEnvironment
} from "../scripts/operate-task0007-notion-seed.mjs";

test("Notion table serialization preserves the report's canonical text", () => {
  const markdown = "## Outcome\n\n| Item | State |\n| --- | --- |\n| Sample | Approved |\n\n- [ ] Follow up [TASK-101]";
  const notion = "## Outcome\n<table header-row=\"true\"><tr><td>Item</td><td>State</td></tr><tr><td>Sample</td><td>Approved</td></tr></table>\n- [ ] Follow up \\[TASK-101\\]";
  assert.equal(canonicalReportText(notion), canonicalReportText(markdown));
});

function weeklyResult() {
  const companyExecutiveContext = {
    problems: [{ title: "Company source completeness", context_and_operating_impact: "An incomplete source chain prevents an accountable company view.", measurement_and_confidence: "All three expected Area reports are present with high confidence.", intervention_and_test: "Retain exact source IDs and verify them before finalization.", evidence_ids: ["RPT-AREA-CMT-W34"] }],
    decisions: [{ title: "Publish only a complete Company rollup", context_rationale_and_tradeoff: "Completeness is preferred over an earlier partial summary.", authority_and_timing: "The Weekly reviewer decides at cutoff.", consequence_and_review_trigger: "Block publication whenever an expected Area report is absent.", evidence_ids: ["RPT-AREA-CMT-W34"] }],
    sops: [{ title: "Keep source-chain verification in the Weekly review", workflow_and_output: "Verify Project to Area to Company source IDs before delivery.", proof_scope_and_owner: "The Weekly reviewer owns this control.", disposition: "bounded", destination_id: "SOP-WEEKLY-SOURCE-CHECK", evidence_ids: ["RPT-AREA-CMT-W34"] }],
  };
  const report = (report_id, report_level, project_id, area, source_report_ids, minute) => ({
    report_id,
    report_level,
    project_id,
    area,
    previous_report_id: null,
    source_report_ids,
    prior_version: null,
    report_version: 1,
    report_status: "Final",
    finalized_at: `2026-08-24T18:${minute}:00+08:00`,
    report_markdown: `# ${report_level === "Company" ? "Kamdar" : project_id || area} — Week of 2026-08-17\n\n## Summary\n\nGrounded weekly result for ${report_id}.${report_level === "Company" ? `\n\n## Problems and inefficiencies\n\n${companyExecutiveContext.problems.flatMap((entry) => [entry.title, entry.context_and_operating_impact, entry.measurement_and_confidence, entry.intervention_and_test]).join("\n\n")}\n\n## Decisions\n\n${companyExecutiveContext.decisions.flatMap((entry) => [entry.title, entry.context_rationale_and_tradeoff, entry.authority_and_timing, entry.consequence_and_review_trigger]).join("\n\n")}\n\n## SOPs\n\n${companyExecutiveContext.sops.flatMap((entry) => [entry.title, entry.workflow_and_output, entry.proof_scope_and_owner]).join("\n\n")}` : ""}`,
    company_executive_context: report_level === "Company" ? companyExecutiveContext : null,
    configuration_gaps: []
  });
  const projects = [
    report("RPT-PROJ-CMT_PIPELINE-W34", "Project", "PROJ-CMT-CMT_PIPELINE", "CMT", ["RPT-DRAFT-CMT-W34"], "01"),
    report("RPT-PROJ-MKT-DEEPAVALI_MARKETING-W34", "Project", "PROJ-MKT-DEEPAVALI_MARKETING", "Marketing", ["RPT-DRAFT-MKT-W34"], "02"),
    report("RPT-PROJ-ECOM-ECOM_FIXES-W34", "Project", "PROJ-ECOM-ECOM_FIXES", "Ecommerce", ["RPT-DRAFT-ECOM-W34"], "03")
  ];
  const areas = [
    report("RPT-AREA-CMT-W34", "Area", null, "CMT", [projects[0].report_id], "04"),
    report("RPT-AREA-MARKETING-W34", "Area", null, "Marketing", [projects[1].report_id], "05"),
    report("RPT-AREA-ECOMMERCE-W34", "Area", null, "Ecommerce", [projects[2].report_id], "06")
  ];
  const weeklyResult = {
    schema_version: "kamdar-weekly-review-result@1.0.0",
    context_id: "weekly-context-2026-W34",
    week: "2026-W34",
    report_results: [...projects, ...areas, report("RPT-COMPANY-W34", "Company", null, null, areas.map((row) => row.report_id), "07")],
    promotion_dispositions: [
      { candidate_id: "TASK-101", kind: "problem", source_report_id: projects[0].report_id, source_ids: [projects[0].report_id, "TASK-101"], disposition: "promoted", reason: "Production blocker is actionable.", destination_id: "ISSUE-CMT-01", rendered_markdown: "---\ntemplate_id: kamdar-issue\ntemplate_version: \"1.0.0\"\nname: \"Approve CMT production pack\"\nproject: \"PROJ-CMT-CMT_PIPELINE\"\ndepartment: \"CMT\"\npriority: \"High\"\nstart_date: \"2026-08-18\"\ndue_date: \"2026-08-27\"\nprogress: \"Production booking is blocked.\"\nlast_meaningful_update: \"2026-08-21\"\nworkflow: \"Pre-production handoff\"\nworkflow_step: \"Approve the canonical pack\"\nbaseline_date: \"2026-08-21\"\n---\n\n# Approve CMT production pack\n\n## Problem and impact\n\nThe production line cannot be booked from one approved pack.\n\n## Before baseline and economics\n\nFour rework hours at MYR 90/hour = MYR 360. Idle-line cost remains a measurement gap owned by Aisha.\n\n## Evidence and reproduction\n\nTASK-101.\n\n## Diagnosis\n\nApproval is missing.\n\n## Containment and next action\n\nAisha approves the pack.\n\n## Intervention and measurement plan\n\nUse one approved pack and measure rework and booking delay.\n\n## Resolution and verification\n\nBook from the approved pack.\n\n## After measurement and verified value\n\nNot measured yet.\n\n## Related records\n\nPROJ-CMT-CMT_PIPELINE.", gaps: [] },
      { candidate_id: "TASK-110", kind: "decision", source_report_id: projects[0].report_id, source_ids: [projects[0].report_id, "TASK-110"], disposition: "promoted", reason: "Baseline is approved.", destination_id: "DECISION-CMT-01", rendered_markdown: "---\ntemplate_id: company-os-decision\nname: \"Use signed sample baseline\"\nproject: \"PROJ-CMT-CMT_PIPELINE\"\ndepartment: \"CMT\"\nproposer: \"PERSON-AISHA\"\napprover: \"CMT Lead\"\nstatus: \"Approved\"\ndecided_at: \"2026-08-21\"\nreview_date: \"2026-08-29\"\n---\n\n# Use signed sample baseline\n\n## Context\n\nThe sample passed.\n\n## Options and tradeoffs\n\nOne pack or split files.\n\n## Decision rationale\n\nUse one source.\n\n## Consequences and review trigger\n\nReview after production.\n\n## Evidence and related records\n\nTASK-110.", gaps: [] },
      { candidate_id: "TASK-203", kind: "sop", source_report_id: projects[2].report_id, source_ids: [projects[2].report_id, "TASK-203"], disposition: "promoted", reason: "Method was reused.", destination_id: "SOP-ECOM-01", rendered_markdown: "---\ntemplate_id: kamdar-employee-sop\ntemplate_version: \"1.0.0\"\nname: \"Prepare listing handoff\"\nproject: \"PROJ-ECOM-ECOM_FIXES\"\ndepartment: \"Ecommerce\"\nowner: \"PERSON-DARREN\"\nstatus: \"Approved\"\nbaseline_version: \"1\"\neffective_date: \"2026-08-21\"\nlast_reviewed: \"2026-08-21\"\nnext_review: \"2026-08-29\"\n---\n\n# Prepare listing handoff\n\n## Purpose and outcome\n\nPrepare one complete listing record.\n\n## Trigger, actors, and inputs\n\nAn approved sample moves from Merchandising to Darren.\n\n## Current workflow\n\n1. Verify the approved sample.\n2. Assemble required facts and assets.\n3. Record receiver acceptance.\n\n## Timing and volume baseline\n\nReused twice; time and weekly volume require measurement.\n\n## Exceptions and controls\n\nRequires an approved sample.\n\n## Improvement and verification\n\nMeasure the next two batches.\n\n## Evidence and related records\n\nTASK-203.", gaps: [] }
    ],
    next_week_project_replacements: [],
    configuration_gaps: [],
    run_notes: "Provider-edge application fixture."
  };
  weeklyResult.promotion_dispositions[0].problem_baseline_proof = {
    workflow_name: "Pre-production handoff",
    affected_step: "Approve the canonical pack",
    baseline_date: "2026-08-21",
    measurement_window: "2026-08-18 through 2026-08-21",
    measured_metrics: ["Four rework hours at MYR 90/hour = MYR 360."],
    measurement_gaps: ["Idle-line cost remains unmeasured."],
    confidence: "high",
    measurement_owner_person_id: "PERSON-AISHA",
    intervention_plan: "Use one approved pack and measure rework and booking delay.",
    after_state: "not_measured"
  };
  weeklyResult.promotion_dispositions[1].decision_preservation_proof = {
    preservation_reasons: ["project_operating_standard", "costly_to_reverse"],
    reuse_value: "Future production handoffs can reuse the signed-source precedence rule.",
    materiality: "The choice controls production booking; the amount is not established.",
    options_considered: [
      { option: "Use one signed pack", upside: "One traceable source.", downside: "Requires controlled corrections." },
      { option: "Use split files", upside: "No consolidation delay.", downside: "Weak change control." }
    ],
    selected_option: "Use one signed pack",
    rationale: "It preserves one approved source.",
    authority_person_id: "PERSON-AISHA",
    decided_at: "2026-08-21",
    accepted_tradeoff: "Requires controlled corrections.",
    consequences: "Production uses only the signed source.",
    review_trigger: "Review after production."
  };
  weeklyResult.promotion_dispositions[1].rendered_markdown = weeklyResult.promotion_dispositions[1].rendered_markdown
    .replace("One pack or split files.", "- Use one signed pack — One traceable source; Requires controlled corrections.\n- Use split files — No consolidation delay; Weak change control.")
    .replace("Use one source.", "Use one signed pack because it preserves one approved source. Requires controlled corrections.");
  return weeklyResult;
}

function writeTierAWeeklyReview(privateRoot, resultPath, result) {
  const qualityReviewPath = resolve(privateRoot, "weekly-artifact-quality-review.json");
  const pointers = ["report_results", "promotion_dispositions", "next_week_project_replacements", "configuration_gaps"]
    .flatMap((key) => result[key].map((_, index) => `/${key}/${index}`));
  const check = { pass: true, evidence_refs: ["reviewed exact result payload"], findings: [] };
  writeFileSync(qualityReviewPath, JSON.stringify({
    schema_version: "kamdar-artifact-quality-review@1.0.0",
    lane: "artifact-quality-review",
    independent: true,
    scope: "weekly",
    context_id: result.context_id,
    result_sha256: createHash("sha256").update(JSON.stringify(result)).digest("hex"),
    rubric_path: "evals/rubrics/end-user-artifact-quality.md",
    tier: "A",
    verdict: "pass",
    artifacts: pointers.map((artifact_pointer) => ({ artifact_pointer, checks: {
      referential_clarity: check, end_user_value: check, readability: check,
      template_fidelity: check, groundedness: check, workflow_reconstructability: check,
      baseline_integrity: check,
    } })),
    hard_gate_failures: [],
    repair_route: "none",
    review_path: qualityReviewPath,
  }));
  return qualityReviewPath;
}

function textProperty(type, value) {
  const key = type === "title" ? "title" : "rich_text";
  return { type, [key]: value ? [{ plain_text: String(value), text: { content: String(value) } }] : [] };
}

function mockedNtn() {
  const calls = []; const databases = new Map(); const pages = new Map();
  const blockOwners = new Map();
  let sequence = 0; let root = null;
  const response = (value) => ({ status: 0, stdout: JSON.stringify(value) });
  const makePage = (properties, parent, markdown = "") => {
    sequence += 1; const id = `page-${sequence}`; const page = { id, url: `https://notion.test/${id}`, in_trash: false, properties, parent, markdown };
    pages.set(id, page); return page;
  };
  const runner = (args, { input } = {}) => {
    calls.push(args);
    if (args[0] === "api" && args[1] === "v1/pages") {
      const body = JSON.parse(args[args.indexOf("-d") + 1]);
      if (body.parent?.workspace) { root = makePage({ title: textProperty("title", body.properties?.title?.title?.[0]?.text?.content || rootTitle) }, body.parent); return response(root); }
      const page = makePage(body.properties, body.parent, body.markdown || ""); return response(page);
    }
    if (args[0] === "api" && args[1] === "v1/databases") {
      const body = JSON.parse(args[args.indexOf("-d") + 1]); sequence += 1;
      const databaseId = `database-${sequence}`; const dataSourceId = `source-${sequence}`;
      const rawTitle = body.title?.[0]?.text?.content || ""; const title = rawTitle.replace(/^\[EVAL\]\s*/, "");
      const properties = Object.fromEntries(Object.entries(body.initial_data_source.properties).map(([name, value]) => {
        const type = value.title ? "title" : value.select ? "select" : value.status ? "status" : "rich_text";
        return [name, { type }];
      }));
      databases.set(databaseId, { databaseId, dataSourceId, title, properties, pages: [] });
      return response({ id: databaseId });
    }
    if (args[0] === "datasources" && args[1] === "resolve") {
      const database = databases.get(args[2]); if (!database) return { status: 1, stderr: "unknown database" };
      return response({ database_id: database.databaseId, data_sources: [{ id: database.dataSourceId, name: database.title }] });
    }
    if (args[0] === "api" && args[1]?.startsWith("v1/data_sources/")) {
      const source = args[1].slice("v1/data_sources/".length); const database = [...databases.values()].find((entry) => entry.dataSourceId === source);
      if (!database) return { status: 1, stderr: "unknown data source" };
      return response({ id: database.dataSourceId, parent: { database_id: database.databaseId }, in_trash: false, properties: database.properties });
    }
    if (args[0] === "datasources" && args[1] === "query") {
      const database = [...databases.values()].find((entry) => entry.dataSourceId === args[2]);
      return response({ results: database?.pages || [], next_cursor: null });
    }
    if (args[0] === "api" && args[1]?.startsWith("v1/pages/")) {
      const page = pages.get(args[1].slice("v1/pages/".length)); return page ? response(page) : { status: 1, stderr: "unknown page" };
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "PATCH" && args[3]?.startsWith("v1/pages/")) {
      const page = pages.get(args[3].slice("v1/pages/".length)); const body = JSON.parse(args[args.indexOf("-d") + 1]); Object.assign(page.properties, body.properties); return response(page);
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "PATCH" && args[3]?.startsWith("v1/data_sources/")) {
      const source = args[3].slice("v1/data_sources/".length); const database = [...databases.values()].find((entry) => entry.dataSourceId === source);
      const body = JSON.parse(args[args.indexOf("-d") + 1]);
      for (const [name, value] of Object.entries(body.properties || {})) value === null ? delete database.properties[name] : database.properties[name] = value;
      return response({ id: source, properties: database.properties });
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "GET" && args[3]?.startsWith("v1/blocks/") && args[3]?.endsWith("/children")) {
      const pageId = args[3].slice("v1/blocks/".length, -"/children".length); const page = [...databases.values()].flatMap((database) => database.pages).find((entry) => entry.id === pageId) || pages.get(pageId);
      if (!page) return { status: 1, stderr: "unknown page" };
      const results = page.markdown ? [{ id: `block-${page.id}`, type: "paragraph" }] : [];
      for (const block of results) blockOwners.set(block.id, page);
      return response({ results, next_cursor: null });
    }
    if (args[0] === "api" && args[1] === "-X" && args[2] === "DELETE" && args[3]?.startsWith("v1/blocks/")) { const blockId = args[3].slice("v1/blocks/".length); const page = blockOwners.get(blockId); if (!page) return { status: 1, stderr: "unknown block" }; page.markdown = ""; return response({ id: blockId, in_trash: true }); }
    if (args[0] === "pages" && args[1] === "get") { const page = [...databases.values()].flatMap((database) => database.pages).find((entry) => entry.id === args[2]) || pages.get(args[2]); return page ? response({ markdown: { markdown: page.markdown } }) : { status: 1, stderr: "unknown page" }; }
    if (args[0] === "pages" && args[1] === "edit") { const page = [...databases.values()].flatMap((database) => database.pages).find((entry) => entry.id === args[2]) || pages.get(args[2]); page.markdown = input; return { status: 0, stdout: "" }; }
    if (args[0] === "api" && args[1] === "v1/pages") return { status: 1, stderr: "unreachable" };
    return { status: 1, stderr: `unexpected ${args.join(" ")}` };
  };
  // Page creation under a data source needs to populate the database query map.
  const wrapped = (args, options) => {
    const result = runner(args, options);
    if (args[0] === "api" && args[1] === "v1/pages" && result.status === 0) {
      const body = JSON.parse(args[args.indexOf("-d") + 1]);
      if (body.parent?.data_source_id) {
        const database = [...databases.values()].find((entry) => entry.dataSourceId === body.parent.data_source_id);
        const page = JSON.parse(result.stdout); database.pages.push(page);
      }
    }
    return result;
  };
  return { runner: wrapped, calls, databases, get root() { return root; } };
}

test("TASK-0007 fresh Notion seed remains root-bound, preflight-read-only, and message-free", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "task0007-notion-seed-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  const statePath = resolve(privateRoot, "state.json"); const receiptPath = resolve(privateRoot, "receipt.json"); const runRoot = resolve(privateRoot, "run-001");
  const provision = provisionTask0007NotionSeed({ commandRunner: mock.runner, statePath, privateRoot, runRoot });
  assert.equal(provision.status, "ready"); assert.equal(Object.keys(provision.databases).length, 7);
  const beforePreflight = mock.calls.length;
  const preflight = preflightTask0007NotionSeed({ commandRunner: mock.runner, statePath, privateRoot });
  assert.equal(preflight.applies_notion_writes, false);
  assert.equal(mock.calls.slice(beforePreflight).some((args) => args.includes("POST") || args.includes("PATCH") || args[1] === "v1/pages" || args[1] === "v1/databases"), false);
  const seeded = seedCurrentNotionEnvironment({ commandRunner: mock.runner, statePath, receiptPath, runRoot, privateRoot });
  assert.equal(seeded.applies_notion_writes, true);
  assert.equal(seeded.external_messages_sent, 0);
  assert.equal(seeded.actions.every((action) => action.provider === "notion"), true);
  assert.equal(seeded.actions.some((action) => /send|telegram|email/i.test(action.operation)), false);
  const rerun = seedCurrentNotionEnvironment({ commandRunner: mock.runner, statePath, receiptPath, runRoot, privateRoot });
  assert.equal(rerun.counts.applied, 0);
  assert.equal(rerun.counts.skipped, seeded.counts.expected);
});

test("template ownership repair removes legacy body mirrors without changing narrative content", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "repair-kamdar-template-ownership-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  provisionTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  seedCurrentNotionEnvironment({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  const projectDatabase = [...mock.databases.values()].find((database) => database.title === "Projects");
  const workDatabase = [...mock.databases.values()].find((database) => database.title === "Work items");
  projectDatabase.properties["Project knowledge"] = { type: "rich_text" };
  projectDatabase.properties["This week's attention"] = { type: "rich_text" };
  workDatabase.properties.Notes = { type: "rich_text" };
  const penang = projectDatabase.pages.find((page) => page.properties.ID.rich_text[0].text.content === "PROJ-CMT-CMT_PIPELINE");
  const metadataOnly = projectDatabase.pages.find((page) => page !== penang);
  penang.markdown = "- **ID:** PROJ-CMT-CMT_PIPELINE\n- **Template:** project\n## Overview\n\nKeep this narrative.";
  metadataOnly.markdown = `- **ID:** ${metadataOnly.properties.ID.rich_text[0].text.content}\n- **Template:** project\n`;
  const repaired = repairCurrentNotionTemplateOwnership({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  assert.deepEqual(repaired.counts, { body_repairs: 2, properties_removed: 3 });
  assert.equal(penang.markdown, "## Overview\n\nKeep this narrative.");
  assert.equal(metadataOnly.markdown, "");
  assert.equal("Project knowledge" in projectDatabase.properties, false);
  assert.equal("This week's attention" in projectDatabase.properties, false);
  assert.equal("Notes" in workDatabase.properties, false);
  const rerun = repairCurrentNotionTemplateOwnership({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  assert.deepEqual(rerun.counts, { body_repairs: 0, properties_removed: 0 });
});

test("a versioned current-seed environment creates a distinct root without touching the legacy state", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "current-kamdar-notion-seed-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  const provision = provisionTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  assert.equal(provision.namespace, currentEvalSeedEnvironment.namespace);
  assert.equal(mock.root.properties.title.title[0].plain_text, currentEvalSeedEnvironment.root_title);
  const preflight = preflightTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  assert.equal(preflight.root.title, currentEvalSeedEnvironment.root_title);
  assert.equal(preflight.applies_notion_writes, false);
});

test("the current environment can seed only canonical entities without legacy automation outputs", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "clean-current-kamdar-notion-seed-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  provisionTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  const seeded = seedCurrentNotionEnvironment({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  assert.equal(seeded.mode, "seed-only");
  assert.equal(seeded.counts.expected, 31);
  assert.equal(seeded.counts.applied, 31);
  assert.equal(seeded.actions.every((action) => /^seed:/.test(action.action_key)), true);
  assert.equal(seeded.actions.some((action) => /^apply:/.test(action.action_key)), false);
  assert.equal([...mock.databases.values()].find((database) => database.title === "Decisions").pages.length, 0);
  assert.equal([...mock.databases.values()].find((database) => database.title === "Automation artifacts").pages.length, 0);
  const workDatabase = [...mock.databases.values()].find((database) => database.title === "Work items");
  const projectDatabase = [...mock.databases.values()].find((database) => database.title === "Projects");
  assert.equal("Project knowledge" in projectDatabase.properties, false);
  assert.equal("This week's attention" in projectDatabase.properties, false);
  assert.equal("Notes" in workDatabase.properties, false);
  assert.equal(workDatabase.properties.Type.type, "select");
  assert.equal(workDatabase.properties.Status.type, "status");
  assert.equal(workDatabase.properties["AI review"].type, "select");
  assert.equal(workDatabase.properties["Daily review version"].type, "rich_text");
  const text = (property) => property?.rich_text?.[0]?.plain_text || property?.rich_text?.[0]?.text?.content;
  const processedWork = workDatabase.pages.find((page) => text(page.properties.ID) === "TASK-122");
  assert.equal(text(processedWork.properties["Daily review version"]), "daily-review-v2");
  assert.equal(processedWork.properties.Status.status.name, "Done");
  assert.equal(processedWork.properties["AI review"].select.name, "Processed");
  assert.equal(processedWork.properties.Type.select.name, "Task");
  const penangCreate = mock.calls
    .filter((args) => args[0] === "api" && args[1] === "v1/pages" && args.includes("-d"))
    .map((args) => JSON.parse(args[args.indexOf("-d") + 1]))
    .find((payload) => payload.properties?.ID?.rich_text?.[0]?.text?.content === "PROJ-CMT-CMT_PIPELINE");
  assert.ok(penangCreate);
  assert.doesNotMatch(penangCreate.markdown, /\*\*ID:\*\*|\*\*Template:\*\*/);
  for (const heading of ["Overview", "Project knowledge", "This week's attention", "Tasks", "Decisions made"]) assert.match(penangCreate.markdown, new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.equal("Project knowledge" in penangCreate.properties, false);
  assert.equal("This week's attention" in penangCreate.properties, false);
  const personCreate = mock.calls
    .filter((args) => args[0] === "api" && args[1] === "v1/pages" && args.includes("-d"))
    .map((args) => JSON.parse(args[args.indexOf("-d") + 1]))
    .find((payload) => payload.properties?.ID?.rich_text?.[0]?.text?.content === "PERSON-JUN");
  assert.match(personCreate.markdown, /^## Operating notes$/m);
  assert.doesNotMatch(personCreate.markdown, /sandbox-email-route-a/);
  assert.equal(personCreate.properties["Contact endpoint"].rich_text[0].text.content, "operator_secondary_email");
  assert.equal(personCreate.properties["Preferred contact channel"].select.name, "Email");
  const meetingCreate = mock.calls
    .filter((args) => args[0] === "api" && args[1] === "v1/pages" && args.includes("-d"))
    .map((args) => JSON.parse(args[args.indexOf("-d") + 1]))
    .find((payload) => payload.properties?.ID?.rich_text?.[0]?.text?.content === "TASK-201");
  for (const heading of ["Purpose and agenda", "Notes", "Decisions", "Commitments", "Follow-up"]) assert.match(meetingCreate.markdown, new RegExp(`^## ${heading}$`, "m"));
  assert.equal(meetingCreate.properties["Meeting date"].rich_text[0].text.content, "2026-08-21");
});

test("an extracted Weekly result is applied Project then Area then Company with exact read-back receipts", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "weekly-result-notion-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  provisionTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  const resultPath = resolve(privateRoot, "weekly-result.json");
  const result = weeklyResult();
  writeFileSync(resultPath, JSON.stringify(result));
  const qualityReviewPath = writeTierAWeeklyReview(privateRoot, resultPath, result);
  const applied = applyWeeklyReviewResultToNotion({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment, resultPath, qualityReviewPath });
  assert.deepEqual(applied.counts, { expected: 10, applied: 10, skipped: 0, project_reports: 3, area_reports: 3, company_reports: 1, promotions: 3 });
  assert.equal(applied.external_messages_sent, 0);
  assert.deepEqual(applied.reports.map((entry) => entry.report_level), ["Project", "Project", "Project", "Area", "Area", "Area", "Company"]);
  assert.equal(applied.reports.every((entry) => entry.read_back.matched && entry.read_back.url.startsWith("https://notion.test/")), true);
  assert.equal(applied.reports.every((entry) => entry.payload_sha256.length === 64 && entry.read_back.report_markdown_sha256.length === 64), true);
  assert.deepEqual(applied.promotions.map((entry) => entry.kind), ["problem", "decision", "sop"]);
  assert.equal(applied.promotions.every((entry) => entry.read_back.matched), true);
  const reportsDatabase = [...mock.databases.values()].find((database) => database.title === "Reports");
  const company = reportsDatabase.pages.find((page) => page.properties.ID.rich_text[0].text.content === "RPT-COMPANY-W34");
  assert.equal(company.properties["Week start"].rich_text[0].text.content, "2026-08-17");
  assert.equal(company.properties.Department.rich_text.length, 0);
  assert.equal(company.properties.Template.rich_text[0].text.content, "kamdar-company-operating-rollup");
  assert.equal(company.properties["Source report IDs"].rich_text[0].text.content, "RPT-AREA-CMT-W34, RPT-AREA-MARKETING-W34, RPT-AREA-ECOMMERCE-W34");
  assert.equal(company.markdown, weeklyResult().report_results.at(-1).report_markdown);
  const rerun = applyWeeklyReviewResultToNotion({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment, resultPath, qualityReviewPath });
  assert.deepEqual(rerun.counts, { expected: 10, applied: 0, skipped: 10, project_reports: 3, area_reports: 3, company_reports: 1, promotions: 3 });
});

test("Weekly application refuses incomplete Area coverage before Notion writes", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "weekly-result-gate-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  provisionTask0007NotionSeed({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment });
  const incomplete = weeklyResult();
  incomplete.report_results = incomplete.report_results.filter((report) => report.report_id !== "RPT-AREA-MARKETING-W34");
  const resultPath = resolve(privateRoot, "weekly-result.json");
  writeFileSync(resultPath, JSON.stringify(incomplete));
  const qualityReviewPath = writeTierAWeeklyReview(privateRoot, resultPath, incomplete);
  const before = mock.calls.length;
  assert.throws(
    () => applyWeeklyReviewResultToNotion({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment, resultPath, qualityReviewPath }),
    /Area reports must exactly cover Project areas/
  );
  assert.equal(mock.calls.length, before);
});

test("Weekly application refuses an unreviewed result before Notion writes", (t) => {
  const privateRoot = mkdtempSync(resolve(tmpdir(), "weekly-quality-gate-"));
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }));
  const mock = mockedNtn();
  const result = weeklyResult();
  const resultPath = resolve(privateRoot, "weekly-result.json");
  writeFileSync(resultPath, JSON.stringify(result));
  const before = mock.calls.length;
  assert.throws(
    () => applyWeeklyReviewResultToNotion({ commandRunner: mock.runner, privateRoot, environment: currentEvalSeedEnvironment, resultPath }),
    /artifact quality review path must be absolute/
  );
  assert.equal(mock.calls.length, before);
});

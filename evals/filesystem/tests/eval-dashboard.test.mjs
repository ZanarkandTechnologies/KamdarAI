import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildEvalDashboardModel } from "../scripts/eval-dashboard-model.mjs";
import { renderJsonBlock, renderPastelSquare, renderStatusPill } from "../scripts/eval-dashboard-components.mjs";
import { renderEntityCard } from "../scripts/eval-dashboard-entity-components.mjs";
import { renderEvalDashboardHtml } from "../scripts/eval-dashboard-html.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");
const dailySuitePath = resolve(repoRoot, "evals/daily-review-evals.json");
const weeklySuitePath = resolve(repoRoot, "evals/weekly-review-evals.json");
const dailyRunRoot = resolve(filesystemRoot, "runs/deployments/seed-v2-2026-08-25-01/daily-eval");
const weeklyRunRoot = resolve(filesystemRoot, "runs/deployments/seed-v2-2026-08-25-02/weekly-eval");
const featureDocsRoot = resolve(repoRoot, "docs/features");

function build(overrides = {}) {
  return buildEvalDashboardModel({
    suiteRuns: [
      { suitePath: overrides.dailySuitePath || dailySuitePath, runRoot: overrides.dailyRunRoot || dailyRunRoot },
      { suitePath: weeklySuitePath, runRoot: weeklyRunRoot }
    ],
    featureDocsRoot: overrides.featureDocsRoot || featureDocsRoot,
    operatedEvidencePath: overrides.operatedEvidencePath || null
  });
}

test("dashboard expands the typed suites into every feature-case membership", () => {
  const model = build();
  assert.equal(model.totals.features, 7);
  assert.equal(model.totals.cases, 13);
  assert.equal(model.totals.statuses.PASSED, 13);
  assert.deepEqual(model.features.map(({ feature_id }) => feature_id), [
    "FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004", "FEAT-0005", "FEAT-0006", "FEAT-0007"
  ]);
  assert.equal(model.features[0].cases[0].starting_entities[0].id, "PROJ-CMT-CMT_PIPELINE");
  assert.equal(model.features[0].cases[0].entity_labels["PERSON-AISHA"], "Aisha Rahman");
  assert.ok(Array.isArray(model.features[0].cases[0].actual));
  assert.ok(model.features[0].cases[0].checks.every(({ met }) => met));
});

test("compact seed records normalize into populated typed cards", () => {
  const model = build();
  const entities = model.features.flatMap((feature) => feature.cases.flatMap((row) => row.starting_entities));
  const project = entities.find((entity) => entity.entity_type === "projects" && entity.id === "PROJ-CMT-CMT_PIPELINE");
  const work = entities.find((entity) => entity.entity_type === "work_items");
  const meeting = entities.find((entity) => entity.entity_type === "meetings");
  const report = entities.find((entity) => entity.entity_type === "reports");
  assert.ok(project.overview.objective);
  assert.ok(project.overview.main_blocker);
  assert.ok(project.attention.targets.length);
  assert.ok(work.notes.next_action || work.notes.completion_summary);
  assert.ok(meeting.purpose);
  assert.ok(report.sections.Summary.text);
  const projectCard = renderEntityCard(project, 0, { labels: model.features[0].cases[0].entity_labels });
  assert.match(projectCard, /<h4>Objective<\/h4>/);
  assert.match(projectCard, /<h4>This week<\/h4>/);
  assert.match(projectCard, /class="raw-entity-data"/);
  assert.match(projectCard, /Technical source data/);
  assert.doesNotMatch(projectCard, /View raw JSON/);
});

test("case prompt and feature title mutations flow through without renderer edits", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-source-"));
  try {
    const mutatedSuitePath = resolve(root, "daily-review-evals.json");
    const suite = JSON.parse(readFileSync(dailySuitePath, "utf8"));
    suite.cases[0].prompt = "MUTATED CASE PROMPT FROM TYPED SUITE";
    writeFileSync(mutatedSuitePath, JSON.stringify(suite), "utf8");
    const mutatedDocs = resolve(root, "features");
    cpSync(featureDocsRoot, mutatedDocs, { recursive: true });
    const featureDoc = resolve(mutatedDocs, "FEAT-0001-daily-project-memory.md");
    writeFileSync(featureDoc, readFileSync(featureDoc, "utf8").replace("title: Keep Project pages current", "title: MUTATED FEATURE TITLE FROM DOC"), "utf8");
    const html = renderEvalDashboardHtml(build({ dailySuitePath: mutatedSuitePath, featureDocsRoot: mutatedDocs }));
    assert.match(html, /MUTATED CASE PROMPT FROM TYPED SUITE/);
    assert.match(html, /MUTATED FEATURE TITLE FROM DOC/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a downgraded judge changes every owned case row to FAILED", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-judge-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    const judgePath = resolve(root, "eval/judges/FEAT-0001.json");
    const judge = JSON.parse(readFileSync(judgePath, "utf8"));
    judge.tier = "C";
    judge.verdict = "fail";
    judge.failures = ["Mutated failure from judge artifact"];
    writeFileSync(judgePath, JSON.stringify(judge), "utf8");
    const feature = build({ dailyRunRoot: root }).features.find(({ feature_id }) => feature_id === "FEAT-0001");
    assert.ok(feature.cases.every(({ status }) => status === "FAILED"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing declared judge fails the build instead of inferring a verdict", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-missing-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    rmSync(resolve(root, "eval/judges/FEAT-0002.json"));
    assert.throws(() => build({ dailyRunRoot: root }), /Missing declared FEAT-0002 judge/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renderer contains the accepted componentized pastel-on-black states and no feature-owned source literals", () => {
  const model = build();
  const html = renderEvalDashboardHtml(model);
  const rendererPaths = [
    "eval-dashboard-html.mjs",
    "eval-dashboard-components.mjs",
    "eval-dashboard-entity-components.mjs",
    "eval-dashboard-theme.mjs",
    "eval-dashboard-client.mjs",
    "eval-dashboard-primitives.mjs"
  ].map((name) => resolve(filesystemRoot, "scripts", name));
  const rendererSource = rendererPaths.map((path) => readFileSync(path, "utf8")).join("\n");
  const documentSource = readFileSync(rendererPaths[0], "utf8");
  assert.match(html, /class="workspace"/);
  assert.match(html, /class="list-panel"/);
  assert.match(html, /class="inspector"/);
  assert.match(html, /grid-template-columns: minmax\(0, 62fr\) minmax\(340px, 38fr\)/);
  assert.match(html, /@media \(max-width: 900px\)/);
  assert.match(html, /Technical evidence/);
  assert.match(html, /class="pastel-square tone-/);
  assert.match(html, /class="status-pill passed"/);
  assert.match(html, /class="metric-pill"/);
  assert.match(html, /class="json-block"/);
  assert.match(html, /class="json-key"/);
  assert.match(rendererSource, /--bg: #060606/);
  assert.match(rendererSource, /--pastel-peach: #f2ceb0/);
  assert.match(rendererSource, /--pastel-lavender: #cec7ed/);
  assert.match(rendererSource, /--pastel-mint: #b9ddcb/);
  assert.match(rendererSource, /--pastel-pink: #e8b7c5/);
  assert.match(rendererSource, /--pastel-yellow: #ead99d/);
  assert.match(rendererSource, /scrollbar-color: #343434 #090909/);
  assert.match(rendererSource, /body\.inspector-open \.list-panel \{ overflow: hidden; \}/);
  assert.match(rendererSource, /document\.body\.classList\.add\('inspector-open'\)/);
  assert.match(rendererSource, /\.inspector > \.prompt \{ margin: 9px 12px 12px/);
  assert.match(rendererSource, /\.inspector \.kicker \{ margin: 0 0 5px/);
  assert.doesNotMatch(rendererSource, /#050605|#0d0f0d|#101210|#0c0e0c|#bccbb7|#141714|#0b0d0b/);
  assert.doesNotMatch(documentSource, /function renderCaseRow|function renderInspector|--pastel-mint|querySelectorAll\('\.case-row'\)/);
  for (const feature of model.features) {
    assert.doesNotMatch(rendererSource, new RegExp(feature.feature_id));
    assert.doesNotMatch(rendererSource, new RegExp(feature.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const row of feature.cases) assert.doesNotMatch(rendererSource, new RegExp(row.case_id));
  }
});

test("small reusable primitives render semantic accents without domain data", () => {
  assert.equal(renderPastelSquare("peach"), '<span class="pastel-square tone-peach" aria-hidden="true"></span>');
  assert.equal(renderStatusPill("NOT RUN"), '<span class="status-pill not-run">NOT RUN</span>');
});

test("JSON evidence uses one escaped syntax-highlighted component", () => {
  const block = renderJsonBlock({ label: "<unsafe>", active: true, count: 3, empty: null });
  assert.match(block, /class="json-block"/);
  assert.match(block, /class="json-key">&quot;label&quot;/);
  assert.match(block, /class="json-string">&quot;&lt;unsafe&gt;&quot;/);
  assert.match(block, /class="json-boolean">true/);
  assert.match(block, /class="json-number">3/);
  assert.match(block, /class="json-null">null/);
  assert.doesNotMatch(block, /<unsafe>/);
});

test("typed entity cards render operational fields before collapsed raw JSON", () => {
  const labels = {
    "PERSON-AISHA": "Aisha Rahman",
    "PROJ-PENANG": "Penang Replenishment Accuracy"
  };
  const project = renderEntityCard({
    entity_type: "projects",
    id: "PROJ-PENANG",
    name: "Penang Replenishment Accuracy",
    owner: "PERSON-AISHA",
    status: "At risk",
    progress: "Two of five targets complete.",
    overview: { objective: "Reduce variance.", main_blocker: "Approval is missing." },
    attention: { targets: ["[x] Sign baseline", "[ ] Confirm approval"] }
  }, 0, { labels });
  assert.match(project, /class="entity entity-card entity-projects"/);
  assert.match(project, /Aisha Rahman/);
  assert.match(project, /Reduce variance/);
  assert.match(project, /1 of 2 weekly targets complete/);
  assert.match(project, /class="raw-entity-data"/);
  assert.doesNotMatch(project, /raw-entity-data" open/);

  const work = renderEntityCard({
    entity_type: "work_items",
    id: "TASK-1",
    name: "Confirm approval",
    project: "PROJ-PENANG",
    owner: "PERSON-AISHA",
    status: "Blocked",
    notes: { blocker: "Approval is missing.", next_action: "Ask the owner." }
  }, 1, { labels });
  assert.match(work, /Penang Replenishment Accuracy/);
  assert.match(work, /Ask the owner/);
  assert.match(work, /state-blocked/);
});

test("meeting, person, and report cards use their own semantic layouts", () => {
  const meeting = renderEntityCard({ entity_type: "meetings", id: "MTG-1", name: "Review", completed_at: "2026-08-21", purpose: "Review evidence.", decision: { summary: "Use the baseline." } }, 0);
  const person = renderEntityCard({ entity_type: "people", id: "PERSON-1", name: "Aisha", role: "PM", department: "CMT" }, 1);
  const report = renderEntityCard({ entity_type: "reports", id: "RPT-1", name: "Weekly", status: "Final", sections: { "Problems and inefficiencies": { items: ["Manual remapping"] }, Decisions: { items: ["Use baseline"] }, SOPs: { items: [] } } }, 2);
  assert.match(meeting, /Review evidence/);
  assert.match(meeting, /Use the baseline/);
  assert.match(person, /<b>Role<\/b>PM/);
  assert.match(report, /1 Problems/);
  assert.match(report, /1 Decisions/);
  assert.match(report, /class="report-section"/);
});

test("operated evidence JSON replaces mock links without renderer literals", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-operated-evidence-"));
  try {
    const path = resolve(root, "operated-evidence.json");
    writeFileSync(path, JSON.stringify({
      schema_version: "kamdar-operated-evidence@1.0.0",
      deployment: "test-deployment",
      root_url: "https://app.notion.com/p/test-root",
      features: Array.from({ length: 7 }, (_, index) => ({
        feature_id: `FEAT-${String(index + 1).padStart(4, "0")}`,
        summary: `Operated feature ${index + 1}`,
        urls: [`https://app.notion.com/p/feature-${index + 1}`]
      }))
    }));
    const model = build({ operatedEvidencePath: path });
    assert.equal(model.deployment.id, "test-deployment");
    assert.deepEqual(model.features[0].cases[0].technical.urls, ["https://app.notion.com/p/feature-1"]);
    assert.equal(model.features[0].cases[0].technical.operated_summary, "Operated feature 1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

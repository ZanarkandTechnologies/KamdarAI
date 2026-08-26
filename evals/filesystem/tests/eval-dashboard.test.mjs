import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildEvalDashboardModel } from "../scripts/eval-dashboard-model.mjs";
import {
  renderInspector,
  renderJsonBlock,
  renderPastelSquare,
  renderProjectUpdate,
  renderStatusPill,
  renderTypedOutput,
} from "../scripts/eval-dashboard-components.mjs";
import { renderEntityCard } from "../scripts/eval-dashboard-entity-components.mjs";
import { renderEvalDashboardHtml } from "../scripts/eval-dashboard-html.mjs";
import { resolveEvalDashboardMode } from "../scripts/serve-eval-dashboard.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");
const dailySuitePath = resolve(repoRoot, "evals/daily-review-evals.json");
const weeklySuitePath = resolve(repoRoot, "evals/weekly-review-evals.json");
const dailyRunRoot = resolve(filesystemRoot, "runs/deployments/seed-v2-2026-08-25-01/daily-eval");
const weeklyRunRoot = resolve(filesystemRoot, "runs/deployments/seed-v2-2026-08-25-02/weekly-eval");
const freshDailyRunRoot = resolve(filesystemRoot, "runs/deployments/task0010-fresh-2026-08-26-01/daily-eval");
const featureDocsRoot = resolve(repoRoot, "docs/features");
const authoredDailySuite = JSON.parse(readFileSync(dailySuitePath, "utf8"));

function build(overrides = {}) {
  return buildEvalDashboardModel({
    suiteRuns: [
      { suitePath: overrides.dailySuitePath || dailySuitePath, runRoot: overrides.dailyRunRoot || dailyRunRoot },
      { suitePath: weeklySuitePath, runRoot: overrides.weeklyRunRoot || weeklyRunRoot }
    ],
    featureDocsRoot: overrides.featureDocsRoot || featureDocsRoot,
    operatedEvidencePath: overrides.operatedEvidencePath || null
  });
}

function refreshDailyJudges(root) {
  for (const feature of authoredDailySuite.features) {
    const judgePath = resolve(root, `eval/judges/${feature.feature_id}.json`);
    const judge = JSON.parse(readFileSync(judgePath, "utf8"));
    const evidence = feature.assertions.map((_, index) => `${feature.result_path}#current-assertion-${index + 1}`);
    judge.tier = "A";
    judge.verdict = "pass";
    judge.rubric = {
      groundedness: "A",
      completeness: "A",
      usefulness: "A",
      repeatability: "A",
      length_balance: "A",
    };
    judge.failures = [];
    judge.evidence_refs = evidence;
    judge.assertions = feature.assertions.map((assertion, index) => ({ assertion, met: true, evidence_refs: [evidence[index]] }));
    writeFileSync(judgePath, JSON.stringify(judge), "utf8");
  }
}

test("local dashboard defaults to internal mode unless a presentation manifest is supplied", () => {
  assert.equal(resolveEvalDashboardMode({}), "internal");
  assert.equal(resolveEvalDashboardMode({ PRESENTATION_ELIGIBILITY_MANIFEST: "/tmp/eligibility.json" }), "presentation");
  assert.equal(resolveEvalDashboardMode({ EVAL_DASHBOARD_MODE: "internal", PRESENTATION_ELIGIBILITY_MANIFEST: "/tmp/eligibility.json" }), "internal");
  assert.throws(() => resolveEvalDashboardMode({ EVAL_DASHBOARD_MODE: "public" }), /must be presentation or internal/);
});

test("dashboard projects each typed scenario once with its own proof bindings", () => {
  const model = build();
  assert.equal(model.totals.features, 7);
  assert.equal(model.totals.cases, 11);
  assert.equal(model.totals.statuses.PASSED, 0);
  assert.equal(model.totals.statuses["NOT RUN"], 11);
  assert.equal(model.groups.length, 2);
  assert.deepEqual(model.features.map(({ feature_id }) => feature_id), [
    "FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004", "FEAT-0005", "FEAT-0006", "FEAT-0007"
  ]);
  const first = model.groups[0].cases[0];
  assert.equal(first.starting_entities[0].id, "PROJ-CMT-CMT_PIPELINE");
  assert.equal(first.entity_labels["PERSON-AISHA"], "Aisha Rahman");
  assert.ok(Array.isArray(first.observed.result_slices));
  assert.equal(first.status, "NOT RUN");
  assert.equal(first.technical.feature_ids.length, 1);
  assert.equal(first.technical.result_paths.length, 1);
  const featureScenarios = model.groups.flatMap((group) => group.cases).filter((row) => row.tags.includes("feature"));
  assert.equal(featureScenarios.length, 7);
  assert.deepEqual(featureScenarios.flatMap((row) => row.technical.feature_ids).sort(), [
    "FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004", "FEAT-0005", "FEAT-0006", "FEAT-0007"
  ]);
  for (const row of featureScenarios) {
    assert.equal(row.technical.feature_ids.length, 1, row.case_id);
    assert.equal(row.technical.result_paths.length, 1, row.case_id);
    assert.ok(row.result.checks.some(({ assertion }) => assertion === "The declared output file exists and parses"), row.case_id);
    assert.ok(row.result.checks.some(({ assertion }) => assertion.startsWith("The output contains the asserted content at ")), row.case_id);
    assert.ok(row.result.checks.length >= 6, row.case_id);
    assert.ok(row.technical.review_result_path, row.case_id);
  }
});

test("safe operational failure refuses a stale feature judge instead of showing a false pass", () => {
  const row = build().groups[0].cases.find(({ case_id }) => case_id === "keeps-work-open-on-required-failure");
  assert.equal(row.status, "NOT RUN");
  assert.match(row.result.reason, /saved feature judge does not cover the current authored assertions/);
  assert.deepEqual(row.observed.facts.map(({ label, state }) => ({ label, state })), [
    { label: "EFFECT-DRAFT-TASK-203", state: "failed" },
    { label: "TASK-203", state: "unprocessed" },
    { label: "processing-safety", state: "passed" }
  ]);
  assert.deepEqual(row.technical.feature_ids, ["FEAT-0004"]);
  assert.deepEqual(row.technical.integration_gate_ids, ["processing-safety"]);
});

test("compact seed records normalize into populated typed cards", () => {
  const model = build();
  const entities = model.groups.flatMap((group) => group.cases.flatMap((row) => row.starting_entities));
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
  const projectCard = renderEntityCard(project, 0, { labels: model.groups[0].cases[0].entity_labels });
  assert.match(projectCard, /<h4>Objective<\/h4>/);
  assert.match(projectCard, /<h4>This week<\/h4>/);
  assert.match(projectCard, /Open source ↗/);
  assert.doesNotMatch(projectCard, /Open source collection/);
  assert.doesNotMatch(projectCard, /raw-entity-data|Technical source data|View raw JSON/);
});

test("canonical metadata title and prompt mutations flow through without renderer edits", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-source-"));
  try {
    const mutatedSuitePath = resolve(root, "daily-review-evals.json");
    const suite = JSON.parse(readFileSync(dailySuitePath, "utf8"));
    suite.evals[0].prompt = "MUTATED CASE QUERY FROM TYPED SUITE";
    suite.evals[0].metadata.title = "MUTATED SCENARIO TITLE FROM TYPED SUITE";
    writeFileSync(mutatedSuitePath, JSON.stringify(suite), "utf8");
    const html = renderEvalDashboardHtml(build({ dailySuitePath: mutatedSuitePath }));
    assert.match(html, /MUTATED CASE QUERY FROM TYPED SUITE/);
    assert.match(html, /MUTATED SCENARIO TITLE FROM TYPED SUITE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a downgraded judge changes only scenarios bound to that feature", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-judge-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    refreshDailyJudges(root);
    const judgePath = resolve(root, "eval/judges/FEAT-0001.json");
    const judge = JSON.parse(readFileSync(judgePath, "utf8"));
    judge.tier = "C";
    judge.verdict = "fail";
    judge.failures = ["Mutated failure from judge artifact"];
    writeFileSync(judgePath, JSON.stringify(judge), "utf8");
    const cases = build({ dailyRunRoot: root }).groups[0].cases;
    for (const row of cases) {
      const bindsFeature = row.technical.feature_ids.includes("FEAT-0001");
      assert.equal(row.status, bindsFeature ? "FAILED" : "PASSED", row.case_id);
    }
    const failed = cases.find((row) => row.technical.feature_ids.includes("FEAT-0001"));
    assert.equal(failed.result.reason, "Mutated failure from judge artifact");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fresh failure projects completion, concrete cause, and exact Project section conflicts", () => {
  const row = build({ dailyRunRoot: freshDailyRunRoot }).groups[0].cases
    .find(({ case_id }) => case_id === "updates-project-context-from-progress");
  assert.equal(row.status, "FAILED");
  assert.deepEqual(row.result.required_summary, { passed: 3, total: 4 });
  assert.equal(row.result.required_checks.length, 4);
  assert.equal(row.result.reason, "The agent used stale text for 3 of 3 Project sections, so the safe update check would reject the replacements.");
  assert.equal(row.observed.result_slices[0].items[0].pointer, "/project_updates/0");
  assert.equal(row.observed.output_view.target_label, "CMT Pipeline");
  assert.equal(row.observed.output_view.delivery_state, "applied");
  assert.equal(row.observed.output_view.read_back_state, "matched");
  assert.deepEqual(row.observed.output_view.sections.map(({ section, matches }) => ({ section, matches })), [
    { section: "Overview", matches: false },
    { section: "Project knowledge", matches: false },
    { section: "This week's attention", matches: false },
  ]);
  assert.match(row.observed.output_view.sections[0].actual_current_text, /Move approved garment samples/);
  assert.match(row.observed.output_view.sections[0].expected_current_text, /Move approved seasonal styles/);
  assert.match(row.observed.output_view.sections[0].replacement_text, /capacity is held through 27 August/);
});

test("dashboard derives completeness from assertion coverage and reads the other rubric grades", () => {
  assert.deepEqual(build().groups[0].cases[0].result.quality_metrics.map(({ grade }) => grade), [null, null, null, null, null]);
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-rubric-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    refreshDailyJudges(root);
    const row = build({ dailyRunRoot: root }).groups[0].cases[0];
    assert.deepEqual(row.result.quality_metrics.map(({ key, grade, score }) => ({ key, grade, score })), [
      { key: "groundedness", grade: "A", score: undefined },
      { key: "completeness", grade: null, score: 100 },
      { key: "usefulness", grade: "A", score: undefined },
      { key: "repeatability", grade: "A", score: undefined },
      { key: "length_balance", grade: "A", score: undefined },
    ]);
    assert.deepEqual(row.result.quality_metrics[1], {
      key: "completeness", label: "Completeness", grade: null, score: 100,
      matched: 4, total: 4, status: "evaluated", feature_ids: ["FEAT-0001"],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("artifact-quality rows join by exact pointer and fail only the owning scenario", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-quality-"));
  try {
    cpSync(freshDailyRunRoot, root, { recursive: true });
    refreshDailyJudges(root);
    const qualityPath = resolve(root, "eval/artifact-quality-review.json");
    const quality = JSON.parse(readFileSync(qualityPath, "utf8"));
    quality.review_path = qualityPath;
    quality.tier = "C";
    quality.verdict = "revise";
    quality.hard_gate_failures = [];
    quality.repair_route = "regenerate";
    for (const artifact of quality.artifacts) for (const check of Object.values(artifact.checks)) {
      check.pass = true;
      check.findings = [];
    }
    const project = quality.artifacts.find(({ artifact_pointer }) => artifact_pointer === "/project_updates/0");
    project.checks.groundedness.pass = false;
    project.checks.groundedness.findings = ["Only the Project output has a groundedness defect."];
    writeFileSync(qualityPath, JSON.stringify(quality));
    const rows = build({ dailyRunRoot: root }).groups[0].cases;
    const projectScenario = rows.find(({ case_id }) => case_id === "updates-project-context-from-progress");
    const documentationScenario = rows.find(({ case_id }) => case_id === "checks-completed-work-documentation");
    assert.equal(projectScenario.result.artifact_quality.status, "FAILED");
    assert.deepEqual(projectScenario.result.artifact_quality.artifact_pointers, ["/project_updates/0"]);
    assert.match(projectScenario.result.artifact_quality.findings[0], /only the Project output/i);
    assert.equal(documentationScenario.result.artifact_quality.status, "PASSED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("every declared Daily and Weekly output path has a typed readable view", () => {
  const model = build({ dailyRunRoot: freshDailyRunRoot, weeklyRunRoot: resolve(filesystemRoot, "runs/deployments/task0010-fresh-2026-08-26-01/weekly-eval") });
  const kinds = new Set(model.groups.flatMap((group) => group.cases.flatMap((row) => row.observed.output_views.map(({ kind }) => kind))));
  for (const kind of ["project-section-replacements", "message-output", "knowledge-output", "document-output", "promotion-output", "empty-output"]) assert.ok(kinds.has(kind), kind);
});

test("a failed integration gate affects only scenarios bound to that gate", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-gate-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    refreshDailyJudges(root);
    const integrationPath = resolve(root, "eval/integrations.json");
    const integrations = JSON.parse(readFileSync(integrationPath, "utf8"));
    const gate = integrations.gates.find(({ gate_id }) => gate_id === "processing-safety");
    gate.pass = false;
    gate.failures = ["Mutated processing safety failure"];
    integrations.pass = false;
    writeFileSync(integrationPath, JSON.stringify(integrations), "utf8");
    const cases = build({ dailyRunRoot: root }).groups[0].cases;
    for (const row of cases) {
      const bindsGate = row.technical.integration_gate_ids.includes("processing-safety");
      assert.equal(row.status, bindsGate ? "FAILED" : "PASSED", row.case_id);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("observed result slices reject a wrong primary target even when a related bound ID is mentioned", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-dashboard-target-"));
  try {
    cpSync(dailyRunRoot, root, { recursive: true });
    const resultPath = resolve(root, "daily/review/daily-review-result-2026-08-25.json");
    const result = JSON.parse(readFileSync(resultPath, "utf8"));
    result.project_updates[0].project_id = "PROJ-WRONG-TARGET";
    result.project_updates[0].source_ids = ["TASK-101"];
    writeFileSync(resultPath, JSON.stringify(result), "utf8");
    const scenario = build({ dailyRunRoot: root }).groups[0].cases.find(({ case_id }) => case_id === "updates-project-context-from-progress");
    const slice = scenario.observed.result_slices.find(({ path }) => path === "project_updates");
    assert.deepEqual(slice.value, []);
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
  const model = build({ dailyRunRoot: freshDailyRunRoot });
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
  assert.match(html, /grid-template-columns: minmax\(300px, 40fr\) minmax\(520px, 60fr\)/);
  assert.match(html, /@media \(max-width: 900px\)/);
  for (const label of ["Task", "Source input", "Assertion review", "Quality gates", "Technical proof"]) assert.match(html, new RegExp(`>${label}<`));
  for (const label of ["Quality grades", "Groundedness", "Completeness", "Usefulness", "Repeatability", "Length balance"]) assert.match(html, new RegExp(label));
  for (const label of ["Assertion review", "Actual agent output", "Expected criteria", "MET", "MISSED", "Source input"]) assert.match(html, new RegExp(label));
  assert.match(html, /Not evaluated/);
  assert.match(html, /Agent output/);
  assert.doesNotMatch(html, /<h5>(?:Actual current|Agent expected current|Current Project|Proposed update|Proposed replacement)<\/h5>|Current text verified — safe to apply/);
  assert.doesNotMatch(html, /<button[^>]+role="tab"/);
  assert.doesNotMatch(html.split('<details class="technical">')[0], /Output file checked|Content asserted at/);
  assert.doesNotMatch(html, /after-effects|canary/i);
  assert.doesNotMatch(html, /undefined — undefined/);
  assert.match(html, /class="pastel-square tone-/);
  assert.match(html, /class="status-pill not-run"/);
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
  assert.match(rendererSource, /\.inspector \.kicker \{ margin: 0 0 5px/);
  assert.doesNotMatch(rendererSource, /#050605|#0d0f0d|#101210|#0c0e0c|#bccbb7|#141714|#0b0d0b/);
  assert.doesNotMatch(documentSource, /function renderCaseRow|function renderInspector|--pastel-mint|querySelectorAll\('\.case-row'\)/);
  for (const feature of model.features) {
    assert.doesNotMatch(rendererSource, new RegExp(feature.feature_id));
    assert.doesNotMatch(rendererSource, new RegExp(feature.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const group of model.groups) for (const row of group.cases) assert.doesNotMatch(rendererSource, new RegExp(row.case_id));
});

test("inspector keeps implementation evidence inside Technical proof", () => {
  const model = build({ dailyRunRoot: freshDailyRunRoot });
  const row = model.groups[0].cases[0];
  const inspector = renderInspector(row, model.groups[0], 0);
  const [visible, technical] = inspector.split('<details class="technical">');
  assert.ok(visible.indexOf(">Task<") < visible.indexOf(">Source input<"));
  assert.ok(visible.indexOf(">Source input<") < visible.indexOf(">Assertion review<"));
  assert.ok(visible.indexOf(">Assertion review<") < visible.indexOf(">Quality gates<"));
  assert.match(visible, /75% complete · 3 of 4 expected criteria found/);
  assert.match(visible, /stale text for 3 of 3 Project sections/);
  assert.doesNotMatch(visible, /expected_current_text|conflict-safe applier/);
  assert.doesNotMatch(visible, /candidate\[0\]|judge passes at tier A|declared output file/);
  assert.match(technical, /All check evidence/);
  assert.match(technical, /candidate\[0\]/);
});

test("rendered Project output escapes hidden guard content and combines sections into one agent file", () => {
  const html = renderProjectUpdate({
    target_id: "PROJ-1",
    target_label: "Unsafe <Project>",
    delivery_state: "applied",
    read_back_state: "matched",
    change_summary: "",
    sections: [{
      section: "Overview",
      actual_current_text: "<script>alert(1)</script>",
      expected_current_text: "expected",
      replacement_text: "replacement",
      matches: false,
    }],
  }, "row:1");
  assert.match(html, /Unsafe &lt;Project&gt;/);
  assert.doesNotMatch(html, /alert\(1\)/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /role="tablist"|role="tabpanel"|output-tab/);
  assert.match(html, /Agent output/);
  assert.match(html, /replacement/);
  assert.doesNotMatch(html, /<h5>(?:Actual current|Agent expected current|Current Project|Proposed update|Proposed replacement)<\/h5>|Current text verified|The Project changed after the agent read it/);
});

test("source input cards render safe source URLs and reject executable schemes", () => {
  const linked = renderEntityCard({ entity_type: "work_items", id: "TASK-1", name: "Linked", source_url: "https://www.notion.so/page-id" }, 0);
  assert.match(linked, /href="https:\/\/www\.notion\.so\/page-id"/);
  assert.match(linked, /Open source ↗/);
  assert.match(linked, /target="_blank" rel="noreferrer"/);
  const unsafe = renderEntityCard({ entity_type: "work_items", id: "TASK-2", name: "Unsafe", source_url: "javascript:alert(1)" }, 0);
  assert.doesNotMatch(unsafe, /Open source|href="javascript:/);
});

test("presentation report output renders business Markdown and hides front matter", () => {
  const html = renderTypedOutput({
    kind: "report-output",
    heading: "Project report",
    target_label: "CMT Pipeline",
    state: "Final",
    body: "---\ntemplate_id: internal-report\n---\n# Weekly report\n\n## Outcomes\n\n| State | Owner |\n| --- | --- |\n| Complete | Aisha |\n\n- Next action",
  }, "row", 0, true);
  assert.match(html, /class="business-document"/);
  assert.match(html, /<h4>Weekly report<\/h4>/);
  assert.match(html, /<table>/);
  assert.match(html, /<li>Next action<\/li>/);
  assert.doesNotMatch(html, /template_id:|<pre>|^# Weekly/m);
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

test("typed entity cards render operational fields without raw source JSON", () => {
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
  assert.doesNotMatch(project, /raw-entity-data|Technical source data/);

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
  const meeting = renderEntityCard({ entity_type: "meetings", id: "MTG-1", name: "Review", completed_at: "2026-08-21", purpose: "Review evidence.", decision: { summary: "Use the baseline." }, commitments: ["Aisha approves the corrected pack by Friday."] }, 0);
  const person = renderEntityCard({ entity_type: "people", id: "PERSON-1", name: "Aisha", role: "PM", department: "CMT" }, 1);
  const report = renderEntityCard({ entity_type: "reports", id: "RPT-1", name: "Weekly", status: "Final", sections: { "Problems and inefficiencies": { items: ["Manual remapping"] }, Decisions: { items: ["Use baseline"] }, SOPs: { items: [] } } }, 2);
  assert.match(meeting, /Review evidence/);
  assert.match(meeting, /Use the baseline/);
  assert.match(meeting, /Aisha approves the corrected pack by Friday/);
  assert.doesNotMatch(meeting, /undefined/);
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
    assert.ok(model.groups[0].cases[0].technical.urls.includes("https://app.notion.com/p/feature-1"));
    assert.match(model.groups[0].cases[0].technical.operated_summary, /Operated feature 1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("operated evidence rejects executable URL protocols", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-operated-evidence-url-"));
  try {
    const path = resolve(root, "operated-evidence.json");
    writeFileSync(path, JSON.stringify({
      schema_version: "kamdar-operated-evidence@1.0.0",
      deployment: "unsafe-deployment",
      root_url: "https://app.notion.com/p/test-root",
      features: Array.from({ length: 7 }, (_, index) => ({
        feature_id: `FEAT-${String(index + 1).padStart(4, "0")}`,
        summary: `Operated feature ${index + 1}`,
        urls: [index === 0 ? "javascript:alert(1)" : `https://app.notion.com/p/feature-${index + 1}`]
      }))
    }));
    assert.throws(() => build({ operatedEvidencePath: path }), /must use http or https/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

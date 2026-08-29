import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  applyConstrainedProseCleanup,
  compileMarkdownReportContract,
  diffMarkdownReportContract,
  inspectMarkdownTemplate,
  renderMarkdownReport,
} from "../../../scripts/markdown_report_contract.mjs";

const root = resolve(import.meta.dirname, "../../..");
const artifactRoot = resolve(root, "tickets/TASK-0019/artifacts/template-drift-cases");
const loadText = (path) => readFileSync(resolve(root, path), "utf8");
const loadJson = (path) => JSON.parse(readFileSync(resolve(artifactRoot, path), "utf8"));

test("reviewed AI interpretations compile both plain Markdown templates into deterministic Zod contracts", () => {
  const cases = [
    ["templates/weekly-report.md", "weekly-report.interpretation.json"],
    ["templates/area-operating-rollup.md", "area-operating-rollup.interpretation.json"],
    ["templates/company-operating-rollup.md", "company-rollup.interpretation.json"],
  ];
  for (const [templatePath, interpretationPath] of cases) {
    const compiled = compileMarkdownReportContract(loadText(templatePath), loadJson(interpretationPath));
    assert.equal(compiled.observed.template_id, compiled.interpretation.template_id);
    assert.equal(compiled.observed.template_version, compiled.interpretation.template_version);
    assert.match(compiled.json_schema.description, /compiled deterministically from a reviewed Markdown interpretation/);
    assert.equal(compiled.json_schema.properties.summary.description, compiled.observed.sections[0].instruction);
    assert.ok(compiled.json_schema.properties.employee_actions);
    assert.ok(compiled.observed.sections.find((section) => section.golden_example)?.golden_example.includes("|"));
  }
});

test("Project report proves extraction -> Zod -> constrained cleanup -> same-shape Markdown render", () => {
  const markdown = loadText("templates/weekly-report.md");
  const interpretation = loadJson("weekly-report.interpretation.json");
  const extraction = loadJson("weekly-report.extraction.json");
  const compiled = compileMarkdownReportContract(markdown, interpretation);
  assert.equal(compiled.schema.safeParse(extraction).success, true);

  const cleaned = applyConstrainedProseCleanup(extraction, {
    summary: "In 2026-W35, PROJ-PENANG reduced stock variance to 4.2%, as [TASK-105](task://TASK-105) shows. The 18-minute supplier-file wait at route://ops/penang is now the highest-leverage attention. By 2026-09-02, OWNER-OPS will test one import map.",
    "problems.0.problem": "Before the five-store comparison, three formats still require repeated mapping",
  }, interpretation);
  assert.equal(compiled.schema.safeParse(cleaned).success, true);

  const rendered = renderMarkdownReport(markdown, cleaned, interpretation, {
    PROJECT_NAME: "Penang Replenishment",
    WEEK_START: "2026-08-24",
    PROJECT: "PROJ-PENANG",
    DEPARTMENT: "Retail Operations",
    REPORT_STATUS: "Draft",
    REPORT_VERSION: "3",
    FINALIZED_AT: "null",
    PREVIOUS_REPORT: "RPT-PENANG-W34",
    SOURCE_REPORT_IDS: "RPT-PENANG-D1,RPT-PENANG-D2",
  });
  assert.equal(rendered.includes("{{"), false);
  assert.match(rendered, /\| Supplier intake \/ file normalization \| Before the five-store comparison/);
  assert.match(rendered, /receipt:\/\/daily\/2026-08-29\/PROJ-PENANG/);

  const before = inspectMarkdownTemplate(markdown);
  const after = inspectMarkdownTemplate(rendered);
  assert.deepEqual(after.frontmatter_keys, before.frontmatter_keys);
  assert.deepEqual(
    after.sections.map(({ heading, columns }) => ({ heading, columns })),
    before.sections.map(({ heading, columns }) => ({ heading, columns })),
  );
});

test("cleanup rejects loss or invention of IDs, evidence, numbers, dates, money, and routing", () => {
  const interpretation = loadJson("weekly-report.interpretation.json");
  const extraction = loadJson("weekly-report.extraction.json");
  assert.throws(
    () => applyConstrainedProseCleanup(extraction, {
      summary: "PROJ-PENANG improved stock variance. The supplier-file wait needs attention. OWNER-OPS will test an import map.",
    }, interpretation),
    /cleanup changed protected facts, IDs, evidence, numbers, dates, money, or routes/,
  );
  assert.throws(
    () => applyConstrainedProseCleanup(extraction, { decisions: "DEC-999 was approved." }, interpretation),
    /field is not approved for prose cleanup/,
  );
});

test("deterministic diff turns AI ambiguity and Markdown drift into human-readable failures", () => {
  const markdown = loadText("templates/weekly-report.md");
  const interpretation = loadJson("weekly-report.interpretation.json");

  const ambiguous = structuredClone(interpretation);
  delete ambiguous.fields.find((field) => field.name === "outcomes").min_rows;
  const ambiguity = diffMarkdownReportContract(markdown, ambiguous);
  assert.equal(ambiguity.compatible, false);
  assert.ok(ambiguity.issues.some((issue) => issue.includes("table cardinality is ambiguous")));

  const missingOptionality = structuredClone(interpretation);
  delete missingOptionality.fields.find((field) => field.name === "decisions").optional;
  const optionalityDrift = diffMarkdownReportContract(markdown, missingOptionality);
  assert.ok(optionalityDrift.issues.some((issue) => issue.includes("interpretation shape is invalid")));

  const silentDescriptionRewrite = structuredClone(interpretation);
  silentDescriptionRewrite.fields[0].description = "Write a good summary.";
  const descriptionDrift = diffMarkdownReportContract(markdown, silentDescriptionRewrite);
  assert.ok(descriptionDrift.issues.some((issue) => issue.includes("copy the Markdown instruction nearly verbatim")));

  const changedTemplate = markdown.replace("| Outcome or attention |", "| Result or attention |");
  const structuralDrift = diffMarkdownReportContract(changedTemplate, interpretation);
  assert.ok(structuralDrift.issues.some((issue) => issue.includes("table columns differ")));

  const missingPlaceholder = structuredClone(interpretation);
  missingPlaceholder.fields = missingPlaceholder.fields.filter((field) => field.placeholder !== "Receipt locator");
  const placeholderDrift = diffMarkdownReportContract(markdown, missingPlaceholder);
  assert.ok(placeholderDrift.issues.some((issue) => issue.includes("has no interpreted field")));

  const duplicateColumnKey = structuredClone(interpretation);
  duplicateColumnKey.fields.find((field) => field.kind === "table").columns[1].key = duplicateColumnKey.fields.find((field) => field.kind === "table").columns[0].key;
  const columnDrift = diffMarkdownReportContract(markdown, duplicateColumnKey);
  assert.ok(columnDrift.issues.some((issue) => issue.includes("column keys must be unique")));

  const reusedPlaceholderMarkdown = markdown.replace("{{DECISIONS_VIEW_OR_LIST}}", "{{SUMMARY}}");
  const reusedPlaceholderInterpretation = structuredClone(interpretation);
  reusedPlaceholderInterpretation.fields = reusedPlaceholderInterpretation.fields.filter((field) => field.name !== "decisions");
  const reusedPlaceholderDrift = diffMarkdownReportContract(reusedPlaceholderMarkdown, reusedPlaceholderInterpretation);
  assert.ok(reusedPlaceholderDrift.issues.some((issue) => issue.includes("appears in more than one report section")));
});

test("table rendering safely preserves pipes and multiline cell content", () => {
  const markdown = loadText("templates/weekly-report.md");
  const interpretation = loadJson("weekly-report.interpretation.json");
  const extraction = loadJson("weekly-report.extraction.json");
  extraction.outcomes[0].outcome = "Approve A | then B\nwith owner evidence";
  const rendered = renderMarkdownReport(markdown, extraction, interpretation, {
    PROJECT_NAME: "Synthetic Project",
    WEEK_START: "2026-08-24",
    PROJECT: "PROJ-SYNTHETIC",
    DEPARTMENT: "Operations",
    REPORT_STATUS: "Draft",
    REPORT_VERSION: "1",
    FINALIZED_AT: "none",
    PREVIOUS_REPORT: "none",
    SOURCE_REPORT_IDS: "RPT-SYNTHETIC-W35",
  });
  assert.match(rendered, /Approve A \\| then B<br>with owner evidence/);
});

test("optional fields render as empty sections instead of undefined values", () => {
  const markdown = loadText("templates/weekly-report.md");
  const interpretation = loadJson("weekly-report.interpretation.json");
  interpretation.fields.find((field) => field.name === "employee_actions").optional = true;
  const extraction = loadJson("weekly-report.extraction.json");
  delete extraction.employee_actions;
  const rendered = renderMarkdownReport(markdown, extraction, interpretation, {
    PROJECT_NAME: "Synthetic Project",
    WEEK_START: "2026-08-24",
    PROJECT: "PROJ-SYNTHETIC",
    DEPARTMENT: "Operations",
    REPORT_STATUS: "Draft",
    REPORT_VERSION: "1",
    FINALIZED_AT: "none",
    PREVIOUS_REPORT: "none",
    SOURCE_REPORT_IDS: "RPT-SYNTHETIC-W35",
  });
  assert.equal(rendered.includes("undefined"), false);
  assert.doesNotMatch(rendered, /\{\{EMPLOYEE_ACTION_ROWS\}\}/);
  assert.match(rendered, /## Employee actions[\s\S]*?## Problems and inefficiencies/);
});

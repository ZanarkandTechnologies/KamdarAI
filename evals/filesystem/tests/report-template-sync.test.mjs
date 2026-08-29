import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { syncReportTemplates } from "../../../scripts/sync_report_templates.mjs";

const root = resolve(import.meta.dirname, "../../..");
const fixtureRoot = resolve(root, "tickets/TASK-0019/artifacts/template-drift-cases");
const loadJson = (name) => JSON.parse(readFileSync(resolve(fixtureRoot, name), "utf8"));

function workspace() {
  const runRoot = resolve(root, "evals/filesystem/runs");
  mkdirSync(runRoot, { recursive: true });
  const target = mkdtempSync(resolve(runRoot, "report-sync-"));
  mkdirSync(resolve(target, "templates"), { recursive: true });
  copyFileSync(resolve(root, "templates/weekly-report.md"), resolve(target, "templates/weekly-report.md"));
  return target;
}

function weeklyInterpretation() {
  return {
    interpretation: loadJson("weekly-report.interpretation.json"),
    example_data: loadJson("weekly-report.extraction.json"),
    frontmatter_values: {
      PROJECT_NAME: "Synthetic Project",
      WEEK_START: "2026-08-24",
      PROJECT: "PROJ-SYNTHETIC",
      DEPARTMENT: "Operations",
      REPORT_STATUS: "Draft",
      REPORT_VERSION: "1",
      FINALIZED_AT: "none",
      PREVIOUS_REPORT: "none",
      SOURCE_REPORT_IDS: "RPT-SYNTHETIC-W35",
    },
  };
}

test("sync detects the changed report automatically, writes Zod, and asks before previewing", async () => {
  const target = workspace();
  let confirmations = 0;
  const first = await syncReportTemplates({
    root: target,
    interpreter: async () => weeklyInterpretation(),
    confirmPreview: async () => {
      confirmations += 1;
      return false;
    },
    output: { write() {} },
  });
  assert.equal(first.changed.length, 1);
  assert.equal(confirmations, 1);
  assert.equal(first.previews.length, 0);

  const generatedPath = resolve(target, "schemas/reports/company-os-weekly-report.zod.mjs");
  assert.equal(existsSync(generatedPath), true);
  const generated = readFileSync(generatedPath, "utf8");
  assert.match(generated, /source_sha256: [a-f0-9]{64}/);
  assert.match(generated, /"employee_actions"/);

  const module = await import(`${pathToFileURL(generatedPath).href}?test=${Date.now()}`);
  assert.equal(module.CompanyOsWeeklyReportSchema.safeParse(loadJson("weekly-report.extraction.json")).success, true);

  const second = await syncReportTemplates({
    root: target,
    interpreter: async () => { throw new Error("unchanged template must not invoke AI"); },
    confirmPreview: async () => { throw new Error("unchanged template must not ask about preview"); },
    output: { write() {} },
  });
  assert.deepEqual(second, { changed: [], previews: [] });
});

test("confirmed preview renders only after generated Zod validates", async () => {
  const target = workspace();
  const result = await syncReportTemplates({
    root: target,
    interpreter: async () => weeklyInterpretation(),
    confirmPreview: async () => true,
    output: { write() {} },
  });
  assert.equal(result.previews.length, 1);
  assert.equal(existsSync(result.previews[0]), true);
  const preview = readFileSync(result.previews[0], "utf8");
  assert.match(preview, /## Employee actions/);
  assert.match(preview, /Aisha \(PERSON-AISHA\)/);
  assert.equal(preview.includes("{{"), false);
});

test("check mode detects drift without invoking AI or asking for a preview", async () => {
  const target = workspace();
  const result = await syncReportTemplates({
    root: target,
    checkOnly: true,
    interpreter: async () => { throw new Error("check mode must not invoke AI"); },
    confirmPreview: async () => { throw new Error("check mode must not ask about preview"); },
    output: { write() {} },
  });
  assert.deepEqual(result.changed, [{ template: "templates/weekly-report.md" }]);
  assert.equal(existsSync(resolve(target, "schemas/reports/company-os-weekly-report.zod.mjs")), false);
});

test("a rejected preview does not commit a generated schema hash", async () => {
  const target = workspace();
  const invalid = weeklyInterpretation();
  invalid.example_data.summary = "Not three sentences.";
  await assert.rejects(
    syncReportTemplates({
      root: target,
      interpreter: async () => invalid,
      confirmPreview: async () => true,
      output: { write() {} },
    }),
    /failed compiled Zod validation/,
  );
  assert.equal(existsSync(resolve(target, "schemas/reports/company-os-weekly-report.zod.mjs")), false);
});

test("unsafe template IDs cannot escape report-owned output directories", async () => {
  const target = workspace();
  const unsafePath = resolve(target, "templates/weekly-report.md");
  const unsafe = readFileSync(unsafePath, "utf8").replace("template_id: company-os-weekly-report", "template_id: ../../escape");
  writeFileSync(unsafePath, unsafe);
  await assert.rejects(
    syncReportTemplates({ root: target, output: { write() {} } }),
    /Unsafe report template_id/,
  );
});

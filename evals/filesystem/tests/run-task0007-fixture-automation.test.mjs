import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { runTask0007FixtureAutomation } from "../scripts/run-task0007-fixture-automation.mjs";

test.skip("TASK-0007 fixture automation directly maintains one current Weekly Draft before read-only finalization", (t) => {
  const outputRoot = mkdtempSync(resolve(tmpdir(), "task0007-fixture-automation-"));
  t.after(() => rmSync(outputRoot, { recursive: true, force: true }));
  const result = runTask0007FixtureAutomation({ outputRoot });
  assert.equal(result.daily.pipeline_artifacts.length, 5);
  assert.equal(result.daily.idempotency.knowledge, "duplicate");
  assert.equal(result.daily.idempotency.project_control, "duplicate");
  assert.equal(result.daily.idempotency.draft_hash_unchanged, true);
  assert.equal(result.weekly.project_reports.length, 2);
  assert.equal(result.weekly.department_reports.length, 1);
  assert.equal(existsSync(resolve(outputRoot, result.daily.context_path)), true);
  assert.equal(existsSync(resolve(outputRoot, result.daily.current_weekly_draft)), true);
  assert.equal(existsSync(resolve(outputRoot, result.weekly.finalization_plan)), true);
  assert.equal(existsSync(resolve(outputRoot, result.weekly.company_report)), true);
  const draft = readFileSync(resolve(outputRoot, result.daily.current_weekly_draft), "utf8");
  for (const marker of ["decision:SRC-MEETING-042", "sop:SRC-MEETING-042", "pm_attention:SRC-WORK-101", "risk:SRC-WORK-101"]) {
    assert.match(draft, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const dailyReceipt = JSON.parse(readFileSync(resolve(outputRoot, result.daily.receipt), "utf8"));
  assert.deepEqual(dailyReceipt.external_effects, { notion_writes: 0, messages_sent: 0, weekly_finalization: 0 });
  assert.equal(dailyReceipt.current_weekly_draft.path, result.daily.current_weekly_draft);
  assert.equal(dailyReceipt.current_weekly_draft.knowledge.path, result.daily.current_weekly_draft);
});

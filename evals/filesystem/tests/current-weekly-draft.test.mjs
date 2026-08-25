import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  initializeCurrentWeeklyDraft,
  updateCurrentWeeklyDraft,
  validateCurrentWeeklyDraft
} from "../../../scripts/current_weekly_draft.mjs";

test("current Weekly Draft is canonical-template-backed, atomic, and source-key idempotent", (t) => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-current-weekly-draft-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const draftPath = resolve(root, "weekly-report-draft-2026-W34.md");
  initializeCurrentWeeklyDraft({ draftPath, week: "2026-W34" });
  const initial = readFileSync(draftPath, "utf8");
  assert.equal(validateCurrentWeeklyDraft(initial, { expectedWeek: "2026-W34" }).state, "draft");

  const entry = {
    key: "decision:SRC-MEETING-042",
    kind: "decision",
    anchor: "Decisions",
    source_ids: ["SRC-MEETING-042"],
    markdown: "### Rollout gate\n\n- **Project:** PROJ-PENANG\n- **Evidence:** SRC-MEETING-042"
  };
  const applied = updateCurrentWeeklyDraft({ draftPath, expectedWeek: "2026-W34", entries: [entry] });
  assert.deepEqual(applied, {
    state: "applied",
    path: draftPath,
    week: "2026-W34",
    applied: ["decision:SRC-MEETING-042"],
    duplicates: [],
    conflicts: []
  });
  const afterApply = readFileSync(draftPath, "utf8");
  const duplicate = updateCurrentWeeklyDraft({ draftPath, expectedWeek: "2026-W34", entries: [entry] });
  assert.equal(duplicate.state, "duplicate");
  assert.equal(readFileSync(draftPath, "utf8"), afterApply);

  const conflict = updateCurrentWeeklyDraft({
    draftPath,
    expectedWeek: "2026-W34",
    entries: [{ ...entry, markdown: "### Changed rollout gate\n\n- **Project:** PROJ-PENANG\n- **Evidence:** SRC-MEETING-042" }]
  });
  assert.equal(conflict.state, "conflict");
  assert.equal(conflict.conflicts[0].key, "decision:SRC-MEETING-042");
  assert.equal(readFileSync(draftPath, "utf8"), afterApply);
});

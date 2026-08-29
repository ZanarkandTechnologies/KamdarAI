import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluateMeetingCommitmentIntake,
  renderTaskRecord,
  simulateApplication,
} from "../scripts/meeting-commitment-intake-eval.mjs";
import { MeetingCommitmentIntakeResultSchema } from "../../../schemas/automations/meeting-commitment-intake-result.zod.mjs";

test("meeting commitment intake passes its three behavior cases", () => {
  const result = evaluateMeetingCommitmentIntake();
  assert.equal(result.pass, true);
  assert.equal(result.cases.length, 3);
  assert.ok(Object.values(result.checks).every(Boolean));
});

test("task rendering uses the canonical Task property names and Notes body", () => {
  const task = renderTaskRecord({
    work_item_id: "TASK-X", name: "Do work", project_id: "PROJ-X", department: "Ops",
    owner_person_id: "PERSON-X", type: "Task", status: "Not started", ai_review: "Pending",
    priority: "P1", start_date: "2026-08-27", due_date: "2026-08-28", progress: "Not started.",
    last_meaningful_update: "2026-08-27", notes_markdown: "## Notes\n\nSource TASK-M.",
    source_meeting_id: "TASK-M", idempotency_key: "meeting:TASK-M:commitment:TASK-X",
  });
  assert.deepEqual(Object.keys(task.properties), [
    "name", "work_item_id", "project", "department", "owner", "type", "status", "ai_review",
    "priority", "start_date", "due_date", "progress", "last_meaningful_update",
  ]);
  assert.match(task.body, /^## Notes/);
});

test("an unchanged application creates no duplicate Tasks", () => {
  const result = { task_creations: [{ work_item_id: "TASK-X", idempotency_key: "meeting:TASK-M:commitment:TASK-X" }], blocked_commitments: [] };
  const observed = simulateApplication(result, new Set(["meeting:TASK-M:commitment:TASK-X"]));
  assert.equal(observed.created.length, 0);
  assert.deepEqual(observed.duplicates, ["meeting:TASK-M:commitment:TASK-X"]);
});

test("blocked commitments cannot be reported as a fully produced intake", () => {
  const expectedPath = fileURLToPath(new URL("../../meeting-intake/expected/result.json", import.meta.url));
  const result = JSON.parse(readFileSync(expectedPath, "utf8"));
  result.feature_outcomes[0].outcome = "produced";
  result.feature_outcomes[0].information_gaps = [];
  assert.equal(MeetingCommitmentIntakeResultSchema.safeParse(result).success, false);
});

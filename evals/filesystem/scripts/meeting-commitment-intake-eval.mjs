import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MeetingCommitmentIntakeResultSchema } from "../../../schemas/automations/meeting-commitment-intake-result.zod.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export function renderTaskRecord(row) {
  return {
    id: row.work_item_id,
    template: "task",
    properties: {
      name: row.name,
      work_item_id: row.work_item_id,
      project: row.project_id,
      department: row.department,
      owner: row.owner_person_id,
      type: row.type,
      status: row.status,
      ai_review: row.ai_review,
      priority: row.priority,
      start_date: row.start_date,
      due_date: row.due_date,
      progress: row.progress,
      last_meaningful_update: row.last_meaningful_update,
    },
    body: row.notes_markdown,
    metadata: { source_meeting_id: row.source_meeting_id, idempotency_key: row.idempotency_key },
  };
}

export function simulateApplication(result, existingKeys = new Set()) {
  const created = [];
  const duplicates = [];
  for (const row of result.task_creations) {
    if (existingKeys.has(row.idempotency_key)) duplicates.push(row.idempotency_key);
    else created.push(renderTaskRecord(row));
  }
  return { created, duplicates, blocked: result.blocked_commitments };
}

export function evaluateMeetingCommitmentIntake() {
  const suite = readJson(resolve(projectRoot, "evals/meeting-intake/suite.json"));
  const meetings = readJson(resolve(projectRoot, "seed/meetings.json"));
  const tasks = readJson(resolve(projectRoot, "seed/tasks.json"));
  const raw = readJson(resolve(projectRoot, suite.target.expected_result));
  const parsed = MeetingCommitmentIntakeResultSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.message);
  const result = parsed.data;
  const meeting = meetings.find((row) => row.id === result.meeting_id);
  if (!meeting) throw new Error("Source Meeting is missing.");
  if (tasks.some((row) => result.task_creations.some((task) => task.work_item_id === row.id))) {
    throw new Error("Expected output Tasks must not be pre-created in the seed.");
  }
  const first = simulateApplication(result);
  const rerun = simulateApplication(result, new Set(result.task_creations.map((row) => row.idempotency_key)));
  const checks = {
    source_meeting_has_explicit_commitments: result.task_creations.every((row) => meeting.body.includes(row.commitment_key) && meeting.body.includes(row.source_text)),
    exactly_two_complete_tasks: first.created.length === 2,
    canonical_task_shape: first.created.every((row) => row.template === "task" && row.properties.type === "Task" && row.body.startsWith("## Notes\n") && row.body.includes("TASK-204")),
    incomplete_commitment_blocked: first.blocked.length === 1 && first.blocked[0].commitment_key === "NOTE-1" && first.blocked[0].missing_fields.includes("owner") && first.blocked[0].missing_fields.includes("due_date"),
    no_decision_or_discussion_task: first.created.every((row) => !/offer wording|naming convention/i.test(row.properties.name)),
    unchanged_rerun_is_duplicate: rerun.created.length === 0 && rerun.duplicates.length === 2,
  };
  return { pass: Object.values(checks).every(Boolean), feature_id: "FEAT-0010", cases: suite.evals.map((row) => row.id), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = evaluateMeetingCommitmentIntake();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.pass) process.exitCode = 1;
}

import * as z from "zod";

const StableId = z.string().trim().min(1);
const IsoDate = z.string().date();

export const MeetingTaskCreationSchema = z.strictObject({
  commitment_key: StableId.describe("Stable key copied from the explicit Meeting commitment."),
  source_text: z.string().trim().min(1),
  work_item_id: StableId,
  project_id: StableId,
  department: z.string().trim().min(1),
  owner_person_id: StableId,
  name: z.string().trim().min(1),
  type: z.literal("Task"),
  status: z.literal("Not started"),
  ai_review: z.literal("Pending"),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  start_date: IsoDate,
  due_date: IsoDate,
  progress: z.string().trim().min(1),
  last_meaningful_update: IsoDate,
  notes_markdown: z.string().trim().min(1),
  source_meeting_id: StableId,
  source_ids: z.array(StableId).min(1),
  idempotency_key: StableId,
}).superRefine((row, context) => {
  if (!row.source_ids.includes(row.source_meeting_id)) {
    context.addIssue({ code: "custom", path: ["source_ids"], message: "source_ids must include source_meeting_id." });
  }
  if (!row.notes_markdown.includes(row.source_meeting_id)) {
    context.addIssue({ code: "custom", path: ["notes_markdown"], message: "Task Notes must preserve the source Meeting ID." });
  }
});

export const BlockedMeetingCommitmentSchema = z.strictObject({
  commitment_key: StableId,
  source_text: z.string().trim().min(1),
  missing_fields: z.array(z.enum(["action", "project", "owner", "due_date"])).min(1),
  reason: z.string().trim().min(1),
});

export const MeetingCommitmentIntakeResultSchema = z.strictObject({
  schema_version: z.literal("kamdar-meeting-commitment-intake-result@1.0.0"),
  meeting_id: StableId,
  task_creations: z.array(MeetingTaskCreationSchema),
  blocked_commitments: z.array(BlockedMeetingCommitmentSchema),
  run_notes: z.string(),
});

export const MeetingCommitmentIntakeResultJsonSchema = z.toJSONSchema(MeetingCommitmentIntakeResultSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

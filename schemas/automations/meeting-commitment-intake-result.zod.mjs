import * as z from "zod";
import { FeatureOutcomeSchema, validateFeatureOutcomeCoverage } from "./feature-outcome.zod.mjs";

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

export const MEETING_COMMITMENT_INTAKE_RESULT_PROMPT = String.raw`
Return one Meeting commitment intake result from the supplied Meeting evidence.

- Return one feature_outcomes entry for FEAT-0010. Choose produced,
  no_change_needed, or insufficient_information from the cited evidence, and
  point a produced outcome to every created Task row.
- A complete explicit commitment becomes a task_creation. An explicit
  commitment with missing required fields becomes a blocked_commitment.
- Never claim that a provider write occurred.
`;

export const MeetingCommitmentIntakeResultSchema = z.strictObject({
  schema_version: z.literal("kamdar-meeting-commitment-intake-result@1.1.0"),
  meeting_id: StableId,
  feature_outcomes: z.array(FeatureOutcomeSchema).length(1),
  task_creations: z.array(MeetingTaskCreationSchema),
  blocked_commitments: z.array(BlockedMeetingCommitmentSchema),
  run_notes: z.string(),
}).superRefine((result, context) => {
  const intakeOutcome = result.feature_outcomes.find((outcome) => outcome.feature_id === "FEAT-0010");
  const missingFieldCodes = new Set(result.blocked_commitments
    .flatMap((commitment) => commitment.missing_fields)
    .map((field) => `missing-${field.replaceAll("_", "-")}`));
  if (missingFieldCodes.size > 0) {
    if (intakeOutcome?.outcome !== "insufficient_information") {
      context.addIssue({ code: "custom", path: ["feature_outcomes"], message: "blocked commitments require FEAT-0010 to report insufficient_information." });
    } else {
      const reportedCodes = new Set(intakeOutcome.information_gaps.map((gap) => gap.code));
      for (const gapCode of missingFieldCodes) {
        if (!reportedCodes.has(gapCode)) {
          context.addIssue({ code: "custom", path: ["feature_outcomes"], message: `FEAT-0010 must report blocked commitment gap ${gapCode}.` });
        }
      }
    }
  }
  validateFeatureOutcomeCoverage({
    outcomes: result.feature_outcomes,
    expectedFeatureIds: ["FEAT-0010"],
    outputRoots: { "FEAT-0010": "task_creations" },
    outputCounts: { "FEAT-0010": result.task_creations.length },
  }, context);
}).describe(MEETING_COMMITMENT_INTAKE_RESULT_PROMPT);

export const MeetingCommitmentIntakeResultJsonSchema = z.toJSONSchema(MeetingCommitmentIntakeResultSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

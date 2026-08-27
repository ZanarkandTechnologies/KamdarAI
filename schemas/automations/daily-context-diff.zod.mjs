import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const StableIdSchema = NonEmptyString;
const OptionalText = NonEmptyString.nullable();
const UniqueIdsSchema = z.array(StableIdSchema).superRefine((values, context) => {
  if (new Set(values).size !== values.length) context.addIssue({ code: "custom", message: "IDs must be unique." });
});

const CurrentProjectSectionsSchema = z.strictObject({
  overview: NonEmptyString,
  project_knowledge: NonEmptyString,
  this_weeks_attention: NonEmptyString,
});

const SourceManifestRowSchema = z.strictObject({
  source_key: NonEmptyString,
  status: z.enum(["fetched", "unavailable", "skipped"]),
  source_url: NonEmptyString,
  collection_scope: NonEmptyString,
  collected_at: z.string().datetime({ offset: true }),
  record_count: z.number().int().nonnegative(),
  source_ids: UniqueIdsSchema,
  gap: OptionalText,
}).superRefine((row, context) => {
  if (row.record_count !== row.source_ids.length) {
    context.addIssue({ code: "custom", path: ["record_count"], message: "record_count must equal source_ids.length." });
  }
  if ((row.status === "fetched") !== (row.gap === null)) {
    context.addIssue({ code: "custom", path: ["gap"], message: "Fetched sources require no gap; unavailable or skipped sources require one." });
  }
});

const ProjectRowSchema = z.strictObject({
  id: StableIdSchema,
  source_id: StableIdSchema,
  source_url: NonEmptyString,
  name: NonEmptyString,
  owner_person_id: StableIdSchema.nullable(),
  current_sections: CurrentProjectSectionsSchema,
  weekly_attention_reset: z.strictObject({
    requested: z.boolean(),
    week: z.string().regex(/^\d{4}-W\d{2}$/).nullable(),
    reason: OptionalText,
    source_id: StableIdSchema,
  }).superRefine((reset, context) => {
    if (reset.requested && (!reset.week || !reset.reason)) {
      context.addIssue({ code: "custom", message: "A requested weekly reset requires week and reason." });
    }
    if (!reset.requested && (reset.week !== null || reset.reason !== null)) {
      context.addIssue({ code: "custom", message: "An unrequested weekly reset must not carry week or reason." });
    }
  }),
});

const WorkRowSchema = z.strictObject({
  id: StableIdSchema,
  source_id: StableIdSchema,
  source_url: NonEmptyString,
  project_id: StableIdSchema.nullable(),
  record_type: z.enum(["Task", "Feature", "Issue", "Meeting"]),
  full_page_read: z.literal(true),
  owner_person_id: StableIdSchema.nullable(),
  status: NonEmptyString,
  ai_review: z.enum(["Pending", "Needs information", "Processed", "Blocked"]),
  daily_review_version: OptionalText,
  selection_reason: z.enum(["linked_open_or_changed", "done_unprocessed"]),
  due_date: z.string().date().nullable(),
  last_meaningful_update: z.string().date().nullable(),
  blocker: OptionalText,
  cause: z.strictObject({
    value: OptionalText,
    confidence: z.enum(["high", "medium", "low", "unknown"]),
  }),
  plan_actual: z.strictObject({
    currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
    estimated_amount: z.number().nonnegative().nullable(),
    actual_amount: z.number().nonnegative().nullable(),
  }),
  documentation: z.strictObject({
    known_context: NonEmptyString,
    next_action: OptionalText,
    missing_information: z.array(NonEmptyString),
    mapped_field_state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    update_location: z.array(NonEmptyString).min(1),
  }),
  evidence: z.array(NonEmptyString).min(1),
}).superRefine((work, context) => {
  if (work.selection_reason === "done_unprocessed") {
    if (work.status.toLowerCase() !== "done") context.addIssue({ code: "custom", message: "done_unprocessed Work must have Status=Done." });
    if (work.ai_review === "Processed") context.addIssue({ code: "custom", message: "Done Work with AI review=Processed is not eligible for documentation review." });
  }
  if (work.ai_review === "Processed" && !work.daily_review_version) {
    context.addIssue({ code: "custom", message: "Processed AI review requires a Daily review version." });
  }
  if (work.ai_review !== "Processed" && work.daily_review_version) {
    context.addIssue({ code: "custom", message: "Only Processed AI review may carry a Daily review version." });
  }
});

const DecisionObservationSchema = z.strictObject({
  choice: NonEmptyString,
  authority: NonEmptyString,
  evidence: z.array(NonEmptyString).min(1),
});

const WorkflowObservationSchema = z.strictObject({
  workflow_name: NonEmptyString,
  trigger: NonEmptyString,
  actors_and_handoff: NonEmptyString,
  ordered_steps: z.array(NonEmptyString).min(2),
  systems: z.array(NonEmptyString).min(1),
  frequency_and_volume: NonEmptyString,
  active_and_wait_time: NonEmptyString,
  exceptions: z.array(NonEmptyString),
  output: NonEmptyString,
  confidence: z.enum(["high", "medium", "low"]),
  measurement_gaps: z.array(NonEmptyString),
});

const MeetingRowSchema = z.strictObject({
  id: StableIdSchema,
  source_id: StableIdSchema,
  source_url: NonEmptyString,
  project_id: StableIdSchema.nullable(),
  statements: z.array(NonEmptyString).min(1),
  decision_observation: DecisionObservationSchema.nullable(),
  workflow_observation: WorkflowObservationSchema.nullable(),
  review_condition: OptionalText,
});

const PersonRowSchema = z.strictObject({
  id: StableIdSchema,
  source_id: StableIdSchema,
  name: NonEmptyString,
  preferred_contact_channel: OptionalText,
  approved_contact_channels: z.array(NonEmptyString),
  approved_contact_endpoint_ref: OptionalText,
  contact_instructions: OptionalText,
});

function duplicateIds(rows) {
  const ids = rows.map((row) => row.id);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

export const DailyContextDiffSchema = z.strictObject({
  artifact_type: z.literal("kamdar-daily-context-diff"),
  artifact_version: z.literal("0.3.0"),
  context_id: StableIdSchema,
  local_day: z.string().date(),
  evidence_window: z.strictObject({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
  }),
  collector: z.strictObject({
    run_id: StableIdSchema,
    provider_effects: z.strictObject({ performed: z.literal(false) }),
  }),
  source_manifest: z.array(SourceManifestRowSchema).min(1),
  projects: z.array(ProjectRowSchema).min(1),
  work_items: z.array(WorkRowSchema).min(1),
  meetings: z.array(MeetingRowSchema),
  people: z.array(PersonRowSchema).min(1),
}).superRefine((context, refinement) => {
  if (Date.parse(context.evidence_window.start) > Date.parse(context.evidence_window.end)) {
    refinement.addIssue({ code: "custom", path: ["evidence_window"], message: "start must not be after end." });
  }

  for (const key of ["projects", "work_items", "meetings", "people"]) {
    if (duplicateIds(context[key]).length) refinement.addIssue({ code: "custom", path: [key], message: `${key} IDs must be unique.` });
  }

  const projectIds = new Set(context.projects.map((row) => row.id));
  const personIds = new Set(context.people.map((row) => row.id));
  const manifestedIds = new Set(context.source_manifest.flatMap((row) => row.source_ids));
  const records = [...context.projects, ...context.work_items, ...context.meetings, ...context.people];
  for (const row of records) {
    if (!manifestedIds.has(row.source_id)) refinement.addIssue({ code: "custom", message: `${row.id} source_id is absent from source_manifest.` });
  }
  for (const project of context.projects) {
    if (project.owner_person_id && !personIds.has(project.owner_person_id)) refinement.addIssue({ code: "custom", message: `${project.id} owner is absent from people.` });
    if (project.weekly_attention_reset.source_id !== project.source_id) refinement.addIssue({ code: "custom", message: `${project.id} weekly reset source must match the Project source.` });
  }
  for (const row of [...context.work_items, ...context.meetings]) {
    if (row.project_id && !projectIds.has(row.project_id)) refinement.addIssue({ code: "custom", message: `${row.id} project is absent from projects.` });
    if ("owner_person_id" in row && row.owner_person_id && !personIds.has(row.owner_person_id)) refinement.addIssue({ code: "custom", message: `${row.id} owner is absent from people.` });
  }
});

export const DailyContextDiffJsonSchema = z.toJSONSchema(DailyContextDiffSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

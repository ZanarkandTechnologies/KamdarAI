import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const StableIdSchema = NonEmptyString;
const UniqueIdsSchema = z.array(StableIdSchema).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) context.addIssue({ code: "custom", message: "IDs must be unique." });
});

const CurrentProjectSectionsSchema = z.strictObject({
  overview: NonEmptyString,
  project_knowledge: NonEmptyString,
  this_weeks_attention: NonEmptyString,
});

const ProjectSchema = z.strictObject({
  id: StableIdSchema,
  name: NonEmptyString,
  area: NonEmptyString,
  current_sections: CurrentProjectSectionsSchema,
});

const ReportContentSchema = z.strictObject({
  summary: NonEmptyString,
  outcomes_and_open_attention: z.array(NonEmptyString).min(1),
  problems_and_inefficiencies: z.array(NonEmptyString).min(1),
  decisions: z.array(NonEmptyString).min(1),
  sops: z.array(NonEmptyString).min(1),
  next_week_priorities: z.array(NonEmptyString).min(1),
  automation_receipt: NonEmptyString,
});

const ReportSchema = z.strictObject({
  id: StableIdSchema,
  report_level: z.literal("Project"),
  project_id: StableIdSchema,
  area: NonEmptyString,
  status: z.enum(["Draft", "Final"]),
  version: z.number().int().positive(),
  finalized_at: z.string().datetime({ offset: true }).nullable(),
  previous_report_id: StableIdSchema.nullable(),
  source_ids: UniqueIdsSchema,
  report_markdown: NonEmptyString,
  content: ReportContentSchema,
}).superRefine((report, context) => {
  if ((report.status === "Final") !== Boolean(report.finalized_at)) {
    context.addIssue({ code: "custom", path: ["finalized_at"], message: "finalized_at must be present only for Final reports." });
  }
  const renderedFacts = [
    report.content.summary,
    ...report.content.outcomes_and_open_attention,
    ...report.content.problems_and_inefficiencies,
    ...report.content.decisions,
    ...report.content.sops,
    ...report.content.next_week_priorities,
    report.content.automation_receipt,
  ];
  for (const fact of renderedFacts) {
    if (!report.report_markdown.includes(fact)) {
      context.addIssue({ code: "custom", path: ["report_markdown"], message: "Every structured report fact must appear verbatim in report_markdown." });
      break;
    }
  }
});

const DraftCandidateRefSchema = z.strictObject({
  source_report_id: StableIdSchema,
  source_ids: UniqueIdsSchema,
});

const SourceGapSchema = z.strictObject({
  code: NonEmptyString,
  scope_id: StableIdSchema,
  detail: NonEmptyString,
});

export const WeeklyContextSchema = z.strictObject({
  schema_version: z.literal("kamdar-weekly-context@2.0.0"),
  artifact_type: z.literal("kamdar-weekly-context"),
  context_id: StableIdSchema,
  week: z.string().regex(/^\d{4}-W\d{2}$/),
  collected_at: z.string().datetime({ offset: true }),
  runtime_input_policy: z.strictObject({
    work_items_loaded: z.literal(false),
    meetings_loaded: z.literal(false),
    source: z.literal("Project Draft reports only"),
  }),
  projects: z.array(ProjectSchema).min(1),
  reports: z.array(ReportSchema).min(1),
  draft_candidate_refs: z.array(DraftCandidateRefSchema),
  expected_areas: z.array(NonEmptyString).min(1),
  source_gaps: z.array(SourceGapSchema),
}).superRefine((context, refinement) => {
  for (const [key, rows] of [["projects", context.projects], ["reports", context.reports]]) {
    const ids = rows.map((row) => row.id);
    if (new Set(ids).size !== ids.length) refinement.addIssue({ code: "custom", path: [key], message: `${key} IDs must be unique.` });
  }
  if (new Set(context.expected_areas).size !== context.expected_areas.length) {
    refinement.addIssue({ code: "custom", path: ["expected_areas"], message: "expected_areas must be unique." });
  }

  const projects = new Map(context.projects.map((row) => [row.id, row]));
  const reports = new Map(context.reports.map((row) => [row.id, row]));
  for (const report of context.reports) {
    const project = projects.get(report.project_id);
    if (!project) refinement.addIssue({ code: "custom", message: `${report.id} project is absent from projects.` });
    else if (project.area !== report.area) refinement.addIssue({ code: "custom", message: `${report.id} area does not match its Project.` });
    if (report.previous_report_id && !reports.has(report.previous_report_id)) refinement.addIssue({ code: "custom", message: `${report.id} previous report is absent from reports.` });
    if (!context.expected_areas.includes(report.area)) refinement.addIssue({ code: "custom", message: `${report.id} area is absent from expected_areas.` });
  }
  for (const candidate of context.draft_candidate_refs) {
    const source = reports.get(candidate.source_report_id);
    if (!source || source.status !== "Draft") refinement.addIssue({ code: "custom", message: `${candidate.source_report_id} is not an immutable Project Draft.` });
    else for (const sourceId of candidate.source_ids) {
      if (!source.source_ids.includes(sourceId)) refinement.addIssue({ code: "custom", message: `${sourceId} is not cited by ${source.id}.` });
    }
  }
});

export const WeeklyContextJsonSchema = z.toJSONSchema(WeeklyContextSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

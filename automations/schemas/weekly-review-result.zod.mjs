import * as z from "zod";

const StableIdSchema = z.string().min(1).describe("Use an exact ID from the immutable Weekly context.");
const SourceIdsSchema = z.array(StableIdSchema).min(1).describe("Immediate source Report IDs first, followed by any retained source record IDs.");

const ReportResultSchema = z.object({
  report_id: StableIdSchema,
  report_level: z.enum(["Project", "Area", "Company"]),
  project_id: StableIdSchema.nullable(),
  area: z.string().min(1).nullable(),
  previous_report_id: StableIdSchema.nullable(),
  source_report_ids: z.array(StableIdSchema).min(1),
  prior_version: z.number().int().nonnegative().nullable(),
  report_version: z.number().int().positive(),
  report_status: z.enum(["Draft", "Final", "Blocked"]),
  finalized_at: z.string().datetime({ offset: true }).nullable(),
  report_markdown: z.string().min(1).describe("Complete rendered report using the matching Project, Area, or Company template."),
  configuration_gaps: z.array(z.string().min(1)),
}).strict().superRefine((report, context) => {
  if ((report.report_status === "Final") !== Boolean(report.finalized_at)) {
    context.addIssue({ code: "custom", message: "finalized_at must be present only for Final reports." });
  }
  if (report.prior_version !== null && report.report_version !== report.prior_version + 1) {
    context.addIssue({ code: "custom", message: "an existing Draft must increment report_version exactly once." });
  }
  if (report.report_level === "Project" && (!report.project_id || !report.area)) {
    context.addIssue({ code: "custom", message: "Project reports require project_id and area." });
  }
  if (report.report_level === "Area" && (report.project_id || !report.area)) {
    context.addIssue({ code: "custom", message: "Area reports require area and forbid project_id." });
  }
  if (report.report_level === "Company" && (report.project_id || report.area)) {
    context.addIssue({ code: "custom", message: "Company reports forbid project_id and area." });
  }
});

const PromotionDispositionSchema = z.object({
  candidate_id: StableIdSchema,
  kind: z.enum(["problem", "decision", "sop"]),
  source_report_id: StableIdSchema.describe("The Project Report that exposed this candidate; Weekly does not rescan raw Work."),
  source_ids: SourceIdsSchema,
  disposition: z.enum(["promoted", "duplicate", "project_only", "monitor", "dismissed", "blocked"]),
  reason: z.string().min(1),
  destination_id: StableIdSchema.nullable(),
  rendered_markdown: z.string().min(1).nullable().describe(`For promoted candidates, render the complete destination template, including its frontmatter and every required section; never return a summary snippet.

Golden shapes:
- problem → kamdar-issue frontmatter plus Problem and impact, Evidence and reproduction, Diagnosis, Containment and next action, Resolution and verification, Related records.
- decision → company-os-decision frontmatter plus Context, Options and tradeoffs, Decision rationale, Consequences and review trigger, Evidence and related records.
- sop → company-os-skill frontmatter plus Capability, Proven use, Boundaries and dependencies, Source and proof.

Use only grounded source facts and name evidence gaps explicitly.`),
  gaps: z.array(z.string().min(1)),
}).strict().superRefine((row, context) => {
  if (["promoted", "duplicate"].includes(row.disposition) !== Boolean(row.destination_id)) {
    context.addIssue({ code: "custom", message: "promoted and duplicate dispositions require a destination; all others forbid one." });
  }
  if ((row.disposition === "promoted") !== Boolean(row.rendered_markdown)) {
    context.addIssue({ code: "custom", message: "only promoted candidates render a new canonical record." });
  }
});

const NextWeekProjectReplacementSchema = z.object({
  project_id: StableIdSchema,
  source_report_id: StableIdSchema,
  section: z.literal("This week's attention"),
  expected_current_text: z.string().min(1),
  replacement_text: z.string().min(1).describe("Complete next-week checklist; integrations apply this text unchanged after the conflict guard."),
  source_ids: SourceIdsSchema,
}).strict();

const ConfigurationGapSchema = z.object({
  code: z.string().min(1),
  scope_id: StableIdSchema,
  detail: z.string().min(1),
  blocks_company_finalization: z.boolean(),
}).strict();

export const WEEKLY_REVIEW_RESULT_PROMPT = String.raw`
Return one Weekly review result from finalized Project Draft evidence.

- report_results contains complete versioned Project, Area, and Company reports.
- promotion_dispositions gives every candidate exactly one disposition; only
  promoted candidates render a new canonical record. A promoted record must be
  the complete matching Issue, Decision, or Skill/SOP template—not a summary.
- next_week_project_replacements contains complete conflict-safe Project
  checklist replacements, never parallel plan files.
- configuration_gaps remains explicit. A missing expected Area report prevents
  the Company report from becoming Final.

Golden disposition examples:
- A repeated, authorized Penang evidence-handoff problem is promoted to an Issue.
- A choice matching an existing Decision is duplicate and creates no record.
- A one-off problem is monitor; missing authority is blocked.
`;

export const WeeklyReviewResultSchema = z.object({
  schema_version: z.literal("kamdar-weekly-review-result@1.0.0"),
  context_id: StableIdSchema,
  week: z.string().regex(/^\d{4}-W\d{2}$/),
  report_results: z.array(ReportResultSchema).min(1),
  promotion_dispositions: z.array(PromotionDispositionSchema),
  next_week_project_replacements: z.array(NextWeekProjectReplacementSchema),
  configuration_gaps: z.array(ConfigurationGapSchema),
  run_notes: z.string(),
}).strict().superRefine((result, context) => {
  const blocksCompany = result.configuration_gaps.some((gap) => gap.blocks_company_finalization);
  if (blocksCompany && result.report_results.some((report) => report.report_level === "Company" && report.report_status === "Final")) {
    context.addIssue({ code: "custom", message: "a blocking Area gap forbids a Final Company report." });
  }
}).describe(WEEKLY_REVIEW_RESULT_PROMPT);

export const WeeklyReviewResultJsonSchema = z.toJSONSchema(WeeklyReviewResultSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

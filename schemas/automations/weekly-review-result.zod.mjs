import * as z from "zod";

const StableIdSchema = z.string().min(1).describe("Use an exact ID from the immutable Weekly context.");
const SourceIdsSchema = z.array(StableIdSchema).min(1).describe("Immediate source Report IDs first, followed by any retained source record IDs.");

const CompanyExecutiveContextSchema = z.object({
  problems: z.array(z.object({
    title: z.string().min(1),
    context_and_operating_impact: z.string().min(1),
    measurement_and_confidence: z.string().min(1),
    intervention_and_test: z.string().min(1),
    evidence_ids: SourceIdsSchema,
  }).strict()).min(1),
  decisions: z.array(z.object({
    title: z.string().min(1),
    context_rationale_and_tradeoff: z.string().min(1),
    authority_and_timing: z.string().min(1),
    consequence_and_review_trigger: z.string().min(1),
    evidence_ids: SourceIdsSchema,
  }).strict()).min(1),
  sops: z.array(z.object({
    title: z.string().min(1),
    workflow_and_output: z.string().min(1),
    proof_scope_and_owner: z.string().min(1),
    disposition: z.enum(["adopted", "bounded", "project_only", "deferred"]),
    destination_id: StableIdSchema.nullable(),
    evidence_ids: SourceIdsSchema,
  }).strict()).min(1),
}).strict().describe("Structured evidence used to render Company Problems, Decisions, and SOPs as self-contained executive prose.");

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
  company_executive_context: CompanyExecutiveContextSchema.nullable(),
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
  if ((report.report_level === "Company") !== Boolean(report.company_executive_context)) {
    context.addIssue({ code: "custom", message: "only Company reports carry structured executive context, and every Company report requires it." });
  }
  if (report.company_executive_context) {
    const requiredRenderedValues = [
      ...report.company_executive_context.problems.flatMap((entry) => [entry.title, entry.context_and_operating_impact, entry.measurement_and_confidence, entry.intervention_and_test]),
      ...report.company_executive_context.decisions.flatMap((entry) => [entry.title, entry.context_rationale_and_tradeoff, entry.authority_and_timing, entry.consequence_and_review_trigger]),
      ...report.company_executive_context.sops.flatMap((entry) => [entry.title, entry.workflow_and_output, entry.proof_scope_and_owner]),
    ];
    for (const value of requiredRenderedValues) {
      if (!report.report_markdown.includes(value)) context.addIssue({ code: "custom", message: `Company report Markdown must render complete executive context: ${value}` });
    }
  }
});

const PromotedProblemBaselineProofSchema = z.object({
  workflow_name: z.string().min(1),
  affected_step: z.string().min(1),
  baseline_date: z.string().min(1),
  measurement_window: z.string().min(1),
  measured_metrics: z.array(z.string().min(1)),
  measurement_gaps: z.array(z.string().min(1)),
  confidence: z.enum(["low", "medium", "high"]),
  measurement_owner_person_id: StableIdSchema,
  intervention_plan: z.string().min(1),
  after_state: z.enum(["not_measured", "measured"]),
}).strict().superRefine((proof, context) => {
  if (proof.measured_metrics.length === 0 && proof.measurement_gaps.length === 0) {
    context.addIssue({ code: "custom", message: "a promoted problem needs at least one measured metric or explicit measurement gap." });
  }
});

const DecisionOptionSchema = z.object({
  option: z.string().min(1),
  upside: z.string().min(1),
  downside: z.string().min(1),
}).strict();

const PromotedDecisionPreservationProofSchema = z.object({
  preservation_reasons: z.array(z.enum([
    "customer_handling_precedent",
    "project_operating_standard",
    "monetary_commitment",
    "material_risk_or_compliance",
    "recurring_cross_team_tradeoff",
    "costly_to_reverse",
  ])).min(1),
  reuse_value: z.string().min(1),
  materiality: z.string().min(1),
  options_considered: z.array(DecisionOptionSchema).min(2).max(3),
  selected_option: z.string().min(1),
  rationale: z.string().min(1),
  authority_person_id: StableIdSchema,
  decided_at: z.string().min(1),
  accepted_tradeoff: z.string().min(1),
  consequences: z.string().min(1),
  review_trigger: z.string().min(1),
}).strict().superRefine((proof, context) => {
  if (!proof.options_considered.some((row) => row.option === proof.selected_option)) {
    context.addIssue({ code: "custom", message: "selected_option must exactly match one considered option." });
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
  problem_baseline_proof: PromotedProblemBaselineProofSchema.nullable().optional(),
  decision_preservation_proof: PromotedDecisionPreservationProofSchema.nullable().optional(),
  rendered_markdown: z.string().min(1).nullable().describe(`For promoted candidates, render the complete destination template, including its frontmatter and every required section; never return a summary snippet.

Golden shapes:
- problem → kamdar-issue frontmatter plus Problem and impact, Before baseline and economics, Evidence and reproduction, Diagnosis, Containment and next action, Intervention and measurement plan, Resolution and verification, After measurement and verified value, Related records.
- decision → company-os-decision frontmatter plus Context, Options and tradeoffs, Decision rationale, Consequences and review trigger, Evidence and related records.
- sop → kamdar-employee-sop frontmatter plus Purpose and outcome, Trigger actors and inputs, Current workflow, Timing and volume baseline, Exceptions and controls, Improvement and verification, Evidence and related records.

Use only grounded source facts and name evidence gaps explicitly.`),
  gaps: z.array(z.string().min(1)),
}).strict().superRefine((row, context) => {
  if (["promoted", "duplicate"].includes(row.disposition) !== Boolean(row.destination_id)) {
    context.addIssue({ code: "custom", message: "promoted and duplicate dispositions require a destination; all others forbid one." });
  }
  if ((row.disposition === "promoted") !== Boolean(row.rendered_markdown)) {
    context.addIssue({ code: "custom", message: "only promoted candidates render a new canonical record." });
  }
  const isPromotedProblem = row.disposition === "promoted" && row.kind === "problem";
  if (isPromotedProblem !== Boolean(row.problem_baseline_proof)) {
    context.addIssue({ code: "custom", message: "only a promoted problem carries structured baseline proof, and every promoted problem requires it." });
  }
  if (isPromotedProblem && !row.rendered_markdown?.includes("## Before baseline and economics")) {
    context.addIssue({ code: "custom", message: "a promoted problem must preserve its Before baseline and economics." });
  }
  if (isPromotedProblem && /^## Before baseline and economics\s*\n+\s*(?:No baseline\.?|Not established\.?)\s*(?:\n|$)/im.test(row.rendered_markdown || "")) {
    context.addIssue({ code: "custom", message: "a promoted problem cannot replace its Before baseline with a placeholder." });
  }
  if (isPromotedProblem && row.problem_baseline_proof) {
    for (const value of [row.problem_baseline_proof.workflow_name, row.problem_baseline_proof.affected_step, row.problem_baseline_proof.baseline_date]) {
      if (!row.rendered_markdown?.includes(value)) {
        context.addIssue({ code: "custom", message: "the rendered Issue must contain the workflow, affected step, and baseline date from its structured baseline proof." });
      }
    }
  }
  const isPromotedDecision = row.disposition === "promoted" && row.kind === "decision";
  if (isPromotedDecision !== Boolean(row.decision_preservation_proof)) {
    context.addIssue({ code: "custom", message: "only a promoted Decision carries preservation proof, and every promoted Decision requires it." });
  }
  if (isPromotedDecision && row.decision_preservation_proof) {
    for (const option of row.decision_preservation_proof.options_considered) {
      if (!row.rendered_markdown?.includes(option.option)) context.addIssue({ code: "custom", message: `rendered Decision must include considered option: ${option.option}` });
    }
    for (const value of [row.decision_preservation_proof.selected_option, row.decision_preservation_proof.accepted_tradeoff, row.decision_preservation_proof.review_trigger]) {
      if (!row.rendered_markdown?.includes(value)) context.addIssue({ code: "custom", message: "rendered Decision must preserve its selected option, accepted tradeoff, and review trigger." });
    }
  }
  if (row.disposition === "promoted" && row.kind === "sop" && !row.rendered_markdown?.includes("template_id: kamdar-employee-sop")) {
    context.addIssue({ code: "custom", message: "a promoted workflow must use the employee SOP template, not the software skill registry." });
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
  the complete matching Issue, Decision, or employee SOP template—not a summary.
- Every promoted problem also returns problem_baseline_proof with its workflow,
  affected step, dated window, measured metrics or explicit gaps, confidence,
  measurement owner, intervention, and current After state.
- Every promoted Decision returns decision_preservation_proof. Preserve only a
  reusable precedent or a materially consequential/costly-to-reverse choice;
  routine execution choices remain project_only. Compare two or three real
  options, then preserve the selected option, rationale, authority, accepted
  tradeoff, consequences, and exact review trigger in an advise-style record.
- Every Company report returns company_executive_context and renders those
  structured Problem, Decision, and SOP entries into self-contained prose.
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

import * as z from "zod";

// Review-first MVP contract. Zod is not installed yet.
//
// The schema deliberately models rendered text, not the reasoning steps used
// to produce it. The model receives fully read source records and returns the
// complete replacement sections, comments, messages, and Draft entries that a
// deterministic applier can validate and apply.

const StableIdSchema = z
  .string()
  .min(1)
  .describe("Use the exact stable ID supplied by the Daily context. Never infer an ID from a title.");

const SourceIdsSchema = z
  .array(StableIdSchema)
  .min(1)
  .describe("Every source record used to write this output. Include IDs only from the supplied Daily context.");

// Downstream application map:
//
// project_updates[].section_replacements[]
//   -> notion via ntn (one guarded Project section replacement per row)
// completed_ticket_comments[]
//   -> notion via ntn (one unchanged rendered Work comment per row)
// weekly_progress_chases[]
//   -> notion Person lookup, then the approved channel skill
// knowledge_updates[].draft_entries[]
//   -> notion via ntn on the exact current-week Report Draft
//
// Integration-owned values such as action keys, payload hashes, provider
// receipts, routes, and processed state are derived after extraction. The model
// should not invent them.
//
// Apply mode still requires the notion skill to prove guarded section/comment
// writes and return provider receipts; extraction must not claim those effects.

/**
 * FEAT-0001 — Project page update
 *
 * Feature:
 * Keep the existing Project page current across days. Reconcile completed and
 * changed Work against the Project's weekly targets, record useful research or
 * decisions, carry forward unresolved problems, and make blockers visible.
 *
 * Data sources:
 * - Current Project Overview, Project knowledge, and This week's attention.
 * - Fully read Work items linked to the Project.
 * - Fully read Meetings linked to the Project.
 *
 * Operation:
 * Replace each complete Project section with the returned text. The applier
 * must compare the expected-current text before writing and reject conflicts.
 */
export const FEAT0001_PROJECT_UPDATE_PROMPT = String.raw`
Write the complete replacement text for the Project's three editable sections.

Writing rules:
- Overview: state the goal, current position, what changed, and the main blocker.
- Project knowledge: retain still-valid prior knowledge; add only sourced research,
  decisions, constraints, problems, and blockers that will matter after today.
- This week's attention: return the entire Markdown checklist. Check an existing
  item only when linked evidence proves it is complete. Keep unresolved targets,
  revise stale wording when evidence changed, and add the next accountable target.
- Include owner, due date, reason, and source ID naturally in checklist text.
- Do not copy ticket bodies or meeting transcripts.
- Do not silently remove an unresolved target or blocker.

Output template:
section_replacements:
  - section: Overview
    expected_current_text: <complete current section copied exactly>
    replacement_text: <complete new section>
  - section: Project knowledge
    expected_current_text: <complete current section copied exactly>
    replacement_text: <complete new section>
  - section: This week's attention
    expected_current_text: <complete current section copied exactly>
    replacement_text: <complete new checklist>

Golden example — replacement_overview:
Penang replenishment accuracy remains at risk. The signed pilot baseline is now
complete, but three supplier count formats still require manual normalisation.
The team has two working days to verify the remaining stores. Main blocker:
Jun needs the supplier-format rule confirmed before the final comparison.

Golden example — replacement_project_knowledge:
- The signed pilot baseline is the approved comparison source. [TASK-101]
- Research found three incompatible supplier column formats; a standard import
  map would remove repeated manual work. [TASK-105]
- Blocker: the normalisation rule is awaiting owner confirmation. Review on
  2026-08-28 with Jun. [TASK-103]

Golden example — replacement_this_weeks_attention:
- [x] P1 Verify the signed pilot baseline — Jun — completed 2026-08-25. [TASK-101]
- [ ] P0 Confirm the supplier normalisation rule — Jun — due 2026-08-26;
  required before the remaining checks can finish. [TASK-103]
- [ ] P1 Complete the final two store comparisons — Nur — due 2026-08-28. [TASK-104]
`;

const ProjectSectionReplacementSchema = z
  .object({
    section: z.enum(["Overview", "Project knowledge", "This week's attention"]),
    expected_current_text: z
      .string()
      .describe("The complete current section copied exactly from the input for conflict-safe application."),
    replacement_text: z
      .string()
      .describe("The complete replacement Markdown. The integration applies this text unchanged."),
  })
  .describe(
    "One directly applicable Project section replacement. The section name is routing metadata; the actual update is plain text.",
  );

export const ProjectPageUpdateSchema = z
  .object({
    project_id: StableIdSchema,
    source_ids: SourceIdsSchema,
    section_replacements: z
      .array(ProjectSectionReplacementSchema)
      .min(1)
      .describe("Only sections that actually need an update. Each row can be passed directly to the Project applier."),
    change_summary: z
      .string()
      .describe("One short sentence explaining why this Project page should change."),
  })
  .describe(FEAT0001_PROJECT_UPDATE_PROMPT);

/**
 * FEAT-0002 — Completed-ticket documentation question
 *
 * Feature:
 * Review Work items that became Done during the Daily window. If an important
 * outcome, evidence source, decision reason, problem cause, research result, or
 * handoff is missing, write one precise source-record comment asking for it.
 *
 * Data sources:
 * - Fully read Work items whose status changed to Done in the Daily window.
 * - The matching Task, Feature, Issue, or Meeting template.
 * - The verified owner ID.
 *
 * Operation:
 * Add the returned text as one comment on the source Work item. Omit complete
 * records from this array. Do not create a comment containing generic requests.
 */
export const FEAT0002_COMPLETION_COMMENT_PROMPT = String.raw`
Write one concise comment for a completed Work item that is missing important
context. The comment must show what is already understood, identify exactly what
is missing, explain why it matters, and name where the owner should add it.

Writing rules:
- Ask only questions that affect understanding, reuse, accountability, or proof.
- Do not ask for cosmetic labels or generic "more detail".
- Do not repeat facts already present in the ticket.
- Ask in a direct, helpful tone.
- Refer to the exact ticket section to update.

Comment template:
I understand that <known outcome or decision>.

What is still missing: <important missing context>.

Please add this under <exact section>:
1. <precise question>

Why this matters: <operational reason>.

Golden example:
I understand that the reconciliation sheet became the release gate.

What is still missing: the ticket does not explain why this option was chosen.

Please add this under Notes > Decision:
1. Why was the reconciliation sheet selected over the other options considered?

Why this matters: we cannot safely reuse the release rule without its rationale.
`;

export const CompletedTicketCommentSchema = z
  .object({
    work_item_id: StableIdSchema,
    owner_person_id: StableIdSchema,
    source_ids: SourceIdsSchema,
    comment_text: z.string().min(1).describe("The complete comment to add to the source Work item."),
  })
  .describe(FEAT0002_COMPLETION_COMMENT_PROMPT);

/**
 * FEAT-0003 — Weekly progress chase
 *
 * Feature:
 * Compare the Project's remaining weekly targets with linked Work progress and
 * the time left in the week. When the evidence shows a target is unlikely to
 * finish, ask the accountable owner for a factual recovery update.
 *
 * Data sources:
 * - Current Project Overview and This week's attention checklist.
 * - Linked Work status, progress, blockers, dates, and latest updates.
 * - Verified People and route facts.
 *
 * Operation:
 * Prepare one complete owner message. Omit healthy targets. The dispatcher owns
 * delivery; this extraction result never claims that a message was sent.
 */
export const FEAT0003_PROGRESS_CHASE_PROMPT = String.raw`
Write one short owner message about a threatened weekly Project target.

Writing rules:
- Begin with the Project target and due date, not a vague "checking in".
- State the observed progress and why the target appears at risk.
- Ask what changed, the current blocker, the recovery plan, and the date the
  owner can now commit to.
- Do not ask documentation-quality questions already handled on the ticket.
- Do not exaggerate unknown causes, progress, or dates.

Message template:
<Owner>, the Project target "<target>" is due <date>.

Current evidence: <progress and risk basis>.

Please reply with:
1. What changed since the last update?
2. What is blocking the remaining work?
3. What is the recovery plan and revised commitment date?

Update the linked Work item here: <source reference>.

Golden example:
Jun, the Project target "Complete all three supplier comparisons" is due Friday.

Current evidence: only one comparison is complete, and the remaining two have
not changed since 21 August. The supplier normalisation rule is still unresolved.

Please reply with:
1. What changed since the last update?
2. What is blocking the remaining comparisons?
3. What is the recovery plan and revised commitment date?

Update the linked Work items here: TASK-103 and TASK-104.
`;

export const WeeklyProgressChaseSchema = z
  .object({
    project_id: StableIdSchema,
    owner_person_id: StableIdSchema,
    related_work_item_ids: z.array(StableIdSchema).min(1),
    source_ids: SourceIdsSchema,
    message_text: z.string().min(1).describe("The complete owner message to prepare for dispatch."),
  })
  .describe(FEAT0003_PROGRESS_CHASE_PROMPT);

/**
 * FEAT-0004 — Completed-work knowledge extraction
 *
 * Feature:
 * Read sufficiently documented Work completed today and extract useful problem
 * baselines, Decisions, and current workflow observations into the current Weekly Draft. When
 * the source is too incomplete, write the exact ticket comment FEAT-0002 needs.
 *
 * Data sources:
 * - Fully read Work items completed in the Daily window.
 * - Related Meeting evidence included in the Daily context.
 * - The current Weekly Draft.
 *
 * Operation:
 * Return a complete Weekly Draft entry, a missing-information comment, or both.
 * The deterministic applier writes the Draft and routes any ticket comment.
 */
export const FEAT0004_KNOWLEDGE_UPDATE_PROMPT = String.raw`
Extract only learning that another person or future review could use. Write one
complete Markdown block for the Weekly Draft. Preserve the source IDs.

Writing rules:
- Problem definition: preserve a measurable Before baseline. State the affected
  workflow step, observed condition, impact, measurement window, recurrence,
  volume, time lost, wait/delay, affected people, direct-cost formula, evidence,
  and confidence. Unknown time, volume, wage, or cost is a measurement gap with
  a named evidence owner; never invent a financial estimate.
- Decision: state the choice, reason, alternatives or tradeoff, authority, and
  review trigger.
- Workflow observation: capture the current method even when it is not approved
  or reusable. State its trigger, actors, ordered steps, systems, handoffs,
  frequency/volume, active and waiting time, exceptions, output, evidence
  window, confidence, and measurement gaps. Reuse proof affects Weekly
  promotion, not whether Daily may observe the workflow.
- Omit headings with no grounded candidate.
- If the workflow or problem is real but measurement evidence is incomplete,
  retain the grounded observation with explicit measurement_gaps and write the
  complete FEAT-0002-style measurement question in missing_information_comment.
  Return an empty draft_entries array only when the observed condition itself is
  not grounded.
- Combine multiple findings of the same kind from one Work item into one entry.

Weekly Draft template:
### Problems and inefficiencies
- <workflow step, observed problem, recurrence/volume, time/wait/cost baseline or
  explicit measurement gap, evidence window and confidence> [SOURCE-ID]

### Decisions
- <choice, rationale, authority, and review trigger> [SOURCE-ID]

### SOP signals
- <current trigger, actors, ordered method, systems/handoffs, volume/timing,
  exceptions, output, evidence/confidence, and promotion state> [SOURCE-ID]

Golden example:
### Problems and inefficiencies
- Three supplier files required the same manual column remapping before their
  counts could be compared. A standard import map would remove repeated setup
  work from every review; the delay risks missing the final comparison date.
  W34 observed three files and a two-day delay. Active rework minutes, loaded
  hourly cost, and direct monetary cost remain measurement gaps owned by the
  merchandising lead. [TASK-105]

### SOP signals
- Before a supplier comparison, map its columns to the approved baseline format,
  retain the original file, and attach the normalised output to the Work item.
  This method was observed for three suppliers during W34; active time and wait
  time still need measurement before the baseline is complete. [TASK-105]
`;

const ConfidenceSchema = z.enum(["low", "medium", "high"]);

const WorkflowObservationSchema = z.object({
  workflow_name: z.string().min(1),
  observation_state: z.enum(["observed", "proposed", "approved"]),
  trigger: z.string().min(1),
  actor_person_ids: z.array(StableIdSchema).min(1),
  ordered_steps: z.array(z.string().min(1)).min(2),
  systems: z.array(z.string().min(1)),
  handoffs: z.array(z.string().min(1)),
  frequency: z.string().min(1),
  volume_per_week: z.number().nonnegative().nullable(),
  active_minutes_per_run: z.number().nonnegative().nullable(),
  wait_minutes_per_run: z.number().nonnegative().nullable(),
  exceptions_and_rework: z.array(z.string().min(1)),
  output: z.string().min(1),
  evidence_window: z.string().min(1),
  confidence: ConfidenceSchema,
  measurement_gaps: z.array(z.string().min(1)),
}).strict().superRefine((workflow, context) => {
  const missingMeasures = [workflow.volume_per_week, workflow.active_minutes_per_run, workflow.wait_minutes_per_run].some((value) => value === null);
  if (missingMeasures && workflow.measurement_gaps.length === 0) {
    context.addIssue({ code: "custom", message: "unknown workflow volume or timing requires an explicit measurement gap." });
  }
});

const ProblemBaselineSchema = z.object({
  problem_name: z.string().min(1),
  workflow_name: z.string().min(1),
  affected_step: z.string().min(1),
  observed_condition: z.string().min(1),
  affected_people: z.array(StableIdSchema).min(1),
  measurement_window: z.string().min(1),
  occurrences: z.number().nonnegative().nullable(),
  volume_per_week: z.number().nonnegative().nullable(),
  time_lost_minutes_per_occurrence: z.number().nonnegative().nullable(),
  wait_or_delay_minutes: z.number().nonnegative().nullable(),
  loaded_hourly_cost_myr: z.number().nonnegative().nullable(),
  direct_cost_per_week_myr: z.number().nonnegative().nullable(),
  direct_cost_formula: z.string().min(1).nullable(),
  revenue_or_risk_impact: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  confidence: ConfidenceSchema,
  measurement_owner_person_id: StableIdSchema,
  measurement_gaps: z.array(z.string().min(1)),
}).strict().superRefine((baseline, context) => {
  const costInputs = [baseline.volume_per_week, baseline.time_lost_minutes_per_occurrence, baseline.loaded_hourly_cost_myr];
  const hasAllCostInputs = costInputs.every((value) => value !== null);
  const hasAnyCostClaim = baseline.direct_cost_per_week_myr !== null || baseline.direct_cost_formula !== null;
  const hasCompleteCost = hasAllCostInputs && baseline.direct_cost_per_week_myr !== null && baseline.direct_cost_formula !== null;
  if (!hasCompleteCost && baseline.measurement_gaps.length === 0) {
    context.addIssue({ code: "custom", message: "an incomplete cost baseline requires explicit measurement gaps." });
  }
  if (hasAnyCostClaim && !hasCompleteCost) {
    context.addIssue({ code: "custom", message: "a direct cost claim requires weekly volume, time lost per occurrence, loaded hourly cost, the visible formula, and the calculated result." });
  }
  if (hasCompleteCost) {
    const expectedCost = baseline.volume_per_week * baseline.time_lost_minutes_per_occurrence / 60 * baseline.loaded_hourly_cost_myr;
    if (Math.abs(expectedCost - baseline.direct_cost_per_week_myr) > 0.01) {
      context.addIssue({ code: "custom", message: "direct cost must equal volume per week × time lost per occurrence ÷ 60 × loaded hourly cost." });
    }
  }
});

const WeeklyDraftEntrySchema = z
  .object({
    kind: z.enum(["problem", "decision", "inefficiency", "sop"]),
    anchor: z.enum(["Problems and inefficiencies", "Decisions", "SOPs"]),
    markdown: z
      .string()
      .min(1)
      .describe("The complete Markdown entry. The Weekly Draft integration writes it unchanged."),
    workflow_observation: WorkflowObservationSchema.nullable(),
    problem_baseline: ProblemBaselineSchema.nullable(),
  })
  .describe(
    "One directly routable Weekly Draft entry. The integration derives its source key from kind and work_item_id.",
  ).superRefine((entry, context) => {
    if (entry.kind === "sop" && !entry.workflow_observation) {
      context.addIssue({ code: "custom", message: "an SOP candidate requires a structured workflow observation." });
    }
    if (["problem", "inefficiency"].includes(entry.kind) && !entry.problem_baseline) {
      context.addIssue({ code: "custom", message: "a problem or inefficiency requires a structured problem baseline." });
    }
    if (entry.kind === "decision" && (entry.workflow_observation || entry.problem_baseline)) {
      context.addIssue({ code: "custom", message: "a Decision entry cannot carry workflow or problem baseline payloads." });
    }
  });

export const KnowledgeUpdateSchema = z
  .object({
    work_item_id: StableIdSchema,
    source_ids: SourceIdsSchema,
    draft_entries: z
      .array(WeeklyDraftEntrySchema)
      .describe("Source-keyed entries for the Weekly Draft integration. Empty when evidence is insufficient."),
    missing_information_comment: z
      .string()
      .nullable()
      .describe("Complete FEAT-0002-style ticket comment, or null when the evidence is sufficient."),
  })
  .describe(FEAT0004_KNOWLEDGE_UPDATE_PROMPT);

/**
 * One model call returns one object containing the text outputs from all four
 * pipelines. Processing flags and provider receipts are intentionally absent:
 * the deterministic applier owns those facts after successful writes.
 */
export const DAILY_REVIEW_RESULT_PROMPT = String.raw`
Return the complete result of one bounded Daily Project Review.

Rules across all pipelines:
- Use only the supplied Daily context and current Weekly Draft.
- Output actions only; omit records that need no change, comment, chase, or entry.
- Keep every claim traceable through source_ids.
- Never claim that a provider write or message delivery occurred.
- Do not duplicate the same question in a ticket comment and owner chase.
- run_notes must name any material ambiguity, conflict, or missing source that
  prevented an otherwise expected output. Use an empty string when none exist.
`;

export const DailyReviewResultSchema = z
  .object({
    schema_version: z.literal("kamdar-daily-review-result@1.0.0"),
    context_id: StableIdSchema,
    project_updates: z.array(ProjectPageUpdateSchema),
    completed_ticket_comments: z.array(CompletedTicketCommentSchema),
    weekly_progress_chases: z.array(WeeklyProgressChaseSchema),
    knowledge_updates: z.array(KnowledgeUpdateSchema),
    run_notes: z.string(),
  })
  .describe(DAILY_REVIEW_RESULT_PROMPT);

export const DailyReviewResultJsonSchema = z.toJSONSchema(DailyReviewResultSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

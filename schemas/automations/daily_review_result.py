"""Pydantic v2 contract for one bounded Daily Project Review result."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    AfterValidator,
    ConfigDict,
    Field,
    StrictFloat,
    StrictInt,
    StringConstraints,
    model_validator,
)

from .feature_outcome import FeatureOutcome


NonEmptyString = Annotated[str, StringConstraints(min_length=1)]
StableId = Annotated[
    str,
    StringConstraints(min_length=1),
    Field(
        description=(
            "Use the exact stable ID supplied by the Daily context. "
            "Never infer an ID from a title."
        )
    ),
]
SourceIds = Annotated[
    list[StableId],
    Field(
        min_length=1,
        description=(
            "Every source record used to write this output. Include IDs only "
            "from the supplied Daily context."
        ),
    ),
]


def _offset_datetime(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("datetime must include a UTC offset")
    return value


OffsetDatetime = Annotated[str, AfterValidator(_offset_datetime)]
NonNegativeNumber = Annotated[StrictInt | StrictFloat, Field(ge=0)]


FEAT0001_PROJECT_UPDATE_PROMPT = """
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
"""

FEAT0002_COMPLETION_COMMENT_PROMPT = """
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
"""

FEAT0003_PROGRESS_CHASE_PROMPT = """
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
"""

FEAT0004_KNOWLEDGE_UPDATE_PROMPT = """
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
  retain the grounded observation with explicit measurement_gaps. FEAT-0002
  owns any source-record question. Return an empty draft_entries array only when
  the observed condition itself is not grounded.
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
"""

DAILY_REVIEW_RESULT_PROMPT = """
Return the complete result of one bounded Daily Project Review.

Rules across all pipelines:
- Use only the supplied Daily context. Do not edit Notion Project narrative or
  load Employee Memory, SOP records, or prior Daily source records.
- Return feature_outcomes exactly once for FEAT-0001 through FEAT-0004. Choose
  produced, no_change_needed, or insufficient_information from the cited
  evidence, and point produced outcomes to their output rows.
- Return one documentation review for every selected Done Work item. Other
  arrays contain actions only.
- project_note_updates groups complete notes by Project. Progress and
  documentation snapshots go in progress_notes; Problems, Decisions, and
  workflow observations go in knowledge_notes. The deterministic applier
  derives note keys and appends them to that Project's current-week file.
- Keep every claim traceable through source_ids.
- Never claim that a provider write or message delivery occurred.
- Do not duplicate the same question in a ticket comment and owner chase.
- run_notes must name any material ambiguity, conflict, or missing source that
  prevented an otherwise expected output. Use an empty string when none exist.
"""


class _Model(BaseModel):
    model_config = ConfigDict(
        extra="ignore", json_schema_extra={"additionalProperties": False}
    )


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProjectSectionReplacement(_Model):
    """One directly applicable Project section replacement.

    The section name is routing metadata; the actual update is plain text.
    """

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": (
                "One directly applicable Project section replacement. The section "
                "name is routing metadata; the actual update is plain text."
            )
        },
    )

    section: Literal["Overview", "Project knowledge", "This week's attention"]
    expected_current_text: str = Field(
        description=(
            "The complete current section copied exactly from the input for "
            "conflict-safe application."
        )
    )
    replacement_text: str = Field(
        description=(
            "The complete replacement Markdown. The integration applies this "
            "text unchanged."
        )
    )


class ProjectPageUpdate(_Model):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": FEAT0001_PROJECT_UPDATE_PROMPT,
        },
    )

    project_id: StableId
    source_ids: SourceIds
    section_replacements: Annotated[
        list[ProjectSectionReplacement],
        Field(
            min_length=1,
            description=(
                "Only sections that actually need an update. Each row can be "
                "passed directly to the Project applier."
            ),
        ),
    ]
    change_summary: str = Field(
        description="One short sentence explaining why this Project page should change."
    )


class DocumentationReview(_StrictModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"description": FEAT0002_COMPLETION_COMMENT_PROMPT},
    )

    work_item_id: StableId
    owner_person_id: StableId
    source_ids: SourceIds
    rubric_id: Literal["task-completion@1.0.0"]
    verdict: Literal["sufficient", "needs_information"]
    missing_requirement_ids: list[StableId]
    question_key: StableId | None = Field(
        description="Stable deduplication key for the open documentation question."
    )
    comment_text: NonEmptyString | None = Field(
        description=(
            "The complete comment to add, or null when documentation is sufficient."
        )
    )

    @model_validator(mode="after")
    def validate_verdict_payload(self) -> DocumentationReview:
        needs_information = self.verdict == "needs_information"
        issues: list[str] = []
        if needs_information and not self.missing_requirement_ids:
            issues.append(
                "needs_information requires at least one missing requirement."
            )
        if (
            needs_information
            and not (self.question_key and self.comment_text)
        ) or (
            not needs_information and (self.question_key or self.comment_text)
        ):
            issues.append(
                "needs_information requires a question key and comment; "
                "sufficient forbids both."
            )
        if not needs_information and self.missing_requirement_ids:
            issues.append(
                "sufficient documentation cannot list missing requirements."
            )
        if issues:
            raise ValueError(" ".join(issues))
        return self


class WeeklyProgressChase(_Model):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": FEAT0003_PROGRESS_CHASE_PROMPT,
        },
    )

    project_id: StableId
    owner_person_id: StableId
    related_work_item_ids: Annotated[list[StableId], Field(min_length=1)]
    source_ids: SourceIds
    message_text: NonEmptyString = Field(
        description="The complete owner message to prepare for dispatch."
    )


class WorkflowObservation(_StrictModel):
    workflow_name: NonEmptyString
    observation_state: Literal["observed", "proposed", "approved"]
    trigger: NonEmptyString
    actor_person_ids: Annotated[list[StableId], Field(min_length=1)]
    ordered_steps: Annotated[list[NonEmptyString], Field(min_length=2)]
    systems: list[NonEmptyString]
    handoffs: list[NonEmptyString]
    frequency: NonEmptyString
    volume_per_week: NonNegativeNumber | None
    active_minutes_per_run: NonNegativeNumber | None
    wait_minutes_per_run: NonNegativeNumber | None
    exceptions_and_rework: list[NonEmptyString]
    output: NonEmptyString
    evidence_window: NonEmptyString
    confidence: Literal["low", "medium", "high"]
    measurement_gaps: list[NonEmptyString]

    @model_validator(mode="after")
    def require_gaps_for_unknown_measures(self) -> WorkflowObservation:
        missing_measures = any(
            value is None
            for value in (
                self.volume_per_week,
                self.active_minutes_per_run,
                self.wait_minutes_per_run,
            )
        )
        if missing_measures and not self.measurement_gaps:
            raise ValueError(
                "unknown workflow volume or timing requires an explicit "
                "measurement gap."
            )
        return self


class ProblemBaseline(_StrictModel):
    problem_name: NonEmptyString
    workflow_name: NonEmptyString
    affected_step: NonEmptyString
    observed_condition: NonEmptyString
    affected_people: Annotated[list[StableId], Field(min_length=1)]
    measurement_window: NonEmptyString
    occurrences: NonNegativeNumber | None
    volume_per_week: NonNegativeNumber | None
    time_lost_minutes_per_occurrence: NonNegativeNumber | None
    wait_or_delay_minutes: NonNegativeNumber | None
    loaded_hourly_cost_myr: NonNegativeNumber | None
    direct_cost_per_week_myr: NonNegativeNumber | None
    direct_cost_formula: NonEmptyString | None
    revenue_or_risk_impact: NonEmptyString
    evidence: Annotated[list[NonEmptyString], Field(min_length=1)]
    confidence: Literal["low", "medium", "high"]
    measurement_owner_person_id: StableId
    measurement_gaps: list[NonEmptyString]

    @model_validator(mode="after")
    def validate_cost_baseline(self) -> ProblemBaseline:
        cost_inputs = (
            self.volume_per_week,
            self.time_lost_minutes_per_occurrence,
            self.loaded_hourly_cost_myr,
        )
        has_all_cost_inputs = all(value is not None for value in cost_inputs)
        has_any_cost_claim = (
            self.direct_cost_per_week_myr is not None
            or self.direct_cost_formula is not None
        )
        has_complete_cost = (
            has_all_cost_inputs
            and self.direct_cost_per_week_myr is not None
            and self.direct_cost_formula is not None
        )

        issues: list[str] = []
        if not has_complete_cost and not self.measurement_gaps:
            issues.append(
                "an incomplete cost baseline requires explicit measurement gaps."
            )
        if has_any_cost_claim and not has_complete_cost:
            issues.append(
                "a direct cost claim requires weekly volume, time lost per "
                "occurrence, loaded hourly cost, the visible formula, and the "
                "calculated result."
            )
        if has_complete_cost:
            expected_cost = (
                self.volume_per_week
                * self.time_lost_minutes_per_occurrence
                / 60
                * self.loaded_hourly_cost_myr
            )
            if abs(expected_cost - self.direct_cost_per_week_myr) > 0.01:
                issues.append(
                    "direct cost must equal volume per week × time lost per "
                    "occurrence ÷ 60 × loaded hourly cost."
                )
        if issues:
            raise ValueError(" ".join(issues))
        return self


class WeeklyDraftEntry(_Model):
    """One directly routable Weekly Draft entry.

    The integration derives its source key from kind and work_item_id.
    """

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": (
                "One directly routable Weekly Draft entry. The integration derives "
                "its source key from kind and work_item_id."
            )
        },
    )

    kind: Literal["problem", "decision", "inefficiency", "sop"]
    anchor: Literal["Problems and inefficiencies", "Decisions", "SOPs"]
    markdown: NonEmptyString = Field(
        description=(
            "The complete Markdown entry. The Weekly Draft integration writes "
            "it unchanged."
        )
    )
    workflow_observation: WorkflowObservation | None
    problem_baseline: ProblemBaseline | None

    @model_validator(mode="after")
    def validate_payload_for_kind(self) -> WeeklyDraftEntry:
        issues: list[str] = []
        if self.kind == "sop" and self.workflow_observation is None:
            issues.append(
                "an SOP candidate requires a structured workflow observation."
            )
        if self.kind in {"problem", "inefficiency"} and self.problem_baseline is None:
            issues.append(
                "a problem or inefficiency requires a structured problem baseline."
            )
        if self.kind == "decision" and (
            self.workflow_observation is not None or self.problem_baseline is not None
        ):
            issues.append(
                "a Decision entry cannot carry workflow or problem baseline payloads."
            )
        if issues:
            raise ValueError(" ".join(issues))
        return self


class KnowledgeUpdate(_Model):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": FEAT0004_KNOWLEDGE_UPDATE_PROMPT,
        },
    )

    work_item_id: StableId
    source_ids: SourceIds
    draft_entries: list[WeeklyDraftEntry] = Field(
        description=(
            "Source-keyed entries for the Weekly Draft integration. Empty when "
            "evidence is insufficient."
        )
    )


class ProjectNote(_StrictModel):
    observation_kind: Literal[
        "work_snapshot",
        "completed_outcome",
        "documentation_question",
        "problem",
        "inefficiency",
        "decision",
        "workflow_sample",
    ]
    observed_at: OffsetDatetime
    source_updated_at: OffsetDatetime
    source_revision: NonEmptyString
    section: Literal[
        "Work and employee updates",
        "Completed outcomes and artifacts",
        "Documentation questions",
        "Problems and inefficiencies",
        "Decisions",
        "Workflow and SOP signals",
    ]
    source_ids: SourceIds
    work_id: StableId | None
    employee_ids: list[StableId]
    workflow_key: StableId | None
    structured_payload: dict[str, object]
    markdown: NonEmptyString

    @model_validator(mode="after")
    def validate_routing(self) -> ProjectNote:
        section_by_kind = {
            "work_snapshot": "Work and employee updates",
            "completed_outcome": "Completed outcomes and artifacts",
            "documentation_question": "Documentation questions",
            "problem": "Problems and inefficiencies",
            "inefficiency": "Problems and inefficiencies",
            "decision": "Decisions",
            "workflow_sample": "Workflow and SOP signals",
        }
        issues: list[str] = []
        if self.section != section_by_kind[self.observation_kind]:
            issues.append(
                f"{self.observation_kind} must use "
                f"{section_by_kind[self.observation_kind]}."
            )
        if self.observation_kind in {
            "work_snapshot",
            "completed_outcome",
            "documentation_question",
        } and self.work_id is None:
            issues.append(f"{self.observation_kind} requires work_id.")
        if self.observation_kind in {"work_snapshot", "completed_outcome"} and not self.employee_ids:
            issues.append(f"{self.observation_kind} requires employee_ids.")
        if self.observation_kind == "workflow_sample" and self.workflow_key is None:
            issues.append("workflow_sample requires workflow_key.")
        if self.observation_kind in {"problem", "inefficiency"}:
            try:
                ProblemBaseline.model_validate(
                    self.structured_payload.get("problem_baseline")
                )
            except Exception as error:
                issues.append(
                    "problem and inefficiency notes require a valid structured "
                    f"problem_baseline: {error}"
                )
        if self.observation_kind == "workflow_sample":
            try:
                WorkflowObservation.model_validate(
                    self.structured_payload.get("workflow_observation")
                )
            except Exception as error:
                issues.append(
                    "workflow_sample requires a valid structured "
                    f"workflow_observation: {error}"
                )
        if issues:
            raise ValueError(" ".join(issues))
        return self


class ProjectNoteUpdate(_StrictModel):
    project_id: StableId
    project_name: NonEmptyString
    week: Annotated[str, StringConstraints(pattern=r"^\d{4}-W\d{2}$")]
    progress_notes: list[ProjectNote] = Field(
        description=(
            "Complete current Work, accepted outcome, and documentation-question "
            "snapshots for this Project."
        )
    )
    knowledge_notes: list[ProjectNote] = Field(
        description=(
            "Source-linked Problem, Decision, inefficiency, and workflow "
            "observations for this Project."
        )
    )

    @model_validator(mode="after")
    def validate_lanes(self) -> ProjectNoteUpdate:
        if any(
            note.observation_kind
            not in {"work_snapshot", "completed_outcome", "documentation_question"}
            for note in self.progress_notes
        ):
            raise ValueError("progress_notes contains a knowledge observation.")
        if any(
            note.observation_kind
            not in {"problem", "inefficiency", "decision", "workflow_sample"}
            for note in self.knowledge_notes
        ):
            raise ValueError("knowledge_notes contains a progress observation.")
        return self


class DailyReviewResult(_StrictModel):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "additionalProperties": False,
            "description": DAILY_REVIEW_RESULT_PROMPT,
        },
    )

    schema_version: Literal["kamdar-daily-review-result@2.0.0"]
    context_id: StableId
    feature_outcomes: Annotated[list[FeatureOutcome], Field(min_length=4, max_length=4)]
    project_note_updates: list[ProjectNoteUpdate]
    documentation_reviews: list[DocumentationReview]
    weekly_progress_chases: list[WeeklyProgressChase]
    run_notes: str

    @model_validator(mode="after")
    def validate_feature_coverage(self) -> DailyReviewResult:
        expected = {"FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"}
        seen: set[str] = set()
        issues: list[str] = []
        for outcome in self.feature_outcomes:
            if outcome.feature_id not in expected or outcome.feature_id in seen:
                issues.append(f"unexpected or duplicate {outcome.feature_id}.")
            seen.add(outcome.feature_id)
            if outcome.feature_id == "FEAT-0001":
                expected_refs = [
                    f"/project_note_updates/{index}"
                    for index, row in enumerate(self.project_note_updates)
                    if row.progress_notes
                ]
            elif outcome.feature_id == "FEAT-0004":
                expected_refs = [
                    f"/project_note_updates/{index}"
                    for index, row in enumerate(self.project_note_updates)
                    if row.knowledge_notes
                ]
            elif outcome.feature_id == "FEAT-0002":
                expected_refs = [
                    f"/documentation_reviews/{index}"
                    for index in range(len(self.documentation_reviews))
                ]
            else:
                expected_refs = [
                    f"/weekly_progress_chases/{index}"
                    for index in range(len(self.weekly_progress_chases))
                ]
            if outcome.outcome in {"produced", "insufficient_information"}:
                if set(outcome.output_refs) != set(expected_refs) or len(outcome.output_refs) != len(expected_refs):
                    issues.append(
                        f"{outcome.feature_id} must reference every owned output exactly once."
                    )
            elif expected_refs:
                issues.append(
                    f"{outcome.feature_id} has outputs and cannot be {outcome.outcome}."
                )
        for feature_id in expected - seen:
            issues.append(f"missing outcome for {feature_id}.")
        if issues:
            raise ValueError(" ".join(issues))
        return self


DAILY_REVIEW_RESULT_JSON_SCHEMA = DailyReviewResult.model_json_schema(
    mode="validation"
)

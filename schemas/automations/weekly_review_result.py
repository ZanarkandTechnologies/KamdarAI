"""Pydantic contract for Weekly review extraction output."""

from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StringConstraints,
    model_validator,
)

from .feature_outcome import FeatureOutcome, validate_feature_outcome_coverage


NonEmptyString = Annotated[str, StringConstraints(min_length=1)]
StableId = Annotated[
    str,
    StringConstraints(min_length=1),
    Field(description="Use an exact ID from the immutable Weekly context."),
]
SourceIds = Annotated[
    list[StableId],
    Field(
        min_length=1,
        description="Immediate source Report IDs first, followed by any retained source record IDs.",
    ),
]
Week = Annotated[str, StringConstraints(pattern=r"^\d{4}-W\d{2}$")]
PositiveInteger = Annotated[int, Field(strict=True, gt=0)]
NonNegativeInteger = Annotated[int, Field(strict=True, ge=0)]
_DATE_SOURCE = (
    r"(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|"
    r"\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|"
    r"(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))"
)
_OFFSET_DATETIME_PATTERN = (
    rf"^{_DATE_SOURCE}T(?:[01]\d|2[0-3]):[0-5]\d"
    rf"(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$"
)
OffsetDateTime = Annotated[
    str,
    StringConstraints(pattern=_OFFSET_DATETIME_PATTERN),
    Field(json_schema_extra={"format": "date-time"}),
]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExecutiveProblem(_StrictModel):
    title: NonEmptyString
    context_and_operating_impact: NonEmptyString
    measurement_and_confidence: NonEmptyString
    intervention_and_test: NonEmptyString
    evidence_ids: SourceIds


class ExecutiveDecision(_StrictModel):
    title: NonEmptyString
    context_rationale_and_tradeoff: NonEmptyString
    authority_and_timing: NonEmptyString
    consequence_and_review_trigger: NonEmptyString
    evidence_ids: SourceIds


class ExecutiveSop(_StrictModel):
    title: NonEmptyString
    workflow_and_output: NonEmptyString
    proof_scope_and_owner: NonEmptyString
    disposition: Literal["adopted", "bounded", "project_only", "deferred"]
    destination_id: StableId | None
    evidence_ids: SourceIds


class CompanyExecutiveContext(_StrictModel):
    """Structured evidence used to render Company Problems, Decisions, and SOPs as self-contained executive prose."""

    problems: Annotated[list[ExecutiveProblem], Field(min_length=1)]
    decisions: Annotated[list[ExecutiveDecision], Field(min_length=1)]
    sops: Annotated[list[ExecutiveSop], Field(min_length=1)]


class ReportResult(_StrictModel):
    report_id: StableId
    report_level: Literal["Project", "Area", "Company"]
    project_id: StableId | None
    area: NonEmptyString | None
    previous_report_id: StableId | None
    source_report_ids: Annotated[list[StableId], Field(min_length=1)]
    prior_version: NonNegativeInteger | None
    report_version: PositiveInteger
    report_status: Literal["Draft", "Final", "Blocked"]
    finalized_at: OffsetDateTime | None
    report_markdown: Annotated[
        NonEmptyString,
        Field(description="Complete rendered report using the matching Project, Area, or Company template."),
    ]
    company_executive_context: CompanyExecutiveContext | None
    configuration_gaps: list[NonEmptyString]

    @model_validator(mode="after")
    def validate_report(self) -> "ReportResult":
        if (self.report_status == "Final") != (self.finalized_at is not None):
            raise ValueError("finalized_at must be present only for Final reports.")
        if self.prior_version is not None and self.report_version != self.prior_version + 1:
            raise ValueError("an existing Draft must increment report_version exactly once.")
        if self.report_level == "Project" and (not self.project_id or not self.area):
            raise ValueError("Project reports require project_id and area.")
        if self.report_level == "Area" and (self.project_id or not self.area):
            raise ValueError("Area reports require area and forbid project_id.")
        if self.report_level == "Company" and (self.project_id or self.area):
            raise ValueError("Company reports forbid project_id and area.")
        if (self.report_level == "Company") != (self.company_executive_context is not None):
            raise ValueError(
                "only Company reports carry structured executive context, and every Company report requires it."
            )
        if self.company_executive_context:
            required_rendered_values = [
                *(
                    value
                    for entry in self.company_executive_context.problems
                    for value in (
                        entry.title,
                        entry.context_and_operating_impact,
                        entry.measurement_and_confidence,
                        entry.intervention_and_test,
                    )
                ),
                *(
                    value
                    for entry in self.company_executive_context.decisions
                    for value in (
                        entry.title,
                        entry.context_rationale_and_tradeoff,
                        entry.authority_and_timing,
                        entry.consequence_and_review_trigger,
                    )
                ),
                *(
                    value
                    for entry in self.company_executive_context.sops
                    for value in (entry.title, entry.workflow_and_output, entry.proof_scope_and_owner)
                ),
            ]
            for value in required_rendered_values:
                if value not in self.report_markdown:
                    raise ValueError(f"Company report Markdown must render complete executive context: {value}")
        return self


class PromotedProblemBaselineProof(_StrictModel):
    workflow_name: NonEmptyString
    affected_step: NonEmptyString
    baseline_date: NonEmptyString
    measurement_window: NonEmptyString
    measured_metrics: list[NonEmptyString]
    measurement_gaps: list[NonEmptyString]
    confidence: Literal["low", "medium", "high"]
    measurement_owner_person_id: StableId
    intervention_plan: NonEmptyString
    after_state: Literal["not_measured", "measured"]

    @model_validator(mode="after")
    def validate_measurement_evidence(self) -> "PromotedProblemBaselineProof":
        if not self.measured_metrics and not self.measurement_gaps:
            raise ValueError("a promoted problem needs at least one measured metric or explicit measurement gap.")
        return self


class DecisionOption(_StrictModel):
    option: NonEmptyString
    upside: NonEmptyString
    downside: NonEmptyString


class PromotedDecisionPreservationProof(_StrictModel):
    preservation_reasons: Annotated[
        list[
            Literal[
                "customer_handling_precedent",
                "project_operating_standard",
                "monetary_commitment",
                "material_risk_or_compliance",
                "recurring_cross_team_tradeoff",
                "costly_to_reverse",
            ]
        ],
        Field(min_length=1),
    ]
    reuse_value: NonEmptyString
    materiality: NonEmptyString
    options_considered: Annotated[list[DecisionOption], Field(min_length=2, max_length=3)]
    selected_option: NonEmptyString
    rationale: NonEmptyString
    authority_person_id: StableId
    decided_at: NonEmptyString
    accepted_tradeoff: NonEmptyString
    consequences: NonEmptyString
    review_trigger: NonEmptyString

    @model_validator(mode="after")
    def validate_selected_option(self) -> "PromotedDecisionPreservationProof":
        if not any(row.option == self.selected_option for row in self.options_considered):
            raise ValueError("selected_option must exactly match one considered option.")
        return self


PROMOTED_RECORD_DESCRIPTION = """For promoted candidates, render the complete destination template, including its frontmatter and every required section; never return a summary snippet.

Golden shapes:
- problem → kamdar-issue frontmatter plus Problem and impact, Before baseline and economics, Evidence and reproduction, Diagnosis, Containment and next action, Intervention and measurement plan, Resolution and verification, After measurement and verified value, Related records.
- decision → company-os-decision frontmatter plus Context, Options and tradeoffs, Decision rationale, Consequences and review trigger, Evidence and related records.
- sop → kamdar-employee-sop frontmatter plus Purpose and outcome, Trigger actors and inputs, Current workflow, Timing and volume baseline, Exceptions and controls, Improvement and verification, Evidence and related records.

Use only grounded source facts and name evidence gaps explicitly."""


class PromotionDisposition(_StrictModel):
    candidate_id: StableId
    kind: Literal["problem", "decision", "sop"]
    source_report_id: Annotated[
        StableId,
        Field(description="The Project Report that exposed this candidate; Weekly does not rescan raw Work."),
    ]
    source_ids: SourceIds
    disposition: Literal["promoted", "duplicate", "project_only", "monitor", "dismissed", "blocked"]
    reason: NonEmptyString
    destination_id: StableId | None
    problem_baseline_proof: PromotedProblemBaselineProof | None = None
    decision_preservation_proof: PromotedDecisionPreservationProof | None = None
    rendered_markdown: Annotated[NonEmptyString | None, Field(description=PROMOTED_RECORD_DESCRIPTION)]
    gaps: list[NonEmptyString]

    @model_validator(mode="after")
    def validate_disposition(self) -> "PromotionDisposition":
        if (self.disposition in {"promoted", "duplicate"}) != (self.destination_id is not None):
            raise ValueError("promoted and duplicate dispositions require a destination; all others forbid one.")
        if (self.disposition == "promoted") != (self.rendered_markdown is not None):
            raise ValueError("only promoted candidates render a new canonical record.")

        is_promoted_problem = self.disposition == "promoted" and self.kind == "problem"
        if is_promoted_problem != (self.problem_baseline_proof is not None):
            raise ValueError(
                "only a promoted problem carries structured baseline proof, and every promoted problem requires it."
            )
        if is_promoted_problem and "## Before baseline and economics" not in (self.rendered_markdown or ""):
            raise ValueError("a promoted problem must preserve its Before baseline and economics.")
        if is_promoted_problem and re.search(
            r"^## Before baseline and economics\s*\n+\s*(?:No baseline\.?|Not established\.?)\s*(?:\n|$)",
            self.rendered_markdown or "",
            re.IGNORECASE | re.MULTILINE,
        ):
            raise ValueError("a promoted problem cannot replace its Before baseline with a placeholder.")
        if is_promoted_problem and self.problem_baseline_proof:
            for value in (
                self.problem_baseline_proof.workflow_name,
                self.problem_baseline_proof.affected_step,
                self.problem_baseline_proof.baseline_date,
            ):
                if value not in (self.rendered_markdown or ""):
                    raise ValueError(
                        "the rendered Issue must contain the workflow, affected step, and baseline date "
                        "from its structured baseline proof."
                    )

        is_promoted_decision = self.disposition == "promoted" and self.kind == "decision"
        if is_promoted_decision != (self.decision_preservation_proof is not None):
            raise ValueError(
                "only a promoted Decision carries preservation proof, and every promoted Decision requires it."
            )
        if is_promoted_decision and self.decision_preservation_proof:
            for option in self.decision_preservation_proof.options_considered:
                if option.option not in (self.rendered_markdown or ""):
                    raise ValueError(f"rendered Decision must include considered option: {option.option}")
            for value in (
                self.decision_preservation_proof.selected_option,
                self.decision_preservation_proof.accepted_tradeoff,
                self.decision_preservation_proof.review_trigger,
            ):
                if value not in (self.rendered_markdown or ""):
                    raise ValueError(
                        "rendered Decision must preserve its selected option, accepted tradeoff, and review trigger."
                    )
        if (
            self.disposition == "promoted"
            and self.kind == "sop"
            and "template_id: kamdar-employee-sop" not in (self.rendered_markdown or "")
        ):
            raise ValueError(
                "a promoted workflow must use the employee SOP template, not the software skill registry."
            )
        return self


class NextWeekProjectReplacement(_StrictModel):
    project_id: StableId
    source_report_id: StableId
    section: Literal["This week's attention"]
    expected_current_text: NonEmptyString
    replacement_text: Annotated[
        NonEmptyString,
        Field(
            description=(
                "Complete next-week open-work checklist merged from accepted priorities and open-Work rows "
                "evidenced in the source Project report; integrations apply it unchanged after the conflict guard."
            )
        ),
    ]
    source_ids: SourceIds


class ConfigurationGap(_StrictModel):
    code: NonEmptyString
    scope_id: StableId
    detail: NonEmptyString
    blocks_company_finalization: StrictBool


WEEKLY_REVIEW_RESULT_PROMPT = r"""
Return one Weekly review result from finalized Project Draft evidence.

- Return feature_outcomes exactly once for FEAT-0005 through FEAT-0007. Choose
  produced, no_change_needed, or insufficient_information from the cited
  evidence, and point produced outcomes to their output rows.
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
  checklist replacements merged from accepted priorities and open-Work rows
  evidenced in the source Project reports. Preserve open Work by stable ID,
  omit completed or cancelled Work from the new open view without deleting its
  source/history, do not rescan raw Work, and never create parallel plan files.
- configuration_gaps remains explicit. A missing expected Area report prevents
  the Company report from becoming Final.

Golden disposition examples:
- A repeated, authorized Penang evidence-handoff problem is promoted to an Issue.
- A choice matching an existing Decision is duplicate and creates no record.
- A one-off problem is monitor; missing authority is blocked.
"""


class WeeklyReviewResult(_StrictModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={"description": WEEKLY_REVIEW_RESULT_PROMPT})

    schema_version: Literal["kamdar-weekly-review-result@1.1.0"]
    context_id: StableId
    week: Week
    feature_outcomes: Annotated[list[FeatureOutcome], Field(min_length=3, max_length=3)]
    report_results: Annotated[list[ReportResult], Field(min_length=1)]
    promotion_dispositions: list[PromotionDisposition]
    next_week_project_replacements: list[NextWeekProjectReplacement]
    configuration_gaps: list[ConfigurationGap]
    run_notes: str

    @model_validator(mode="after")
    def validate_result(self) -> "WeeklyReviewResult":
        blocks_company = any(gap.blocks_company_finalization for gap in self.configuration_gaps)
        if blocks_company and any(
            report.report_level == "Company" and report.report_status == "Final"
            for report in self.report_results
        ):
            raise ValueError("a blocking Area gap forbids a Final Company report.")

        report_outcome = next(
            (outcome for outcome in self.feature_outcomes if outcome.feature_id == "FEAT-0005"),
            None,
        )
        blocking_gap_codes = [
            gap.code for gap in self.configuration_gaps if gap.blocks_company_finalization
        ]
        if blocking_gap_codes:
            if report_outcome is None or report_outcome.outcome != "insufficient_information":
                raise ValueError(
                    "a blocking Company configuration gap requires FEAT-0005 to report insufficient_information."
                )
            reported_codes = {gap.code for gap in report_outcome.information_gaps}
            for gap_code in blocking_gap_codes:
                if gap_code not in reported_codes:
                    raise ValueError(f"FEAT-0005 must report blocking configuration gap {gap_code}.")

        validate_feature_outcome_coverage(
            outcomes=self.feature_outcomes,
            expected_feature_ids=["FEAT-0005", "FEAT-0006", "FEAT-0007"],
            output_roots={
                "FEAT-0005": "report_results",
                "FEAT-0006": "promotion_dispositions",
                "FEAT-0007": "next_week_project_replacements",
            },
            output_counts={
                "FEAT-0005": len(self.report_results),
                "FEAT-0006": len(self.promotion_dispositions),
                "FEAT-0007": len(self.next_week_project_replacements),
            },
        )
        return self


__all__ = [
    "CompanyExecutiveContext",
    "ConfigurationGap",
    "DecisionOption",
    "NextWeekProjectReplacement",
    "PromotedDecisionPreservationProof",
    "PromotedProblemBaselineProof",
    "PromotionDisposition",
    "ReportResult",
    "WEEKLY_REVIEW_RESULT_PROMPT",
    "WeeklyReviewResult",
]

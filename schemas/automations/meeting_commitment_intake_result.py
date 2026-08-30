"""Pydantic contract for Meeting commitment intake extraction output."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from .feature_outcome import FeatureOutcome, validate_feature_outcome_coverage


TrimmedNonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
StableId = TrimmedNonEmptyString
_ISO_DATE_PATTERN = (
    r"^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|"
    r"\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|"
    r"(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))$"
)
IsoDate = Annotated[
    str,
    StringConstraints(pattern=_ISO_DATE_PATTERN),
    Field(json_schema_extra={"format": "date"}),
]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MeetingTaskCreation(_StrictModel):
    commitment_key: Annotated[
        StableId,
        Field(description="Stable key copied from the explicit Meeting commitment."),
    ]
    source_text: TrimmedNonEmptyString
    work_item_id: StableId
    project_id: StableId
    department: TrimmedNonEmptyString
    owner_person_id: StableId
    name: TrimmedNonEmptyString
    type: Literal["Task"]
    status: Literal["Not started"]
    ai_review: Literal["Pending"]
    priority: Literal["P0", "P1", "P2", "P3"]
    start_date: IsoDate
    due_date: IsoDate
    progress: TrimmedNonEmptyString
    last_meaningful_update: IsoDate
    notes_markdown: TrimmedNonEmptyString
    source_meeting_id: StableId
    source_ids: Annotated[list[StableId], Field(min_length=1)]
    idempotency_key: StableId

    @model_validator(mode="after")
    def validate_source_trace(self) -> "MeetingTaskCreation":
        if self.source_meeting_id not in self.source_ids:
            raise ValueError("source_ids must include source_meeting_id.")
        if self.source_meeting_id not in self.notes_markdown:
            raise ValueError("Task Notes must preserve the source Meeting ID.")
        return self


class BlockedMeetingCommitment(_StrictModel):
    commitment_key: StableId
    source_text: TrimmedNonEmptyString
    missing_fields: Annotated[
        list[Literal["action", "project", "owner", "due_date"]],
        Field(min_length=1),
    ]
    reason: TrimmedNonEmptyString


MEETING_COMMITMENT_INTAKE_RESULT_PROMPT = r"""
Return one Meeting commitment intake result from the supplied Meeting evidence.

- Return one feature_outcomes entry for FEAT-0010. Choose produced,
  no_change_needed, or insufficient_information from the cited evidence, and
  point a produced outcome to every created Task row.
- A complete explicit commitment becomes a task_creation. An explicit
  commitment with missing required fields becomes a blocked_commitment.
- Never claim that a provider write occurred.
"""


class MeetingCommitmentIntakeResult(_StrictModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"description": MEETING_COMMITMENT_INTAKE_RESULT_PROMPT},
    )

    schema_version: Literal["kamdar-meeting-commitment-intake-result@1.1.0"]
    meeting_id: StableId
    feature_outcomes: Annotated[list[FeatureOutcome], Field(min_length=1, max_length=1)]
    task_creations: list[MeetingTaskCreation]
    blocked_commitments: list[BlockedMeetingCommitment]
    run_notes: str

    @model_validator(mode="after")
    def validate_result(self) -> "MeetingCommitmentIntakeResult":
        intake_outcome = next(
            (outcome for outcome in self.feature_outcomes if outcome.feature_id == "FEAT-0010"),
            None,
        )
        missing_field_codes = {
            f"missing-{field.replace('_', '-')}"
            for commitment in self.blocked_commitments
            for field in commitment.missing_fields
        }
        if missing_field_codes:
            if intake_outcome is None or intake_outcome.outcome != "insufficient_information":
                raise ValueError("blocked commitments require FEAT-0010 to report insufficient_information.")
            reported_codes = {gap.code for gap in intake_outcome.information_gaps}
            for gap_code in missing_field_codes:
                if gap_code not in reported_codes:
                    raise ValueError(f"FEAT-0010 must report blocked commitment gap {gap_code}.")

        validate_feature_outcome_coverage(
            outcomes=self.feature_outcomes,
            expected_feature_ids=["FEAT-0010"],
            output_roots={"FEAT-0010": "task_creations"},
            output_counts={"FEAT-0010": len(self.task_creations)},
        )
        return self


__all__ = [
    "BlockedMeetingCommitment",
    "MEETING_COMMITMENT_INTAKE_RESULT_PROMPT",
    "MeetingCommitmentIntakeResult",
    "MeetingTaskCreation",
]

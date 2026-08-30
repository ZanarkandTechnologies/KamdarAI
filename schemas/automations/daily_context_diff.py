"""Pydantic contract for the deterministic Daily context artifact."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    StringConstraints,
    model_validator,
)


_OFFSET_DATETIME_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _offset_datetime(value: str) -> str:
    if not _OFFSET_DATETIME_PATTERN.fullmatch(value):
        raise ValueError("must be an ISO 8601 datetime with a UTC offset")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("must be an ISO 8601 datetime") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("datetime must include a UTC offset")
    return value


def _date(value: str) -> str:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("must be an ISO 8601 date") from exc
    if parsed.isoformat() != value:
        raise ValueError("must be an ISO 8601 calendar date")
    return value


NonEmptyString = Annotated[
    StrictStr, StringConstraints(strip_whitespace=True, min_length=1)
]
StableId = NonEmptyString
OptionalText = NonEmptyString | None
OffsetDatetime = Annotated[
    StrictStr,
    AfterValidator(_offset_datetime),
    Field(json_schema_extra={"format": "date-time"}),
]
DateString = Annotated[
    StrictStr,
    AfterValidator(_date),
    Field(json_schema_extra={"format": "date"}),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class CurrentProjectSections(StrictModel):
    overview: NonEmptyString
    project_knowledge: NonEmptyString
    this_weeks_attention: NonEmptyString


class SourceManifestRow(StrictModel):
    source_key: NonEmptyString
    status: Literal["fetched", "unavailable", "skipped"]
    source_url: NonEmptyString
    collection_scope: NonEmptyString
    collected_at: OffsetDatetime
    record_count: Annotated[StrictInt, Field(ge=0)]
    source_ids: list[StableId]
    gap: OptionalText

    @model_validator(mode="after")
    def validate_manifest_row(self) -> "SourceManifestRow":
        if len(set(self.source_ids)) != len(self.source_ids):
            raise ValueError("IDs must be unique.")
        if self.record_count != len(self.source_ids):
            raise ValueError("record_count must equal source_ids.length.")
        if (self.status == "fetched") != (self.gap is None):
            raise ValueError(
                "Fetched sources require no gap; unavailable or skipped sources require one."
            )
        return self


class WeeklyAttentionReset(StrictModel):
    requested: StrictBool
    week: Annotated[StrictStr, StringConstraints(pattern=r"^\d{4}-W\d{2}$")] | None
    reason: OptionalText
    source_id: StableId

    @model_validator(mode="after")
    def validate_reset(self) -> "WeeklyAttentionReset":
        if self.requested and (not self.week or not self.reason):
            raise ValueError("A requested weekly reset requires week and reason.")
        if not self.requested and (self.week is not None or self.reason is not None):
            raise ValueError(
                "An unrequested weekly reset must not carry week or reason."
            )
        return self


class ProjectRow(StrictModel):
    id: StableId
    source_id: StableId
    source_url: NonEmptyString
    name: NonEmptyString
    owner_person_id: StableId | None
    current_sections: CurrentProjectSections
    weekly_attention_reset: WeeklyAttentionReset


class Cause(StrictModel):
    value: OptionalText
    confidence: Literal["high", "medium", "low", "unknown"]


class PlanActual(StrictModel):
    currency: Annotated[StrictStr, StringConstraints(pattern=r"^[A-Z]{3}$")] | None
    estimated_amount: Annotated[StrictFloat, Field(ge=0)] | None
    actual_amount: Annotated[StrictFloat, Field(ge=0)] | None


MappedFieldValue = StrictStr | StrictInt | StrictFloat | StrictBool | None


class Documentation(StrictModel):
    known_context: NonEmptyString
    next_action: OptionalText
    missing_information: list[NonEmptyString]
    mapped_field_state: dict[str, MappedFieldValue]
    update_location: Annotated[list[NonEmptyString], Field(min_length=1)]


class WorkRow(StrictModel):
    id: StableId
    source_id: StableId
    source_url: NonEmptyString
    project_id: StableId | None
    record_type: Literal["Task", "Feature", "Issue", "Meeting"]
    full_page_read: Literal[True]
    owner_person_id: StableId | None
    status: NonEmptyString
    ai_review: Literal["Pending", "Needs information", "Processed", "Blocked"]
    daily_review_version: OptionalText
    selection_reason: Literal["linked_open_or_changed", "done_unprocessed"]
    due_date: DateString | None
    last_meaningful_update: DateString | None
    blocker: OptionalText
    cause: Cause
    plan_actual: PlanActual
    documentation: Documentation
    evidence: Annotated[list[NonEmptyString], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_review_state(self) -> "WorkRow":
        if self.selection_reason == "done_unprocessed":
            if self.status.lower() != "done":
                raise ValueError("done_unprocessed Work must have Status=Done.")
            if self.ai_review == "Processed":
                raise ValueError(
                    "Done Work with AI review=Processed is not eligible for documentation review."
                )
        if self.ai_review == "Processed" and not self.daily_review_version:
            raise ValueError("Processed AI review requires a Daily review version.")
        if self.ai_review != "Processed" and self.daily_review_version:
            raise ValueError(
                "Only Processed AI review may carry a Daily review version."
            )
        return self


class DecisionObservation(StrictModel):
    choice: NonEmptyString
    authority: NonEmptyString
    evidence: Annotated[list[NonEmptyString], Field(min_length=1)]


class WorkflowObservation(StrictModel):
    workflow_name: NonEmptyString
    trigger: NonEmptyString
    actors_and_handoff: NonEmptyString
    ordered_steps: Annotated[list[NonEmptyString], Field(min_length=2)]
    systems: Annotated[list[NonEmptyString], Field(min_length=1)]
    frequency_and_volume: NonEmptyString
    active_and_wait_time: NonEmptyString
    exceptions: list[NonEmptyString]
    output: NonEmptyString
    confidence: Literal["high", "medium", "low"]
    measurement_gaps: list[NonEmptyString]


class MeetingRow(StrictModel):
    id: StableId
    source_id: StableId
    source_url: NonEmptyString
    project_id: StableId | None
    statements: Annotated[list[NonEmptyString], Field(min_length=1)]
    decision_observation: DecisionObservation | None
    workflow_observation: WorkflowObservation | None
    review_condition: OptionalText


class PersonRow(StrictModel):
    id: StableId
    source_id: StableId
    name: NonEmptyString
    preferred_contact_channel: OptionalText
    approved_contact_channels: list[NonEmptyString]
    approved_contact_endpoint_ref: OptionalText
    contact_instructions: OptionalText


class EvidenceWindow(StrictModel):
    start: OffsetDatetime
    end: OffsetDatetime


class ProviderEffects(StrictModel):
    performed: Literal[False]


class Collector(StrictModel):
    run_id: StableId
    provider_effects: ProviderEffects


class DailyContextDiff(StrictModel):
    artifact_type: Literal["kamdar-daily-context-diff"]
    artifact_version: Literal["0.3.0"]
    context_id: StableId
    local_day: DateString
    evidence_window: EvidenceWindow
    collector: Collector
    source_manifest: Annotated[list[SourceManifestRow], Field(min_length=1)]
    projects: Annotated[list[ProjectRow], Field(min_length=1)]
    work_items: Annotated[list[WorkRow], Field(min_length=1)]
    meetings: list[MeetingRow]
    people: Annotated[list[PersonRow], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_context_integrity(self) -> "DailyContextDiff":
        start = datetime.fromisoformat(self.evidence_window.start.replace("Z", "+00:00"))
        end = datetime.fromisoformat(self.evidence_window.end.replace("Z", "+00:00"))
        if start > end:
            raise ValueError("start must not be after end.")

        for key in ("projects", "work_items", "meetings", "people"):
            rows = getattr(self, key)
            ids = [row.id for row in rows]
            if len(set(ids)) != len(ids):
                raise ValueError(f"{key} IDs must be unique.")

        project_ids = {row.id for row in self.projects}
        person_ids = {row.id for row in self.people}
        manifested_ids = {
            source_id for row in self.source_manifest for source_id in row.source_ids
        }
        records: list[Any] = [
            *self.projects,
            *self.work_items,
            *self.meetings,
            *self.people,
        ]
        for row in records:
            if row.source_id not in manifested_ids:
                raise ValueError(
                    f"{row.id} source_id is absent from source_manifest."
                )
        for project in self.projects:
            if project.owner_person_id and project.owner_person_id not in person_ids:
                raise ValueError(f"{project.id} owner is absent from people.")
            if project.weekly_attention_reset.source_id != project.source_id:
                raise ValueError(
                    f"{project.id} weekly reset source must match the Project source."
                )
        for row in [*self.work_items, *self.meetings]:
            if row.project_id and row.project_id not in project_ids:
                raise ValueError(f"{row.id} project is absent from projects.")
            owner_person_id = getattr(row, "owner_person_id", None)
            if owner_person_id and owner_person_id not in person_ids:
                raise ValueError(f"{row.id} owner is absent from people.")
        return self


DailyContextDiffJsonSchema = DailyContextDiff.model_json_schema()

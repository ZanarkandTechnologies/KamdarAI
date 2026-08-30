"""Pydantic contract for the immutable Weekly review context."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)


TrimmedNonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
StableId = TrimmedNonEmptyString
PositiveInteger = Annotated[int, Field(strict=True, gt=0)]
Week = Annotated[str, StringConstraints(pattern=r"^\d{4}-W\d{2}$")]
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


def _require_boolean(value: object) -> object:
    if not isinstance(value, bool):
        raise ValueError("Input should be a valid boolean")
    return value


StrictFalse = Annotated[Literal[False], BeforeValidator(_require_boolean)]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _require_unique(values: list[str], label: str) -> None:
    if len(set(values)) != len(values):
        raise ValueError(f"{label} must be unique.")


class CurrentProjectSections(_StrictModel):
    overview: TrimmedNonEmptyString
    project_knowledge: TrimmedNonEmptyString
    this_weeks_attention: TrimmedNonEmptyString


class Project(_StrictModel):
    id: StableId
    name: TrimmedNonEmptyString
    area: TrimmedNonEmptyString
    current_sections: CurrentProjectSections


class ReportContent(_StrictModel):
    summary: TrimmedNonEmptyString
    outcomes_and_open_attention: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    problems_and_inefficiencies: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    decisions: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    sops: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    next_week_priorities: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    automation_receipt: TrimmedNonEmptyString


class Report(_StrictModel):
    id: StableId
    report_level: Literal["Project"]
    project_id: StableId
    area: TrimmedNonEmptyString
    status: Literal["Draft", "Final"]
    version: PositiveInteger
    finalized_at: OffsetDateTime | None
    previous_report_id: StableId | None
    source_ids: Annotated[list[StableId], Field(min_length=1)]
    report_markdown: TrimmedNonEmptyString
    content: ReportContent

    @model_validator(mode="after")
    def validate_report(self) -> "Report":
        _require_unique(self.source_ids, "IDs")
        if (self.status == "Final") != (self.finalized_at is not None):
            raise ValueError("finalized_at must be present only for Final reports.")

        rendered_facts = [
            self.content.summary,
            *self.content.outcomes_and_open_attention,
            *self.content.problems_and_inefficiencies,
            *self.content.decisions,
            *self.content.sops,
            *self.content.next_week_priorities,
            self.content.automation_receipt,
        ]
        if any(fact not in self.report_markdown for fact in rendered_facts):
            raise ValueError("Every structured report fact must appear verbatim in report_markdown.")
        return self


class DraftCandidateRef(_StrictModel):
    source_report_id: StableId
    source_ids: Annotated[list[StableId], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_unique_source_ids(self) -> "DraftCandidateRef":
        _require_unique(self.source_ids, "IDs")
        return self


class SourceGap(_StrictModel):
    code: TrimmedNonEmptyString
    scope_id: StableId
    detail: TrimmedNonEmptyString


class RuntimeInputPolicy(_StrictModel):
    work_items_loaded: StrictFalse
    meetings_loaded: StrictFalse
    source: Literal["Project Draft reports only"]


class WeeklyContext(_StrictModel):
    schema_version: Literal["kamdar-weekly-context@2.0.0"]
    artifact_type: Literal["kamdar-weekly-context"]
    context_id: StableId
    week: Week
    collected_at: OffsetDateTime
    runtime_input_policy: RuntimeInputPolicy
    projects: Annotated[list[Project], Field(min_length=1)]
    reports: Annotated[list[Report], Field(min_length=1)]
    draft_candidate_refs: list[DraftCandidateRef]
    expected_areas: Annotated[list[TrimmedNonEmptyString], Field(min_length=1)]
    source_gaps: list[SourceGap]

    @model_validator(mode="after")
    def validate_context(self) -> "WeeklyContext":
        _require_unique([row.id for row in self.projects], "projects IDs")
        _require_unique([row.id for row in self.reports], "reports IDs")
        _require_unique(self.expected_areas, "expected_areas")

        projects = {row.id: row for row in self.projects}
        reports = {row.id: row for row in self.reports}
        for report in self.reports:
            project = projects.get(report.project_id)
            if project is None:
                raise ValueError(f"{report.id} project is absent from projects.")
            if project.area != report.area:
                raise ValueError(f"{report.id} area does not match its Project.")
            if report.previous_report_id and report.previous_report_id not in reports:
                raise ValueError(f"{report.id} previous report is absent from reports.")
            if report.area not in self.expected_areas:
                raise ValueError(f"{report.id} area is absent from expected_areas.")

        for candidate in self.draft_candidate_refs:
            source = reports.get(candidate.source_report_id)
            if source is None or source.status != "Draft":
                raise ValueError(f"{candidate.source_report_id} is not an immutable Project Draft.")
            for source_id in candidate.source_ids:
                if source_id not in source.source_ids:
                    raise ValueError(f"{source_id} is not cited by {source.id}.")
        return self


__all__ = [
    "CurrentProjectSections",
    "DraftCandidateRef",
    "Project",
    "Report",
    "ReportContent",
    "RuntimeInputPolicy",
    "SourceGap",
    "WeeklyContext",
]

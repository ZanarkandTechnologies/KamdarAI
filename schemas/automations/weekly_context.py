"""Pydantic contract for one immutable all-Project Weekly context."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, model_validator


Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Id = Text
Sha256 = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
NoteKey = Annotated[str, StringConstraints(pattern=r"^(?:[a-f0-9]{64}|legacy:[a-f0-9]{64})$")]
Week = Annotated[str, StringConstraints(pattern=r"^\d{4}-W\d{2}$")]


def offset_datetime(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("datetime requires a UTC offset")
    return value


OffsetDatetime = Annotated[
    str,
    StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"),
    AfterValidator(offset_datetime),
    Field(json_schema_extra={"format": "date-time"}),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Project(StrictModel):
    id: Id
    name: Text
    area: Text


class ProjectNote(StrictModel):
    note_key: NoteKey
    observation_kind: Literal[
        "work_snapshot", "completed_outcome", "documentation_question",
        "problem", "inefficiency", "decision", "workflow_sample", "carry_forward",
    ]
    observed_at: OffsetDatetime
    source_updated_at: OffsetDatetime
    source_revision: Text
    project_id: Id
    section: Literal[
        "Work and employee updates", "Completed outcomes and artifacts",
        "Documentation questions", "Problems and inefficiencies", "Decisions",
        "Workflow and SOP signals", "Carry-forward items",
    ]
    source_ids: Annotated[list[Id], Field(min_length=1)]
    work_id: Id | None
    employee_ids: list[Id]
    workflow_key: Id | None
    structured_payload: dict[str, object]
    markdown: Text

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "ProjectNote":
        if len(set(self.employee_ids)) != len(self.employee_ids):
            raise ValueError("employee_ids must be unique")
        return self


class FrozenProjectNotes(StrictModel):
    project_id: Id
    path: Text
    sha256: Sha256
    note_version: Annotated[int, Field(ge=0)]
    source_note_keys: list[Id]
    notes: list[ProjectNote]

    @model_validator(mode="after")
    def validate_notes(self) -> "FrozenProjectNotes":
        if any(note.project_id != self.project_id for note in self.notes):
            raise ValueError("Project Notes contains another Project's note")
        if self.source_note_keys != [note.note_key for note in self.notes]:
            raise ValueError("source_note_keys must match note order")
        return self


class FreezeFile(StrictModel):
    project_id: Id
    path: Text
    sha256: Sha256
    note_keys: list[Id]


class FreezeManifest(StrictModel):
    artifact_type: Literal["kamdar-project-notes-freeze"]
    artifact_version: Literal["1.0.0"]
    path: Text
    sha256: Sha256
    frozen_at: OffsetDatetime
    files: Annotated[list[FreezeFile], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_file_keys(self) -> "FreezeManifest":
        for row in self.files:
            if len(set(row.note_keys)) != len(row.note_keys):
                raise ValueError("freeze note_keys must be unique")
        return self


class PriorReport(StrictModel):
    id: Id
    report_level: Literal["Project", "Area", "Company"]
    project_id: Id | None
    area: Text | None
    status: Literal["Final"]
    version: Annotated[int, Field(gt=0)]
    finalized_at: OffsetDatetime
    report_markdown: Text


class PersonIndex(StrictModel):
    person_id: Id
    record_version: Annotated[int, Field(ge=0)]


class SopIndex(StrictModel):
    workflow_key: Id
    sop_id: Id
    record_version: Annotated[int, Field(ge=0)]
    baseline_version: Annotated[int, Field(ge=0)]


class ReferencedPerson(StrictModel):
    person_id: Id
    record_version: Annotated[int, Field(ge=0)]
    persistent_text_sha256: Sha256
    markdown: Text


class ReferencedSop(StrictModel):
    workflow_key: Id
    sop_id: Id
    record_version: Annotated[int, Field(ge=0)]
    baseline_version: Annotated[int, Field(ge=0)]
    markdown: Text


class SourceGap(StrictModel):
    code: Text
    scope_id: Id
    detail: Text


class RuntimeInputPolicy(StrictModel):
    work_items_loaded: Literal[False]
    meetings_loaded: Literal[False]
    source: Literal["Frozen Project Notes plus targeted persistent entity records"]


class WeeklyContext(StrictModel):
    schema_version: Literal["kamdar-weekly-context@3.0.0"]
    artifact_type: Literal["kamdar-weekly-context"]
    context_id: Id
    week: Week
    collected_at: OffsetDatetime
    runtime_input_policy: RuntimeInputPolicy
    projects: Annotated[list[Project], Field(min_length=1)]
    freeze_manifest: FreezeManifest
    project_notes: Annotated[list[FrozenProjectNotes], Field(min_length=1)]
    prior_reports: list[PriorReport]
    people_index: list[PersonIndex]
    sop_index: list[SopIndex]
    referenced_people: list[ReferencedPerson]
    referenced_sops: list[ReferencedSop]
    expected_areas: Annotated[list[Text], Field(min_length=1)]
    source_gaps: list[SourceGap]

    @model_validator(mode="after")
    def validate_graph(self) -> "WeeklyContext":
        def unique(values: list[str], label: str) -> None:
            if len(set(values)) != len(values):
                raise ValueError(f"{label} keys must be unique")

        unique([row.id for row in self.projects], "projects")
        unique([row.project_id for row in self.project_notes], "project_notes")
        unique([row.person_id for row in self.people_index], "people_index")
        unique([row.workflow_key for row in self.sop_index], "sop_index")
        unique([row.person_id for row in self.referenced_people], "referenced_people")
        unique([row.workflow_key for row in self.referenced_sops], "referenced_sops")
        unique([row.id for row in self.prior_reports], "prior_reports")
        unique(self.expected_areas, "expected_areas")
        expected = sorted(row.id for row in self.projects)
        if expected != sorted(row.project_id for row in self.project_notes) or expected != sorted(row.project_id for row in self.freeze_manifest.files):
            raise ValueError("every active Project requires exactly one frozen Project Notes file")
        note_index = {row.project_id: row for row in self.project_notes}
        for file in self.freeze_manifest.files:
            notes = note_index[file.project_id]
            if (notes.path, notes.sha256, notes.source_note_keys) != (file.path, file.sha256, file.note_keys):
                raise ValueError(f"{file.project_id} does not match freeze manifest")
        project_ids = {row.id for row in self.projects}
        for report in self.prior_reports:
            valid_level = (
                report.report_level == "Project" and bool(report.project_id) and bool(report.area) and report.project_id in project_ids
            ) or (
                report.report_level == "Area" and report.project_id is None and bool(report.area)
            ) or (
                report.report_level == "Company" and report.project_id is None and report.area is None
            )
            if not valid_level:
                raise ValueError(f"{report.id} has invalid level ownership or an unknown Project")
        people = sorted({person for row in self.project_notes for note in row.notes for person in note.employee_ids})
        if people != sorted(row.person_id for row in self.referenced_people):
            raise ValueError("referenced_people must equal Project Notes references")
        if any(person not in {row.person_id for row in self.people_index} for person in people):
            raise ValueError("referenced Person absent from people_index")
        workflows = {note.workflow_key for row in self.project_notes for note in row.notes if note.workflow_key}
        known = {row.workflow_key for row in self.sop_index}
        if sorted(workflows & known) != sorted(row.workflow_key for row in self.referenced_sops):
            raise ValueError("referenced_sops must equal existing Project Notes workflow references")
        return self


WEEKLY_CONTEXT_JSON_SCHEMA = WeeklyContext.model_json_schema(mode="validation")

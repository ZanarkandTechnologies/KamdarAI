"""Pydantic contracts and loaders for the tracked Kamdar evaluation seed."""

from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, model_validator


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SEED_ROOT = PROJECT_ROOT / "seed"
SEED_MANIFEST = SEED_ROOT / "manifest.json"
TEMPLATE_ROOT = PROJECT_ROOT / "templates"
TABLE_KEYS = (
    "projects",
    "people",
    "work_items",
    "meetings",
    "reports",
    "pipeline_cases",
)
REQUIRED_FEATURE_IDS = {
    *(f"FEAT-{index:04d}" for index in range(1, 8)),
    "FEAT-0010",
}
TEMPLATE_FILES = {
    "project": "project.md",
    "person": "person.md",
    "task": "task.md",
    "meeting": "meeting.md",
    "project_report": "weekly-report.md",
}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class SeedEnvironment(StrictModel):
    reset_marker: str = Field(min_length=1)


class SeedEnvironments(StrictModel):
    frozen: SeedEnvironment
    notion_eval: SeedEnvironment


class SeedCapture(StrictModel):
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    manifest: str = Field(min_length=1)
    departments: list[str] = Field(min_length=7, max_length=7)
    source_gap_count: int = Field(gt=0)
    material_source_gaps: list[str]


class SeedClock(StrictModel):
    company: str = Field(min_length=1)
    timezone: str = Field(min_length=1)
    frozen_at: str = Field(min_length=1)
    local_day: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    week: str = Field(pattern=r"^\d{4}-W\d{2}$")
    week_start: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    week_end: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class SeedRecord(StrictModel):
    id: str = Field(pattern=r"^[A-Z][A-Z0-9_-]+$")
    source_url: str | None = None
    template: Literal["project", "person", "task", "meeting", "project_report"]
    properties: dict[str, Any]
    body: str = Field(min_length=1)
    metadata: dict[str, Any] | None = None

    @model_validator(mode="after")
    def validate_record(self) -> "SeedRecord":
        name = self.properties.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError("properties.name must be a non-empty string")
        if self.source_url:
            parsed = urlparse(self.source_url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("source_url must be an HTTP(S) URL")
        if re.search(r"^---\s*$|^#\s+", self.body, flags=re.MULTILINE):
            raise ValueError("body must not duplicate frontmatter or the page title")
        if re.search(r"\{\{[^}]+\}\}|<!--", self.body):
            raise ValueError("body contains an unresolved template placeholder or comment")
        for key in ("start_date", "due_date", "last_meaningful_update", "date", "week_start"):
            value = self.properties.get(key)
            if value not in (None, "") and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(value)):
                raise ValueError(f"properties.{key} must be an ISO local date")
        return self


class SeedEntities(StrictModel):
    projects: list[SeedRecord]
    people: list[SeedRecord]
    work_items: list[SeedRecord]
    meetings: list[SeedRecord]
    reports: list[SeedRecord]


class PipelineCase(StrictModel):
    feature_id: str = Field(pattern=r"^FEAT-\d{4}$")
    name: str = Field(min_length=1)
    entity_ids: list[str] = Field(min_length=1)
    shows: list[str] = Field(min_length=1)


class SeedSource(StrictModel):
    schema_version: Literal["kamdar-company-os-seed@4.0.0"]
    seed_id: str = Field(min_length=1)
    environments: SeedEnvironments
    capture: SeedCapture
    clock: SeedClock
    entities: SeedEntities
    pipeline_cases: list[PipelineCase]

    @model_validator(mode="after")
    def validate_relations(self) -> "SeedSource":
        groups = self.entities.model_dump()
        all_records = [record for rows in groups.values() for record in rows]
        ids = [record["id"] for record in all_records]
        if len(ids) != len(set(ids)):
            raise ValueError("entity IDs must be unique")
        if len(self.entities.projects) != 7:
            raise ValueError("the eval seed must contain exactly seven Projects")
        project_ids = {record.id for record in self.entities.projects}
        people_ids = {record.id for record in self.entities.people}
        for record in self.entities.projects:
            owner = record.properties.get("owner")
            if owner and owner not in people_ids:
                raise ValueError(f"{record.id}.owner references an unknown Person")
        for record in [*self.entities.work_items, *self.entities.meetings]:
            if record.properties.get("project") not in project_ids:
                raise ValueError(f"{record.id}.project references an unknown Project")
            if record.properties.get("owner") not in people_ids:
                raise ValueError(f"{record.id}.owner references an unknown Person")
        for record in self.entities.reports:
            if record.properties.get("project") not in project_ids:
                raise ValueError(f"{record.id}.project references an unknown Project")
        case_ids = [case.feature_id for case in self.pipeline_cases]
        if set(case_ids) != REQUIRED_FEATURE_IDS or len(case_ids) != len(REQUIRED_FEATURE_IDS):
            raise ValueError("pipeline_cases must cover FEAT-0001..0007 and FEAT-0010 exactly once")
        known_ids = set(ids)
        for case in self.pipeline_cases:
            unknown = set(case.entity_ids) - known_ids
            if unknown:
                raise ValueError(f"{case.feature_id} references unknown entities: {sorted(unknown)}")
        return self


class SeedManifest(StrictModel):
    schema_version: Literal["kamdar-company-os-seed@4.0.0"]
    seed_id: str = Field(min_length=1)
    environments: SeedEnvironments
    capture: SeedCapture
    clock: SeedClock
    tables: dict[str, str]

    @model_validator(mode="after")
    def validate_tables(self) -> "SeedManifest":
        if set(self.tables) != set(TABLE_KEYS):
            raise ValueError(f"tables must contain exactly {', '.join(TABLE_KEYS)}")
        return self


def _json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _safe_table_path(root: Path, declared: str) -> Path:
    target = (root / declared).resolve()
    if target == root or root not in target.parents:
        raise ValueError(f"seed table must remain inside {root}")
    return target


def _template_contract(template: str) -> dict[str, Any]:
    path = TEMPLATE_ROOT / TEMPLATE_FILES[template]
    content = path.read_text(encoding="utf-8")
    template_id = re.search(r"^template_id:\s*([^\n]+)$", content, re.MULTILINE)
    version = re.search(r"^template_version:\s*[\"']?([^\n\"']+)", content, re.MULTILINE)
    frontmatter = re.search(r"^---\r?\n([\s\S]*?)\r?\n---", content)
    if not template_id or not version or not frontmatter:
        raise ValueError(f"template metadata missing from {path.name}")
    properties = [
        match.group(1)
        for match in re.finditer(r"^([a-z][a-z0-9_]*):", frontmatter.group(1), re.MULTILINE)
        if match.group(1) not in {"template_id", "template_version"}
    ]
    headings = re.findall(r"^##\s+(.+?)\s*$", content, re.MULTILINE)
    return {"path": path.name, "id": template_id.group(1).strip(), "version": version.group(1).strip(), "properties": properties, "headings": headings}


def _validate_template_record(record: SeedRecord, contract: dict[str, Any]) -> None:
    actual = set(record.properties)
    expected = set(contract["properties"])
    if actual != expected:
        raise ValueError(
            f"{record.id} properties differ from {contract['path']}: "
            f"missing={sorted(expected - actual)}, unsupported={sorted(actual - expected)}"
        )
    headings = re.findall(r"^##\s+(.+?)\s*$", record.body, re.MULTILINE)
    if headings != contract["headings"]:
        raise ValueError(f"{record.id} headings must match {contract['path']} in order")
    for index, heading in enumerate(headings):
        start = record.body.index(f"## {heading}") + len(heading) + 3
        end = record.body.find(f"## {headings[index + 1]}", start) if index + 1 < len(headings) else len(record.body)
        if not record.body[start:end].strip():
            raise ValueError(f"{record.id} has an empty {heading} section")


def _assert_source_safe(value: Any, path: str = "seed") -> None:
    if isinstance(value, str):
        if re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", value, re.IGNORECASE):
            raise ValueError(f"{path} contains a contact endpoint")
        if re.fullmatch(r"[a-f0-9]{32}", value, re.IGNORECASE):
            raise ValueError(f"{path} contains a provider identifier")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _assert_source_safe(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            if re.search(r"(?:^|[_-])(?:token|secret|credential|password|chat_id)$", key, re.IGNORECASE):
                raise ValueError(f"{path}.{key} is not permitted in a tracked seed")
            _assert_source_safe(item, f"{path}.{key}")


def load_seed_bundle(path: Path = SEED_MANIFEST) -> tuple[SeedSource, str]:
    manifest_path = path.resolve()
    manifest = SeedManifest.model_validate(_json(manifest_path), strict=True)
    root = manifest_path.parent
    paths = {key: _safe_table_path(root, manifest.tables[key]) for key in TABLE_KEYS}
    raw = {
        "schema_version": manifest.schema_version,
        "seed_id": manifest.seed_id,
        "environments": manifest.environments.model_dump(),
        "capture": manifest.capture.model_dump(),
        "clock": manifest.clock.model_dump(),
        "entities": {key: _json(paths[key]) for key in TABLE_KEYS[:-1]},
        "pipeline_cases": _json(paths["pipeline_cases"]),
    }
    _assert_source_safe(raw)
    source = SeedSource.model_validate(raw, strict=True)
    contracts = {key: _template_contract(key) for key in TEMPLATE_FILES}
    for rows in source.entities:
        for record in getattr(source.entities, rows[0]):
            _validate_template_record(record, contracts[record.template])
    digest = hashlib.sha256()
    for name, file_path in (("manifest", manifest_path), *paths.items()):
        digest.update(name.encode())
        digest.update(b"\0")
        digest.update(file_path.read_bytes())
        digest.update(b"\0")
    return source, digest.hexdigest()


def validate_seed(source: dict[str, Any] | SeedSource) -> dict[str, Any]:
    checked = source if isinstance(source, SeedSource) else SeedSource.model_validate(source, strict=True)
    contracts = {key: _template_contract(key) for key in TEMPLATE_FILES}
    entities = checked.entities.model_dump()
    project_departments = {row["id"]: row["properties"]["department"] for row in entities["projects"]}
    for group in ("work_items", "meetings", "reports"):
        for record in entities[group]:
            record["properties"]["department"] = project_departments[record["properties"]["project"]]
    for group in entities.values():
        for raw_record in group:
            _validate_template_record(SeedRecord.model_validate(raw_record, strict=True), contracts[raw_record["template"]])
    capture, clock = checked.capture, checked.clock
    return {
        "schema_version": checked.schema_version,
        "seed_id": checked.seed_id,
        "environments": checked.environments.model_dump(),
        "capture": capture.model_dump(),
        "provenance": {"source_capture_sha256": capture.sha256, "private_seed_manifest": capture.manifest},
        "templates": {key: {name: contract[name] for name in ("path", "id", "version")} for key, contract in contracts.items()},
        "entities": {"departments": deepcopy(capture.departments), "source_gaps": deepcopy(capture.material_source_gaps), **entities},
        "pipeline_cases": [case.model_dump() for case in checked.pipeline_cases],
        "frozen_snapshot": {
            "company": {"name": clock.company, "timezone": clock.timezone},
            "frozen_at": clock.frozen_at,
            "local_day": clock.local_day,
            "week": clock.week,
            "week_start": clock.week_start,
            "week_end": clock.week_end,
            "source_capture_sha256": capture.sha256,
            "private_seed_manifest": capture.manifest,
        },
    }


def load_seed_config(path: Path = SEED_MANIFEST) -> dict[str, Any]:
    source, _digest = load_seed_bundle(path)
    return validate_seed(source)


def seed_bundle_sha256(path: Path = SEED_MANIFEST) -> str:
    _source, digest = load_seed_bundle(path)
    return digest

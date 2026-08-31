#!/usr/bin/env python3
"""Compile a private browser capture into a mode-0600 profile seed."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


EXPECTED = {"rows": 49, "projects": 39, "source_gaps": 10, "departments": 7}


class CaptureFields(BaseModel):
    model_config = ConfigDict(extra="allow")
    project_name: str = Field(default="", alias="Project Name")
    department: str = Field(default="", alias="Department")


class CaptureRow(BaseModel):
    model_config = ConfigDict(extra="allow")
    source_row_index: int | None = None
    fields: CaptureFields = Field(default_factory=CaptureFields)


class CaptureTable(BaseModel):
    model_config = ConfigDict(extra="allow")
    rows: list[CaptureRow]


class BrowserCapture(BaseModel):
    model_config = ConfigDict(extra="allow")
    schema_version: str | None = None
    table: CaptureTable


def _stable(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def compile_private_seed(capture: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    checked = BrowserCapture.model_validate(capture)
    named: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []
    departments: list[str] = []
    for fallback_index, row in enumerate(checked.table.rows):
        project_name = row.fields.project_name.strip()
        department = row.fields.department.strip()
        source_index = row.source_row_index if row.source_row_index is not None else fallback_index
        if department:
            departments.append(department)
        if project_name:
            named.append({"source_row_index": source_index, "project_name": project_name, "department": department or None})
        else:
            gaps.append({"source_row_index": source_index, "reason": "missing_project_name"})
    projects: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in named:
        if row["project_name"] in seen:
            continue
        seen.add(row["project_name"])
        projects.append({"project_key": f"CAPTURE-PROJECT-{len(projects) + 1:02d}", **row})
    observed_departments = list(dict.fromkeys(departments))
    raw = _stable(capture)
    aggregate = {
        "rendered_rows": len(checked.table.rows),
        "named_projects": len(projects),
        "source_gaps": len(gaps),
        "observed_departments": len(observed_departments),
    }
    manifest_base = {
        "schema_version": "kamdar-private-seed-manifest@1.0.0",
        "compiler": "seed/private_capture.py",
        "source_capture_sha256": _digest(raw),
        "input_schema_version": checked.schema_version,
        "aggregate": aggregate,
    }
    public_manifest = {**manifest_base, "manifest_sha256": _digest(_stable(manifest_base))}
    private_seed = {
        "schema_version": "kamdar-private-seed@1.0.0",
        "source_capture_sha256": public_manifest["source_capture_sha256"],
        "public_manifest_sha256": public_manifest["manifest_sha256"],
        "aggregate": aggregate,
        "projects": projects,
        "source_gaps": gaps,
        "departments": observed_departments,
    }
    return private_seed, public_manifest


def assert_expected_shape(private_seed: dict[str, Any], public_manifest: dict[str, Any]) -> None:
    actual = private_seed["aggregate"]
    mapping = {"rows": "rendered_rows", "projects": "named_projects", "source_gaps": "source_gaps", "departments": "observed_departments"}
    for label, key in mapping.items():
        if actual[key] != EXPECTED[label]:
            raise ValueError(f"Private capture has {label}={actual[key]}; expected {EXPECTED[label]}.")
    if private_seed["source_capture_sha256"] != public_manifest["source_capture_sha256"]:
        raise ValueError("Private seed and manifest source hashes diverged.")


def _write(path: Path, value: dict[str, Any], mode: int) -> Path:
    target = path.resolve()
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    target.write_text(_stable(value), encoding="utf-8")
    os.chmod(target, mode)
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args(argv)
    capture = json.loads(args.input.read_text(encoding="utf-8"))
    private_seed, public_manifest = compile_private_seed(capture)
    assert_expected_shape(private_seed, public_manifest)
    output = _write(args.output, private_seed, 0o600)
    if args.manifest:
        _write(args.manifest, public_manifest, 0o644)
    print(json.dumps({"output": str(output), "aggregate": public_manifest["aggregate"], "source_capture_sha256": public_manifest["source_capture_sha256"], "manifest_written": bool(args.manifest)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Overlay private Project names and Departments onto the reviewed seed."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from seed.schemas import SEED_MANIFEST, load_seed_config


class PrivateProject(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    project_key: str = Field(pattern=r"^CAPTURE-PROJECT-\d{2}$")
    source_row_index: int | None = None
    project_name: str = Field(min_length=1)
    department: str = Field(min_length=1)


class PrivateCaptureSeed(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    schema_version: str
    source_capture_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    public_manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    aggregate: dict[str, int]
    projects: list[PrivateProject]
    source_gaps: list[dict[str, Any]]
    departments: list[str]

    @model_validator(mode="after")
    def validate_shape(self) -> "PrivateCaptureSeed":
        if self.schema_version != "kamdar-private-seed@1.0.0":
            raise ValueError("expected kamdar-private-seed@1.0.0")
        ordered = sorted(self.projects, key=lambda item: int(item.project_key.rsplit("-", 1)[1]))
        if [item.project_key for item in ordered] != [f"CAPTURE-PROJECT-{index:02d}" for index in range(1, len(ordered) + 1)]:
            raise ValueError("Project keys must be unique and sequential")
        return self


def _stable(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def load_private_capture_seed(path: Path) -> dict[str, Any]:
    target = path.resolve()
    if not target.is_file():
        raise ValueError("private capture seed is missing")
    if target.stat().st_mode & 0o777 != 0o600:
        raise ValueError("private capture seed must remain mode 0600")
    return json.loads(target.read_text(encoding="utf-8"))


def compile_private_company_seed(config: dict[str, Any], private_capture_seed: dict[str, Any]) -> dict[str, Any]:
    capture = PrivateCaptureSeed.model_validate(private_capture_seed, strict=True)
    if capture.source_capture_sha256 != config["provenance"]["source_capture_sha256"]:
        raise ValueError("private capture hash does not match reviewed seed provenance")
    if capture.aggregate != {"rendered_rows": 49, "named_projects": 39, "source_gaps": 10, "observed_departments": 7}:
        raise ValueError("private capture aggregate does not match the approved 49/39/10/7 contract")
    output = deepcopy(config)
    output["provenance"].update({
        "kind": "private-capture-project-title-and-department-overlay",
        "policy": "Private local application seed. Captured Project titles and Departments remain outside source control, receipts, and public run output.",
    })
    output["entities"]["departments"] = capture.departments
    captures_by_name = {project.project_name: project for project in capture.projects}
    if len(captures_by_name) != len(capture.projects):
        raise ValueError("private capture Project names must be unique")
    project_departments: dict[str, str] = {}
    for project in output["entities"]["projects"]:
        private = captures_by_name.get(project["properties"]["name"])
        if private is None:
            raise ValueError(f"focused Project {project['properties']['name']} is absent from the private capture")
        project["properties"]["name"] = private.project_name
        project["properties"]["department"] = private.department
        project["metadata"] = {**(project.get("metadata") or {}), "capture_project_key": private.project_key}
        project_departments[project["id"]] = private.department
    for group in ("work_items", "meetings", "reports"):
        for record in output["entities"][group]:
            record["properties"]["department"] = project_departments[record["properties"]["project"]]
    return output


def write_private_company_seed(path: Path, config: dict[str, Any]) -> Path:
    target = path.resolve()
    if target == PROJECT_ROOT or PROJECT_ROOT in target.parents:
        raise ValueError("refusing to write capture-derived data inside the source repository")
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    target.write_text(_stable(config), encoding="utf-8")
    os.chmod(target, 0o600)
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture-seed", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=SEED_MANIFEST)
    args = parser.parse_args(argv)
    config = load_seed_config(args.config)
    private = load_private_capture_seed(args.capture_seed)
    compiled = compile_private_company_seed(config, private)
    output = write_private_company_seed(args.output, compiled)
    print(json.dumps({"output": str(output), "mode": "0600", "projects": len(compiled["entities"]["projects"]), "departments": len(compiled["entities"]["departments"]), "source_capture_sha256": compiled["provenance"]["source_capture_sha256"], "config_sha256": hashlib.sha256(_stable(compiled).encode()).hexdigest()}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

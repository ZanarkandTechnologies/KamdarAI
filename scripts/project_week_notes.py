#!/usr/bin/env python3
"""Append-only Project Notes, immutable weekly freezes, and carry-forward."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "templates" / "project-week-notes.md"
ARTIFACT_TYPE = "kamdar-project-week-notes"
SECTIONS = (
    "Work and employee updates",
    "Completed outcomes and artifacts",
    "Documentation questions",
    "Problems and inefficiencies",
    "Decisions",
    "Workflow and SOP signals",
    "Carry-forward items",
)
OBSERVATION_SECTION = {
    "work_snapshot": SECTIONS[0],
    "completed_outcome": SECTIONS[1],
    "documentation_question": SECTIONS[2],
    "problem": SECTIONS[3],
    "inefficiency": SECTIONS[3],
    "decision": SECTIONS[4],
    "workflow_sample": SECTIONS[5],
    "carry_forward": SECTIONS[6],
}
FREEZE_FILE = ".project-notes-freeze.json"
CONSOLIDATION_FILE = ".project-notes-consolidation.json"
LOCK_FILE = ".project-notes.lock"
MIGRATION_BLOCKED_FILE = ".project-notes-migration-blocked.json"
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]*$")
WEEK = re.compile(r"^\d{4}-W\d{2}$")
NOTE_BLOCK = re.compile(
    r"<!-- kamdar-project-note: ([a-f0-9]{64}|legacy:[a-f0-9]{64})\n([^\n]+)\n-->\n([\s\S]*?)\n<!-- /kamdar-project-note: \1 -->"
)


class ProjectNotesError(ValueError):
    """Raised when Project Notes state or input violates the file contract."""


def _fail(message: str) -> None:
    raise ProjectNotesError(f"Project Notes: {message}")


def _normalize(value: Any) -> str:
    return str(value if value is not None else "").replace("\r\n", "\n").strip()


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256(value: str | bytes) -> str:
    payload = value if isinstance(value, bytes) else value.encode()
    return hashlib.sha256(payload).hexdigest()


def _iso(value: str, label: str) -> str:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        _fail(f"{label} must be an ISO timestamp.")
    if parsed.tzinfo is None:
        _fail(f"{label} must include a UTC offset.")
    return parsed.isoformat().replace("+00:00", "Z")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _assert_week(value: str) -> None:
    if not WEEK.fullmatch(str(value or "")):
        _fail("week must be YYYY-Www.")


def _assert_id(value: str | None, label: str) -> None:
    if not SAFE_ID.fullmatch(str(value or "")):
        _fail(f"{label} is missing or unsafe.")


def _unique_strings(values: Any, label: str, minimum: int = 0) -> list[str]:
    if not isinstance(values, list) or len(values) < minimum:
        _fail(f"{label} must contain unique non-empty strings.")
    normalized = [str(value).strip() for value in values]
    if any(not value for value in normalized) or len(set(normalized)) != len(normalized):
        _fail(f"{label} must contain unique non-empty strings.")
    return normalized


def _atomic_write(path: Path, content: str, mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(content if content.endswith("\n") else f"{content}\n")
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _week_root(notes_path: Path) -> Path:
    return notes_path.resolve().parent.parent


@contextmanager
def _week_lock(week_root: Path) -> Iterator[None]:
    week_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = week_root / LOCK_FILE
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        _fail(f"week is locked: {lock}")
    try:
        yield
    finally:
        os.close(descriptor)
        lock.unlink(missing_ok=True)


def render_project_week_notes(*, week: str, project_id: str, project_name: str) -> str:
    _assert_week(week)
    _assert_id(project_id, "project_id")
    if not _normalize(project_name):
        _fail("project_name is required.")
    return (
        TEMPLATE_PATH.read_text(encoding="utf-8")
        .replace("{{WEEK}}", week)
        .replace("{{PROJECT_ID}}", project_id)
        .replace("{{PROJECT_NAME}}", project_name)
    )


def initialize_project_week_notes(
    *, notes_path: str | Path, week: str, project_id: str, project_name: str
) -> dict[str, Any]:
    target = Path(notes_path).resolve()
    if target.exists():
        return {"state": "existing", "path": str(target), "content": target.read_text(encoding="utf-8")}
    if (_week_root(target) / FREEZE_FILE).exists():
        return {"state": "frozen", "path": str(target), "reason": "week_frozen"}
    content = render_project_week_notes(week=week, project_id=project_id, project_name=project_name)
    _atomic_write(target, content)
    return {"state": "created", "path": str(target), "content": content}


def _frontmatter_value(content: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def derive_note_key(note: dict[str, Any]) -> str:
    return _sha256(
        _stable_json(
            {
                "observation_kind": note["observation_kind"],
                "primary_source_id": note["source_ids"][0],
                "project_id": note["project_id"],
                "section": note["section"],
                "source_revision": note["source_revision"],
            }
        )
    )


def normalize_project_note(
    note: dict[str, Any], *, expected_project_id: str | None = None
) -> dict[str, Any]:
    if not isinstance(note, dict):
        _fail("each note must be an object.")
    kind = note.get("observation_kind")
    if kind not in OBSERVATION_SECTION:
        _fail(f"unsupported observation_kind {kind or 'unknown'}.")
    if note.get("section") != OBSERVATION_SECTION[kind]:
        _fail(f"{kind} must target {OBSERVATION_SECTION[kind]}.")
    project_id = note.get("project_id")
    _assert_id(project_id, "project_id")
    if expected_project_id and project_id != expected_project_id:
        _fail(f"note project {project_id} does not equal {expected_project_id}.")
    source_ids = _unique_strings(note.get("source_ids"), "source_ids", 1)
    employee_ids = _unique_strings(note.get("employee_ids", []), "employee_ids")
    work_id = note.get("work_id")
    workflow_key = note.get("workflow_key")
    if work_id is not None:
        _assert_id(work_id, "work_id")
    if workflow_key is not None:
        _assert_id(workflow_key, "workflow_key")
    if kind in {"work_snapshot", "completed_outcome", "documentation_question"} and not work_id:
        _fail(f"{kind} requires work_id.")
    if kind in {"work_snapshot", "completed_outcome"} and not employee_ids:
        _fail(f"{kind} requires employee_ids.")
    if kind == "workflow_sample" and not workflow_key:
        _fail("workflow_sample requires workflow_key.")
    payload = note.get("structured_payload")
    if not isinstance(payload, dict):
        _fail("structured_payload must be an object.")
    markdown = _normalize(note.get("markdown"))
    if not markdown:
        _fail("markdown is required.")
    normalized = {
        "observation_kind": kind,
        "observed_at": _iso(str(note.get("observed_at") or ""), "observed_at"),
        "source_updated_at": _iso(str(note.get("source_updated_at") or ""), "source_updated_at"),
        "source_revision": _normalize(note.get("source_revision")),
        "project_id": project_id,
        "section": note["section"],
        "source_ids": source_ids,
        "work_id": work_id,
        "employee_ids": employee_ids,
        "workflow_key": workflow_key,
        "structured_payload": json.loads(_stable_json(payload)),
        "markdown": markdown,
    }
    if not normalized["source_revision"]:
        _fail("source_revision is required.")
    return {"note_key": note.get("note_key") or derive_note_key(normalized), **normalized}


def parse_project_notes(content: str) -> list[dict[str, Any]]:
    notes: list[dict[str, Any]] = []
    for match in NOTE_BLOCK.finditer(content):
        try:
            metadata = json.loads(match.group(2))
        except json.JSONDecodeError:
            _fail(f"note {match.group(1)} has invalid metadata JSON.")
        notes.append(
            normalize_project_note(
                {**metadata, "note_key": match.group(1), "markdown": match.group(3)}
            )
        )
    return notes


def validate_project_week_notes(
    content: str, *, expected_week: str | None = None, expected_project_id: str | None = None
) -> dict[str, Any]:
    normalized = _normalize(content)
    artifact_type = _frontmatter_value(normalized, "artifact_type")
    week = (_frontmatter_value(normalized, "week") or "").strip("'\"")
    project_id = (_frontmatter_value(normalized, "project_id") or "").strip("'\"")
    try:
        note_version = int(_frontmatter_value(normalized, "note_version") or "")
        source_note_keys = json.loads(_frontmatter_value(normalized, "source_note_keys") or "[]")
    except (ValueError, json.JSONDecodeError):
        _fail("frontmatter note_version/source_note_keys is invalid.")
    if artifact_type != ARTIFACT_TYPE:
        _fail(f"artifact_type must be {ARTIFACT_TYPE}.")
    _assert_week(week)
    _assert_id(project_id, "project_id")
    if expected_week and week != expected_week:
        _fail(f"week {week} does not equal {expected_week}.")
    if expected_project_id and project_id != expected_project_id:
        _fail(f"project_id {project_id} does not equal {expected_project_id}.")
    if note_version < 0:
        _fail("note_version must be a non-negative integer.")
    last_appended_at = _frontmatter_value(normalized, "last_appended_at")
    if last_appended_at != "null":
        _iso(str(last_appended_at or ""), "last_appended_at")
    keys = _unique_strings(source_note_keys, "source_note_keys")
    if any(f"## {section}" not in normalized for section in SECTIONS):
        _fail("one or more required sections are missing.")
    notes = parse_project_notes(normalized)
    if [note["note_key"] for note in notes] != keys:
        _fail("source_note_keys must exactly match note block order.")
    return {
        "artifact_type": artifact_type,
        "week": week,
        "project_id": project_id,
        "note_version": note_version,
        "last_appended_at": last_appended_at,
        "source_note_keys": keys,
        "notes": notes,
    }


def _note_block(note: dict[str, Any]) -> str:
    metadata = {key: value for key, value in note.items() if key not in {"note_key", "markdown"}}
    return (
        f"<!-- kamdar-project-note: {note['note_key']}\n{_stable_json(metadata)}\n-->\n"
        f"{note['markdown']}\n<!-- /kamdar-project-note: {note['note_key']} -->"
    )


def _insert_at_section(content: str, section: str, blocks: list[str]) -> str:
    heading = f"## {section}"
    start = content.find(heading)
    if start < 0:
        _fail(f"missing section {section}.")
    next_heading = content.find("\n## ", start + len(heading))
    index = len(content) if next_heading < 0 else next_heading + 1
    joined = "\n\n".join(blocks)
    return f"{content[:index].rstrip()}\n\n{joined}\n\n{content[index:].lstrip()}"


def _apply_notes(
    before: str,
    notes: list[dict[str, Any]],
    *,
    expected_week: str,
    expected_project_id: str,
    appended_at: str,
) -> dict[str, Any]:
    current = validate_project_week_notes(
        before, expected_week=expected_week, expected_project_id=expected_project_id
    )
    existing = {note["note_key"]: note for note in current["notes"]}
    seen: set[str] = set()
    fresh: list[dict[str, Any]] = []
    duplicates: list[str] = []
    conflicts: list[str] = []
    for raw in notes:
        note = normalize_project_note(raw, expected_project_id=expected_project_id)
        key = note["note_key"]
        if key in seen:
            _fail(f"batch repeats {key}.")
        seen.add(key)
        if key not in existing:
            fresh.append(note)
        elif _stable_json(existing[key]) == _stable_json(note):
            duplicates.append(key)
        else:
            conflicts.append(key)
    if conflicts:
        return {"state": "conflict", "content": before, "applied": [], "duplicates": duplicates, "conflicts": conflicts}
    if not fresh:
        return {"state": "duplicate", "content": before, "applied": [], "duplicates": duplicates, "conflicts": []}
    after = before
    for section in SECTIONS:
        blocks = [_note_block(note) for note in fresh if note["section"] == section]
        if blocks:
            after = _insert_at_section(after, section, blocks)
    keys = [note["note_key"] for note in parse_project_notes(after)]
    after = re.sub(r"^note_version:\s*\d+$", f"note_version: {current['note_version'] + 1}", after, flags=re.MULTILINE)
    after = re.sub(r"^last_appended_at:\s*.+$", f"last_appended_at: {_iso(appended_at, 'appended_at')}", after, flags=re.MULTILINE)
    after = re.sub(r"^source_note_keys:\s*.+$", f"source_note_keys: {json.dumps(keys)}", after, flags=re.MULTILINE)
    validate_project_week_notes(after, expected_week=expected_week, expected_project_id=expected_project_id)
    return {"state": "applied", "content": after, "applied": [note["note_key"] for note in fresh], "duplicates": duplicates, "conflicts": []}


def append_project_week_notes(
    *,
    notes_path: str | Path,
    expected_week: str,
    expected_project_id: str,
    notes: list[dict[str, Any]],
    appended_at: str | None = None,
) -> dict[str, Any]:
    target = Path(notes_path).resolve()
    if not notes:
        return {"state": "no_finding", "path": str(target), "applied": [], "duplicates": [], "conflicts": []}
    week_root = _week_root(target)
    with _week_lock(week_root):
        if (week_root / FREEZE_FILE).exists():
            return {"state": "frozen", "path": str(target), "applied": [], "duplicates": [], "conflicts": [], "reason": "week_frozen"}
        if not target.exists():
            return {"state": "configuration_gap", "path": str(target), "applied": [], "duplicates": [], "conflicts": [], "reason": "missing_project_notes"}
        before = target.read_text(encoding="utf-8")
        result = _apply_notes(
            before,
            notes,
            expected_week=expected_week,
            expected_project_id=expected_project_id,
            appended_at=appended_at or _now(),
        )
        if result["state"] == "applied":
            _atomic_write(target, result["content"])
        return {**{key: value for key, value in result.items() if key != "content"}, "path": str(target), "week": expected_week, "project_id": expected_project_id}


def freeze_project_week_notes(
    *, week_root: str | Path, week: str, expected_project_ids: list[str], frozen_at: str | None = None
) -> dict[str, Any]:
    _assert_week(week)
    root = Path(week_root).resolve()
    expected = sorted(_unique_strings(expected_project_ids, "expected_project_ids", 1))
    with _week_lock(root):
        path = root / FREEZE_FILE
        if path.exists():
            manifest = json.loads(path.read_text(encoding="utf-8"))
            for row in manifest.get("files", []):
                target = root / row["path"]
                if not target.is_file() or _sha256(target.read_bytes()) != row["sha256"]:
                    return {"state": "conflict", "path": str(path), "reason": "frozen_file_changed"}
            return {"state": "duplicate", "path": str(path), "manifest": manifest}
        files = []
        for target in sorted((root / "project-notes").glob("project--*.md")):
            parsed = validate_project_week_notes(target.read_text(encoding="utf-8"), expected_week=week)
            files.append({"project_id": parsed["project_id"], "path": str(target.relative_to(root)), "sha256": _sha256(target.read_bytes()), "note_keys": parsed["source_note_keys"]})
        files.sort(key=lambda row: row["project_id"])
        observed = [row["project_id"] for row in files]
        if observed != expected:
            return {"state": "configuration_gap", "path": str(path), "reason": "project_coverage_mismatch", "expected": expected, "observed": observed}
        manifest = {"artifact_type": "kamdar-project-notes-freeze", "artifact_version": "1.0.0", "week": week, "frozen_at": _iso(frozen_at or _now(), "frozen_at"), "files": files}
        _atomic_write(path, json.dumps(manifest, indent=2, ensure_ascii=False))
        return {"state": "frozen", "path": str(path), "manifest": manifest}


def load_frozen_project_week_notes(*, week_root: str | Path, week: str) -> dict[str, Any]:
    root = Path(week_root).resolve()
    path = root / FREEZE_FILE
    if not path.is_file():
        _fail("freeze manifest is missing.")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("week") != week:
        _fail(f"freeze week {manifest.get('week')} does not equal {week}.")
    projects = []
    for row in manifest["files"]:
        target = root / row["path"]
        content = target.read_text(encoding="utf-8")
        if _sha256(content) != row["sha256"]:
            _fail(f"frozen file changed: {row['path']}")
        projects.append({**validate_project_week_notes(content, expected_week=week, expected_project_id=row["project_id"]), "path": row["path"], "sha256": row["sha256"], "content": content})
    return {"manifest": manifest, "projects": projects, "freeze_sha256": _sha256(path.read_bytes())}


def write_project_notes_consolidation(
    *, week_root: str | Path, week: str, freeze_sha256: str, projections: list[dict[str, Any]], consolidated_at: str | None = None
) -> dict[str, Any]:
    root = Path(week_root).resolve()
    frozen = load_frozen_project_week_notes(week_root=root, week=week)
    if frozen["freeze_sha256"] != freeze_sha256:
        _fail("freeze_sha256 does not match the immutable manifest.")
    if not projections:
        _fail("projections are required.")
    path = root / CONSOLIDATION_FILE
    receipt = {"artifact_type": "kamdar-project-notes-consolidation", "artifact_version": "1.0.0", "week": week, "freeze_sha256": freeze_sha256, "consolidated_at": _iso(consolidated_at or _now(), "consolidated_at"), "projections": json.loads(_stable_json(projections))}
    if path.exists():
        existing = json.loads(path.read_text(encoding="utf-8"))
        if _stable_json(existing) == _stable_json(receipt):
            return {"state": "duplicate", "path": str(path), "receipt": existing}
        return {"state": "conflict", "path": str(path), "reason": "consolidation_receipt_exists"}
    _atomic_write(path, json.dumps(receipt, indent=2, ensure_ascii=False))
    return {"state": "consolidated", "path": str(path), "receipt": receipt}


def _newest(notes: list[dict[str, Any]], kind: str) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for note in notes:
        if note["observation_kind"] == kind and note.get("work_id"):
            grouped.setdefault(note["work_id"], []).append(note)
    selected = {}
    for work_id, rows in grouped.items():
        latest_at = max(row["source_updated_at"] for row in rows)
        latest = [row for row in rows if row["source_updated_at"] == latest_at]
        if len({_stable_json(row["structured_payload"]) for row in latest}) > 1:
            _fail(f"cannot carry forward divergent {work_id} snapshots at {latest_at}.")
        selected[work_id] = min(latest, key=lambda row: row["note_key"])
    return selected


def _should_carry(snapshot: dict[str, Any] | None, question: dict[str, Any] | None, accepted: set[str]) -> bool:
    status = _normalize((snapshot or {}).get("structured_payload", {}).get("status")).lower()
    question_payload = (question or {}).get("structured_payload", {})
    question_state = _normalize(question_payload.get("state") or question_payload.get("status")).lower()
    artifact_state = _normalize((snapshot or {}).get("structured_payload", {}).get("artifact_state")).lower()
    return bool(
        (question and question_state not in {"answered", "closed", "sufficient"})
        or (snapshot and status not in {"done", "cancelled", "canceled"})
        or (snapshot and artifact_state and artifact_state not in {"accepted", "not_applicable"})
        or (snapshot and status == "done" and snapshot.get("work_id") not in accepted)
    )


def carry_forward_project_week_notes(
    *, week_root: str | Path, week: str, next_week_root: str | Path, next_week: str, project_names: dict[str, str], carried_at: str | None = None
) -> dict[str, Any]:
    _assert_week(week)
    _assert_week(next_week)
    root = Path(week_root).resolve()
    if not (root / CONSOLIDATION_FILE).exists():
        _fail("consolidation receipt is required before carry-forward.")
    carried_at = _iso(carried_at or _now(), "carried_at")
    frozen = load_frozen_project_week_notes(week_root=root, week=week)
    results = []
    for project in frozen["projects"]:
        snapshots = _newest(project["notes"], "work_snapshot")
        questions = _newest(project["notes"], "documentation_question")
        accepted = {note["work_id"] for note in project["notes"] if note["observation_kind"] == "completed_outcome" and note["structured_payload"].get("documentation_state") == "sufficient"}
        notes = []
        for work_id in sorted(set(snapshots) | set(questions)):
            snapshot = snapshots.get(work_id)
            question = questions.get(work_id)
            if not _should_carry(snapshot, question, accepted):
                continue
            owner = snapshot or question
            source_ids = sorted(set((snapshot or {}).get("source_ids", [])) | set((question or {}).get("source_ids", [])))
            source_keys = sorted({value for value in ((snapshot or {}).get("note_key"), (question or {}).get("note_key")) if value})
            notes.append({"observation_kind": "carry_forward", "observed_at": carried_at, "source_updated_at": carried_at, "source_revision": f"carry-forward:{week}:{owner['note_key']}:{next_week}", "project_id": project["project_id"], "section": OBSERVATION_SECTION["carry_forward"], "source_ids": source_ids, "work_id": work_id, "employee_ids": sorted(set((snapshot or {}).get("employee_ids", [])) | set((question or {}).get("employee_ids", []))), "workflow_key": (snapshot or {}).get("workflow_key"), "structured_payload": {"from_week": week, "source_note_keys": source_keys, "work_snapshot": (snapshot or {}).get("structured_payload"), "documentation_question": (question or {}).get("structured_payload")}, "markdown": f"### {work_id} — carried from {week}\n\n- **Reason:** Work or documentation remains unresolved.\n- **Source notes:** {', '.join(source_keys)}.\n- **Evidence:** {', '.join(source_ids)}."})
        notes_path = Path(next_week_root).resolve() / "project-notes" / f"project--{project['project_id']}.md"
        initialized = initialize_project_week_notes(notes_path=notes_path, week=next_week, project_id=project["project_id"], project_name=project_names.get(project["project_id"], project["project_id"]))
        appended = append_project_week_notes(notes_path=notes_path, expected_week=next_week, expected_project_id=project["project_id"], notes=notes, appended_at=carried_at) if notes else {"state": "no_finding", "path": str(notes_path), "applied": [], "duplicates": [], "conflicts": []}
        results.append({"project_id": project["project_id"], "initialized": initialized["state"], **appended})
    return {"state": "conflict" if any(row["state"] == "conflict" for row in results) else "carried_forward", "from_week": week, "to_week": next_week, "projects": results}


LEGACY_ROUTES = {
    "PM attention": ("work_snapshot", SECTIONS[0]),
    "Problems and inefficiencies": ("problem", SECTIONS[3]),
    "Decisions": ("decision", SECTIONS[4]),
    "SOPs": ("workflow_sample", SECTIONS[5]),
}


def _legacy_blocks(content: str) -> list[dict[str, str]]:
    blocks = []
    expression = re.compile(r"<!-- kamdar-weekly-key: ([A-Za-z0-9._:-]+) -->\n([\s\S]*?)\n<!-- /kamdar-weekly-key: \1 -->")
    for heading, (kind, section_name) in LEGACY_ROUTES.items():
        match = re.search(rf"^## {re.escape(heading)}\s*$([\s\S]*?)(?=^## |\Z)", content, re.MULTILINE)
        if not match:
            _fail(f"legacy Draft is missing {heading}.")
        section = match.group(1)
        remainder = re.sub(r"<!--[\s\S]*?-->", "", expression.sub("", section)).strip()
        if re.search(r"^###\s+", remainder, re.MULTILINE):
            _fail(f"legacy section {heading} contains an unkeyed block; add a marker before migration.")
        for row in expression.finditer(section):
            key = row.group(1)
            legacy_kind, separator, source_id = key.partition(":")
            if not separator or not source_id:
                _fail(f"legacy key {key} lacks a kind or source identity.")
            blocks.append({"key": key, "legacy_kind": legacy_kind, "source_id": source_id, "markdown": _normalize(row.group(2)), "observation_kind": kind, "section": section_name})
    if len({row["key"] for row in blocks}) != len(blocks):
        _fail("legacy Draft repeats a source key.")
    return blocks


def migrate_current_weekly_draft(
    *, legacy_draft_path: str | Path, week_root: str | Path, week: str, project_names: dict[str, str] | None = None, project_by_source_id: dict[str, str] | None = None, employee_ids_by_source_id: dict[str, list[str]] | None = None, workflow_key_by_source_id: dict[str, str] | None = None, migrated_at: str | None = None
) -> dict[str, Any]:
    _assert_week(week)
    migrated_at = _iso(migrated_at or _now(), "migrated_at")
    root = Path(week_root).resolve()
    source_path = Path(legacy_draft_path).resolve()
    final_directory = root / "project-notes"
    blocked_path = root / MIGRATION_BLOCKED_FILE
    if not source_path.is_file():
        return {"state": "configuration_gap", "reason": "missing_legacy_draft", "path": str(source_path)}
    if final_directory.exists():
        return {"state": "configuration_gap", "reason": "project_notes_already_exist", "path": str(final_directory)}
    staging = root / f".project-notes-migration-{uuid.uuid4()}"
    try:
        source = source_path.read_text(encoding="utf-8")
        if _frontmatter_value(source, "artifact_type") != "kamdar-current-weekly-draft":
            _fail("legacy Draft artifact_type is invalid.")
        if (_frontmatter_value(source, "week") or "").strip("'\"") != week:
            _fail("legacy Draft week does not match.")
        blocks = _legacy_blocks(source)
        if not blocks:
            _fail("legacy Draft contains no source-keyed blocks to migrate.")
        grouped: dict[str, list[dict[str, Any]]] = {}
        for block in blocks:
            project_id = (project_by_source_id or {}).get(block["source_id"])
            if not project_id:
                _fail(f"legacy key {block['key']} has no exact Project mapping.")
            employees = (employee_ids_by_source_id or {}).get(block["source_id"], [])
            if block["observation_kind"] == "work_snapshot" and not employees:
                _fail(f"legacy key {block['key']} needs an exact employee mapping before retry.")
            workflow_key = (workflow_key_by_source_id or {}).get(block["source_id"])
            if block["observation_kind"] == "workflow_sample" and not workflow_key:
                _fail(f"legacy key {block['key']} needs an exact workflow_key before retry.")
            grouped.setdefault(project_id, []).append({"note_key": f"legacy:{_sha256(block['key'])}", "observation_kind": block["observation_kind"], "observed_at": migrated_at, "source_updated_at": migrated_at, "source_revision": f"legacy:{_sha256(block['markdown'])}", "project_id": project_id, "section": block["section"], "source_ids": [block["source_id"]], "work_id": block["source_id"] if block["observation_kind"] in {"work_snapshot", "workflow_sample"} else None, "employee_ids": employees, "workflow_key": workflow_key, "structured_payload": {"legacy_key": block["key"], "migrated_from": "kamdar-current-weekly-draft"}, "markdown": block["markdown"]})
        staging.mkdir(parents=True, mode=0o700)
        for project_id, notes in sorted(grouped.items()):
            target = staging / f"project--{project_id}.md"
            initialize_project_week_notes(notes_path=target, week=week, project_id=project_id, project_name=(project_names or {}).get(project_id, project_id))
            applied = append_project_week_notes(notes_path=target, expected_week=week, expected_project_id=project_id, notes=notes, appended_at=migrated_at)
            if applied["state"] != "applied":
                _fail(f"legacy Project {project_id} staged as {applied['state']}.")
        manifest = {"artifact_type": "kamdar-project-notes-migration", "artifact_version": "1.0.0", "week": week, "migrated_at": migrated_at, "legacy_path": str(source_path), "legacy_sha256": _sha256(source_path.read_bytes()), "project_ids": sorted(grouped), "legacy_keys": sorted(row["key"] for row in blocks)}
        _atomic_write(staging / ".migration.json", json.dumps(manifest, indent=2))
        os.replace(staging, final_directory)
        blocked_path.unlink(missing_ok=True)
        return {"state": "migrated", "path": str(final_directory), "manifest": manifest, "project_count": len(grouped), "note_count": len(blocks)}
    except Exception as error:
        shutil.rmtree(staging, ignore_errors=True)
        receipt = {"artifact_type": "kamdar-project-notes-migration-blocked", "artifact_version": "1.0.0", "week": week, "recorded_at": migrated_at, "legacy_path": str(source_path), "reason": str(error), "repair": "Add the missing source-key identity mapping or marker, then rerun before starting the Project Notes writer."}
        _atomic_write(blocked_path, json.dumps(receipt, indent=2))
        return {"state": "blocked", "path": str(blocked_path), "reason": receipt["reason"], "repair": receipt["repair"]}

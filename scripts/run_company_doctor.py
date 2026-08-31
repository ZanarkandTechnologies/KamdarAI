#!/usr/bin/env python3
"""Generate and judge private Company OS previews from real read-only PKMS data."""

from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import socket
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.automation_prepare import CADENCE_CONFIG, PrepareError, prepare_cadence
from scripts.project_week_notes import (
    ProjectNotesError,
    freeze_project_week_notes,
    load_frozen_project_week_notes,
)
from evals.viewer.build import build_static_evidence_viewer


ROOT = Path(__file__).resolve().parents[1]
NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2026-03-11"
DEFAULT_PROFILE = Path.home() / ".hermes" / "profiles" / "vishan-kamdar-ai"
REQUIRED_SOURCE_ALIASES = ("projects", "tasks", "goals", "areas")
CADENCE_FEATURES = {
    "daily": (
        ("FEAT-0001", "Project updates"),
        ("FEAT-0002", "Documentation review"),
        ("FEAT-0003", "Progress follow-up"),
        ("FEAT-0004", "Knowledge capture"),
    ),
    "weekly": (
        ("FEAT-0005", "Weekly operating report"),
        ("FEAT-0006", "Knowledge promotion"),
        ("FEAT-0007", "Next-week planning"),
    ),
}


def _frontmatter_value(markdown: str, key: str) -> str | None:
    match = re.search(rf'^{re.escape(key)}:\s*["\']?([^\n"\']+)', markdown, re.MULTILINE)
    return match.group(1).strip() if match else None


def empty_private_weekly_state(profile: Path, week: str) -> dict[str, Any]:
    report_root = profile / "workspace" / "weeks" / week / "reports"
    reports = {
        str(path.relative_to(report_root)): path.read_text(encoding="utf-8")
        for path in sorted(report_root.rglob("*.md"))
        if path.is_file()
    } if report_root.is_dir() else {}
    return {
        "private_reports": reports,
        "private_project_notes": {},
        "project_notes_freeze_sha256": None,
        "project_notes_freeze_manifest": None,
        "referenced_employee_memory": {},
        "referenced_sop_memory": {},
    }


def load_private_weekly_state(profile: Path, week: str) -> dict[str, Any]:
    """Load only immutable Weekly notes plus referenced local memory."""

    workspace = profile / "workspace"
    week_root = workspace / "weeks" / week
    empty = empty_private_weekly_state(profile, week)
    try:
        frozen = load_frozen_project_week_notes(week_root=week_root, week=week)
    except (ProjectNotesError, FileNotFoundError, KeyError, json.JSONDecodeError):
        return empty
    notes = {
        row["path"]: row["content"]
        for row in frozen["projects"]
    }
    person_ids = {
        person_id
        for project in frozen["projects"]
        for note in project["notes"]
        for person_id in note.get("employee_ids", [])
    }
    workflow_keys = {
        str(note["workflow_key"])
        for project in frozen["projects"]
        for note in project["notes"]
        if note.get("workflow_key")
    }
    employees: dict[str, str] = {}
    employee_root = (workspace / "memory" / "employees").resolve()
    for person_id in sorted(person_ids):
        path = (employee_root / f"{person_id}.md").resolve()
        try:
            path.relative_to(employee_root)
        except ValueError as error:
            raise DoctorError("Employee Memory path escaped its private root") from error
        if path.is_file():
            employees[person_id] = path.read_text(encoding="utf-8")
    sops: dict[str, str] = {}
    sop_root = workspace / "memory" / "sops"
    for path in sorted(sop_root.glob("*.md")) if sop_root.is_dir() else []:
        markdown = path.read_text(encoding="utf-8")
        workflow_key = _frontmatter_value(markdown, "workflow_key")
        if workflow_key in workflow_keys:
            sops[str(workflow_key)] = markdown
    return {
        "private_reports": empty["private_reports"],
        "private_project_notes": notes,
        "project_notes_freeze_sha256": frozen["freeze_sha256"],
        "project_notes_freeze_manifest": frozen["manifest"],
        "referenced_employee_memory": employees,
        "referenced_sop_memory": sops,
    }


def freeze_private_weekly_state(
    profile: Path, week: str, project_records: list[dict[str, Any]]
) -> dict[str, Any]:
    """Freeze exactly the active Projects before Weekly reads private notes."""

    expected_project_ids = sorted({
        str(record["id"])
        for record in project_records
        if isinstance(record, dict) and record.get("id")
    })
    if not expected_project_ids:
        return {
            "state": "configuration_gap",
            "reason": "no_active_project_ids",
            "expected": [],
            "observed": [],
        }
    result = freeze_project_week_notes(
        week_root=profile / "workspace" / "weeks" / week,
        week=week,
        expected_project_ids=expected_project_ids,
    )
    return {**result, "expected_project_ids": expected_project_ids}


def prepare_private_weekly_state(
    profile: Path, week: str, project_records: list[dict[str, Any]]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Freeze current coverage and expose notes only when that exact set is valid."""

    freeze_result = freeze_private_weekly_state(profile, week, project_records)
    if freeze_result.get("state") not in {"frozen", "duplicate"}:
        return freeze_result, empty_private_weekly_state(profile, week)
    return freeze_result, load_private_weekly_state(profile, week)
TERMINAL_STATUSES = {"done", "complete", "completed", "archived", "cancelled", "canceled"}
SOURCE_EXCLUDED_STATUSES = {
    "projects": ("Done", "Dropped", "Migrated", "Info Dumped"),
    "tasks": (),
    "goals": ("Done",),
    "areas": ("Done",),
}
SOURCE_FIELDS = {
    "projects": {
        "Name", "Status", "Focus This Week", "Importance", "Next Checkup Date",
        "Work Progress", "Days Untouched", "Areas", "Goals", "Context", "Tags",
    },
    "tasks": {
        "Name", "Status", "Task Due Date", "Description", "Attention Required",
        "Blocked by", "Blocking", "Project", "Goals", "Areas", "Hours Spent",
        "Pinned", "Unblocked", "Tags", "AI review", "Daily review version", "Type",
    },
    "goals": {
        "Name", "Status", "Description", "Target Metric", "Initial Metric",
        "Progress Till Next Checkup", "Next Checkup Date", "Areas", "Projects",
    },
    "areas": {
        "Name", "Status", "Pillar", "Weekly Hours Allocated", "Hours Planned This Week",
        "Hours Spent This Week", "Time Allocation Percentage", "Time Quota Usage",
        "Efficiency", "Projects", "Goals",
    },
}
NON_OPERATIONAL_BODY_MARKERS = (
    "This environment is generated from the exact frozen fixture scored by the evaluation.",
)


class DoctorError(RuntimeError):
    pass


def prepared_delivery_state(
    requested_count: int,
    prepare_runs: list[dict[str, Any]],
    failed_cadence: str | None,
) -> str:
    """Summarize whether every requested handoff is genuinely apply-ready."""
    statuses = [str(run.get("delivery_status") or "blocked") for run in prepare_runs]
    if not statuses and failed_cadence:
        return "blocked"
    if failed_cadence or len(statuses) != requested_count:
        return "partial" if "ready" in statuses else "blocked"
    if statuses and all(status == "ready" for status in statuses):
        return "prepared"
    if statuses and all(status == "not_requested" for status in statuses):
        return "not_requested"
    return "partial" if "ready" in statuses else "blocked"


def _log_event(run_path: Path, event: str, **fields: Any) -> None:
    """Emit one secret-free progress event to stderr and the private run log."""
    root = run_path.parent if run_path.name in CADENCE_CONFIG else run_path
    root.mkdir(parents=True, exist_ok=True)
    payload = {
        "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event,
        **fields,
    }
    line = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    log_path = root / "activity.jsonl"
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")
    os.chmod(log_path, 0o600)
    print(line, file=sys.stderr, flush=True)


def load_doctor_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise DoctorError(f"private Doctor bindings are unavailable: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise DoctorError(f"private Doctor bindings are unreadable: {path}") from error
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise DoctorError("private Doctor bindings require schema_version 1")
    sources = payload.get("sources")
    if not isinstance(sources, dict) or set(sources) != set(REQUIRED_SOURCE_ALIASES):
        raise DoctorError("private Doctor bindings must define projects, tasks, goals, and areas exactly")
    for alias, source in sources.items():
        if not isinstance(source, dict) or any(not str(source.get(key) or "").strip() for key in ("id", "title", "url")):
            raise DoctorError(f"private Doctor binding is incomplete: {alias}")
        if not re.fullmatch(r"[0-9a-f-]{32,36}", str(source["id"]).lower()):
            raise DoctorError(f"private Doctor source id is invalid: {alias}")
        if not str(source["url"]).startswith("https://"):
            raise DoctorError(f"private Doctor source URL is invalid: {alias}")
    if not str(payload.get("model") or "").strip():
        raise DoctorError("private Doctor bindings require a live model")
    return payload


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_file(path: Path) -> str:
    return _sha256_bytes(path.read_bytes()) if path.is_file() else "absent"


def workspace_safety_summary(before: dict[str, str], after: dict[str, str]) -> dict[str, Any]:
    """Separate the installed runtime mutation boundary from concurrent source edits."""
    installed_unchanged = before.get("installed") == after.get("installed")
    source_context_unchanged = before.get("source") == after.get("source")
    if not installed_unchanged:
        classification = "installed_workspace_changed"
    elif not source_context_unchanged:
        classification = "source_context_drift_no_doctor_mutation_capability"
    else:
        classification = "unchanged"
    return {
        "before": before,
        "after": after,
        "unchanged": installed_unchanged,
        "installed_unchanged": installed_unchanged,
        "source_context_unchanged": source_context_unchanged,
        "classification": classification,
    }


def _stable(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode()


def workspace_binding_summary(path: Path, configured_company: str, sources: dict[str, dict[str, Any]]) -> dict[str, Any]:
    content = path.read_text(encoding="utf-8") if path.is_file() else ""
    company_match = re.search(r'^company_name:\s*["\']?([^"\'\n]+)', content, re.MULTILINE)
    declared_company = company_match.group(1).strip() if company_match else None
    source_matches = {
        alias: str(source.get("url") or "") in content
        for alias, source in sources.items()
    }
    issues = []
    if not content:
        issues.append("installed-workspace-missing")
    if declared_company and declared_company.casefold() != configured_company.casefold():
        issues.append("configured-company-mismatch")
    if not all(source_matches.values()):
        issues.append("configured-source-bindings-missing")
    if "isolated-eval" in content or "seeded" in content.casefold():
        issues.append("stale-installed-workspace-context")
    return {
        "installed_workspace_sha256": _sha256_bytes(content.encode()) if content else "absent",
        "configured_company": configured_company,
        "declared_company": declared_company,
        "configured_source_matches": source_matches,
        "status": "consistent" if not issues else "needs_review",
        "issues": issues,
    }


def doctor_binding_summary(configured_company: str, sources: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Describe the binding that actually authorized and completed this Doctor read."""
    return {
        "configured_company": configured_company,
        "configured_source_matches": {alias: True for alias in sources},
        "status": "connected",
        "issues": [],
    }


def _write_private(path: Path, value: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}-", dir=path.parent)
    try:
        mode = "wb" if isinstance(value, bytes) else "w"
        kwargs = {} if isinstance(value, bytes) else {"encoding": "utf-8"}
        with os.fdopen(descriptor, mode, **kwargs) as stream:
            stream.write(value)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _read_env_value(path: Path, names: tuple[str, ...]) -> str:
    if not path.is_file():
        return ""
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        match = re.match(r"^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$", line)
        if not match:
            continue
        raw = match.group(2).strip()
        if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {'"', "'"}:
            raw = raw[1:-1]
        values[match.group(1)] = raw
    for name in names:
        if values.get(name):
            return values[name]
    return ""


class NotionReader:
    """Exact read-only Notion surface. POST is permitted only for search/query."""

    def __init__(self, token: str, sources: dict[str, dict[str, Any]]) -> None:
        if not token:
            raise DoctorError("notion credential is unavailable")
        self._token = token
        self.sources = sources
        self.trace: list[dict[str, Any]] = []
        self.property_types: dict[str, dict[str, str]] = {}
        self._readable_block_ids: set[str] = set()
        now = time.gmtime()
        self.current_week_start = time.strftime(
            "%Y-%m-%dT00:00:00Z",
            time.gmtime(time.time() - now.tm_wday * 86400),
        )

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        parsed_path = urllib.parse.urlsplit(path).path
        source_ids = {str(source["id"]) for source in self.sources.values()}
        schema_paths = {f"/data_sources/{source_id}" for source_id in source_ids}
        query_paths = {f"/data_sources/{source_id}/query" for source_id in source_ids}
        block_match = re.fullmatch(r"/blocks/([^/]+)/children", parsed_path)
        block_read = bool(
            method == "GET"
            and block_match
            and block_match.group(1) in self._readable_block_ids
        )
        if not (
            (method == "GET" and parsed_path in schema_paths)
            or (method == "POST" and parsed_path in query_paths)
            or block_read
        ):
            raise DoctorError(f"provider read surface rejected: {method} {path}")
        started = time.time()
        payload: dict[str, Any] | None = None
        for attempt in range(1, 4):
            request = urllib.request.Request(
                NOTION_API + path,
                data=None if body is None else json.dumps(body).encode(),
                method=method,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "Notion-Version": NOTION_VERSION,
                    "Content-Type": "application/json",
                    "User-Agent": "company-os-doctor/1.0",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    payload = json.load(response)
                break
            except urllib.error.HTTPError as error:
                detail = error.read(2048).decode("utf-8", "replace")
                if error.code not in {429, 500, 502, 503, 504} or attempt == 3:
                    raise DoctorError(f"Notion read failed ({error.code}) for {path}: {detail}") from error
            except (
                TimeoutError,
                socket.timeout,
                urllib.error.URLError,
                http.client.RemoteDisconnected,
                ConnectionError,
            ) as error:
                if attempt == 3:
                    raise DoctorError(f"Notion read timed out after 3 attempts for {path}") from error
            time.sleep(2 ** (attempt - 1))
        if payload is None:
            raise DoctorError(f"Notion read returned no payload for {path}")
        self.trace.append(
            {
                "provider": "notion",
                "operation": "read",
                "method": method,
                "path": path,
                "duration_seconds": round(time.time() - started, 3),
                "result_count": len(payload.get("results", [])) if isinstance(payload, dict) else None,
            }
        )
        return payload

    def schema(self, alias: str) -> dict[str, Any]:
        source = self.sources[alias]
        payload = self.request("GET", f"/data_sources/{source['id']}")
        properties = {
            name: {
                "id": value.get("id"),
                "type": value.get("type"),
                "relation": value.get("relation") if value.get("type") == "relation" else None,
            }
            for name, value in (payload.get("properties") or {}).items()
            if isinstance(value, dict)
        }
        self.property_types[alias] = {
            name: str(value.get("type") or "")
            for name, value in (payload.get("properties") or {}).items()
            if isinstance(value, dict)
        }
        return {"alias": alias, **source, "properties": properties}

    def query(self, alias: str, *, limit: int = 1000) -> dict[str, Any]:
        if alias not in self.sources:
            raise DoctorError(f"unapproved source alias: {alias}")
        source = self.sources[alias]
        filters = self._query_filters(alias)
        records_by_id: dict[str, dict[str, Any]] = {}
        for filter_body in filters:
            cursor: str | None = None
            has_more = True
            observed = 0
            while has_more and observed < limit:
                body: dict[str, Any] = {"page_size": min(100, limit - observed)}
                if filter_body:
                    body["filter"] = filter_body
                if cursor:
                    body["start_cursor"] = cursor
                payload = self.request("POST", f"/data_sources/{source['id']}/query", body)
                page_items = [item for item in payload.get("results", []) if isinstance(item, dict)]
                observed += len(page_items)
                for item in page_items:
                    record_id = str(item.get("id") or "")
                    if record_id:
                        self._readable_block_ids.add(record_id)
                        records_by_id[record_id] = compact_record(alias, item)
                has_more = bool(payload.get("has_more"))
                cursor = payload.get("next_cursor")
                if has_more and not cursor:
                    raise DoctorError(f"Notion pagination omitted next_cursor for {alias}")
            if has_more:
                raise DoctorError(f"{alias} exceeds the safe read limit of {limit} records for one bounded query")
        records = list(records_by_id.values())
        records.sort(key=lambda record: str(record.get("id") or ""))
        selected = [record for record in records if _selected_record(alias, record)]
        if alias in {"projects", "tasks"}:
            for record in selected:
                body, exclusions = sanitize_source_body(self.read_page_body(str(record["id"])))
                record["body_markdown"] = body
                if exclusions:
                    record["body_exclusions"] = exclusions
        return {
            "source": {"alias": alias, **source},
            "records": selected,
            "observed_count": len(records),
            "selected_count": len(selected),
            "has_more": False,
        }

    def _query_filters(self, alias: str) -> list[dict[str, Any] | None]:
        if alias == "tasks":
            return [
                {"property": "Status", "status": {"does_not_equal": "Done"}},
                {
                    "and": [
                        {"property": "Status", "status": {"equals": "Done"}},
                        {
                            "timestamp": "last_edited_time",
                            "last_edited_time": {"on_or_after": self.current_week_start},
                        },
                    ]
                },
            ]
        excluded = SOURCE_EXCLUDED_STATUSES[alias]
        filters = [
            {"property": "Status", "status": {"does_not_equal": status}}
            for status in excluded
        ]
        return [filters[0] if len(filters) == 1 else ({"and": filters} if filters else None)]

    def read_page_body(self, page_id: str) -> str:
        if page_id not in self._readable_block_ids:
            raise DoctorError(f"page body is outside the selected read boundary: {page_id}")
        return self._read_block_children(page_id).strip()

    def _read_block_children(self, block_id: str) -> str:
        blocks: list[dict[str, Any]] = []
        cursor: str | None = None
        while True:
            query = {"page_size": "100"}
            if cursor:
                query["start_cursor"] = cursor
            path = f"/blocks/{block_id}/children?{urllib.parse.urlencode(query)}"
            payload = self.request("GET", path)
            page_blocks = [item for item in payload.get("results", []) if isinstance(item, dict)]
            blocks.extend(page_blocks)
            for item in page_blocks:
                child_id = str(item.get("id") or "")
                if child_id:
                    self._readable_block_ids.add(child_id)
            if not payload.get("has_more"):
                break
            cursor = payload.get("next_cursor")
            if not cursor:
                raise DoctorError(f"Notion block pagination omitted next_cursor for {block_id}")
        lines: list[str] = []
        for block in blocks:
            kind = str(block.get("type") or "")
            value = block.get(kind) if isinstance(block.get(kind), dict) else {}
            content = _plain(value.get("rich_text"))
            prefix = {
                "heading_1": "# ", "heading_2": "## ", "heading_3": "### ",
                "bulleted_list_item": "- ", "numbered_list_item": "1. ",
                "to_do": "- [x] " if value.get("checked") else "- [ ] ",
                "quote": "> ", "code": "```\n",
            }.get(kind, "")
            if content:
                suffix = "\n```" if kind == "code" else ""
                lines.append(f"{prefix}{content}{suffix}")
            if block.get("has_children") and block.get("id"):
                child = self._read_block_children(str(block["id"]))
                if child:
                    lines.append(child)
        return "\n\n".join(lines)


def _plain(rich: Any) -> str:
    if not isinstance(rich, list):
        return ""
    return "".join(str(item.get("plain_text") or "") for item in rich if isinstance(item, dict))


def _property_value(value: dict[str, Any]) -> Any:
    kind = str(value.get("type") or "")
    raw = value.get(kind)
    if kind in {"title", "rich_text"}:
        return _plain(raw)
    if kind in {"status", "select"}:
        return raw.get("name") if isinstance(raw, dict) else None
    if kind == "multi_select":
        return [item.get("name") for item in raw or [] if isinstance(item, dict)]
    if kind == "date":
        return raw if isinstance(raw, dict) else None
    if kind in {"number", "checkbox", "url", "email", "phone_number", "created_time", "last_edited_time"}:
        return raw
    if kind == "relation":
        return [item.get("id") for item in raw or [] if isinstance(item, dict)]
    if kind == "formula" and isinstance(raw, dict):
        formula_type = raw.get("type")
        return raw.get(formula_type) if formula_type else None
    if kind == "rollup" and isinstance(raw, dict):
        rollup_type = raw.get("type")
        result = raw.get(rollup_type) if rollup_type else None
        return result if isinstance(result, (str, int, float, bool, type(None))) else None
    return None


def sanitize_source_body(value: str) -> tuple[str, list[str]]:
    cutoff = len(value)
    excluded: list[str] = []
    for marker in NON_OPERATIONAL_BODY_MARKERS:
        index = value.find(marker)
        if index >= 0:
            cutoff = min(cutoff, index)
            excluded.append("non-operational-harness-appendix")
    return value[:cutoff].rstrip(), sorted(set(excluded))


def compact_record(alias: str, page: dict[str, Any]) -> dict[str, Any]:
    properties = {
        name: _property_value(value)
        for name, value in (page.get("properties") or {}).items()
        if isinstance(value, dict)
        if name in SOURCE_FIELDS[alias]
    }
    return {
        "id": page.get("id"),
        "url": page.get("url"),
        "created_time": page.get("created_time"),
        "last_edited_time": page.get("last_edited_time"),
        "properties": properties,
    }


def _selected_record(alias: str, record: dict[str, Any]) -> bool:
    props = record.get("properties") or {}
    status = str(props.get("Status") or "").strip().lower()
    if alias == "projects":
        return status not in {value.lower() for value in SOURCE_EXCLUDED_STATUSES["projects"]}
    if alias == "tasks":
        if status == "done":
            return str(props.get("AI review") or "").strip().lower() != "processed"
        return status not in TERMINAL_STATUSES
    if alias in {"goals", "areas"}:
        return status not in TERMINAL_STATUSES
    return True


def _hermes_python(profile: Path) -> Path:
    candidates = [
        Path.home() / ".hermes" / "hermes-agent" / "venv" / "bin" / "python",
        Path("/opt/hermes/.venv/bin/python"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise DoctorError("Hermes Python runtime not found")


def _model_subprocess(profile: Path, request_path: Path, response_path: Path) -> None:
    environment = os.environ.copy()
    environment["HERMES_HOME"] = str(profile)
    result = subprocess.run(
        [str(_hermes_python(profile)), "-m", "scripts.run_company_doctor", "_model", "--request", str(request_path), "--response", str(response_path)],
        cwd=ROOT,
        env=environment,
        text=True,
        capture_output=True,
        timeout=900,
        check=False,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise DoctorError(f"live model call failed: {(detail[-1] if detail else result.returncode)}")


def _message_dict(message: Any) -> dict[str, Any]:
    if hasattr(message, "model_dump"):
        return message.model_dump(exclude_none=True)
    if isinstance(message, dict):
        return message
    return {
        "role": "assistant",
        "content": getattr(message, "content", None),
        "tool_calls": getattr(message, "tool_calls", None),
    }


def model_worker(request_path: Path, response_path: Path) -> int:
    from agent.auxiliary_client import get_text_auxiliary_client

    request = json.loads(request_path.read_text(encoding="utf-8"))
    client, configured_model = get_text_auxiliary_client(task="")
    model = str(request.get("model") or configured_model or "")
    if client is None or not model:
        raise DoctorError("configured live model is unavailable")
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": request["messages"],
        "timeout": 300,
        "max_tokens": int(request.get("max_tokens") or 4000),
    }
    if request.get("tools"):
        kwargs["tools"] = request["tools"]
        kwargs["tool_choice"] = "required"
    if request.get("response_format"):
        kwargs["response_format"] = request["response_format"]
    if request.get("reasoning"):
        kwargs["extra_body"] = {"reasoning": request["reasoning"]}
    response = client.chat.completions.create(**kwargs)
    choice = response.choices[0]
    message = _message_dict(choice.message)
    usage = getattr(response, "usage", None)
    usage_dict = usage.model_dump() if hasattr(usage, "model_dump") else (usage if isinstance(usage, dict) else {})
    _write_private(
        response_path,
        json.dumps({"model": model, "message": message, "usage": usage_dict}, ensure_ascii=False),
    )
    return 0


def _call_model(
    profile: Path,
    run_root: Path,
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None,
    label: str,
    max_tokens: int = 2500,
    reasoning: dict[str, Any] | None = None,
    json_mode: bool = True,
    model_override: str | None = None,
) -> dict[str, Any]:
    request_path = run_root / f".{label}-request.json"
    response_path = run_root / f".{label}-response.json"
    _write_private(
        request_path,
        json.dumps(
            {
                "messages": messages,
                "tools": tools or [],
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"} if json_mode and not tools else None,
                "reasoning": reasoning or {"enabled": True, "effort": "medium"},
                "model": model_override,
            },
            ensure_ascii=False,
        ),
    )
    _log_event(run_root, "model.request.ready", label=label, max_tokens=max_tokens)
    last_error: DoctorError | None = None
    for attempt in range(1, 4):
        started = time.monotonic()
        _log_event(run_root, "model.call.started", label=label, transport_attempt=attempt)
        try:
            _model_subprocess(profile, request_path, response_path)
            _log_event(
                run_root,
                "model.call.completed",
                label=label,
                transport_attempt=attempt,
                elapsed_seconds=round(time.monotonic() - started, 3),
            )
            last_error = None
            break
        except DoctorError as error:
            last_error = error
            _log_event(
                run_root,
                "model.call.failed",
                label=label,
                transport_attempt=attempt,
                elapsed_seconds=round(time.monotonic() - started, 3),
                error_type=type(error).__name__,
            )
            if attempt < 3:
                time.sleep(2 ** (attempt - 1))
    if last_error is not None:
        raise last_error
    payload = json.loads(response_path.read_text(encoding="utf-8"))
    request_path.unlink(missing_ok=True)
    response_path.unlink(missing_ok=True)
    _log_event(run_root, "model.response.loaded", label=label, model=payload.get("model"))
    return payload


def workspace_proposal(schemas: dict[str, Any], sources: dict[str, dict[str, Any]]) -> str:
    rows = []
    for alias, source in sources.items():
        rows.append(f"| `{alias}` | notion | [{source['title']}]({source['url']}) | read | Confirmed from the authenticated LifeMax schema (`{source['id']}`). |")
    return """---
template_id: hermes-company-workspace
template_version: "0.3.0"
kind: hermes-project-context
company_name: "Zanarkand Technologies"
company_description: "Zanarkand operating context derived from Kenji's LifeMax Notion PKMS."
company_timezone: "Asia/Kuala_Lumpur"
status: proposed
execution_modes: [read-only-doctor]
production_write_mode: proposal-only
---

# Zanarkand Technologies Workspace Proposal

This proposal was generated from real authenticated source metadata. It is not installed automatically.

## Data sources

| Role | Provider | Source | Access | Provenance |
| --- | --- | --- | --- | --- |
""" + "\n".join(rows) + """

## Output destinations

No downstream destination is authorized. Reports remain profile-private intermediary files until separately reviewed.

## Binding gaps

- Confirm whether the LifeMax `Projects` and `Tasks` sources are the complete Zanarkand operating boundary or a combined personal/business view.
- Decide whether `Resources`, `People`, and `Journals` should become additional read sources.
- No Notion, Drive, Gmail, messaging, or schedule write is authorized by this proposal.
"""


def operate(args: argparse.Namespace) -> int:
    profile = args.profile_home.expanduser().resolve()
    sync_to_provider = bool(getattr(args, "sync_to_provider", False))
    requested_cadences = tuple(getattr(args, "cadences", None) or ("daily", "weekly"))
    bindings_path = (args.bindings.expanduser().resolve() if args.bindings else profile / "company-os-doctor-bindings.json")
    doctor_config = load_doctor_config(bindings_path)
    configured_sources = doctor_config["sources"]
    doctor_model = str(doctor_config["model"])
    token = _read_env_value(profile / ".env", ("NOTION_TOKEN", "NOTION_API_KEY"))
    reader = NotionReader(token, configured_sources)
    run_id = args.run_id or time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + "-" + uuid.uuid4().hex[:8]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", run_id):
        raise DoctorError("run id must be a filename-safe identifier")
    private_root = (profile / "state" / "company-os-doctor").resolve()
    run_root = (private_root / run_id).resolve()
    if run_root.parent != private_root:
        raise DoctorError("run root must remain inside the profile-private Doctor directory")
    if run_root.exists():
        raise DoctorError(f"run root already exists: {run_root}")
    run_root.mkdir(parents=True, mode=0o700)
    _log_event(
        run_root,
        "doctor.started",
        run_id=run_id,
        delivery="sync_plan" if sync_to_provider else "analyze_only",
    )
    source_workspace = ROOT / "workspace.hermes.md"
    installed_workspace = profile / "workspace" / ".hermes.md"
    before_hashes = {"source": _sha256_file(source_workspace), "installed": _sha256_file(installed_workspace)}
    _log_event(run_root, "sources.schema.started", aliases=list(REQUIRED_SOURCE_ALIASES))
    schemas = {alias: reader.schema(alias) for alias in REQUIRED_SOURCE_ALIASES}
    _log_event(run_root, "sources.schema.completed", source_count=len(schemas))
    proposal = workspace_proposal(schemas, configured_sources)
    _write_private(run_root / "workspace-proposal.md", proposal)
    binding_review = {
        "schema_version": 1,
        "status": "proposed",
        "fields": [
            {"field": f"data_sources.{alias}", "state": "confirmed", "source": value["url"], "schema_sha256": _sha256_bytes(_stable(schemas[alias]))}
            for alias, value in configured_sources.items()
        ],
        "unresolved": ["combined_personal_business_scope", "additional_resources_people_journals"],
    }
    _write_private(run_root / "workspace-binding-review.json", json.dumps(binding_review, indent=2))

    _log_event(run_root, "sources.read.started", aliases=list(REQUIRED_SOURCE_ALIASES))
    sources = {alias: reader.query(alias) for alias in REQUIRED_SOURCE_ALIASES}
    _log_event(
        run_root,
        "sources.read.completed",
        counts={alias: source["selected_count"] for alias, source in sources.items()},
    )
    week = time.strftime("%G-W%V")
    if "weekly" in requested_cadences:
        freeze_result, weekly_state = prepare_private_weekly_state(
            profile,
            week,
            list((sources.get("projects") or {}).get("records") or []),
        )
        _log_event(
            run_root,
            "weekly.project_notes.freeze",
            state=freeze_result.get("state"),
            reason=freeze_result.get("reason"),
            expected_count=len(
                freeze_result.get("expected_project_ids")
                or freeze_result.get("expected")
                or []
            ),
            observed_count=len(
                (freeze_result.get("manifest") or {}).get("files")
                or freeze_result.get("observed")
                or []
            ),
        )
    else:
        weekly_state = load_private_weekly_state(profile, week)
    installed_workspace_review = workspace_binding_summary(
        installed_workspace,
        str(doctor_config.get("company") or ""),
        configured_sources,
    )
    snapshot = {
        "schema_version": 1,
        "input_mode": "configured_sources",
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sources": sources,
        "workspace_binding": doctor_binding_summary(
            str(doctor_config.get("company") or ""),
            configured_sources,
        ),
        "current_week": week,
        "private_report_root": f"workspace/weeks/{week}/reports",
        **weekly_state,
    }
    prepare_runs: list[dict[str, Any]] = []
    failed_cadence: str | None = None
    failure_message: str | None = None
    for cadence in requested_cadences:
        try:
            prepare_runs.append(
                prepare_cadence(
                    cadence=cadence,
                    profile=profile,
                    run_root=run_root,
                    snapshot=snapshot,
                    model=doctor_model,
                    call_model=_call_model,
                    write_private=_write_private,
                    log_event=lambda event, **fields: _log_event(run_root, event, **fields),
                    sync_to_provider=sync_to_provider,
                )
            )
        except PrepareError as error:
            failed_cadence = cadence
            failure_message = str(error)
            failure_dir = run_root / cadence
            _write_private(
                failure_dir / "failure.json",
                json.dumps(
                    {
                        "schema_version": 1,
                        "cadence": cadence,
                        "status": "failed",
                        "error_type": type(error).__name__,
                        "message": failure_message,
                    },
                    indent=2,
                    ensure_ascii=False,
                ),
            )
            _write_private(
                failure_dir / "preview.md",
                f"""---
cadence: {cadence}
mode: prepare
delivery: not-requested
status: failed
---

# {cadence.replace('-', ' ').title()} validation failed

No output was accepted because the generated result did not pass the production contract after bounded repair attempts.

Nothing was published and no downstream action was prepared.

## Inspection

- See `failure.json` for the validation failure.
- See `../activity.jsonl` for the chronological execution log.
""",
            )
            _log_event(
                run_root,
                "cadence.failed",
                cadence=cadence,
                error_type=type(error).__name__,
                detail_path=f"{cadence}/failure.json",
            )
            break
    _log_event(run_root, "sources.readback.started")
    after_sources = {alias: reader.query(alias) for alias in REQUIRED_SOURCE_ALIASES}
    _write_private(run_root / "source-readback.json", json.dumps(after_sources, indent=2, ensure_ascii=False))
    before_source_hash = _sha256_bytes(_stable(snapshot["sources"]))
    after_source_hash = _sha256_bytes(_stable(after_sources))
    after_hashes = {"source": _sha256_file(source_workspace), "installed": _sha256_file(installed_workspace)}
    source_unchanged = before_source_hash == after_source_hash
    _log_event(run_root, "sources.readback.completed", source_drift_detected=not source_unchanged)
    workspace_safety = workspace_safety_summary(before_hashes, after_hashes)
    _log_event(
        run_root,
        "workspace.readback.completed",
        installed_workspace_changed=not workspace_safety["installed_unchanged"],
        source_context_drift_detected=not workspace_safety["source_context_unchanged"],
    )
    technical_pass = workspace_safety["installed_unchanged"] and failed_cadence is None and all(run["status"] != "failed" for run in prepare_runs)
    needs_information = any(run["status"] == "needs_information" for run in prepare_runs)
    status = "failed" if not technical_pass else ("needs_information" if needs_information else "working")
    cadence_artifacts = [path for run in prepare_runs for path in run["artifacts"]]
    if failed_cadence:
        cadence_artifacts.extend([f"{failed_cadence}/failure.json", f"{failed_cadence}/preview.md"])
    feature_states = {feature_id: state for run in prepare_runs for feature_id, state in run["feature_states"].items()}
    delivery_prepare_state = prepared_delivery_state(
        len(requested_cadences), prepare_runs, failed_cadence
    ) if sync_to_provider else "not_requested"
    completed_by_cadence = {run["cadence"]: run for run in prepare_runs}
    automation_runs: dict[str, dict[str, Any]] = {}
    for cadence in requested_cadences:
        completed = completed_by_cadence.get(cadence)
        if completed:
            automation_runs[cadence] = {
                "label": cadence.replace("-", " ").title(),
                "mode": "prepare",
                "prepare_executed": True,
                "production_schema_validated": True,
                "preview_path": f"{cadence}/preview.md",
                "delivery": (
                    completed["delivery_status"] if sync_to_provider else "not_requested"
                ),
                "status": completed["status"],
            }
            continue
        is_failure = cadence == failed_cadence
        cadence_status = "failed" if is_failure else "not_run"
        automation_runs[cadence] = {
            "label": cadence.replace("-", " ").title(),
            "mode": "prepare",
            "prepare_executed": is_failure,
            "production_schema_validated": False,
            "preview_path": f"{cadence}/preview.md" if is_failure else None,
            "delivery": "not_requested",
            "status": cadence_status,
        }
        for feature_id, _ in CADENCE_FEATURES[cadence]:
            feature_states[feature_id] = "fail" if is_failure else "not_run"
    receipt = {
        "schema_version": 1,
        "kind": "company-os-real-pkms-doctor",
        "status": status,
        "run_id": run_id,
        "run_root": str(run_root),
        "input_mode": "configured_sources",
        "model_mode": "live",
        "requested_cadences": list(requested_cadences),
        "excluded_cadences": [cadence for cadence in CADENCE_CONFIG if cadence not in requested_cadences],
        "delivery_state": delivery_prepare_state,
        "downstream_calls": 0,
        "provider": "notion",
        "bindings_sha256": _sha256_file(bindings_path),
        "selected_sources": [{"alias": alias, "url": source["url"], "id": source["id"]} for alias, source in configured_sources.items()],
        "source_counts": {alias: source["selected_count"] for alias, source in snapshot["sources"].items()},
        "read_operation_inventory": reader.trace,
        "mutation_operations_registered": [],
        "automation_runs": automation_runs,
        "feature_states": feature_states,
        "generation": {run["cadence"]: run["generation"] for run in prepare_runs},
        "semantic_judges": {
            run["cadence"]: {"calls": 1, "model": run["judge_model"], "tools": []}
            for run in prepare_runs
        },
        "source_pre_post": {
            "before_sha256": before_source_hash,
            "after_sha256": after_source_hash,
            "unchanged": source_unchanged,
            "classification": "unchanged" if source_unchanged else "observed_drift_no_mutation_capability",
            "readback_path": "source-readback.json",
        },
        "workspace_pre_post": workspace_safety,
        "installed_workspace_review": installed_workspace_review,
        "stages": {
            "setup": "pass",
            "real_integrations": "pass",
            "workspace_proposal": "pass",
            "production_prepare": "pass" if technical_pass else "failed",
            "intermediary_evaluation": "pass" if technical_pass else "failed",
            "downstream_delivery": delivery_prepare_state,
        },
        "cadence_artifacts": cadence_artifacts,
        "failure": ({"cadence": failed_cadence, "detail_path": f"{failed_cadence}/failure.json"} if failed_cadence else None),
        "artifacts": ["activity.jsonl", "workspace-proposal.md", "workspace-binding-review.json", "source-readback.json", *cadence_artifacts, "model.json", "index.html"],
    }
    _write_private(run_root / "doctor-receipt.json", json.dumps(receipt, indent=2, ensure_ascii=False))
    _log_event(run_root, "receipt.written", status=status)
    try:
        build_static_evidence_viewer(out_dir=run_root, doctor_run_root=run_root)
    except Exception as error:
        raise DoctorError(f"canonical eval viewer build failed: {error}") from error
    _log_event(run_root, "viewer.built", path="index.html")
    print(json.dumps({
        "status": receipt["status"],
        "run_id": run_id,
        "source_counts": receipt["source_counts"],
        "receipt_sha256": _sha256_file(run_root / "doctor-receipt.json"),
    }))
    return 0 if status == "working" else (1 if status == "needs_information" else 2)


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
    command.add_argument("--profile-home", type=Path, default=DEFAULT_PROFILE)
    command.add_argument("--bindings", type=Path)
    command.add_argument("--run-id")
    command.add_argument(
        "--cadence",
        dest="cadences",
        action="append",
        choices=("daily", "weekly"),
    )
    sync = command.add_mutually_exclusive_group()
    sync.add_argument("--prepare-sync-plan", dest="sync_to_provider", action="store_true")
    sync.add_argument("--no-sync", dest="sync_to_provider", action="store_false")
    command.set_defaults(sync_to_provider=False)
    return command


def main(argv: list[str] | None = None) -> int:
    if argv and argv[0] == "_model":
        worker = argparse.ArgumentParser()
        worker.add_argument("_model")
        worker.add_argument("--request", type=Path, required=True)
        worker.add_argument("--response", type=Path, required=True)
        args = worker.parse_args(argv)
        return model_worker(args.request, args.response)
    return operate(parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

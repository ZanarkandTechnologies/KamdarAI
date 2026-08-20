#!/usr/bin/env python3
"""Run Kamdar's Notion documentation check without external writes.

The current Tasks database has no approved type-to-template map, so every
returned record is reported as an unmapped-template configuration gap. This is
intentional: the runner never invents a rubric or calls the comment endpoint.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

TASKS_DATA_SOURCE_ID = "43a439fd-74c5-4b43-9afb-950f047e5d4f"
TIMEZONE = "Asia/Kuala_Lumpur"
MAX_PAGE_SIZE = 25
ROOT = Path(__file__).resolve().parents[1]
RUNTIME_OUTPUT_DIR = ROOT / "runs"


def utc_window(local_day: date) -> tuple[str, str]:
    zone = ZoneInfo(TIMEZONE)
    start = datetime.combine(local_day, time.min, zone).astimezone(timezone.utc)
    end = datetime.combine(local_day + timedelta(days=1), time.min, zone).astimezone(timezone.utc)
    return start.isoformat().replace("+00:00", "Z"), end.isoformat().replace("+00:00", "Z")


def query_records(start: str, end: str) -> dict:
    body = {
        "filter": {"and": [
            {"timestamp": "last_edited_time", "last_edited_time": {"on_or_after": start}},
            {"timestamp": "last_edited_time", "last_edited_time": {"before": end}},
        ]},
        "sorts": [{"timestamp": "last_edited_time", "direction": "ascending"}],
        "page_size": MAX_PAGE_SIZE,
        "result_type": "page",
    }
    env = os.environ.copy()
    if env.get("NOTION_API_KEY") and not env.get("NOTION_API_TOKEN"):
        env["NOTION_API_TOKEN"] = env["NOTION_API_KEY"]
    result = subprocess.run(
        ["ntn", "api", f"v1/data_sources/{TASKS_DATA_SOURCE_ID}/query", "-X", "POST", "-d", json.dumps(body)],
        text=True, capture_output=True, check=False, env=env,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "ntn query failed")
    payload = json.loads(result.stdout)
    if not isinstance(payload, dict):
        raise RuntimeError("invalid Notion response")
    return payload


def record_summary(item: dict) -> dict:
    props = item.get("properties", {})
    title = props.get("Name", {}).get("title", [])
    name = "".join(part.get("plain_text", "") for part in title if isinstance(part, dict))
    return {
        "page_id": item.get("id"),
        "url": item.get("url"),
        "name": name,
        "last_edited_time": item.get("last_edited_time"),
        "state": "configuration_gap",
        "configuration_gap": "unmapped_template",
        "write": False,
    }


def safe_runtime_output(requested: Path) -> str:
    """Accept one new non-symlinked filename directly inside local runs/."""
    if requested.is_absolute() or len(requested.parts) != 2 or requested.parts[0] != "runs":
        raise ValueError("output_must_be_relative_to:runs")
    filename = requested.parts[1]
    if filename in {"", ".", ".."}:
        raise ValueError("output_path_traversal_rejected")
    RUNTIME_OUTPUT_DIR.mkdir(exist_ok=True)
    if RUNTIME_OUTPUT_DIR.is_symlink() or not RUNTIME_OUTPUT_DIR.is_dir():
        raise ValueError("runtime_output_root_must_be_real_directory")
    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", "--", str(requested)],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if tracked.returncode == 0:
        raise ValueError("runtime_output_must_not_be_tracked")
    return filename


def write_new_runtime_receipt(filename: str, receipt: dict) -> Path:
    """Create one new receipt using directory descriptors to defeat path races."""
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    directory_fd = os.open(RUNTIME_OUTPUT_DIR, directory_flags)
    try:
        output_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
        output_fd = os.open(filename, output_flags, 0o600, dir_fd=directory_fd)
        try:
            with os.fdopen(output_fd, "w", encoding="utf-8") as handle:
                handle.write(json.dumps(receipt, indent=2) + "\n")
        except Exception:
            raise
    finally:
        os.close(directory_fd)
    return RUNTIME_OUTPUT_DIR / filename


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", type=date.fromisoformat, help="Kamdar local date (YYYY-MM-DD)")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        filename = safe_runtime_output(args.output)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    local_day = args.date or datetime.now(ZoneInfo(TIMEZONE)).date()
    start, end = utc_window(local_day)
    response = query_records(start, end)
    records = [record_summary(item) for item in response.get("results", []) if isinstance(item, dict)]
    receipt = {
        "automation": "kamdar-daily-notion-documentation-check",
        "status": "proposal-only",
        "local_date": local_day.isoformat(),
        "timezone": TIMEZONE,
        "utc_window": {"start": start, "end": end},
        "source_data_source_id": TASKS_DATA_SOURCE_ID,
        "records": records,
        "configuration_gaps": ["unmapped_template"],
        "partial": bool(response.get("has_more")),
        "comments_posted": 0,
        "write": False,
    }
    try:
        output = write_new_runtime_receipt(filename, receipt)
    except FileExistsError as error:
        raise SystemExit("runtime_output_must_be_new") from error
    print(json.dumps({"state": "proposal_only_complete", "records": len(records), "write": False, "output": str(output)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Build the evidence viewer model from a delivery-disabled Doctor run."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


FEATURES = {
    "FEAT-0001": ("daily", "Project progress notes"),
    "FEAT-0002": ("daily", "Documentation review"),
    "FEAT-0003": ("daily", "Progress follow-up"),
    "FEAT-0004": ("daily", "Project knowledge notes"),
    "FEAT-0005": ("weekly", "Weekly operating report"),
    "FEAT-0006": ("weekly", "Knowledge promotion"),
    "FEAT-0007": ("weekly", "Next-week carry-forward"),
}


class ViewerError(ValueError):
    pass


def _read(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ViewerError(f"{label} is not valid JSON: {error}") from error
    if not isinstance(value, dict):
        raise ViewerError(f"{label} must be an object")
    return value


def _doctor_judge(root: Path, feature_id: str, cadence: str, outcome: dict[str, Any]) -> dict[str, Any]:
    path = root / cadence / "eval/judges" / f"{feature_id}.json"
    if not path.is_file():
        return {"status": "unjudged", "note": "No matching feature judge was supplied.", "assertions": []}
    judge = _read(path, f"{feature_id} judge")
    if (judge.get("target") or judge.get("feature_id")) != feature_id:
        raise ViewerError(f"{feature_id} judge targets another feature")
    assertions = [{"assertion": row["assertion"], "status": "pass" if row.get("met") else "fail", "evidence": row.get("evidence") or row.get("evidence_refs") or []} for row in judge.get("assertions", [])]
    status = "pass" if judge.get("tier") == "A" and judge.get("verdict") != "fail" and all(row["status"] == "pass" for row in assertions) else "fail"
    if outcome.get("outcome") == "insufficient_information":
        return {"status": "needs_information", "note": "The configured sources do not contain required information.", "assertions": assertions}
    return {"status": status, "note": "Every required assertion passed." if status == "pass" else "One or more required assertions failed.", "assertions": assertions}


def _feature_markdown(preview: str, feature_name: str) -> str:
    """Show the selected feature section while retaining the cadence file as the link target."""
    marker = f"## {feature_name}"
    start = preview.find(marker)
    if start < 0:
        return preview
    end = preview.find("\n## ", start + len(marker))
    return preview[start:end if end >= 0 else None].strip() + "\n"


def _source_cards(snapshot: dict[str, Any], cited: set[Any]) -> list[dict[str, Any]]:
    """Represent both cited data sources and exact records in the inspector."""
    cards = []
    for alias, source in snapshot.get("sources", {}).items():
        metadata = source.get("source") if isinstance(source.get("source"), dict) else {}
        source_id = metadata.get("id")
        records = source.get("records", [])
        if source_id in cited:
            readable_records = []
            for record in records:
                properties = record.get("properties", {}) if isinstance(record, dict) else {}
                readable_records.append({
                    "name": properties.get("Name") or "Untitled record",
                    "status": properties.get("Status") or "Observed",
                    "last_updated": record.get("last_edited_time"),
                })
            cards.append({
                "id": source_id,
                "kind": f"{alias} source",
                "name": metadata.get("title") or alias.title(),
                "status": f"{len(records)} records read",
                "record": {
                    "source": metadata.get("title") or alias.title(),
                    "selected_count": source.get("selected_count", len(records)),
                    "records": readable_records,
                },
            })
        for record in records:
            if record.get("id") not in cited:
                continue
            properties = record.get("properties", {})
            cards.append({
                "id": record.get("id"),
                "kind": alias,
                "name": properties.get("Name") or "Untitled record",
                "status": properties.get("Status") or "Observed",
                "record": record,
            })
    return cards


def build_evidence_model(*, project_root: Path, doctor_run_root: Path) -> dict[str, Any]:
    root = Path(doctor_run_root).resolve()
    receipt = _read(root / "doctor-receipt.json", "Doctor receipt")
    if receipt.get("delivery_state") != "not_requested" or receipt.get("downstream_calls") != 0:
        raise ViewerError("Doctor receipt must prove no delivery and zero downstream calls")
    cached: dict[str, tuple[dict[str, Any], dict[str, Any], str]] = {}
    features = []
    for feature_id, (cadence, name) in FEATURES.items():
        run_state = (receipt.get("automation_runs") or {}).get(cadence, {})
        cadence_status = run_state.get("status")
        if cadence_status in {"failed", "not_run"}:
            preview_path = root / cadence / "preview.md"
            preview = (
                preview_path.read_text(encoding="utf-8")
                if preview_path.is_file()
                else f"# {cadence.replace('-', ' ').title()} not run\n\nThis cadence did not run because an earlier stage failed.\n"
            )
            failed = cadence_status == "failed"
            features.append({
                "id": feature_id,
                "cadence": cadence,
                "name": name,
                "claim": (
                    "The cadence failed production validation; no output was accepted."
                    if failed else "The cadence was not run because an earlier cadence failed."
                ),
                "sources": [],
                "sourceLabel": "Source input · unavailable for accepted evaluation",
                "cases": [{
                    "id": f"real-configured-sources-{feature_id.lower()}",
                    "title": "Real setup-test prepare",
                    "expectedOutput": "A schema-valid delivery-disabled prepare result.",
                }],
                "outputs": [{
                    "id": f"{feature_id}-preview",
                    "label": f"{cadence} failure preview" if failed else f"{cadence} not-run notice",
                    "kind": "Markdown",
                    "state": "failed" if failed else "not_run",
                    "url": f"{cadence}/preview.md" if preview_path.is_file() else "activity.jsonl",
                    "markdown": preview,
                }],
                "status": "fail" if failed else "not_run",
                "statusNote": (
                    "No result passed production validation."
                    if failed else "Blocked by an earlier cadence failure."
                ),
                "assertions": [],
            })
            continue
        if cadence not in cached:
            result = _read(root / cadence / "result.json", f"{cadence} result")
            snapshot = _read(root / cadence / "source-snapshot.json", f"{cadence} source snapshot")
            handoff = _read(root / cadence / "handoff.json", f"{cadence} handoff")
            if handoff.get("mode") != "prepare" or handoff.get("delivery_authorized") is not False or handoff.get("delivery_status") != "not_requested":
                raise ViewerError(f"{cadence} handoff does not prove the delivery-disabled prepare boundary")
            preview = (root / cadence / "preview.md").read_text(encoding="utf-8")
            cached[cadence] = (result, snapshot, preview)
        result, snapshot, preview = cached[cadence]
        outcome = next((row for row in result.get("feature_outcomes", []) if row.get("feature_id") == feature_id), None)
        if not outcome:
            raise ViewerError(f"{cadence} result omits {feature_id}")
        cited = {row.get("source_id") for row in outcome.get("evidence", [])}
        sources = _source_cards(snapshot, cited)
        judge = _doctor_judge(root, feature_id, cadence, outcome)
        features.append({"id": feature_id, "cadence": cadence, "name": name, "claim": outcome.get("reasoning_summary", ""), "sources": sources, "sourceLabel": "Source input · configured PKMS read", "cases": [{"id": f"real-configured-sources-{feature_id.lower()}", "title": "Real setup-test prepare", "expectedOutput": outcome.get("reasoning_summary", "")}], "outputs": [{"id": f"{feature_id}-preview", "label": f"{name} preview", "kind": "Markdown", "state": "linked", "url": f"{cadence}/preview.md", "markdown": _feature_markdown(preview, name)}], "status": judge["status"], "statusNote": judge["note"], "assertions": judge["assertions"]})
    assertions = [row for feature in features for row in feature["assertions"]]
    return {"schemaVersion": "kamdar-evidence-viewer@2.0.0", "runKind": "real-setup-test", "runStatus": receipt.get("status", "unknown"), "deliveryStatus": "not_requested", "rootOutputUrl": None, "metrics": {"features": {"total": len(features), "passed": sum(feature["status"] == "pass" for feature in features)}, "cases": {"total": len(features)}, "checks": {"total": len(assertions), "passed": sum(row["status"] == "pass" for row in assertions)}, "outputs": {"total": len(features)}}, "features": features}

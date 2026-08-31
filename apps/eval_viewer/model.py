"""Build the evidence viewer from PM skill eval cases and an analysis-only receipt."""

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


def _feature_markdown(preview: str, feature_name: str) -> str:
    marker = f"## {feature_name}"
    start = preview.find(marker)
    if start < 0:
        return preview
    end = preview.find("\n## ", start + len(marker))
    return preview[start:end if end >= 0 else None].strip() + "\n"


def _source_cards(snapshot: dict[str, Any], cited: set[Any]) -> list[dict[str, Any]]:
    cards = []
    for alias, source in snapshot.get("sources", {}).items():
        metadata = source.get("source") if isinstance(source.get("source"), dict) else {}
        if metadata.get("id") not in cited:
            continue
        records = source.get("records", [])
        cards.append({
            "id": metadata.get("id"),
            "kind": f"{alias} source",
            "name": metadata.get("title") or alias.title(),
            "status": f"{len(records)} records read",
            "record": {
                "source": metadata.get("title") or alias.title(),
                "selected_count": source.get("selected_count", len(records)),
                "records": [
                    {
                        "name": row.get("properties", {}).get("Name") or "Untitled record",
                        "status": row.get("properties", {}).get("Status") or "Observed",
                        "last_updated": row.get("last_edited_time"),
                    }
                    for row in records
                ],
            },
        })
    return cards


def _judge(root: Path, feature_id: str) -> tuple[str, str, list[dict[str, Any]]]:
    path = root / "eval" / "judges" / f"{feature_id}.json"
    if not path.is_file():
        return "unjudged", "No operated judge was supplied.", []
    value = _read(path, f"{feature_id} judge")
    if (value.get("target") or value.get("feature_id")) != feature_id:
        raise ViewerError(f"{feature_id} judge targets another feature")
    assertions = [
        {
            "assertion": row["assertion"],
            "status": "pass" if row.get("met") else "fail",
            "evidence": row.get("evidence") or row.get("evidence_refs") or [],
        }
        for row in value.get("assertions", [])
    ]
    passed = value.get("tier") == "A" and all(row["status"] == "pass" for row in assertions)
    return ("pass" if passed else "fail", "Every required assertion passed." if passed else "One or more assertions failed.", assertions)


def build_evidence_model(*, project_root: Path, eval_run_root: Path) -> dict[str, Any]:
    project = Path(project_root).resolve()
    run = Path(eval_run_root).resolve()
    receipt = _read(run / "eval-receipt.json", "eval receipt")
    if receipt.get("run_mode") != "analysis_only" or receipt.get("provider_mutations") != 0:
        raise ViewerError("Eval receipt must prove analysis-only mode and zero provider mutations")

    suites = {
        cadence: _read(project / f"skills/pm-{cadence}/evals.json", f"PM {cadence} evals")
        for cadence in ("daily", "weekly")
    }
    features = []
    for feature_id, (cadence, name) in FEATURES.items():
        run_state = (receipt.get("automation_runs") or {}).get(cadence, {})
        if run_state.get("status") in {"failed", "not_run", "blocked_by_setup"}:
            failed = run_state["status"] == "failed"
            features.append({
                "id": feature_id, "cadence": cadence, "name": name,
                "claim": "The cadence failed." if failed else "The cadence was not run.",
                "sources": [], "sourceLabel": "Source input · unavailable",
                "cases": [], "outputs": [], "status": "fail" if failed else "not_run",
                "statusNote": "No output was accepted." if failed else "No operated output exists.",
                "assertions": [],
            })
            continue
        cases = [case for case in suites[cadence]["evals"] if feature_id in case.get("feature_ids", [])]
        outputs = []
        for relative in sorted({path for case in cases for path in case.get("expected_files", [])}):
            path = project / "skills" / f"pm-{cadence}" / relative
            outputs.append({
                "id": relative, "label": path.name, "kind": "Markdown",
                "state": "golden", "url": f"skills/pm-{cadence}/{relative}",
                "markdown": path.read_text(encoding="utf-8"),
            })
        status, note, assertions = _judge(run, feature_id)
        features.append({
            "id": feature_id, "cadence": cadence, "name": name,
            "claim": cases[0]["expected_output"] if cases else "No owned eval case.",
            "sources": [], "sourceLabel": "Frozen input · skill-owned fixtures",
            "cases": [{"id": case["id"], "title": case["case_type"].title(), "expectedOutput": case["expected_output"]} for case in cases],
            "outputs": outputs, "status": status, "statusNote": note,
            "assertions": assertions,
        })
    assertions = [row for feature in features for row in feature["assertions"]]
    return {
        "schemaVersion": "kamdar-evidence-viewer@3.0.0",
        "runKind": "skill-eval", "runStatus": receipt.get("status", "unknown"),
        "deliveryStatus": "analysis_only", "rootOutputUrl": None,
        "metrics": {
            "features": {"total": len(features), "passed": sum(row["status"] == "pass" for row in features)},
            "cases": {"total": sum(len(row["cases"]) for row in features)},
            "checks": {"total": len(assertions), "passed": sum(row["status"] == "pass" for row in assertions)},
            "outputs": {"total": sum(len(row["outputs"]) for row in features)},
        },
        "features": features,
    }

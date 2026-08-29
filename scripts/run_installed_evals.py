#!/usr/bin/env python3
"""Run the packaged network-free Company OS contract evals."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SUITES = {
    "daily": {
        "features": {"FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"},
        "result_keys": {
            "project_updates",
            "documentation_reviews",
            "weekly_progress_chases",
            "knowledge_updates",
        },
    },
    "weekly": {
        "features": {"FEAT-0005", "FEAT-0006", "FEAT-0007"},
        "result_keys": {
            "report_results",
            "promotion_dispositions",
            "next_week_project_replacements",
        },
    },
    "meeting-intake": {
        "features": {"FEAT-0010"},
        "result_keys": {"task_creations", "blocked_commitments"},
    },
}


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected object")
    return value


def feature_ids(suite: dict[str, Any]) -> set[str]:
    """Collect feature ownership from both suite and case-level metadata."""
    discovered = {
        str(row.get("feature_id"))
        for row in suite.get("features", [])
        if isinstance(row, dict) and row.get("feature_id")
    }
    for case in suite.get("evals", []):
        if not isinstance(case, dict):
            continue
        metadata = case.get("metadata") if isinstance(case.get("metadata"), dict) else {}
        extensions = metadata.get("extensions") if isinstance(metadata.get("extensions"), dict) else {}
        kamdar = extensions.get("kamdar") if isinstance(extensions.get("kamdar"), dict) else {}
        discovered.update(str(item) for item in kamdar.get("feature_ids", []))
    return discovered


def evaluate(root: Path) -> dict[str, Any]:
    """Validate packaged suites and expected outputs without provider calls."""
    results: list[dict[str, Any]] = []
    for name, contract in SUITES.items():
        suite_path = root / "evals" / name / "suite.json"
        result_path = root / "evals" / name / "expected" / "result.json"
        errors: list[str] = []
        try:
            suite = read_json(suite_path)
            expected = read_json(result_path)
            cases = suite.get("evals")
            if not isinstance(cases, list) or not cases:
                errors.append("no_eval_cases")
            else:
                for case in cases:
                    if not isinstance(case, dict) or not all(
                        case.get(key) for key in ("id", "prompt", "expected_output", "assertions")
                    ):
                        errors.append("incomplete_eval_case")
                        break
            if feature_ids(suite) != contract["features"]:
                errors.append("feature_coverage_mismatch")
            if not contract["result_keys"].issubset(expected):
                errors.append("expected_result_contract_missing")
            if not str(suite.get("schema_version") or "").startswith("kamdar-"):
                errors.append("suite_schema_version_missing")
            if not str(expected.get("schema_version") or "").startswith("kamdar-"):
                errors.append("result_schema_version_missing")
        except (OSError, ValueError, json.JSONDecodeError) as error:
            errors.append(f"unreadable:{type(error).__name__}")
        results.append(
            {
                "suite": name,
                "status": "pass" if not errors else "fail",
                "features": sorted(contract["features"]),
                "errors": errors,
            }
        )
    return {
        "schema_version": 1,
        "status": "pass" if all(item["status"] == "pass" for item in results) else "fail",
        "mode": "offline_frozen_contract",
        "suites": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    receipt = evaluate(args.root.expanduser().resolve())
    print(json.dumps(receipt, sort_keys=True))
    return 0 if receipt["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())

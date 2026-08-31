#!/usr/bin/env python3
"""Run the packaged network-free Company OS contract evals."""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path
from typing import Any


SUITES = {
    "daily": {
        "features": {"FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"},
        "result_keys": {
            "project_note_updates",
            "documentation_reviews",
            "weekly_progress_chases",
        },
        "contracts": (
            ("schemas.automations.daily_context_diff", "DailyContextDiff", "evals/daily/expected/context.json", None),
            ("schemas.automations.daily_review_result", "DailyReviewResult", "evals/daily/expected/result.json", None),
            ("schemas.automations.daily_integration_receipt", "DailyIntegrationReceipt", "evals/daily/expected/integration-receipt.json", "assert_daily_processing_safety"),
            ("schemas.automations.daily_idempotency_rerun_receipt", "DailyIdempotencyRerunReceipt", "evals/daily/expected/idempotency-receipt.json", None),
        ),
    },
    "weekly": {
        "features": {"FEAT-0005", "FEAT-0006", "FEAT-0007"},
        "result_keys": {
            "report_results",
            "promotion_dispositions",
            "employee_memory_updates",
            "sop_updates",
            "carry_forward_updates",
        },
        "contracts": (
            ("schemas.automations.weekly_context", "WeeklyContext", "evals/weekly/expected/context.json", None),
            ("schemas.automations.weekly_review_result", "WeeklyReviewResult", "evals/weekly/expected/result.json", None),
        ),
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


def validate_contracts(root: Path, contracts: tuple[tuple[str, str, str, str | None], ...]) -> list[str]:
    """Execute the same Pydantic contracts shipped to the client runtime."""
    root_text = str(root)
    if root_text not in sys.path:
        sys.path.insert(0, root_text)
    errors: list[str] = []
    for module_name, model_name, relative, safety_check in contracts:
        try:
            module = importlib.import_module(module_name)
            model = getattr(module, model_name)
            validated = model.model_validate_json(
                (root / relative).read_bytes(), strict=True
            )
            if safety_check:
                getattr(module, safety_check)(validated)
        except Exception as error:  # Report provider/runtime validation failures uniformly.
            errors.append(f"contract_invalid:{relative}:{type(error).__name__}")
    return errors


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
            errors.extend(validate_contracts(root, contract["contracts"]))
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

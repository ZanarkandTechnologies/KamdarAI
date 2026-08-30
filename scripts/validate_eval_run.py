#!/usr/bin/env python3
"""Validate one frozen Daily or Weekly evidence run with Pydantic contracts."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from pydantic import BaseModel


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from schemas.automations.artifact_quality_review import ArtifactQualityReview
from schemas.automations.daily_context_diff import DailyContextDiff
from schemas.automations.daily_idempotency_rerun_receipt import DailyIdempotencyRerunReceipt
from schemas.automations.daily_integration_receipt import DailyIntegrationReceipt, assert_daily_processing_safety
from schemas.automations.daily_review_result import DailyReviewResult
from schemas.automations.weekly_context import WeeklyContext
from schemas.automations.weekly_review_result import WeeklyReviewResult
from schemas.evals import (
    DailyEvidenceReview,
    DailyIntegrationChecks,
    EvalResultEnvelope,
    WeeklyEvidenceReview,
    WeeklyIntegrationChecks,
    validate_feature_judge,
)


CONTRACTS: dict[str, dict[str, tuple[type[BaseModel], Any | None]]] = {
    "daily": {
        "daily-context": (DailyContextDiff, None),
        "daily-review-result": (DailyReviewResult, None),
        "daily-integration-receipt": (DailyIntegrationReceipt, assert_daily_processing_safety),
        "daily-idempotency-rerun-receipt": (DailyIdempotencyRerunReceipt, None),
        "artifact-quality-review": (ArtifactQualityReview, None),
    },
    "weekly": {
        "weekly-context": (WeeklyContext, None),
        "weekly-review-result": (WeeklyReviewResult, None),
        "artifact-quality-review": (ArtifactQualityReview, None),
    },
}


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _safe_relative(value: str) -> Path:
    path = Path(value)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError(f"unsafe run artifact path: {value}")
    return path


def _inventory(root: Path) -> list[str]:
    files: list[str] = []
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"run artifact cannot be a symlink: {path.relative_to(root)}")
        if path.is_file():
            files.append(path.relative_to(root).as_posix())
    return sorted(files)


def validate_run(scope: str, run_root: Path, *, judged: bool = False) -> dict[str, Any]:
    suite = _read_json(PROJECT_ROOT / "evals" / scope / "suite.json")
    artifacts = suite.get("run_artifacts", [])
    if not artifacts:
        raise ValueError(f"{scope} suite has no run_artifacts")
    expected = sorted(
        row["path"]
        for row in artifacts
        if judged or (row.get("stage") in {"base", "freeze", "collect", "extract", "apply", "verify"} and row["path"].startswith(f"{scope}/"))
    )
    observed = _inventory(run_root)
    if observed != expected:
        missing = sorted(set(expected) - set(observed))
        unexpected = sorted(set(observed) - set(expected))
        raise ValueError(f"artifact inventory mismatch; missing={missing}, unexpected={unexpected}")
    validated: list[str] = []
    for row in artifacts:
        if row["path"] not in observed:
            continue
        relative = _safe_relative(row["path"])
        path = (run_root / relative).resolve()
        if run_root.resolve() not in path.parents:
            raise ValueError(f"artifact escaped run root: {relative}")
        value = _read_json(path)
        contract = CONTRACTS[scope].get(row["kind"])
        if contract:
            model, safety_check = contract
            parsed = model.model_validate(value, strict=True)
            if safety_check:
                safety_check(parsed)
            validated.append(row["kind"])
        elif judged and row["kind"].startswith("feature-judge:"):
            feature_id = row["kind"].split(":", 1)[1]
            feature = next(item for item in suite["features"] if item["feature_id"] == feature_id)
            validate_feature_judge(scope=scope, value=value, feature=feature, verdict_path=path)
            validated.append(row["kind"])
        elif judged and row["kind"] in {"evidence-review", "independent-evidence-review"}:
            model = DailyEvidenceReview if scope == "daily" else WeeklyEvidenceReview
            model.model_validate(value, strict=True)
            validated.append(row["kind"])
        elif judged and row["kind"] in {"integration-checks", "mock-integration-checks"}:
            model = DailyIntegrationChecks if scope == "daily" else WeeklyIntegrationChecks
            model.model_validate(value, strict=True)
            validated.append(row["kind"])
        elif judged and row["kind"] in {"deterministic-checks", "suite-result"}:
            EvalResultEnvelope.model_validate(value, strict=True)
            validated.append(row["kind"])
    if scope == "weekly":
        manifest_row = next(row for row in artifacts if row["kind"] == "immutable-run-manifest")
        manifest = _read_json(run_root / manifest_row["path"])
        inventory = {row["path"]: row for row in manifest.get("immutable_inputs", manifest.get("files", []))}
        for kind in ("weekly-context", "weekly-review-result", "mock-integration-receipt", "mock-provider-read-back"):
            artifact = next(row for row in artifacts if row["kind"] == kind)
            path = run_root / artifact["path"]
            expected_row = inventory.get(artifact["path"])
            if not expected_row or expected_row.get("sha256") != hashlib.sha256(path.read_bytes()).hexdigest():
                raise ValueError(f"manifest hash mismatch for {artifact['path']}")
    return {"scope": scope, "stage": "judged" if judged else "base", "status": "pass", "artifacts": observed, "pydantic_contracts": validated}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scope", choices=sorted(CONTRACTS))
    parser.add_argument("run_root", type=Path)
    parser.add_argument("--judged", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = validate_run(args.scope, args.run_root.resolve(), judged=args.judged)
    except Exception as error:
        print(json.dumps({"scope": args.scope, "status": "fail", "error": str(error)}), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

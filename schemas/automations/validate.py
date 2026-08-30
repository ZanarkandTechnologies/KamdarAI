#!/usr/bin/env python3
"""Emit or validate the shipped Pydantic automation contracts."""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter, ValidationError


PROJECT = Path(__file__).resolve().parents[2]
if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))


@dataclass(frozen=True)
class Contract:
    module: str
    model: str
    adapter: bool = False
    safety_check: str | None = None


CONTRACTS = {
    "artifact-quality-review": Contract(
        "schemas.automations.artifact_quality_review", "ArtifactQualityReview"
    ),
    "daily-context": Contract(
        "schemas.automations.daily_context_diff", "DailyContextDiff"
    ),
    "daily-idempotency-rerun-receipt": Contract(
        "schemas.automations.daily_idempotency_rerun_receipt",
        "DailyIdempotencyRerunReceipt",
    ),
    "daily-integration-receipt": Contract(
        "schemas.automations.daily_integration_receipt",
        "DailyIntegrationReceipt",
        safety_check="assert_daily_processing_safety",
    ),
    "daily-review": Contract(
        "schemas.automations.daily_review_result", "DailyReviewResult"
    ),
    "feature-outcome": Contract(
        "schemas.automations.feature_outcome", "FeatureOutcome", adapter=True
    ),
    "meeting-commitment-intake": Contract(
        "schemas.automations.meeting_commitment_intake_result",
        "MeetingCommitmentIntakeResult",
    ),
    "weekly-context": Contract(
        "schemas.automations.weekly_context", "WeeklyContext"
    ),
    "weekly-review": Contract(
        "schemas.automations.weekly_review_result", "WeeklyReviewResult"
    ),
}


def load_contract(name: str) -> tuple[Contract, Any, Any]:
    contract = CONTRACTS[name]
    module = importlib.import_module(contract.module)
    target = getattr(module, contract.model)
    validator = TypeAdapter(target) if contract.adapter else target
    return contract, module, validator


def schema_for(validator: Any) -> dict[str, Any]:
    if isinstance(validator, TypeAdapter):
        return validator.json_schema()
    return validator.model_json_schema()


def validate_with(validator: Any, value: bytes) -> Any:
    if isinstance(validator, TypeAdapter):
        return validator.validate_json(value, strict=True)
    return validator.model_validate_json(value, strict=True)


def read_json_bytes(path: str) -> bytes:
    if path == "-":
        return sys.stdin.buffer.read()
    return Path(path).read_bytes()


def emit(value: Any, *, stream: Any = sys.stdout) -> None:
    print(json.dumps(value, sort_keys=True, default=str), file=stream)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    schema = subparsers.add_parser("schema", help="emit provider-neutral JSON Schema")
    schema.add_argument("contract", choices=sorted(CONTRACTS))
    validate = subparsers.add_parser("validate", help="validate one JSON artifact")
    validate.add_argument("contract", choices=sorted(CONTRACTS))
    validate.add_argument("path", help="JSON file path or - for stdin")
    validate.add_argument(
        "--processing-safety",
        action="store_true",
        help="also run the receipt processing-safety guard",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    contract, module, validator = load_contract(args.contract)
    if args.command == "schema":
        emit(schema_for(validator))
        return 0
    try:
        value = read_json_bytes(args.path)
        validated = validate_with(validator, value)
        if args.processing_safety:
            if not contract.safety_check:
                raise ValueError(
                    f"{args.contract} does not define a processing-safety guard"
                )
            getattr(module, contract.safety_check)(validated)
    except (OSError, json.JSONDecodeError, ValidationError, ValueError) as error:
        details = error.errors() if isinstance(error, ValidationError) else [str(error)]
        emit(
            {"contract": args.contract, "errors": details, "status": "fail"},
            stream=sys.stderr,
        )
        return 1
    emit({"contract": args.contract, "status": "pass"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

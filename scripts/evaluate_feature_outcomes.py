#!/usr/bin/env python3
"""Evaluate evidence-backed feature outcomes with their Pydantic contract."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter, ValidationError

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from schemas.automations.feature_outcome import FeatureOutcome


FORBIDDEN_WRITE_CLAIMS = (
    re.compile(r"\b(?:notion|provider|integration|page|record|task|message)\b[^.\n]{0,80}\b(?:updated|created|applied|sent|delivered|written|posted|pushed|saved)\b", re.IGNORECASE),
    re.compile(r"\b(?:updated|created|applied|sent|delivered|wrote|posted|pushed|saved)\b[^.\n]{0,80}\b(?:notion|provider|integration|page|record|task|message)\b", re.IGNORECASE),
)
ADAPTER = TypeAdapter(FeatureOutcome)


def compare_feature_outcome(case: dict[str, Any]) -> dict[str, Any]:
    generated, expected = case["generated_response"], case["expected_response"]
    errors: list[dict[str, str]] = []
    try:
        parsed = ADAPTER.validate_python(generated, strict=True)
    except ValidationError as error:
        parsed = None
        errors = [{"path": ".".join(str(item) for item in row["loc"]), "message": row["msg"]} for row in error.errors()]
    valid = parsed is not None
    evidence_ids = sorted(item.source_id for item in parsed.evidence) if parsed else []
    gap_codes = sorted(item.code for item in parsed.information_gaps) if parsed else []
    reasoning = parsed.reasoning_summary.lower() if parsed else ""
    observations = "\n".join(item.observation.lower() for item in parsed.evidence) if parsed else ""
    text = json.dumps(generated).lower()
    checks = {
        "generated_response_matches_schema": valid,
        "feature_id_matches": valid and parsed.feature_id == expected["feature_id"],
        "outcome_matches": valid and parsed.outcome == expected["outcome"],
        "evidence_sources_match": evidence_ids == sorted(expected["evidence_source_ids"]),
        "output_refs_match": valid and sorted(parsed.output_refs) == sorted(expected["output_refs"]),
        "information_gaps_match": gap_codes == sorted(expected["information_gap_codes"]),
        "reasoning_matches_reference": valid and all(term.lower() in reasoning for term in expected["reasoning_must_include"]),
        "evidence_observations_match": valid and all(term.lower() in observations for term in expected["evidence_observations_must_include"]),
        "no_downstream_write_claims": valid and all(not pattern.search(text) for pattern in FORBIDDEN_WRITE_CLAIMS),
        "reference_points_present": bool(case["reference_points"]),
    }
    return {"id": case["id"], "description": case["description"], "pass": all(checks.values()), "generated_response": generated, "expected_response": expected, "reference_points": case["reference_points"], "checks": checks, "schema_errors": errors}


def evaluate_suite(suite: dict[str, Any]) -> dict[str, Any]:
    cases = [compare_feature_outcome(case) for case in suite["cases"]]
    passed = sum(case["pass"] for case in cases)
    return {"schema_version": "kamdar-feature-outcome-eval-report@1.0.0", "suite": suite["suite"], "pass": passed == len(cases), "summary": {"total": len(cases), "passed": passed, "failed": len(cases) - passed}, "cases": cases}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("suite", type=Path, nargs="?", default=ROOT / "evals/feature-outcomes/suite.json")
    args = parser.parse_args(argv)
    report = evaluate_suite(json.loads(args.suite.read_text(encoding="utf-8")))
    print(json.dumps(report, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.validate_eval_run import validate_run
from schemas.evals import validate_feature_judge
from scripts.evaluate_feature_outcomes import evaluate_suite


ROOT = Path(__file__).resolve().parents[3]


class ValidateEvalRunTests(unittest.TestCase):
    def materialize(self, scope: str) -> Path:
        root = Path(self.temporary.name)
        suite = json.loads((ROOT / f"evals/{scope}/suite.json").read_text(encoding="utf-8"))
        expected = ROOT / f"evals/{scope}/expected"
        mapping = {
            "daily-context": "context.json",
            "daily-review-result": "result.json",
            "daily-integration-receipt": "integration-receipt.json",
            "daily-idempotency-rerun-receipt": "idempotency-receipt.json",
            "immutable-run-manifest": "run-manifest.json",
            "weekly-context": "context.json",
            "weekly-review-result": "result.json",
            "mock-integration-receipt": "integration-receipt.json",
            "mock-provider-read-back": "integration-read-back.json",
        }
        for row in suite["run_artifacts"]:
            source = mapping.get(row["kind"])
            if source and (expected / source).is_file():
                target = root / row["path"]
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(expected / source, target)
        return root

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_daily_base_run_validates_with_pydantic(self) -> None:
        result = validate_run("daily", self.materialize("daily"))
        self.assertEqual(result["status"], "pass")
        self.assertIn("daily-review-result", result["pydantic_contracts"])

    def test_weekly_base_run_validates_manifest_and_pydantic(self) -> None:
        result = validate_run("weekly", self.materialize("weekly"))
        self.assertEqual(result["status"], "pass")
        self.assertIn("weekly-review-result", result["pydantic_contracts"])

    def test_unexpected_artifact_fails_closed(self) -> None:
        root = self.materialize("daily")
        (root / "unexpected.json").write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "artifact inventory mismatch"):
            validate_run("daily", root)

    def test_daily_feature_judge_is_pydantic_and_suite_bound(self) -> None:
        verdict_path = Path(self.temporary.name).resolve() / "FEAT-0001.json"
        feature = {"feature_id": "FEAT-0001", "assertions": ["Grounded update"]}
        value = {
            "feature_id": "FEAT-0001",
            "tier": "A",
            "verdict": "pass",
            "rubric": {key: "A" for key in ("groundedness", "completeness", "usefulness", "repeatability", "length_balance")},
            "assertions": [{"assertion": "Grounded update", "met": True, "evidence_refs": ["/result/0"]}],
            "evidence_refs": ["/result/0"],
            "failures": [],
            "verdict_path": str(verdict_path),
            "packet_sha256": "a" * 64,
        }
        validate_feature_judge(scope="daily", value=value, feature=feature, verdict_path=verdict_path)
        value["assertions"][0]["assertion"] = "Different assertion"
        with self.assertRaisesRegex(ValueError, "authored assertion"):
            validate_feature_judge(scope="daily", value=value, feature=feature, verdict_path=verdict_path)

    def test_reference_feature_outcome_suite_passes(self) -> None:
        suite = json.loads(
            (ROOT / "evals/feature-outcomes/suite.json").read_text(encoding="utf-8")
        )
        report = evaluate_suite(suite)
        self.assertTrue(report["pass"])
        self.assertEqual(
            report["summary"], {"total": 3, "passed": 3, "failed": 0}
        )


if __name__ == "__main__":
    unittest.main()

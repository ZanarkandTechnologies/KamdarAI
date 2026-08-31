from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
MODULE = "schemas.automations.validate"


class ValidateAutomationContractTests(unittest.TestCase):
    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-m", MODULE, *args],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_schema_command_emits_provider_neutral_json_schema(self) -> None:
        result = self.run_cli("schema", "daily-review")
        self.assertEqual(result.returncode, 0, result.stderr)
        schema = json.loads(result.stdout)
        self.assertEqual(schema["type"], "object")
        self.assertIn("project_note_updates", schema["properties"])
        self.assertNotIn("project_updates", schema["properties"])

    def test_all_packaged_golden_contracts_validate_with_pydantic(self) -> None:
        cases = (
            ("daily-context", "evals/daily/expected/context.json"),
            ("daily-review", "evals/daily/expected/result.json"),
            ("daily-integration-receipt", "evals/daily/expected/integration-receipt.json"),
            ("daily-idempotency-rerun-receipt", "evals/daily/expected/idempotency-receipt.json"),
            ("weekly-context", "evals/weekly/expected/context.json"),
            ("weekly-review", "evals/weekly/expected/result.json"),
            ("meeting-commitment-intake", "evals/meeting-intake/expected/result.json"),
        )
        for contract, path in cases:
            with self.subTest(contract=contract):
                args = ["validate", contract, path]
                if contract == "daily-integration-receipt":
                    args.append("--processing-safety")
                result = self.run_cli(*args)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "pass")

    def test_invalid_extraction_fails_closed(self) -> None:
        source = json.loads(
            (ROOT / "evals/daily/expected/result.json").read_text(encoding="utf-8")
        )
        source["feature_outcomes"] = []
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "invalid.json"
            path.write_text(json.dumps(source), encoding="utf-8")
            result = self.run_cli("validate", "daily-review", str(path))
        self.assertEqual(result.returncode, 1)
        receipt = json.loads(result.stderr)
        self.assertEqual(receipt["status"], "fail")
        self.assertTrue(receipt["errors"])

    def test_isolated_client_contract_package_runs_with_python_sources_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary)
            for source in (ROOT / "schemas/automations").glob("*.py"):
                destination = target / source.relative_to(ROOT)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
            self.assertTrue(all(path.suffix == ".py" for path in target.rglob("*.*")))
            environment = os.environ.copy()
            environment.pop("PYTHONPATH", None)
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    MODULE,
                    "validate",
                    "daily-review",
                    str(ROOT / "evals/daily/expected/result.json"),
                ],
                cwd=target,
                env=environment,
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "pass")


if __name__ == "__main__":
    unittest.main()

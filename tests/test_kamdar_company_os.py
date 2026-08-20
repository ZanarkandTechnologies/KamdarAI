from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class KamdarCompanyOSTests(unittest.TestCase):
    def test_repository_uses_lean_source_layout(self) -> None:
        for expected in ("configs", "automations", "skills", "evals", "scripts", "tests"):
            self.assertTrue((ROOT / expected).is_dir(), expected)
        for removed in ("profile", "context", "deploy", "hermes-distribution"):
            self.assertFalse((ROOT / removed).exists(), removed)
        self.assertTrue((ROOT / "skills/setup-kamdar-workspace/SKILL.md").is_file())
        self.assertFalse((ROOT / "hermes-profile.yaml").exists())

    def test_automation_markdown_contracts_exist(self) -> None:
        expected = {
            "automations/daily-notion-documentation-check.md": "proposal-only",
            "automations/daily-operating-update.md": "proposal-only",
            "automations/weekly-operating-review.md": "proposal-only",
        }
        for relative, marker in expected.items():
            content = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn(marker, content)
            self.assertIn("Write boundary", content)

    def test_live_context_is_ignored_but_reviewable_config_is_tracked(self) -> None:
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("/.hermes.md", ignored)
        proposal = (ROOT / "configs/workspace.hermes.md").read_text(encoding="utf-8")
        self.assertIn('company_timezone: "Asia/Kuala_Lumpur"', proposal)
        self.assertIn("unmapped_template", proposal)
        self.assertIn("proposal-only", proposal)

    def test_eval_suite_covers_required_safety_cases(self) -> None:
        suite = json.loads((ROOT / "evals/kamdar-company-os.json").read_text(encoding="utf-8"))
        ids = {case["id"] for case in suite["cases"]}
        self.assertTrue({
            "notion-project-lookup", "gmail-kamdar-bounded-search", "drive-root-lookup",
            "unmapped-notion-template", "incomplete-documentation-proposal",
            "duplicate-comment-prevention", "proposal-only-write-refusal",
        }.issubset(ids))

    def test_filesystem_eval_cases_cover_daily_and_weekly_manager_loops(self) -> None:
        cases = ROOT / "evals/filesystem/cases"
        daily = json.loads((cases / "daily-department-operating-update.json").read_text(encoding="utf-8"))
        weekly = json.loads((cases / "weekly-department-operating-review.json").read_text(encoding="utf-8"))
        self.assertEqual(daily["id"], "daily-department-operating-update")
        self.assertEqual(weekly["id"], "weekly-department-operating-review")
        self.assertTrue(all(row["event"] in {"created", "modified", "deleted"}
                            for case in (daily, weekly) for row in case["file_assertions"]))
        self.assertIn("sent", daily["file_assertions"][2]["content"]["absent"])
        self.assertIn("approved", weekly["file_assertions"][1]["content"]["absent"])

    def test_proposed_context_validates(self) -> None:
        result = subprocess.run(
             [sys.executable, str(ROOT / "scripts/validate_company_context.py"),
             "--context", str(ROOT / "configs/workspace.hermes.md")],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("context_valid=true", result.stdout)

    def test_daily_runner_is_hardwired_to_proposal_only(self) -> None:
        runner = (ROOT / "scripts/run_daily_documentation_check.py").read_text(encoding="utf-8")
        self.assertIn('"status": "proposal-only"', runner)
        self.assertIn('"comments_posted": 0', runner)
        self.assertNotIn('comments -X POST', runner)
        self.assertNotIn('"--apply"', runner)
        self.assertNotIn('comment_policy", "approved"', runner)

    def test_daily_runner_rejects_tracked_output_path(self) -> None:
        result = subprocess.run(
             [sys.executable, str(ROOT / "scripts/run_daily_documentation_check.py"),
             "--date", "2026-08-20", "--output", str(ROOT / "configs/workspace.hermes.md")],
            text=True, capture_output=True, check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("output_must_be_relative_to:runs", result.stderr)

    def test_daily_runner_rejects_symlinked_runs_root(self) -> None:
        runner = (ROOT / "scripts/run_daily_documentation_check.py").read_text(encoding="utf-8")
        self.assertIn("runtime_output_root_must_be_real_directory", runner)
        self.assertIn("runtime_output_must_not_be_tracked", runner)
        self.assertIn("O_NOFOLLOW", runner)
        self.assertIn("O_EXCL", runner)


if __name__ == "__main__":
    unittest.main()

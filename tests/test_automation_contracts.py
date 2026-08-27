from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AutomationContractTests(unittest.TestCase):
    def test_automations_own_daily_and_weekly_execution(self) -> None:
        daily = (ROOT / "automations/daily-operating-update.md").read_text(encoding="utf-8")
        weekly = (ROOT / "automations/weekly-operating-review.md").read_text(encoding="utf-8")
        for automation in (daily, weekly):
            self.assertIn("workspace.hermes.md", automation)
            self.assertIn("ntn --help", automation)
            self.assertNotIn("skills/kamdar-company-os", automation)
        self.assertIn("DailyReviewResultSchema", daily)
        self.assertIn("weekly-review-result.zod.mjs", weekly)

    def test_only_setup_and_onboarding_skills_remain(self) -> None:
        skills = sorted(path.name for path in (ROOT / "skills").iterdir() if path.is_dir())
        self.assertEqual(skills, ["notion-webhook-onboarding", "setup-kamdar-workspace"])


if __name__ == "__main__":
    unittest.main()

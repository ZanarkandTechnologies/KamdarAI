from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class KamdarCompanyOSTests(unittest.TestCase):
    def test_automation_markdown_contracts_exist(self) -> None:
        daily = (ROOT / "automations/daily-operating-update.md").read_text(encoding="utf-8")
        weekly = (ROOT / "automations/weekly-operating-review.md").read_text(encoding="utf-8")
        for automation, cadence in ((daily, "daily"), (weekly, "weekly")):
            self.assertIn(f"cadence: {cadence}", automation)
            self.assertIn("## Authority", automation)
            self.assertIn("workspace.hermes.md", automation)
            self.assertIn("ntn --help", automation)
            self.assertNotIn("skills/kamdar-company-os", automation)
        self.assertIn("skills/pm-daily/SKILL.md", daily)
        self.assertIn("skills/pm-weekly/SKILL.md", weekly)
        sync_start = weekly.index("**4 — Sync authorized artifacts")
        self.assertGreater(weekly.index("Create one-way provider copies"), sync_start)
        self.assertNotIn("javascript", daily.lower())
        self.assertNotIn("javascript", weekly.lower())

    def test_runtime_setup_installs_only_the_two_pm_skills(self) -> None:
        skills = ROOT / "skills"
        packages = sorted(path.parent.name for path in skills.glob("*/SKILL.md")) if skills.exists() else []
        self.assertEqual(packages, ["pm-daily", "pm-weekly"])
        self.assertTrue((ROOT / "apps/installer/profile.py").is_file())
        self.assertTrue((ROOT / "apps/installer/workspace.py").is_file())

    def test_live_context_is_ignored_but_reviewable_config_is_tracked(self) -> None:
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("/.hermes.md", ignored)
        proposal = (ROOT / "workspace.hermes.md").read_text(encoding="utf-8")
        self.assertIn('company_timezone: "Asia/Kuala_Lumpur"', proposal)
        self.assertIn("workspace/skills/pm-*/templates/", proposal)
        self.assertIn("unmapped_template", proposal)
        self.assertIn("meeting_block_parse_gap", proposal)
        self.assertIn("proposal-only", proposal)

    def test_three_docs_and_two_skills_own_product_behavior(self) -> None:
        docs = sorted(path.name for path in (ROOT / "docs").glob("*.md"))
        self.assertEqual(docs, ["autonomous-testing.md", "operator-guide.md", "prd.md"])
        for removed in ("features", "research", "systems"):
            self.assertFalse((ROOT / "docs" / removed).exists())
        prd = (ROOT / "docs/prd.md").read_text(encoding="utf-8")
        operator = (ROOT / "docs/operator-guide.md").read_text(encoding="utf-8")
        for skill in ("pm-daily", "pm-weekly"):
            self.assertIn(f"skills/{skill}/SKILL.md", prd)
            self.assertIn(f"skills/{skill}/SKILL.md", operator)

    def test_template_registry_has_pinned_and_derived_contracts(self) -> None:
        expected = {
            "templates/project.md": "company-os-project",
            "templates/person.md": "company-os-person",
            "templates/task.md": "company-os-task",
            "templates/feature.md": "company-os-feature",
            "templates/decision.md": "company-os-decision",
            "skills/pm-weekly/templates/weekly-report.md": "company-os-weekly-report",
            "skills/pm-weekly/templates/area-operating-rollup.md": "kamdar-area-operating-rollup",
            "skills/pm-weekly/templates/company-operating-rollup.md": "kamdar-company-operating-rollup",
            "skills/pm-daily/templates/employee-followups.md": "kamdar-employee-followups",
            "skills/pm-daily/templates/documentation-request.md": "kamdar-documentation-request",
            "templates/sop.md": "kamdar-employee-sop",
            "skills/pm-weekly/templates/executive-distribution.md": "kamdar-executive-distribution",
            "templates/issue.md": "kamdar-issue",
            "templates/meeting.md": "kamdar-meeting",
        }
        for filename, template_id in expected.items():
            content = (ROOT / filename).read_text(encoding="utf-8")
            self.assertIn(f"template_id: {template_id}", content, filename)
            self.assertIn("template_version:", content, filename)
        for filename in expected:
            content = (ROOT / filename).read_text(encoding="utf-8")
            self.assertNotIn("required_properties:", content, filename)
            self.assertNotIn("upstream_source:", content, filename)

        shared_work_fields = ("work_item_id", "project", "department", "owner", "type",
                              "status", "priority", "start_date", "due_date", "progress",
                              "last_meaningful_update")
        for filename in ("task.md", "feature.md", "issue.md", "meeting.md"):
            content = (ROOT / "templates" / filename).read_text(encoding="utf-8")
            for field in shared_work_fields:
                self.assertIn(f"{field}:", content, f"{filename}: {field}")

        for filename in (
            "templates/project.md", "templates/task.md", "templates/feature.md", "templates/issue.md", "templates/meeting.md",
            "skills/pm-weekly/templates/weekly-report.md", "skills/pm-weekly/templates/area-operating-rollup.md", "skills/pm-weekly/templates/company-operating-rollup.md",
            "templates/decision.md", "templates/sop.md",
        ):
            content = (ROOT / filename).read_text(encoding="utf-8")
            self.assertIn("GOLDEN EXAMPLE", content, filename)

        person = (ROOT / "templates/person.md").read_text(encoding="utf-8")
        for field in ("preferred_contact_channel", "approved_contact_channels",
                      "contact_endpoint", "contact_instructions", "timezone", "expertise"):
            self.assertIn(f"{field}:", person, field)
        self.assertIn("Persistent operating memory", person)
        self.assertIn("Latest weekly evidence", person)
        self.assertIn("private local context", person)

        sop = (ROOT / "templates/sop.md").read_text(encoding="utf-8")
        self.assertIn("Long-term context", sop)
        self.assertIn("Short-term interval context", sop)

        weekly = (ROOT / "skills/pm-weekly/templates/weekly-report.md").read_text(encoding="utf-8")
        for section in (
            "Summary", "Outcomes and open attention", "Problems and inefficiencies",
            "Decisions", "SOPs", "Next-week priorities",
        ):
            self.assertIn(f"## {section}", weekly)

    def test_proposed_context_validates(self) -> None:
        result = subprocess.run(
             [sys.executable, str(ROOT / "apps/installer/validate_context.py"),
             "--context", str(ROOT / "workspace.hermes.md")],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("context_valid=true", result.stdout)

if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
        self.assertIn("validate daily-review", daily)
        self.assertIn("weekly_review_result.py", weekly)
        self.assertNotIn("javascript", daily.lower())
        self.assertNotIn("javascript", weekly.lower())

    def test_runtime_setup_does_not_depend_on_agent_skills(self) -> None:
        skills = ROOT / "skills"
        packages = sorted(path.parent.name for path in skills.glob("*/SKILL.md")) if skills.exists() else []
        self.assertEqual(packages, [])
        self.assertTrue((ROOT / "scripts/setup_profile.py").is_file())
        self.assertTrue((ROOT / "scripts/setup_workspace.py").is_file())

    def test_live_context_is_ignored_but_reviewable_config_is_tracked(self) -> None:
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("/.hermes.md", ignored)
        proposal = (ROOT / "workspace.hermes.md").read_text(encoding="utf-8")
        self.assertIn('company_timezone: "Asia/Kuala_Lumpur"', proposal)
        self.assertIn("workspace/templates/{project,person,task,feature,issue,meeting,decision,skill,sop,weekly-report,area-operating-rollup,company-operating-rollup}.md", proposal)
        self.assertIn("unmapped_template", proposal)
        self.assertIn("meeting_block_parse_gap", proposal)
        self.assertIn("proposal-only", proposal)

    def test_feature_docs_and_system_map_own_the_pipeline_inventory(self) -> None:
        feature_docs = [next((ROOT / "docs/features").glob(f"FEAT-{index:04d}-*.md")) for index in range(1, 8)]
        self.assertEqual(len(feature_docs), 7)
        for index, path in enumerate(feature_docs, start=1):
            content = path.read_text(encoding="utf-8")
            self.assertIn(f"feature_id: FEAT-{index:04d}", content, path.name)
            self.assertIn("system_id: SYS-0001", content, path.name)
            for section in (
                "## Why it exists",
                "## Trigger and inputs",
                "## Pipeline signature",
                "## Flow",
                "## State changes and artifacts",
                "## Downstream application",
                "## Failure modes",
                "## Proof contract",
                "## Example",
            ):
                self.assertIn(section, content, f"{path.name}: {section}")
        system = (ROOT / "docs/systems/company-os.md").read_text(encoding="utf-8")
        for index in range(1, 8):
            self.assertIn(f"FEAT-{index:04d}", system)
        for destination in ("NOTION / WIKI", "GOOGLE DRIVE", "EMAIL / TELEGRAM"):
            self.assertIn(destination, system)

    def test_template_registry_has_pinned_and_derived_contracts(self) -> None:
        expected = {
            "project.md": "company-os-project",
            "person.md": "company-os-person",
            "task.md": "company-os-task",
            "feature.md": "company-os-feature",
            "decision.md": "company-os-decision",
            "weekly-report.md": "company-os-weekly-report",
            "area-operating-rollup.md": "kamdar-area-operating-rollup",
            "company-operating-rollup.md": "kamdar-company-operating-rollup",
            "daily-operating-evidence.md": "kamdar-daily-operating-evidence",
            "employee-followups.md": "kamdar-employee-followups",
            "automation-receipt.md": "kamdar-automation-receipt",
            "documentation-request.md": "kamdar-documentation-request",
            "knowledge-candidates.md": "kamdar-knowledge-candidates",
            "skill.md": "company-os-skill",
            "sop.md": "kamdar-employee-sop",
            "executive-distribution.md": "kamdar-executive-distribution",
            "issue.md": "kamdar-issue",
            "meeting.md": "kamdar-meeting",
        }
        for filename, template_id in expected.items():
            content = (ROOT / "templates" / filename).read_text(encoding="utf-8")
            self.assertIn(f"template_id: {template_id}", content, filename)
            self.assertIn("template_version:", content, filename)
        for filename in expected:
            content = (ROOT / "templates" / filename).read_text(encoding="utf-8")
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
            "project.md", "task.md", "feature.md", "issue.md", "meeting.md",
            "weekly-report.md", "area-operating-rollup.md", "company-operating-rollup.md",
            "decision.md", "skill.md", "sop.md",
        ):
            content = (ROOT / "templates" / filename).read_text(encoding="utf-8")
            self.assertIn("GOLDEN EXAMPLE", content, filename)

        person = (ROOT / "templates/person.md").read_text(encoding="utf-8")
        for field in ("preferred_contact_channel", "approved_contact_channels",
                      "contact_endpoint", "contact_instructions", "timezone", "expertise"):
            self.assertIn(f"{field}:", person, field)

        weekly = (ROOT / "templates/weekly-report.md").read_text(encoding="utf-8")
        for section in (
            "Summary", "Outcomes and open attention", "Problems and inefficiencies",
            "Decisions", "SOPs", "Next-week priorities",
        ):
            self.assertIn(f"## {section}", weekly)

    def test_proposed_context_validates(self) -> None:
        result = subprocess.run(
             [sys.executable, str(ROOT / "scripts/validate_company_context.py"),
             "--context", str(ROOT / "workspace.hermes.md")],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("context_valid=true", result.stdout)

if __name__ == "__main__":
    unittest.main()

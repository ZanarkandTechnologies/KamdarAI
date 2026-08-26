from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class KamdarCompanyOSTests(unittest.TestCase):
    def test_repository_uses_lean_source_layout(self) -> None:
        for expected in ("automations", "docs", "templates", "skills", "evals", "scripts", "tests"):
            self.assertTrue((ROOT / expected).is_dir(), expected)
        for removed in ("profile", "context", "deploy", "hermes-distribution"):
            self.assertFalse((ROOT / removed).exists(), removed)
        self.assertTrue((ROOT / "skills/setup-kamdar-workspace/SKILL.md").is_file())
        self.assertTrue((ROOT / "skills/kamdar-company-os/SKILL.md").is_file())
        self.assertFalse((ROOT / "skills/kamdar-company-os/evals").exists())
        self.assertTrue((ROOT / "workspace.hermes.md").is_file())
        self.assertFalse((ROOT / "configs").exists())
        self.assertFalse((ROOT / "hermes-profile.yaml").exists())

    def test_automation_markdown_contracts_exist(self) -> None:
        expected = {
            "automations/daily-notion-documentation-check.md": "status: retired",
            "automations/daily-operating-update.md": "cadence: daily",
            "automations/weekly-operating-review.md": "cadence: weekly",
        }
        for relative, marker in expected.items():
            content = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn(marker, content)
            self.assertIn("Write boundary", content)

    def test_live_context_is_ignored_but_reviewable_config_is_tracked(self) -> None:
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("/.hermes.md", ignored)
        proposal = (ROOT / "workspace.hermes.md").read_text(encoding="utf-8")
        self.assertIn('company_timezone: "Asia/Kuala_Lumpur"', proposal)
        self.assertIn("workspace/templates/{project,person,task,feature,issue,meeting,decision,skill,sop,weekly-report,area-operating-rollup,company-operating-rollup}.md", proposal)
        self.assertIn("unmapped_template", proposal)
        self.assertIn("meeting_block_parse_gap", proposal)
        self.assertIn("proposal-only", proposal)

    def test_template_first_eval_is_the_canonical_contract(self) -> None:
        suite = json.loads((ROOT / "evals/evals.json").read_text(encoding="utf-8"))
        self.assertEqual(suite["schema_version"], "0.4.0")
        self.assertEqual(suite["status"], "legacy-frozen-showcase")
        self.assertIn("daily-context-diff", suite["successor_proof"])
        self.assertEqual(suite["render_contract"]["ui"], "buyer-story-feature-results")
        scenario = suite["scenarios"][0]
        self.assertEqual(scenario["id"], "daily-weekly-complete-showcase")
        records = scenario["assertions"]["records"]
        files = scenario["assertions"]["files"]
        behavior = scenario["assertions"]["behavior"]
        self.assertEqual(len(records), 11)
        self.assertEqual(len(files), 12)
        self.assertEqual(len(behavior), 26)
        self.assertEqual({row["event"] for row in files}, {"created", "modified"})
        self.assertEqual(sum(row["event"] == "modified" for row in files), 1)
        self.assertTrue(all(row["template"]["path"].startswith("templates/") for row in files))
        self.assertTrue(all(row["target"]["database"] and row["expected_count"] > 0
                            for row in records))
        self.assertIn("hidden-meeting-blocks", {row["id"] for row in behavior})
        self.assertIn("proposal-only", {row["id"] for row in behavior})

        features = suite["features"]
        feature_ids = {row["id"] for row in features}
        self.assertEqual(feature_ids, {f"FEAT-{index:04d}" for index in range(1, 8)})
        self.assertEqual(len({row["key"] for row in features}), len(features))
        self.assertTrue(all((ROOT / row["doc"]).is_file() for row in features))
        self.assertTrue(all(row["key"] and row["source_link_ids"] for row in features))
        source_ids = {row["id"] for row in scenario["source_links"]}
        self.assertEqual(len(source_ids), 5)
        self.assertTrue(all(row["url"].startswith("https://") for row in scenario["source_links"]))
        self.assertTrue(all(set(row["source_link_ids"]).issubset(source_ids) for row in features))
        assertions = records + files + behavior
        self.assertTrue(all(row.get("feature_id") in feature_ids for row in assertions))
        self.assertEqual(feature_ids - {row["feature_id"] for row in assertions}, set())
        environment = suite["showcase_environment"]
        self.assertEqual(environment["label"], "Kamdar AI · Eval Demo")
        self.assertEqual(len(environment["databases"]), 7)
        self.assertTrue(all(row["url"].startswith("https://") for row in environment["databases"]))

    def test_feature_docs_and_system_map_own_the_pipeline_inventory(self) -> None:
        suite = json.loads((ROOT / "evals/evals.json").read_text(encoding="utf-8"))
        feature_docs = [ROOT / row["doc"] for row in suite["features"]]
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
        system = (ROOT / "docs/systems/kamdar-company-os.md").read_text(encoding="utf-8")
        for index in range(1, 8):
            self.assertIn(f"FEAT-{index:04d}", system)
        for destination in ("NOTION / WIKI", "GOOGLE DRIVE", "EMAIL / TELEGRAM"):
            self.assertIn(destination, system)
        ui_prototype = (ROOT / "tickets/TASK-0002/ascii-prototype.md").read_text(encoding="utf-8")
        self.assertIn("CURRENT TEMPLATE CONTENT ASSERTIONS", ui_prototype)
        self.assertIn("PROPOSED FEATURE CONTENT ASSERTIONS", ui_prototype)
        self.assertIn("replaces only Section 5", ui_prototype)
        self.assertIn("ASCII comparison: available here, not in the buyer summary", ui_prototype)

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

    def test_legacy_proof_surfaces_are_explicitly_superseded(self) -> None:
        legacy_suite = json.loads((ROOT / "evals/kamdar-company-os.json").read_text(encoding="utf-8"))
        self.assertEqual(legacy_suite["status"], "superseded")
        self.assertEqual(legacy_suite["replacement"], "evals/evals.json")
        legacy_readme = (ROOT / "evals/filesystem/README.md").read_text(encoding="utf-8")
        self.assertIn("earlier 37-check reduced-fixture baseline", legacy_readme)
        self.assertIn("../evals.json", legacy_readme)

    def test_live_poc_adapter_is_read_only_preflight_and_namespaces_the_eval(self) -> None:
        adapter = (ROOT / "evals/filesystem/scripts/live-kamdar-poc.mjs").read_text(encoding="utf-8")
        self.assertIn("runTemplateFirstProof", adapter)
        self.assertIn("Kamdar AI · Eval Demo", adapter)
        self.assertIn("read-only-preflight", adapter)
        self.assertIn("provider_apply_not_implemented", adapter)
        self.assertIn("validateProviderReceipt", adapter)
        self.assertIn("route_registry", adapter)
        self.assertIn("runtime-showcase/kamdar-ai-eval-demo-v4", adapter)
        self.assertNotIn("@outlook.com", adapter)
        self.assertNotIn("archivePage", adapter)
        self.assertNotIn("ensureTemplateLibrary", adapter)
        self.assertNotIn("create_stale_progress_comment", adapter)
        self.assertNotIn("drive delete", adapter)
        self.assertNotIn('["drive", "share"', adapter)

    def test_proposed_context_validates(self) -> None:
        result = subprocess.run(
             [sys.executable, str(ROOT / "scripts/validate_company_context.py"),
             "--context", str(ROOT / "workspace.hermes.md")],
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
             "--date", "2026-08-20", "--output", str(ROOT / "workspace.hermes.md")],
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

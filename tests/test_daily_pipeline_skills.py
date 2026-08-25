from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

PACKAGES = {
    "daily-project-memory": "pipeline",
    "daily-documentation-quality": "pipeline",
    "daily-project-control": "pipeline",
    "daily-knowledge-capture": "pipeline",
    "weekly-report-finalization": "pipeline",
    "dispatch-employee-messages": "integration",
    "apply-project-diffs": "integration",
}

DAILY_NO_PROVIDER_ANALYSIS = (
    "daily-documentation-quality",
    "daily-project-control",
    "daily-knowledge-capture",
)
DAILY_CONTEXT_CONSUMERS = (
    "daily-project-memory",
    *DAILY_NO_PROVIDER_ANALYSIS,
)
DAILY_PIPELINE_SKILLS = DAILY_CONTEXT_CONSUMERS
WEEKLY_PIPELINE_SKILLS = ("weekly-report-finalization",)


class DailyPipelineSkillTests(unittest.TestCase):
    def test_each_pipeline_has_a_local_golden_skill_package(self) -> None:
        for name, kind in PACKAGES.items():
            package = ROOT / "skills" / name
            skill = (package / "SKILL.md").read_text(encoding="utf-8")
            self.assertIn(f"name: {name}", skill)
            self.assertIn("tier: 3", skill)
            self.assertIn("group: operations", skill)
            self.assertIn("source: local", skill)
            self.assertIn(f"kind: {kind}", skill)
            self.assertIn('skill-template: "0.6.1"', skill)
            self.assertIn("## Context", skill)
            self.assertIn("## Skill Signature", skill)
            self.assertIn("## Todo List", skill)
            self.assertIn("## Gotchas", skill)
            self.assertIn("## Output", skill)
            self.assertIn("Rule:", skill)
            self.assertIn("Assert:", skill)
            self.assertLessEqual(len(skill.splitlines()), 200)
            local_templates = package / "templates"
            if name == "daily-knowledge-capture":
                self.assertIn("../../automations/templates/current-weekly-draft.md", skill)
            else:
                self.assertTrue(local_templates.is_dir() and any(local_templates.iterdir()), name)
            self.assertTrue(any((package / "examples" / "golden").iterdir()), name)
            self.assertTrue(any((package / "audits").glob("20??-??-??-*.md")), name)

    def test_every_package_has_normal_hard_boundary_evals_and_a_rerun_rule(self) -> None:
        for name in PACKAGES:
            suite = json.loads((ROOT / "skills" / name / "evals" / "evals.json").read_text(encoding="utf-8"))
            self.assertEqual(suite["skill_name"], name)
            self.assertEqual(suite["rerun_rule"], "fix and rerun the smallest failing eval before readiness")
            self.assertEqual(len(suite["evals"]), 3)
            self.assertTrue(all(case["assertions"] for case in suite["evals"]))
            calibration = suite["extensions"]["calibration"]
            self.assertEqual(calibration["status"], "draft_unrun")
            self.assertTrue(calibration["baseline"])

    def test_declared_eval_files_resolve_from_their_skill_package(self) -> None:
        for name in PACKAGES:
            package = ROOT / "skills" / name
            suite = json.loads((package / "evals" / "evals.json").read_text(encoding="utf-8"))
            for case in suite["evals"]:
                for relative_path in case.get("files", []):
                    self.assertTrue(
                        (package / relative_path).is_file(),
                        f"{name}:{case['id']} declares missing file {relative_path}",
                    )

    def test_automation_runs_one_structured_extraction_then_routes_application_arrays(self) -> None:
        automation = (ROOT / "automations" / "daily-operating-update.md").read_text(encoding="utf-8")
        schema = (ROOT / "automations" / "schemas" / "daily-review-result.zod.mjs").read_text(encoding="utf-8")
        self.assertIn("daily-context-diff-YYYY-MM-DD.json", automation)
        self.assertIn("daily-review-result-YYYY-MM-DD.json", automation)
        self.assertIn("## Context", automation)
        self.assertIn("## Todo List", automation)
        self.assertIn("kamdar-company-os", automation)
        self.assertIn("Validate the result against `DailyReviewResultSchema`", automation)
        for redundant_field in (
            "status: source-contract",
            "production_write_mode:",
            "application_mode:",
            "dispatch_mode:",
            "processing_version:",
            "owner: Kamdar AI",
        ):
            self.assertNotIn(redundant_field, automation)
        for result_path in (
            "project_updates[].section_replacements[]",
            "completed_ticket_comments[]",
            "weekly_progress_chases[]",
            "knowledge_updates[].draft_entries[]",
        ):
            self.assertIn(result_path, automation)
        self.assertIn("`notion` skill via `ntn` on `notion.projects`", automation)
        self.assertIn("then `$telegram-message`, `email-message`, or `whatsapp-message`", automation)
        self.assertNotIn("apply-project-diffs", automation)
        self.assertNotIn("dispatch-employee-messages", automation)
        self.assertNotIn("project_memory(context)", automation)
        self.assertNotIn("documentation_quality(context)", automation)
        self.assertNotIn("daily_project_control(context, weekly_draft)", automation)
        self.assertNotIn("daily_knowledge_capture(context", automation)
        for command in ("ntn --help", "ntn datasources --help", "ntn pages --help", "ntn api --help"):
            self.assertIn(command, automation)
        for schema_name in (
            "ProjectPageUpdateSchema",
            "CompletedTicketCommentSchema",
            "WeeklyProgressChaseSchema",
            "KnowledgeUpdateSchema",
            "DailyReviewResultSchema",
        ):
            self.assertIn(schema_name, schema)

    def test_weekly_automation_loads_the_verified_notion_cli_contract(self) -> None:
        automation = (ROOT / "automations" / "weekly-operating-review.md").read_text(encoding="utf-8")
        self.assertIn("skills/kamdar-company-os/SKILL.md", automation)
        for command in ("ntn --help", "ntn datasources --help", "ntn pages --help", "ntn api --help"):
            self.assertIn(command, automation)
        self.assertIn("Never infer an `ntn` resource or argument shape", automation)

    def test_message_pipelines_consume_the_collector_not_a_provider(self) -> None:
        for name in DAILY_NO_PROVIDER_ANALYSIS:
            skill = (ROOT / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
            self.assertIn("kamdar-daily-context-diff", skill)
            self.assertTrue(any(marker in skill for marker in (
                "Never fetch", "does not fetch", "no provider read or write",
                "performs no provider read or write",
                "performs no provider read\nor write",
                "It performs no\nprovider read or write",
                "never reads or\nwrites a provider",
                "never fetches a provider",
                "never reads or writes a provider",
                "no provider read",
                "Do not make a provider call",
            )))

    def test_daily_and_weekly_automation_contexts_feed_their_own_evals(self) -> None:
        template = ROOT / "automations/templates/daily-context-diff.json"
        golden = ROOT / "automations/examples/golden/daily-context-diff-2026-08-24.json"
        for path in (template, golden):
            payload = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(payload["artifact_type"], "kamdar-daily-context-diff")
            self.assertEqual(payload["artifact_version"], "0.2.0")
            self.assertIn("source_manifest", payload)
            self.assertNotIn("source_ids", payload)
            self.assertNotIn("configured_route_ids", payload["collector"])
        self.assertNotIn("weekly_draft_snapshot", json.loads(golden.read_text(encoding="utf-8")))
        source_keys = {row["source_key"] for row in json.loads(golden.read_text(encoding="utf-8"))["source_manifest"]}
        self.assertEqual(source_keys, {
            "notion.projects", "notion.work_items_this_week",
            "notion.embedded_meetings", "notion.people",
        })
        expected_fixture = "../../automations/examples/golden/daily-context-diff-2026-08-24.json"
        for name in DAILY_CONTEXT_CONSUMERS:
            suite = json.loads((ROOT / "skills" / name / "evals" / "evals.json").read_text(encoding="utf-8"))
            self.assertIn(expected_fixture, suite["evals"][0]["files"])
        current_draft_template = ROOT / "automations/templates/current-weekly-draft.md"
        current_draft_golden = ROOT / "automations/examples/golden/current-weekly-draft-2026-W34.md"
        for path in (current_draft_template, current_draft_golden):
            content = path.read_text(encoding="utf-8")
            self.assertIn("artifact_type: kamdar-current-weekly-draft", content)
            for section in ("Problems and inefficiencies", "Decisions", "SOPs", "PM attention"):
                self.assertIn(f"## {section}", content)
            self.assertIn("draft_version:", content)
            self.assertIn("last_updated:", content)
        self.assertIn("GOLDEN EXAMPLE", current_draft_template.read_text(encoding="utf-8"))
        weekly_suite = json.loads((ROOT / "skills" / "weekly-report-finalization" / "evals" / "evals.json").read_text(encoding="utf-8"))
        self.assertIn("../../automations/examples/golden/current-weekly-draft-2026-W34.md", weekly_suite["evals"][0]["files"])

    def test_project_application_can_guard_a_complete_overview_replacement(self) -> None:
        skill = (ROOT / "skills" / "apply-project-diffs" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("`Overview`", skill)
        self.assertIn("complete section replacement", skill)

    def test_default_daily_pipeline_prepares_without_contacting_anyone(self) -> None:
        automation = (ROOT / "automations" / "daily-operating-update.md").read_text(encoding="utf-8")
        memory = (ROOT / "skills" / "daily-project-memory" / "SKILL.md").read_text(encoding="utf-8")
        documentation = (ROOT / "skills" / "daily-documentation-quality" / "SKILL.md").read_text(encoding="utf-8")
        control = (ROOT / "skills" / "daily-project-control" / "SKILL.md").read_text(encoding="utf-8")
        knowledge = (ROOT / "skills" / "daily-knowledge-capture" / "SKILL.md").read_text(encoding="utf-8")
        dispatch_skill = (ROOT / "skills" / "dispatch-employee-messages" / "SKILL.md").read_text(encoding="utf-8")
        result_template = (ROOT / "skills" / "dispatch-employee-messages/templates/channel-dispatch-result.md").read_text(encoding="utf-8")
        self.assertIn("The default is `prepare`: do not mutate", automation)
        self.assertIn("In `prepare`, return that plan with no integration call", memory)
        self.assertIn("`prepare` is the default and makes no channel call", documentation)
        self.assertIn("`prepare` contacts nobody", control)
        self.assertIn("directly source-key upserts", knowledge)
        self.assertIn("not an integration call", knowledge)
        self.assertIn("`prepare` is the default", dispatch_skill)
        self.assertIn("`send` invokes only", dispatch_skill)
        self.assertIn("telegram-message` currently serves Kenji only", dispatch_skill)
        self.assertIn("dispatch_mode: {{prepare | send}}", result_template)
        self.assertIn("state: {{prepared | delivered", result_template)

    def test_operated_daily_eval_relays_without_claiming_employee_delivery(self) -> None:
        automation = (ROOT / "automations" / "daily-operating-update.md").read_text(encoding="utf-8")
        self.assertIn("explicitly select\n`isolated-eval`", automation)
        self.assertIn("configured Telegram eval sink", automation)
        self.assertIn("`delivered_to_eval_sink`, not `delivered_to_employee`", automation)
        self.assertIn("must not\n    silently fall back to Telegram", automation)
        self.assertIn("provider message ID when returned", automation)

    def test_weekly_operated_eval_writes_hierarchy_then_sends_actual_company_report(self) -> None:
        automation = (ROOT / "automations" / "weekly-operating-review.md").read_text(encoding="utf-8")
        project = automation.index("**1 — Finalize Project Weekly Drafts")
        department = automation.index("**2 — Roll finalized Project reports into finalized Department reports")
        company = automation.index("**3 — Roll finalized Department reports into the Company report")
        delivery = automation.index("**4 — In explicit `isolated-eval`, deliver the actual Company report")
        self.assertLess(project, department)
        self.assertLess(department, company)
        self.assertLess(company, delivery)
        self.assertIn("complete Company report Markdown, unchanged and not summarized", automation)
        self.assertIn("title and Notion URL of every source Department report", automation)
        self.assertIn("provider-confirmed receipt for every part", automation)
        self.assertNotIn("This automation does not send messages", automation)

    def test_person_template_uses_approved_route_alias_not_literal_contact(self) -> None:
        template = (ROOT / "templates" / "person.md").read_text(encoding="utf-8")
        self.assertIn('contact_endpoint: "{{APPROVED_ROUTE_ALIAS}}"', template)
        self.assertIn("safe approved route alias", template)
        self.assertNotIn("ops-lead@company.example", template)

    def test_executive_distribution_requires_full_report_and_department_links(self) -> None:
        template = (ROOT / "templates" / "executive-distribution.md").read_text(encoding="utf-8")
        self.assertIn("{{COMPLETE_COMPANY_REPORT_MARKDOWN}}", template)
        self.assertIn("{{DEPARTMENT_REPORT_LINKS}}", template)
        self.assertIn("{{COMPANY_REPORT_URL}}", template)
        self.assertNotIn("{{COMPANY_RESULT}}", template)

    def test_direct_weekly_draft_has_exact_owned_anchor_contract(self) -> None:
        template = (ROOT / "automations/templates/current-weekly-draft.md").read_text(encoding="utf-8")
        knowledge = (ROOT / "skills" / "daily-knowledge-capture/SKILL.md").read_text(encoding="utf-8")
        control = (ROOT / "skills" / "daily-project-control/SKILL.md").read_text(encoding="utf-8")
        self.assertIn("state: draft", template)
        for section in ("Problems and inefficiencies", "Decisions", "SOPs", "PM attention"):
            self.assertIn(f"## {section}", template)
        self.assertNotIn("kamdar-weekly-anchor", template)
        self.assertIn("GOLDEN EXAMPLE", template)
        self.assertIn("increments `draft_version` by", template)
        self.assertIn("Decisions", knowledge)
        self.assertIn("SOPs", knowledge)
        self.assertIn("PM attention", control)
        self.assertIn("Problems and inefficiencies", control)
        self.assertNotIn("weekly-report-contribution", knowledge)
        self.assertNotIn("weekly-report-diff.md", control)

    def test_dispatch_uses_workspace_channel_aliases_without_fallback(self) -> None:
        workspace = (ROOT / "workspace.hermes.md").read_text(encoding="utf-8")
        dispatch_skill = (ROOT / "skills" / "dispatch-employee-messages" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("## Communication channel aliases", workspace)
        self.assertIn("$telegram-message", workspace)
        self.assertIn("email-message", workspace)
        self.assertIn("whatsapp-message", workspace)
        self.assertIn("infer a channel or fall back", dispatch_skill)
        self.assertIn("An unavailable email or WhatsApp handler stays a configuration gap", dispatch_skill)

    def test_company_os_skill_names_real_ntn_primitives(self) -> None:
        skill = (ROOT / "skills" / "kamdar-company-os" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("Read `.hermes.md`", skill)
        for command in (
            "ntn datasources resolve <database-uuid> --json",
            "ntn datasources query <data-source-uuid> --json",
            "ntn pages get <page-uuid> --json",
            "ntn api -X PATCH v1/pages/<page-uuid> -d @payload.json",
            "ntn pages edit <page-uuid> < replacement.md",
            "ntn api v1/comments -d @payload.json",
        ):
            self.assertIn(command, skill)
        self.assertIn("do not invent resource subcommands", skill)


if __name__ == "__main__":
    unittest.main()

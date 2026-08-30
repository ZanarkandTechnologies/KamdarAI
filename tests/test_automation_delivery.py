from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from schemas.automations.delivery import DeliveryPlan
from scripts.automation_delivery import apply_plan, compile_delivery_plan, render_plan
from scripts.automation_delivery import DeliveryError
from scripts.automation_prepare import sha256
from scripts.run_automation import load_handoff
from schemas.automations.delivery import stable_sha256


def workspace(*, policy: str = "enabled", include_decisions: bool = True) -> str:
    decisions = (
        "| `decisions` | notion | https://notion.example.test/decisions | isolated-eval | test |\n"
        if include_decisions else ""
    )
    return f"""---
execution_modes:
  - isolated-eval
automation_delivery:
  daily: {policy}
  weekly: {policy}
  meeting-intake: {policy}
---

<!-- hermes:managed data-sources -->
| Role | Provider | Source | Access | Scope |
| --- | --- | --- | --- | --- |
| `tasks` | notion | https://notion.example.test/tasks | isolated-eval | test |
| `reports` | google-drive | https://drive.example.test/reports | isolated-eval | test |
{decisions}<!-- /hermes:managed data-sources -->

<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Kenji | prepare drafts for approval |
<!-- /hermes:managed communications -->
"""


def weekly_result() -> dict:
    return {
        "report_results": [
            {
                "report_id": "RPT-COMPANY-W35",
                "report_level": "Company",
                "report_status": "Final",
                "report_markdown": "# Company report\n\nReady for review.",
            }
        ],
        "promotion_dispositions": [
            {
                "candidate_id": "TASK-1",
                "kind": "decision",
                "disposition": "promoted",
                "destination_id": "DEC-1",
                "rendered_markdown": "# Decision\n\nUse the reviewed route.",
            }
        ],
        "employee_memory_updates": [],
        "sop_updates": [],
        "carry_forward_updates": [
            {
                "project_id": "PROJ-1",
                "to_week": "2026-W36",
                "notes_markdown": "# Next week\n\nContinue proof.",
            }
        ],
    }


class FakeRunner:
    def __init__(self) -> None:
        self.provider_calls = 0
        self.message_calls = 0

    def __call__(self, arguments, profile_home, **kwargs):
        del profile_home, kwargs
        if "authorized_message.py" in " ".join(str(item) for item in arguments):
            self.message_calls += 1
            return subprocess.CompletedProcess(arguments, 0, json.dumps({"status": "draft_created"}), "")
        if arguments[1:3] == ["sessions", "export"]:
            return subprocess.CompletedProcess(
                arguments,
                0,
                json.dumps({"messages": [{"role": "tool", "content": "read-back matched"}]}) + "\n",
                "",
            )
        self.provider_calls += 1
        return subprocess.CompletedProcess(
            arguments,
            0,
            json.dumps(
                {
                    "status": "applied",
                    "provider_response_id": f"response-{self.provider_calls}",
                    "read_back_confirmed": True,
                    "reason": None,
                }
            ),
            f"\nsession_id: action-{self.provider_calls}\n",
        )


class AutomationDeliveryTests(unittest.TestCase):
    def test_missing_communications_blocks_only_optional_message_actions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            content = workspace(policy="disabled").split(
                "<!-- hermes:managed communications -->", 1
            )[0]
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [{
                        "owner_person_id": "PERSON-1",
                        "message_text": "Please confirm progress.",
                    }],
                },
                snapshot={"sources": {}},
                workspace_content=content,
                profile_home=Path(directory),
            )
            self.assertEqual(plan.delivery_policy.value, "disabled")
            self.assertEqual(len(plan.actions), 1)
            self.assertFalse(plan.actions[0].required)
            self.assertEqual(plan.actions[0].state, "blocked")
            self.assertEqual(
                plan.actions[0].blocked_reason,
                "employee_approved_route_not_configured",
            )

    def test_daily_plan_maps_workspace_comments_and_employee_route_safely(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = {
                "project_note_updates": [{
                    "project_id": "PROJ-1", "project_name": "Launch", "week": "2026-W35",
                    "progress_notes": [{"markdown": "## Progress\n\nReady."}],
                    "knowledge_notes": [],
                }],
                "documentation_reviews": [{
                    "work_item_id": "TASK-1", "comment_text": "Please add the approval.",
                }],
                "weekly_progress_chases": [{
                    "owner_person_id": "PERSON-1", "message_text": "Please confirm progress.",
                }],
            }
            snapshot = {
                "sources": {
                    "tasks": {
                        "records": [{"id": "TASK-1", "url": "https://notion.example.test/tasks/TASK-1"}]
                    }
                }
            }
            plan = compile_delivery_plan(
                cadence="daily", result=result, snapshot=snapshot,
                workspace_content=workspace(), profile_home=Path(directory),
            )
            ready = [action for action in plan.actions if action.state == "ready"]
            blocked = [action for action in plan.actions if action.state == "blocked"]
            self.assertEqual(
                {(action.provider.value, action.operation.value) for action in ready},
                {
                    ("private-workspace", "append-project-notes"),
                    ("notion", "add-work-comment"),
                },
            )
            self.assertEqual(blocked[0].blocked_reason, "employee_approved_route_not_configured")
            self.assertEqual(ready[1].target, "https://notion.example.test/tasks/TASK-1")

    def test_daily_comment_never_falls_back_to_database_when_exact_work_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [],
                    "documentation_reviews": [{"work_item_id": "TASK-1", "comment_text": "Question"}],
                    "weekly_progress_chases": [],
                },
                snapshot={"sources": {}}, workspace_content=workspace(),
                profile_home=Path(directory),
            )
            self.assertEqual(plan.actions[0].state, "blocked")
            self.assertEqual(plan.actions[0].blocked_reason, "tasks_exact_target_not_resolved")

    def test_meeting_plan_creates_tasks_only_in_the_configured_tasks_destination(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="meeting-intake",
                result={"task_creations": [{"work_item_id": "TASK-NEW", "name": "Ship proof"}]},
                snapshot={"sources": {}}, workspace_content=workspace(),
                profile_home=Path(directory),
            )
            self.assertEqual(len(plan.actions), 1)
            self.assertEqual(plan.actions[0].operation.value, "create-task")
            self.assertEqual(plan.actions[0].target, "https://notion.example.test/tasks")

    def test_weekly_plan_covers_every_configured_stage_two_surface(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}},
                workspace_content=workspace(),
                profile_home=profile,
            )
            self.assertIsInstance(plan, DeliveryPlan)
            self.assertEqual(plan.ready_actions, 4)
            self.assertEqual(plan.blocked_actions, 0)
            self.assertEqual(
                {action.provider.value for action in plan.actions},
                {"google-drive", "notion", "private-workspace", "telegram"},
            )
            review = render_plan(plan)
            self.assertIn("Google Drive", review)
            self.assertIn("Production systems: Not authorized", review)

    def test_missing_destination_is_visible_and_blocks_only_its_action(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}},
                workspace_content=workspace(include_decisions=False),
                profile_home=Path(directory),
            )
            blocked = [action for action in plan.actions if action.state == "blocked"]
            self.assertEqual(len(blocked), 1)
            self.assertEqual(blocked[0].blocked_reason, "decisions_destination_not_configured")

    def test_disabled_policy_performs_zero_downstream_calls(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(policy="disabled")
            installed = profile / "workspace" / ".hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            plan = compile_delivery_plan(
                cadence="weekly", result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}},
                workspace_content=content, profile_home=profile,
            )
            runner = FakeRunner()
            receipt = apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            self.assertEqual(receipt.status, "not_requested")
            self.assertEqual(receipt.downstream_calls, 0)
            self.assertEqual((runner.provider_calls, runner.message_calls), (0, 0))

    def test_enabled_plan_applies_then_reruns_as_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace()
            installed = profile / "workspace" / ".hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            plan = compile_delivery_plan(
                cadence="weekly", result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}},
                workspace_content=content, profile_home=profile,
            )
            runner = FakeRunner()
            first = apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            self.assertEqual(first.status, "applied")
            self.assertEqual(first.downstream_calls, 2)
            self.assertEqual((runner.provider_calls, runner.message_calls), (2, 1))
            second = apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            self.assertEqual(second.status, "applied")
            self.assertTrue(all(row.state == "duplicate" for row in second.actions))
            self.assertEqual((runner.provider_calls, runner.message_calls), (2, 1))

    def test_handoff_loader_rejects_result_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / "profile"
            content = workspace()
            result = weekly_result()
            plan = compile_delivery_plan(
                cadence="weekly", result=result,
                snapshot={"current_week": "2026-W35", "sources": {}},
                workspace_content=content, profile_home=profile,
            )
            cadence_root = root / "weekly"
            cadence_root.mkdir()
            plan_payload = plan.model_dump(mode="json")
            (cadence_root / "result.json").write_text(json.dumps(result), encoding="utf-8")
            (cadence_root / "delivery-plan.json").write_text(json.dumps(plan_payload), encoding="utf-8")
            handoff = {
                "schema_version": "kamdar-automation-prepare-handoff@1.0.0",
                "cadence": "weekly",
                "result_sha256": sha256(result),
                "delivery_plan_sha256": stable_sha256(plan_payload),
                "feature_states": {"FEAT-0005": "pass"},
            }
            handoff_path = cadence_root / "handoff.json"
            handoff_path.write_text(json.dumps(handoff), encoding="utf-8")
            loaded, loaded_plan = load_handoff(handoff_path)
            self.assertEqual(loaded["cadence"], loaded_plan.cadence)
            result["report_results"][0]["report_markdown"] = "tampered"
            (cadence_root / "result.json").write_text(json.dumps(result), encoding="utf-8")
            with self.assertRaisesRegex(DeliveryError, "result changed"):
                load_handoff(handoff_path)


if __name__ == "__main__":
    unittest.main()

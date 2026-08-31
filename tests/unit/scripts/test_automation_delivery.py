from __future__ import annotations

import json
import hashlib
import os
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
from scripts.project_week_notes import (
    append_project_week_notes,
    freeze_project_week_notes,
    initialize_project_week_notes,
)


def workspace(
    *, policy: str = "enabled", include_decisions: bool = True,
    sync_artifacts: tuple[str, ...] = ("reports",),
    employee_follow_up: bool = False,
    owner_messages: bool = True,
) -> str:
    decisions = (
        "| `decisions` | notion | https://notion.example.test/decisions | isolated-eval | test |\n"
        if include_decisions else ""
    )
    sync_rows = {
        "short-term memory": "| `short-term memory` | notion | https://notion.example.test/private-weekly |",
        "long-term memory": "| `long-term memory` | notion | https://notion.example.test/private-memory |",
        "reports": "| `reports` | google-drive | https://drive.example.test/reports |",
    }
    artifact_sync = "\n".join(sync_rows[artifact] for artifact in sync_artifacts)
    employee_row = (
        "| `employee follow-up` | slack | project channel | prepare drafts for approval |\n"
        if employee_follow_up else ""
    )
    owner_row = (
        "| `owner report` | telegram | Kenji | prepare drafts for approval |\n"
        if owner_messages else ""
    )
    return f"""---
execution_modes:
  - isolated-eval
automation_delivery:
  daily: {policy}
  weekly: {policy}
---

<!-- hermes:managed data-sources -->
| Role | Provider | Source | Access | Scope |
| --- | --- | --- | --- | --- |
| `tasks` | notion | https://notion.example.test/tasks | isolated-eval | test |
| `reports` | google-drive | https://drive.example.test/reports | isolated-eval | test |
{decisions}<!-- /hermes:managed data-sources -->

<!-- hermes:managed artifact-sync -->
| Artifact | Provider | Destination |
| --- | --- | --- |
{artifact_sync}
<!-- /hermes:managed artifact-sync -->

<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
{owner_row}
{employee_row}
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


def frozen_week_snapshot(profile: Path, week: str = "2026-W35") -> dict:
    week_root = profile / "workspace" / "weeks" / week
    notes_path = week_root / "project-notes/project--PROJ-1.md"
    initialize_project_week_notes(
        notes_path=notes_path,
        week=week,
        project_id="PROJ-1",
        project_name="Project 1",
    )
    append_project_week_notes(
        notes_path=notes_path,
        expected_week=week,
        expected_project_id="PROJ-1",
        notes=[{
            "observation_kind": "work_snapshot",
            "observed_at": "2026-08-28T09:00:00+08:00",
            "source_updated_at": "2026-08-28T08:55:00+08:00",
            "source_revision": "revision-1",
            "project_id": "PROJ-1",
            "section": "Work and employee updates",
            "source_ids": ["TASK-1"],
            "work_id": "TASK-1",
            "employee_ids": ["PERSON-1"],
            "workflow_key": None,
            "structured_payload": {"status": "In progress"},
            "markdown": "TASK-1 remains in progress.",
        }],
    )
    frozen = freeze_project_week_notes(
        week_root=week_root,
        week=week,
        expected_project_ids=["PROJ-1"],
    )
    freeze_path = Path(frozen["path"])
    return {
        "current_week": week,
        "sources": {},
        "project_notes_freeze_sha256": hashlib.sha256(freeze_path.read_bytes()).hexdigest(),
    }


class FakeRunner:
    def __init__(self) -> None:
        self.provider_calls = 0
        self.message_calls = 0
        self.provider_prompts: list[dict] = []

    def __call__(self, arguments, profile_home, **kwargs):
        del profile_home
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
        self.provider_prompts.append(json.loads(kwargs["input_text"]))
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
    def test_private_default_daily_apply_keeps_memory_local_and_comments_on_work(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(sync_artifacts=(), owner_messages=False)
            installed = profile / "workspace/.hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            result = {
                "project_note_updates": [{
                    "project_id": "PROJ-1",
                    "project_name": "Launch",
                    "week": "2026-W35",
                    "progress_notes": [{
                        "observation_kind": "work_snapshot",
                        "observed_at": "2026-08-28T09:00:00+08:00",
                        "source_updated_at": "2026-08-28T08:55:00+08:00",
                        "source_revision": "revision-1",
                        "section": "Work and employee updates",
                        "source_ids": ["TASK-1"],
                        "work_id": "TASK-1",
                        "employee_ids": ["PERSON-1"],
                        "workflow_key": None,
                        "structured_payload": {"status": "In progress"},
                        "markdown": "TASK-1 remains in progress.",
                    }],
                    "knowledge_notes": [],
                }],
                "documentation_reviews": [{
                    "work_item_id": "TASK-1",
                    "comment_text": "Please attach the acceptance evidence.",
                }],
                "weekly_progress_chases": [{
                    "project_id": "PROJ-1",
                    "owner_person_id": "PERSON-1",
                    "related_work_item_ids": ["TASK-1"],
                    "source_ids": ["TASK-1"],
                    "message_text": "Please share the blocker and revised date.",
                }],
            }
            snapshot = {"sources": {"tasks": {"records": [{
                "id": "TASK-1",
                "url": "https://notion.example.test/tasks/TASK-1",
            }]}}}
            plan = compile_delivery_plan(
                cadence="daily", result=result, snapshot=snapshot,
                workspace_content=content, profile_home=profile,
            )
            self.assertEqual(len(plan.actions), 3)
            self.assertEqual(
                [action.operation.value for action in plan.actions],
                ["append-project-notes", "add-work-comment", "add-work-comment"],
            )
            runner = FakeRunner()
            receipt = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=runner,
            )
            self.assertEqual(receipt.status, "applied")
            self.assertEqual(receipt.downstream_calls, 2)
            self.assertEqual(runner.provider_calls, 2)
            self.assertEqual(runner.message_calls, 0)
            self.assertTrue(
                profile.joinpath(
                    "workspace/weeks/2026-W35/project-notes/project--PROJ-1.md"
                ).is_file()
            )
            self.assertFalse(profile.joinpath("workspace/memory").exists())
            self.assertTrue(all(
                prompt["action"]["target"]
                == "https://notion.example.test/tasks/TASK-1"
                for prompt in runner.provider_prompts
            ))

    def test_daily_apply_uses_project_notes_lifecycle_and_rejects_frozen_week(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(sync_artifacts=())
            installed = profile / "workspace/.hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            update = {
                "project_id": "PROJ-1",
                "project_name": "Project 1",
                "week": "2026-W35",
                "progress_notes": [{
                    "observation_kind": "work_snapshot",
                    "observed_at": "2026-08-28T09:00:00+08:00",
                    "source_updated_at": "2026-08-28T08:55:00+08:00",
                    "source_revision": "revision-1",
                    "section": "Work and employee updates",
                    "source_ids": ["TASK-1"],
                    "work_id": "TASK-1",
                    "employee_ids": ["PERSON-1"],
                    "workflow_key": None,
                    "structured_payload": {"status": "In progress"},
                    "markdown": "TASK-1 remains in progress.",
                }],
                "knowledge_notes": [],
            }
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [update],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [],
                },
                snapshot={"sources": {}},
                workspace_content=content,
                profile_home=profile,
            )
            first = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=FakeRunner(),
            )
            self.assertEqual(first.actions[0].state, "applied")
            notes_path = profile / "workspace/weeks/2026-W35/project-notes/project--PROJ-1.md"
            self.assertIn("artifact_type: kamdar-project-week-notes", notes_path.read_text())
            self.assertIn("kamdar-project-note:", notes_path.read_text())
            self.assertEqual(
                apply_plan(
                    plan, profile_home=profile, workspace=installed,
                    command_runner=FakeRunner(),
                ).actions[0].state,
                "duplicate",
            )
            freeze_project_week_notes(
                week_root=profile / "workspace/weeks/2026-W35",
                week="2026-W35",
                expected_project_ids=["PROJ-1"],
            )
            update["progress_notes"][0]["source_revision"] = "revision-2"
            frozen_plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [update],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [],
                },
                snapshot={"sources": {}},
                workspace_content=content,
                profile_home=profile,
            )
            frozen = apply_plan(
                frozen_plan, profile_home=profile, workspace=installed,
                command_runner=FakeRunner(),
            )
            self.assertEqual(frozen.actions[0].state, "blocked")
            self.assertEqual(frozen.actions[0].reason, "week_frozen")

    def test_missing_communications_uses_exact_work_comment_and_blocks_without_url(self) -> None:
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
                        "project_id": "PROJ-1",
                        "owner_person_id": "PERSON-1",
                        "related_work_item_ids": ["TASK-1"],
                        "source_ids": ["TASK-1"],
                        "message_text": "Please confirm progress.",
                    }],
                },
                snapshot={"sources": {}},
                workspace_content=content,
                profile_home=Path(directory),
            )
            self.assertEqual(plan.delivery_policy.value, "disabled")
            self.assertEqual(len(plan.actions), 1)
            self.assertTrue(plan.actions[0].required)
            self.assertEqual(plan.actions[0].operation.value, "add-work-comment")
            self.assertEqual(plan.actions[0].state, "blocked")
            self.assertEqual(
                plan.actions[0].blocked_reason,
                "tasks_exact_target_not_resolved",
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
                    "project_id": "PROJ-1", "owner_person_id": "PERSON-1",
                    "related_work_item_ids": ["TASK-1"], "source_ids": ["TASK-1"],
                    "message_text": "Please confirm progress.",
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
            self.assertEqual(len(ready), 3)
            self.assertEqual(blocked, [])
            comments = [
                action for action in ready
                if action.operation.value == "add-work-comment"
            ]
            self.assertEqual(len(comments), 2)
            self.assertTrue(all(
                action.target == "https://notion.example.test/tasks/TASK-1"
                for action in comments
            ))
            self.assertEqual(
                next(
                    action.payload["comment_text"] for action in comments
                    if action.result_pointer.startswith("/weekly_progress_chases/")
                ),
                "Please confirm progress.",
            )

    def test_explicit_employee_route_overrides_progress_comments(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [{
                        "project_id": "PROJ-1", "owner_person_id": "PERSON-1",
                        "related_work_item_ids": ["TASK-1", "TASK-2"],
                        "source_ids": ["TASK-1", "TASK-2"],
                        "message_text": "Please confirm progress.",
                    }],
                },
                snapshot={"sources": {}},
                workspace_content=workspace(employee_follow_up=True),
                profile_home=Path(directory),
            )
            self.assertEqual(len(plan.actions), 1)
            self.assertEqual(plan.actions[0].operation.value, "send-employee-follow-up")
            self.assertEqual(plan.actions[0].target, "project channel")

    def test_progress_chase_without_direct_route_comments_on_every_linked_work_item(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [{
                        "project_id": "PROJ-1", "owner_person_id": "PERSON-1",
                        "related_work_item_ids": ["TASK-1", "TASK-2"],
                        "source_ids": ["TASK-1", "TASK-2"],
                        "message_text": "Please confirm both commitments.",
                    }],
                },
                snapshot={"sources": {"tasks": {"records": [
                    {"id": "TASK-1", "url": "https://notion.example.test/tasks/TASK-1"},
                    {"id": "TASK-2", "url": "https://notion.example.test/tasks/TASK-2"},
                ]}}},
                workspace_content=workspace(owner_messages=False),
                profile_home=Path(directory),
            )
            self.assertEqual(len(plan.actions), 2)
            self.assertEqual(
                {action.target for action in plan.actions},
                {
                    "https://notion.example.test/tasks/TASK-1",
                    "https://notion.example.test/tasks/TASK-2",
                },
            )
            self.assertTrue(all(
                action.operation.value == "add-work-comment"
                and action.payload["comment_text"] == "Please confirm both commitments."
                for action in plan.actions
            ))

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

    def test_weekly_plan_covers_every_configured_stage_two_surface(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
                workspace_content=workspace(),
                profile_home=profile,
            )
            self.assertIsInstance(plan, DeliveryPlan)
            self.assertEqual(plan.ready_actions, 6)
            self.assertEqual(plan.blocked_actions, 0)
            self.assertEqual(
                {action.provider.value for action in plan.actions},
                {"google-drive", "private-workspace", "telegram"},
            )
            review = render_plan(plan)
            self.assertIn("Google Drive", review)
            self.assertIn("Production systems: Not authorized", review)

    def test_configured_memory_destinations_add_dependent_one_way_copies(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = weekly_result()
            result["employee_memory_updates"] = [{
                "person_id": "PERSON-1",
                "week": "2026-W35",
                "latest_weekly_evidence_markdown": "Worked across two Projects.",
            }]
            result["sop_updates"] = [{
                "workflow_key": "supplier-reconciliation",
                "week": "2026-W35",
                "latest_weekly_samples_markdown": "Three reviewed samples.",
            }]
            plan = compile_delivery_plan(
                cadence="weekly",
                result=result,
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
                workspace_content=workspace(sync_artifacts=("long-term memory",)),
                profile_home=Path(directory),
            )
            local = [
                action for action in plan.actions
                if action.operation.value == "update-long-term-memory"
            ]
            mirrors = [
                action for action in plan.actions
                if action.operation.value == "sync-long-term-memory"
            ]
            self.assertEqual(len(local), 3)
            self.assertEqual(len(mirrors), 3)
            self.assertEqual(
                {action.depends_on_action_keys[0] for action in mirrors},
                {action.action_key for action in local},
            )
            self.assertFalse(any(action.target_role == "people" for action in plan.actions))

    def test_long_term_memory_cannot_target_public_people_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            content = workspace(sync_artifacts=("long-term memory",)).replace(
                "| `tasks` | notion | https://notion.example.test/tasks | isolated-eval | test |",
                "| `tasks` | notion | https://notion.example.test/tasks | isolated-eval | test |\n"
                "| `people` | notion | https://notion.example.test/private-memory | read | public directory |",
            )
            with self.assertRaisesRegex(
                DeliveryError, "must not be the public People source"
            ):
                compile_delivery_plan(
                    cadence="weekly",
                    result=weekly_result(),
                    snapshot={"current_week": "2026-W35", "sources": {}},
                    workspace_content=content,
                    profile_home=Path(directory),
                )

    def test_short_term_memory_sync_depends_on_local_project_notes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="daily",
                result={
                    "project_note_updates": [{
                        "project_id": "PROJ-1",
                        "week": "2026-W35",
                        "notes_markdown": "## Work\n\nCurrent state.",
                    }],
                    "documentation_reviews": [],
                    "weekly_progress_chases": [],
                },
                snapshot={"sources": {}},
                workspace_content=workspace(sync_artifacts=("short-term memory",)),
                profile_home=Path(directory),
            )
            self.assertEqual(len(plan.actions), 2)
            self.assertEqual(plan.actions[0].operation.value, "append-project-notes")
            self.assertEqual(plan.actions[1].operation.value, "sync-short-term-memory")
            self.assertEqual(
                plan.actions[1].depends_on_action_keys, [plan.actions[0].action_key]
            )

    def test_missing_knowledge_destination_stays_local_without_blocking(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
                workspace_content=workspace(include_decisions=False, sync_artifacts=()),
                profile_home=Path(directory),
            )
            self.assertFalse([action for action in plan.actions if action.state == "blocked"])
            decision = next(
                action for action in plan.actions
                if action.result_pointer == "/promotion_dispositions/0"
            )
            self.assertEqual(decision.provider.value, "private-workspace")
            self.assertIn("/memory/decisions/", decision.target)

    def test_disabled_policy_performs_zero_downstream_calls(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(policy="disabled")
            installed = profile / "workspace" / ".hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            plan = compile_delivery_plan(
                cadence="weekly", result=weekly_result(),
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
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
                snapshot=frozen_week_snapshot(profile),
                workspace_content=content, profile_home=profile,
            )
            runner = FakeRunner()
            first = apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            self.assertEqual(first.status, "applied")
            self.assertEqual(first.downstream_calls, 1)
            self.assertEqual((runner.provider_calls, runner.message_calls), (1, 1))
            copied = runner.provider_prompts[0]["canonical_local_artifact"]
            self.assertEqual(copied["format"], "markdown")
            self.assertIn("# Company report", copied["content"])
            self.assertIn("stage-two-action", copied["content"])
            self.assertTrue(
                (profile / "workspace/weeks/2026-W35/reports/company/RPT-COMPANY-W35--v1.md").is_file()
            )
            self.assertEqual(
                os.stat(profile / "workspace/weeks/2026-W35/reports/company").st_mode & 0o777,
                0o700,
            )
            self.assertTrue((profile / "workspace/memory/decisions/DEC-1.md").is_file())
            self.assertTrue(
                (profile / "workspace/weeks/2026-W36/project-notes/project--PROJ-1.md").is_file()
            )
            second = apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            self.assertEqual(second.status, "applied")
            self.assertTrue(all(row.state == "duplicate" for row in second.actions))
            self.assertEqual((runner.provider_calls, runner.message_calls), (1, 1))

    def test_tampered_final_report_blocks_retry_and_provider_copy(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace()
            installed = profile / "workspace/.hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot=frozen_week_snapshot(profile),
                workspace_content=content,
                profile_home=profile,
            )
            runner = FakeRunner()
            apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            report = profile / "workspace/weeks/2026-W35/reports/company/RPT-COMPANY-W35--v1.md"
            report.write_text(report.read_text() + "tampered\n", encoding="utf-8")
            retried = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=runner,
            )
            self.assertEqual(retried.actions[0].state, "blocked")
            self.assertEqual(retried.actions[0].reason, "immutable_final_report_conflict")
            self.assertEqual(retried.actions[1].state, "blocked")
            self.assertEqual(runner.provider_calls, 1)

    def test_deleted_local_report_is_recreated_before_provider_retry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace()
            installed = profile / "workspace/.hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            plan = compile_delivery_plan(
                cadence="weekly",
                result=weekly_result(),
                snapshot=frozen_week_snapshot(profile),
                workspace_content=content,
                profile_home=profile,
            )
            runner = FakeRunner()
            apply_plan(plan, profile_home=profile, workspace=installed, command_runner=runner)
            report = profile / "workspace/weeks/2026-W35/reports/company/RPT-COMPANY-W35--v1.md"
            report.unlink()
            retried = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=runner,
            )
            self.assertEqual(retried.actions[0].state, "applied")
            self.assertTrue(report.is_file())
            self.assertEqual(retried.actions[1].state, "duplicate")

    def test_weekly_initializes_private_employee_memory_without_people_write(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(sync_artifacts=("long-term memory",))
            installed = profile / "workspace" / ".hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            result = weekly_result()
            result["employee_memory_updates"] = [{
                "person_id": "PERSON-NEW",
                "week": "2026-W35",
                "source_project_ids": ["PROJ-1"],
                "source_work_ids": ["TASK-1"],
                "source_note_keys": ["NOTE-1"],
                "expected_record_version": 0,
                "expected_persistent_text_sha256": hashlib.sha256(
                    "No accepted cross-week observation yet.".encode()
                ).hexdigest(),
                "persistent_observations": [],
                "latest_weekly_evidence_markdown": "- TASK-1 is in progress.",
                "disposition": "update",
                "gaps": [],
            }]
            plan = compile_delivery_plan(
                cadence="weekly", result=result,
                snapshot=frozen_week_snapshot(profile),
                workspace_content=content, profile_home=profile,
            )
            employee_action = next(
                action for action in plan.actions
                if action.result_pointer == "/employee_memory_updates/0"
            )
            self.assertEqual(employee_action.provider.value, "private-workspace")
            self.assertNotEqual(employee_action.target_role, "people")
            runner = FakeRunner()
            receipt = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=runner,
            )
            self.assertEqual(receipt.status, "applied")
            memory = profile / "workspace/memory/employees/PERSON-NEW.md"
            self.assertTrue(memory.is_file())
            self.assertIn('record_version: "1"', memory.read_text(encoding="utf-8"))
            self.assertIn("TASK-1 is in progress", memory.read_text(encoding="utf-8"))
            employee_copy = next(
                prompt for prompt in runner.provider_prompts
                if prompt["action"]["result_pointer"] == "/employee_memory_updates/0"
            )
            copied = employee_copy["canonical_local_artifact"]["content"]
            self.assertIn("## Persistent operating memory", copied)
            self.assertIn('record_version: "1"', copied)

    def test_failed_local_memory_guard_blocks_provider_copy(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            content = workspace(sync_artifacts=("long-term memory",))
            installed = profile / "workspace" / ".hermes.md"
            installed.parent.mkdir(parents=True)
            installed.write_text(content, encoding="utf-8")
            result = {
                "report_results": [],
                "promotion_dispositions": [],
                "employee_memory_updates": [{
                    "person_id": "PERSON-NEW",
                    "week": "2026-W35",
                    "source_project_ids": ["PROJ-1"],
                    "source_work_ids": ["TASK-1"],
                    "source_note_keys": ["NOTE-1"],
                    "expected_record_version": 0,
                    "expected_persistent_text_sha256": "0" * 64,
                    "persistent_observations": [],
                    "latest_weekly_evidence_markdown": "Current evidence.",
                    "disposition": "update",
                    "gaps": [],
                }],
                "sop_updates": [],
                "carry_forward_updates": [],
            }
            plan = compile_delivery_plan(
                cadence="weekly", result=result,
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
                workspace_content=content, profile_home=profile,
            )
            runner = FakeRunner()
            receipt = apply_plan(
                plan, profile_home=profile, workspace=installed,
                command_runner=runner,
            )
            self.assertEqual(receipt.status, "blocked")
            self.assertEqual(
                [row.state for row in receipt.actions],
                ["blocked", "blocked", "blocked"],
            )
            self.assertIn("dependency_not_applied", receipt.actions[1].reason)
            self.assertEqual(runner.provider_calls, 0)

    def test_handoff_loader_rejects_result_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / "profile"
            content = workspace()
            result = weekly_result()
            plan = compile_delivery_plan(
                cadence="weekly", result=result,
                snapshot={"current_week": "2026-W35", "sources": {}, "project_notes_freeze_sha256": "a" * 64},
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

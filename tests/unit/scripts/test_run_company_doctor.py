from __future__ import annotations

import json
import io
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

from scripts import run_company_doctor as doctor
from scripts.project_week_notes import (
    append_project_week_notes,
    freeze_project_week_notes,
    initialize_project_week_notes,
)


class FakeReader(doctor.NotionReader):
    def __init__(self, pages):
        self.pages = iter(pages)
        self.trace = []
        self.property_types = {}
        self._readable_block_ids = set()
        self.current_week_start = "2026-08-24T00:00:00Z"
        self.sources = {
            alias: {
                "id": "00000000-0000-0000-0000-000000000000",
                "title": alias.title(),
                "url": f"https://example.invalid/{alias}",
            }
            for alias in doctor.REQUIRED_SOURCE_ALIASES
        }

    def request(self, method, path, body=None):
        self.trace.append((method, path, body))
        return next(self.pages)


class CompanyDoctorTests(unittest.TestCase):
    def test_weekly_state_loads_only_frozen_notes_nested_reports_and_referenced_memory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            week_root = profile / "workspace/weeks/2026-W36"
            notes = week_root / "project-notes/project--PROJ-A.md"
            initialize_project_week_notes(
                notes_path=notes,
                week="2026-W36",
                project_id="PROJ-A",
                project_name="Project A",
            )
            append_project_week_notes(
                notes_path=notes,
                expected_week="2026-W36",
                expected_project_id="PROJ-A",
                notes=[{
                    "observation_kind": "workflow_sample",
                    "observed_at": "2026-08-31T09:00:00+08:00",
                    "source_updated_at": "2026-08-31T08:55:00+08:00",
                    "source_revision": "revision-1",
                    "project_id": "PROJ-A",
                    "section": "Workflow and SOP signals",
                    "source_ids": ["TASK-1"],
                    "work_id": "TASK-1",
                    "employee_ids": ["PERSON-A"],
                    "workflow_key": "workflow-a",
                    "structured_payload": {},
                    "markdown": "Reviewed workflow sample.",
                }],
            )
            freeze_project_week_notes(
                week_root=week_root,
                week="2026-W36",
                expected_project_ids=["PROJ-A"],
            )
            report = week_root / "reports/projects/RPT-A--v1.md"
            report.parent.mkdir(parents=True)
            report.write_text("# Prior report\n", encoding="utf-8")
            employee = profile / "workspace/memory/employees/PERSON-A.md"
            employee.parent.mkdir(parents=True)
            employee.write_text("# Employee memory\n", encoding="utf-8")
            unrelated = employee.parent / "PERSON-B.md"
            unrelated.write_text("# Unrelated\n", encoding="utf-8")
            sop = profile / "workspace/memory/sops/SOP-A.md"
            sop.parent.mkdir(parents=True)
            sop.write_text("---\nworkflow_key: workflow-a\n---\n# SOP\n", encoding="utf-8")

            state = doctor.load_private_weekly_state(profile, "2026-W36")
            self.assertIn("projects/RPT-A--v1.md", state["private_reports"])
            self.assertTrue(state["project_notes_freeze_sha256"])
            self.assertEqual(set(state["referenced_employee_memory"]), {"PERSON-A"})
            self.assertEqual(set(state["referenced_sop_memory"]), {"workflow-a"})

    def test_weekly_runner_freezes_every_active_project_before_loading(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            week = "2026-W36"
            week_root = profile / "workspace/weeks" / week
            for project_id in ("PROJ-A", "PROJ-B"):
                initialize_project_week_notes(
                    notes_path=(
                        week_root / f"project-notes/project--{project_id}.md"
                    ),
                    week=week,
                    project_id=project_id,
                    project_name=project_id,
                )
            result = doctor.freeze_private_weekly_state(
                profile,
                week,
                [{"id": "PROJ-B"}, {"id": "PROJ-A"}],
            )
            self.assertEqual(result["state"], "frozen")
            self.assertEqual(result["expected_project_ids"], ["PROJ-A", "PROJ-B"])
            loaded = doctor.load_private_weekly_state(profile, week)
            self.assertEqual(
                set(loaded["private_project_notes"]),
                {
                    "project-notes/project--PROJ-A.md",
                    "project-notes/project--PROJ-B.md",
                },
            )

            missing_profile = Path(directory) / "missing"
            gap = doctor.freeze_private_weekly_state(
                missing_profile,
                week,
                [{"id": "PROJ-A"}],
            )
            self.assertEqual(gap["state"], "configuration_gap")
            self.assertEqual(gap["reason"], "project_coverage_mismatch")

            added_project = doctor.freeze_private_weekly_state(
                profile,
                week,
                [{"id": "PROJ-A"}, {"id": "PROJ-B"}, {"id": "PROJ-C"}],
            )
            self.assertEqual(added_project["state"], "configuration_gap")
            self.assertEqual(
                added_project["reason"], "project_coverage_mismatch"
            )
            self.assertEqual(
                added_project["expected"], ["PROJ-A", "PROJ-B", "PROJ-C"]
            )
            self.assertEqual(added_project["observed"], ["PROJ-A", "PROJ-B"])

            removed_project = doctor.freeze_private_weekly_state(
                profile,
                week,
                [{"id": "PROJ-A"}],
            )
            self.assertEqual(removed_project["state"], "configuration_gap")
            self.assertEqual(
                removed_project["reason"], "project_coverage_mismatch"
            )
            self.assertEqual(removed_project["expected"], ["PROJ-A"])
            self.assertEqual(removed_project["observed"], ["PROJ-A", "PROJ-B"])

            freeze_gap, stale_state = doctor.prepare_private_weekly_state(
                profile,
                week,
                [{"id": "PROJ-A"}, {"id": "PROJ-B"}, {"id": "PROJ-C"}],
            )
            self.assertEqual(freeze_gap["state"], "configuration_gap")
            self.assertIsNone(stale_state["project_notes_freeze_sha256"])
            self.assertEqual(stale_state["private_project_notes"], {})

    def test_source_context_drift_does_not_impersonate_a_runtime_mutation(self) -> None:
        summary = doctor.workspace_safety_summary(
            {"source": "before", "installed": "same"},
            {"source": "after", "installed": "same"},
        )
        self.assertTrue(summary["unchanged"])
        self.assertTrue(summary["installed_unchanged"])
        self.assertFalse(summary["source_context_unchanged"])
        self.assertEqual(
            summary["classification"],
            "source_context_drift_no_doctor_mutation_capability",
        )

    def test_installed_workspace_change_is_a_runtime_mutation_failure(self) -> None:
        summary = doctor.workspace_safety_summary(
            {"source": "same", "installed": "before"},
            {"source": "same", "installed": "after"},
        )
        self.assertFalse(summary["unchanged"])
        self.assertFalse(summary["installed_unchanged"])
        self.assertEqual(summary["classification"], "installed_workspace_changed")

    def test_progress_log_is_private_structured_and_visible(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "run"
            stream = io.StringIO()
            with redirect_stderr(stream):
                doctor._log_event(root, "cadence.started", cadence="daily")
            log_path = root / "activity.jsonl"
            payload = json.loads(log_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["event"], "cadence.started")
            self.assertEqual(payload["cadence"], "daily")
            self.assertIn('"event": "cadence.started"', stream.getvalue())
            self.assertEqual(os.stat(log_path).st_mode & 0o777, 0o600)

    def test_doctor_has_no_parallel_outcome_or_viewer_contract(self) -> None:
        self.assertFalse(hasattr(doctor, "build_feature_outcomes"))
        self.assertFalse(hasattr(doctor, "materialize_cadence_artifacts"))
        self.assertFalse(hasattr(doctor, "render_viewer"))
        self.assertFalse(hasattr(doctor, "markdown_to_html"))

    def test_provider_surface_rejects_mutations_before_network(self) -> None:
        reader = doctor.NotionReader("not-a-real-token", {})
        with self.assertRaisesRegex(doctor.DoctorError, "read surface rejected"):
            reader.request("PATCH", "/pages/page-id", {"properties": {}})

    def test_provider_surface_rejects_unconfigured_read_ids(self) -> None:
        reader = doctor.NotionReader(
            "not-a-real-token",
            {"projects": {"id": "00000000-0000-0000-0000-000000000001"}},
        )
        with self.assertRaisesRegex(doctor.DoctorError, "read surface rejected"):
            reader.request("GET", "/data_sources/00000000-0000-0000-0000-000000000002")

    def test_doctor_parser_has_no_public_output_root_override(self) -> None:
        with self.assertRaises(SystemExit):
            doctor.parser().parse_args(["--output-root", "/tmp/private-data"])

    def test_doctor_parser_selects_analyze_or_sync(self) -> None:
        self.assertFalse(doctor.parser().parse_args(["--no-sync"]).sync_to_provider)
        selected = doctor.parser().parse_args([
            "--prepare-sync-plan", "--cadence", "daily", "--cadence", "weekly"
        ])
        self.assertTrue(selected.sync_to_provider)
        self.assertEqual(selected.cadences, ["daily", "weekly"])

    def test_prepared_delivery_state_is_truthful(self) -> None:
        ready = {"delivery_status": "ready"}
        disabled = {"delivery_status": "not_requested"}
        blocked = {"delivery_status": "blocked"}
        self.assertEqual(doctor.prepared_delivery_state(2, [ready, ready], None), "prepared")
        self.assertEqual(doctor.prepared_delivery_state(2, [disabled, disabled], None), "not_requested")
        self.assertEqual(doctor.prepared_delivery_state(2, [blocked, blocked], None), "blocked")
        self.assertEqual(doctor.prepared_delivery_state(2, [ready], "weekly"), "partial")

    def test_query_paginates_and_sorts_every_record(self) -> None:
        reader = FakeReader(
            [
                {"results": [{"id": "b", "properties": {}}], "has_more": True, "next_cursor": "cursor-2"},
                {"results": [{"id": "a", "properties": {}}], "has_more": False, "next_cursor": None},
            ]
        )
        result = reader.query("goals")
        self.assertEqual([row["id"] for row in result["records"]], ["a", "b"])
        self.assertEqual(result["observed_count"], 2)
        self.assertFalse(result["has_more"])
        self.assertEqual(reader.trace[1][2]["start_cursor"], "cursor-2")
        self.assertIn("filter", reader.trace[0][2])

    def test_done_tasks_remain_visible_until_ai_review_is_processed(self) -> None:
        reader = FakeReader(
            [
                {
                    "results": [],
                    "has_more": False,
                    "next_cursor": None,
                },
                {
                    "results": [
                        {
                            "id": "pending-review",
                            "properties": {
                                "Status": {"type": "status", "status": {"name": "Done"}},
                                "AI review": {"type": "status", "status": {"name": "Pending"}},
                            },
                        },
                        {
                            "id": "processed",
                            "properties": {
                                "Status": {"type": "status", "status": {"name": "Done"}},
                                "AI review": {"type": "status", "status": {"name": "Processed"}},
                            },
                        },
                    ],
                    "has_more": False,
                    "next_cursor": None,
                },
                {"results": [], "has_more": False, "next_cursor": None},
            ]
        )
        result = reader.query("tasks")
        self.assertEqual([row["id"] for row in result["records"]], ["pending-review"])
        done_filter = reader.trace[1][2]["filter"]
        self.assertEqual(done_filter["and"][0]["status"]["equals"], "Done")
        self.assertEqual(
            done_filter["and"][1]["last_edited_time"]["on_or_after"],
            "2026-08-24T00:00:00Z",
        )

    def test_page_body_markdown_uses_only_selected_blocks(self) -> None:
        reader = FakeReader(
            [
                {
                    "results": [
                        {
                            "id": "paragraph-1",
                            "type": "paragraph",
                            "paragraph": {"rich_text": [{"plain_text": "Observed project context"}]},
                            "has_children": False,
                        }
                    ],
                    "has_more": False,
                    "next_cursor": None,
                }
            ]
        )
        reader._readable_block_ids.add("selected-page")
        self.assertEqual(reader.read_page_body("selected-page"), "Observed project context")
        with self.assertRaisesRegex(doctor.DoctorError, "outside the selected read boundary"):
            reader.read_page_body("not-selected")

    def test_compaction_keeps_only_management_fields(self) -> None:
        record = doctor.compact_record(
            "tasks",
            {
                "id": "task-1",
                "properties": {
                    "Name": {"type": "title", "title": [{"plain_text": "Ship proof"}]},
                    "Status": {"type": "status", "status": {"name": "In progress"}},
                    "Journals": {"type": "relation", "relation": [{"id": "private-journal"}]},
                },
            },
        )
        self.assertEqual(record["properties"], {"Name": "Ship proof", "Status": "In progress"})

    def test_source_body_keeps_company_content_and_removes_known_harness_appendix(self) -> None:
        body, exclusions = doctor.sanitize_source_body(
            "## Objectives\n\nReal company objective.\n\n"
            "This environment is generated from the exact frozen fixture scored by the evaluation.\n\n"
            "## Proof path\n\nHarness-only material."
        )
        self.assertIn("Real company objective", body)
        self.assertNotIn("Harness-only material", body)
        self.assertEqual(exclusions, ["non-operational-harness-appendix"])

    def test_private_bindings_require_exact_sources_and_model(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bindings.json"
            path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "model": "provider/live-model",
                        "sources": {
                            alias: {
                                "id": f"{index:08x}-0000-0000-0000-000000000000",
                                "title": alias.title(),
                                "url": f"https://example.invalid/{alias}",
                            }
                            for index, alias in enumerate(doctor.REQUIRED_SOURCE_ALIASES, 1)
                        },
                    }
                ),
                encoding="utf-8",
            )
            payload = doctor.load_doctor_config(path)
            self.assertEqual(set(payload["sources"]), set(doctor.REQUIRED_SOURCE_ALIASES))

    def test_workspace_binding_summary_surfaces_stale_eval_mismatch_without_copying_content(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".hermes.md"
            path.write_text(
                '---\ncompany_name: "Old Eval"\n---\nThis seeded isolated-eval uses https://example.invalid/old.\n',
                encoding="utf-8",
            )
            summary = doctor.workspace_binding_summary(
                path,
                "Zanarkand Technologies",
                {"projects": {"url": "https://example.invalid/projects"}},
            )
            self.assertEqual(summary["status"], "needs_review")
            self.assertIn("configured-company-mismatch", summary["issues"])
            self.assertIn("configured-source-bindings-missing", summary["issues"])
            self.assertIn("stale-installed-workspace-context", summary["issues"])
            self.assertNotIn("seeded", json.dumps(summary).lower())

    def test_doctor_binding_summary_reflects_the_sources_that_were_actually_read(self) -> None:
        summary = doctor.doctor_binding_summary(
            "Kamdar AI",
            {alias: {"url": f"https://example.invalid/{alias}"} for alias in doctor.REQUIRED_SOURCE_ALIASES},
        )
        self.assertEqual(summary["status"], "connected")
        self.assertEqual(summary["issues"], [])
        self.assertTrue(all(summary["configured_source_matches"].values()))

    def test_doctor_command_is_available_from_setup_cli(self) -> None:
        result = subprocess.run(
            [sys.executable, str(doctor.ROOT / "setup.py"), "--help"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("doctor", result.stdout)

    def test_doctor_script_direct_entrypoint_is_importable(self) -> None:
        result = subprocess.run(
            [sys.executable, str(doctor.ROOT / "scripts" / "run_company_doctor.py"), "--help"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--profile-home", result.stdout)


if __name__ == "__main__":
    unittest.main()

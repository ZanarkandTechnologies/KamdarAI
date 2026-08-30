from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scripts import run_company_doctor as doctor


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

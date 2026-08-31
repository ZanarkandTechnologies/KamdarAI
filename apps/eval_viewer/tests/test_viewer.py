from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from apps.eval_viewer.build import build_static_evidence_viewer, render_evidence_html, render_markdown
from apps.eval_viewer.model import ViewerError, _feature_markdown, _source_cards, build_evidence_model


ROOT = Path(__file__).resolve().parents[3]
CADENCES = {"daily": ["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"], "weekly": ["FEAT-0005", "FEAT-0006", "FEAT-0007"]}


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def fixture(root: Path) -> None:
    write_json(root / "eval-receipt.json", {"run_mode": "analysis_only", "provider_mutations": 0})
    for feature_ids in CADENCES.values():
        for feature_id in feature_ids:
            write_json(root / "eval/judges" / f"{feature_id}.json", {"target": feature_id, "tier": "A", "verdict": "pass", "assertions": [{"assertion": f"{feature_id} grounded", "met": True, "evidence": ["skill eval"]}]})


class EvidenceViewerTests(unittest.TestCase):
    def test_cited_data_source_renders_as_a_readable_inspector_card(self) -> None:
        source_id = "11111111-1111-1111-1111-111111111111"
        cards = _source_cards({
            "sources": {
                "tasks": {
                    "source": {"id": source_id, "title": "Tasks"},
                    "selected_count": 2,
                    "records": [
                        {"id": "task-1", "properties": {"Name": "Prepare release", "Status": "Active"}},
                        {"id": "task-2", "properties": {"Name": "Review proof", "Status": "Done"}},
                    ],
                }
            }
        }, {source_id})
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0]["name"], "Tasks")
        self.assertEqual(cards[0]["status"], "2 records read")
        self.assertEqual(cards[0]["record"]["records"][0]["name"], "Prepare release")
        self.assertNotIn("id", cards[0]["record"]["records"][0])

    def test_feature_inspector_embeds_only_the_selected_markdown_section(self) -> None:
        preview = "# Daily\n\n## Project progress notes\n\nProgress only.\n\n## Documentation review\n\nReview only.\n"
        selected = _feature_markdown(preview, "Project progress notes")
        self.assertIn("Progress only.", selected)
        self.assertNotIn("Review only.", selected)

    def test_failed_run_still_renders_all_features_without_accepted_results(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write_json(root / "eval-receipt.json", {
                "run_mode": "analysis_only",
                "provider_mutations": 0,
                "automation_runs": {
                    "daily": {"status": "failed"},
                    "weekly": {"status": "not_run"},
                },
            })
            (root / "daily").mkdir()
            (root / "daily/preview.md").write_text(
                "# Daily validation failed\n\nNo output was accepted or published.\n",
                encoding="utf-8",
            )
            model = build_static_evidence_viewer(out_dir=root, eval_run_root=root)
            self.assertEqual(len(model["features"]), 7)
            self.assertEqual(
                [feature["status"] for feature in model["features"]],
                ["fail", "fail", "fail", "fail", "not_run", "not_run", "not_run"],
            )
            self.assertTrue((root / "index.html").is_file())

    def test_setup_block_renders_without_loading_results(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write_json(root / "eval-receipt.json", {
                "status": "needs_information",
                "run_mode": "analysis_only",
                "provider_mutations": 0,
                "automation_runs": {
                    "daily": {"status": "blocked_by_setup"},
                    "weekly": {"status": "blocked_by_setup"},
                },
            })
            model = build_evidence_model(project_root=ROOT, eval_run_root=root)
            self.assertTrue(all(feature["status"] == "not_run" for feature in model["features"]))
            self.assertTrue(all(not feature["outputs"] for feature in model["features"]))

    def test_doctor_model_and_html_are_python_owned_and_safe(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fixture(root)
            model = build_evidence_model(project_root=ROOT, eval_run_root=root)
            self.assertEqual(len(model["features"]), 7)
            self.assertEqual(model["runKind"], "skill-eval")
            rendered = render_markdown("# Preview\n\n<script>alert(1)</script>")
            self.assertIn("<h1>Preview</h1>", rendered)
            self.assertIn("&lt;script&gt;", rendered)
            frontmatter = render_markdown("---\nresult_schema: internal\n---\n\n# Preview")
            self.assertNotIn("result_schema", frontmatter)
            self.assertIn("<h1>Preview</h1>", frontmatter)
            html = render_evidence_html(model)
            self.assertNotIn("<script>alert(1)</script>", html)
            self.assertIn('class="workspace"', html)
            self.assertIn('class="list-panel"', html)
            self.assertIn('class="inspector"', html)
            self.assertIn("feature checks · grouped by workflow", html)
            self.assertIn("Unified Daily Review", html)
            self.assertIn("Weekly Operating Review", html)
            self.assertIn("Meeting Intake", html)
            self.assertIn("Skill artifact", html)
            self.assertIn("Expected criteria", html)
            self.assertIn('class="markdown-preview"', html)
            self.assertIn("Project progress notes", html)
            self.assertNotIn("<b>FEAT-0001", html)
            self.assertIn('href="activity.jsonl"', html)
            self.assertIn('href="eval-receipt.json"', html)
            build_static_evidence_viewer(out_dir=root, eval_run_root=root)
            self.assertTrue((root / "index.html").is_file())
            self.assertEqual(os.stat(root / "index.html").st_mode & 0o777, 0o600)

    def test_mutating_eval_receipt_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fixture(root)
            write_json(root / "eval-receipt.json", {"run_mode": "analysis_only", "provider_mutations": 1})
            with self.assertRaisesRegex(ViewerError, "zero provider mutations"):
                build_evidence_model(project_root=ROOT, eval_run_root=root)


if __name__ == "__main__":
    unittest.main()

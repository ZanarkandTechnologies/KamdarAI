from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evals.viewer.build import build_static_evidence_viewer, render_evidence_html, render_markdown
from evals.viewer.model import ViewerError, build_evidence_model


ROOT = Path(__file__).resolve().parents[1]
CADENCES = {"daily": ["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"], "weekly": ["FEAT-0005", "FEAT-0006", "FEAT-0007"], "meeting-intake": ["FEAT-0010"]}


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def fixture(root: Path) -> None:
    write_json(root / "doctor-receipt.json", {"delivery_state": "not_requested", "downstream_calls": 0})
    for cadence, feature_ids in CADENCES.items():
        result = json.loads((ROOT / f"evals/{cadence}/expected/result.json").read_text())
        write_json(root / cadence / "result.json", result)
        source_ids = sorted({row["source_id"] for outcome in result["feature_outcomes"] for row in outcome["evidence"]})
        write_json(root / cadence / "source-snapshot.json", {"sources": {"tasks": {"records": [{"id": value, "properties": {"Name": f"Observed {value}", "Status": "Active"}} for value in source_ids]}}})
        (root / cadence / "preview.md").write_text(f"# {cadence} preview\n\n- Nothing published\n\n<script>alert(1)</script>", encoding="utf-8")
        write_json(root / cadence / "handoff.json", {"mode": "prepare", "delivery_authorized": False, "delivery_status": "not_requested"})
        for feature_id in feature_ids:
            if cadence == "meeting-intake":
                continue
            outcome = next(row for row in result["feature_outcomes"] if row["feature_id"] == feature_id)
            blocked = outcome["outcome"] == "insufficient_information"
            write_json(root / cadence / "eval/judges" / f"{feature_id}.json", {"target": feature_id, "tier": "D" if blocked else "A", "verdict": "blocked" if blocked else "pass", "assertions": [{"assertion": f"{feature_id} grounded", "met": not blocked, "evidence": [f"{cadence}/result.json"]}]})
    write_json(root / "meeting-intake/eval/deterministic.json", {"pass": False, "checks": {"canonical_prepare_result": True, "no_delivery": True}})


class EvidenceViewerTests(unittest.TestCase):
    def test_doctor_model_and_html_are_python_owned_and_safe(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fixture(root)
            model = build_evidence_model(project_root=ROOT, doctor_run_root=root)
            self.assertEqual(len(model["features"]), 8)
            self.assertEqual(model["runKind"], "real-setup-test")
            rendered = render_markdown("# Preview\n\n<script>alert(1)</script>")
            self.assertIn("<h1>Preview</h1>", rendered)
            self.assertIn("&lt;script&gt;", rendered)
            html = render_evidence_html(model)
            self.assertNotIn("<script>alert(1)</script>", html)
            build_static_evidence_viewer(out_dir=root, doctor_run_root=root)
            self.assertTrue((root / "index.html").is_file())

    def test_authorized_handoff_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fixture(root)
            write_json(root / "daily/handoff.json", {"mode": "prepare", "delivery_authorized": True, "delivery_status": "ready"})
            with self.assertRaisesRegex(ViewerError, "delivery-disabled"):
                build_evidence_model(project_root=ROOT, doctor_run_root=root)


if __name__ == "__main__":
    unittest.main()

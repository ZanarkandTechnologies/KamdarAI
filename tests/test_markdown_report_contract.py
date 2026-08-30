from __future__ import annotations

import copy
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.markdown_report_contract import (
    TemplateContractError,
    apply_constrained_prose_cleanup,
    compile_markdown_report_contract,
    diff_markdown_report_contract,
    inspect_markdown_template,
    render_markdown_report,
)
from scripts.sync_report_templates import sync_report_templates


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tickets/TASK-0019/artifacts/template-drift-cases"


def load_json(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class MarkdownReportContractTests(unittest.TestCase):
    def test_three_templates_compile_to_pydantic_json_schema(self) -> None:
        cases = (("weekly-report.md", "weekly-report.interpretation.json"), ("area-operating-rollup.md", "area-operating-rollup.interpretation.json"), ("company-operating-rollup.md", "company-rollup.interpretation.json"))
        for template, interpretation in cases:
            compiled = compile_markdown_report_contract((ROOT / "templates" / template).read_text(), load_json(interpretation))
            self.assertEqual(compiled.observed["template_id"], compiled.interpretation["template_id"])
            self.assertIn("employee_actions", compiled.json_schema["properties"])
            self.assertIn("compiled deterministically", compiled.json_schema["description"])

    def test_extraction_cleanup_and_render_preserve_facts_and_shape(self) -> None:
        markdown = (ROOT / "templates/weekly-report.md").read_text()
        interpretation = load_json("weekly-report.interpretation.json")
        extraction = load_json("weekly-report.extraction.json")
        compiled = compile_markdown_report_contract(markdown, interpretation)
        compiled.schema.model_validate(extraction)
        cleaned = apply_constrained_prose_cleanup(extraction, {"summary": "In 2026-W35, PROJ-PENANG reduced stock variance to 4.2%, as [TASK-105](task://TASK-105) shows. The 18-minute supplier-file wait at route://ops/penang is now the highest-leverage attention. By 2026-09-02, OWNER-OPS will test one import map."}, interpretation)
        rendered = render_markdown_report(markdown, cleaned, interpretation, {"PROJECT_NAME": "Penang", "WEEK_START": "2026-08-24", "PROJECT": "PROJ-PENANG", "DEPARTMENT": "Ops", "REPORT_STATUS": "Draft", "REPORT_VERSION": "3", "FINALIZED_AT": "null", "PREVIOUS_REPORT": "RPT-W34", "SOURCE_REPORT_IDS": "RPT-D1"})
        self.assertNotIn("{{", rendered)
        self.assertEqual(inspect_markdown_template(markdown)["frontmatter_keys"], inspect_markdown_template(rendered)["frontmatter_keys"])
        with self.assertRaisesRegex(TemplateContractError, "cleanup changed protected facts"):
            apply_constrained_prose_cleanup(extraction, {"summary": "PROJ-PENANG improved. The wait needs attention. OWNER-OPS will test."}, interpretation)

    def test_structural_ambiguity_is_actionable(self) -> None:
        markdown = (ROOT / "templates/weekly-report.md").read_text()
        interpretation = load_json("weekly-report.interpretation.json")
        ambiguous = copy.deepcopy(interpretation)
        ambiguous["fields"][1].pop("min_rows")
        self.assertTrue(any("cardinality is ambiguous" in issue for issue in diff_markdown_report_contract(markdown, ambiguous)["issues"]))
        changed = markdown.replace("| Outcome or attention |", "| Result or attention |")
        self.assertTrue(any("table columns differ" in issue for issue in diff_markdown_report_contract(changed, interpretation)["issues"]))

    def test_sync_writes_python_and_check_mode_is_model_free(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "templates").mkdir()
            shutil.copy(ROOT / "templates/weekly-report.md", root / "templates/weekly-report.md")
            interpreted = {"interpretation": load_json("weekly-report.interpretation.json"), "example_data": load_json("weekly-report.extraction.json"), "frontmatter_values": {"PROJECT_NAME": "Synthetic", "WEEK_START": "2026-08-24", "PROJECT": "PROJ-S", "DEPARTMENT": "Ops", "REPORT_STATUS": "Draft", "REPORT_VERSION": "1", "FINALIZED_AT": "none", "PREVIOUS_REPORT": "none", "SOURCE_REPORT_IDS": "RPT-S"}}
            first = sync_report_templates(root=root, interpreter=lambda **_: interpreted, confirm_preview=lambda _: False)
            self.assertEqual(len(first["changed"]), 1)
            generated = root / "schemas/reports/company_os_weekly_report.py"
            self.assertTrue(generated.is_file())
            self.assertIn("build_report_model", generated.read_text())
            second = sync_report_templates(root=root, interpreter=lambda **_: self.fail("unchanged must not invoke AI"), confirm_preview=lambda _: self.fail("unchanged must not prompt"))
            self.assertEqual(second, {"changed": [], "previews": []})


if __name__ == "__main__":
    unittest.main()

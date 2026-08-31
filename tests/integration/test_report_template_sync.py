from __future__ import annotations

import copy
import importlib.util
import json
import re
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
from schemas.automations.daily_review_result import DailyReviewResult
from schemas.automations.template_catalog import TEMPLATE_CATALOG, template_body


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "tickets/archive/TASK-0019/artifacts/template-drift-cases"


def load_json(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class MarkdownReportContractTests(unittest.TestCase):
    def test_catalog_contains_every_template_and_pydantic_uses_message_bodies(self) -> None:
        template_paths = sorted(
            path for path in (ROOT / "templates").rglob("*.md")
            if path.name != "README.md"
        )
        self.assertEqual(
            {row["source"] for row in TEMPLATE_CATALOG.values()},
            {str(path.relative_to(ROOT)) for path in template_paths},
        )
        for row in TEMPLATE_CATALOG.values():
            markdown = (ROOT / row["source"]).read_text(encoding="utf-8")
            frontmatter = re.match(r"^---\n[\s\S]*?\n---\n", markdown)
            self.assertIsNotNone(frontmatter)
            self.assertEqual(row["body"], markdown[frontmatter.end():].strip())

        definitions = DailyReviewResult.model_json_schema()["$defs"]
        self.assertEqual(
            definitions["DocumentationReview"]["properties"]["comment_text"]["description"],
            template_body("kamdar-documentation-request"),
        )
        self.assertEqual(
            definitions["WeeklyProgressChase"]["properties"]["message_text"]["description"],
            template_body("kamdar-employee-followups"),
        )

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

    def test_sync_catalogs_non_report_templates_without_model_or_preview(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "templates/messages").mkdir(parents=True)
            target = root / "templates/messages/documentation-request.md"
            shutil.copy(ROOT / "templates/documentation-request.md", target)
            forbidden = lambda **_: self.fail("message template sync must not invoke AI")
            first = sync_report_templates(
                root=root,
                interpreter=forbidden,
                confirm_preview=lambda _: self.fail("message template sync must not prompt"),
            )
            self.assertEqual(len(first["changed"]), 1)

            catalog_path = root / "schemas/automations/template_catalog.py"
            spec = importlib.util.spec_from_file_location("temporary_template_catalog", catalog_path)
            self.assertIsNotNone(spec)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.assertEqual(
                module.template_body("kamdar-documentation-request"),
                template_body("kamdar-documentation-request"),
            )
            self.assertEqual(
                module.TEMPLATE_CATALOG["kamdar-documentation-request"]["source"],
                "templates/messages/documentation-request.md",
            )

            catalog_path.write_text(
                catalog_path.read_text(encoding="utf-8").replace(
                    "def template_body", "# unexpected generated edit\ndef template_body"
                ),
                encoding="utf-8",
            )
            tampered = sync_report_templates(
                root=root,
                check_only=True,
                interpreter=forbidden,
                confirm_preview=lambda _: self.fail("check mode must not prompt"),
            )
            self.assertEqual(
                tampered["changed"],
                [{"template": "templates/messages/documentation-request.md"}],
            )
            sync_report_templates(
                root=root,
                interpreter=forbidden,
                confirm_preview=lambda _: self.fail("message template sync must not prompt"),
            )

            target.write_text(
                target.read_text(encoding="utf-8").replace(
                    "Write one concise comment", "Write one precise comment"
                ),
                encoding="utf-8",
            )
            drift = sync_report_templates(
                root=root,
                check_only=True,
                interpreter=forbidden,
                confirm_preview=lambda _: self.fail("check mode must not prompt"),
            )
            self.assertEqual(
                drift["changed"],
                [{"template": "templates/messages/documentation-request.md"}],
            )

    def test_removed_report_template_retires_generated_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "templates").mkdir()
            report = root / "templates/weekly-report.md"
            shutil.copy(ROOT / "templates/weekly-report.md", report)
            interpreted = {
                "interpretation": load_json("weekly-report.interpretation.json"),
                "example_data": load_json("weekly-report.extraction.json"),
                "frontmatter_values": {
                    "PROJECT_NAME": "Synthetic",
                    "WEEK_START": "2026-08-24",
                    "PROJECT": "PROJ-S",
                    "DEPARTMENT": "Ops",
                    "REPORT_STATUS": "Draft",
                    "REPORT_VERSION": "1",
                    "FINALIZED_AT": "none",
                    "PREVIOUS_REPORT": "none",
                    "SOURCE_REPORT_IDS": "RPT-S",
                },
            }
            sync_report_templates(
                root=root,
                interpreter=lambda **_: interpreted,
                confirm_preview=lambda _: False,
            )
            generated = root / "schemas/reports/company_os_weekly_report.py"
            self.assertTrue(generated.is_file())

            shutil.copy(
                ROOT / "templates/documentation-request.md",
                root / "templates/documentation-request.md",
            )
            report.unlink()
            result = sync_report_templates(
                root=root,
                interpreter=lambda **_: self.fail("removed report must not invoke AI"),
                confirm_preview=lambda _: self.fail("removed report must not prompt"),
            )
            self.assertFalse(generated.exists())
            self.assertTrue(any(row.get("removed") for row in result["changed"]))


if __name__ == "__main__":
    unittest.main()

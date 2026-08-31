from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from schemas.automations.daily_review_result import DailyReviewResult


ROOT = Path(__file__).resolve().parents[3]


class DailyPydanticContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.golden = json.loads(
            (ROOT / "evals/daily/expected/result.json").read_text(encoding="utf-8")
        )

    def assert_invalid(self, value: dict, message: str) -> None:
        with self.assertRaisesRegex(ValidationError, message):
            DailyReviewResult.model_validate(value)

    def knowledge_notes(self, value: dict) -> list[dict]:
        return [
            note
            for update in value["project_note_updates"]
            for note in update["knowledge_notes"]
        ]

    def test_golden_result_validates_strictly(self) -> None:
        result = DailyReviewResult.model_validate(self.golden, strict=True)
        self.assertEqual(result.schema_version, "kamdar-daily-review-result@2.0.0")
        self.assertEqual(len(result.project_note_updates), 5)

    def test_schema_exposes_project_notes_and_removes_legacy_writers(self) -> None:
        schema = DailyReviewResult.model_json_schema()
        self.assertIn("project_note_updates", schema["properties"])
        self.assertNotIn("project_updates", schema["properties"])
        self.assertNotIn("knowledge_updates", schema["properties"])
        self.assertIn("Do not edit Notion Project narrative", schema["description"])

    def test_project_note_updates_forbid_extra_fields(self) -> None:
        value = copy.deepcopy(self.golden)
        value["project_note_updates"][0]["unexpected"] = True
        self.assert_invalid(value, "Extra inputs are not permitted")

    def test_note_kind_must_match_section_and_lane(self) -> None:
        value = copy.deepcopy(self.golden)
        note = value["project_note_updates"][0]["progress_notes"][0]
        note["section"] = "Decisions"
        self.assert_invalid(value, "work_snapshot must use Work and employee updates")

        value = copy.deepcopy(self.golden)
        note = value["project_note_updates"][0]["progress_notes"][0]
        note["observation_kind"] = "decision"
        note["section"] = "Decisions"
        self.assert_invalid(value, "progress_notes contains a knowledge observation")

    def test_progress_note_requires_work_and_employee_identity(self) -> None:
        value = copy.deepcopy(self.golden)
        note = value["project_note_updates"][0]["progress_notes"][0]
        note["work_id"] = None
        note["employee_ids"] = []
        self.assert_invalid(value, "work_snapshot requires work_id")

    def test_workflow_sample_requires_key_and_structured_workflow(self) -> None:
        value = copy.deepcopy(self.golden)
        note = next(
            row for row in self.knowledge_notes(value)
            if row["observation_kind"] == "workflow_sample"
        )
        note["workflow_key"] = None
        self.assert_invalid(value, "workflow_sample requires workflow_key")

        value = copy.deepcopy(self.golden)
        note = next(
            row for row in self.knowledge_notes(value)
            if row["observation_kind"] == "workflow_sample"
        )
        note["structured_payload"]["workflow_observation"] = None
        self.assert_invalid(value, "valid structured workflow_observation")

    def test_problem_note_requires_valid_baseline_and_cost_math(self) -> None:
        value = copy.deepcopy(self.golden)
        note = next(
            row for row in self.knowledge_notes(value)
            if row["observation_kind"] == "problem"
        )
        note["structured_payload"]["problem_baseline"] = None
        self.assert_invalid(value, "valid structured problem_baseline")

        value = copy.deepcopy(self.golden)
        baseline = next(
            row for row in self.knowledge_notes(value)
            if row["observation_kind"] == "problem"
        )["structured_payload"]["problem_baseline"]
        baseline.update(
            volume_per_week=4,
            time_lost_minutes_per_occurrence=30,
            loaded_hourly_cost_myr=100,
            direct_cost_per_week_myr=999,
            direct_cost_formula="4 × 30 minutes ÷ 60 × MYR 100/hour",
        )
        self.assert_invalid(value, "direct cost must equal")

    def test_feature_outcomes_reference_only_owned_project_note_lanes(self) -> None:
        value = copy.deepcopy(self.golden)
        feat1 = next(row for row in value["feature_outcomes"] if row["feature_id"] == "FEAT-0001")
        feat1["output_refs"] = ["/project_note_updates/3"]
        self.assert_invalid(value, "FEAT-0001 must reference every owned output exactly once")

        value = copy.deepcopy(self.golden)
        feat4 = next(row for row in value["feature_outcomes"] if row["feature_id"] == "FEAT-0004")
        feat4["outcome"] = "no_change_needed"
        feat4["output_refs"] = []
        self.assert_invalid(value, "FEAT-0004 has outputs")

    def test_feature_coverage_rejects_duplicate_or_unknown_features(self) -> None:
        value = copy.deepcopy(self.golden)
        value["feature_outcomes"][3]["feature_id"] = "FEAT-0001"
        self.assert_invalid(value, "unexpected or duplicate FEAT-0001")

        value = copy.deepcopy(self.golden)
        value["feature_outcomes"][3]["feature_id"] = "FEAT-9999"
        self.assert_invalid(value, "unexpected or duplicate FEAT-9999")

    def test_documentation_review_verdict_controls_question_shape(self) -> None:
        value = copy.deepcopy(self.golden)
        review = value["documentation_reviews"][0]
        review["missing_requirement_ids"] = []
        self.assert_invalid(value, "needs_information requires at least one missing requirement")

        value = copy.deepcopy(self.golden)
        review = value["documentation_reviews"][1]
        review["comment_text"] = "Unneeded question"
        self.assert_invalid(value, "sufficient forbids both")


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from schemas.automations.daily_review_result import (
    DAILY_REVIEW_RESULT_JSON_SCHEMA,
    DAILY_REVIEW_RESULT_PROMPT,
    DocumentationReview,
    DailyReviewResult,
    KnowledgeUpdate,
    ProblemBaseline,
    ProjectPageUpdate,
    ProjectSectionReplacement,
    WeeklyProgressChase,
    WeeklyDraftEntry,
    WorkflowObservation,
)
from schemas.automations.feature_outcome import (
    FEATURE_OUTCOME_JSON_SCHEMA,
    FEATURE_OUTCOME_PROMPT,
    FeatureEvidence,
    InformationGap,
    InsufficientInformationFeatureOutcome,
    NoChangeFeatureOutcome,
    ProducedFeatureOutcome,
)


ROOT = Path(__file__).resolve().parents[1]
GOLDEN_RESULT = ROOT / "evals" / "daily" / "expected" / "result.json"


class DailyPydanticContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.golden = json.loads(GOLDEN_RESULT.read_text(encoding="utf-8"))

    def fresh_result(self) -> dict:
        return copy.deepcopy(self.golden)

    def assert_invalid(self, payload: dict, message: str) -> None:
        with self.assertRaisesRegex(ValidationError, message):
            DailyReviewResult.model_validate(payload)

    def test_golden_result_validates_and_round_trips(self) -> None:
        result = DailyReviewResult.model_validate(self.golden, strict=True)

        self.assertEqual(
            result.model_dump(mode="json", exclude_none=False),
            self.golden,
        )

    def test_json_schemas_preserve_prompts_and_discriminator(self) -> None:
        self.assertEqual(
            DAILY_REVIEW_RESULT_JSON_SCHEMA["description"],
            DAILY_REVIEW_RESULT_PROMPT,
        )
        self.assertEqual(
            FEATURE_OUTCOME_JSON_SCHEMA["description"],
            FEATURE_OUTCOME_PROMPT,
        )
        self.assertEqual(
            FEATURE_OUTCOME_JSON_SCHEMA["discriminator"]["propertyName"],
            "outcome",
        )
        self.assertEqual(
            ProjectSectionReplacement.model_json_schema()["description"],
            "One directly applicable Project section replacement. The section "
            "name is routing metadata; the actual update is plain text.",
        )
        self.assertEqual(
            WeeklyDraftEntry.model_json_schema()["description"],
            "One directly routable Weekly Draft entry. The integration derives "
            "its source key from kind and work_item_id.",
        )
        provider_models = (
            ProjectSectionReplacement,
            ProjectPageUpdate,
            WeeklyProgressChase,
            WeeklyDraftEntry,
            KnowledgeUpdate,
            DailyReviewResult,
        )
        for model in provider_models:
            with self.subTest(model=model.__name__):
                self.assertFalse(model.model_json_schema()["additionalProperties"])

    def test_non_strict_runtime_models_preserve_zod_strip_behavior(self) -> None:
        value = copy.deepcopy(self.golden)
        value["unexpected"] = "discarded"
        value["project_updates"][0]["unexpected"] = "discarded"
        parsed = DailyReviewResult.model_validate(value)
        self.assertNotIn("unexpected", parsed.model_dump())
        self.assertNotIn("unexpected", parsed.project_updates[0].model_dump())

    def test_all_zod_strict_objects_forbid_extra_fields(self) -> None:
        strict_models = (
            FeatureEvidence,
            InformationGap,
            ProducedFeatureOutcome,
            NoChangeFeatureOutcome,
            InsufficientInformationFeatureOutcome,
            DocumentationReview,
            WorkflowObservation,
            ProblemBaseline,
        )

        for model in strict_models:
            with self.subTest(model=model.__name__):
                self.assertEqual(model.model_config.get("extra"), "forbid")
                self.assertFalse(
                    model.model_json_schema().get("additionalProperties", True)
                )

    def test_documentation_review_needs_information_requires_missing_requirement(self) -> None:
        result = self.fresh_result()
        result["documentation_reviews"][0]["missing_requirement_ids"] = []

        self.assert_invalid(
            result,
            "needs_information requires at least one missing requirement",
        )

    def test_documentation_review_verdict_controls_question_and_comment(self) -> None:
        result = self.fresh_result()
        result["documentation_reviews"][0]["question_key"] = None

        self.assert_invalid(
            result,
            "needs_information requires a question key and comment; sufficient forbids both",
        )

    def test_sufficient_documentation_forbids_missing_requirements(self) -> None:
        result = self.fresh_result()
        result["documentation_reviews"][1]["missing_requirement_ids"] = [
            "decision-rationale"
        ]

        self.assert_invalid(
            result,
            "sufficient documentation cannot list missing requirements",
        )

    def test_unknown_workflow_measure_requires_explicit_gap(self) -> None:
        result = self.fresh_result()
        workflow = result["knowledge_updates"][0]["draft_entries"][2][
            "workflow_observation"
        ]
        workflow["measurement_gaps"] = []

        self.assert_invalid(
            result,
            "unknown workflow volume or timing requires an explicit measurement gap",
        )

    def test_incomplete_cost_baseline_requires_explicit_gap(self) -> None:
        result = self.fresh_result()
        baseline = result["knowledge_updates"][0]["draft_entries"][0][
            "problem_baseline"
        ]
        baseline["measurement_gaps"] = []

        self.assert_invalid(
            result,
            "an incomplete cost baseline requires explicit measurement gaps",
        )

    def test_partial_direct_cost_claim_is_rejected(self) -> None:
        result = self.fresh_result()
        baseline = result["knowledge_updates"][0]["draft_entries"][0][
            "problem_baseline"
        ]
        baseline["direct_cost_per_week_myr"] = 50

        self.assert_invalid(
            result,
            "a direct cost claim requires weekly volume, time lost per occurrence",
        )

    def test_direct_cost_must_match_visible_inputs(self) -> None:
        result = self.fresh_result()
        baseline = result["knowledge_updates"][0]["draft_entries"][0][
            "problem_baseline"
        ]
        baseline.update(
            {
                "volume_per_week": 10,
                "time_lost_minutes_per_occurrence": 30,
                "loaded_hourly_cost_myr": 20,
                "direct_cost_formula": "10 × 30 ÷ 60 × 20",
                "direct_cost_per_week_myr": 99,
                "measurement_gaps": [],
            }
        )

        self.assert_invalid(
            result,
            "direct cost must equal volume per week",
        )

    def test_sop_entry_requires_workflow_observation(self) -> None:
        result = self.fresh_result()
        result["knowledge_updates"][0]["draft_entries"][2][
            "workflow_observation"
        ] = None

        self.assert_invalid(
            result,
            "an SOP candidate requires a structured workflow observation",
        )

    def test_problem_entry_requires_problem_baseline(self) -> None:
        result = self.fresh_result()
        result["knowledge_updates"][0]["draft_entries"][0][
            "problem_baseline"
        ] = None

        self.assert_invalid(
            result,
            "a problem or inefficiency requires a structured problem baseline",
        )

    def test_decision_entry_forbids_structured_payloads(self) -> None:
        result = self.fresh_result()
        decision = result["knowledge_updates"][0]["draft_entries"][1]
        decision["workflow_observation"] = copy.deepcopy(
            result["knowledge_updates"][0]["draft_entries"][2][
                "workflow_observation"
            ]
        )

        self.assert_invalid(
            result,
            "a Decision entry cannot carry workflow or problem baseline payloads",
        )

    def test_coverage_rejects_unexpected_feature(self) -> None:
        result = self.fresh_result()
        result["feature_outcomes"][3]["feature_id"] = "FEAT-9999"

        self.assert_invalid(result, "unexpected feature FEAT-9999")

    def test_coverage_rejects_duplicate_and_missing_feature(self) -> None:
        result = self.fresh_result()
        duplicate = copy.deepcopy(result["feature_outcomes"][0])
        result["feature_outcomes"][3] = duplicate

        self.assert_invalid(result, "duplicate outcome for FEAT-0001")
        self.assert_invalid(result, "missing outcome for FEAT-0004")

    def test_coverage_rejects_output_ref_for_wrong_root(self) -> None:
        result = self.fresh_result()
        result["feature_outcomes"][0]["output_refs"] = ["/knowledge_updates/0"]

        self.assert_invalid(
            result,
            "/knowledge_updates/0 does not resolve to a project_updates output",
        )

    def test_coverage_requires_every_output_exactly_once(self) -> None:
        result = self.fresh_result()
        result["feature_outcomes"][1]["output_refs"].pop()

        self.assert_invalid(
            result,
            "FEAT-0002 must reference every documentation_reviews output exactly once",
        )

    def test_coverage_rejects_no_change_when_outputs_exist(self) -> None:
        result = self.fresh_result()
        result["feature_outcomes"][0].update(
            {
                "outcome": "no_change_needed",
                "output_refs": [],
                "information_gaps": [],
            }
        )

        self.assert_invalid(
            result,
            "FEAT-0001 has 1 output rows and cannot be no_change_needed",
        )


if __name__ == "__main__":
    unittest.main()

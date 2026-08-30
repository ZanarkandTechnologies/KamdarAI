from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from schemas.automations.artifact_quality_review import ArtifactQualityReview
from schemas.automations.meeting_commitment_intake_result import MeetingCommitmentIntakeResult
from schemas.automations.weekly_context import WeeklyContext
from schemas.automations.weekly_review_result import WeeklyReviewResult


ROOT = Path(__file__).resolve().parents[1]


def load_json(relative_path: str) -> dict:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


class WeeklyContextPydanticTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = load_json("evals/weekly/expected/context.json")

    def assert_rejected(self, mutation) -> None:
        payload = copy.deepcopy(self.payload)
        mutation(payload)
        with self.assertRaises(ValidationError):
            WeeklyContext.model_validate(payload)

    def test_golden_context_validates_and_exports_formats(self) -> None:
        context = WeeklyContext.model_validate_json(json.dumps(self.payload), strict=True)
        self.assertEqual(context.context_id, "weekly-context-2026-W34")
        dumped = json.loads(context.model_dump_json())
        self.assertEqual(dumped["collected_at"], self.payload["collected_at"])
        self.assertEqual(
            [row["finalized_at"] for row in dumped["prior_reports"]],
            [row["finalized_at"] for row in self.payload["prior_reports"]],
        )
        schema = WeeklyContext.model_json_schema()
        self.assertEqual(schema["properties"]["collected_at"]["format"], "date-time")

    def test_datetime_remains_a_strict_offset_string(self) -> None:
        for value in (
            "2026-08-24T17:30:00",
            "2026-08-24t17:30:00+08:00",
            "2026-02-30T17:30:00+08:00",
            1_788_000_000,
        ):
            with self.subTest(value=value):
                self.assert_rejected(lambda payload, value=value: payload.update(collected_at=value))

    def test_frozen_input_refinements_reject_invalid_payloads(self) -> None:
        mutations = [
            lambda p: p["prior_reports"][0].update(finalized_at=None),
            lambda p: p["prior_reports"][0].update(report_markdown=""),
            lambda p: p["project_notes"][0].update(source_note_keys=[]),
            lambda p: p["freeze_manifest"]["files"][0].update(sha256="0" * 64),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)

    def test_context_refinements_reject_invalid_payloads(self) -> None:
        def duplicate_project(payload):
            payload["projects"].append(copy.deepcopy(payload["projects"][0]))

        mutations = [
            duplicate_project,
            lambda p: p["expected_areas"].append(p["expected_areas"][0]),
            lambda p: p["prior_reports"][0].update(project_id="UNKNOWN"),
            lambda p: p["prior_reports"][0].update(area=None),
            lambda p: p["freeze_manifest"]["files"].pop(),
            lambda p: p["project_notes"].pop(),
            lambda p: p.update(extra_field=True),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)


class WeeklyReviewResultPydanticTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = load_json("evals/weekly/expected/result.json")

    def assert_rejected(self, mutation) -> None:
        payload = copy.deepcopy(self.payload)
        mutation(payload)
        with self.assertRaises(ValidationError):
            WeeklyReviewResult.model_validate(payload)

    def test_golden_result_validates_and_preserves_prompt(self) -> None:
        result = WeeklyReviewResult.model_validate_json(json.dumps(self.payload), strict=True)
        self.assertEqual(result.week, "2026-W34")
        dumped = json.loads(result.model_dump_json())
        self.assertEqual(
            [row["finalized_at"] for row in dumped["report_results"]],
            [row["finalized_at"] for row in self.payload["report_results"]],
        )
        self.assertIn(
            "Return one Weekly review result",
            WeeklyReviewResult.model_json_schema()["description"],
        )

    def test_report_refinements_reject_invalid_payloads(self) -> None:
        company_index = next(
            index for index, row in enumerate(self.payload["report_results"])
            if row["report_level"] == "Company"
        )
        mutations = [
            lambda p: p["report_results"][0].update(finalized_at=None),
            lambda p: p["report_results"][0].update(prior_version=99),
            lambda p: p["report_results"][0].update(project_id=None),
            lambda p: p["report_results"][0].update(report_level="Area"),
            lambda p: p["report_results"][0].update(report_level="Company"),
            lambda p: p["report_results"][0].update(
                company_executive_context=copy.deepcopy(
                    p["report_results"][company_index]["company_executive_context"]
                )
            ),
            lambda p: p["report_results"][company_index].update(company_executive_context=None),
            lambda p: p["report_results"][company_index]["company_executive_context"]["problems"][0].update(
                title="A title absent from Markdown"
            ),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)

    def test_promotion_refinements_reject_invalid_payloads(self) -> None:
        problem_index = next(
            index for index, row in enumerate(self.payload["promotion_dispositions"])
            if row["disposition"] == "promoted" and row["kind"] == "problem"
        )
        decision_index = next(
            index for index, row in enumerate(self.payload["promotion_dispositions"])
            if row["disposition"] == "promoted" and row["kind"] == "decision"
        )
        sop_index = next(
            index for index, row in enumerate(self.payload["promotion_dispositions"])
            if row["disposition"] == "promoted" and row["kind"] == "sop"
        )
        monitor_index = next(
            index for index, row in enumerate(self.payload["promotion_dispositions"])
            if row["disposition"] == "monitor"
        )

        def empty_problem_measurements(payload):
            proof = payload["promotion_dispositions"][problem_index]["problem_baseline_proof"]
            proof["measured_metrics"] = []
            proof["measurement_gaps"] = []

        def baseline_placeholder(payload):
            row = payload["promotion_dispositions"][problem_index]
            row["rendered_markdown"] = (
                "## Before baseline and economics\n\nNo baseline.\n\n"
                + row["problem_baseline_proof"]["workflow_name"]
                + row["problem_baseline_proof"]["affected_step"]
                + row["problem_baseline_proof"]["baseline_date"]
            )

        mutations = [
            empty_problem_measurements,
            lambda p: p["promotion_dispositions"][decision_index]["decision_preservation_proof"].update(
                selected_option="not considered"
            ),
            lambda p: p["promotion_dispositions"][monitor_index].update(destination_id="ISSUE-X"),
            lambda p: p["promotion_dispositions"][monitor_index].update(rendered_markdown="new record"),
            lambda p: p["promotion_dispositions"][problem_index].update(problem_baseline_proof=None),
            lambda p: p["promotion_dispositions"][problem_index].update(
                rendered_markdown=p["promotion_dispositions"][problem_index]["rendered_markdown"].replace(
                    "## Before baseline and economics", "## Baseline"
                )
            ),
            baseline_placeholder,
            lambda p: p["promotion_dispositions"][problem_index]["problem_baseline_proof"].update(
                workflow_name="workflow absent from markdown"
            ),
            lambda p: p["promotion_dispositions"][decision_index].update(
                decision_preservation_proof=None
            ),
            lambda p: p["promotion_dispositions"][decision_index]["decision_preservation_proof"]["options_considered"][0].update(
                option="option absent from markdown"
            ),
            lambda p: p["promotion_dispositions"][decision_index]["decision_preservation_proof"].update(
                accepted_tradeoff="tradeoff absent from markdown"
            ),
            lambda p: p["promotion_dispositions"][sop_index].update(
                rendered_markdown=p["promotion_dispositions"][sop_index]["rendered_markdown"].replace(
                    "template_id: kamdar-employee-sop", "template_id: software-skill"
                )
            ),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)

    def test_top_level_and_feature_coverage_refinements_reject_invalid_payloads(self) -> None:
        company_index = next(
            index for index, row in enumerate(self.payload["report_results"])
            if row["report_level"] == "Company"
        )

        def final_company(payload):
            payload["report_results"][company_index]["report_status"] = "Final"
            payload["report_results"][company_index]["finalized_at"] = "2026-08-24T18:00:00+08:00"

        def missing_gap_code(payload):
            payload["feature_outcomes"][0]["information_gaps"][0]["code"] = "different-gap"

        def duplicate_feature(payload):
            payload["feature_outcomes"][2]["feature_id"] = "FEAT-0006"

        def wrong_output_ref(payload):
            payload["feature_outcomes"][1]["output_refs"][0] = "/report_results/0"

        def no_change_with_outputs(payload):
            outcome = payload["feature_outcomes"][2]
            outcome["outcome"] = "no_change_needed"
            outcome["output_refs"] = []
            outcome["information_gaps"] = []

        mutations = [
            final_company,
            lambda p: p["feature_outcomes"][0].update(
                outcome="produced", information_gaps=[]
            ),
            missing_gap_code,
            duplicate_feature,
            wrong_output_ref,
            no_change_with_outputs,
            lambda p: p.update(extra_field=True),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)


class MeetingCommitmentPydanticTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = load_json("evals/meeting-intake/expected/result.json")

    def assert_rejected(self, mutation) -> None:
        payload = copy.deepcopy(self.payload)
        mutation(payload)
        with self.assertRaises(ValidationError):
            MeetingCommitmentIntakeResult.model_validate(payload)

    def test_golden_result_validates_and_exports_date_format(self) -> None:
        result = MeetingCommitmentIntakeResult.model_validate_json(
            json.dumps(self.payload), strict=True
        )
        self.assertEqual(len(result.task_creations), 2)
        self.assertEqual(json.loads(result.model_dump_json()), self.payload)
        task_ref = MeetingCommitmentIntakeResult.model_json_schema()["$defs"]["MeetingTaskCreation"]
        self.assertEqual(task_ref["properties"]["due_date"]["format"], "date")

    def test_dates_remain_strict_calendar_strings(self) -> None:
        for value in ("2026-8-22", "2026-02-30", "2026-08-22T00:00:00", 1787356800):
            with self.subTest(value=value):
                self.assert_rejected(
                    lambda payload, value=value: payload["task_creations"][0].update(due_date=value)
                )

    def test_task_and_result_refinements_reject_invalid_payloads(self) -> None:
        def remove_source_id(payload):
            payload["task_creations"][0]["source_ids"].remove(payload["meeting_id"])

        def missing_gap(payload):
            payload["feature_outcomes"][0]["information_gaps"] = [
                gap for gap in payload["feature_outcomes"][0]["information_gaps"]
                if gap["code"] != "missing-owner"
            ]

        def wrong_ref(payload):
            payload["feature_outcomes"][0]["output_refs"][0] = "/blocked_commitments/0"

        mutations = [
            remove_source_id,
            lambda p: p["task_creations"][0].update(notes_markdown="No meeting trace"),
            lambda p: p["feature_outcomes"][0].update(
                outcome="produced", information_gaps=[]
            ),
            missing_gap,
            lambda p: p["feature_outcomes"][0].update(feature_id="FEAT-9999"),
            wrong_ref,
            lambda p: p.update(extra_field=True),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.assert_rejected(mutation)


class ArtifactQualityReviewPydanticTests(unittest.TestCase):
    @staticmethod
    def valid_payload() -> dict:
        check = {"pass": True, "evidence_refs": ["/report_results/0"], "findings": []}
        return {
            "schema_version": "kamdar-artifact-quality-review@1.0.0",
            "lane": "artifact-quality-review",
            "independent": True,
            "scope": "weekly",
            "context_id": "weekly-context-2026-W34",
            "result_sha256": "a" * 64,
            "rubric_path": "evals/rubrics/end-user-artifact-quality.md",
            "tier": "A",
            "verdict": "pass",
            "artifacts": [{
                "artifact_pointer": "/report_results/0",
                "checks": {
                    "referential_clarity": copy.deepcopy(check),
                    "end_user_value": copy.deepcopy(check),
                    "readability": copy.deepcopy(check),
                    "template_fidelity": copy.deepcopy(check),
                    "groundedness": copy.deepcopy(check),
                    "workflow_reconstructability": copy.deepcopy(check),
                    "baseline_integrity": copy.deepcopy(check),
                },
            }],
            "hard_gate_failures": [],
            "repair_route": "none",
            "review_path": "evals/runs/quality.json",
        }

    def test_valid_passing_review_and_pass_alias(self) -> None:
        review = ArtifactQualityReview.model_validate(self.valid_payload())
        dumped = review.model_dump(by_alias=True)
        self.assertTrue(dumped["artifacts"][0]["checks"]["groundedness"]["pass"])

    def test_passing_review_requires_every_gate(self) -> None:
        mutations = [
            lambda p: p.update(tier="B"),
            lambda p: p.update(hard_gate_failures=["missing evidence"]),
            lambda p: p.update(repair_route="regenerate"),
            lambda p: p["artifacts"][0]["checks"]["groundedness"].update(pass_=False),
            lambda p: p["artifacts"][0]["checks"]["readability"].update(findings=["dense"]),
        ]
        for mutation in mutations:
            payload = self.valid_payload()
            mutation(payload)
            # The input key is the JSON alias, not the Python-safe attribute name.
            if "pass_" in payload["artifacts"][0]["checks"]["groundedness"]:
                payload["artifacts"][0]["checks"]["groundedness"]["pass"] = payload["artifacts"][0]["checks"]["groundedness"].pop("pass_")
            with self.subTest(mutation=mutation), self.assertRaises(ValidationError):
                ArtifactQualityReview.model_validate(payload)

    def test_rejects_bad_pointer_hash_and_extra_fields(self) -> None:
        mutations = [
            lambda p: p["artifacts"][0].update(artifact_pointer="report_results/0"),
            lambda p: p.update(result_sha256="ABC"),
            lambda p: p.update(extra_field=True),
        ]
        for mutation in mutations:
            payload = self.valid_payload()
            mutation(payload)
            with self.subTest(mutation=mutation), self.assertRaises(ValidationError):
                ArtifactQualityReview.model_validate(payload)


if __name__ == "__main__":
    unittest.main()

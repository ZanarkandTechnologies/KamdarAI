from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from schemas.automations.daily_context_diff import DailyContextDiff
from schemas.automations.daily_idempotency_rerun_receipt import (
    DailyIdempotencyRerunReceipt,
)
from schemas.automations.daily_integration_receipt import (
    DailyIntegrationReceipt,
    assert_daily_processing_safety,
)


ROOT = Path(__file__).resolve().parents[1]
EXPECTED = ROOT / "evals" / "daily" / "expected"


def fixture(name: str) -> dict:
    return json.loads((EXPECTED / name).read_text())


class DailyContextDiffParityTests(unittest.TestCase):
    def test_current_golden_validates_and_legacy_context_is_rejected(self) -> None:
        context = DailyContextDiff.model_validate(fixture("context.json"))
        self.assertEqual(context.model_dump(mode="json"), fixture("context.json"))
        with self.assertRaises(ValidationError):
            DailyContextDiff.model_validate(fixture("reference-context.json"))
        schema = DailyContextDiff.model_json_schema()
        self.assertEqual(schema["properties"]["artifact_version"]["const"], "0.3.0")

    def test_current_project_and_documentation_fields_are_structurally_required(self) -> None:
        missing_sections = fixture("context.json")
        del missing_sections["projects"][0]["current_sections"]
        missing_next_action = fixture("context.json")
        del missing_next_action["work_items"][0]["documentation"]["next_action"]
        missing_information = fixture("context.json")
        del missing_information["work_items"][0]["documentation"]["missing_information"]
        for data in (missing_sections, missing_next_action, missing_information):
            with self.assertRaises(ValidationError):
                DailyContextDiff.model_validate(data)

    def test_manifest_refinements_reject_invalid_rows(self) -> None:
        cases = []
        duplicate = fixture("context.json")
        duplicate["source_manifest"][0]["source_ids"].append(
            duplicate["source_manifest"][0]["source_ids"][0]
        )
        duplicate["source_manifest"][0]["record_count"] += 1
        cases.append(duplicate)
        bad_count = fixture("context.json")
        bad_count["source_manifest"][0]["record_count"] += 1
        cases.append(bad_count)
        fetched_gap = fixture("context.json")
        fetched_gap["source_manifest"][0]["gap"] = "unexpected"
        cases.append(fetched_gap)
        unavailable_without_gap = fixture("context.json")
        unavailable_without_gap["source_manifest"][0]["status"] = "unavailable"
        cases.append(unavailable_without_gap)
        for data in cases:
            with self.subTest(data=data["source_manifest"][0]):
                with self.assertRaises(ValidationError):
                    DailyContextDiff.model_validate(data)

    def test_weekly_reset_and_work_state_refinements_reject_invalid_rows(self) -> None:
        cases = []
        requested_without_details = fixture("context.json")
        requested_without_details["projects"][0]["weekly_attention_reset"][
            "requested"
        ] = True
        cases.append(requested_without_details)
        unrequested_with_details = fixture("context.json")
        unrequested_with_details["projects"][0]["weekly_attention_reset"][
            "week"
        ] = "2026-W34"
        cases.append(unrequested_with_details)
        done_wrong_status = fixture("context.json")
        done_row = next(
            row
            for row in done_wrong_status["work_items"]
            if row["selection_reason"] == "done_unprocessed"
        )
        done_row["status"] = "open"
        cases.append(done_wrong_status)
        done_already_processed = fixture("context.json")
        done_row = next(
            row
            for row in done_already_processed["work_items"]
            if row["selection_reason"] == "done_unprocessed"
        )
        done_row["ai_review"] = "Processed"
        done_row["daily_review_version"] = "daily-review-v2"
        cases.append(done_already_processed)
        processed_without_version = fixture("context.json")
        processed_row = next(
            row
            for row in processed_without_version["work_items"]
            if row["ai_review"] == "Processed"
        )
        processed_row["daily_review_version"] = None
        cases.append(processed_without_version)
        pending_with_version = fixture("context.json")
        pending_row = next(
            row
            for row in pending_with_version["work_items"]
            if row["ai_review"] != "Processed"
        )
        pending_row["daily_review_version"] = "daily-review-v2"
        cases.append(pending_with_version)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyContextDiff.model_validate(data)

    def test_context_integrity_refinements_reject_invalid_graphs(self) -> None:
        cases = []
        reversed_window = fixture("context.json")
        reversed_window["evidence_window"]["start"] = "2026-08-26T00:00:00+08:00"
        cases.append(reversed_window)
        for collection in ("projects", "work_items", "meetings", "people"):
            duplicate = fixture("context.json")
            duplicate[collection].append(copy.deepcopy(duplicate[collection][0]))
            cases.append(duplicate)
        absent_source = fixture("context.json")
        absent_source["work_items"][0]["source_id"] = "ABSENT"
        cases.append(absent_source)
        absent_project_owner = fixture("context.json")
        absent_project_owner["projects"][0]["owner_person_id"] = "ABSENT"
        cases.append(absent_project_owner)
        reset_source_mismatch = fixture("context.json")
        reset_source_mismatch["projects"][0]["weekly_attention_reset"][
            "source_id"
        ] = "WRONG"
        cases.append(reset_source_mismatch)
        absent_project = fixture("context.json")
        absent_project["work_items"][0]["project_id"] = "ABSENT"
        cases.append(absent_project)
        absent_work_owner = fixture("context.json")
        absent_work_owner["work_items"][0]["owner_person_id"] = "ABSENT"
        cases.append(absent_work_owner)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyContextDiff.model_validate(data)

    def test_strict_objects_and_formats_are_enforced(self) -> None:
        extra = fixture("context.json")
        extra["unexpected"] = True
        with self.assertRaises(ValidationError):
            DailyContextDiff.model_validate(extra)
        bad_date = fixture("context.json")
        bad_date["local_day"] = "August 25, 2026"
        with self.assertRaises(ValidationError):
            DailyContextDiff.model_validate(bad_date)
        naive_datetime = fixture("context.json")
        naive_datetime["evidence_window"]["start"] = "2026-08-25T00:00:00"
        with self.assertRaises(ValidationError):
            DailyContextDiff.model_validate(naive_datetime)


class DailyIntegrationReceiptParityTests(unittest.TestCase):
    def test_golden_receipt_validates_and_schema_is_generated(self) -> None:
        receipt = DailyIntegrationReceipt.model_validate(
            fixture("integration-receipt.json")
        )
        self.assertIs(assert_daily_processing_safety(receipt), receipt)
        schema = DailyIntegrationReceipt.model_json_schema()
        self.assertEqual(schema["type"], "object")
        self.assertFalse(schema["additionalProperties"])

    def test_effect_refinements_reject_invalid_routing_and_readback(self) -> None:
        def first(state: str, data: dict) -> dict:
            return next(row for row in data["effects"] if row["outcome"]["state"] == state)

        cases = []
        no_finding_route = fixture("integration-receipt.json")
        first("no_finding", no_finding_route)["integration"] = "notion"
        cases.append(no_finding_route)
        whole_pointer = fixture("integration-receipt.json")
        first("applied", whole_pointer)["result_pointer"] = "/project_note_updates"
        cases.append(whole_pointer)
        fake_operation = fixture("integration-receipt.json")
        first("applied", fake_operation)["operation"] = "record_no_finding"
        cases.append(fake_operation)
        bad_eval_route = fixture("integration-receipt.json")
        first("delivered_to_eval_sink", bad_eval_route)["feature_id"] = "FEAT-0002"
        cases.append(bad_eval_route)
        bad_recipient = fixture("integration-receipt.json")
        first("delivered_to_eval_sink", bad_recipient)["outcome"][
            "intended_recipient_person_id"
        ] = "OTHER"
        cases.append(bad_recipient)
        bad_target = fixture("integration-receipt.json")
        first("applied", bad_target)["outcome"]["read_back"]["target_id"] = "OTHER"
        cases.append(bad_target)
        bad_hash = fixture("integration-receipt.json")
        first("applied", bad_hash)["outcome"]["read_back"]["payload_hash"] = "0" * 64
        cases.append(bad_hash)
        bad_response = fixture("integration-receipt.json")
        first("applied", bad_response)["outcome"]["read_back"][
            "provider_response_id"
        ] = "OTHER"
        cases.append(bad_response)
        bad_url = fixture("integration-receipt.json")
        first("applied", bad_url)["target"]["target_url"] = "https://client.example.com/private"
        cases.append(bad_url)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyIntegrationReceipt.model_validate(data)

    def test_processing_safety_refinements_reject_unsafe_decisions(self) -> None:
        cases = []
        duplicate_effect = fixture("integration-receipt.json")
        duplicate_effect["effects"][1]["effect_id"] = duplicate_effect["effects"][0][
            "effect_id"
        ]
        cases.append(duplicate_effect)
        duplicate_decision = fixture("integration-receipt.json")
        duplicate_decision["work_processing"].append(
            copy.deepcopy(duplicate_decision["work_processing"][0])
        )
        cases.append(duplicate_decision)
        missing_effect = fixture("integration-receipt.json")
        missing_effect["work_processing"][0]["required_effect_ids"] = ["UNKNOWN"]
        cases.append(missing_effect)
        bad_state = fixture("integration-receipt.json")
        bad_state["work_processing"][0]["state"] = "processed"
        bad_state["work_processing"][0]["processed_at"] = "2026-08-25T17:12:00+08:00"
        bad_state["work_processing"][0]["ai_review_after"] = "Processed"
        bad_state["work_processing"][0]["daily_review_version_after"] = "daily-review-v2"
        cases.append(bad_state)
        missing_processed_at = fixture("integration-receipt.json")
        processed = next(
            row for row in missing_processed_at["work_processing"] if row["state"] == "processed"
        )
        processed["processed_at"] = None
        cases.append(missing_processed_at)
        mismatched_fields = fixture("integration-receipt.json")
        mismatched_fields["work_processing"][0]["ai_review_after"] = "Blocked"
        cases.append(mismatched_fields)
        missing_decision = fixture("integration-receipt.json")
        missing_decision["work_processing"] = missing_decision["work_processing"][1:]
        cases.append(missing_decision)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyIntegrationReceipt.model_validate(data)


class DailyIdempotencyReceiptParityTests(unittest.TestCase):
    def test_golden_rerun_receipt_validates_and_schema_is_generated(self) -> None:
        DailyIdempotencyRerunReceipt.model_validate(
            fixture("idempotency-receipt.json")
        )
        schema = DailyIdempotencyRerunReceipt.model_json_schema()
        self.assertEqual(schema["type"], "object")
        self.assertFalse(schema["additionalProperties"])

    def test_audit_effect_refinements_reject_invalid_evidence(self) -> None:
        def first(outcome: str, data: dict) -> dict:
            return next(row for row in data["audit_effects"] if row["outcome"] == outcome)

        cases = []
        duplicate_without_readback = fixture("idempotency-receipt.json")
        first("duplicate", duplicate_without_readback)["lookup_read_back"] = None
        cases.append(duplicate_without_readback)
        no_finding_with_readback = fixture("idempotency-receipt.json")
        source = copy.deepcopy(first("duplicate", no_finding_with_readback)["lookup_read_back"])
        first("no_finding", no_finding_with_readback)["lookup_read_back"] = source
        cases.append(no_finding_with_readback)
        failed_with_readback = fixture("idempotency-receipt.json")
        source = copy.deepcopy(first("duplicate", failed_with_readback)["lookup_read_back"])
        first("failed", failed_with_readback)["lookup_read_back"] = source
        cases.append(failed_with_readback)
        whole_pointer = fixture("idempotency-receipt.json")
        first("failed", whole_pointer)["result_pointer"] = "/project_note_updates"
        cases.append(whole_pointer)
        readback_mismatch = fixture("idempotency-receipt.json")
        first("duplicate", readback_mismatch)["lookup_read_back"]["target_id"] = "OTHER"
        cases.append(readback_mismatch)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyIdempotencyRerunReceipt.model_validate(data)

    def test_processing_and_receipt_refinements_reject_invalid_audits(self) -> None:
        cases = []
        state_changed = fixture("idempotency-receipt.json")
        state_changed["work_processing"][0]["rerun_state"] = "blocked"
        cases.append(state_changed)
        fields_mismatch = fixture("idempotency-receipt.json")
        fields_mismatch["work_processing"][0]["ai_review_after"] = "Blocked"
        cases.append(fields_mismatch)
        duplicate_effect = fixture("idempotency-receipt.json")
        duplicate_effect["audit_effects"].append(
            copy.deepcopy(duplicate_effect["audit_effects"][0])
        )
        duplicate_effect["summary"]["original_effect_count"] += 1
        duplicate_effect["summary"]["audited_effect_count"] += 1
        duplicate_effect["summary"]["duplicate_count"] += 1
        cases.append(duplicate_effect)
        duplicate_work = fixture("idempotency-receipt.json")
        duplicate_work["work_processing"].append(
            copy.deepcopy(duplicate_work["work_processing"][0])
        )
        cases.append(duplicate_work)
        bad_summary = fixture("idempotency-receipt.json")
        bad_summary["summary"]["duplicate_count"] += 1
        cases.append(bad_summary)
        for index, data in enumerate(cases):
            with self.subTest(case=index):
                with self.assertRaises(ValidationError):
                    DailyIdempotencyRerunReceipt.model_validate(data)


if __name__ == "__main__":
    unittest.main()

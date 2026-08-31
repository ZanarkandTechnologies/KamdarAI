from __future__ import annotations

import unittest

from scripts.automation_prepare import (
    _feature_state,
    _generation_prompt,
    _judge_assertions,
    _judge_prompt,
    _validate_judge,
    PrepareError,
    automation_instruction,
    discard_invalid_project_note_drafts,
    enforce_weekly_input_boundary,
    normalize_result,
    normalize_user_facing_prose,
    render_preview,
    repair_feedback,
    validate_configured_source_provenance,
    validate_source_count_claims,
    validate_user_facing_prose,
)


class AutomationPrepareTests(unittest.TestCase):
    def test_no_sync_instruction_omits_only_the_daily_and_weekly_sync_step(self) -> None:
        daily_full = automation_instruction("daily", sync_to_provider=True)
        daily_analyze = automation_instruction("daily", sync_to_provider=False)
        weekly_full = automation_instruction("weekly", sync_to_provider=True)
        weekly_analyze = automation_instruction("weekly", sync_to_provider=False)

        self.assertIn("**4 — Apply", daily_full)
        self.assertNotIn("**4 — Apply", daily_analyze)
        self.assertIn("**4 — Sync to provider", weekly_full)
        self.assertNotIn("**4 — Sync to provider", weekly_analyze)
        self.assertIn("## Output", daily_analyze)
        self.assertIn("## Output", weekly_analyze)

    def test_daily_prompt_forbids_unowned_progress_and_partial_problem_notes(self) -> None:
        prompt = _generation_prompt("daily", {}, {"input_mode": "configured_sources"}, [])
        self.assertIn("employee_ids must never be empty or invented", prompt)
        self.assertIn("complete structured problem baseline", prompt)

    def test_weekly_prompt_keeps_feature_outputs_separate(self) -> None:
        prompt = _generation_prompt("weekly", {}, {"input_mode": "configured_sources"}, [])
        self.assertIn("FEAT-0006 owns promotion_dispositions only", prompt)
        self.assertIn("never be produced with an empty promotion_dispositions array", prompt)
        self.assertIn("do not emit a Company report", prompt)

    def test_new_weekly_report_version_zero_is_derived_as_one(self) -> None:
        result = {
            "feature_outcomes": [],
            "report_results": [{
                "report_level": "Project",
                "prior_version": None,
                "report_version": 0,
            }],
        }
        self.assertEqual(normalize_result("weekly", result)["report_results"][0]["report_version"], 1)

    def test_false_assertion_fails_even_when_information_is_missing(self) -> None:
        outcome = {"outcome": "insufficient_information"}
        self.assertEqual(
            _feature_state(outcome, {"verdict": "blocked", "tier": "D", "assertions": [{"met": False}]}),
            "fail",
        )
        self.assertEqual(
            _feature_state(outcome, {"verdict": "blocked", "tier": "D", "assertions": [{"met": True}]}),
            "needs_information",
        )

    def test_invalid_project_note_draft_becomes_existing_information_gap(self) -> None:
        result = {
            "feature_outcomes": [{
                "feature_id": "FEAT-0004",
                "outcome": "produced",
                "evidence": [{"source_id": "project-1", "observation": "A possible problem was observed."}],
                "reasoning_summary": "A problem note is ready.",
                "output_refs": ["/project_note_updates/0"],
                "information_gaps": [],
            }],
            "project_note_updates": [{
                "project_id": "project-1",
                "progress_notes": [],
                "knowledge_notes": [{
                    "observation_kind": "problem",
                    "structured_payload": {},
                }],
            }],
        }
        safe, dropped = discard_invalid_project_note_drafts("daily", result)
        self.assertEqual(dropped, 1)
        self.assertEqual(safe["project_note_updates"], [])
        outcome = safe["feature_outcomes"][0]
        self.assertEqual(outcome["outcome"], "insufficient_information")
        self.assertEqual(outcome["information_gaps"][0]["code"], "missing-project-note-structure")
        self.assertNotIn("produced", safe["run_notes"].lower())
        self.assertIn("were withheld", safe["run_notes"])

    def test_weekly_cannot_carry_live_work_without_frozen_project_notes(self) -> None:
        result = {
            "feature_outcomes": [{
                "feature_id": "FEAT-0007",
                "outcome": "produced",
                "evidence": [{"source_id": "task-1", "observation": "Open Work exists."}],
                "reasoning_summary": "Carry-forward is ready.",
                "output_refs": ["/carry_forward_updates/0"],
                "information_gaps": [],
            }],
            "promotion_dispositions": [],
            "carry_forward_updates": [{"project_id": "project-1"}],
        }
        bounded, corrections = enforce_weekly_input_boundary(
            "weekly", result, {"current_week": "2026-W36", "private_project_notes": {}}
        )
        self.assertGreaterEqual(corrections, 1)
        self.assertEqual(bounded["carry_forward_updates"], [])
        outcome = bounded["feature_outcomes"][0]
        self.assertEqual(outcome["outcome"], "insufficient_information")
        self.assertEqual(outcome["information_gaps"][0]["code"], "missing-weekly-project-notes")
        self.assertIn("2026-W36", bounded["run_notes"])
        self.assertNotIn("private_project_notes", bounded["run_notes"])
        self.assertNotIn("insufficient_information", bounded["run_notes"])

        result["feature_outcomes"][0].update({
            "outcome": "insufficient_information",
            "information_gaps": [{"code": "model-wording", "why_needed": "Unsafe model wording."}],
        })
        standardized, _ = enforce_weekly_input_boundary(
            "weekly", result, {"current_week": "2026-W36", "private_project_notes": {}}
        )
        self.assertEqual(
            standardized["feature_outcomes"][0]["information_gaps"][0]["code"],
            "missing-weekly-project-notes",
        )

        mutable_only, _ = enforce_weekly_input_boundary(
            "weekly",
            result,
            {
                "current_week": "2026-W36",
                "private_project_notes": {"project--one.md": "mutable"},
                "project_notes_freeze_sha256": None,
                "project_notes_freeze_manifest": None,
            },
        )
        self.assertEqual(mutable_only["carry_forward_updates"], [])

    def test_configured_source_results_reject_fixture_language(self) -> None:
        issues = validate_configured_source_provenance(
            {"run_notes": "Prepared from a frozen seeded fixture."},
            {"input_mode": "configured_sources"},
        )
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["path"], "run_notes")

    def test_configured_source_results_allow_production_week_freeze_language(self) -> None:
        self.assertEqual(
            validate_configured_source_provenance(
                {"run_notes": "The production Project Notes source week is frozen for review."},
                {"input_mode": "configured_sources"},
            ),
            [],
        )

    def test_explicit_source_total_must_match_the_captured_read(self) -> None:
        snapshot = {
            "sources": {
                "projects": {
                    "source": {"id": "projects-source", "title": "Projects"},
                    "selected_count": 3,
                }
            }
        }
        issues = validate_source_count_claims(
            {
                "feature_outcomes": [{
                    "evidence": [{
                        "source_id": "projects-source",
                        "observation": "The database has 53 project records present.",
                    }]
                }]
            },
            snapshot,
        )
        self.assertEqual(len(issues), 1)
        self.assertIn("selected 3", issues[0]["message"])

    def test_nonconfigured_results_do_not_apply_live_provenance_gate(self) -> None:
        self.assertEqual(
            validate_configured_source_provenance(
                {"run_notes": "Frozen fixture."},
                {"input_mode": "frozen"},
            ),
            [],
        )

    def test_prepare_gap_cannot_require_stage_two_delivery_route(self) -> None:
        issues = validate_configured_source_provenance(
            {
                "feature_outcomes": [{
                    "information_gaps": [{
                        "needed_field": "authorized delivery route",
                        "why_needed": "Needed to publish",
                        "where_to_add": "workspace",
                        "question": "Which route?",
                    }]
                }]
            },
            {"input_mode": "configured_sources"},
        )
        self.assertEqual(len(issues), 1)
        self.assertIn("Stage 2", issues[0]["message"])

    def test_connected_project_template_omissions_are_documentation_findings(self) -> None:
        snapshot = {
            "input_mode": "configured_sources",
            "sources": {
                "projects": {
                    "records": [{
                        "id": "project-1",
                        "body_markdown": "## Objectives\n\nLaunch the system.\n\nReal operating notes.",
                    }]
                }
            },
        }
        finding = {
            "feature_outcomes": [{
                "information_gaps": [{
                    "code": "missing-project-sections",
                    "needed_field": "Project knowledge and This week's attention sections",
                    "source_ids_checked": ["project-1"],
                    "why_needed": "The configured Project template requires these sections.",
                    "where_to_add": "Project page project-1",
                    "question": "What current knowledge and weekly attention should be recorded?",
                }]
            }]
        }
        self.assertEqual(validate_configured_source_provenance(finding, snapshot), [])

        finding["feature_outcomes"][0]["information_gaps"][0]["code"] = (
            "configured-source-bindings-missing"
        )
        issues = validate_configured_source_provenance(finding, snapshot)
        self.assertEqual(len(issues), 1)
        self.assertIn("documentation-quality", issues[0]["message"])

    def test_repair_feedback_rejects_treating_snapshot_as_feature_output(self) -> None:
        feedback = repair_feedback(
            "weekly",
            {
                "feature_outcomes": [{"feature_id": "FEAT-0007", "outcome": "produced"}],
                "carry_forward_updates": [],
            },
            [{"path": "feature_outcomes.0.output_refs", "message": "too short"}],
        )
        self.assertTrue(any("source snapshot is input" in item for item in feedback))

    def test_opaque_ids_stay_out_of_user_facing_prose(self) -> None:
        opaque_id = "3b7d43a2-3942-80e6-ae73-fcadf3c5c748"
        result = {
            "report_results": [{
                "report_id": opaque_id,
                "source_report_ids": [opaque_id],
                "report_markdown": "Kamdar AI needs an owner decision.",
            }]
        }
        self.assertEqual(validate_user_facing_prose(result), [])
        result["report_results"][0]["report_markdown"] = f"Project {opaque_id} needs an owner decision."
        issues = validate_user_facing_prose(result)
        self.assertEqual(len(issues), 1)
        self.assertIn("opaque machine ID", issues[0]["message"])

    def test_user_facing_ids_resolve_to_names_without_changing_evidence(self) -> None:
        opaque_id = "3b7d43a2-3942-80e6-ae73-fcadf3c5c748"
        result = {
            "feature_outcomes": [{
                "evidence": [{"source_id": opaque_id, "observation": f"Project {opaque_id} is active."}],
                "information_gaps": [{
                    "source_ids_checked": [opaque_id],
                    "question": f"What should {opaque_id} focus on next?",
                }],
            }]
        }
        snapshot = {
            "sources": {
                "projects": {
                    "records": [{"id": opaque_id, "properties": {"Name": "Kamdar AI"}}]
                }
            }
        }
        normalized = normalize_user_facing_prose(result, snapshot)
        outcome = normalized["feature_outcomes"][0]
        self.assertEqual(outcome["evidence"][0]["source_id"], opaque_id)
        self.assertEqual(outcome["information_gaps"][0]["source_ids_checked"], [opaque_id])
        self.assertEqual(outcome["evidence"][0]["observation"], "Project Kamdar AI is active.")
        self.assertEqual(outcome["information_gaps"][0]["question"], "What should Kamdar AI focus on next?")
        self.assertEqual(validate_user_facing_prose(normalized), [])

    def test_company_context_and_rendered_report_resolve_the_same_name(self) -> None:
        opaque_id = "3b7d43a2-3942-80e6-ae73-fcadf3c5c748"
        sentence = f"Project lead for {opaque_id} owns the next proof."
        result = {
            "report_results": [{
                "report_markdown": sentence,
                "company_executive_context": {
                    "sops": [{"proof_scope_and_owner": sentence}]
                },
            }]
        }
        snapshot = {
            "sources": {
                "projects": {
                    "records": [{"id": opaque_id, "properties": {"Name": "Kamdar AI"}}]
                }
            }
        }
        normalized = normalize_user_facing_prose(result, snapshot)
        report = normalized["report_results"][0]
        self.assertEqual(
            report["report_markdown"],
            report["company_executive_context"]["sops"][0]["proof_scope_and_owner"],
        )
        self.assertIn("Kamdar AI", report["report_markdown"])
        self.assertEqual(validate_user_facing_prose(normalized), [])

    def test_internal_schema_terms_are_unslopped_in_reader_prose(self) -> None:
        result = {
            "feature_outcomes": [{
                "reasoning_summary": (
                    "The Pydantic schema requires owner_person_id and employee_ids "
                    "before WeeklyProgressChase work_snapshot messages can be produced for FEAT-0001."
                ),
                "information_gaps": [{
                    "needed_field": "stable Person ID and employee_id",
                    "question": "Please add owner_person_id and question_key.",
                }],
            }]
        }
        normalized = normalize_user_facing_prose(result, {"sources": {}})
        prose = normalized["feature_outcomes"][0]["reasoning_summary"]
        question = normalized["feature_outcomes"][0]["information_gaps"][0]["question"]
        needed_field = normalized["feature_outcomes"][0]["information_gaps"][0]["needed_field"]
        self.assertEqual(
            prose,
            "The report contract requires owner record and team member records before progress follow-up progress snapshot messages can be produced for Project progress notes.",
        )
        self.assertEqual(question, "Please add owner record and duplicate-check reference.")
        self.assertEqual(needed_field, "linked owner record and team member record")
        self.assertEqual(validate_user_facing_prose(normalized), [])

    def test_internal_weekly_terms_are_unslopped_in_reader_prose(self) -> None:
        result = {
            "run_notes": (
                "private_project_notes is empty, so FEAT-0005 remains "
                "insufficient_information."
            )
        }
        normalized = normalize_user_facing_prose(result, {"sources": {}})
        self.assertEqual(
            normalized["run_notes"],
            "frozen Project Notes collection is empty, so Weekly operating report remains needs information.",
        )
        self.assertEqual(validate_user_facing_prose(normalized), [])

    def test_preview_shows_readable_source_names_and_report_text(self) -> None:
        opaque_id = "3b7d43a2-3942-80e6-ae73-fcadf3c5c748"
        result = {
            "schema_version": "test",
            "feature_outcomes": [{
                "feature_id": "FEAT-0005",
                "outcome": "produced",
                "reasoning_summary": "The weekly report is ready.",
                "evidence": [{"source_id": opaque_id, "observation": "Kamdar AI was reviewed."}],
                "information_gaps": [],
            }],
            "report_results": [{
                "report_id": opaque_id,
                "report_markdown": "# Kamdar AI weekly report\n\nThe current priority is setup proof.",
            }],
        }
        snapshot = {
            "sources": {
                "projects": {
                    "records": [{"id": opaque_id, "properties": {"Name": "Kamdar AI"}}]
                }
            }
        }
        preview = render_preview("weekly", result, snapshot)
        self.assertIn("**Kamdar AI:** Kamdar AI was reviewed.", preview)
        self.assertIn("# Kamdar AI weekly report", preview)
        self.assertIn("## Weekly operating report", preview)
        self.assertIn("**Outcome:** Prepared", preview)
        self.assertNotIn("## FEAT-", preview)
        self.assertNotIn(opaque_id, preview)
        self.assertNotIn('"report_id"', preview)

    def test_configuration_gap_detail_renders_without_an_empty_section(self) -> None:
        result = {
            "schema_version": "test",
            "feature_outcomes": [],
            "configuration_gaps": [{"detail": "Project Notes are not available."}],
        }
        preview = render_preview("weekly", result, {"sources": {}})
        self.assertIn("## Configuration gaps", preview)
        self.assertIn("Project Notes are not available.", preview)

    def test_weekly_company_context_is_rendered_verbatim_without_new_facts(self) -> None:
        context = {
            "problems": [
                {
                    "title": "Missing active workspace binding",
                    "context_and_operating_impact": "Weekly preparation cannot resolve the approved company boundary.",
                    "measurement_and_confidence": "The binding file was absent; confidence is high.",
                    "intervention_and_test": "Install the reviewed binding and rerun prepare.",
                }
            ],
            "decisions": [],
            "sops": [],
        }
        result = {
            "report_results": [
                {
                    "report_level": "Company",
                    "report_markdown": "# Company report\n",
                    "company_executive_context": context,
                }
            ]
        }
        normalized = normalize_result("weekly", result)
        markdown = normalized["report_results"][0]["report_markdown"]
        for value in context["problems"][0].values():
            self.assertIn(value, markdown)
        self.assertNotIn("estimated", markdown.lower())

    def test_nonweekly_results_are_unchanged(self) -> None:
        result = {"feature_outcomes": []}
        self.assertIs(normalize_result("daily", result), result)

    def test_output_references_are_derived_from_canonical_output_arrays(self) -> None:
        result = {
            "feature_outcomes": [
                {"feature_id": "FEAT-0005", "outcome": "insufficient_information", "output_refs": []}
            ],
            "report_results": [{"id": 1}, {"id": 2}],
        }
        normalized = normalize_result("weekly", result)
        self.assertEqual(
            normalized["feature_outcomes"][0]["output_refs"],
            ["/report_results/0", "/report_results/1"],
        )


if __name__ == "__main__":
    unittest.main()

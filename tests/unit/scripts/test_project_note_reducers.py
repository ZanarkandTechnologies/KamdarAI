from __future__ import annotations

import hashlib
import unittest

from scripts.project_note_reducers import (
    apply_employee_memory_update,
    apply_sop_update,
    reduce_employee_memory,
    reduce_latest_documentation_questions,
    reduce_latest_work_snapshots,
    reduce_sop_updates,
    section_text,
)


def note(project: str, work: str, person: str, kind: str, timestamp: str, payload: dict, workflow: str | None = None, sequence: int = 1) -> dict:
    return {"note_key": str(sequence).zfill(64), "observation_kind": kind, "observed_at": timestamp, "source_updated_at": timestamp, "source_revision": f"r-{sequence}", "project_id": project, "section": "Completed outcomes and artifacts" if kind == "completed_outcome" else "Workflow and SOP signals" if kind == "workflow_sample" else "Documentation questions" if kind == "documentation_question" else "Work and employee updates", "source_ids": [work], "work_id": work, "employee_ids": [person], "workflow_key": workflow, "structured_payload": payload, "markdown": f"{work} evidence"}


class ProjectNoteReducerTests(unittest.TestCase):
    def test_first_employee_observation_initializes_local_memory(self) -> None:
        projects = [{"notes": [
            note(
                "PROJ-A", "TASK-1", "PERSON-NEW", "work_snapshot",
                "2026-08-31T08:00:00Z", {"status": "In progress"}, sequence=1,
            )
        ]}]
        update = reduce_employee_memory(
            week="2026-W36", projects=projects, existing_people=[]
        )[0]
        self.assertEqual(update["disposition"], "update")
        self.assertEqual(update["expected_record_version"], 0)
        self.assertEqual(
            update["expected_persistent_text_sha256"],
            hashlib.sha256("No accepted cross-week observation yet.".encode()).hexdigest(),
        )

    def test_employee_memory_rolls_up_projects_and_is_idempotent(self) -> None:
        projects = [{"notes": [note("PROJ-A", "TASK-1", "PERSON-A", "work_snapshot", "2026-08-31T08:00:00Z", {"status": "Done"}, sequence=1), note("PROJ-A", "TASK-1", "PERSON-A", "completed_outcome", "2026-08-31T09:00:00Z", {"outcome": "Workbook accepted", "delivered_artifacts": [{"id": "FILE-1"}], "elapsed_hours": 5, "documentation_state": "sufficient", "accepted_at": "2026-08-31T09:00:00Z"}, sequence=2)]}, {"notes": [note("PROJ-B", "TASK-2", "PERSON-A", "work_snapshot", "2026-08-31T10:00:00Z", {"status": "Blocked"}, sequence=3)]}]
        markdown = "# A\n\n## Persistent operating memory\n\nNo accepted cross-week observation yet.\n\n## Latest weekly evidence\n\nNo consolidated weekly evidence yet.\n"
        update = reduce_employee_memory(week="2026-W36", projects=projects, existing_people=[{"person_id": "PERSON-A", "record_version": 2, "markdown": markdown}])[0]
        self.assertEqual(update["source_project_ids"], ["PROJ-A", "PROJ-B"])
        self.assertEqual(len(update["persistent_observations"]), 1)
        applied = apply_employee_memory_update(current_markdown=markdown, current_record_version=2, update=update)
        self.assertEqual(applied["state"], "applied")
        rerun = apply_employee_memory_update(current_markdown=applied["markdown"], current_record_version=3, update={**update, "expected_record_version": 3, "expected_persistent_text_sha256": hashlib.sha256(section_text(applied["markdown"], "Persistent operating memory").strip().encode()).hexdigest()})
        self.assertEqual(rerun["state"], "duplicate")

    def test_sop_candidate_never_changes_approved_baseline(self) -> None:
        samples = [note("PROJ-A", "TASK-1", "PERSON-A", "workflow_sample", "2026-08-29T09:00:00Z", {"documentation_state": "sufficient", "accepted_at": "2026-08-29T09:00:00Z", "output_artifact_type": "workbook", "elapsed_hours": 4}, "normalise", 1), note("PROJ-A", "TASK-2", "PERSON-A", "workflow_sample", "2026-08-30T09:00:00Z", {"documentation_state": "sufficient", "accepted_at": "2026-08-30T09:00:00Z", "output_artifact_type": "workbook", "elapsed_hours": 6}, "normalise", 2), note("PROJ-B", "TASK-3", "PERSON-B", "workflow_sample", "2026-08-31T09:00:00Z", {"documentation_state": "sufficient", "accepted_at": "2026-08-31T09:00:00Z", "output_artifact_type": "workbook", "elapsed_hours": 5}, "normalise", 3)]
        update = reduce_sop_updates(week="2026-W36", projects=[{"notes": samples}], existing_sops=[{"workflow_key": "normalise", "sop_id": "SOP-1", "record_version": 2, "baseline_version": 1}])[0]
        self.assertEqual(update["disposition"], "baseline_proposed")
        self.assertEqual(update["candidate_timing"]["mean_elapsed_hours"], 5)
        markdown = "# SOP\n\n## Timing and volume baseline\n\nApproved baseline: 6 hours.\n\n## Latest weekly samples\n\nNo samples yet.\n\n## Exceptions and controls\n\nReview required.\n"
        applied = apply_sop_update(current_markdown=markdown, current_record_version=2, current_baseline_version=1, update=update)
        self.assertFalse(applied["baseline_changed"])
        self.assertIn("Approved baseline: 6 hours.", applied["markdown"])

    def test_latest_reducers_separate_work_and_questions_and_block_ties(self) -> None:
        work = note("PROJ-A", "TASK-1", "PERSON-A", "work_snapshot", "2026-08-31T09:00:00Z", {"status": "Done"}, sequence=1)
        conflict = note("PROJ-A", "TASK-1", "PERSON-A", "work_snapshot", "2026-08-31T09:00:00Z", {"status": "Blocked"}, sequence=2)
        self.assertEqual(reduce_latest_work_snapshots([{"notes": [work, conflict]}])["conflicts"][0]["work_id"], "TASK-1")
        question = note("PROJ-A", "TASK-1", "PERSON-A", "documentation_question", "2026-08-31T10:00:00Z", {"state": "open"}, sequence=3)
        self.assertEqual(reduce_latest_work_snapshots([{"notes": [work, question]}])["rows"][0]["structured_payload"]["status"], "Done")
        self.assertEqual(reduce_latest_documentation_questions([{"notes": [work, question]}])["rows"][0]["structured_payload"]["state"], "open")


if __name__ == "__main__":
    unittest.main()

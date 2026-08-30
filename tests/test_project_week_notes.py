from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.project_week_notes import (
    append_project_week_notes,
    carry_forward_project_week_notes,
    freeze_project_week_notes,
    initialize_project_week_notes,
    load_frozen_project_week_notes,
    migrate_current_weekly_draft,
    validate_project_week_notes,
    write_project_notes_consolidation,
)


def note(project_id: str, **overrides):
    value = {
        "observation_kind": "work_snapshot",
        "observed_at": "2026-08-31T09:00:00+08:00",
        "source_updated_at": "2026-08-31T08:55:00+08:00",
        "source_revision": "revision-1",
        "project_id": project_id,
        "section": "Work and employee updates",
        "source_ids": ["TASK-101"],
        "work_id": "TASK-101",
        "employee_ids": ["PERSON-AISHA"],
        "workflow_key": None,
        "structured_payload": {"status": "In progress", "due_at": "2026-09-02"},
        "markdown": "### TASK-101\n\n- **Owner:** PERSON-AISHA\n- **State:** In progress",
    }
    value.update(overrides)
    return value


def legacy_draft(pm: str = "No PM intervention yet.", problem: str = "No grounded problem definition yet.") -> str:
    return f'''---
artifact_type: kamdar-current-weekly-draft
week: "2026-W36"
---

# Legacy

## PM attention

{pm}

## Problems and inefficiencies

{problem}

## Decisions

No grounded decision yet.

## SOPs

No grounded SOP yet.
'''


class ProjectWeekNotesTests(unittest.TestCase):
    def test_append_freeze_consolidate_and_carry(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            week_root = root / "weeks/2026-W36"
            paths = {project: week_root / "project-notes" / f"project--{project}.md" for project in ("PROJ-A", "PROJ-B")}
            for project, path in paths.items():
                initialize_project_week_notes(notes_path=path, week="2026-W36", project_id=project, project_name=project)
            first = append_project_week_notes(notes_path=paths["PROJ-A"], expected_week="2026-W36", expected_project_id="PROJ-A", notes=[note("PROJ-A")], appended_at="2026-08-31T09:05:00+08:00")
            self.assertEqual(first["state"], "applied")
            before = paths["PROJ-A"].read_bytes()
            self.assertEqual(append_project_week_notes(notes_path=paths["PROJ-A"], expected_week="2026-W36", expected_project_id="PROJ-A", notes=[note("PROJ-A")])["state"], "duplicate")
            self.assertEqual(paths["PROJ-A"].read_bytes(), before)
            append_project_week_notes(notes_path=paths["PROJ-B"], expected_week="2026-W36", expected_project_id="PROJ-B", notes=[note("PROJ-B", source_ids=["TASK-201"], work_id="TASK-201", source_revision="revision-2")])
            frozen = freeze_project_week_notes(week_root=week_root, week="2026-W36", expected_project_ids=["PROJ-A", "PROJ-B"], frozen_at="2026-09-04T17:00:00+08:00")
            self.assertEqual(frozen["state"], "frozen")
            loaded = load_frozen_project_week_notes(week_root=week_root, week="2026-W36")
            self.assertEqual(len(loaded["projects"]), 2)
            self.assertEqual(append_project_week_notes(notes_path=paths["PROJ-A"], expected_week="2026-W36", expected_project_id="PROJ-A", notes=[note("PROJ-A", source_revision="revision-3")])["state"], "frozen")
            receipt = write_project_notes_consolidation(week_root=week_root, week="2026-W36", freeze_sha256=loaded["freeze_sha256"], projections=[{"kind": "project_report", "id": "RPT-A"}], consolidated_at="2026-09-04T18:00:00+08:00")
            self.assertEqual(receipt["state"], "consolidated")
            next_root = root / "weeks/2026-W37"
            carry = carry_forward_project_week_notes(week_root=week_root, week="2026-W36", next_week_root=next_root, next_week="2026-W37", project_names={"PROJ-A": "Project A", "PROJ-B": "Project B"}, carried_at="2026-09-04T18:05:00+08:00")
            self.assertEqual(carry["state"], "carried_forward")
            next_a = next_root / "project-notes/project--PROJ-A.md"
            self.assertIn("TASK-101 — carried from 2026-W36", next_a.read_text())
            next_before = next_a.read_bytes()
            rerun = carry_forward_project_week_notes(week_root=week_root, week="2026-W36", next_week_root=next_root, next_week="2026-W37", project_names={"PROJ-A": "Project A", "PROJ-B": "Project B"}, carried_at="2026-09-04T18:05:00+08:00")
            self.assertEqual(next(row for row in rerun["projects"] if row["project_id"] == "PROJ-A")["state"], "duplicate")
            self.assertEqual(next_a.read_bytes(), next_before)

    def test_conflict_and_missing_coverage_write_nothing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            week_root = Path(temporary) / "weeks/2026-W36"
            path = week_root / "project-notes/project--PROJ-A.md"
            initialize_project_week_notes(notes_path=path, week="2026-W36", project_id="PROJ-A", project_name="A")
            first = append_project_week_notes(notes_path=path, expected_week="2026-W36", expected_project_id="PROJ-A", notes=[note("PROJ-A")])
            before = path.read_bytes()
            conflict = append_project_week_notes(notes_path=path, expected_week="2026-W36", expected_project_id="PROJ-A", notes=[note("PROJ-A", note_key=first["applied"][0], markdown="changed")])
            self.assertEqual(conflict["state"], "conflict")
            self.assertEqual(path.read_bytes(), before)
            gap = freeze_project_week_notes(week_root=week_root, week="2026-W36", expected_project_ids=["PROJ-A", "PROJ-B"])
            self.assertEqual(gap["state"], "configuration_gap")
            self.assertFalse((week_root / ".project-notes-freeze.json").exists())

    def test_legacy_migration_is_atomic_and_blocks_ambiguous_identity(self) -> None:
        keyed = "<!-- kamdar-weekly-key: pm_attention:TASK-101 -->\n### TASK-101\n\nWaiting.\n<!-- /kamdar-weekly-key: pm_attention:TASK-101 -->"
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            legacy = root / "current-weekly-draft.md"
            legacy.write_text(legacy_draft(pm=keyed))
            week_root = root / "weeks/2026-W36"
            blocked = migrate_current_weekly_draft(legacy_draft_path=legacy, week_root=week_root, week="2026-W36", project_by_source_id={"TASK-101": "PROJ-A"}, migrated_at="2026-09-04T18:00:00+08:00")
            self.assertEqual(blocked["state"], "blocked")
            self.assertFalse((week_root / "project-notes").exists())
            migrated = migrate_current_weekly_draft(legacy_draft_path=legacy, week_root=week_root, week="2026-W36", project_by_source_id={"TASK-101": "PROJ-A"}, employee_ids_by_source_id={"TASK-101": ["PERSON-A"]}, migrated_at="2026-09-04T18:00:00+08:00")
            self.assertEqual(migrated["state"], "migrated", migrated.get("reason"))
            parsed = validate_project_week_notes((week_root / "project-notes/project--PROJ-A.md").read_text())
            self.assertTrue(parsed["notes"][0]["note_key"].startswith("legacy:"))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


PROJECT = Path(__file__).resolve().parents[3]
SCRIPT = PROJECT / "skills/setup-kamdar-workspace/scripts/setup_workspace.py"
SPEC = importlib.util.spec_from_file_location("setup_workspace", SCRIPT)
assert SPEC and SPEC.loader
SETUP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SETUP)


class SetupWorkspaceTests(unittest.TestCase):
    def run_setup(self, workspace: Path, profile_home: Path, *extra: str) -> tuple[int, dict[str, object]]:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--workspace", str(workspace),
             "--profile-home", str(profile_home), *extra],
            text=True, capture_output=True, check=False,
        )
        self.assertTrue(result.stdout, result.stderr)
        return result.returncode, json.loads(result.stdout)

    def test_preview_reports_allowlisted_changes_without_writing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            workspace, profile_home = root / "workspace", root / "profile"
            workspace.mkdir()
            profile_home.mkdir()
            code, receipt = self.run_setup(workspace, profile_home)
            self.assertEqual(code, 0)
            self.assertEqual(receipt["state"], "changes_pending")
            self.assertIn("workspace:.hermes.md", receipt["pending"])
            self.assertTrue(any(item.startswith("profile:skills/setup-kamdar-workspace/")
                                for item in receipt["pending"]))
            self.assertFalse((workspace / ".hermes.md").exists())
            self.assertEqual(receipt["deletion_count"], 0)

    def test_apply_refuses_unapproved_context(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            workspace, profile_home = root / "workspace", root / "profile"
            workspace.mkdir()
            profile_home.mkdir()
            code, receipt = self.run_setup(workspace, profile_home, "--apply")
            self.assertEqual(code, 2)
            self.assertEqual(receipt["blocker"], "workspace_context_requires_owner_approval")
            self.assertFalse((workspace / ".hermes.md").exists())

    def test_apply_copies_only_managed_sources_when_context_is_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            workspace = root / "profile" / "workspace"
            profile_home = workspace.parent
            source.mkdir(parents=True)
            (source / "automations").mkdir()
            (source / "skills/example").mkdir(parents=True)
            workspace.mkdir(parents=True)
            config = source / "workspace.hermes.md"
            config.write_text("---\nstatus: approved\n---\n# Workspace\n", encoding="utf-8")
            (source / "automations/daily.md").write_text("daily\n", encoding="utf-8")
            (source / "skills/example/SKILL.md").write_text("# Example\n", encoding="utf-8")
            with patch.object(SETUP, "PROJECT", source), patch.object(SETUP, "CONFIG", config):
                code = SETUP.run(workspace, profile_home, apply=True)
            self.assertEqual(code, 0)
            self.assertEqual((workspace / ".hermes.md").read_text(encoding="utf-8"), config.read_text(encoding="utf-8"))
            self.assertEqual((workspace / "automations/daily.md").read_text(encoding="utf-8"), "daily\n")
            self.assertEqual((profile_home / "skills/example/SKILL.md").read_text(encoding="utf-8"), "# Example\n")

    def test_apply_preflights_all_destinations_before_copying(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            workspace = root / "profile" / "workspace"
            profile_home = workspace.parent
            source.mkdir(parents=True)
            (source / "automations").mkdir()
            (source / "skills/example").mkdir(parents=True)
            (workspace / "automations/daily.md").mkdir(parents=True)
            config = source / "workspace.hermes.md"
            config.write_text("---\nstatus: approved\n---\n# Workspace\n", encoding="utf-8")
            (source / "automations/daily.md").write_text("daily\n", encoding="utf-8")
            (source / "skills/example/SKILL.md").write_text("# Example\n", encoding="utf-8")
            with patch.object(SETUP, "PROJECT", source), patch.object(SETUP, "CONFIG", config):
                code = SETUP.run(workspace, profile_home, apply=True)
            self.assertEqual(code, 2)
            self.assertFalse((workspace / ".hermes.md").exists())

    def test_source_project_cannot_be_runtime_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary) / "profile"
            profile_home.mkdir()
            code, receipt = self.run_setup(PROJECT, profile_home)
            self.assertEqual(code, 2)
            self.assertEqual(receipt["blocker"], "workspace_must_be_outside_source_project")

    def test_symlinked_target_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            actual, workspace, profile_home = root / "actual", root / "workspace", root / "profile"
            actual.mkdir()
            workspace.symlink_to(actual, target_is_directory=True)
            profile_home.mkdir()
            code, receipt = self.run_setup(workspace, profile_home)
            self.assertEqual(code, 2)
            self.assertEqual(receipt["blocker"], "workspace_must_not_be_symlink")

    def test_workspace_may_use_normal_profile_subdirectory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary) / "profile"
            workspace = profile_home / "workspace"
            workspace.mkdir(parents=True)
            code, receipt = self.run_setup(workspace, profile_home)
            self.assertEqual(code, 0)
            self.assertEqual(receipt["state"], "changes_pending")


if __name__ == "__main__":
    unittest.main()

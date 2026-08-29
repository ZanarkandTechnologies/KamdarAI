from __future__ import annotations

import ast
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SetupLaunchTests(unittest.TestCase):
    @staticmethod
    def existing_profile(root: Path) -> Path:
        profile = root / "profiles" / "kamdar-ai"
        (profile / "workspace").mkdir(parents=True)
        (profile / "cron").mkdir()
        (profile / "distribution.yaml").write_text("name: kamdar-ai\n", encoding="utf-8")
        (profile / "workspace.hermes.md").write_text(
            "---\nstatus: approved\n---\n", encoding="utf-8"
        )
        (profile / "workspace" / ".hermes.md").write_text("ready\n", encoding="utf-8")
        (profile / "cron" / "jobs.json").write_text(
            '{"jobs": ['
            '{"name": "Company OS Daily Operating Update"},'
            '{"name": "Company OS Weekly Operating Review"}'
            ']}\n',
            encoding="utf-8",
        )
        (profile / ".env").write_text("OPENAI_API_KEY=test-only\n", encoding="utf-8")
        return profile

    @staticmethod
    def run_launch(profile: Path, answer: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(ROOT / "setup.py"),
                "launch",
                "--profile-home",
                str(profile),
            ],
            input=answer,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_existing_profile_health_choice_requests_live_verification(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = self.existing_profile(Path(temporary))
            result = self.run_launch(profile, "4\n")
            self.assertEqual(result.returncode, 12, result.stderr)
            self.assertIn("Existing installation found", result.stdout)
            self.assertIn("Run full health check", result.stdout)

    def test_existing_profile_dashboard_choice_requests_dashboard(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = self.existing_profile(Path(temporary))
            result = self.run_launch(profile, "6\n")
            self.assertEqual(result.returncode, 13, result.stderr)

    def test_existing_profile_exit_does_not_mutate_profile(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = self.existing_profile(Path(temporary))
            before = {
                path.relative_to(profile): path.read_bytes()
                for path in profile.rglob("*")
                if path.is_file()
            }
            result = self.run_launch(profile, "7\n")
            after = {
                path.relative_to(profile): path.read_bytes()
                for path in profile.rglob("*")
                if path.is_file()
            }
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(after, before)

    def test_incomplete_profile_can_exit_without_resuming(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary) / "profiles" / "kamdar-ai"
            profile.mkdir(parents=True)
            (profile / "distribution.yaml").write_text(
                "name: kamdar-ai\n", encoding="utf-8"
            )
            before = (profile / "distribution.yaml").read_bytes()
            result = self.run_launch(profile, "n\n")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("incomplete installation was found", result.stdout)
            self.assertEqual((profile / "distribution.yaml").read_bytes(), before)
            self.assertEqual(
                [path.name for path in profile.iterdir()], ["distribution.yaml"]
            )

    def test_existing_profile_integration_choice_requests_certification(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = self.existing_profile(Path(temporary))
            result = self.run_launch(profile, "3\n")
            self.assertEqual(result.returncode, 14, result.stderr)
            self.assertIn("Test integrations", result.stdout)

    def test_workspace_action_uses_profile_owned_configuration(self) -> None:
        source = (
            ROOT / "scripts" / "setup_cli" / "flows" / "lifecycle.py"
        ).read_text(encoding="utf-8")
        self.assertIn('workspace = profile_home / "workspace.hermes.md"', source)
        self.assertIn('template = profile_home / "workspace.hermes.template.md"', source)
        self.assertIn('source_root / "scripts" / "setup_profile.py"', source)
        self.assertIn('receipt["entry_point"] = "setup.py workspace"', source)

    def test_install_calls_webhook_selector_with_supported_arguments(self) -> None:
        tree = ast.parse(
            (ROOT / "scripts" / "setup_cli" / "flows" / "lifecycle.py").read_text(
                encoding="utf-8"
            )
        )
        selector = next(
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef) and node.name == "_choose_webhook"
        )
        accepted = {argument.arg for argument in selector.args.args + selector.args.kwonlyargs}
        calls = [
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "_choose_webhook"
        ]
        self.assertEqual(len(calls), 1)
        self.assertTrue({keyword.arg for keyword in calls[0].keywords} <= accepted)


if __name__ == "__main__":
    unittest.main()

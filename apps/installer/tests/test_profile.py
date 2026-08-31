from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


PROJECT = Path(__file__).resolve().parents[3]
SCRIPT = PROJECT / "apps/installer/profile.py"
SPEC = importlib.util.spec_from_file_location("setup_profile", SCRIPT)
assert SPEC and SPEC.loader
PROFILE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PROFILE)


class SetupProfileTests(unittest.TestCase):
    def test_gateway_readiness_uses_status_text_not_exit_code(self) -> None:
        stopped = subprocess.CompletedProcess(
            ["hermes", "gateway", "status"], 0, "✗ Gateway is not running\n", ""
        )
        running = subprocess.CompletedProcess(
            ["hermes", "gateway", "status"], 0, "✓ Gateway is running (PID: 123)\n", ""
        )
        self.assertFalse(PROFILE.gateway_is_running(stopped))
        self.assertTrue(PROFILE.gateway_is_running(running))

    def test_notion_plugin_enabled_reads_native_plugin_inventory(self) -> None:
        profile_home = Path("/tmp/client-profile")
        payload = json.dumps(
            [{"name": "notion-platform", "status": "enabled", "source": "user"}]
        )
        completed = subprocess.CompletedProcess([], 0, payload, "")
        with patch.object(PROFILE, "run_command", return_value=completed) as run_command:
            self.assertTrue(PROFILE.notion_plugin_enabled(profile_home))
        self.assertEqual(
            run_command.call_args.args[0],
            ["hermes", "plugins", "list", "--user", "--json"],
        )

    def test_enable_notion_plugin_declines_tool_override_and_verifies(self) -> None:
        profile_home = Path("/tmp/client-profile")
        enabled = subprocess.CompletedProcess(
            [], 0, json.dumps([{"name": "notion-platform", "status": "enabled"}]), ""
        )
        with patch.object(
            PROFILE,
            "run_command",
            side_effect=[subprocess.CompletedProcess([], 0, "", ""),
                         subprocess.CompletedProcess([], 0, "", ""), enabled],
        ) as run_command:
            PROFILE.enable_notion_plugin(profile_home)
        commands = [call.args[0] for call in run_command.call_args_list]
        self.assertEqual(
            commands[0],
            ["hermes", "plugins", "enable", "platforms/notion", "--no-allow-tool-override"],
        )
        self.assertEqual(commands[1], ["hermes", "plugins", "doctor", "platforms/notion"])

    def test_missing_jobs_plan_two_creates_with_client_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary)
            workspace = profile_home / "workspace"
            workspace.mkdir()
            (workspace / ".hermes.md").write_text(
                'company_name: "Example Co"\ncompany_timezone: "Europe/London"\n',
                encoding="utf-8",
            )
            actions = PROFILE.cron_plan(profile_home, workspace)
            self.assertEqual([item["action"] for item in actions], ["create", "create"])
            self.assertEqual(actions[0]["schedule"], "0 8 * * 1-5")
            self.assertEqual(actions[1]["schedule"], "0 18 * * 5")
            for action in actions:
                self.assertEqual(action["workdir"], str(workspace))
                self.assertIn(str(workspace / ".hermes.md"), action["prompt"])
                self.assertIn("Example Co Company OS", action["prompt"])
                self.assertIn("Europe/London", action["prompt"])

    def test_legacy_job_names_are_migrated_to_generic_names(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary)
            workspace = profile_home / "workspace"
            cron = profile_home / "cron"
            workspace.mkdir()
            cron.mkdir()
            (cron / "jobs.json").write_text(
                json.dumps({"jobs": [{
                    "id": "daily-id",
                    "name": "Kamdar Daily Operating Update",
                    "schedule": "0 8 * * 1-5",
                }]}),
                encoding="utf-8",
            )
            actions = PROFILE.cron_plan(profile_home, workspace)
            self.assertEqual(actions[0]["action"], "update")
            self.assertEqual(actions[0]["id"], "daily-id")
            self.assertEqual(actions[0]["name"], "Company OS Daily Operating Update")

    def test_exact_jobs_are_in_sync(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary)
            workspace = profile_home / "workspace"
            cron = profile_home / "cron"
            workspace.mkdir()
            cron.mkdir()
            jobs = []
            for index, spec in enumerate(PROFILE.SCHEDULES, start=1):
                desired = PROFILE.desired_job(spec, workspace)
                jobs.append(
                    {
                        "id": str(index),
                        "name": desired["name"],
                        "schedule": {"kind": "cron", "expr": desired["schedule"]},
                        "prompt": desired["prompt"],
                        "workdir": desired["workdir"],
                        "deliver": "local",
                        "enabled": True,
                    }
                )
            (cron / "jobs.json").write_text(json.dumps({"jobs": jobs}), encoding="utf-8")
            self.assertEqual(
                [item["action"] for item in PROFILE.cron_plan(profile_home, workspace)],
                ["in_sync", "in_sync"],
            )

    def test_drifted_job_is_updated_and_duplicate_name_blocks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary)
            workspace = profile_home / "workspace"
            cron = profile_home / "cron"
            workspace.mkdir()
            cron.mkdir()
            name = PROFILE.SCHEDULES[0]["name"]
            (cron / "jobs.json").write_text(
                json.dumps({"jobs": [{"id": "1", "name": name, "schedule": "daily"}]}),
                encoding="utf-8",
            )
            self.assertEqual(PROFILE.cron_plan(profile_home, workspace)[0]["action"], "update")
            duplicate = {"jobs": [{"id": "1", "name": name}, {"id": "2", "name": name}]}
            (cron / "jobs.json").write_text(json.dumps(duplicate), encoding="utf-8")
            with self.assertRaisesRegex(PROFILE.ProfileSetupError, "duplicate_cron_name"):
                PROFILE.cron_plan(profile_home, workspace)

    def test_apply_cron_uses_native_create_and_edit_commands(self) -> None:
        profile_home = Path("/tmp/client-profile")
        actions = [
            {
                "action": "create", "name": "Daily", "schedule": "0 8 * * 1-5",
                "prompt": "daily prompt", "workdir": "/tmp/client-profile/workspace",
                "deliver": "local",
            },
            {
                "action": "update", "id": "weekly-id", "name": "Weekly",
                "schedule": "0 18 * * 5", "prompt": "weekly prompt",
                "workdir": "/tmp/client-profile/workspace", "deliver": "local",
                "resume": True,
            },
        ]
        with patch.object(PROFILE, "run_command") as run_command:
            PROFILE.apply_cron(profile_home, actions)
        create, edit, resume = [call.args[0] for call in run_command.call_args_list]
        self.assertEqual(create[:4], ["hermes", "cron", "create", "0 8 * * 1-5"])
        self.assertEqual(edit[:4], ["hermes", "cron", "edit", "weekly-id"])
        self.assertIn("--workdir", create)
        self.assertIn("--workdir", edit)
        self.assertEqual(resume, ["hermes", "cron", "resume", "weekly-id"])


if __name__ == "__main__":
    unittest.main()

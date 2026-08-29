from __future__ import annotations

import json
import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import setup_runtime as runtime


ROOT = Path(__file__).resolve().parents[1]


class SetupRuntimeTests(unittest.TestCase):
    def test_default_profile_home_uses_named_profile(self) -> None:
        with patch.dict(os.environ, {"HERMES_HOME": "/opt/data"}, clear=False):
            with patch.dict(os.environ, {"KAMDAR_PROFILE_HOME": ""}, clear=False):
                self.assertEqual(
                    runtime.default_profile_home(),
                    Path("/opt/data/profiles/kamdar-ai"),
                )

    def test_tunnel_token_is_profile_owned_and_owner_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            path = runtime.save_tunnel_token(profile, "test-token")
            self.assertEqual(path, profile / "secrets/cloudflare-tunnel-token")
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            (profile / ".env").write_text(
                "NOTION_TOKEN=not-real\n"
                "NOTION_WEBHOOK_PUBLIC_URL=https://example.invalid/notion/webhook\n",
                encoding="utf-8",
            )
            self.assertTrue(runtime.webhook_enabled(profile))

    def test_notion_mcp_configuration_uses_hermes_config_owner(self) -> None:
        profile = Path("/tmp/kamdar-profile")
        calls: list[list[str]] = []

        def fake_run(arguments, profile_home, **kwargs):
            del kwargs
            self.assertEqual(profile_home, profile)
            calls.append(arguments)
            return subprocess.CompletedProcess(arguments, 0, "", "")

        with patch.object(runtime, "run_command", side_effect=fake_run):
            runtime.configure_notion_mcp(profile)
        self.assertEqual(len(calls), 3)
        self.assertIn(
            [
                "hermes", "config", "set", "--force",
                "mcp_servers.notion.url", runtime.NOTION_MCP_URL,
            ],
            calls,
        )
        self.assertFalse(any("npx" in item for call in calls for item in call))

    def test_catalog_mcp_install_uses_hermes_owner_and_validates_name(self) -> None:
        profile = Path("/tmp/kamdar-profile")
        calls: list[list[str]] = []

        def fake_run(arguments, profile_home, **kwargs):
            del kwargs
            self.assertEqual(profile_home, profile)
            calls.append(arguments)
            return subprocess.CompletedProcess(arguments, 0, "", "")

        with patch.object(runtime, "run_command", side_effect=fake_run):
            runtime.install_catalog_mcp(profile, "linear")
        self.assertEqual(calls, [["hermes", "mcp", "install", "linear"]])
        with self.assertRaisesRegex(runtime.RuntimeSetupError, "invalid_mcp_catalog_name"):
            runtime.install_catalog_mcp(profile, "../../unsafe")

    def test_remote_mcp_url_is_written_through_stdin_not_process_arguments(self) -> None:
        profile = Path("/tmp/kamdar-profile")
        calls: list[tuple[list[str], str | None]] = []

        def fake_run(arguments, profile_home, **kwargs):
            self.assertEqual(profile_home, profile)
            calls.append((arguments, kwargs.get("input_text")))
            return subprocess.CompletedProcess(arguments, 0, "", "")

        with patch.object(runtime, "run_command", side_effect=fake_run):
            with patch.object(runtime, "hermes_python", return_value=Path("/hermes/python")):
                runtime.configure_remote_mcp(
                    profile,
                    "composio-google",
                    "https://app.composio.dev/tool_router/v3/test/mcp",
                )
        self.assertEqual(len(calls), 1)
        self.assertNotIn("app.composio.dev", " ".join(calls[0][0]))
        self.assertIn("app.composio.dev", calls[0][1] or "")

    def test_webhook_url_requires_stable_public_https_hostname(self) -> None:
        self.assertEqual(
            runtime.normalize_webhook_url("https://Hermes.Example.com/"),
            "https://hermes.example.com/notion/webhook",
        )
        self.assertEqual(
            runtime.normalize_webhook_url(
                "https://hermes.example.com/notion/webhook/"
            ),
            "https://hermes.example.com/notion/webhook",
        )
        rejected = (
            "http://hermes.example.com",
            "https://random.trycloudflare.com",
            "https://localhost",
            "https://127.0.0.1",
            "https://hermes.example.com/other",
            "https://hermes.example.com?token=value",
            "https://hermes.example.com:8443",
        )
        for value in rejected:
            with self.subTest(value=value), self.assertRaises(runtime.RuntimeSetupError):
                runtime.normalize_webhook_url(value)

    def test_webhook_public_url_reads_only_the_named_profile_value(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            (profile / ".env").write_text(
                "NOTION_TOKEN=never-return-this\n"
                "NOTION_WEBHOOK_PUBLIC_URL='https://hermes.example.com/notion/webhook'\n",
                encoding="utf-8",
            )
            self.assertEqual(
                runtime.webhook_public_url(profile),
                "https://hermes.example.com/notion/webhook",
            )

    def test_live_webhook_lanes_probe_connector_and_public_endpoint(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            runtime.save_tunnel_token(profile, "test-token")
            (profile / ".env").write_text(
                "NOTION_TOKEN=not-real\n"
                "NOTION_WEBHOOK_PUBLIC_URL=https://hermes.example.com/notion/webhook\n",
                encoding="utf-8",
            )

            def fake_json(url, timeout=3.0):
                del timeout
                if url.endswith("/notion/health"):
                    return True, {"ok": True, "verification_token_captured": True}
                return False, {}

            with patch.object(runtime, "_http_json", side_effect=fake_json):
                with patch.object(runtime, "_http_ready", return_value=True):
                    with patch.object(runtime, "_http_post_status", return_value=401):
                        lanes = runtime._webhook_lanes(profile, live=True)
            self.assertEqual(
                {lane["name"]: lane["status"] for lane in lanes},
                {
                    "notion_webhook": "pass",
                    "public_ingress": "pass",
                    "public_endpoint": "pass",
                    "signature_rejection": "pass",
                },
            )

    def test_apply_approval_promotes_only_the_workspace_status(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary) / "workspace.hermes.md"
            before = "---\nstatus: draft\n---\n# Owner content\nstatus: prose\n"
            workspace.write_text(before, encoding="utf-8")
            runtime.approve_workspace_context(workspace)
            after = workspace.read_text(encoding="utf-8")
            self.assertEqual(
                after,
                "---\nstatus: approved\n---\n# Owner content\nstatus: prose\n",
            )
            runtime.approve_workspace_context(workspace)
            self.assertEqual(workspace.read_text(encoding="utf-8"), after)

    def _ready_profile(self, root: Path) -> Path:
        profile = root / "profiles" / runtime.PROFILE_NAME
        workspace = profile / "workspace"
        cron = profile / "cron"
        workspace.mkdir(parents=True)
        cron.mkdir()
        for name in ("distribution.yaml", "setup.py", "workspace.hermes.md"):
            (profile / name).write_text("ready\n", encoding="utf-8")
        (workspace / ".hermes.md").write_text("ready\n", encoding="utf-8")
        (profile / ".env").write_text(
            "OPENROUTER_API_KEY=not-a-real-secret\n", encoding="utf-8"
        )
        runner = profile / "scripts" / "run_installed_evals.py"
        runner.parent.mkdir()
        runner.write_text("# installed eval fixture\n", encoding="utf-8")
        (cron / "jobs.json").write_text(
            json.dumps(
                {
                    "jobs": [
                        {"name": name, "enabled": True}
                        for name in sorted(runtime.EXPECTED_CRON_NAMES)
                    ]
                }
            ),
            encoding="utf-8",
        )
        return profile

    def test_verify_returns_ready_without_claiming_skipped_webhook(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = self._ready_profile(Path(temporary))
            workspace = profile / "workspace"

            def fake_run(arguments, profile_home, **kwargs):
                del profile_home, kwargs
                joined = " ".join(arguments)
                if "terminal.cwd" in joined:
                    output = str(workspace)
                elif "mcp_servers.notion.url" in joined:
                    output = runtime.NOTION_MCP_URL
                elif "gateway status" in joined:
                    output = "✓ Gateway is running"
                elif "run_installed_evals.py" in joined:
                    output = json.dumps({"status": "pass"})
                else:
                    output = ""
                return subprocess.CompletedProcess(arguments, 0, output, "")

            receipt = runtime.verify_profile(profile, command_runner=fake_run)
            self.assertEqual(receipt["status"], "ready")
            webhook = next(
                lane for lane in receipt["lanes"] if lane["name"] == "notion_webhook"
            )
            self.assertEqual(webhook["status"], "skip")
            self.assertFalse(webhook["required"])

    def test_verify_blocks_when_required_runtime_state_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary) / "profiles" / runtime.PROFILE_NAME
            profile.mkdir(parents=True)

            def failed(arguments, profile_home, **kwargs):
                del profile_home, kwargs
                return subprocess.CompletedProcess(arguments, 1, "", "not ready")

            receipt = runtime.verify_profile(profile, command_runner=failed)
            self.assertEqual(receipt["status"], "blocked")
            self.assertTrue(
                any(
                    lane["required"] and lane["status"] == "fail"
                    for lane in receipt["lanes"]
                )
            )

    def test_receipt_is_owner_only_and_contains_no_secret_values(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            receipt = {"status": "partial", "lanes": []}
            path = runtime.write_receipt(profile, receipt)
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), receipt)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_compose_keeps_webhook_private_and_uses_profile_token_file(self) -> None:
        compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        self.assertIn("kamdar_hermes_data:/opt/data", compose)
        self.assertGreaterEqual(
            compose.count("HERMES_HOME: /opt/data/profiles/kamdar-ai"), 2
        )
        self.assertIn('"127.0.0.1:9119:9119"', compose)
        self.assertNotIn("8645:8645", compose)
        self.assertIn("TUNNEL_TOKEN_FILE:", compose)
        self.assertIn("cloudflare/cloudflared:2026.8.0", compose)
        self.assertIn("nousresearch/hermes-agent:latest@sha256:", compose)
        self.assertNotIn("ngrok", compose.lower())

    def test_windows_launcher_exposes_only_one_setup_surface(self) -> None:
        launcher = (ROOT / "setup.cmd").read_text(encoding="utf-8")
        self.assertIn("run --rm setup launch", launcher)
        self.assertIn('if "%KAMDAR_ACTION%"=="10" goto live_verify', launcher)
        self.assertIn('if "%KAMDAR_ACTION%"=="11" goto static_verify', launcher)
        self.assertIn('if "%KAMDAR_ACTION%"=="14" goto certify', launcher)
        self.assertIn("run --rm setup verify --live", launcher)
        self.assertIn("run --rm setup verify", launcher)
        self.assertIn("run --rm setup certify", launcher)
        self.assertIn("wsl.exe --status", launcher.lower())
        self.assertIn('docker info --format "{{.OSType}}"', launcher)
        self.assertIn("linux_containers_required", launcher)
        self.assertNotIn("compose --profile setup --profile webhook pull", launcher)
        self.assertNotIn("run --rm setup install", launcher)
        self.assertNotIn("NOTION_TOKEN", launcher)

    def test_packaged_feature_evals_cover_buyer_visible_suites(self) -> None:
        from scripts.run_installed_evals import evaluate

        receipt = evaluate(ROOT)
        self.assertEqual(receipt["status"], "pass")
        self.assertEqual(
            {item["suite"] for item in receipt["suites"]},
            {"daily", "weekly", "meeting-intake"},
        )


if __name__ == "__main__":
    unittest.main()

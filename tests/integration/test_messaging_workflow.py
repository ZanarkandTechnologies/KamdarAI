from __future__ import annotations

import hashlib
import io
import json
import stat
import subprocess
import shutil
import sys
import types
import tempfile
import unittest
from argparse import Namespace
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from schemas.workspace import (
    CommunicationBinding,
    DeliveryBehavior,
    MessageType,
    MessagingApp,
    MessagingTestReceipt,
    configuration_hash,
)
from scripts import authorized_message
from scripts import setup_runtime as runtime
from scripts.setup_cli.flows.messaging import configure_messaging, send_connection_test


class SetupMessagingTests(unittest.TestCase):
    def binding(
        self, behavior: DeliveryBehavior = DeliveryBehavior.SEND_AUTOMATICALLY
    ) -> CommunicationBinding:
        return CommunicationBinding(
            message=MessageType.OWNER_REPORT,
            app=MessagingApp.TELEGRAM,
            send_to="Vishan Kamdar",
            behavior=behavior,
        )

    def receipt(self, bindings: list[CommunicationBinding]) -> MessagingTestReceipt:
        target = "telegram:12345"
        return MessagingTestReceipt(
            configuration_sha256=configuration_hash(bindings),
            app=MessagingApp.TELEGRAM,
            recipient_sha256=hashlib.sha256(b"vishan kamdar").hexdigest(),
            status="passed",
            recipient_confirmed=True,
            exact_target=target,
            target_sha256=hashlib.sha256(target.encode()).hexdigest(),
            message_id="safe-message-id",
        )

    def test_test_send_extracts_exact_target_without_using_display_name_as_target(self) -> None:
        binding = self.binding()

        def fake_run(arguments, profile_home, **kwargs):
            del profile_home, kwargs
            self.assertEqual(arguments[3], "telegram")
            return subprocess.CompletedProcess(
                arguments,
                0,
                json.dumps(
                    {
                        "success": True,
                        "platform": "telegram",
                        "chat_id": "12345",
                        "message_id": "m-1",
                    }
                ),
                "",
            )

        receipt, success = send_connection_test(
            Path("/tmp/profile"), binding, [binding], command_runner=fake_run
        )
        self.assertTrue(success)
        self.assertEqual(receipt.exact_target, "telegram:12345")
        self.assertNotEqual(receipt.recipient_sha256, binding.send_to)

    def test_private_receipt_unlocks_only_the_matching_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            bindings = [self.binding()]
            path = runtime.write_messaging_test_receipt(
                profile, self.receipt(bindings).model_dump(mode="json")
            )
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertEqual(
                runtime.current_messaging_target(profile, bindings),
                "telegram:12345",
            )
            changed = [
                self.binding(DeliveryBehavior.PREPARE_DRAFTS)
            ]
            self.assertIsNone(runtime.current_messaging_target(profile, changed))

    def test_draft_binding_writes_idempotent_review_artifact_without_sending(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            workspace = root / "workspace.hermes.md"
            workspace.write_text(
                """<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | prepare drafts for approval |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            args = Namespace(
                workspace=workspace,
                profile_home=root,
                message="owner report",
                action_key="weekly-owner-report",
                approve_draft=None,
            )
            with patch.object(runtime, "run_command") as run:
                with patch("sys.stdin", io.StringIO("Report body")):
                    with redirect_stdout(io.StringIO()):
                        result = authorized_message.operate(args)
            self.assertEqual(result, 0)
            run.assert_not_called()
            drafts = list((root / "workspace" / "weeks").glob("*/outbound/weekly-owner-report.md"))
            self.assertEqual(len(drafts), 1)
            self.assertIn("Report body", drafts[0].read_text(encoding="utf-8"))
            with patch.object(runtime, "run_command") as rerun:
                with patch("sys.stdin", io.StringIO("Report body")):
                    with redirect_stdout(io.StringIO()):
                        self.assertEqual(authorized_message.operate(args), 0)
            rerun.assert_not_called()
            self.assertEqual(len(list((root / "workspace" / "weeks").glob("*/outbound/*.md"))), 1)

    def test_reviewed_draft_can_be_explicitly_approved_through_same_guard(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            binding = self.binding(DeliveryBehavior.PREPARE_DRAFTS)
            workspace = root / "workspace.hermes.md"
            workspace.write_text(
                """---
company_timezone: "Asia/Kuala_Lumpur"
---
<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | prepare drafts for approval |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            create = Namespace(
                workspace=workspace,
                profile_home=root,
                message="owner report",
                action_key="weekly-owner-report",
                approve_draft=None,
            )
            with patch("sys.stdin", io.StringIO("Reviewed report body")):
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(authorized_message.operate(create), 0)
            draft = next((root / "workspace" / "weeks").glob("*/outbound/weekly-owner-report.md"))
            runtime.write_messaging_test_receipt(
                root, self.receipt([binding]).model_dump(mode="json")
            )
            approve = Namespace(
                workspace=workspace,
                profile_home=root,
                message="owner report",
                action_key=None,
                approve_draft=draft,
            )
            completed = subprocess.CompletedProcess(
                [], 0, '{"success":true,"message_id":"approved-1"}', ""
            )
            with patch.object(runtime, "run_command", return_value=completed) as run:
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(authorized_message.operate(approve), 0)
            self.assertIn("Reviewed report body", run.call_args.args[0][-1])

    def test_automatic_send_uses_receipted_exact_target(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            binding = self.binding()
            workspace = root / "workspace.hermes.md"
            workspace.write_text(
                """<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | send automatically |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            runtime.write_messaging_test_receipt(
                root, self.receipt([binding]).model_dump(mode="json")
            )
            args = Namespace(
                workspace=workspace,
                profile_home=root,
                message="owner report",
                action_key="weekly-owner-report",
                approve_draft=None,
            )
            completed = subprocess.CompletedProcess(
                [],
                0,
                '{"success":true,"chat_id":"12345","message_id":"m-2"}',
                "",
            )
            with patch.object(runtime, "run_command", return_value=completed) as run:
                with patch("sys.stdin", io.StringIO("Report body")):
                    output = io.StringIO()
                    with redirect_stdout(output):
                        result = authorized_message.operate(args)
            self.assertEqual(result, 0)
            self.assertEqual(run.call_args.args[0][3], "telegram:12345")
            self.assertNotIn("12345", output.getvalue())
            self.assertIn("m-2", output.getvalue())

    def test_installed_guard_runs_from_cron_workspace_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            (profile / "scripts").mkdir()
            (profile / "schemas").mkdir()
            (profile / "workspace").mkdir()
            shutil.copy2(Path(authorized_message.__file__), profile / "scripts/authorized_message.py")
            root = Path(__file__).resolve().parents[2]
            shutil.copy2(root / "scripts/setup_runtime.py", profile / "scripts/setup_runtime.py")
            shutil.copy2(root / "schemas/__init__.py", profile / "schemas/__init__.py")
            shutil.copy2(root / "schemas/workspace.py", profile / "schemas/workspace.py")
            workspace = profile / "workspace/.hermes.md"
            workspace.write_text(
                """---
company_timezone: "Asia/Kuala_Lumpur"
---
<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | prepare drafts for approval |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "../scripts/authorized_message.py",
                    "--workspace", ".hermes.md",
                    "--profile-home", "..",
                    "--message", "owner report",
                    "--action-key", "weekly-owner-report",
                ],
                cwd=profile / "workspace",
                input="Report body",
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("draft_created", result.stdout)

    def test_health_does_not_confuse_gateway_with_confirmed_messaging(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile = Path(temporary)
            (profile / "workspace.hermes.md").write_text(
                """<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | send automatically |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            lanes = runtime._messaging_lanes(profile)
            self.assertEqual(
                {lane["name"]: lane["status"] for lane in lanes},
                {"messaging_configured": "fail", "messaging_delivery": "fail"},
            )

    def test_skipped_automatic_test_can_be_saved_as_drafts_before_apply(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            workspace = root / "workspace.hermes.md"
            workspace.write_text(
                """<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | Vishan Kamdar | send automatically |
<!-- /hermes:managed communications -->
""",
                encoding="utf-8",
            )
            answers = iter([False, False, True])
            ui = types.ModuleType("scripts.setup_cli.ui")
            ui.CONSOLE = types.SimpleNamespace(print=lambda *args, **kwargs: None)
            ui.confirm = lambda *args, **kwargs: next(answers)
            ui.choose = lambda *args, **kwargs: "drafts"
            panel = types.ModuleType("rich.panel")
            panel.Panel = types.SimpleNamespace(fit=lambda *args, **kwargs: args[0])

            class FakeTable:
                def __init__(self, *args, **kwargs):
                    pass

                def add_column(self, *args, **kwargs):
                    pass

                def add_row(self, *args, **kwargs):
                    pass

            table = types.ModuleType("rich.table")
            table.Table = FakeTable
            with patch.dict(
                sys.modules,
                {
                    "scripts.setup_cli.ui": ui,
                    "rich.panel": panel,
                    "rich.table": table,
                },
            ):
                result = configure_messaging(
                    root,
                    [self.binding()],
                    workspace=workspace,
                    non_interactive=False,
                )
            self.assertTrue(result.apply)
            self.assertEqual(result.status, "drafts_only")
            self.assertIn("prepare drafts for approval", workspace.read_text())


if __name__ == "__main__":
    unittest.main()

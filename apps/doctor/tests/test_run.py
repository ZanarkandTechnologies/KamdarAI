from __future__ import annotations

import argparse
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from apps.doctor import run as doctor


class CompanyDoctorTests(unittest.TestCase):
    def test_prompt_delegates_analysis_to_native_tools_without_delivery(self) -> None:
        prompt = doctor.analysis_prompt(Path("/workspace"), "daily")
        self.assertIn("configured skills and MCP tools", prompt)
        self.assertIn("stop after producing and reviewing", prompt)
        self.assertIn("every changed file path", prompt)
        self.assertIn("Do not modify provider records, send messages, or sync artifacts", prompt)

    def test_parser_exposes_only_profile_and_cadence(self) -> None:
        args = doctor.parser().parse_args(["--cadence", "weekly"])
        self.assertEqual(args.cadences, ["weekly"])
        self.assertFalse(hasattr(args, "sync_to_provider"))
        self.assertFalse(hasattr(args, "bindings"))

    def test_operate_calls_native_hermes_once_per_requested_cadence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory)
            workspace = profile / "workspace"
            (workspace / "automations").mkdir(parents=True)
            (workspace / ".hermes.md").write_text("company\n", encoding="utf-8")
            (workspace / "automations/daily-operating-update.md").write_text("daily\n", encoding="utf-8")
            args = argparse.Namespace(profile_home=profile, cadences=["daily"])
            completed = subprocess.CompletedProcess([], 0, "analysis\n", "")
            with patch.object(doctor.runtime, "run_command", return_value=completed) as invoked:
                self.assertEqual(doctor.operate(args), 0)
            self.assertEqual(invoked.call_count, 1)
            self.assertEqual(invoked.call_args.args[0][:2], ["hermes", "chat"])

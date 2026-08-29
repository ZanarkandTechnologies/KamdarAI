"""Visible subprocess boundary for interactive Hermes commands."""

from __future__ import annotations

import subprocess
from pathlib import Path

from scripts import setup_runtime as runtime


def run_visible(arguments: list[str], profile_home: Path) -> int:
    result = subprocess.run(
        arguments,
        check=False,
        env=runtime.profile_environment(profile_home),
    )
    return result.returncode

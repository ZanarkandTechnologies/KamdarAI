#!/usr/bin/env python3
"""Run an analysis-only Company OS automation through native Hermes tools."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from apps.installer import runtime


CONTRACTS = {
    "daily": "daily-operating-update.md",
    "weekly": "weekly-operating-review.md",
}


def analysis_prompt(workspace: Path, cadence: str) -> str:
    contract = workspace / "automations" / CONTRACTS[cadence]
    return (
        f"Read {workspace / '.hermes.md'} and {contract} completely. "
        f"Run the {cadence} automation through the configured skills and MCP tools, "
        "but stop after producing and reviewing the skill's local output files. "
        "Do not modify provider records, send messages, or sync artifacts. "
        "Return a concise analysis with every changed file path and every "
        "missing-information or authority blocker."
    )


def operate(args: argparse.Namespace) -> int:
    profile = args.profile_home.expanduser().resolve()
    workspace = profile / "workspace"
    if not (workspace / ".hermes.md").is_file():
        print("Doctor blocked: installed workspace is missing.")
        return 2
    for cadence in args.cadences or ("daily", "weekly"):
        contract = workspace / "automations" / CONTRACTS[cadence]
        if not contract.is_file():
            print(f"Doctor blocked: missing {cadence} automation contract.")
            return 2
        result = runtime.run_command(
            [
                "hermes", "chat", "--quiet", "--query-file", "-",
                "--source", "tool", "--max-turns", "80",
            ],
            profile,
            input_text=analysis_prompt(workspace, cadence),
            check=False,
            timeout=300,
        )
        if result.returncode:
            print(f"Doctor {cadence} analysis failed.")
            return 2
        print(result.stdout.strip())
    return 0


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
    command.add_argument("--profile-home", type=Path, default=runtime.default_profile_home())
    command.add_argument("--cadence", dest="cadences", action="append", choices=tuple(CONTRACTS))
    return command


def main(argv: list[str] | None = None) -> int:
    return operate(parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Install a Kamdar distribution workspace and reconcile its native cron jobs."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


PACKAGE = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PACKAGE.parents[1]
SETUP_WORKSPACE = PACKAGE / "scripts" / "setup_workspace.py"

SCHEDULES = (
    {
        "name": "Kamdar Daily Operating Update",
        "schedule": "0 8 * * 1-5",
        "contract": "automations/daily-operating-update.md",
        "cadence": "Daily",
    },
    {
        "name": "Kamdar Weekly Operating Review",
        "schedule": "0 18 * * 5",
        "contract": "automations/weekly-operating-review.md",
        "cadence": "Weekly",
    },
)


class ProfileSetupError(Exception):
    """A safe, operator-actionable profile setup failure."""


def emit(state: str, **values: object) -> None:
    print(json.dumps({"state": state, **values}, sort_keys=True))


def command_env(profile_home: Path) -> dict[str, str]:
    environment = os.environ.copy()
    environment["HERMES_HOME"] = str(profile_home)
    environment.pop("HERMES_PROFILE", None)
    return environment


def run_command(arguments: list[str], profile_home: Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        arguments,
        text=True,
        capture_output=True,
        check=False,
        env=command_env(profile_home),
    )
    if result.returncode:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise ProfileSetupError(detail[-1] if detail else f"command_failed:{arguments[0]}")
    return result


def gateway_is_running(result: subprocess.CompletedProcess[str]) -> bool:
    output = f"{result.stdout}\n{result.stderr}"
    return "✓ Gateway is running" in output


def read_jobs(profile_home: Path) -> list[dict[str, Any]]:
    path = profile_home / "cron" / "jobs.json"
    if not path.is_file():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ProfileSetupError(f"cron_jobs_unreadable:{error}") from error
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
    if not isinstance(jobs, list):
        raise ProfileSetupError("cron_jobs_must_be_list")
    return [job for job in jobs if isinstance(job, dict)]


def desired_job(spec: dict[str, str], workspace: Path) -> dict[str, str]:
    contract = workspace / spec["contract"]
    prompt = (
        f"Execute the installed Kamdar {spec['cadence']} operating automation. "
        f"Read {workspace / '.hermes.md'} and {contract} completely, then follow "
        "the contract's authority, validation, receipt, idempotency, and stop conditions. "
        "Use Asia/Kuala_Lumpur as the company timezone and never infer production authority."
    )
    return {
        "name": spec["name"],
        "schedule": spec["schedule"],
        "prompt": prompt,
        "workdir": str(workspace),
        "deliver": "local",
    }


def schedule_expression(job: dict[str, Any]) -> str:
    schedule = job.get("schedule")
    if isinstance(schedule, dict):
        return str(schedule.get("expr") or "")
    return str(schedule or "")


def cron_plan(profile_home: Path, workspace: Path) -> list[dict[str, Any]]:
    jobs = read_jobs(profile_home)
    actions: list[dict[str, Any]] = []
    for spec in SCHEDULES:
        desired = desired_job(spec, workspace)
        matches = [job for job in jobs if job.get("name") == desired["name"]]
        if len(matches) > 1:
            raise ProfileSetupError(f"duplicate_cron_name:{desired['name']}")
        if not matches:
            actions.append({"action": "create", **desired})
            continue
        current = matches[0]
        exact = (
            schedule_expression(current) == desired["schedule"]
            and current.get("prompt") == desired["prompt"]
            and current.get("workdir") == desired["workdir"]
            and current.get("deliver", "local") == "local"
            and current.get("enabled", True) is not False
        )
        actions.append(
            {
                "action": "in_sync" if exact else "update",
                "id": str(current.get("id") or ""),
                "resume": current.get("enabled", True) is False,
                **desired,
            }
        )
    return actions


def apply_cron(profile_home: Path, actions: list[dict[str, Any]]) -> None:
    for job in actions:
        if job["action"] == "in_sync":
            continue
        common = [
            "--name", job["name"], "--deliver", "local", "--workdir", job["workdir"]
        ]
        if job["action"] == "create":
            command = ["hermes", "cron", "create", job["schedule"], job["prompt"], *common]
        else:
            if not job.get("id"):
                raise ProfileSetupError(f"cron_job_id_missing:{job['name']}")
            command = [
                "hermes", "cron", "edit", job["id"], "--schedule", job["schedule"],
                "--prompt", job["prompt"], *common,
            ]
        run_command(command, profile_home)
        if job.get("resume"):
            run_command(["hermes", "cron", "resume", job["id"]], profile_home)


def run(profile_home: Path, apply: bool) -> int:
    try:
        profile_home = profile_home.expanduser().resolve()
        if not profile_home.is_dir():
            raise ProfileSetupError("profile_home_must_be_existing_directory")
        workspace = profile_home / "workspace"
        if apply:
            workspace.mkdir(parents=True, exist_ok=True)
        elif not workspace.is_dir():
            emit(
                "changes_pending",
                profile_home=str(profile_home),
                workspace=str(workspace),
                workspace_action="create",
                cron_actions=[{"name": item["name"], "action": "create"} for item in SCHEDULES],
                next_action="rerun_with_apply",
            )
            return 0

        workspace_command = [
            sys.executable, str(SETUP_WORKSPACE), "--workspace", str(workspace),
            "--profile-home", str(profile_home),
        ]
        if profile_home == SOURCE_ROOT.resolve():
            workspace_command.append("--installed-distribution")
        if apply:
            workspace_command.append("--apply")
        setup_result = run_command(workspace_command, profile_home)
        setup_receipt = json.loads(setup_result.stdout)
        actions = cron_plan(profile_home, workspace)
        if not apply:
            emit(
                "changes_pending" if setup_receipt.get("pending") or any(
                    item["action"] != "in_sync" for item in actions
                ) else "in_sync",
                profile_home=str(profile_home),
                workspace=str(workspace),
                workspace_setup=setup_receipt,
                cron_actions=actions,
                next_action="rerun_with_apply",
            )
            return 0

        run_command(["hermes", "config", "set", "terminal.cwd", str(workspace)], profile_home)
        cwd_result = run_command(["hermes", "config", "get", "terminal.cwd"], profile_home)
        if Path(cwd_result.stdout.strip()).expanduser().resolve() != workspace.resolve():
            raise ProfileSetupError("terminal_cwd_verification_failed")
        apply_cron(profile_home, actions)
        verified = cron_plan(profile_home, workspace)
        if any(item["action"] != "in_sync" for item in verified):
            raise ProfileSetupError("cron_verification_failed")
        gateway = subprocess.run(
            ["hermes", "gateway", "status"], text=True, capture_output=True,
            check=False, env=command_env(profile_home),
        )
        scheduler_ready = gateway_is_running(gateway)
        emit(
            "configured" if scheduler_ready else "partial",
            profile_home=str(profile_home),
            workspace=str(workspace),
            workspace_setup=setup_receipt,
            terminal_cwd=str(workspace),
            cron_jobs=verified,
            scheduler_ready=scheduler_ready,
            next_action=(
                "run_notion_webhook_onboarding"
                if scheduler_ready
                else "start_or_install_the_profile_gateway_then_verify_cron_status"
            ),
        )
        return 0
    except (OSError, json.JSONDecodeError, ProfileSetupError) as error:
        emit("blocked", blocker=str(error))
        return 2


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
    default_home = os.environ.get("HERMES_HOME")
    command.add_argument(
        "--profile-home", type=Path, default=Path(default_home) if default_home else None,
        help="Installed distribution profile root; defaults to HERMES_HOME.",
    )
    command.add_argument("--apply", action="store_true")
    return command


def main() -> int:
    args = parser().parse_args()
    if args.profile_home is None:
        emit("blocked", blocker="profile_home_required")
        return 2
    return run(args.profile_home, args.apply)


if __name__ == "__main__":
    raise SystemExit(main())

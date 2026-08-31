"""Parse and dispatch the stable Company OS setup command surface."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from apps.installer import runtime
from apps.installer.cli.flows.connections import certify_command
from apps.installer.cli.flows.lifecycle import install_command, launch_command, update_command
from apps.installer.cli.flows.verification import verify_command
from apps.installer.cli.flows.workspace import configure_workspace
from apps.installer.cli.paths import DEFAULT_TEMPLATE, DEFAULT_WORKSPACE, profile_home
from apps.installer.cli.ui import CONSOLE, choose


DESCRIPTION = (
    "Configure a company workspace and manage its installed Hermes profile. "
    "The workspace wizard writes only the managed fields in workspace.hermes.md. "
    "Runtime commands delegate filesystem, credential, and health-check operations "
    "to deterministic setup backends."
)


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=DESCRIPTION)
    subcommands = command.add_subparsers(dest="command")

    for name in ("init", "configure"):
        workspace = subcommands.add_parser(name)
        workspace.add_argument("--workspace", type=Path, default=DEFAULT_WORKSPACE)
        workspace.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)

    launch = subcommands.add_parser("launch")
    launch.add_argument("--profile-home", type=Path)
    launch.add_argument("--installed", action="store_true", help=argparse.SUPPRESS)
    launch.add_argument("--non-interactive", action="store_true", help=argparse.SUPPRESS)

    install = subcommands.add_parser("install")
    install.add_argument("--profile-home", type=Path)
    install.add_argument("--installed", action="store_true", help=argparse.SUPPRESS)
    install.add_argument("--non-interactive", action="store_true", help=argparse.SUPPRESS)

    update = subcommands.add_parser("update")
    update.add_argument("--profile-home", type=Path)

    verify = subcommands.add_parser("verify")
    verify.add_argument("--profile-home", type=Path)
    verify.add_argument("--live", action="store_true")
    verify.add_argument("--wait", type=int, default=120)
    verify.add_argument("--test-connections", action="store_true")
    verify.add_argument("--skip-connections", action="store_true")
    verify.add_argument("--allow-side-effects", action="store_true")

    certify = subcommands.add_parser("certify")
    certify.add_argument("--profile-home", type=Path)
    certify.add_argument("--allow-side-effects", action="store_true")

    doctor = subcommands.add_parser("doctor")
    doctor.add_argument("--profile-home", type=Path)
    doctor.add_argument(
        "--cadence",
        dest="cadences",
        action="append",
        choices=("daily", "weekly"),
    )

    for name in ("webhook-enabled", "webhook-commit", "webhook-rollback"):
        subcommands.add_parser(name).add_argument("--profile-home", type=Path)
    ingress = subcommands.add_parser("webhook-ingress-ready")
    ingress.add_argument("--profile-home", type=Path)
    ingress.add_argument("--wait", type=int, default=30)
    return command


def main(arguments: list[str] | None = None) -> int:
    try:
        selected_arguments = arguments if arguments is not None else (sys.argv[1:] or ["launch"])
        args = parser().parse_args(selected_arguments)
        selected = args.command
        if selected in {"init", "configure"}:
            return configure_workspace(
                selected,
                args.workspace.expanduser().resolve(),
                args.template.expanduser().resolve(),
            )
        if selected == "launch":
            return launch_command(args)
        if selected == "install":
            return install_command(args)
        if selected == "update":
            return update_command(args)
        if selected == "verify":
            return verify_command(args)
        if selected == "certify":
            return certify_command(args)
        if selected == "doctor":
            from apps.doctor.run import operate

            args.profile_home = profile_home(args.profile_home)
            if args.cadences is None:
                cadence = choose(
                    "Which automation should Doctor run?",
                    choices=["Daily", "Weekly", "Daily and Weekly"],
                    default="Daily and Weekly",
                )
                args.cadences = {
                    "Daily": ["daily"],
                    "Weekly": ["weekly"],
                    "Daily and Weekly": ["daily", "weekly"],
                }[cadence]
            return operate(args)
        if selected == "webhook-enabled":
            return 0 if runtime.webhook_enabled(profile_home(args.profile_home)) else 1
        if selected == "webhook-ingress-ready":
            return 0 if runtime.wait_for_webhook_ingress(
                profile_home(args.profile_home), args.wait
            ) else 1
        if selected == "webhook-commit":
            runtime.commit_ngrok_update(profile_home(args.profile_home))
            return 0
        if selected == "webhook-rollback":
            runtime.rollback_ngrok_update(profile_home(args.profile_home))
            return 0
        return 2
    except (KeyboardInterrupt, EOFError):
        CONSOLE.print(
            "\n[yellow]Stopped safely. No additional setup changes were made.[/yellow]"
        )
        return 130

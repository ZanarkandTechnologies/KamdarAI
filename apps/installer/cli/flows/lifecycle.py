"""Install, resume, update, and maintenance-menu lifecycle flows."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from rich.panel import Panel
from rich.table import Table

from apps.installer import provider_catalog as catalog_api
from apps.installer import runtime
from apps.installer.schemas.workspace import parse_workspace_communications
from apps.installer.provider_catalog import CatalogError
from apps.installer.cli.flows.connections import (
    _certify_with_recovery,
    _configure_connections,
    _connection_eval_confirmation,
    _defer_connection_evals,
    _selected_bindings,
)
from apps.installer.cli.flows.messaging import configure_messaging
from apps.installer.cli.flows.workspace import configure_workspace
from apps.installer.cli.paths import ROOT, profile_home as resolve_profile_home, receipt_reference
from apps.installer.cli.process import run_visible
from apps.installer.cli.ui import CONSOLE, _friendly_runtime_error, choose, confirm


LAUNCH_FULL_VERIFY = 10
LAUNCH_STATIC_VERIFY = 11
LAUNCH_LIVE_HEALTH = 12
LAUNCH_DASHBOARD = 13
LAUNCH_CERTIFY = 14


def _run_profile_setup(profile_home: Path, *, webhook: bool, apply: bool) -> dict:
    source_root = (
        profile_home
        if (profile_home / "distribution.yaml").is_file()
        else ROOT
    )
    script = source_root / "apps" / "installer" / "profile.py"
    arguments = [sys.executable, str(script), "--profile-home", str(profile_home)]
    if apply:
        arguments.append("--apply")
    if webhook:
        arguments.append("--enable-notion-webhook")
    result = runtime.run_command(arguments, profile_home)
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise runtime.RuntimeSetupError("profile_setup_receipt_unreadable") from error
    if not isinstance(payload, dict):
        raise runtime.RuntimeSetupError("profile_setup_receipt_invalid")
    return payload


def _installation_state(profile_home: Path) -> str:
    """Classify only the lifecycle state needed to choose the next UX."""
    if not (profile_home / "distribution.yaml").is_file():
        return "new"
    required = (
        profile_home / "workspace.hermes.md",
        profile_home / "workspace" / ".hermes.md",
        profile_home / "cron" / "jobs.json",
    )
    if any(not path.is_file() for path in required):
        return "incomplete"
    if not runtime.model_auth_configured(profile_home):
        return "incomplete"
    try:
        jobs_payload = json.loads(
            (profile_home / "cron" / "jobs.json").read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError):
        return "incomplete"
    jobs = jobs_payload.get("jobs", []) if isinstance(jobs_payload, dict) else []
    active_names = {
        str(job.get("name"))
        for job in jobs
        if isinstance(job, dict) and job.get("enabled", True) is not False
    }
    if not runtime.EXPECTED_CRON_NAMES.issubset(active_names):
        return "incomplete"
    return "existing"


def _workspace_update(profile_home: Path) -> int:
    """Edit and apply only the customer-owned workspace configuration."""
    workspace = profile_home / "workspace.hermes.md"
    template = profile_home / "workspace.hermes.template.md"
    CONSOLE.print(
        Panel.fit(
            "[bold]Update workspace configuration[/bold]\n"
            "Current values will be shown as defaults. Credentials, reports, "
            "memory, software, and provider authorization are preserved.",
            border_style="cyan",
        )
    )
    try:
        if configure_workspace("configure", workspace, template):
            CONSOLE.print("[yellow]Workspace configuration was not changed.[/yellow]")
            return 1
        message_bindings = parse_workspace_communications(
            workspace.read_text(encoding="utf-8")
        ).communications
        messaging_result = configure_messaging(
            profile_home,
            message_bindings,
            workspace=workspace,
            non_interactive=False,
        )
        if not messaging_result.apply:
            return 1
        message_bindings = messaging_result.bindings
        runtime.approve_workspace_context(workspace)
        receipt = _run_profile_setup(
            profile_home,
            webhook=runtime.webhook_enabled(profile_home),
            apply=True,
        )
        receipt["entry_point"] = "setup.py workspace"
        receipt_path = runtime.write_receipt(profile_home, receipt)
        CONSOLE.print(
            Panel.fit(
                "[bold green]Workspace configuration applied[/bold green]\n"
                "Existing model and provider authorization was preserved.\n"
                f"Messaging connection test: {messaging_result.status}.\n"
                f"Support receipt: {receipt_reference(profile_home, receipt_path)}",
                border_style="green",
            )
        )
        return 0
    except runtime.RuntimeSetupError as error:
        CONSOLE.print(
            Panel.fit(
                "[bold red]Workspace update stopped safely[/bold red]\n"
                + _friendly_runtime_error(error),
                border_style="red",
            )
        )
        return 2


def launch_command(args: argparse.Namespace) -> int:
    """Own the customer interaction and request one bounded launcher follow-up."""
    profile_home = resolve_profile_home(args.profile_home)
    state = _installation_state(profile_home)
    if state == "new":
        CONSOLE.print(
            Panel.fit(
                "[bold]Welcome to the Company OS[/bold]\n"
                "New installation detected. Setup will create a private persistent "
                "profile and guide the required authorization.\n"
                "You do not need Python, WSL commands, or configuration files.",
                border_style="cyan",
            )
        )
        return LAUNCH_FULL_VERIFY if install_command(args) == 0 else 2

    if state == "incomplete":
        CONSOLE.print(
            Panel.fit(
                "[bold]Resume Company OS setup[/bold]\n"
                "An incomplete installation was found. Existing workspace choices "
                "and saved credentials are safe. Setup will reconcile missing steps.",
                border_style="yellow",
            )
        )
        if not confirm("Resume setup?", default=True):
            CONSOLE.print("[yellow]No setup changes were made.[/yellow]")
            return 0
        return LAUNCH_FULL_VERIFY if install_command(args) == 0 else 2

    CONSOLE.print(
        Panel.fit(
            "[bold]Company OS[/bold]\nExisting installation found.",
            border_style="cyan",
        )
    )
    CONSOLE.print("  [cyan]1.[/cyan] Update workspace configuration")
    CONSOLE.print("  [cyan]2.[/cyan] Update Company OS software")
    CONSOLE.print("  [cyan]3.[/cyan] Test integrations")
    CONSOLE.print("  [cyan]4.[/cyan] Run full health check")
    CONSOLE.print("  [cyan]5.[/cyan] Repair setup")
    CONSOLE.print("  [cyan]6.[/cyan] Open dashboard")
    CONSOLE.print("  [cyan]7.[/cyan] Exit")
    choice = choose(
        "Select",
        choices=["1", "2", "3", "4", "5", "6", "7"],
        default="1",
    )
    if choice == "1":
        result = _workspace_update(profile_home)
        if result == 0:
            return LAUNCH_STATIC_VERIFY
        return 0 if result == 1 else 2
    if choice == "2":
        return LAUNCH_STATIC_VERIFY if update_command(args) == 0 else 2
    if choice == "3":
        return LAUNCH_CERTIFY
    if choice == "4":
        return LAUNCH_LIVE_HEALTH
    if choice == "5":
        if runtime.webhook_enabled(profile_home) and confirm(
            "Revalidate or replace the saved Notion/ngrok webhook credentials?",
            default=False,
        ):
            from plugins.platforms.notion.onboarding import _configure_webhook

            _configure_webhook(profile_home)
        return LAUNCH_FULL_VERIFY if install_command(args) == 0 else 2
    if choice == "6":
        return LAUNCH_DASHBOARD
    CONSOLE.print("[dim]No changes made.[/dim]")
    return 0


def _bootstrap_installed_copy(
    profile_home: Path,
    command: str,
    *,
    non_interactive: bool = False,
) -> int | None:
    if ROOT.resolve() == profile_home.resolve():
        return None
    action = runtime.install_or_update_distribution(ROOT, profile_home)
    installed_setup = profile_home / "setup.py"
    if not installed_setup.is_file():
        raise runtime.RuntimeSetupError("installed_setup_missing")
    CONSOLE.print(f"[green]Distribution {action}.[/green] Continuing from the persistent profile…")
    arguments = [
        sys.executable,
        str(installed_setup),
        command,
        "--profile-home",
        str(profile_home),
        "--installed",
    ]
    if non_interactive:
        arguments.append("--non-interactive")
    return subprocess.run(
        arguments,
        check=False,
        env=runtime.profile_environment(profile_home),
    ).returncode


def _prepare_workspace_configuration(*, non_interactive: bool) -> Path:
    """Create or review the source-owned workspace document before install."""
    workspace = ROOT / "workspace.hermes.md"
    template = ROOT / "workspace.hermes.template.md"
    if not workspace.is_file():
        if non_interactive:
            raise runtime.RuntimeSetupError("workspace_configuration_requires_input")
        if configure_workspace("init", workspace, template):
            raise runtime.RuntimeSetupError("workspace_configuration_cancelled")
    elif not non_interactive and confirm(
        "Review or change the existing company workspace configuration?",
        default=False,
    ):
        if configure_workspace("configure", workspace, template):
            raise runtime.RuntimeSetupError("workspace_configuration_cancelled")
    return workspace


def _choose_webhook(
    profile_home: Path,
    *,
    notion_selected: bool,
    non_interactive: bool,
) -> bool:
    """Return the existing or explicitly selected comment-webhook state."""
    enabled = runtime.webhook_enabled(profile_home)
    if enabled or not notion_selected or non_interactive:
        return enabled
    CONSOLE.print(
        Panel.fit(
            "[bold]Real-time Notion comments[/bold]\n"
            "Optional: enable @hermes comments with a dedicated Notion connection "
            "and your ngrok account's stable HTTPS development domain.",
            border_style="cyan",
        )
    )
    return confirm("Enable real-time Notion comments?", default=False)


def _confirm_install_plan(
    profile_home: Path,
    *,
    bindings: list[dict],
    message_bindings: list,
    webhook: bool,
    non_interactive: bool,
) -> bool:
    """Show every planned owner surface before setup performs writes."""
    review = Table(title="Review setup plan")
    review.add_column("Surface")
    review.add_column("Planned state")
    review.add_row(
        "Runtime",
        "Docker Desktop / WSL2"
        if os.environ.get("KAMDAR_PROFILE_HOME")
        else "Current Hermes runtime",
    )
    review.add_row("Profile", str(profile_home))
    review.add_row("Storage", "Persistent Hermes profile")
    connections = sorted(
        {catalog_api.connection_key(binding["provider"]) for binding in bindings}
    )
    review.add_row("Provider MCPs", ", ".join(connections) if connections else "None")
    messaging = sorted(
        {
            f"{binding.message.value}: {binding.app.value} → {binding.send_to} "
            f"({binding.behavior.value})"
            for binding in message_bindings
        }
    )
    review.add_row("Owner messages", "\n".join(messaging) if messaging else "Not enabled")
    review.add_row("Real-time comments", "Configure" if webhook else "Set up later")
    review.add_row("Automations", "Daily + Weekly")
    review.add_row("Report template", "Reviewed repository template")
    review.add_row("Deletion", "Nothing")
    CONSOLE.print(review)
    if non_interactive:
        return True
    return confirm("Apply this setup plan?", default=True)


def _configure_model(profile_home: Path, *, non_interactive: bool) -> None:
    """Run Hermes' own model authorization without handling credentials here."""
    CONSOLE.print(
        Panel.fit(
            "[bold]AI model[/bold]\n"
            "Hermes owns the model credential and stores it in this profile.",
            border_style="cyan",
        )
    )
    if runtime.model_auth_configured(profile_home):
        return
    if non_interactive:
        raise runtime.RuntimeSetupError("model_auth_requires_input")
    CONSOLE.print("[dim]Opening Hermes' native model authorization inside this setup…[/dim]")
    result = run_visible(["hermes", "setup"], profile_home)
    if result or not runtime.model_auth_configured(profile_home):
        raise runtime.RuntimeSetupError("model_auth_incomplete")


def _install_profile(
    profile_home: Path,
    *,
    bindings: list[dict],
    webhook: bool,
) -> Path:
    """Apply the reviewed profile plan and write its redacted receipt."""
    CONSOLE.rule("[bold cyan]Install[/bold cyan]")
    CONSOLE.print("[cyan]•[/cyan] Installing workspace, plugins, and schedules…")
    receipt = _run_profile_setup(profile_home, webhook=webhook, apply=True)
    receipt.update(
        {
            "entry_point": "setup.py install",
            "provider_connections": sorted(
                {catalog_api.connection_key(binding["provider"]) for binding in bindings}
            ),
            "notion_webhook_configured": webhook,
        }
    )
    return runtime.write_receipt(profile_home, receipt)


def install_command(args: argparse.Namespace) -> int:
    profile_home = resolve_profile_home(args.profile_home)
    try:
        if not args.installed:
            delegated = _bootstrap_installed_copy(
                profile_home,
                "install",
                non_interactive=args.non_interactive,
            )
            if delegated is not None:
                return delegated
        profile_home.mkdir(parents=True, exist_ok=True)
        workspace_config = _prepare_workspace_configuration(
            non_interactive=args.non_interactive
        )
        bindings = _selected_bindings(workspace_config)
        message_bindings = parse_workspace_communications(
            workspace_config.read_text(encoding="utf-8")
        ).communications
        notion_selected = any(
            binding["provider"]["id"] == "notion" for binding in bindings
        )
        webhook = _choose_webhook(
            profile_home,
            notion_selected=notion_selected,
            non_interactive=args.non_interactive,
        )
        if not _confirm_install_plan(
            profile_home,
            bindings=bindings,
            message_bindings=message_bindings,
            webhook=webhook,
            non_interactive=args.non_interactive,
        ):
            CONSOLE.print(
                "[yellow]No runtime services or credentials changed. "
                "The saved workspace draft is preserved.[/yellow]"
            )
            return 1

        _configure_model(profile_home, non_interactive=args.non_interactive)
        _configure_connections(
            profile_home,
            bindings,
            non_interactive=args.non_interactive,
        )
        if webhook and not runtime.webhook_enabled(profile_home):
            from plugins.platforms.notion.onboarding import _configure_webhook

            _configure_webhook(profile_home)

        messaging_result = configure_messaging(
            profile_home,
            message_bindings,
            workspace=workspace_config,
            non_interactive=args.non_interactive,
        )
        if not messaging_result.apply:
            return 1
        message_bindings = messaging_result.bindings
        runtime.approve_workspace_context(workspace_config)

        receipt_path = _install_profile(
            profile_home,
            bindings=bindings,
            webhook=webhook,
        )
        connection_status = "not_run"
        if bindings and not args.non_interactive:
            if _connection_eval_confirmation(bindings):
                connection_receipt = _certify_with_recovery(
                    profile_home,
                    workspace_config,
                    allow_side_effects=True,
                    interactive=True,
                )
            else:
                connection_receipt = _defer_connection_evals(
                    profile_home,
                    workspace_config,
                )
            connection_status = str(connection_receipt["status"])
        CONSOLE.print(
            Panel.fit(
                "[bold green]Configuration installed[/bold green]\n"
                f"Support receipt: {receipt_reference(profile_home, receipt_path)}\n"
                f"Integration certification: {connection_status}\n"
                f"Messaging connection test: {messaging_result.status}\n"
                "The launcher will now start Hermes and run verification.",
                border_style="green",
            )
        )
        return 0 if connection_status in {"not_run", "passed", "deferred"} else 2
    except (runtime.RuntimeSetupError, CatalogError) as error:
        CONSOLE.print(
            Panel.fit(
                "[bold red]Setup stopped safely[/bold red]\n"
                + _friendly_runtime_error(error),
                border_style="red",
            )
        )
        return 2


def update_command(args: argparse.Namespace) -> int:
    profile_home = resolve_profile_home(args.profile_home)
    try:
        if ROOT.resolve() != profile_home.resolve():
            runtime.install_or_update_distribution(ROOT, profile_home)
        webhook = runtime.webhook_enabled(profile_home)
        receipt = _run_profile_setup(profile_home, webhook=webhook, apply=True)
        receipt["entry_point"] = "setup.py update"
        receipt_path = runtime.write_receipt(profile_home, receipt)
        CONSOLE.print(
            "[green]Update installed.[/green] "
            f"Support receipt: {receipt_reference(profile_home, receipt_path)}"
        )
        return 0
    except runtime.RuntimeSetupError as error:
        CONSOLE.print(
            Panel.fit(
                "[bold red]Update stopped safely[/bold red]\n"
                + _friendly_runtime_error(error),
                border_style="red",
            )
        )
        return 2

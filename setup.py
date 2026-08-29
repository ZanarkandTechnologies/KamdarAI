#!/usr/bin/env python3
"""Configure a company workspace and manage its installed Hermes profile.

The workspace wizard writes only the managed fields in ``workspace.hermes.md``.
Runtime commands delegate filesystem, credential, and health-check operations to
``scripts.setup_runtime`` so this entry point remains an orchestration layer.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    from prompt_toolkit.application import Application
    from prompt_toolkit.key_binding import KeyBindings
    from prompt_toolkit.keys import Keys
    from prompt_toolkit.layout import HSplit, Layout, Window
    from prompt_toolkit.layout.controls import FormattedTextControl
    from prompt_toolkit.styles import Style
    from prompt_toolkit.widgets import CheckboxList
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Confirm, Prompt
    from rich.table import Table
except ModuleNotFoundError:
    script = Path(__file__).resolve()
    hermes_roots = [script.parents[2]] if len(script.parents) > 2 else []
    hermes_roots.append(Path.home() / ".hermes")
    candidates = [
        Path(os.environ["HERMES_PYTHON"]) if os.environ.get("HERMES_PYTHON") else None,
        *(root / "hermes-agent" / "venv" / "bin" / "python" for root in hermes_roots),
        *(root / "hermes-agent" / "venv" / "Scripts" / "python.exe" for root in hermes_roots),
    ]
    for candidate in candidates:
        if (
            candidate
            and candidate.is_file()
            and candidate.resolve() != Path(sys.executable).resolve()
        ):
            os.execv(str(candidate), [str(candidate), str(script), *sys.argv[1:]])
    raise SystemExit(
        "Rich and prompt_toolkit are bundled with Hermes, but its Python runtime "
        "could not be found."
    )

# Workspace-only commands also run from a repository checkout that may not ship
# the runtime helper. Runtime commands load it lazily in ``main``.
runtime = None
catalog_api = None


ROOT = Path(__file__).resolve().parent
DEFAULT_TEMPLATE = ROOT / "workspace.hermes.template.md"
DEFAULT_WORKSPACE = ROOT / "workspace.hermes.md"
FRONTMATTER_FIELDS = (
    ("company_name", "Company name"),
    ("company_description", "Company description"),
    ("company_timezone", "Company timezone"),
)
ROW = re.compile(
    r"^(?P<prefix>\| `(?P<role>[^`]+)` \| )(?P<provider>[^|]+)"
    r"(?P<middle> \| )(?P<source>[^|]+)(?P<suffix> \| [^\n]+)$",
    re.MULTILINE,
)
MANAGED = re.compile(
    r"(?P<open><!-- hermes:managed (?P<name>[a-z-]+) -->)"
    r"(?P<body>.*?)"
    r"(?P<close><!-- /hermes:managed (?P=name) -->)",
    re.DOTALL,
)
CONSOLE = Console()
UNSET_VALUES = {"", "REPLACE_ME", "—"}
LAUNCH_FULL_VERIFY = 10
LAUNCH_STATIC_VERIFY = 11
LAUNCH_LIVE_HEALTH = 12
LAUNCH_DASHBOARD = 13
LAUNCH_CERTIFY = 14


def _friendly_runtime_error(error: Exception) -> str:
    """Translate stable internal failure codes into one customer action."""
    code = str(error)
    messages = (
        (
            ("installed_setup_missing", "profile_install_did_not_create_distribution"),
            "The Hermes profile installation is incomplete. Run setup again and choose Repair setup.",
        ),
        (
            ("profile_setup_receipt_unreadable", "profile_setup_receipt_invalid"),
            "Hermes could not confirm that setup finished. Run setup again and choose Repair setup.",
        ),
        (
            ("workspace_configuration_requires_input",),
            "Workspace setup needs your answers. Run setup interactively instead of unattended mode.",
        ),
        (
            ("workspace_configuration_cancelled",),
            "Workspace setup was cancelled. Your saved draft is still available when you rerun setup.",
        ),
    )
    for prefixes, message in messages:
        if code.startswith(prefixes):
            return message
    return (
        "This setup step could not finish. Check the message below, then rerun setup "
        f"and choose Repair setup if needed.\nSupport detail: {code}"
    )


def current_value(raw: str) -> str:
    value = raw.strip()
    if value.startswith('"') and value.endswith('"'):
        try:
            return str(json.loads(value))
        except json.JSONDecodeError:
            pass
    return "" if value in UNSET_VALUES else value


def _numbered_checklist(title: str, items: list[str]) -> list[int]:
    """Hermes-style non-curses fallback, also useful for piped test input."""
    CONSOLE.print(f"\n[bold cyan]◆ {title}[/bold cyan]")
    CONSOLE.print("[dim]Choose roles to configure; Enter skips this section.[/dim]")
    for index, item in enumerate(items, start=1):
        CONSOLE.print(f"  [dim]{index}.[/dim] {item}")
    while True:
        raw = Prompt.ask(
            "Selection (comma-separated numbers or 'all')",
            default="",
            show_default=False,
            console=CONSOLE,
        ).strip().lower()
        if not raw:
            return []
        if raw == "all":
            return list(range(len(items)))
        try:
            chosen = sorted({int(value.strip()) - 1 for value in raw.split(",")})
        except ValueError:
            chosen = []
        if chosen and all(0 <= index < len(items) for index in chosen):
            return chosen
        CONSOLE.print(f"[yellow]Enter numbers from 1 to {len(items)}, 'all', or Enter.[/yellow]")


def _interactive_checklist(title: str, labels: list[str]) -> list[int]:
    """Return selected indices from a portable, non-full-screen checklist."""
    checklist = CheckboxList(
        values=list(enumerate(labels)),
        open_character="[",
        select_character="✓",
        close_character="]",
    )
    bindings = KeyBindings()

    # CheckboxList normally treats Enter like Space. Eager application bindings
    # make Enter finish this wizard step while Space remains the toggle key.
    @bindings.add("enter", eager=True)
    def confirm(event) -> None:
        event.app.exit(result=list(checklist.current_values))

    @bindings.add(Keys.Escape, eager=True)
    def skip(event) -> None:
        event.app.exit(result=[])

    @bindings.add(Keys.ControlC, eager=True)
    def cancel(event) -> None:
        event.app.exit(exception=KeyboardInterrupt())

    layout = Layout(
        HSplit(
            [
                Window(
                    FormattedTextControl([("class:title", f"◆ {title}")]),
                    height=1,
                ),
                Window(
                    FormattedTextControl(
                        [("class:hint", "  ↑↓ navigate  SPACE toggle  ENTER confirm  ESC skip")]
                    ),
                    height=1,
                ),
                Window(height=1),
                checklist,
            ]
        ),
        focused_element=checklist,
    )
    return Application(
        layout=layout,
        key_bindings=bindings,
        style=Style.from_dict(
            {
                "title": "bold ansicyan",
                "hint": "ansibrightblack",
                "checkbox-selected": "bold ansigreen",
                "checkbox-checked": "ansigreen",
            }
        ),
        # Keeping this false avoids the alternate screen used by dialog helpers.
        full_screen=False,
        erase_when_done=True,
        mouse_support=False,
    ).run()


def _role_label(row: re.Match[str]) -> str:
    role = row.group("role").replace("_", " ").title()
    provider = current_value(row.group("provider"))
    return f"{role}  [configured: {provider}]" if provider else role


def select_roles(rows: list[re.Match[str]]) -> set[str]:
    """Ask which managed role rows should be configured in this run."""
    labels = [_role_label(row) for row in rows]
    selected = (
        _interactive_checklist("Data Sources", labels)
        if sys.stdin.isatty()
        else _numbered_checklist("Data Sources", labels)
    )
    summary = ", ".join(labels[index] for index in selected) if selected else "skipped"
    CONSOLE.print(f"Data sources: {summary}", style="cyan", markup=False)
    return {rows[index].group("role") for index in selected}


def ask(label: str, current: str = "") -> str:
    while True:
        answer = Prompt.ask(label, default=current or None, console=CONSOLE).strip()
        if answer:
            if "|" in answer or "\n" in answer:
                CONSOLE.print("[yellow]Use a single line without '|'.[/yellow]")
                continue
            return answer
        if current:
            return current
        print("A value is required.")


def replace_frontmatter(content: str) -> str:
    CONSOLE.rule("[bold cyan]Company[/bold cyan]")
    for key, label in FRONTMATTER_FIELDS:
        pattern = re.compile(rf"^{re.escape(key)}:\s*(.*)$", re.MULTILINE)
        match = pattern.search(content)
        if not match:
            raise SystemExit(f"Missing frontmatter field: {key}")
        value = ask(label, current_value(match.group(1)))
        content = pattern.sub(f"{key}: {json.dumps(value, ensure_ascii=False)}", content, count=1)
    return content


def replace_rows(content: str) -> str:
    row_count = 0

    def update_block(match: re.Match[str]) -> str:
        nonlocal row_count
        name = match.group("name")
        rows = list(ROW.finditer(match.group("body")))
        if name == "data-sources":
            selected_roles = select_roles(rows)
            if not selected_roles:
                CONSOLE.print(
                    "[dim]Data sources skipped. Rerun setup to configure them.[/dim]"
                )
        else:
            selected_roles = {row.group("role") for row in rows}
            title = name.replace("-", " ").title()
            CONSOLE.rule(f"[bold cyan]{title}[/bold cyan]")

        def update(row: re.Match[str]) -> str:
            role = row.group("role")
            provider = current_value(row.group("provider"))
            source = current_value(row.group("source"))
            if role in selected_roles:
                provider = (
                    select_provider(role, provider)
                    if name == "data-sources"
                    else ask(f"Provider for {role}", provider)
                )
                source = ask(f"Source URL or identifier for {role}", source)
            return (
                f'{row.group("prefix")}{provider or "—"}{row.group("middle")}'
                f'{source or "—"}{row.group("suffix")}'
            )

        body, count = ROW.subn(update, match.group("body"))
        row_count += count
        return f'{match.group("open")}{body}{match.group("close")}'

    updated, block_count = MANAGED.subn(update_block, content)
    if block_count == 0 or row_count == 0:
        raise SystemExit("No configurable role rows found.")
    return updated


def _catalog() -> dict:
    global catalog_api
    if catalog_api is None:
        from scripts import provider_catalog

        catalog_api = provider_catalog
    return catalog_api.load_catalog()


def select_provider(role: str, current: str = "") -> str:
    """Select one reviewed provider for a managed data-source role."""
    source = _catalog().get(role)
    if source is None:
        raise SystemExit(f"No supported provider catalog exists for data source: {role}")
    providers = source["providers"]
    provider_ids = [str(provider["id"]) for provider in providers]
    labels = ", ".join(
        f"{provider['id']} ({provider['label']})" for provider in providers
    )
    current_id = current.strip().lower()
    if current_id and current_id not in provider_ids:
        raise SystemExit(
            f"Configured provider '{current}' is not supported for {role}. "
            f"Supported providers: {', '.join(provider_ids)}"
        )
    return Prompt.ask(
        f"Provider for {role} [{labels}]",
        choices=provider_ids,
        default=current_id or provider_ids[0],
        console=CONSOLE,
    )


def configure(content: str) -> str:
    content = replace_frontmatter(content)
    content = replace_rows(content)
    unresolved = sorted(set(re.findall(r"\{\{[^}]+\}\}|REPLACE_ME", content)))
    if unresolved:
        raise SystemExit("Unresolved template values: " + ", ".join(unresolved))
    return content


def show_review(content: str, workspace: Path) -> None:
    CONSOLE.rule("[bold cyan]Review[/bold cyan]")
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Role")
    table.add_column("Provider")
    table.add_column("Source", overflow="fold")
    for block in MANAGED.finditer(content):
        for row in ROW.finditer(block.group("body")):
            table.add_row(
                row.group("role"),
                current_value(row.group("provider")),
                current_value(row.group("source")),
            )
    CONSOLE.print(table)
    CONSOLE.print(f"[dim]Output:[/dim] {workspace}")


def configure_workspace(command: str, workspace: Path, template: Path) -> int:
    CONSOLE.print(
        Panel.fit(
            "[bold]Hermes Workspace Setup[/bold]\n"
            "Bind company roles to the providers and sources Hermes should use.",
            border_style="cyan",
        )
    )

    if command == "init" and not workspace.exists():
        if not template.is_file():
            raise SystemExit(f"Missing template: {template}")
        if not workspace.parent.is_dir():
            raise SystemExit(f"Workspace parent directory does not exist: {workspace.parent}")
        content = template.read_text(encoding="utf-8")
    else:
        if not workspace.is_file():
            raise SystemExit(f"Missing {workspace}; run init first.")
        if command == "init":
            CONSOLE.print(
                f"[cyan]Using existing {workspace}.[/cyan] Current values are defaults."
            )
        content = workspace.read_text(encoding="utf-8")

    configured = configure(content)
    show_review(configured, workspace)
    if not Confirm.ask("Write this configuration?", default=True, console=CONSOLE):
        CONSOLE.print("[yellow]No changes written.[/yellow]")
        return 1
    workspace.write_text(configured, encoding="utf-8")
    CONSOLE.print(
        Panel.fit(
            f"[bold green]Configured[/bold green] {workspace}\n"
            "Review the document before running profile setup.",
            border_style="green",
        )
    )
    return 0


def _profile_home(value: Path | None) -> Path:
    return (value or runtime.default_profile_home()).expanduser().resolve()


def _run_visible(arguments: list[str], profile_home: Path) -> int:
    result = subprocess.run(
        arguments,
        check=False,
        env=runtime.profile_environment(profile_home),
    )
    return result.returncode


def _workspace_uses_notion(path: Path) -> bool:
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return False
    return bool(re.search(r"\|\s*notion\s*\|", content, re.IGNORECASE))


def _selected_bindings(workspace: Path) -> list[dict]:
    catalog = _catalog()
    return catalog_api.selected_bindings(workspace, catalog)


def _configure_connections(
    profile_home: Path,
    bindings: list[dict],
    *,
    non_interactive: bool,
) -> None:
    """Install and authorize each unique Hermes-owned MCP exactly once."""
    providers = [binding["provider"] for binding in bindings]
    catalog_unique: dict[str, dict] = {}
    for provider in providers:
        if provider["mcp"]["source"] == "hermes_catalog":
            catalog_unique[catalog_api.connection_key(provider)] = provider
    catalog_providers = list(catalog_unique.values())
    composio_providers = [
        provider
        for provider in providers
        if provider["mcp"]["source"] == "composio_session"
    ]
    for provider in catalog_providers:
        name = str(provider["mcp"]["name"])
        runtime.install_catalog_mcp(profile_home, name)
        if non_interactive:
            continue
        CONSOLE.print(
            Panel.fit(
                f"[bold]Connect {provider['label']}[/bold]\n"
                "Hermes owns this MCP connection, browser authorization, and tokens.",
                border_style="cyan",
            )
        )
        if Confirm.ask(
            f"Authorize {provider['label']} in your browser now?",
            default=True,
            console=CONSOLE,
        ):
            if _run_visible(["hermes", "mcp", "login", name], profile_home):
                CONSOLE.print(
                    f"[yellow]{provider['label']} authorization is incomplete. "
                    "Rerun setup to try again.[/yellow]"
                )
                continue
            if _run_visible(["hermes", "mcp", "test", name], profile_home):
                CONSOLE.print(
                    f"[yellow]{provider['label']} connected, but Hermes could not "
                    "complete tool discovery. Rerun the health check after fixing it.[/yellow]"
                )
    if composio_providers:
        _configure_composio_connection(
            profile_home,
            composio_providers,
            non_interactive=non_interactive,
        )


def _configure_composio_connection(
    profile_home: Path,
    providers: list[dict],
    *,
    non_interactive: bool,
) -> None:
    """Provision one fixed-tool Composio session without installing its CLI."""
    from scripts import composio_session

    api_key = runtime.read_profile_secret(profile_home, "COMPOSIO_API_KEY")
    if not api_key:
        if non_interactive:
            raise runtime.RuntimeSetupError("composio_api_key_requires_input")
        api_key = getpass.getpass("Composio project API key (hidden): ").strip()
        runtime.save_profile_secret(profile_home, "COMPOSIO_API_KEY", api_key)
    try:
        state = composio_session.ensure_session(profile_home, providers, api_key)
        runtime.configure_remote_mcp(
            profile_home,
            str(providers[0]["mcp"]["name"]),
            str(state["mcp_url"]),
        )
        if non_interactive:
            return
        connected = composio_session.connected_toolkits(state, api_key)
        labels = {"gmail": "Gmail", "googledrive": "Google Drive"}
        for toolkit in sorted(state["toolkits"]):
            if toolkit in connected:
                continue
            url = composio_session.create_connect_link(state, toolkit, api_key)
            label = labels.get(toolkit, toolkit)
            CONSOLE.print(
                Panel.fit(
                    f"[bold]Connect {label}[/bold]\n"
                    f"Open this secure Composio link and finish Google OAuth:\n"
                    f"[link={url}]{url}[/link]\n\n"
                    "Composio stores and refreshes the Google credential; Hermes "
                    "stores only this profile's restricted MCP session.",
                    border_style="cyan",
                )
            )
            Prompt.ask(
                f"Press Enter after {label} is connected",
                default="",
                show_default=False,
                console=CONSOLE,
            )
        _run_visible(
            ["hermes", "mcp", "test", str(providers[0]["mcp"]["name"])],
            profile_home,
        )
    except composio_session.ComposioSessionError as error:
        raise runtime.RuntimeSetupError(str(error)) from error


def _connection_eval_confirmation(bindings: list[dict]) -> bool:
    risky = [
        binding
        for binding in bindings
        if binding["provider"]["test"]["requires_confirmation"]
    ]
    if risky:
        rows = "\n".join(
            f"  • {binding['case_id']} ({binding['provider']['test']['risk']})"
            for binding in risky
        )
        CONSOLE.print(
            Panel.fit(
                "[bold]Test configured integrations[/bold]\n"
                "Hermes will run the configured checks concurrently. Listed tests "
                "may create external records; reversible tests clean up their test "
                "records, while irreversible tests leave their declared result:\n\n"
                f"[cyan]{rows}[/cyan]\n\n"
                "No existing provider record should be changed.",
                border_style="yellow",
            )
        )
    return Confirm.ask(
        "Run configured integration tests now?",
        default=True,
        console=CONSOLE,
    )


def _run_connection_evals(
    profile_home: Path,
    workspace: Path,
    *,
    allow_side_effects: bool,
) -> dict:
    from scripts import run_connection_evals

    with CONSOLE.status("[cyan]Testing configured integrations…[/cyan]"):
        receipt = run_connection_evals.run_connection_evals(
            profile_home,
            workspace,
            allow_side_effects=allow_side_effects,
        )
        run_connection_evals.write_receipt(profile_home, receipt)
    return receipt


def _render_connection_eval(receipt: dict) -> None:
    table = Table(title="Configured integration tests")
    table.add_column("Data source")
    table.add_column("Provider")
    table.add_column("Result")
    judged = {
        row["case_id"]: row
        for row in (receipt.get("judgment") or {}).get("cases", [])
        if isinstance(row, dict)
    }
    for case in receipt.get("cases", []):
        verdict = judged.get(case["case_id"], {})
        status = verdict.get("status", "failed")
        color = "green" if status == "passed" else "red"
        reason = str(verdict.get("reason") or case.get("error") or "")
        table.add_row(
            str(case["data_source"]),
            str(case["provider"]),
            f"[{color}]{status}[/{color}]" + (f" — {reason}" if reason else ""),
        )
    for case in receipt.get("blocked", []):
        table.add_row(
            str(case["data_source"]),
            str(case["provider"]),
            "[yellow]human required[/yellow]",
        )
    CONSOLE.print(table)
    status = str(receipt.get("status", "failed"))
    color = {"passed": "green", "human_required": "yellow"}.get(status, "red")
    CONSOLE.print(f"[{color}]Integration certification: {status}[/{color}]")


def _defer_connection_evals(
    profile_home: Path,
    workspace: Path,
    *,
    previous: dict | None = None,
) -> dict:
    from scripts import run_connection_evals

    return run_connection_evals.defer_connection_evals(
        profile_home,
        workspace,
        previous=previous,
    )


def _certify_with_recovery(
    profile_home: Path,
    workspace: Path,
    *,
    allow_side_effects: bool,
    interactive: bool,
) -> dict:
    """Retry failed certification in place or record an explicit defer choice."""
    while True:
        receipt = _run_connection_evals(
            profile_home,
            workspace,
            allow_side_effects=allow_side_effects,
        )
        _render_connection_eval(receipt)
        if receipt["status"] == "passed" or not interactive:
            return receipt
        choice = Prompt.ask(
            "Certification did not pass. Retry now or defer until later?",
            choices=["retry", "defer"],
            default="retry",
            console=CONSOLE,
        )
        if choice == "retry":
            continue
        deferred = _defer_connection_evals(
            profile_home,
            workspace,
            previous=receipt,
        )
        CONSOLE.print(
            "[yellow]Certification deferred. Setup is preserved; choose Test "
            "integrations from setup.cmd when you are ready.[/yellow]"
        )
        return deferred


def _configure_webhook(profile_home: Path) -> None:
    CONSOLE.print(
        Panel.fit(
            "[bold]Real-time Notion comments[/bold]\n"
            "Before continuing, use the Cloudflare web dashboard to create a named tunnel:\n\n"
            "  Tunnel name: [cyan]company-hermes[/cyan]\n"
            "  Published hostname: [cyan]hermes.<customer-domain>[/cyan]\n"
            "  Service URL: [cyan]http://gateway:8645[/cyan]\n\n"
            "Choose the Docker connector and copy its tunnel token. Do not run "
            "the generated Docker command; this setup owns that container.\n"
            "Guide: [link=https://developers.cloudflare.com/tunnel/setup/]"
            "developers.cloudflare.com/tunnel/setup[/link]",
            border_style="cyan",
        )
    )
    configured = runtime.configured_secret_names(profile_home)
    if "NOTION_TOKEN" not in configured:
        notion_token = getpass.getpass("Notion integration token (hidden): ").strip()
        runtime.save_profile_secret(profile_home, "NOTION_TOKEN", notion_token)
    token_path = profile_home / runtime.TUNNEL_TOKEN_RELATIVE
    if not token_path.is_file():
        tunnel_token = getpass.getpass("Cloudflare tunnel token (hidden): ").strip()
        runtime.save_tunnel_token(profile_home, tunnel_token)
    while True:
        public_url = Prompt.ask(
            "Stable named-tunnel HTTPS hostname",
            console=CONSOLE,
        ).strip()
        try:
            runtime.configure_notion_webhook(profile_home, public_url)
            break
        except runtime.RuntimeSetupError as error:
            if not str(error).startswith("webhook_url_"):
                raise
            CONSOLE.print(
                "[yellow]Use a stable custom HTTPS hostname with no query or "
                "fragment, for example https://hermes.example.com. Temporary "
                "trycloudflare.com URLs are not supported.[/yellow]"
            )


def _run_profile_setup(profile_home: Path, *, webhook: bool, apply: bool) -> dict:
    source_root = (
        profile_home
        if (profile_home / "distribution.yaml").is_file()
        else ROOT
    )
    script = source_root / "scripts" / "setup_profile.py"
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


def _receipt_reference(profile_home: Path, receipt_path: Path) -> str:
    """Return a stable support reference instead of a container-only path."""
    try:
        return str(receipt_path.relative_to(profile_home))
    except ValueError:
        return receipt_path.name


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
                "Model and provider authorization were not changed.\n"
                f"Support receipt: {_receipt_reference(profile_home, receipt_path)}",
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
    profile_home = _profile_home(args.profile_home)
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
        if not Confirm.ask("Resume setup?", default=True, console=CONSOLE):
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
    choice = Prompt.ask(
        "Select",
        choices=["1", "2", "3", "4", "5", "6", "7"],
        default="1",
        console=CONSOLE,
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
    elif not non_interactive and Confirm.ask(
        "Review or change the existing company workspace configuration?",
        default=False,
        console=CONSOLE,
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
            "and a stable Cloudflare Tunnel.",
            border_style="cyan",
        )
    )
    return Confirm.ask(
        "Enable real-time Notion comments?",
        default=False,
        console=CONSOLE,
    )


def _confirm_install_plan(
    profile_home: Path,
    *,
    bindings: list[dict],
    notion_selected: bool,
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
    review.add_row("Real-time comments", "Configure" if webhook else "Set up later")
    review.add_row("Automations", "Daily + Weekly")
    review.add_row("Report template", "Reviewed repository template")
    review.add_row("Deletion", "Nothing")
    CONSOLE.print(review)
    if non_interactive:
        return True
    return Confirm.ask("Apply this setup plan?", default=True, console=CONSOLE)


def _configure_model(profile_home: Path, *, non_interactive: bool) -> None:
    """Run Hermes' own model authorization without handling credentials here."""
    CONSOLE.print(
        Panel.fit(
            "[bold]AI model[/bold]\n"
            "Hermes owns the model credential and stores it in this profile.",
            border_style="cyan",
        )
    )
    if runtime.model_auth_configured(profile_home) or non_interactive:
        return
    CONSOLE.print("[dim]Opening Hermes' native model authorization inside this setup…[/dim]")
    if _run_visible(["hermes", "setup"], profile_home):
        CONSOLE.print(
            "[yellow]Model authorization is incomplete. Installation can continue, "
            "but verification will block automations.[/yellow]"
        )


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
    profile_home = _profile_home(args.profile_home)
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
            notion_selected=notion_selected,
            webhook=webhook,
            non_interactive=args.non_interactive,
        ):
            CONSOLE.print(
                "[yellow]No runtime services or credentials changed. "
                "The saved workspace draft is preserved.[/yellow]"
            )
            return 1

        runtime.approve_workspace_context(workspace_config)
        _configure_model(profile_home, non_interactive=args.non_interactive)
        _configure_connections(
            profile_home,
            bindings,
            non_interactive=args.non_interactive,
        )
        if webhook and not runtime.webhook_enabled(profile_home):
            _configure_webhook(profile_home)

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
                f"Support receipt: {_receipt_reference(profile_home, receipt_path)}\n"
                f"Integration certification: {connection_status}\n"
                "The launcher will now start Hermes and run verification.",
                border_style="green",
            )
        )
        return 0 if connection_status in {"not_run", "passed", "deferred"} else 2
    except (runtime.RuntimeSetupError, catalog_api.CatalogError) as error:
        CONSOLE.print(
            Panel.fit(
                "[bold red]Setup stopped safely[/bold red]\n"
                + _friendly_runtime_error(error),
                border_style="red",
            )
        )
        return 2


def update_command(args: argparse.Namespace) -> int:
    profile_home = _profile_home(args.profile_home)
    try:
        if ROOT.resolve() != profile_home.resolve():
            runtime.install_or_update_distribution(ROOT, profile_home)
        webhook = runtime.webhook_enabled(profile_home)
        receipt = _run_profile_setup(profile_home, webhook=webhook, apply=True)
        receipt["entry_point"] = "setup.py update"
        receipt_path = runtime.write_receipt(profile_home, receipt)
        CONSOLE.print(
            "[green]Update installed.[/green] "
            f"Support receipt: {_receipt_reference(profile_home, receipt_path)}"
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


def _last_reply_time(profile_home: Path) -> float:
    try:
        state = json.loads(
            (profile_home / "state" / "notion-webhook.json").read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError):
        return 0.0
    last = state.get("last_reply", {}) if isinstance(state, dict) else {}
    value = last.get("sent_at") if isinstance(last, dict) else None
    return float(value) if isinstance(value, (int, float)) else 0.0


def _wait_for_new_reply(profile_home: Path, after: float, timeout: int) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if _last_reply_time(profile_home) > after:
            return True
        time.sleep(2)
    return False


def _wait_for_webhook_token(profile_home: Path, timeout: int) -> str:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        token = runtime.webhook_verification_token(profile_home)
        if token:
            return token
        time.sleep(2)
    return ""


def _guide_webhook_verification(profile_home: Path, timeout: int) -> bool:
    token = runtime.webhook_verification_token(profile_home)
    if token:
        return True
    endpoint = runtime.webhook_public_url(profile_home)
    CONSOLE.print(
        Panel.fit(
            "[bold]Verify the Notion webhook[/bold]\n"
            "In the same Notion internal connection, open [bold]Webhooks[/bold] "
            "and create a subscription:\n\n"
            f"  URL: [cyan]{endpoint or 'configured stable webhook URL'}[/cyan]\n"
            "  Event: [cyan]comment.created[/cyan]\n\n"
            "Enable Read content, Read comments, and Insert comments. Notion will send a "
            "one-time verification request; setup will detect it.",
            border_style="cyan",
        )
    )
    Prompt.ask(
        "Press Enter after creating the subscription",
        default="",
        show_default=False,
        console=CONSOLE,
    )
    wait_seconds = min(timeout, 60)
    with CONSOLE.status(
        f"[cyan]Waiting for Notion verification request (up to {wait_seconds} seconds)…[/cyan]"
    ):
        token = _wait_for_webhook_token(profile_home, wait_seconds)
    if not token:
        CONSOLE.print(
            "[yellow]No verification request arrived. Check the named tunnel route "
            "and rerun setup to retry.[/yellow]"
        )
        return False
    CONSOLE.print(
        Panel.fit(
            "[bold green]Verification request received[/bold green]\n"
            "Paste this one-time token into Notion and select Verify:\n\n"
            f"[cyan]{token}[/cyan]\n\n"
            "This token is shown only for the browser handshake and is not written "
            "to the setup receipt.",
            border_style="green",
        )
    )
    Prompt.ask(
        "Press Enter after Notion reports the subscription is verified",
        default="",
        show_default=False,
        console=CONSOLE,
    )
    return True


def certify_command(args: argparse.Namespace) -> int:
    """Run configured provider evals and render one consolidated verdict."""
    profile_home = _profile_home(args.profile_home)
    workspace = profile_home / "workspace.hermes.md"
    try:
        bindings = _selected_bindings(workspace)
        if not bindings:
            CONSOLE.print("[yellow]No configured catalog providers to test.[/yellow]")
            return 0
        allow_side_effects = bool(args.allow_side_effects)
        if sys.stdin.isatty() and not allow_side_effects:
            allow_side_effects = _connection_eval_confirmation(bindings)
            if not allow_side_effects:
                _defer_connection_evals(profile_home, workspace)
                CONSOLE.print("[yellow]Integration certification deferred.[/yellow]")
                return 1
        receipt = _certify_with_recovery(
            profile_home,
            workspace,
            allow_side_effects=allow_side_effects,
            interactive=sys.stdin.isatty(),
        )
        return {"passed": 0, "deferred": 1, "human_required": 1}.get(
            str(receipt["status"]), 2
        )
    except (runtime.RuntimeSetupError, catalog_api.CatalogError) as error:
        CONSOLE.print(
            Panel.fit(
                "[bold red]Integration certification failed[/bold red]\n"
                f"{error}",
                border_style="red",
            )
        )
        return 2


def verify_command(args: argparse.Namespace) -> int:
    profile_home = _profile_home(args.profile_home)
    if args.test_connections or (
        args.live
        and not args.skip_connections
        and sys.stdin.isatty()
        and Confirm.ask(
            "Retest configured integrations before health verification?",
            default=False,
            console=CONSOLE,
        )
    ):
        connection_args = argparse.Namespace(
            profile_home=profile_home,
            allow_side_effects=args.allow_side_effects,
        )
        certify_command(connection_args)
    comment_after: float | None = None
    webhook_verified = True
    if args.live and runtime.webhook_enabled(profile_home) and sys.stdin.isatty():
        webhook_verified = _guide_webhook_verification(profile_home, args.wait)
    if (
        args.live
        and runtime.webhook_enabled(profile_home)
        and webhook_verified
        and sys.stdin.isatty()
    ):
        comment_after = _last_reply_time(profile_home)
        CONSOLE.print(
            Panel.fit(
                "[bold]Live Notion comment test[/bold]\n"
                "On the isolated setup test page, add: [cyan]@hermes setup healthcheck[/cyan]\n"
                "Setup will wait for exactly one new threaded reply.",
                border_style="cyan",
            )
        )
        Prompt.ask(
            "Press Enter after posting the comment",
            default="",
            show_default=False,
            console=CONSOLE,
        )
        with CONSOLE.status(
            f"[cyan]Waiting for one new threaded reply (up to {args.wait} seconds)…[/cyan]"
        ):
            _wait_for_new_reply(profile_home, comment_after, args.wait)

    receipt = runtime.verify_profile(
        profile_home,
        live=args.live,
        comment_after=comment_after,
    )
    table = Table(title="Installation verification")
    table.add_column("Lane")
    table.add_column("Result")
    table.add_column("Meaning")
    colors = {"pass": "green", "skip": "yellow", "fail": "red"}
    for lane in receipt["lanes"]:
        color_name = colors.get(str(lane["status"]), "white")
        table.add_row(
            str(lane["name"]),
            f"[{color_name}]{lane['status']}[/{color_name}]",
            str(lane["detail"]),
        )
    CONSOLE.print(table)
    receipt_path = runtime.write_receipt(profile_home, receipt)
    status = str(receipt["status"])
    color_name = {"ready": "green", "partial": "yellow", "blocked": "red"}.get(status, "white")
    CONSOLE.print(
        Panel.fit(
            f"[bold {color_name}]{status.upper()}[/bold {color_name}]\n"
            f"Support receipt: {_receipt_reference(profile_home, receipt_path)}",
            border_style=color_name,
        )
    )
    return {"ready": 0, "partial": 1}.get(status, 2)


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
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

    enabled = subcommands.add_parser("webhook-enabled")
    enabled.add_argument("--profile-home", type=Path)
    return command


def main() -> int:
    global runtime
    try:
        arguments = sys.argv[1:] or ["launch"]
        args = parser().parse_args(arguments)
        selected = args.command
        if selected in {"init", "configure"}:
            return configure_workspace(
                selected,
                args.workspace.expanduser().resolve(),
                args.template.expanduser().resolve(),
            )
        from scripts import setup_runtime

        runtime = setup_runtime
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
        if selected == "webhook-enabled":
            return 0 if runtime.webhook_enabled(_profile_home(args.profile_home)) else 1
        return 2
    except KeyboardInterrupt:
        CONSOLE.print(
            "\n[yellow]Stopped safely. No additional setup changes were made.[/yellow]"
        )
        return 130


if __name__ == "__main__":
    raise SystemExit(main())

"""Interactive company workspace configuration flow."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rich.panel import Panel
from rich.table import Table

from scripts import provider_catalog
from scripts.setup_cli.ui import (
    CONSOLE,
    _interactive_checklist,
    _numbered_checklist,
    _prompt_text,
    choose,
    confirm,
    current_value,
)


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
        answer = _prompt_text(label, default=current or None, console=CONSOLE)
        if answer:
            if "|" in answer or "\n" in answer:
                CONSOLE.print("[yellow]Use a single line without '|'.[/yellow]")
                continue
            return answer
        if current:
            return current
        CONSOLE.print("[yellow]A value is required. Press Ctrl+C to stop safely.[/yellow]")


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


def select_provider(role: str, current: str = "") -> str:
    """Select one reviewed provider for a managed data-source role."""
    source = provider_catalog.load_catalog().get(role)
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
    return choose(
        f"Provider for {role} [{labels}]",
        choices=provider_ids,
        default=current_id or provider_ids[0],
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
    if not confirm("Write this configuration?", default=True):
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

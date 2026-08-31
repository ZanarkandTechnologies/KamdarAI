"""Interactive company workspace configuration flow."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rich.panel import Panel
from rich.table import Table

from schemas.workspace import (
    CommunicationBinding,
    DeliveryBehavior,
    MessageType,
    MessagingApp,
    MANAGED_COMMUNICATIONS,
    parse_workspace_communications,
    render_workspace_communications,
)
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
AUTOMATION_DELIVERY = re.compile(
    r"^automation_delivery:\s*$\n(?P<body>(?:^[ \t]+[^\n]+\n?)*)",
    re.MULTILINE,
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
        if name == "communications":
            return match.group(0)
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
                if name == "data-sources":
                    provider = select_provider(role, provider)
                    source = ask(
                        f"Source URL or identifier for {role.replace('_', ' ').title()}",
                        source,
                    )
                else:
                    message = role.replace("_", " ").title()
                    provider = ask(f"Messaging app for {message}", provider)
                    source = ask(f"Send {message} to", source)
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


MESSAGE_CHOICES = (
    (MessageType.OWNER_REPORT, "Send completed reports to the company owner"),
    (MessageType.OWNER_ALERT, "Alert the owner when something needs attention"),
)


def _message_selection(
    current: list[CommunicationBinding],
) -> tuple[set[MessageType], bool]:
    """Return selected jobs and whether the customer requested route changes."""
    selected_now = {binding.message for binding in current}
    CONSOLE.rule("[bold cyan]Messages[/bold cyan]")
    CONSOLE.print("What should Hermes help with?")
    for index, (_, label) in enumerate(MESSAGE_CHOICES, start=1):
        marker = "x" if MESSAGE_CHOICES[index - 1][0] in selected_now else " "
        CONSOLE.print(f"  [cyan]{index}.[/cyan] [{marker}] {label}")
    CONSOLE.print(
        "  [dim]Employee follow-up — not enabled until approved People-directory "
        "routes are available.[/dim]"
    )
    hint = "Enter keeps the current choices." if current else "Enter skips messages."
    CONSOLE.print(f"[dim]{hint} Use comma-separated numbers or 'all'.[/dim]")
    while True:
        raw = _prompt_text(
            "Selection",
            default="",
            show_default=False,
            console=CONSOLE,
        ).lower()
        if not raw:
            return selected_now, False
        if raw == "all":
            return {choice[0] for choice in MESSAGE_CHOICES}, True
        try:
            indices = sorted({int(value.strip()) - 1 for value in raw.split(",")})
        except ValueError:
            indices = []
        if indices and all(0 <= index < len(MESSAGE_CHOICES) for index in indices):
            return {MESSAGE_CHOICES[index][0] for index in indices}, True
        CONSOLE.print("[yellow]Enter 1, 2, all, or press Enter.[/yellow]")


def replace_communications(content: str) -> str:
    """Configure the friendly customer choices and derive the internal boundary."""
    try:
        current = parse_workspace_communications(content).communications
    except ValueError as error:
        block = MANAGED_COMMUNICATIONS.search(content)
        retired_poc_row = block and all(
            value in block.group(1)
            for value in ("`operator_review`", "| manual |", "proposal-only")
        )
        if not retired_poc_row:
            raise SystemExit(f"Invalid communications configuration: {error}") from error
        current = []
        CONSOLE.print(
            "[yellow]A retired POC messaging setting was found. "
            "Choose the current options below, or press Enter to keep messaging disabled.[/yellow]"
        )
    selected, change_details = _message_selection(current)
    if not selected:
        bindings: list[CommunicationBinding] = []
    elif current and not change_details and {item.message for item in current} == selected:
        bindings = current
    else:
        owner = next(
            (
                item
                for item in current
                if item.message in {MessageType.OWNER_REPORT, MessageType.OWNER_ALERT}
            ),
            None,
        )
        CONSOLE.rule("[bold cyan]Owner messages[/bold cyan]")
        send_to = ask("Who should receive these messages?", owner.send_to if owner else "")
        app = choose(
            "Which app should Hermes use?",
            choices=[item.value for item in MessagingApp],
            default=owner.app.value if owner else MessagingApp.TELEGRAM.value,
        )
        behavior_choice = choose(
            "What should Hermes do? [drafts = prepare drafts for approval; automatic = send automatically]",
            choices=["drafts", "automatic"],
            default=(
                "automatic"
                if owner and owner.behavior is DeliveryBehavior.SEND_AUTOMATICALLY
                else "drafts"
            ),
        )
        behavior = (
            DeliveryBehavior.SEND_AUTOMATICALLY
            if behavior_choice == "automatic"
            else DeliveryBehavior.PREPARE_DRAFTS
        )
        bindings = [
            CommunicationBinding(
                message=message,
                app=MessagingApp(app),
                send_to=send_to,
                behavior=behavior,
            )
            for message in selected
        ]

    table = render_workspace_communications(bindings)
    return MANAGED_COMMUNICATIONS.sub(
        "<!-- hermes:managed communications -->\n"
        + table
        + "\n<!-- /hermes:managed communications -->",
        content,
        count=1,
    )


def replace_automation_delivery(content: str) -> str:
    """Choose whether reviewed Stage 2 runs may start for any cadence."""
    block = AUTOMATION_DELIVERY.search(content)
    if not block:
        marker = "production_write_mode: proposal-only\n"
        if marker not in content:
            raise SystemExit("Workspace frontmatter is missing production_write_mode.")
        content = content.replace(
            marker,
            marker
            + "automation_delivery:\n"
            + "  daily: disabled\n"
            + "  weekly: disabled\n"
            + "  meeting-intake: disabled\n",
            1,
        )
        block = AUTOMATION_DELIVERY.search(content)
    assert block is not None
    current = {
        match.group(1): match.group(2)
        for match in re.finditer(
            r"^[ \t]+(daily|weekly|meeting-intake):\s*(disabled|enabled)\s*$",
            block.group("body"),
            re.MULTILINE,
        )
    }
    default = (
        "reviewed stage 2"
        if any(value == "enabled" for value in current.values())
        else "prepare only"
    )
    CONSOLE.rule("[bold cyan]Evaluation delivery[/bold cyan]")
    CONSOLE.print(
        "Prepare only changes no downstream system. Reviewed Stage 2 shows the "
        "complete downstream plan and still requires an explicit Apply action."
    )
    choice = choose(
        "How should evaluation runs behave?",
        choices=["prepare only", "reviewed stage 2"],
        default=default,
    )
    value = "enabled" if choice == "reviewed stage 2" else "disabled"
    replacement = (
        "automation_delivery:\n"
        f"  daily: {value}\n"
        f"  weekly: {value}\n"
        f"  meeting-intake: {value}\n"
    )
    return AUTOMATION_DELIVERY.sub(replacement, content, count=1)


def migrate_managed_communications(content: str, template: str) -> str:
    """Add the reviewed managed block to pre-messaging workspaces, preserving prose."""
    if MANAGED_COMMUNICATIONS.search(content):
        return content
    template_block = MANAGED_COMMUNICATIONS.search(template)
    if not template_block:
        raise SystemExit("Workspace template is missing its communications block.")
    block = (
        "<!-- hermes:managed communications -->"
        + template_block.group(1)
        + "<!-- /hermes:managed communications -->"
    )
    heading = "## Communications\n"
    if heading in content:
        return content.replace(heading, heading + "\n" + block + "\n", 1)
    anchor = "## Operating guidance\n"
    section = "## Communications\n\n" + block + "\n\n"
    if anchor in content:
        return content.replace(anchor, section + anchor, 1)
    return content.rstrip() + "\n\n" + section


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
        f"Provider for {role.replace('_', ' ').title()} [{labels}]",
        choices=provider_ids,
        default=current_id or provider_ids[0],
    )


def configure(content: str) -> str:
    content = replace_frontmatter(content)
    content = replace_rows(content)
    content = replace_communications(content)
    content = replace_automation_delivery(content)
    unresolved = sorted(set(re.findall(r"\{\{[^}]+\}\}|REPLACE_ME", content)))
    if unresolved:
        raise SystemExit("Unresolved template values: " + ", ".join(unresolved))
    try:
        parse_workspace_communications(content)
    except ValueError as error:
        raise SystemExit(f"Invalid communications configuration: {error}") from error
    return content


def show_review(content: str, workspace: Path) -> None:
    CONSOLE.rule("[bold cyan]Review[/bold cyan]")
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Role")
    table.add_column("Provider")
    table.add_column("Source", overflow="fold")
    for block in MANAGED.finditer(content):
        if block.group("name") == "communications":
            continue
        for row in ROW.finditer(block.group("body")):
            table.add_row(
                row.group("role"),
                current_value(row.group("provider")),
                current_value(row.group("source")),
            )
    CONSOLE.print(table)
    messaging = Table(title="Review messaging setup", show_header=True)
    messaging.add_column("Message")
    messaging.add_column("App")
    messaging.add_column("Recipient")
    messaging.add_column("Behavior")
    communication_config = parse_workspace_communications(content)
    for binding in communication_config.communications:
        messaging.add_row(
            binding.message.value,
            binding.app.value.title(),
            binding.send_to,
            (
                "Drafts first"
                if binding.behavior is DeliveryBehavior.PREPARE_DRAFTS
                else "Send automatically after a confirmed test"
            ),
        )
    if not communication_config.communications:
        messaging.add_row("No owner messages", "—", "—", "Not enabled")
    messaging.add_row("Employee follow-up", "—", "—", "Not enabled")
    CONSOLE.print(messaging)
    delivery = AUTOMATION_DELIVERY.search(content)
    enabled = bool(delivery and "enabled" in delivery.group("body"))
    CONSOLE.print(
        "Evaluation delivery: "
        + (
            "Review the complete Stage 2 plan before an explicit Apply"
            if enabled
            else "Prepare and evaluate only; no downstream changes"
        )
    )
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

    template_content = template.read_text(encoding="utf-8") if template.is_file() else ""
    content = migrate_managed_communications(content, template_content)

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

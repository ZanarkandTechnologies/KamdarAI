"""Cloudflare ingress and Notion webhook onboarding flows."""

from __future__ import annotations

import json
import time
from pathlib import Path

from rich.panel import Panel

from scripts import setup_runtime as runtime
from scripts.setup_cli.ui import CONSOLE, _prompt_secret, _prompt_text, pause


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
        notion_token = _prompt_secret("Notion integration token (hidden): ")
        runtime.save_profile_secret(profile_home, "NOTION_TOKEN", notion_token)
    token_path = profile_home / runtime.TUNNEL_TOKEN_RELATIVE
    if not token_path.is_file():
        tunnel_token = _prompt_secret("Cloudflare tunnel token (hidden): ")
        runtime.save_tunnel_token(profile_home, tunnel_token)
    while True:
        public_url = _prompt_text(
            "Stable named-tunnel HTTPS hostname",
            console=CONSOLE,
        )
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
    pause("Press Enter after creating the subscription")
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
    pause("Press Enter after Notion reports the subscription is verified")
    return True

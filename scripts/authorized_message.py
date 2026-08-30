#!/usr/bin/env python3
"""Typed guard for owner-message drafts, approvals, and Hermes sends."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Installed cron runs from profile/workspace while this script lives in
# profile/scripts. Add the installed profile root before importing its package.
PROFILE_ROOT = Path(__file__).resolve().parents[1]
if str(PROFILE_ROOT) not in sys.path:
    sys.path.insert(0, str(PROFILE_ROOT))

from schemas.workspace import (  # noqa: E402
    DeliveryBehavior,
    MessageType,
    parse_workspace_communications,
)
from scripts import setup_runtime as runtime  # noqa: E402


ACTION_KEY = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}$")


def _emit(status: str, **values: object) -> None:
    print(json.dumps({"status": status, **values}, sort_keys=True))


def _company_week(content: str) -> str:
    match = re.search(r'^company_timezone:\s*"?([^"\n]+)"?\s*$', content, re.MULTILINE)
    timezone = match.group(1).strip() if match else "UTC"
    try:
        now = datetime.now(ZoneInfo(timezone))
    except ZoneInfoNotFoundError:
        now = datetime.now(ZoneInfo("UTC"))
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def _draft_content(message: MessageType, recipient: str, app: str, body: str, action_key: str) -> str:
    digest = hashlib.sha256(body.encode()).hexdigest()
    return (
        "---\n"
        "kind: owner-message-draft\n"
        f"message: {message.value}\n"
        f"recipient: {json.dumps(recipient, ensure_ascii=False)}\n"
        f"app: {app}\n"
        f"action_key: {action_key}\n"
        f"body_sha256: {digest}\n"
        "status: awaiting-approval\n"
        "---\n\n"
        "## Message\n\n"
        + body
        + "\n"
    )


def _write_draft(profile_home: Path, week: str, action_key: str, content: str) -> tuple[Path, str]:
    destination = profile_home / "workspace" / "weeks" / week / "outbound" / f"{action_key}.md"
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        existing = destination.read_text(encoding="utf-8")
        if existing == content:
            return destination, "draft_exists"
        raise ValueError("draft_action_conflict")
    descriptor, temporary = tempfile.mkstemp(prefix=".owner-message-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(content)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return destination, "draft_created"


def _approved_draft(path: Path, profile_home: Path, message: MessageType) -> str:
    resolved = path.expanduser().resolve()
    outbound_root = (profile_home / "workspace" / "weeks").resolve()
    try:
        relative = resolved.relative_to(outbound_root)
    except ValueError as error:
        raise ValueError("approved_draft_outside_workspace") from error
    if "outbound" not in relative.parts or resolved.suffix != ".md":
        raise ValueError("approved_draft_invalid_path")
    content = resolved.read_text(encoding="utf-8")
    if f"message: {message.value}\n" not in content or "status: awaiting-approval\n" not in content:
        raise ValueError("approved_draft_contract_mismatch")
    marker = "\n## Message\n\n"
    if marker not in content:
        raise ValueError("approved_draft_body_missing")
    return content.split(marker, 1)[1].strip()


def operate(args: argparse.Namespace) -> int:
    profile_home = args.profile_home.expanduser().resolve()
    workspace = args.workspace.expanduser().resolve()
    allowed_workspaces = {
        profile_home / "workspace.hermes.md",
        profile_home / "workspace" / ".hermes.md",
    }
    if workspace not in allowed_workspaces:
        _emit("blocked", reason="workspace_profile_mismatch")
        return 2
    try:
        workspace_content = workspace.read_text(encoding="utf-8")
        config = parse_workspace_communications(workspace_content)
        message = MessageType(args.message)
    except (OSError, ValueError):
        _emit("blocked", reason="messaging_config_invalid")
        return 2
    matches = [item for item in config.communications if item.message is message]
    if len(matches) != 1:
        _emit("blocked", reason="message_not_configured")
        return 2
    binding = matches[0]

    try:
        if args.approve_draft:
            body = _approved_draft(args.approve_draft, profile_home, message)
        else:
            body = sys.stdin.read().strip()
    except (OSError, ValueError) as error:
        _emit("blocked", reason=str(error))
        return 2
    if not body:
        _emit("blocked", reason="empty_message")
        return 2

    if (
        binding.behavior is DeliveryBehavior.PREPARE_DRAFTS
        and not args.approve_draft
    ):
        if not args.action_key or not ACTION_KEY.fullmatch(args.action_key):
            _emit("blocked", reason="invalid_action_key")
            return 2
        try:
            content = _draft_content(
                message, binding.send_to, binding.app.value, body, args.action_key
            )
            path, status = _write_draft(
                profile_home, _company_week(workspace_content), args.action_key, content
            )
        except (OSError, ValueError) as error:
            _emit("blocked", reason=str(error))
            return 2
        _emit(status, draft=str(path.relative_to(profile_home / "workspace")))
        return 0

    exact_target = runtime.current_messaging_target(profile_home, config.communications)
    if not exact_target:
        _emit("blocked", reason="owner_route_not_confirmed")
        return 2
    result = runtime.run_command(
        ["hermes", "send", "--to", exact_target, "--json", body],
        profile_home,
        check=False,
    )
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        payload = {}
    success = result.returncode == 0 and payload.get("success") is True
    _emit(
        "sent" if success else "failed",
        platform=binding.app.value,
        message_id=str(payload["message_id"]) if payload.get("message_id") else None,
    )
    return 0 if success else 2


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
    command.add_argument("--workspace", type=Path, required=True)
    command.add_argument("--profile-home", type=Path, required=True)
    command.add_argument("--message", choices=[item.value for item in MessageType], required=True)
    command.add_argument("--action-key")
    command.add_argument("--approve-draft", type=Path)
    return command


if __name__ == "__main__":
    raise SystemExit(operate(parser().parse_args()))

"""Typed contracts for customer-owned workspace messaging choices."""

from __future__ import annotations

import hashlib
import json
import re
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


MANAGED_COMMUNICATIONS = re.compile(
    r"<!-- hermes:managed communications -->(.*?)"
    r"<!-- /hermes:managed communications -->",
    re.DOTALL,
)
COMMUNICATION_ROW = re.compile(
    r"^\| `(?P<message>[^`]+)` \| (?P<app>[^|]+?) "
    r"\| (?P<send_to>[^|]+?) \| (?P<behavior>[^|]+?) \|$",
    re.MULTILINE,
)


class MessageType(StrEnum):
    OWNER_REPORT = "owner report"
    OWNER_ALERT = "owner alert"
    EMPLOYEE_FOLLOW_UP = "employee follow-up"


class DeliveryBehavior(StrEnum):
    PREPARE_DRAFTS = "prepare drafts for approval"
    SEND_AUTOMATICALLY = "send automatically"


class MessagingApp(StrEnum):
    TELEGRAM = "telegram"
    SLACK = "slack"
    WHATSAPP = "whatsapp"


class RunMode(StrEnum):
    """Derived runtime state; never shown as a setup question."""

    LIVE = "live"


class RecipientRule(StrEnum):
    """Derived recipient boundary; never shown as a setup question."""

    NAMED_OWNER = "named owner"
    EMPLOYEE_APPROVED_CONTACT = "employee-approved contact"


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class CommunicationBinding(BaseModel):
    """One business message the customer has enabled in the workspace."""

    model_config = ConfigDict(extra="forbid")

    message: MessageType
    app: MessagingApp
    send_to: NonEmptyString
    behavior: DeliveryBehavior

    @model_validator(mode="after")
    def keep_employee_delivery_draft_only(self) -> "CommunicationBinding":
        if (
            self.message is MessageType.EMPLOYEE_FOLLOW_UP
            and self.behavior is DeliveryBehavior.SEND_AUTOMATICALLY
        ):
            raise ValueError(
                "employee follow-up can only prepare drafts until approved "
                "People-directory routes are configured"
            )
        return self

    @property
    def mode(self) -> RunMode:
        return RunMode.LIVE

    @property
    def recipient_rule(self) -> RecipientRule:
        if self.message is MessageType.EMPLOYEE_FOLLOW_UP:
            return RecipientRule.EMPLOYEE_APPROVED_CONTACT
        return RecipientRule.NAMED_OWNER


class WorkspaceCommunicationConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    communications: list[CommunicationBinding] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_unique_messages(self) -> "WorkspaceCommunicationConfig":
        messages = [binding.message for binding in self.communications]
        if len(messages) != len(set(messages)):
            raise ValueError("each message may be configured only once")
        owner_bindings = [
            binding
            for binding in self.communications
            if binding.message in {MessageType.OWNER_REPORT, MessageType.OWNER_ALERT}
        ]
        owner_routes = {
            (binding.app, binding.send_to.casefold(), binding.behavior)
            for binding in owner_bindings
        }
        if len(owner_routes) > 1:
            raise ValueError("owner reports and owner alerts must use one reviewed route")
        return self


class MessagingTestReceipt(BaseModel):
    """Redacted proof of one explicitly approved setup test."""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    configuration_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    app: MessagingApp
    recipient_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    status: str = Field(pattern=r"^(passed|failed)$")
    recipient_confirmed: bool
    exact_target: str | None = Field(default=None, pattern=r"^[a-z]+:.+$")
    target_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    message_id: str | None = None

    @model_validator(mode="after")
    def passed_receipt_has_exact_target(self) -> "MessagingTestReceipt":
        if self.status == "passed" and (
            not self.recipient_confirmed or not self.exact_target or not self.target_sha256
        ):
            raise ValueError("a passed messaging test requires a confirmed exact target")
        if self.exact_target:
            expected = hashlib.sha256(self.exact_target.encode()).hexdigest()
            if self.target_sha256 != expected:
                raise ValueError("messaging target hash does not match the exact target")
            if not self.exact_target.startswith(f"{self.app.value}:"):
                raise ValueError("messaging target does not match the selected app")
        return self


def configuration_hash(bindings: list[CommunicationBinding]) -> str:
    payload = [
        binding.model_dump(mode="json")
        for binding in sorted(bindings, key=lambda item: item.message.value)
    ]
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def parse_workspace_communications(content: str) -> WorkspaceCommunicationConfig:
    """Parse and validate the managed communications table from Markdown."""

    block = MANAGED_COMMUNICATIONS.search(content)
    if not block:
        raise ValueError("workspace communications block is missing")

    rows: list[CommunicationBinding] = []
    for match in COMMUNICATION_ROW.finditer(block.group(1)):
        values = {key: value.strip() for key, value in match.groupdict().items()}
        if any(value.lower() in {"", "—", "replace_me"} for value in values.values()):
            raise ValueError(
                f"communication binding is incomplete: {values.get('message', 'unknown')}"
            )
        rows.append(CommunicationBinding.model_validate(values))
    return WorkspaceCommunicationConfig(communications=rows)


def render_workspace_communications(bindings: list[CommunicationBinding]) -> str:
    """Render the canonical friendly table without internal policy fields."""

    lines = [
        "| Message | App | Send to | Behavior |",
        "| --- | --- | --- | --- |",
    ]
    for binding in sorted(bindings, key=lambda item: item.message.value):
        lines.append(
            f"| `{binding.message.value}` | {binding.app.value} | "
            f"{binding.send_to} | {binding.behavior.value} |"
        )
    return "\n".join(lines)

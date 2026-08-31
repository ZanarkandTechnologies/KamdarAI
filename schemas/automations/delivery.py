"""Typed Stage 2 plans and redacted delivery receipts."""

from __future__ import annotations

import hashlib
import json
import re
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ACTION_KEY = re.compile(r"^[a-z0-9][a-z0-9._:-]{0,191}$")


def stable_sha256(value: Any) -> str:
    encoded = json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":")
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class DeliveryEnvironment(StrEnum):
    ISOLATED_EVAL = "isolated-eval"


class DeliveryPolicy(StrEnum):
    DISABLED = "disabled"
    ENABLED = "enabled"


class DownstreamProvider(StrEnum):
    UNCONFIGURED = "unconfigured"
    PRIVATE_WORKSPACE = "private-workspace"
    NOTION = "notion"
    LINEAR = "linear"
    GOOGLE_DRIVE = "google-drive"
    TELEGRAM = "telegram"
    SLACK = "slack"
    WHATSAPP = "whatsapp"


class DownstreamOperation(StrEnum):
    APPEND_PROJECT_NOTES = "append-project-notes"
    SYNC_SHORT_TERM_MEMORY = "sync-short-term-memory"
    ADD_WORK_COMMENT = "add-work-comment"
    SEND_EMPLOYEE_FOLLOW_UP = "send-employee-follow-up"
    PUBLISH_FINAL_REPORT = "publish-final-report"
    WRITE_FINAL_REPORT = "write-final-report"
    PROMOTE_KNOWLEDGE = "promote-knowledge"
    UPDATE_LONG_TERM_MEMORY = "update-long-term-memory"
    SYNC_LONG_TERM_MEMORY = "sync-long-term-memory"
    WRITE_CONSOLIDATION_RECEIPT = "write-consolidation-receipt"
    CARRY_FORWARD_PROJECT_NOTES = "carry-forward-project-notes"
    INITIALIZE_PROJECT_NOTES = "initialize-project-notes"
    CREATE_TASK = "create-task"
    SEND_OWNER_REPORT = "send-owner-report"


class PlannedAction(StrictModel):
    action_key: str
    feature_id: str = Field(pattern=r"^FEAT-\d{4}$")
    result_pointer: str = Field(pattern=r"^/[a-z_]+/\d+$")
    provider: DownstreamProvider
    connection: str
    operation: DownstreamOperation
    target_role: str
    target: str | None
    payload: dict[str, Any]
    payload_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    required: bool = True
    state: Literal["ready", "blocked"]
    blocked_reason: str | None = None
    depends_on_action_keys: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_action(self) -> "PlannedAction":
        if not ACTION_KEY.fullmatch(self.action_key):
            raise ValueError("action_key must be stable and filename-safe")
        if self.payload_sha256 != stable_sha256(self.payload):
            raise ValueError("payload_sha256 does not match the exact payload")
        if self.state == "ready" and (not self.target or self.blocked_reason):
            raise ValueError("ready actions require an exact target and no blocker")
        if self.state == "blocked" and not self.blocked_reason:
            raise ValueError("blocked actions require a concrete reason")
        if len(self.depends_on_action_keys) != len(set(self.depends_on_action_keys)):
            raise ValueError("action dependencies must be unique")
        for dependency in self.depends_on_action_keys:
            if not ACTION_KEY.fullmatch(dependency):
                raise ValueError("depends_on_action_key must be stable and filename-safe")
            if dependency == self.action_key:
                raise ValueError("an action cannot depend on itself")
        return self


class DeliveryPlan(StrictModel):
    schema_version: Literal["kamdar-stage-two-plan@1.1.0"]
    cadence: Literal["daily", "weekly"]
    environment: DeliveryEnvironment
    delivery_policy: DeliveryPolicy
    delivery_policy_source: str
    workspace_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    result_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    actions: list[PlannedAction]
    ready_actions: int = Field(ge=0)
    blocked_actions: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_plan(self) -> "DeliveryPlan":
        keys = [action.action_key for action in self.actions]
        if len(keys) != len(set(keys)):
            raise ValueError("delivery action keys must be unique")
        ready = sum(action.state == "ready" for action in self.actions)
        blocked = sum(action.state == "blocked" for action in self.actions)
        if (ready, blocked) != (self.ready_actions, self.blocked_actions):
            raise ValueError("delivery plan counts do not match its actions")
        seen: set[str] = set()
        for action in self.actions:
            if any(dependency not in seen for dependency in action.depends_on_action_keys):
                raise ValueError("action dependencies must reference earlier actions in the plan")
            seen.add(action.action_key)
        return self


class ActionReceipt(StrictModel):
    action_key: str
    provider: DownstreamProvider
    operation: DownstreamOperation
    payload_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    state: Literal["applied", "duplicate", "blocked", "failed"]
    provider_response_id: str | None = None
    confirmation: Literal[
        "none", "filesystem_read_back", "provider_read_back", "provider_acceptance"
    ] = "none"
    reason: str | None = None
    local_path: str | None = None
    local_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def validate_receipt(self) -> "ActionReceipt":
        if self.state == "applied" and self.confirmation == "none":
            raise ValueError("applied actions require provider or filesystem confirmation")
        if self.state in {"blocked", "failed"} and not self.reason:
            raise ValueError("blocked and failed actions require a reason")
        if (self.local_path is None) != (self.local_sha256 is None):
            raise ValueError("local_path and local_sha256 must be recorded together")
        return self


class DeliveryReceipt(StrictModel):
    schema_version: Literal["kamdar-stage-two-receipt@1.1.0"]
    cadence: Literal["daily", "weekly"]
    environment: DeliveryEnvironment
    plan_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    status: Literal["not_requested", "applied", "partial", "blocked", "failed"]
    downstream_calls: int = Field(ge=0)
    actions: list[ActionReceipt]

"""Pydantic contract for a no-mutation Daily idempotency rerun audit."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    StringConstraints,
    model_validator,
)


_OFFSET_DATETIME_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _offset_datetime(value: str) -> str:
    if not _OFFSET_DATETIME_PATTERN.fullmatch(value):
        raise ValueError("must be an ISO 8601 datetime with a UTC offset")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("must be an ISO 8601 datetime") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("datetime must include a UTC offset")
    return value


NonEmptyString = Annotated[
    StrictStr, StringConstraints(strip_whitespace=True, min_length=1)
]
StableId = NonEmptyString
Sha256 = Annotated[
    StrictStr, StringConstraints(pattern=r"^[a-f0-9]{64}$")
]
OffsetDatetime = Annotated[
    StrictStr,
    AfterValidator(_offset_datetime),
    Field(json_schema_extra={"format": "date-time"}),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class LookupReadBack(StrictModel):
    provider_response_id: StableId
    target_id: StableId
    payload_hash: Sha256
    matched: Literal[True]
    created: Literal[False]


class AuditEffect(StrictModel):
    original_effect_id: StableId
    result_pointer: Annotated[
        StrictStr,
        StringConstraints(
            pattern=r"^/(project_updates|documentation_reviews|weekly_progress_chases|knowledge_updates)(?:/\d+)?$"
        ),
    ]
    action_key: StableId
    target_id: StableId
    payload_hash: Sha256
    original_outcome: Literal[
        "applied",
        "duplicate",
        "delivered_to_eval_sink",
        "no_finding",
        "blocked",
        "conflicted",
        "failed",
    ]
    outcome: Literal["duplicate", "no_finding", "blocked", "conflicted", "failed"]
    new_provider_mutations: Literal[0]
    lookup_read_back: LookupReadBack | None
    reason: NonEmptyString

    @model_validator(mode="after")
    def validate_audit_effect(self) -> "AuditEffect":
        if self.outcome == "duplicate" and self.lookup_read_back is None:
            raise ValueError(
                "Duplicate audit effects require lookup/read-back evidence."
            )
        if self.outcome == "no_finding" and self.lookup_read_back is not None:
            raise ValueError(
                "No-finding audit effects must not claim provider read-back."
            )
        if self.outcome != "duplicate" and self.lookup_read_back is not None:
            raise ValueError("Only duplicate audit effects may carry provider read-back.")
        pointer_is_row = self.result_pointer.rsplit("/", 1)[-1].isdigit()
        if not pointer_is_row and self.outcome != "no_finding":
            raise ValueError("Only no-finding audits may bind a whole result array.")
        if self.lookup_read_back and (
            self.lookup_read_back.target_id != self.target_id
            or self.lookup_read_back.payload_hash != self.payload_hash
        ):
            raise ValueError(
                "Lookup/read-back must match the audited target and payload."
            )
        return self


class WorkProcessingAudit(StrictModel):
    work_item_id: StableId
    original_state: Literal["processed", "needs_information", "blocked"]
    rerun_state: Literal["processed", "needs_information", "blocked"]
    status_after: Literal["Done"]
    ai_review_after: Literal["Needs information", "Processed", "Blocked"]
    daily_review_version_after: Literal["daily-review-v2"] | None
    changed: Literal[False]

    @model_validator(mode="after")
    def validate_processing_audit(self) -> "WorkProcessingAudit":
        if self.original_state != self.rerun_state:
            raise ValueError(
                "Rerun processing state must equal original processing state."
            )
        fields_match = (
            self.rerun_state == "processed"
            and self.ai_review_after == "Processed"
            and self.daily_review_version_after == "daily-review-v2"
        ) or (
            self.rerun_state == "needs_information"
            and self.ai_review_after == "Needs information"
            and self.daily_review_version_after is None
        ) or (
            self.rerun_state == "blocked"
            and self.ai_review_after == "Blocked"
            and self.daily_review_version_after is None
        )
        if not fields_match:
            raise ValueError("AI review properties must match rerun_state.")
        return self


class IdempotencySummary(StrictModel):
    original_effect_count: Annotated[StrictInt, Field(ge=0)]
    audited_effect_count: Annotated[StrictInt, Field(ge=0)]
    duplicate_count: Annotated[StrictInt, Field(ge=0)]
    no_finding_count: Annotated[StrictInt, Field(ge=0)]
    blocked_count: Annotated[StrictInt, Field(ge=0)]
    conflicted_count: Annotated[StrictInt, Field(ge=0)]
    failed_count: Annotated[StrictInt, Field(ge=0)]
    new_provider_mutations: Literal[0]
    processing_changes: Literal[0]


class DailyIdempotencyRerunReceipt(StrictModel):
    schema_version: Literal["kamdar-daily-idempotency-rerun-receipt@1.1.0"]
    rerun_receipt_id: StableId
    original_receipt_id: StableId
    original_receipt_sha256: Sha256
    source_context_id: StableId
    source_context_sha256: Sha256
    daily_result_id: StableId
    daily_result_sha256: Sha256
    recorded_at: OffsetDatetime
    live_provider_calls: Literal[False]
    audit_effects: Annotated[list[AuditEffect], Field(min_length=1)]
    work_processing: Annotated[list[WorkProcessingAudit], Field(min_length=1)]
    summary: IdempotencySummary
    run_notes: StrictStr

    @model_validator(mode="after")
    def validate_rerun_receipt(self) -> "DailyIdempotencyRerunReceipt":
        effect_ids = [row.original_effect_id for row in self.audit_effects]
        if len(set(effect_ids)) != len(effect_ids):
            raise ValueError("Each original effect must be audited exactly once.")
        work_ids = [row.work_item_id for row in self.work_processing]
        if len(set(work_ids)) != len(work_ids):
            raise ValueError(
                "Each Work processing row must be audited exactly once."
            )
        expected = {
            "original_effect_count": len(self.audit_effects),
            "audited_effect_count": len(self.audit_effects),
            "duplicate_count": sum(
                row.outcome == "duplicate" for row in self.audit_effects
            ),
            "no_finding_count": sum(
                row.outcome == "no_finding" for row in self.audit_effects
            ),
            "blocked_count": sum(row.outcome == "blocked" for row in self.audit_effects),
            "conflicted_count": sum(
                row.outcome == "conflicted" for row in self.audit_effects
            ),
            "failed_count": sum(row.outcome == "failed" for row in self.audit_effects),
        }
        actual = self.summary.model_dump(include=set(expected))
        if actual != expected:
            raise ValueError("Summary counts must match the audit rows.")
        return self


DailyIdempotencyRerunReceiptJsonSchema = (
    DailyIdempotencyRerunReceipt.model_json_schema()
)

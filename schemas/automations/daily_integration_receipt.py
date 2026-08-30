"""Pydantic contract for deterministic application of one Daily Review result."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
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


def _synthetic_url(value: str) -> str:
    parsed = urlsplit(value)
    if not parsed.scheme or not parsed.hostname:
        raise ValueError("must be a URL")
    hostname = parsed.hostname.lower()
    if parsed.scheme != "workspace" and hostname != "example.test" and not hostname.endswith(".example.test"):
        raise ValueError(
            "Tracked receipts may contain only private workspace locators or source-safe synthetic example.test URLs."
        )
    return value


StableId = Annotated[
    StrictStr,
    StringConstraints(min_length=1),
    Field(
        description="Use the exact stable ID supplied by the seed, Daily context, extraction result, or provider response."
    ),
]
Sha256 = Annotated[
    StrictStr,
    StringConstraints(pattern=r"^[a-f0-9]{64}$"),
    Field(description="Lowercase SHA-256 of the exact payload passed to the integration."),
]
SyntheticUrl = Annotated[StrictStr, AfterValidator(_synthetic_url)]
OffsetDatetime = Annotated[
    StrictStr,
    AfterValidator(_offset_datetime),
    Field(json_schema_extra={"format": "date-time"}),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


FeatureId = Literal["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"]
IntegrationEffectState = Literal[
    "applied",
    "duplicate",
    "delivered_to_eval_sink",
    "no_finding",
    "blocked",
    "conflicted",
    "failed",
]


class IntegrationTarget(StrictModel):
    target_id: Annotated[StableId, Field(description="Exact seeded target record or Person ID.")]
    target_url: Annotated[
        SyntheticUrl, Field(description="Source-safe URL for the exact integration target.")
    ]


class ProviderResponse(StrictModel):
    response_id: Annotated[
        StableId,
        Field(description="Provider-returned record, comment, message, or mutation ID."),
    ]
    response_url: Annotated[
        SyntheticUrl, Field(description="Source-safe URL for the provider-returned object.")
    ]
    recorded_at: OffsetDatetime


class ReadBackEvidence(StrictModel):
    """A provider read after the write or duplicate lookup that confirms the exact routed payload."""

    target_id: StableId
    target_url: SyntheticUrl
    provider_response_id: StableId
    checked_at: OffsetDatetime
    payload_hash: Sha256
    matched: Literal[True]


class AppliedOrDuplicateOutcome(StrictModel):
    state: Literal["applied", "duplicate"]
    reason: None
    provider_response: ProviderResponse
    read_back: ReadBackEvidence


class EvalSinkDeliveryOutcome(StrictModel):
    """A provider-accepted send whose returned destination matches the configured operator-owned eval sink. This does not prove employee delivery or that a human saw the message."""

    state: Literal["delivered_to_eval_sink"]
    reason: None
    delivery_scope: Literal["operator_owned_eval_sink"]
    intended_recipient_person_id: StableId
    configured_destination_hash: Annotated[
        Sha256,
        Field(description="Hash of the approved workspace route resolved before sending."),
    ]
    provider_destination_hash: Annotated[
        Sha256, Field(description="Hash of the destination/chat returned by the provider.")
    ]
    destination_matched: Annotated[
        Literal[True],
        Field(
            description="Confirms the provider destination equals the configured route; a message ID alone is insufficient."
        ),
    ]
    provider_response: ProviderResponse
    read_back: ReadBackEvidence


class NoFindingOutcome(StrictModel):
    state: Literal["no_finding"]
    reason: Annotated[
        StrictStr,
        StringConstraints(min_length=1),
        Field(description="Why the source truthfully required no provider mutation."),
    ]
    provider_response: None
    read_back: None


class UnsafeOutcome(StrictModel):
    state: Literal["blocked", "conflicted", "failed"]
    reason: Annotated[
        StrictStr,
        StringConstraints(min_length=1),
        Field(description="Concrete reason the effect could not be safely completed."),
    ]
    provider_response: None
    read_back: None


EffectOutcome = Annotated[
    AppliedOrDuplicateOutcome
    | EvalSinkDeliveryOutcome
    | NoFindingOutcome
    | UnsafeOutcome,
    Field(discriminator="state"),
]


class IntegrationEffect(StrictModel):
    effect_id: StableId
    required: Annotated[
        StrictBool,
        Field(
            description="True when this effect must settle before linked Work can be marked processed."
        ),
    ]
    feature_id: FeatureId
    result_pointer: Annotated[
        StrictStr,
        StringConstraints(
            pattern=r"^/(project_note_updates|documentation_reviews|weekly_progress_chases)(?:/\d+(?:/.*)?)?$"
        ),
        Field(
            description="JSON Pointer into the exact Daily Review result row, or its whole output array for a verified no-finding."
        ),
    ]
    source_record_ids: Annotated[
        list[StableId],
        Field(
            min_length=1,
            description="Exact seeded records that support the extracted result row.",
        ),
    ]
    work_item_ids: Annotated[
        list[StableId],
        Field(
            min_length=1,
            description="Seeded Work records whose processed state depends on this effect.",
        ),
    ]
    integration: Literal["private_workspace", "notion", "email", "telegram", "whatsapp", "none"]
    operation: Literal[
        "append_project_notes",
        "add_work_comment",
        "send_owner_chase",
        "record_no_finding",
    ]
    target: IntegrationTarget
    payload_hash: Sha256
    outcome: EffectOutcome

    @model_validator(mode="after")
    def validate_effect(self) -> "IntegrationEffect":
        outcome = self.outcome
        if outcome.state == "no_finding":
            if self.integration != "none" or self.operation != "record_no_finding":
                raise ValueError(
                    "no_finding must use the none integration and record_no_finding operation."
                )
            return self
        pointer_parts = self.result_pointer.split("/")
        if len(pointer_parts) < 3 or not pointer_parts[2].isdigit():
            raise ValueError(
                "Provider effects must point to an exact returned result row."
            )
        if self.integration == "none" or self.operation == "record_no_finding":
            raise ValueError("Provider effects must name a real integration operation.")
        if outcome.state not in ("applied", "duplicate", "delivered_to_eval_sink"):
            return self
        if outcome.state == "delivered_to_eval_sink":
            if (
                self.feature_id != "FEAT-0003"
                or self.integration != "telegram"
                or self.operation != "send_owner_chase"
            ):
                raise ValueError(
                    "eval-sink delivery is valid only for a Telegram FEAT-0003 owner chase."
                )
            if outcome.intended_recipient_person_id != self.target.target_id:
                raise ValueError(
                    "eval-sink delivery must name the exact intended Person target."
                )
        read_back = outcome.read_back
        if (
            read_back.target_id != self.target.target_id
            or read_back.target_url != self.target.target_url
        ):
            raise ValueError("Read-back target must match the requested target.")
        if read_back.payload_hash != self.payload_hash:
            raise ValueError(
                "Read-back payload hash must match the requested payload hash."
            )
        if read_back.provider_response_id != outcome.provider_response.response_id:
            raise ValueError(
                "Read-back provider response ID must match the provider receipt."
            )
        return self


class WorkProcessingDecision(StrictModel):
    work_item_id: StableId
    documentation_review_pointer: Annotated[
        StrictStr, StringConstraints(pattern=r"^/documentation_reviews/\d+$")
    ]
    documentation_verdict: Literal["sufficient", "needs_information"]
    required_effect_ids: Annotated[list[StableId], Field(min_length=1)]
    state: Literal["processed", "needs_information", "blocked"]
    processed_at: OffsetDatetime | None
    status_after: Literal["Done"]
    ai_review_after: Literal["Needs information", "Processed", "Blocked"]
    daily_review_version_after: Literal["daily-review-v2"] | None
    reason: Annotated[StrictStr, StringConstraints(min_length=1)]


SETTLED_STATES = {"applied", "duplicate", "delivered_to_eval_sink", "no_finding"}


def _processing_safety_errors(receipt: "DailyIntegrationReceipt") -> list[str]:
    errors: list[str] = []
    effects: dict[str, IntegrationEffect] = {}
    for effect in receipt.effects:
        if effect.effect_id in effects:
            errors.append(f"duplicate effect_id {effect.effect_id}")
        effects[effect.effect_id] = effect

    decisions: dict[str, WorkProcessingDecision] = {}
    for decision in receipt.work_processing:
        if decision.work_item_id in decisions:
            errors.append(
                f"duplicate processing decision for {decision.work_item_id}"
            )
        decisions[decision.work_item_id] = decision
        expected_ids = sorted(
            effect.effect_id
            for effect in receipt.effects
            if effect.required and decision.work_item_id in effect.work_item_ids
        )
        declared_ids = sorted(decision.required_effect_ids)
        if expected_ids != declared_ids:
            errors.append(
                f"{decision.work_item_id} must enumerate every and only required linked effect"
            )
        required_effects = [effects.get(effect_id) for effect_id in declared_ids]
        if any(effect is None for effect in required_effects):
            errors.append(
                f"{decision.work_item_id} references an unknown required effect"
            )
        safely_settled = bool(required_effects) and all(
            effect is not None and effect.outcome.state in SETTLED_STATES
            for effect in required_effects
        )
        can_process = (
            decision.documentation_verdict == "sufficient" and safely_settled
        )
        needs_information = (
            decision.documentation_verdict == "needs_information" and safely_settled
        )
        if (decision.state == "processed") != can_process:
            errors.append(
                f"{decision.work_item_id} may be processed only when documentation is sufficient and every required effect safely settles"
            )
        if (decision.state == "needs_information") != needs_information:
            errors.append(
                f"{decision.work_item_id} must remain Needs information after its documentation question safely settles"
            )
        if (decision.state == "blocked") != (not safely_settled):
            errors.append(
                f"{decision.work_item_id} must be Blocked while a required effect is blocked, conflicted, failed, or missing"
            )
        if (decision.state == "processed") != (decision.processed_at is not None):
            errors.append(
                f"{decision.work_item_id} processed_at must be present only for processed Work"
            )
        state_fields_match = (
            decision.state == "processed"
            and decision.ai_review_after == "Processed"
            and decision.daily_review_version_after == "daily-review-v2"
        ) or (
            decision.state == "needs_information"
            and decision.ai_review_after == "Needs information"
            and decision.daily_review_version_after is None
        ) or (
            decision.state == "blocked"
            and decision.ai_review_after == "Blocked"
            and decision.daily_review_version_after is None
        )
        if not state_fields_match:
            errors.append(
                f"{decision.work_item_id} has AI review fields that do not match its processing state"
            )

    required_work_ids = {
        work_item_id
        for effect in receipt.effects
        if effect.required
        for work_item_id in effect.work_item_ids
    }
    for work_item_id in required_work_ids:
        if work_item_id not in decisions:
            errors.append(f"{work_item_id} is missing a processing decision")
    return errors


class DailyIntegrationReceipt(StrictModel):
    """Receipt for deterministic application of one Daily Review result. Business Status remains Done. AI review becomes Processed only when documentation is sufficient and every required linked effect safely settles; a posted question leaves AI review as Needs information."""

    schema_version: Literal["kamdar-daily-integration-receipt@2.0.0"]
    receipt_id: StableId
    source_context_id: Annotated[
        StableId, Field(description="context_id from the exact Daily context artifact.")
    ]
    daily_result_id: Annotated[
        StableId,
        Field(description="Stable artifact ID for the exact validated Daily Review result."),
    ]
    daily_result_sha256: Annotated[
        Sha256,
        Field(
            description="SHA-256 of the exact Daily Review result JSON bytes applied by this run; the runner must verify it before dispatch."
        ),
    ]
    recorded_at: OffsetDatetime
    effects: Annotated[list[IntegrationEffect], Field(min_length=1)]
    work_processing: Annotated[list[WorkProcessingDecision], Field(min_length=1)]
    run_notes: StrictStr

    @model_validator(mode="after")
    def validate_processing_safety(self) -> "DailyIntegrationReceipt":
        errors = _processing_safety_errors(self)
        if errors:
            raise ValueError("; ".join(errors))
        return self


def assert_daily_processing_safety(
    receipt: DailyIntegrationReceipt,
) -> DailyIntegrationReceipt:
    """Raise when a constructed receipt violates Daily processing safety."""

    errors = _processing_safety_errors(receipt)
    if errors:
        raise ValueError(f"Unsafe Daily processing receipt: {'; '.join(errors)}")
    return receipt


DailyIntegrationReceiptJsonSchema = DailyIntegrationReceipt.model_json_schema()

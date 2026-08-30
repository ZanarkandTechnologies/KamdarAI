"""Pydantic contracts shared by automation extraction results."""

from __future__ import annotations

import re
from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, TypeAdapter


FEATURE_OUTCOME_LABELS = {
    "produced": "Produced useful output",
    "no_change_needed": "No change needed",
    "insufficient_information": "I don't know — not enough information",
}

FEATURE_OUTCOME_PROMPT = """
Return one evidence-backed outcome for every selected feature.

- produced: the evidence supports at least one useful output row.
- no_change_needed: the required sources were checked and prove that no output
  is needed. This is not the same as missing information.
- insufficient_information: a complete answer or safe final output cannot be
  produced from the available evidence. Name every blocking gap precisely;
  output_refs may retain safe partial or explicitly blocked preview outputs.

The reasoning_summary is a concise decision basis tied to cited observations;
do not provide hidden chain-of-thought. Never use insufficient_information as a
substitute for checking the supplied sources.
"""


TrimmedNonEmptyString = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]
StableId = TrimmedNonEmptyString
OutputRef = Annotated[str, StringConstraints(pattern=r"^/[a-z_]+/\d+$")]
FeatureId = Annotated[str, StringConstraints(pattern=r"^FEAT-\d{4}$")]
ReasoningSummary = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1000),
]
EmptyList = Annotated[list[object], Field(max_length=0)]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FeatureEvidence(_StrictModel):
    source_id: StableId = Field(
        description="Exact source ID from the collected context."
    )
    observation: TrimmedNonEmptyString = Field(
        description="Relevant observed fact from that source."
    )


class InformationGap(_StrictModel):
    code: Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    needed_field: TrimmedNonEmptyString
    source_ids_checked: Annotated[list[StableId], Field(min_length=1)]
    why_needed: TrimmedNonEmptyString
    where_to_add: TrimmedNonEmptyString
    question: TrimmedNonEmptyString


class _CommonFeatureOutcome(_StrictModel):
    feature_id: FeatureId
    evidence: Annotated[list[FeatureEvidence], Field(min_length=1)]
    reasoning_summary: ReasoningSummary


class ProducedFeatureOutcome(_CommonFeatureOutcome):
    outcome: Literal["produced"]
    output_refs: Annotated[list[OutputRef], Field(min_length=1)]
    information_gaps: EmptyList


class NoChangeFeatureOutcome(_CommonFeatureOutcome):
    outcome: Literal["no_change_needed"]
    output_refs: EmptyList
    information_gaps: EmptyList


class InsufficientInformationFeatureOutcome(_CommonFeatureOutcome):
    outcome: Literal["insufficient_information"]
    output_refs: list[OutputRef] = Field(
        description=(
            "Any safe partial or blocked-preview outputs produced before the gap "
            "was found."
        )
    )
    information_gaps: Annotated[list[InformationGap], Field(min_length=1)]


FeatureOutcome: TypeAlias = Annotated[
    ProducedFeatureOutcome
    | NoChangeFeatureOutcome
    | InsufficientInformationFeatureOutcome,
    Field(discriminator="outcome", description=FEATURE_OUTCOME_PROMPT),
]


def validate_feature_outcome_coverage(
    *,
    outcomes: list[FeatureOutcome],
    expected_feature_ids: list[str],
    output_roots: dict[str, str],
    output_counts: dict[str, int],
) -> None:
    """Apply the cross-result feature/output coverage checks."""

    expected = set(expected_feature_ids)
    observed: set[str] = set()
    issues: list[str] = []

    for index, outcome in enumerate(outcomes):
        feature_id = outcome.feature_id
        if feature_id not in expected:
            issues.append(
                f"feature_outcomes.{index}.feature_id: unexpected feature {feature_id}."
            )
            continue

        if feature_id in observed:
            issues.append(
                f"feature_outcomes.{index}.feature_id: duplicate outcome for {feature_id}."
            )
        observed.add(feature_id)

        root = output_roots[feature_id]
        count = output_counts.get(feature_id, 0)
        if outcome.outcome in {"produced", "insufficient_information"}:
            expected_refs = [f"/{root}/{output_index}" for output_index in range(count)]
            for ref in outcome.output_refs:
                match = re.fullmatch(r"/([^/]+)/(\d+)", ref)
                valid = (
                    match is not None
                    and match.group(1) == root
                    and int(match.group(2)) < count
                )
                if not valid:
                    issues.append(
                        f"feature_outcomes.{index}.output_refs: "
                        f"{ref} does not resolve to a {root} output."
                    )

            if (
                len(set(outcome.output_refs)) != len(expected_refs)
                or any(ref not in outcome.output_refs for ref in expected_refs)
            ):
                issues.append(
                    f"feature_outcomes.{index}.output_refs: {feature_id} must "
                    f"reference every {root} output exactly once."
                )
        elif count > 0:
            issues.append(
                f"feature_outcomes.{index}.outcome: {feature_id} has {count} "
                f"output rows and cannot be {outcome.outcome}."
            )

    for feature_id in expected_feature_ids:
        if feature_id not in observed:
            issues.append(f"feature_outcomes: missing outcome for {feature_id}.")

    if issues:
        raise ValueError(" ".join(issues))


FEATURE_OUTCOME_JSON_SCHEMA = TypeAdapter(FeatureOutcome).json_schema()

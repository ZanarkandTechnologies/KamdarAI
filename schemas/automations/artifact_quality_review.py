"""Pydantic contract for independent end-user artifact quality review."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StrictBool,
    StringConstraints,
    model_validator,
)


NonEmptyString = Annotated[str, StringConstraints(min_length=1)]
ArtifactPointer = Annotated[str, StringConstraints(pattern=r"^/[a-z_]+/\d+$")]
Sha256 = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]


def _require_boolean(value: object) -> object:
    if not isinstance(value, bool):
        raise ValueError("Input should be a valid boolean")
    return value


StrictTrue = Annotated[Literal[True], BeforeValidator(_require_boolean)]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Check(_StrictModel):
    pass_: StrictBool = Field(alias="pass", serialization_alias="pass")
    evidence_refs: Annotated[list[NonEmptyString], Field(min_length=1)]
    findings: list[NonEmptyString]


class ArtifactChecks(_StrictModel):
    referential_clarity: Check
    end_user_value: Check
    readability: Check
    template_fidelity: Check
    groundedness: Check
    workflow_reconstructability: Check
    baseline_integrity: Check


class ArtifactRow(_StrictModel):
    artifact_pointer: ArtifactPointer
    checks: ArtifactChecks


class ArtifactQualityReview(_StrictModel):
    schema_version: Literal["kamdar-artifact-quality-review@1.0.0"]
    lane: Literal["artifact-quality-review"]
    independent: StrictTrue
    scope: Literal["daily", "weekly"]
    context_id: NonEmptyString
    result_sha256: Sha256
    rubric_path: Literal["evals/rubrics/end-user-artifact-quality.md"]
    tier: Literal["A", "B", "C", "D"]
    verdict: Literal["pass", "revise", "block", "invalid"]
    artifacts: Annotated[list[ArtifactRow], Field(min_length=1)]
    hard_gate_failures: list[NonEmptyString]
    repair_route: Literal["none", "regenerate", "unslop-then-regenerate", "fix-template", "add-context"]
    review_path: NonEmptyString

    @model_validator(mode="after")
    def validate_passing_review(self) -> "ArtifactQualityReview":
        checks_pass = all(
            check.pass_ and not check.findings
            for row in self.artifacts
            for check in (
                row.checks.referential_clarity,
                row.checks.end_user_value,
                row.checks.readability,
                row.checks.template_fidelity,
                row.checks.groundedness,
                row.checks.workflow_reconstructability,
                row.checks.baseline_integrity,
            )
        )
        passing = (
            self.tier == "A"
            and self.verdict == "pass"
            and not self.hard_gate_failures
            and self.repair_route == "none"
            and checks_pass
        )
        if self.verdict == "pass" and not passing:
            raise ValueError(
                "A passing review requires tier A, all checks passing, no findings, "
                "no hard failures, and no repair route."
            )
        return self


__all__ = ["ArtifactChecks", "ArtifactQualityReview", "ArtifactRow", "Check"]

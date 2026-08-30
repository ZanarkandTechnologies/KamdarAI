"""Pydantic contracts for immutable eval suites and judged evidence."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Tier = Literal["A", "B", "C", "D"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class JudgeRubric(StrictModel):
    groundedness: Tier
    completeness: Tier
    usefulness: Tier
    repeatability: Tier
    length_balance: Tier


class DailyAssertion(StrictModel):
    assertion: str = Field(min_length=1)
    met: bool
    evidence_refs: list[str] = Field(min_length=1)


class WeeklyAssertion(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)
    assertion: str = Field(min_length=1)
    met: bool
    evidence: list[Any] = Field(min_length=1)


class DailyFeatureJudge(StrictModel):
    feature_id: str = Field(pattern=r"^FEAT-\d{4}$")
    tier: Tier
    verdict: Literal["pass", "fail", "blocked"]
    rubric: JudgeRubric
    assertions: list[DailyAssertion]
    evidence_refs: list[str] = Field(min_length=1)
    failures: list[str]
    verdict_path: str = Field(min_length=1)
    packet_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def validate_evidence(self) -> "DailyFeatureJudge":
        known = set(self.evidence_refs)
        for row in self.assertions:
            if not set(row.evidence_refs).issubset(known):
                raise ValueError("assertion evidence_refs must be declared at the verdict level")
        return self


class WeeklyFeatureJudge(StrictModel):
    lane: Literal["tester"]
    target: str = Field(pattern=r"^FEAT-\d{4}$")
    claim_under_test: str = Field(min_length=1)
    tier: Tier
    test_cases: list[Any] = Field(min_length=1)
    rubric: JudgeRubric
    assertions: list[WeeklyAssertion]
    evidence: list[Any] = Field(min_length=1)
    failures: list[Any]
    artifacts: list[Any] = Field(min_length=1)
    blockers: list[Any]
    verdict_path: str = Field(min_length=1)
    packet_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class DailyEvidenceReview(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)
    independent: Literal[True]
    verdict: Literal["pass", "fail", "blocked"]
    reviewed_feature_ids: list[str] = Field(min_length=1)


class WeeklyEvidenceReview(StrictModel):
    lane: Literal["evidence-review"]
    independent: Literal[True]
    verdict: Literal["pass", "fail", "blocked"]
    claim_under_test: str = Field(min_length=1)
    reviewed_tiers: dict[str, Tier]
    unsupported_claims: list[Any]
    scope_mismatch: list[Any]
    missing_evidence: list[Any]
    weak_artifacts: list[Any]
    rerun_instructions: list[Any]
    fix_candidates: list[Any]


class IntegrationGate(StrictModel):
    gate_id: str = Field(min_length=1)
    passed: bool = Field(alias="pass")
    evidence_refs: list[str]
    failures: list[str]

    @model_validator(mode="after")
    def validate_pass(self) -> "IntegrationGate":
        if self.passed and (not self.evidence_refs or self.failures):
            raise ValueError("a passing integration gate needs evidence and no failures")
        return self


class DailyIntegrationChecks(StrictModel):
    passed: bool = Field(alias="pass")
    gates: list[IntegrationGate]
    failures: list[str]

    @model_validator(mode="after")
    def validate_pass(self) -> "DailyIntegrationChecks":
        computed = all(gate.passed for gate in self.gates) and not self.failures
        if self.passed != computed:
            raise ValueError("integration pass must equal its gate results")
        return self


class WeeklyIntegrationChecks(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)
    passed: bool = Field(alias="pass")
    receipt_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    read_back_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class EvalResultEnvelope(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)
    passed: bool = Field(alias="pass")


def validate_feature_judge(
    *, scope: str, value: dict[str, Any], feature: dict[str, Any], verdict_path: Path
) -> BaseModel:
    if scope == "daily":
        parsed = DailyFeatureJudge.model_validate(value, strict=True)
        if parsed.feature_id != feature["feature_id"]:
            raise ValueError("feature judge targets the wrong feature")
        if {row.assertion for row in parsed.assertions} != set(feature["assertions"]):
            raise ValueError("feature judge must return every authored assertion exactly once")
    else:
        parsed = WeeklyFeatureJudge.model_validate(value, strict=True)
        if parsed.target != feature["feature_id"] or parsed.claim_under_test != feature["claim"]:
            raise ValueError("feature judge target or claim differs from the suite")
        if {row.assertion for row in parsed.assertions} != set(feature["assertions"]):
            raise ValueError("feature judge must return every authored assertion exactly once")
    if Path(parsed.verdict_path) != verdict_path:
        raise ValueError("feature judge verdict_path must equal the absolute manifest path")
    return parsed

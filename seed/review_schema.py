"""Pydantic contract for the independent seed-realism approval."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ReviewCheck(StrictModel):
    passed: bool = Field(alias="pass")
    evidence_refs: list[str] = Field(min_length=1)
    findings: list[str]


class ReviewChecks(StrictModel):
    company_fit: ReviewCheck
    relationship_coherence: ReviewCheck
    lifecycle_consistency: ReviewCheck
    operational_plausibility: ReviewCheck
    surrounding_context: ReviewCheck


class ReviewRow(StrictModel):
    target_id: str = Field(min_length=1)
    origin: Literal["captured", "publicly_grounded", "synthetic_scenario"]
    reference_refs: list[str] = Field(min_length=1)
    passed: bool = Field(alias="pass")
    findings: list[str]


class PublicGrounding(StrictModel):
    title: str = Field(min_length=1)
    url: HttpUrl
    supports: str = Field(min_length=1)


class SeedRealismReview(StrictModel):
    schema_version: Literal["kamdar-seed-realism-review@1.0.0"]
    lane: Literal["seed-realism-review"]
    independent: Literal[True]
    seed_id: str = Field(min_length=1)
    seed_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    rubric_path: Literal["seed/reviews/rubric.md"]
    public_grounding: list[PublicGrounding] = Field(min_length=1)
    tier: Literal["A", "B", "C", "D"]
    verdict: Literal["pass", "revise", "block", "invalid"]
    entity_reviews: list[ReviewRow] = Field(min_length=1)
    case_reviews: list[ReviewRow] = Field(min_length=1)
    checks: ReviewChecks
    hard_gate_failures: list[str]
    review_path: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_pass(self) -> "SeedRealismReview":
        rows = [*self.entity_reviews, *self.case_reviews]
        checks = list(self.checks)
        passing = (
            self.tier == "A"
            and not self.hard_gate_failures
            and all(row.passed and not row.findings for row in rows)
            and all(getattr(self.checks, item[0]).passed and not getattr(self.checks, item[0]).findings for item in checks)
        )
        if self.verdict == "pass" and not passing:
            raise ValueError("a passing review requires tier A, all checks passing, and no hard failures")
        return self

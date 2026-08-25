import { z } from "zod";

const CheckSchema = z.strictObject({
  pass: z.boolean(),
  evidence_refs: z.array(z.string().min(1)).min(1),
  findings: z.array(z.string().min(1)),
});

const checks = z.strictObject({
  company_fit: CheckSchema,
  relationship_coherence: CheckSchema,
  lifecycle_consistency: CheckSchema,
  operational_plausibility: CheckSchema,
  surrounding_context: CheckSchema,
});

const ReviewRowSchema = z.strictObject({
  target_id: z.string().min(1),
  origin: z.enum(["captured", "publicly_grounded", "synthetic_scenario"]),
  reference_refs: z.array(z.string().min(1)).min(1),
  pass: z.boolean(),
  findings: z.array(z.string().min(1)),
});

export const SeedRealismReviewSchema = z.strictObject({
  schema_version: z.literal("kamdar-seed-realism-review@1.0.0"),
  lane: z.literal("seed-realism-review"),
  independent: z.literal(true),
  seed_id: z.string().min(1),
  seed_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rubric_path: z.literal("evals/rubrics/seed-realism.md"),
  public_grounding: z.array(z.strictObject({
    title: z.string().min(1),
    url: z.string().url(),
    supports: z.string().min(1),
  })).min(1),
  tier: z.enum(["A", "B", "C", "D"]),
  verdict: z.enum(["pass", "revise", "block", "invalid"]),
  entity_reviews: z.array(ReviewRowSchema).min(1),
  case_reviews: z.array(ReviewRowSchema).min(1),
  checks,
  hard_gate_failures: z.array(z.string().min(1)),
  review_path: z.string().min(1),
}).superRefine((review, ctx) => {
  const rowsPass = [...review.entity_reviews, ...review.case_reviews].every((row) => row.pass && row.findings.length === 0);
  const checksPass = Object.values(review.checks).every((check) => check.pass && check.findings.length === 0);
  const passing = review.tier === "A" && review.verdict === "pass" && review.hard_gate_failures.length === 0 && rowsPass && checksPass;
  if (review.verdict === "pass" && !passing) ctx.addIssue({ code: "custom", path: ["verdict"], message: "A passing review requires tier A, all checks passing, and no hard failures." });
});

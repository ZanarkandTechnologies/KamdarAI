import { z } from "zod";

const CheckSchema = z.strictObject({
  pass: z.boolean(),
  evidence_refs: z.array(z.string().min(1)).min(1),
  findings: z.array(z.string().min(1)),
});

const ArtifactRowSchema = z.strictObject({
  artifact_pointer: z.string().regex(/^\/[a-z_]+\/\d+$/),
  checks: z.strictObject({
    referential_clarity: CheckSchema,
    end_user_value: CheckSchema,
    readability: CheckSchema,
    template_fidelity: CheckSchema,
    groundedness: CheckSchema,
    workflow_reconstructability: CheckSchema,
    baseline_integrity: CheckSchema,
  }),
});

export const ArtifactQualityReviewSchema = z.strictObject({
  schema_version: z.literal("kamdar-artifact-quality-review@1.0.0"),
  lane: z.literal("artifact-quality-review"),
  independent: z.literal(true),
  scope: z.enum(["daily", "weekly"]),
  context_id: z.string().min(1),
  result_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rubric_path: z.literal("evals/rubrics/end-user-artifact-quality.md"),
  tier: z.enum(["A", "B", "C", "D"]),
  verdict: z.enum(["pass", "revise", "block", "invalid"]),
  artifacts: z.array(ArtifactRowSchema).min(1),
  hard_gate_failures: z.array(z.string().min(1)),
  repair_route: z.enum(["none", "regenerate", "unslop-then-regenerate", "fix-template", "add-context"]),
  review_path: z.string().min(1),
}).superRefine((review, ctx) => {
  const checksPass = review.artifacts.every((row) => Object.values(row.checks).every((check) => check.pass && check.findings.length === 0));
  const passing = review.tier === "A" && review.verdict === "pass" && review.hard_gate_failures.length === 0 && review.repair_route === "none" && checksPass;
  if (review.verdict === "pass" && !passing) ctx.addIssue({ code: "custom", path: ["verdict"], message: "A passing review requires tier A, all checks passing, no findings, no hard failures, and no repair route." });
});

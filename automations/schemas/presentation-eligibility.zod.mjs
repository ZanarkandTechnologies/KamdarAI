import { createHash } from "node:crypto";

import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const RelativeRunRootSchema = z.string().min(1).refine((value) => !value.startsWith("/") && !value.split("/").includes(".."), "must be a safe relative path");

const LaneSchema = z.strictObject({
  pass: z.literal(true),
  artifact_quality_pass: z.literal(true),
  run_root: RelativeRunRootSchema,
  suite_sha256: Sha256Schema,
  suite_result_sha256: Sha256Schema,
  artifact_quality_review_sha256: Sha256Schema,
  feature_judge_sha256: z.record(z.string().regex(/^FEAT-\d{4}$/), Sha256Schema),
});

export const PresentationEligibilitySchema = z.strictObject({
  schema_version: z.literal("kamdar-presentation-eligibility@2.0.0"),
  deployment_id: z.string().min(1),
  generated_at: z.string().datetime({ offset: true }),
  eligible: z.literal(true),
  candidate_origin: z.literal("agent_execution"),
  candidate_provenance_sha256: Sha256Schema,
  daily: LaneSchema,
  weekly: LaneSchema,
});

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPresentationEligibilityManifest({ deploymentId, generatedAt, candidateProvenanceSha256, daily, weekly }) {
  return PresentationEligibilitySchema.parse({
    schema_version: "kamdar-presentation-eligibility@2.0.0",
    deployment_id: deploymentId,
    generated_at: generatedAt,
    eligible: true,
    candidate_origin: "agent_execution",
    candidate_provenance_sha256: candidateProvenanceSha256,
    daily,
    weekly,
  });
}

export function validatePresentationEligibilityManifest(value) {
  const parsed = PresentationEligibilitySchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Presentation eligibility manifest is invalid: ${issues}`);
  }
  if (parsed.data.daily.run_root === parsed.data.weekly.run_root) {
    throw new Error("Presentation eligibility manifest must bind distinct Daily and Weekly run roots.");
  }
  return parsed.data;
}

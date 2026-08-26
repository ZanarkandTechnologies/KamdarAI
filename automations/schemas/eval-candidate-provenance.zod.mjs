import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const EvalCandidateProvenanceSchema = z.strictObject({
  schema_version: z.literal("kamdar-eval-candidate-provenance@1.0.0"),
  origin: z.enum(["agent_execution", "reference_fixture"]),
  producer: z.string().min(1),
  generated_at: z.string().datetime({ offset: true }),
  daily_result_sha256: Sha256Schema,
  weekly_result_sha256: Sha256Schema,
});

export function validateEvalCandidateProvenance(value) {
  const parsed = EvalCandidateProvenanceSchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Eval candidate provenance is invalid: ${issues}`);
  }
  return parsed.data;
}

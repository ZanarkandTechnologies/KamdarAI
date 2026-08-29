import * as z from "zod";

const StableIdSchema = z.string().trim().min(1);
const OutputRefSchema = z.string().regex(/^\/[a-z_]+\/\d+$/);

export const FEATURE_OUTCOME_LABELS = Object.freeze({
  produced: "Produced useful output",
  no_change_needed: "No change needed",
  insufficient_information: "I don't know — not enough information",
});

export const FEATURE_OUTCOME_PROMPT = String.raw`
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
`;

export const FeatureEvidenceSchema = z.strictObject({
  source_id: StableIdSchema.describe("Exact source ID from the collected context."),
  observation: z.string().trim().min(1).describe("Relevant observed fact from that source."),
});

export const InformationGapSchema = z.strictObject({
  code: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  needed_field: z.string().trim().min(1),
  source_ids_checked: z.array(StableIdSchema).min(1),
  why_needed: z.string().trim().min(1),
  where_to_add: z.string().trim().min(1),
  question: z.string().trim().min(1),
});

const CommonOutcomeShape = {
  feature_id: z.string().regex(/^FEAT-\d{4}$/),
  evidence: z.array(FeatureEvidenceSchema).min(1),
  reasoning_summary: z.string().trim().min(1).max(1000),
};

export const ProducedFeatureOutcomeSchema = z.strictObject({
  ...CommonOutcomeShape,
  outcome: z.literal("produced"),
  output_refs: z.array(OutputRefSchema).min(1),
  information_gaps: z.tuple([]),
});

export const NoChangeFeatureOutcomeSchema = z.strictObject({
  ...CommonOutcomeShape,
  outcome: z.literal("no_change_needed"),
  output_refs: z.tuple([]),
  information_gaps: z.tuple([]),
});

export const InsufficientInformationFeatureOutcomeSchema = z.strictObject({
  ...CommonOutcomeShape,
  outcome: z.literal("insufficient_information"),
  output_refs: z.array(OutputRefSchema).describe("Any safe partial or blocked-preview outputs produced before the gap was found."),
  information_gaps: z.array(InformationGapSchema).min(1),
});

export const FeatureOutcomeSchema = z
  .discriminatedUnion("outcome", [
    ProducedFeatureOutcomeSchema,
    NoChangeFeatureOutcomeSchema,
    InsufficientInformationFeatureOutcomeSchema,
  ])
  .describe(FEATURE_OUTCOME_PROMPT);

export function validateFeatureOutcomeCoverage(
  { outcomes, expectedFeatureIds, outputRoots, outputCounts },
  context,
) {
  const expected = new Set(expectedFeatureIds);
  const observed = new Set();
  for (const [index, outcome] of outcomes.entries()) {
    if (!expected.has(outcome.feature_id)) {
      context.addIssue({ code: "custom", path: ["feature_outcomes", index, "feature_id"], message: `unexpected feature ${outcome.feature_id}.` });
      continue;
    }
    if (observed.has(outcome.feature_id)) {
      context.addIssue({ code: "custom", path: ["feature_outcomes", index, "feature_id"], message: `duplicate outcome for ${outcome.feature_id}.` });
    }
    observed.add(outcome.feature_id);
    const root = outputRoots[outcome.feature_id];
    const count = outputCounts[outcome.feature_id] ?? 0;
    if (outcome.outcome === "produced" || outcome.outcome === "insufficient_information") {
      const expectedRefs = Array.from({ length: count }, (_, outputIndex) => `/${root}/${outputIndex}`);
      for (const ref of outcome.output_refs) {
        const match = ref.match(/^\/([^/]+)\/(\d+)$/);
        const valid = match && match[1] === root && Number(match[2]) < count;
        if (!valid) {
          context.addIssue({ code: "custom", path: ["feature_outcomes", index, "output_refs"], message: `${ref} does not resolve to a ${root} output.` });
        }
      }
      if (new Set(outcome.output_refs).size !== expectedRefs.length || expectedRefs.some((ref) => !outcome.output_refs.includes(ref))) {
        context.addIssue({ code: "custom", path: ["feature_outcomes", index, "output_refs"], message: `${outcome.feature_id} must reference every ${root} output exactly once.` });
      }
    } else if (count > 0) {
      context.addIssue({ code: "custom", path: ["feature_outcomes", index, "outcome"], message: `${outcome.feature_id} has ${count} output rows and cannot be ${outcome.outcome}.` });
    }
  }
  for (const featureId of expectedFeatureIds) {
    if (!observed.has(featureId)) {
      context.addIssue({ code: "custom", path: ["feature_outcomes"], message: `missing outcome for ${featureId}.` });
    }
  }
}

export const FeatureOutcomeJsonSchema = z.toJSONSchema(FeatureOutcomeSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

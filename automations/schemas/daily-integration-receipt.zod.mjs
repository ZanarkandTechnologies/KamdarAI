import * as z from "zod";

// Deterministic downstream contract for one Daily Review result. Extraction
// stops at daily-review-result.zod.mjs; integration skills emit this receipt
// only after attempting the exact routed effects represented by that result.

const StableIdSchema = z
  .string()
  .min(1)
  .describe("Use the exact stable ID supplied by the seed, Daily context, extraction result, or provider response.");

const Sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .describe("Lowercase SHA-256 of the exact payload passed to the integration.");

const SyntheticUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const hostname = new URL(value).hostname;
    return hostname === "example.test" || hostname.endsWith(".example.test");
  }, "Tracked receipts may contain only source-safe synthetic example.test URLs.");

const FeatureIdSchema = z.enum(["FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004"]);

export const IntegrationEffectStateSchema = z.enum([
  "applied",
  "duplicate",
  "delivered_to_eval_sink",
  "no_finding",
  "blocked",
  "conflicted",
  "failed",
]);

const IntegrationTargetSchema = z
  .object({
    target_id: StableIdSchema.describe("Exact seeded target record or Person ID."),
    target_url: SyntheticUrlSchema.describe("Source-safe URL for the exact integration target."),
  })
  .strict();

const ProviderResponseSchema = z
  .object({
    response_id: StableIdSchema.describe("Provider-returned record, comment, message, or mutation ID."),
    response_url: SyntheticUrlSchema.describe("Source-safe URL for the provider-returned object."),
    recorded_at: z.string().datetime({ offset: true }),
  })
  .strict();

const ReadBackEvidenceSchema = z
  .object({
    target_id: StableIdSchema,
    target_url: SyntheticUrlSchema,
    provider_response_id: StableIdSchema,
    checked_at: z.string().datetime({ offset: true }),
    payload_hash: Sha256Schema,
    matched: z.literal(true),
  })
  .strict()
  .describe("A provider read after the write or duplicate lookup that confirms the exact routed payload.");

const AppliedOrDuplicateOutcomeSchema = z
  .object({
    state: z.enum(["applied", "duplicate"]),
    reason: z.null(),
    provider_response: ProviderResponseSchema,
    read_back: ReadBackEvidenceSchema,
  })
  .strict();

const EvalSinkDeliveryOutcomeSchema = z
  .object({
    state: z.literal("delivered_to_eval_sink"),
    reason: z.null(),
    delivery_scope: z.literal("operator_owned_eval_sink"),
    intended_recipient_person_id: StableIdSchema,
    configured_destination_hash: Sha256Schema.describe("Hash of the approved workspace route resolved before sending."),
    provider_destination_hash: Sha256Schema.describe("Hash of the destination/chat returned by the provider."),
    destination_matched: z.literal(true).describe("Confirms the provider destination equals the configured route; a message ID alone is insufficient."),
    provider_response: ProviderResponseSchema,
    read_back: ReadBackEvidenceSchema,
  })
  .strict()
  .describe("A provider-accepted send whose returned destination matches the configured operator-owned eval sink. This does not prove employee delivery or that a human saw the message.");

const NoFindingOutcomeSchema = z
  .object({
    state: z.literal("no_finding"),
    reason: z.string().min(1).describe("Why the source truthfully required no provider mutation."),
    provider_response: z.null(),
    read_back: z.null(),
  })
  .strict();

const UnsafeOutcomeSchema = z
  .object({
    state: z.enum(["blocked", "conflicted", "failed"]),
    reason: z.string().min(1).describe("Concrete reason the effect could not be safely completed."),
    provider_response: z.null(),
    read_back: z.null(),
  })
  .strict();

const IntegrationEffectSchema = z
  .object({
    effect_id: StableIdSchema,
    required: z.boolean().describe("True when this effect must settle before linked Work can be marked processed."),
    feature_id: FeatureIdSchema,
    result_pointer: z
      .string()
      .regex(/^\/(project_updates|completed_ticket_comments|weekly_progress_chases|knowledge_updates)(?:\/\d+(?:\/.*)?)?$/)
      .describe("JSON Pointer into the exact Daily Review result row, or its whole output array for a verified no-finding."),
    source_record_ids: z
      .array(StableIdSchema)
      .min(1)
      .describe("Exact seeded records that support the extracted result row."),
    work_item_ids: z
      .array(StableIdSchema)
      .min(1)
      .describe("Seeded Work records whose processed state depends on this effect."),
    integration: z.enum(["notion", "email", "telegram", "whatsapp", "none"]),
    operation: z.enum([
      "replace_project_sections",
      "add_work_comment",
      "send_owner_chase",
      "replace_weekly_report_draft",
      "record_no_finding",
    ]),
    target: IntegrationTargetSchema,
    payload_hash: Sha256Schema,
    outcome: z.discriminatedUnion("state", [
      AppliedOrDuplicateOutcomeSchema,
      EvalSinkDeliveryOutcomeSchema,
      NoFindingOutcomeSchema,
      UnsafeOutcomeSchema,
    ]),
  })
  .strict()
  .superRefine((effect, context) => {
    const outcome = effect.outcome;
    if (outcome.state === "no_finding") {
      if (/\/\d+(?:\/|$)/.test(effect.result_pointer)) {
        context.addIssue({ code: "custom", message: "no_finding must point to the checked output array, not claim a returned row." });
      }
      if (effect.integration !== "none" || effect.operation !== "record_no_finding") {
        context.addIssue({ code: "custom", message: "no_finding must use the none integration and record_no_finding operation." });
      }
      return;
    }
    if (!/\/\d+(?:\/|$)/.test(effect.result_pointer)) {
      context.addIssue({ code: "custom", message: "Provider effects must point to an exact returned result row." });
    }
    if (effect.integration === "none" || effect.operation === "record_no_finding") {
      context.addIssue({ code: "custom", message: "Provider effects must name a real integration operation." });
    }
    if (!["applied", "duplicate", "delivered_to_eval_sink"].includes(outcome.state)) return;
    if (outcome.state === "delivered_to_eval_sink") {
      if (effect.feature_id !== "FEAT-0003" || effect.integration !== "telegram" || effect.operation !== "send_owner_chase") {
        context.addIssue({ code: "custom", message: "eval-sink delivery is valid only for a Telegram FEAT-0003 owner chase." });
      }
      if (outcome.intended_recipient_person_id !== effect.target.target_id) {
        context.addIssue({ code: "custom", message: "eval-sink delivery must name the exact intended Person target." });
      }
    }
    const readBack = outcome.read_back;
    if (readBack.target_id !== effect.target.target_id || readBack.target_url !== effect.target.target_url) {
      context.addIssue({ code: "custom", message: "Read-back target must match the requested target." });
    }
    if (readBack.payload_hash !== effect.payload_hash) {
      context.addIssue({ code: "custom", message: "Read-back payload hash must match the requested payload hash." });
    }
    if (readBack.provider_response_id !== outcome.provider_response.response_id) {
      context.addIssue({ code: "custom", message: "Read-back provider response ID must match the provider receipt." });
    }
  });

const WorkProcessingDecisionSchema = z
  .object({
    work_item_id: StableIdSchema,
    required_effect_ids: z.array(StableIdSchema).min(1),
    state: z.enum(["processed", "unprocessed"]),
    processed_at: z.string().datetime({ offset: true }).nullable(),
    status_after: z.literal("Processed").nullable(),
    daily_review_version_after: z.literal("daily-review-v1").nullable(),
    reason: z.string().min(1),
  })
  .strict();

const settledStates = new Set(["applied", "duplicate", "delivered_to_eval_sink", "no_finding"]);

function processingSafetyErrors(receipt) {
  const errors = [];
  const effects = new Map();
  for (const effect of receipt.effects ?? []) {
    if (effects.has(effect.effect_id)) errors.push(`duplicate effect_id ${effect.effect_id}`);
    effects.set(effect.effect_id, effect);
  }
  const decisions = new Map();
  for (const decision of receipt.work_processing ?? []) {
    if (decisions.has(decision.work_item_id)) errors.push(`duplicate processing decision for ${decision.work_item_id}`);
    decisions.set(decision.work_item_id, decision);
    const expectedIds = (receipt.effects ?? [])
      .filter((effect) => effect.required && effect.work_item_ids.includes(decision.work_item_id))
      .map((effect) => effect.effect_id)
      .sort();
    const declaredIds = [...decision.required_effect_ids].sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(declaredIds)) {
      errors.push(`${decision.work_item_id} must enumerate every and only required linked effect`);
    }
    const requiredEffects = declaredIds.map((id) => effects.get(id));
    if (requiredEffects.some((effect) => !effect)) errors.push(`${decision.work_item_id} references an unknown required effect`);
    const safelySettled = requiredEffects.length > 0
      && requiredEffects.every((effect) => effect && settledStates.has(effect.outcome.state));
    if (decision.state === "processed" && !safelySettled) {
      errors.push(`${decision.work_item_id} cannot be processed while a required effect is blocked, conflicted, failed, or missing`);
    }
    if (decision.state === "unprocessed" && safelySettled) {
      errors.push(`${decision.work_item_id} must be processed after all required effects safely settle`);
    }
    if ((decision.state === "processed") !== Boolean(decision.processed_at)) {
      errors.push(`${decision.work_item_id} processed_at must be present only for processed Work`);
    }
    const hasProcessedFields = decision.status_after === "Processed"
      && decision.daily_review_version_after === "daily-review-v1";
    if ((decision.state === "processed") !== hasProcessedFields) {
      errors.push(`${decision.work_item_id} must set both Status=Processed and Daily review version=daily-review-v1 only after processing`);
    }
  }
  const requiredWorkIds = new Set(
    (receipt.effects ?? []).filter((effect) => effect.required).flatMap((effect) => effect.work_item_ids),
  );
  for (const workItemId of requiredWorkIds) {
    if (!decisions.has(workItemId)) errors.push(`${workItemId} is missing a processing decision`);
  }
  return errors;
}

export function assertDailyProcessingSafety(receipt) {
  const errors = processingSafetyErrors(receipt);
  if (errors.length) throw new Error(`Unsafe Daily processing receipt: ${errors.join("; ")}`);
  return receipt;
}

export const DailyIntegrationReceiptSchema = z
  .object({
    schema_version: z.literal("kamdar-daily-integration-receipt@1.0.0"),
    receipt_id: StableIdSchema,
    source_context_id: StableIdSchema.describe("context_id from the exact Daily context artifact."),
    daily_result_id: StableIdSchema.describe("Stable artifact ID for the exact validated Daily Review result."),
    daily_result_sha256: Sha256Schema.describe("SHA-256 of the exact Daily Review result JSON bytes applied by this run; the runner must verify it before dispatch."),
    recorded_at: z.string().datetime({ offset: true }),
    effects: z.array(IntegrationEffectSchema).min(1),
    work_processing: z.array(WorkProcessingDecisionSchema).min(1),
    run_notes: z.string(),
  })
  .strict()
  .superRefine((receipt, context) => {
    for (const message of processingSafetyErrors(receipt)) {
      context.addIssue({ code: "custom", message });
    }
  })
  .describe(
    "Receipt for deterministic application of one Daily Review result. Applied, duplicate, and eval-sink delivery effects require provider read-back. Work becomes processed only after every required linked effect is applied, duplicate, delivered to the approved eval sink, or a truthful no_finding.",
  );

export const DailyIntegrationReceiptJsonSchema = z.toJSONSchema(DailyIntegrationReceiptSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

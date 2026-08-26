import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const StableIdSchema = NonEmptyString;
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

const LookupReadBackSchema = z.strictObject({
  provider_response_id: StableIdSchema,
  target_id: StableIdSchema,
  payload_hash: Sha256Schema,
  matched: z.literal(true),
  created: z.literal(false),
});

const AuditEffectSchema = z.strictObject({
  original_effect_id: StableIdSchema,
  result_pointer: z.string().regex(/^\/(project_updates|completed_ticket_comments|weekly_progress_chases|knowledge_updates)(?:\/\d+)?$/),
  action_key: StableIdSchema,
  target_id: StableIdSchema,
  payload_hash: Sha256Schema,
  original_outcome: z.enum(["applied", "duplicate", "delivered_to_eval_sink", "no_finding", "blocked", "conflicted", "failed"]),
  outcome: z.enum(["duplicate", "no_finding", "blocked", "conflicted", "failed"]),
  new_provider_mutations: z.literal(0),
  lookup_read_back: LookupReadBackSchema.nullable(),
  reason: NonEmptyString,
}).superRefine((effect, context) => {
  if (effect.outcome === "duplicate" && !effect.lookup_read_back) {
    context.addIssue({ code: "custom", path: ["lookup_read_back"], message: "Duplicate audit effects require lookup/read-back evidence." });
  }
  if (effect.outcome === "no_finding" && effect.lookup_read_back !== null) {
    context.addIssue({ code: "custom", path: ["lookup_read_back"], message: "No-finding audit effects must not claim provider read-back." });
  }
  if (effect.outcome !== "duplicate" && effect.lookup_read_back !== null) {
    context.addIssue({ code: "custom", path: ["lookup_read_back"], message: "Only duplicate audit effects may carry provider read-back." });
  }
  if (!/\/\d+$/.test(effect.result_pointer) && effect.outcome !== "no_finding") {
    context.addIssue({ code: "custom", path: ["result_pointer"], message: "Only no-finding audits may bind a whole result array." });
  }
  if (effect.lookup_read_back && (effect.lookup_read_back.target_id !== effect.target_id || effect.lookup_read_back.payload_hash !== effect.payload_hash)) {
    context.addIssue({ code: "custom", path: ["lookup_read_back"], message: "Lookup/read-back must match the audited target and payload." });
  }
});

const WorkProcessingAuditSchema = z.strictObject({
  work_item_id: StableIdSchema,
  original_state: z.enum(["processed", "unprocessed"]),
  rerun_state: z.enum(["processed", "unprocessed"]),
  status_after: z.literal("Processed").nullable(),
  daily_review_version_after: z.literal("daily-review-v1").nullable(),
  changed: z.literal(false),
}).superRefine((row, context) => {
  if (row.original_state !== row.rerun_state) context.addIssue({ code: "custom", message: "Rerun processing state must equal original processing state." });
  const processedFieldsPresent = row.status_after === "Processed" && row.daily_review_version_after === "daily-review-v1";
  if ((row.rerun_state === "processed") !== processedFieldsPresent) {
    context.addIssue({ code: "custom", message: "Processed properties must match rerun_state." });
  }
});

export const DailyIdempotencyRerunReceiptSchema = z.strictObject({
  schema_version: z.literal("kamdar-daily-idempotency-rerun-receipt@1.0.0"),
  rerun_receipt_id: StableIdSchema,
  original_receipt_id: StableIdSchema,
  original_receipt_sha256: Sha256Schema,
  source_context_id: StableIdSchema,
  source_context_sha256: Sha256Schema,
  daily_result_id: StableIdSchema,
  daily_result_sha256: Sha256Schema,
  recorded_at: z.string().datetime({ offset: true }),
  live_provider_calls: z.literal(false),
  audit_effects: z.array(AuditEffectSchema).min(1),
  work_processing: z.array(WorkProcessingAuditSchema).min(1),
  summary: z.strictObject({
    original_effect_count: z.number().int().nonnegative(),
    audited_effect_count: z.number().int().nonnegative(),
    duplicate_count: z.number().int().nonnegative(),
    no_finding_count: z.number().int().nonnegative(),
    blocked_count: z.number().int().nonnegative(),
    conflicted_count: z.number().int().nonnegative(),
    failed_count: z.number().int().nonnegative(),
    new_provider_mutations: z.literal(0),
    processing_changes: z.literal(0),
  }),
  run_notes: z.string(),
}).superRefine((receipt, context) => {
  const effectIds = receipt.audit_effects.map((row) => row.original_effect_id);
  if (new Set(effectIds).size !== effectIds.length) context.addIssue({ code: "custom", path: ["audit_effects"], message: "Each original effect must be audited exactly once." });
  const workIds = receipt.work_processing.map((row) => row.work_item_id);
  if (new Set(workIds).size !== workIds.length) context.addIssue({ code: "custom", path: ["work_processing"], message: "Each Work processing row must be audited exactly once." });
  const duplicates = receipt.audit_effects.filter((row) => row.outcome === "duplicate").length;
  const noFindings = receipt.audit_effects.filter((row) => row.outcome === "no_finding").length;
  const blocked = receipt.audit_effects.filter((row) => row.outcome === "blocked").length;
  const conflicted = receipt.audit_effects.filter((row) => row.outcome === "conflicted").length;
  const failed = receipt.audit_effects.filter((row) => row.outcome === "failed").length;
  if (receipt.summary.original_effect_count !== receipt.audit_effects.length
    || receipt.summary.audited_effect_count !== receipt.audit_effects.length
    || receipt.summary.duplicate_count !== duplicates
    || receipt.summary.no_finding_count !== noFindings
    || receipt.summary.blocked_count !== blocked
    || receipt.summary.conflicted_count !== conflicted
    || receipt.summary.failed_count !== failed) {
    context.addIssue({ code: "custom", path: ["summary"], message: "Summary counts must match the audit rows." });
  }
});

export const DailyIdempotencyRerunReceiptJsonSchema = z.toJSONSchema(DailyIdempotencyRerunReceiptSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

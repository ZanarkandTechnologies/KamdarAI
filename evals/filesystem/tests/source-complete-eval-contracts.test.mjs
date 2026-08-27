import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { DailyContextDiffSchema } from "../../../schemas/automations/daily-context-diff.zod.mjs";
import { WeeklyContextSchema } from "../../../schemas/automations/weekly-context.zod.mjs";
import { DailyIdempotencyRerunReceiptSchema } from "../../../schemas/automations/daily-idempotency-rerun-receipt.zod.mjs";
import { buildFeatureJudgePacket, validateDailyIdempotencyRerun, validateFeatureJudgeVerdict } from "../scripts/unified-daily-review-eval.mjs";
import { buildWeeklyFeatureJudgePacket, validateWeeklyFeatureJudgeVerdict } from "../scripts/unified-weekly-review-eval.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

function dailyContext() {
  return {
    artifact_type: "kamdar-daily-context-diff",
    artifact_version: "0.3.0",
    context_id: "daily-context-2026-08-25",
    local_day: "2026-08-25",
    evidence_window: { start: "2026-08-25T00:00:00+08:00", end: "2026-08-25T23:59:59+08:00" },
    collector: { run_id: "daily-run-1", provider_effects: { performed: false } },
    source_manifest: [{
      source_key: "notion.test",
      status: "fetched",
      source_url: "notion://test",
      collection_scope: "Bounded test records.",
      collected_at: "2026-08-25T17:00:00+08:00",
      record_count: 3,
      source_ids: ["PROJ-1", "TASK-1", "PERSON-1"],
      gap: null,
    }],
    projects: [{
      id: "PROJ-1", source_id: "PROJ-1", source_url: "notion://PROJ-1", name: "Project one", owner_person_id: "PERSON-1",
      current_sections: { overview: "Current overview.", project_knowledge: "Current knowledge.", this_weeks_attention: "- [ ] Current target [TASK-1]" },
      weekly_attention_reset: { requested: false, week: null, reason: null, source_id: "PROJ-1" },
    }],
    work_items: [{
      id: "TASK-1", source_id: "TASK-1", source_url: "notion://TASK-1", project_id: "PROJ-1", record_type: "Task", full_page_read: true,
      owner_person_id: "PERSON-1", status: "blocked", ai_review: "Pending", daily_review_version: null,
      selection_reason: "linked_open_or_changed", due_date: "2026-08-25", last_meaningful_update: "2026-08-24", blocker: "Approval is missing.",
      cause: { value: "The approver is unnamed.", confidence: "high" },
      plan_actual: { currency: null, estimated_amount: null, actual_amount: null },
      documentation: {
        known_context: "Approval is missing.",
        next_action: "Record the approved measurement, approver, affected sizes, and revised sample-check date.",
        missing_information: ["Approved collar measurement", "Approver", "Effective size range", "Revised sample-check date"],
        mapped_field_state: { approver: "missing" },
        update_location: ["Notes"],
      },
      evidence: ["TASK-1 blocker and notes."],
    }],
    meetings: [],
    people: [{
      id: "PERSON-1", source_id: "PERSON-1", name: "Owner one", preferred_contact_channel: "telegram",
      approved_contact_channels: ["telegram"], approved_contact_endpoint_ref: "person://PERSON-1#sink", contact_instructions: "Use the eval sink.",
    }],
  };
}

function weeklyContext() {
  const content = {
    summary: "Grounded summary.",
    outcomes_and_open_attention: ["Open approval remains."],
    problems_and_inefficiencies: ["Approval ownership is unclear."],
    decisions: ["Keep the report Draft."],
    sops: ["No workflow promoted."],
    next_week_priorities: ["Name the approver."],
    automation_receipt: "Source: TASK-1.",
  };
  const report_markdown = Object.values(content).flat().join("\n\n");
  return {
    schema_version: "kamdar-weekly-context@2.0.0",
    artifact_type: "kamdar-weekly-context",
    context_id: "weekly-context-2026-W34",
    week: "2026-W34",
    collected_at: "2026-08-25T18:00:00+08:00",
    runtime_input_policy: { work_items_loaded: false, meetings_loaded: false, source: "Project Draft reports only" },
    projects: [{ id: "PROJ-1", name: "Project one", area: "CMT", current_sections: { overview: "Overview.", project_knowledge: "Knowledge.", this_weeks_attention: "Attention." } }],
    reports: [{
      id: "RPT-PROJ-1-W34", report_level: "Project", project_id: "PROJ-1", area: "CMT", status: "Draft", version: 1,
      finalized_at: null, previous_report_id: null, source_ids: ["TASK-1"], report_markdown, content,
    }],
    draft_candidate_refs: [{ source_report_id: "RPT-PROJ-1-W34", source_ids: ["TASK-1"] }],
    expected_areas: ["CMT"],
    source_gaps: [],
  };
}

function originalDailyReceipt() {
  return {
    receipt_id: "RECEIPT-1",
    daily_result_id: "RESULT-1",
    effects: [
      { effect_id: "E-APPLIED", result_pointer: "/project_updates/0", payload_hash: "a".repeat(64), target: { target_id: "PROJ-1" }, outcome: { state: "applied", provider_response: { response_id: "RESP-1" } } },
      { effect_id: "E-NONE", result_pointer: "/documentation_reviews/0", payload_hash: "b".repeat(64), target: { target_id: "TASK-1" }, outcome: { state: "no_finding", provider_response: null } },
      { effect_id: "E-BLOCKED", result_pointer: "/knowledge_updates/0", payload_hash: "c".repeat(64), target: { target_id: "TASK-1" }, outcome: { state: "blocked", provider_response: null } },
    ],
    work_processing: [
      { work_item_id: "TASK-1", state: "processed", status_after: "Done", ai_review_after: "Processed", daily_review_version_after: "daily-review-v2" },
      { work_item_id: "TASK-2", state: "blocked", status_after: "Done", ai_review_after: "Blocked", daily_review_version_after: null },
    ],
  };
}

function rerunReceipt(original, originalBytes, contextBytes, resultBytes) {
  return {
    schema_version: "kamdar-daily-idempotency-rerun-receipt@1.1.0",
    rerun_receipt_id: "RERUN-1",
    original_receipt_id: original.receipt_id,
    original_receipt_sha256: hash(originalBytes),
    source_context_id: "daily-context-2026-08-25",
    source_context_sha256: hash(contextBytes),
    daily_result_id: original.daily_result_id,
    daily_result_sha256: hash(resultBytes),
    recorded_at: "2026-08-25T18:30:00+08:00",
    live_provider_calls: false,
    audit_effects: [
      { original_effect_id: "E-APPLIED", result_pointer: "/project_updates/0", action_key: "apply-project-1", target_id: "PROJ-1", payload_hash: "a".repeat(64), original_outcome: "applied", outcome: "duplicate", new_provider_mutations: 0, lookup_read_back: { provider_response_id: "RESP-1", target_id: "PROJ-1", payload_hash: "a".repeat(64), matched: true, created: false }, reason: "Existing exact effect found." },
      { original_effect_id: "E-NONE", result_pointer: "/documentation_reviews/0", action_key: "comment-control", target_id: "TASK-1", payload_hash: "b".repeat(64), original_outcome: "no_finding", outcome: "no_finding", new_provider_mutations: 0, lookup_read_back: null, reason: "No finding remains." },
      { original_effect_id: "E-BLOCKED", result_pointer: "/knowledge_updates/0", action_key: "knowledge-blocked", target_id: "TASK-1", payload_hash: "c".repeat(64), original_outcome: "blocked", outcome: "blocked", new_provider_mutations: 0, lookup_read_back: null, reason: "Original configuration gap remains." },
    ],
    work_processing: [
      { work_item_id: "TASK-1", original_state: "processed", rerun_state: "processed", status_after: "Done", ai_review_after: "Processed", daily_review_version_after: "daily-review-v2", changed: false },
      { work_item_id: "TASK-2", original_state: "blocked", rerun_state: "blocked", status_after: "Done", ai_review_after: "Blocked", daily_review_version_after: null, changed: false },
    ],
    summary: { original_effect_count: 3, audited_effect_count: 3, duplicate_count: 1, no_finding_count: 1, blocked_count: 1, conflicted_count: 0, failed_count: 0, new_provider_mutations: 0, processing_changes: 0 },
    run_notes: "Synthetic unchanged rerun.",
  };
}

test("Daily context requires complete current Project sections and manifested records", () => {
  const context = dailyContext();
  assert.equal(DailyContextDiffSchema.safeParse(context).success, true);
  const missingSection = structuredClone(context);
  delete missingSection.projects[0].current_sections.overview;
  assert.equal(DailyContextDiffSchema.safeParse(missingSection).success, false);
  const missingNextAction = structuredClone(context);
  delete missingNextAction.work_items[0].documentation.next_action;
  assert.equal(DailyContextDiffSchema.safeParse(missingNextAction).success, false);
  const missingInformation = structuredClone(context);
  delete missingInformation.work_items[0].documentation.missing_information;
  assert.equal(DailyContextDiffSchema.safeParse(missingInformation).success, false);
  const unmanifested = structuredClone(context);
  unmanifested.source_manifest[0].source_ids.pop();
  unmanifested.source_manifest[0].record_count -= 1;
  assert.equal(DailyContextDiffSchema.safeParse(unmanifested).success, false);
});

test("Daily documentation selection accepts Done-unprocessed Work and rejects Processed Work", () => {
  const eligible = dailyContext();
  eligible.work_items[0].status = "Done";
  eligible.work_items[0].ai_review = "Pending";
  eligible.work_items[0].selection_reason = "done_unprocessed";
  assert.equal(DailyContextDiffSchema.safeParse(eligible).success, true);

  const alreadyProcessed = structuredClone(eligible);
  alreadyProcessed.work_items[0].ai_review = "Processed";
  alreadyProcessed.work_items[0].daily_review_version = "daily-review-v2";
  assert.equal(DailyContextDiffSchema.safeParse(alreadyProcessed).success, false);
});

test("Weekly context is complete Draft evidence and rejects raw Work or omitted rendered facts", () => {
  const context = weeklyContext();
  assert.equal(WeeklyContextSchema.safeParse(context).success, true);
  const rawWork = structuredClone(context);
  rawWork.work_items = [{ id: "TASK-1" }];
  assert.equal(WeeklyContextSchema.safeParse(rawWork).success, false);
  const omitted = structuredClone(context);
  omitted.reports[0].report_markdown = omitted.reports[0].report_markdown.replace("Name the approver.", "");
  assert.equal(WeeklyContextSchema.safeParse(omitted).success, false);
});

test("Daily rerun proves duplicate/no-finding/unresolved outcomes without a new mutation", () => {
  const original = originalDailyReceipt();
  const originalBytes = Buffer.from(`${JSON.stringify(original)}\n`);
  const context = dailyContext();
  const contextBytes = Buffer.from(`${JSON.stringify(context)}\n`);
  const resultBytes = Buffer.from('{"context_id":"daily-context-2026-08-25"}\n');
  const rerun = rerunReceipt(original, originalBytes, contextBytes, resultBytes);
  assert.equal(DailyIdempotencyRerunReceiptSchema.safeParse(rerun).success, true);
  assert.equal(validateDailyIdempotencyRerun({ rawRerun: rerun, originalReceipt: original, originalReceiptBytes: originalBytes, contextBytes, resultBytes, context }).pass, true);

  const staleContext = structuredClone(rerun);
  staleContext.source_context_sha256 = "e".repeat(64);
  assert.throws(() => validateDailyIdempotencyRerun({ rawRerun: staleContext, originalReceipt: original, originalReceiptBytes: originalBytes, contextBytes, resultBytes, context }), /not bound to the exact context/);

  const stale = structuredClone(rerun);
  stale.audit_effects[0].payload_hash = "d".repeat(64);
  stale.audit_effects[0].lookup_read_back.payload_hash = "d".repeat(64);
  assert.throws(() => validateDailyIdempotencyRerun({ rawRerun: stale, originalReceipt: original, originalReceiptBytes: originalBytes, contextBytes, resultBytes, context }), /stale/);

  const fabricatedRecovery = structuredClone(rerun);
  fabricatedRecovery.audit_effects[2].outcome = "duplicate";
  fabricatedRecovery.audit_effects[2].lookup_read_back = { provider_response_id: "RESP-X", target_id: "TASK-1", payload_hash: "c".repeat(64), matched: true, created: false };
  fabricatedRecovery.summary.duplicate_count += 1;
  fabricatedRecovery.summary.blocked_count -= 1;
  assert.throws(() => validateDailyIdempotencyRerun({ rawRerun: fabricatedRecovery, originalReceipt: original, originalReceiptBytes: originalBytes, contextBytes, resultBytes, context }), /outcome does not match/);

  const missingAudit = structuredClone(rerun);
  missingAudit.audit_effects.pop();
  missingAudit.summary.original_effect_count -= 1;
  missingAudit.summary.audited_effect_count -= 1;
  missingAudit.summary.blocked_count -= 1;
  assert.throws(() => validateDailyIdempotencyRerun({ rawRerun: missingAudit, originalReceipt: original, originalReceiptBytes: originalBytes, contextBytes, resultBytes, context }), /every and only original effect/);

  const newMutation = structuredClone(rerun);
  newMutation.audit_effects[0].new_provider_mutations = 1;
  assert.equal(DailyIdempotencyRerunReceiptSchema.safeParse(newMutation).success, false);

  const changedProcessing = structuredClone(rerun);
  changedProcessing.work_processing[0].changed = true;
  assert.equal(DailyIdempotencyRerunReceiptSchema.safeParse(changedProcessing).success, false);
});

test("Daily and Weekly judge packets bind exact frozen context and result bytes", () => {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-packet-bindings-"));
  try {
    const daily = dailyContext();
    const dailyResult = { project_updates: [{ project_id: "PROJ-1", source_ids: ["PROJ-1", "TASK-1"] }] };
    writeJson(resolve(root, "daily/context.json"), daily);
    writeJson(resolve(root, "daily/result.json"), dailyResult);
    const dailySuite = {
      run_artifacts: [
        { kind: "daily-context", path: "daily/context.json" },
        { kind: "daily-review-result", path: "daily/result.json" },
        { kind: "feature-judge:FEAT-X", path: "eval/judges/FEAT-X.json" },
      ],
      features: [{ feature_id: "FEAT-X", result_path: "project_updates", entity_ids: ["PROJ-1", "TASK-1"], claim: "Grounded Project update", assertions: ["Grounded"] }],
    };
    const seed = { entities: { projects: [{ id: "PROJ-1" }], people: [{ id: "PERSON-1" }], work_items: [{ id: "TASK-1" }], meetings: [], reports: [] } };
    const dailyPacket = buildFeatureJudgePacket({ featureId: "FEAT-X", result: dailyResult, context: daily, runRoot: root, suite: dailySuite, seed });
    assert.equal(dailyPacket.context_sha256, hash(readFileSync(resolve(root, "daily/context.json"))));
    assert.equal(dailyPacket.result_sha256, hash(readFileSync(resolve(root, "daily/result.json"))));
    assert.match(dailyPacket.packet_sha256, /^[a-f0-9]{64}$/);
    assert.equal("seed_evidence" in dailyPacket, false);
    assert.ok(dailyPacket.frozen_context_evidence.projects.length);
    const packetWork = dailyPacket.frozen_context_evidence.work_items.find((row) => row.id === "TASK-1");
    assert.equal(packetWork.documentation.next_action, "Record the approved measurement, approver, affected sizes, and revised sample-check date.");
    assert.deepEqual(packetWork.documentation.missing_information, ["Approved collar measurement", "Approver", "Effective size range", "Revised sample-check date"]);
    const dailyVerdictPath = resolve(root, "eval/judges/FEAT-X.json");
    const dailyFeature = dailySuite.features[0];
    const dailyVerdict = {
      feature_id: "FEAT-X", tier: "A", verdict: "pass",
      rubric: { groundedness: "A", completeness: "A", usefulness: "A", repeatability: "A", length_balance: "A" },
      assertions: [{ assertion: "Grounded", met: true, evidence_refs: ["PROJ-1 at candidate[0]"] }],
      evidence_refs: ["PROJ-1 at candidate[0]"], failures: [], verdict_path: dailyVerdictPath, packet_sha256: dailyPacket.packet_sha256,
    };
    assert.equal(validateFeatureJudgeVerdict(dailyVerdict, dailyFeature, { expectedVerdictPath: dailyVerdictPath, expectedPacketSha256: dailyPacket.packet_sha256 }).pass, true);
    assert.throws(() => validateFeatureJudgeVerdict({ ...dailyVerdict, packet_sha256: "0".repeat(64) }, dailyFeature, { expectedVerdictPath: dailyVerdictPath, expectedPacketSha256: dailyPacket.packet_sha256 }), /current packet hash/);

    const weekly = weeklyContext();
    const weeklyResult = { report_results: [{ report_id: "OUT-1", project_id: "PROJ-1", source_report_ids: ["RPT-PROJ-1-W34"] }] };
    writeJson(resolve(root, "weekly/context.json"), weekly);
    writeJson(resolve(root, "weekly/result.json"), weeklyResult);
    const weeklySuite = {
      run_artifacts: [
        { kind: "weekly-context", path: "weekly/context.json" },
        { kind: "weekly-review-result", path: "weekly/result.json" },
      ],
      features: [{ feature_id: "FEAT-Y", result_path: "$.report_results[*]", entity_ids: ["PROJ-1", "RPT-PROJ-1-W34", "TASK-1"], claim: "Draft-backed report", falsifier: "Missing Draft", assertions: ["Grounded"] }],
    };
    const weeklySeed = { entities: { projects: [{ id: "PROJ-1" }], people: [], work_items: [{ id: "TASK-1" }], meetings: [], reports: [{ id: "RPT-PROJ-1-W34" }] } };
    const weeklyPacket = buildWeeklyFeatureJudgePacket({ featureId: "FEAT-Y", result: weeklyResult, context: weekly, runRoot: root, suite: weeklySuite, seed: weeklySeed });
    assert.equal(weeklyPacket.context_sha256, hash(readFileSync(resolve(root, "weekly/context.json"))));
    assert.equal(weeklyPacket.result_sha256, hash(readFileSync(resolve(root, "weekly/result.json"))));
    assert.match(weeklyPacket.packet_sha256, /^[a-f0-9]{64}$/);
    assert.equal("seed_evidence" in weeklyPacket, false);
    assert.ok(weeklyPacket.frozen_context_evidence.reports.length);
    const weeklyVerdictPath = "eval/judges/FEAT-Y.json";
    const weeklyVerdict = {
      lane: "tester", target: "FEAT-Y", claim_under_test: "Draft-backed report", tier: "A",
      rubric: { groundedness: "A", completeness: "A", usefulness: "A", repeatability: "A", length_balance: "A" },
      test_cases: ["frozen-draft"], assertions: [{ assertion: "Grounded", met: true, evidence: ["RPT-PROJ-1-W34"] }],
      evidence: ["RPT-PROJ-1-W34"], failures: [], artifacts: ["weekly/context.json"], blockers: [],
      verdict_path: resolve(root, weeklyVerdictPath), packet_sha256: weeklyPacket.packet_sha256,
    };
    assert.equal(validateWeeklyFeatureJudgeVerdict(weeklyVerdict, weeklySuite.features[0], { runRoot: root, verdictPath: weeklyVerdictPath, expectedPacketSha256: weeklyPacket.packet_sha256 }).pass, true);
    assert.throws(() => validateWeeklyFeatureJudgeVerdict({ ...weeklyVerdict, packet_sha256: "0".repeat(64) }, weeklySuite.features[0], { runRoot: root, verdictPath: weeklyVerdictPath, expectedPacketSha256: weeklyPacket.packet_sha256 }), /current packet hash/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const schemaPath = resolve(projectRoot, "automations/schemas/daily-integration-receipt.zod.mjs");
const goldenPath = resolve(projectRoot, "automations/examples/golden/daily-integration-receipt-2026-08-25.json");
const resultPath = resolve(projectRoot, "automations/examples/golden/daily-review-result-2026-08-25.json");
const seedPath = resolve(projectRoot, "evals/seed/kamdar-company-os.seed.json");
const settledStates = new Set(["applied", "duplicate", "no_finding"]);

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function entityIds(seed) {
  return new Set([
    ...seed.entities.projects,
    ...seed.entities.people,
    ...seed.entities.work_items,
    ...seed.entities.meetings,
    ...seed.entities.reports,
  ].map((record) => record.id));
}

function assertSyntheticUrl(value) {
  const url = new URL(value);
  assert.ok(url.hostname === "example.test" || url.hostname.endsWith(".example.test"), `${value} must be synthetic`);
}

function assertExactResultLink(receipt, resultBytes) {
  const result = JSON.parse(resultBytes);
  assert.equal(receipt.source_context_id, result.context_id);
  assert.equal(receipt.daily_result_sha256, createHash("sha256").update(resultBytes).digest("hex"));
}

function resolveResultPointer(result, pointer) {
  return pointer.split("/").slice(1).reduce((value, part) => value?.[part.replaceAll("~1", "/").replaceAll("~0", "~")], result);
}

function expectedRoute(pointer, row) {
  if (pointer.startsWith("/project_updates/")) return ["FEAT-0001", "replace_project_sections"];
  if (pointer.startsWith("/completed_ticket_comments/")) return ["FEAT-0002", "add_work_comment"];
  if (pointer.startsWith("/weekly_progress_chases/")) return ["FEAT-0003", "send_owner_chase"];
  if (pointer.startsWith("/knowledge_updates/")) {
    return ["FEAT-0004", row.draft_entries.length ? "replace_weekly_report_draft" : "add_work_comment"];
  }
  throw new Error(`Unsupported result pointer ${pointer}`);
}

function pointerTargetId(pointer, row) {
  if (pointer.startsWith("/project_updates/")) return row.project_id;
  if (pointer.startsWith("/completed_ticket_comments/")) return row.work_item_id;
  if (pointer.startsWith("/weekly_progress_chases/")) return row.owner_person_id;
  if (pointer.startsWith("/knowledge_updates/") && row.missing_information_comment) return row.work_item_id;
  return null;
}

function processingSafetyErrors(receipt) {
  const errors = [];
  const effects = new Map(receipt.effects.map((effect) => [effect.effect_id, effect]));
  const decisions = new Map(receipt.work_processing.map((decision) => [decision.work_item_id, decision]));
  for (const decision of receipt.work_processing) {
    const expected = receipt.effects
      .filter((effect) => effect.required && effect.work_item_ids.includes(decision.work_item_id))
      .map((effect) => effect.effect_id)
      .sort();
    const declared = [...decision.required_effect_ids].sort();
    if (JSON.stringify(expected) !== JSON.stringify(declared)) errors.push("incomplete required effect list");
    const safelySettled = declared.length > 0 && declared.every((id) => settledStates.has(effects.get(id)?.outcome.state));
    if (decision.state === "processed" && !safelySettled) errors.push("unsafe processed state");
    if (decision.state === "unprocessed" && safelySettled) errors.push("settled work left unprocessed");
    if ((decision.state === "processed") !== Boolean(decision.processed_at)) errors.push("invalid processed_at");
  }
  for (const effect of receipt.effects.filter((item) => item.required)) {
    for (const workItemId of effect.work_item_ids) if (!decisions.has(workItemId)) errors.push("missing processing decision");
  }
  for (const decision of receipt.work_processing) {
    if (decision.state === "processed") {
      if (decision.status_after !== "Processed" || decision.daily_review_version_after !== "daily-review-v1") errors.push("missing processed property read-back");
    } else if (decision.status_after !== null || decision.daily_review_version_after !== null) {
      errors.push("unsafe processing property transition");
    }
  }
  return errors;
}

test("Daily integration contract exports the Zod schema and processing safety guard", () => {
  const source = readFileSync(schemaPath, "utf8");
  assert.match(source, /export const DailyIntegrationReceiptSchema = z/);
  assert.match(source, /export function assertDailyProcessingSafety\(receipt\)/);
  for (const state of ["applied", "duplicate", "no_finding", "blocked", "conflicted", "failed"]) {
    assert.match(source, new RegExp(`"${state}"`));
  }
  assert.match(source, /\.superRefine\(/);
});

test("golden receipt is source-linked, provider-verifiable, and processing-safe", () => {
  const receipt = loadJson(goldenPath);
  const resultBytes = readFileSync(resultPath);
  const result = JSON.parse(resultBytes);
  const knownIds = entityIds(loadJson(seedPath));
  assert.equal(receipt.schema_version, "kamdar-daily-integration-receipt@1.0.0");
  assert.ok(receipt.source_context_id);
  assert.ok(receipt.daily_result_id);
  assert.match(receipt.daily_result_sha256, /^[a-f0-9]{64}$/);
  assertExactResultLink(receipt, resultBytes);
  assert.equal(new Set(receipt.effects.map((effect) => effect.effect_id)).size, receipt.effects.length);

  for (const effect of receipt.effects) {
    assert.match(effect.feature_id, /^FEAT-000[1-4]$/);
    assert.match(effect.result_pointer, /^\/(project_updates|completed_ticket_comments|weekly_progress_chases|knowledge_updates)(?:\/\d+)?$/);
    assert.match(effect.payload_hash, /^[a-f0-9]{64}$/);
    assert.ok(effect.source_record_ids.every((id) => knownIds.has(id)), `${effect.effect_id} has an unknown source ID`);
    assert.ok(effect.work_item_ids.every((id) => knownIds.has(id)), `${effect.effect_id} has an unknown Work ID`);
    assert.ok(knownIds.has(effect.target.target_id), `${effect.effect_id} has an unknown target ID`);
    assertSyntheticUrl(effect.target.target_url);

    if (effect.outcome.state !== "no_finding") {
      const row = resolveResultPointer(result, effect.result_pointer);
      assert.ok(row && !Array.isArray(row), `${effect.effect_id} must resolve to one result row`);
      const [featureId, operation] = expectedRoute(effect.result_pointer, row);
      assert.equal(effect.feature_id, featureId);
      assert.equal(effect.operation, operation);
      assert.equal(effect.payload_hash, createHash("sha256").update(JSON.stringify(row)).digest("hex"));
      assert.ok(row.source_ids.every((id) => effect.source_record_ids.includes(id)));
      if (row.work_item_id) assert.ok(effect.work_item_ids.includes(row.work_item_id));
      if (row.related_work_item_ids) assert.ok(row.related_work_item_ids.every((id) => effect.work_item_ids.includes(id)));
      if (pointerTargetId(effect.result_pointer, row)) assert.equal(effect.target.target_id, pointerTargetId(effect.result_pointer, row));
    }

    if (["applied", "duplicate"].includes(effect.outcome.state)) {
      assert.ok(effect.outcome.provider_response.response_id);
      assertSyntheticUrl(effect.outcome.provider_response.response_url);
      assert.equal(effect.outcome.read_back.target_id, effect.target.target_id);
      assert.equal(effect.outcome.read_back.target_url, effect.target.target_url);
      assert.equal(effect.outcome.read_back.provider_response_id, effect.outcome.provider_response.response_id);
      assert.equal(effect.outcome.read_back.payload_hash, effect.payload_hash);
      assert.equal(effect.outcome.read_back.matched, true);
    } else {
      assert.equal(effect.outcome.provider_response, null);
      assert.equal(effect.outcome.read_back, null);
      assert.ok(effect.outcome.reason);
    }
  }
  assert.deepEqual(processingSafetyErrors(receipt), []);
  assert.ok(receipt.work_processing.some((row) => row.state === "processed"));
  assert.ok(receipt.work_processing.some((row) => row.state === "unprocessed"));
  for (const row of receipt.work_processing.filter((item) => item.state === "processed")) {
    assert.equal(row.status_after, "Processed");
    assert.equal(row.daily_review_version_after, "daily-review-v1");
  }
  for (const row of receipt.work_processing.filter((item) => item.state === "unprocessed")) {
    assert.equal(row.status_after, null);
    assert.equal(row.daily_review_version_after, null);
  }
  assert.deepEqual(new Set(receipt.effects.map((effect) => effect.outcome.state)), new Set(["applied", "duplicate", "no_finding", "blocked", "failed"]));

  for (const section of ["project_updates", "completed_ticket_comments", "weekly_progress_chases", "knowledge_updates"]) {
    result[section].forEach((_row, index) => {
      assert.equal(receipt.effects.filter((effect) => effect.result_pointer === `/${section}/${index}`).length, 1);
    });
  }
});

test("receipt linkage rejects different Daily result bytes", () => {
  const receipt = loadJson(goldenPath);
  const resultBytes = readFileSync(resultPath);
  const altered = Buffer.concat([resultBytes, Buffer.from("\n")]);
  assert.throws(() => assertExactResultLink(receipt, altered));
});

test("blocked, conflicted, or failed required effects cannot mark Work processed", () => {
  const receipt = loadJson(goldenPath);
  for (const unsafeState of ["blocked", "conflicted", "failed"]) {
    const candidate = structuredClone(receipt);
    const effect = candidate.effects.find((item) => item.effect_id === "E-META-OK");
    effect.integration = "notion";
    effect.operation = "add_work_comment";
    effect.outcome = {
      state: unsafeState,
      reason: "Synthetic provider failure for the processing-safety assertion.",
      provider_response: null,
      read_back: null,
    };
    assert.ok(processingSafetyErrors(candidate).includes("unsafe processed state"), unsafeState);
  }
});

test("a receipt cannot omit a required linked effect from its Work decision", () => {
  const receipt = loadJson(goldenPath);
  receipt.work_processing.find((item) => item.work_item_id === "TASK-110").required_effect_ids.pop();
  assert.ok(processingSafetyErrors(receipt).includes("incomplete required effect list"));
});

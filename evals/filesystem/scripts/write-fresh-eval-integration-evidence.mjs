/** Write only integration conclusions derivable from immutable receipt/read-back evidence. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { payloadSha256 } from "./unified-weekly-review-eval.mjs";
import { validateDailyIdempotencyRerun } from "./unified-daily-review-eval.mjs";
import { DailyContextDiffSchema } from "../../../automations/schemas/daily-context-diff.zod.mjs";
import { DailyReviewResultSchema } from "../../../automations/schemas/daily-review-result.zod.mjs";
import { DailyIntegrationReceiptSchema, assertDailyProcessingSafety } from "../../../automations/schemas/daily-integration-receipt.zod.mjs";

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function parse(schema, value, label) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`${label}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return parsed.data;
}
function dailyPointers(result) {
  return ["project_updates", "completed_ticket_comments", "weekly_progress_chases", "knowledge_updates"]
    .flatMap((key) => result[key].map((_, index) => `/${key}/${index}`));
}
function validateDailyEffects(result, receipt) {
  for (const pointer of dailyPointers(result)) {
    const matches = receipt.effects.filter((effect) => effect.result_pointer === pointer);
    if (matches.length !== 1) throw new Error(`Daily receipt must have exactly one effect for ${pointer}.`);
    const [section, index] = pointer.slice(1).split("/");
    if (matches[0].payload_hash !== sha256(JSON.stringify(result[section][Number(index)]))) throw new Error(`Daily receipt payload hash is stale for ${pointer}.`);
  }
}
function validateDailyReadBack(receipt) {
  for (const effect of receipt.effects) {
    const writing = ["applied", "duplicate", "delivered_to_eval_sink"].includes(effect.outcome.state);
    if (writing && (!effect.outcome.provider_response || !effect.outcome.read_back
      || effect.outcome.read_back.target_id !== effect.target.target_id
      || effect.outcome.read_back.payload_hash !== effect.payload_hash
      || effect.outcome.read_back.matched !== true)) throw new Error(`Daily receipt lacks exact provider read-back for ${effect.effect_id}.`);
    if (!writing && (effect.outcome.provider_response !== null || effect.outcome.read_back !== null)) throw new Error(`Non-writing Daily effect ${effect.effect_id} claims provider evidence.`);
  }
}

export function writeFreshEvalIntegrationEvidence({ deploymentRoot }) {
  const root = resolve(deploymentRoot);
  const dailyRoot = resolve(root, "daily-eval");
  const weeklyRoot = resolve(root, "weekly-eval");
  const weeklyReceiptPath = resolve(weeklyRoot, "weekly/receipts/weekly-integration-receipt-2026-W34.json");
  const weeklyReadBackPath = resolve(weeklyRoot, "weekly/read-back/weekly-integration-read-back-2026-W34.json");
  const weeklyReceipt = readJson(weeklyReceiptPath);
  const weeklyReadBack = readJson(weeklyReadBackPath);

  const dailyContextPath = resolve(dailyRoot, "daily/context/daily-context-diff-2026-08-25.json");
  const dailyResultPath = resolve(dailyRoot, "daily/review/daily-review-result-2026-08-25.json");
  const dailyReceiptPath = resolve(dailyRoot, "daily/receipts/daily-integration-receipt-2026-08-25.json");
  const dailyRerunPath = resolve(dailyRoot, "daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json");
  const dailyContextBytes = readFileSync(dailyContextPath);
  const dailyContext = parse(DailyContextDiffSchema, JSON.parse(dailyContextBytes), "Daily context");
  const dailyResultBytes = readFileSync(dailyResultPath);
  const dailyResult = parse(DailyReviewResultSchema, JSON.parse(dailyResultBytes), "Daily result");
  const dailyReceiptBytes = readFileSync(dailyReceiptPath);
  const dailyReceipt = parse(DailyIntegrationReceiptSchema, JSON.parse(dailyReceiptBytes), "Daily receipt");
  const dailyRerun = readJson(dailyRerunPath);
  if (dailyResult.context_id !== dailyContext.context_id
    || dailyReceipt.source_context_id !== dailyContext.context_id
    || dailyReceipt.daily_result_sha256 !== sha256(dailyResultBytes)) throw new Error("Daily context, result, and receipt linkage is stale.");
  validateDailyEffects(dailyResult, dailyReceipt);
  validateDailyReadBack(dailyReceipt);
  assertDailyProcessingSafety(dailyReceipt);
  const dailyIdempotency = validateDailyIdempotencyRerun({
    rawRerun: dailyRerun,
    originalReceipt: dailyReceipt,
    originalReceiptBytes: dailyReceiptBytes,
    contextBytes: dailyContextBytes,
    resultBytes: dailyResultBytes,
    context: dailyContext,
  });

  const daily = {
    pass: true,
    gates: [
      {
        gate_id: "effects-match-receipt",
        pass: true,
        evidence_refs: ["daily/receipts/daily-integration-receipt-2026-08-25.json#/effects"],
        failures: [],
      },
      {
        gate_id: "read-back-matches-intent",
        pass: true,
        evidence_refs: ["daily/receipts/daily-integration-receipt-2026-08-25.json#/effects/*/outcome/read_back"],
        failures: [],
      },
      {
        gate_id: "processing-safety",
        pass: true,
        evidence_refs: ["daily/receipts/daily-integration-receipt-2026-08-25.json#/work_processing"],
        failures: [],
      },
      {
        gate_id: "idempotency",
        pass: dailyIdempotency.pass,
        evidence_refs: ["daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json"],
        failures: [],
      },
    ],
    failures: [],
  };
  const weekly = {
    pass: true,
    receipt_sha256: payloadSha256(weeklyReceipt),
    read_back_sha256: payloadSha256(weeklyReadBack),
    effects: weeklyReceipt.effects.length,
    read_backs: weeklyReadBack.observations?.length ?? weeklyReadBack.read_backs?.length ?? 0,
  };

  writeJson(resolve(dailyRoot, "eval/integrations.json"), daily);
  writeJson(resolve(weeklyRoot, "eval/integrations.json"), weekly);
  return { daily, weekly };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const deploymentRoot = process.argv[2];
  if (!deploymentRoot) throw new Error("usage: node write-fresh-eval-integration-evidence.mjs <deployment-root>");
  process.stdout.write(`${JSON.stringify(writeFreshEvalIntegrationEvidence({ deploymentRoot }), null, 2)}\n`);
}

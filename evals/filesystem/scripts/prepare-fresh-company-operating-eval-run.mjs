/** Materialize a reference calibration run from expected Daily/Weekly artifacts. */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildFeatureJudgePacket,
  loadDailyReviewEvalSuite,
  validateUnifiedDailyRun,
} from "./unified-daily-review-eval.mjs";
import {
  buildWeeklyFeatureJudgePacket,
  loadWeeklyReviewEvalSuite,
  validateUnifiedWeeklyRun,
} from "./unified-weekly-review-eval.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dailyExpectedRoot = resolve(projectRoot, "evals/daily/expected");
const weeklyExpectedRoot = resolve(projectRoot, "evals/weekly/expected");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function copy(source, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

export function prepareFreshCompanyOperatingEvalRun({ deploymentRoot }) {
  const root = resolve(deploymentRoot);
  if (existsSync(root)) throw new Error(`Fresh eval deployment already exists: ${root}`);
  const dailyRoot = resolve(root, "daily-eval");
  const weeklyRoot = resolve(root, "weekly-eval");
  const packetRoot = resolve(root, "judge-packets");

  const dailyMappings = [
    ["context.json", "daily/context/daily-context-diff-2026-08-25.json"],
    ["result.json", "daily/review/daily-review-result-2026-08-25.json"],
    ["integration-receipt.json", "daily/receipts/daily-integration-receipt-2026-08-25.json"],
    ["idempotency-receipt.json", "daily/receipts/daily-idempotency-rerun-receipt-2026-08-25.json"],
  ];
  for (const [source, destination] of dailyMappings) copy(resolve(dailyExpectedRoot, source), resolve(dailyRoot, destination));
  const dailySuite = loadDailyReviewEvalSuite();
  const daily = validateUnifiedDailyRun({ runRoot: dailyRoot, suite: dailySuite });
  const dailyResultPath = resolve(dailyRoot, "daily/review/daily-review-result-2026-08-25.json");
  writeJson(resolve(dailyRoot, "eval/deterministic.json"), {
    pass: daily.pass,
    context_id: daily.context.context_id,
    daily_result_sha256: sha256(readFileSync(dailyResultPath)),
  });
  for (const feature of dailySuite.features) {
    writeJson(resolve(packetRoot, `daily-${feature.feature_id}.json`), buildFeatureJudgePacket({
      featureId: feature.feature_id,
      result: daily.result,
      context: daily.context,
      runRoot: dailyRoot,
      suite: dailySuite,
    }));
  }

  const weeklyMappings = [
    ["run-manifest.json", "weekly/run-manifest-2026-W34.json"],
    ["context.json", "weekly/context/weekly-context-2026-W34.json"],
    ["result.json", "weekly/review/weekly-review-result-2026-W34.json"],
    ["integration-receipt.json", "weekly/receipts/weekly-integration-receipt-2026-W34.json"],
    ["integration-read-back.json", "weekly/read-back/weekly-integration-read-back-2026-W34.json"],
  ];
  for (const [source, destination] of weeklyMappings) copy(resolve(weeklyExpectedRoot, source), resolve(weeklyRoot, destination));
  const weeklySuite = loadWeeklyReviewEvalSuite();
  const weekly = validateUnifiedWeeklyRun({ runRoot: weeklyRoot, suite: weeklySuite });
  const weeklyResultPath = resolve(weeklyRoot, "weekly/review/weekly-review-result-2026-W34.json");
  writeJson(resolve(weeklyRoot, "eval/deterministic.json"), {
    pass: weekly.pass,
    context_id: weekly.context.context_id,
    weekly_result_sha256: sha256(readFileSync(weeklyResultPath)),
    checks: ["manifest", "inventory", "zod", "source-closure", "mock-integrations"],
  });
  for (const feature of weeklySuite.features) {
    writeJson(resolve(packetRoot, `weekly-${feature.feature_id}.json`), buildWeeklyFeatureJudgePacket({
      featureId: feature.feature_id,
      result: weekly.result,
      context: weekly.context,
      runRoot: weeklyRoot,
      suite: weeklySuite,
    }));
  }

  writeJson(resolve(root, "candidate-provenance.json"), {
    schema_version: "kamdar-eval-candidate-provenance@1.0.0",
    origin: "reference_fixture",
    producer: "evals/daily/expected + evals/weekly/expected",
    generated_at: new Date().toISOString(),
    daily_result_sha256: sha256(readFileSync(dailyResultPath)),
    weekly_result_sha256: sha256(readFileSync(weeklyResultPath)),
  });

  return {
    deployment_root: root,
    daily: { run_root: dailyRoot, features: daily.feature_checks },
    weekly: { run_root: weeklyRoot, integrations: weekly.integrations },
    judge_packets: packetRoot,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const deploymentRoot = process.argv[2];
  if (!deploymentRoot) throw new Error("usage: node prepare-fresh-company-operating-eval-run.mjs <new-deployment-root>");
  process.stdout.write(`${JSON.stringify(prepareFreshCompanyOperatingEvalRun({ deploymentRoot }), null, 2)}\n`);
}

/** Derive suite summaries from completed judge/review artifacts, then run strict reconciliation. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadDailyReviewEvalSuite, reconcileJudgedRun, validateUnifiedDailyRun } from "./unified-daily-review-eval.mjs";
import { loadWeeklyReviewEvalSuite, reconcileJudgedWeeklyRun, validateUnifiedWeeklyRun } from "./unified-weekly-review-eval.mjs";

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); }

export function finalizeFreshCompanyOperatingEvalRun({ deploymentRoot }) {
  const root = resolve(deploymentRoot);
  const dailyRoot = resolve(root, "daily-eval");
  const weeklyRoot = resolve(root, "weekly-eval");
  const dailySuite = loadDailyReviewEvalSuite();
  const weeklySuite = loadWeeklyReviewEvalSuite();

  const dailyVerdicts = dailySuite.features.map((feature) => {
    const verdict = readJson(resolve(dailyRoot, `eval/judges/${feature.feature_id}.json`));
    return {
      feature_id: feature.feature_id,
      pass: verdict.tier === "A" && verdict.verdict === "pass" && verdict.assertions.every((row) => row.met) && verdict.failures.length === 0,
      tier: verdict.tier,
    };
  });
  const dailyReview = readJson(resolve(dailyRoot, "eval/evidence-review.json"));
  const dailyQuality = readJson(resolve(dailyRoot, "eval/artifact-quality-review.json"));
  const dailyIntegrations = readJson(resolve(dailyRoot, "eval/integrations.json"));
  const dailyIntegrationSummary = {
    pass: dailyIntegrations.pass,
    gates: dailyIntegrations.gates.map(({ gate_id, pass }) => ({ gate_id, pass })),
  };
  const dailyExpected = {
    pass: dailyVerdicts.every((row) => row.pass) && dailyReview.verdict === "pass" && dailyQuality.tier === "A" && dailyQuality.verdict === "pass" && dailyIntegrations.pass,
    deterministic: true,
    feature_verdicts: dailyVerdicts,
    evidence_review: dailyReview.verdict,
    artifact_quality_review: { pass: dailyQuality.tier === "A" && dailyQuality.verdict === "pass", tier: dailyQuality.tier },
    integrations: dailyIntegrationSummary,
  };
  writeJson(resolve(dailyRoot, "eval/result.json"), dailyExpected);

  const weeklyVerdicts = weeklySuite.features.map((feature) => {
    const verdict = readJson(resolve(weeklyRoot, `eval/judges/${feature.feature_id}.json`));
    return {
      feature_id: feature.feature_id,
      tier: verdict.tier,
      pass: verdict.tier === "A" && verdict.assertions.every((row) => row.met) && verdict.failures.length === 0,
    };
  });
  const weeklyReview = readJson(resolve(weeklyRoot, "eval/evidence-review.json"));
  const weeklyQuality = readJson(resolve(weeklyRoot, "eval/artifact-quality-review.json"));
  const weeklyIntegrations = readJson(resolve(weeklyRoot, "eval/integrations.json"));
  const weeklyExpected = {
    pass: weeklyVerdicts.every((row) => row.pass) && weeklyReview.verdict === "pass" && weeklyQuality.tier === "A" && weeklyQuality.verdict === "pass" && weeklyIntegrations.pass,
    deterministic: true,
    integrations: weeklyIntegrations.pass,
    evidence_review: weeklyReview.verdict,
    artifact_quality_review: { pass: weeklyQuality.tier === "A" && weeklyQuality.verdict === "pass", tier: weeklyQuality.tier },
    feature_tiers: Object.fromEntries(weeklyVerdicts.map((row) => [row.feature_id, row.tier])),
  };
  writeJson(resolve(weeklyRoot, "eval/result.json"), weeklyExpected);

  const dailyDeterministic = validateUnifiedDailyRun({ runRoot: dailyRoot, suite: dailySuite, stage: "judged" });
  const weeklyDeterministic = validateUnifiedWeeklyRun({ runRoot: weeklyRoot, suite: weeklySuite, stage: "judged" });
  const daily = reconcileJudgedRun({ runRoot: dailyRoot, deterministic: dailyDeterministic, suite: dailySuite });
  const weekly = reconcileJudgedWeeklyRun({ runRoot: weeklyRoot, deterministic: weeklyDeterministic, suite: weeklySuite });
  return {
    daily,
    weekly,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const deploymentRoot = process.argv[2];
  if (!deploymentRoot) throw new Error("usage: node finalize-fresh-company-operating-eval-run.mjs <deployment-root>");
  const result = finalizeFreshCompanyOperatingEvalRun({ deploymentRoot });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.daily.pass || !result.weekly.pass) process.exitCode = 1;
}

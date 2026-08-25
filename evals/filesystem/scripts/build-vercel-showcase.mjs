/** Build the static eval dashboard from typed suites and completed judged runs. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildEvalDashboardModel, discoverLatestSuiteRun } from "./eval-dashboard-model.mjs";
import { renderEvalDashboardHtml } from "./eval-dashboard-html.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(filesystemRoot, "../..");
const defaultOutputDirectory = resolve(filesystemRoot, ".vercel-static");
const dailySuitePath = resolve(repoRoot, "evals/daily-review-evals.json");
const weeklySuitePath = resolve(repoRoot, "evals/weekly-review-evals.json");

export function buildVercelShowcase({ outputDirectory = defaultOutputDirectory, dailyRunRoot = null, weeklyRunRoot = null, operatedEvidencePath = null } = {}) {
  const destination = resolve(outputDirectory);
  const suiteRuns = [
    { suitePath: dailySuitePath, runRoot: dailyRunRoot ? resolve(dailyRunRoot) : discoverLatestSuiteRun({ suitePath: dailySuitePath }) },
    { suitePath: weeklySuitePath, runRoot: weeklyRunRoot ? resolve(weeklyRunRoot) : discoverLatestSuiteRun({ suitePath: weeklySuitePath }) }
  ];
  const model = buildEvalDashboardModel({ suiteRuns, operatedEvidencePath });
  const html = renderEvalDashboardHtml(model);
  mkdirSync(destination, { recursive: true });
  writeFileSync(resolve(destination, "index.html"), html, "utf8");
  writeFileSync(resolve(destination, "dashboard.json"), `${JSON.stringify(model, null, 2)}\n`, "utf8");
  return {
    output_directory: destination,
    index_html: resolve(destination, "index.html"),
    dashboard_json: resolve(destination, "dashboard.json"),
    totals: model.totals,
    run_roots: model.source.run_roots
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const valueAfter = (flag) => {
    const index = process.argv.indexOf(flag);
    if (index < 0) return null;
    if (!process.argv[index + 1]) throw new Error(`Missing value after ${flag}`);
    return process.argv[index + 1];
  };
  const result = buildVercelShowcase({
    dailyRunRoot: valueAfter("--daily-run"),
    weeklyRunRoot: valueAfter("--weekly-run"),
    operatedEvidencePath: valueAfter("--operated-evidence")
  });
  console.log(JSON.stringify(result));
}

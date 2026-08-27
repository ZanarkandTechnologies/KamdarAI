import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const operatedRoot = "/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai/workspace/runs/operated-2026-W34";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertionsFor(cadence, featureId) {
  const suite = readJson(resolve(projectRoot, `evals/${cadence}/suite.json`));
  return suite.features.find((feature) => feature.feature_id === featureId).assertions;
}

const verdicts = {
  "FEAT-0001": {
    cadence: "daily",
    tier: "A",
    met: [true, true, true, true],
    evidence: [
      ["daily/review/daily-review-result-2026-08-24.json#/project_updates/0/project_id", "daily/receipt.md#Notion project page updates"],
      ["daily/review/daily-review-result-2026-08-24.json#/project_updates/0/section_replacements"],
      ["daily/review/daily-review-result-2026-08-24.json#/project_updates/0/section_replacements/2/replacement_text"],
      ["daily/review/daily-review-result-2026-08-24.json#/project_updates/0/source_ids"],
    ],
    failures: [],
    review_note: "The CMT Project update is directly supported by the Daily result and Notion receipt.",
  },
  "FEAT-0002": {
    cadence: "daily",
    tier: "B",
    met: [true, false, false, false, true],
    evidence: [
      ["daily/review/daily-review-result-2026-08-24.json#/completed_ticket_comments/1", "daily/receipt.md#Notion Work-item comments"],
      ["daily/review/daily-review-result-2026-08-24.json#/completed_ticket_comments/1/comment_text"],
      ["daily/receipt.md#No-effect records/TASK-116"],
      ["daily/receipt.md#Work-item processing state/TASK-102", "daily/review/daily-review-result-2026-08-24.json#/completed_ticket_comments/0"],
      ["daily/review/daily-review-result-2026-08-24.json#/completed_ticket_comments"],
    ],
    failures: [
      "The TASK-115 comment asks for the numerical basis and source export, but not the rationale for the recommendation required by the suite.",
      "TASK-116 is only shown as a no-effect receipt row; the result does not carry an explicit sufficient verdict row.",
      "TASK-102 received a question but the receipt marks it Processed, so it did not remain reviewable under the current assertion.",
    ],
    review_note: "The Meta documentation request is strong, but the current suite asks for explicit verdict and reviewability behavior not present in this W34 run.",
  },
  "FEAT-0003": {
    cadence: "daily",
    tier: "B",
    met: [true, false, true, true],
    evidence: [
      ["daily/review/daily-review-result-2026-08-24.json#/weekly_progress_chases/0"],
      ["daily/review/daily-review-result-2026-08-24.json#/weekly_progress_chases/0/message_text"],
      ["daily/receipt.md#No-effect records/TASK-109"],
      ["daily/review/daily-review-result-2026-08-24.json#/weekly_progress_chases/0/message_text", "daily/receipt.md#Test deliveries"],
    ],
    failures: [
      "The chase asks for a recovery plan and revised commitment, but omits the explicit expiring line-hold/capacity question required by the suite.",
    ],
    review_note: "The chase is useful and routed to Aisha, but one required capacity-protection question is missing.",
  },
  "FEAT-0004": {
    cadence: "daily",
    tier: "C",
    met: [false, false, false, true, true],
    evidence: [
      ["daily/review/daily-review-result-2026-08-24.json#/knowledge_updates"],
      ["daily/review/daily-review-result-2026-08-24.json#/knowledge_updates"],
      ["daily/review/daily-review-result-2026-08-24.json#/knowledge_updates/1", "daily/review/daily-review-result-2026-08-24.json#/completed_ticket_comments/0"],
      ["daily/review/daily-review-result-2026-08-24.json#/knowledge_updates"],
      ["daily/review/daily-review-result-2026-08-24.json#/knowledge_updates"],
    ],
    failures: [
      "The run produced knowledge for TASK-101, TASK-102, and TASK-115, not the suite's TASK-201 and TASK-203 workflow examples.",
      "TASK-102 produced both a problem entry and a question, while the current assertion expects no knowledge and only a defect-evidence question.",
    ],
    review_note: "The W34 run has useful knowledge extraction, but it does not satisfy the current FEAT-0004 case contract.",
  },
  "FEAT-0005": {
    cadence: "weekly",
    tier: "C",
    met: [true, true, true, false, true],
    evidence: [
      ["weekly/weekly-review-result-2026-W34.json#/project_reports_finalized"],
      ["weekly/weekly-review-result-2026-W34.json#/project_reports_finalized", "seed/reports.json#RPT-PROJ-CMT-CMT_PIPELINE-W33"],
      ["weekly/weekly-review-result-2026-W34.json#/department_reports_created", "weekly/weekly-review-result-2026-W34.json#/company_report_created/source_reports"],
      ["weekly/weekly-review-result-2026-W34.json#/company_report_created/status", "weekly/weekly-review-result-2026-W34.json#/source_gaps"],
      ["weekly/area-cmt-body.md", "weekly/area-ecom-body.md", "weekly/area-mkt-body.md", "weekly/company-body.md"],
    ],
    failures: [
      "The suite expects the Company report to refuse Final while a Content input is missing; the operated result marks the Company report Final and records no Content source gap.",
    ],
    review_note: "Report rollup happened, but the current finalization-gate assertion is not what this operated run did.",
  },
  "FEAT-0006": {
    cadence: "weekly",
    tier: "C",
    met: [true, false, false, false, false, false, true],
    evidence: [
      ["weekly/weekly-review-result-2026-W34.json#/promotions"],
      ["weekly/weekly-review-result-2026-W34.json#/promotions/decisions/0", "weekly/weekly-review-result-2026-W34.json#/promotions/issues/0"],
      ["weekly/weekly-review-result-2026-W34.json#/promotions"],
      ["weekly/weekly-review-result-2026-W34.json#/promotions/sops_retained"],
      ["weekly/work-query.json", "weekly/weekly-finalization-plan-2026-W34.md#Input Draft"],
      ["weekly/weekly-review-result-2026-W34.json#/promotions"],
      ["weekly/decision-deepavali-offer-wording.md", "weekly/issue-cmt-techpack-unsigned.md"],
    ],
    failures: [
      "The promoted Decision is a Deepavali offer-wording standard, not the suite's CMT sample-baseline decision with its required options and tradeoffs.",
      "The result does not cover the full disposition matrix in the current suite, including duplicate, dismissed, and blocked branches.",
      "Ecom SOP was retained for monitoring instead of promoted.",
      "The operated evidence includes a weekly/work-query.json artifact, conflicting with the assertion that Weekly never rescans raw Work.",
    ],
    review_note: "The promoted Decision and Issue are real, but FEAT-0006's broader promotion contract is not satisfied by this run.",
  },
  "FEAT-0007": {
    cadence: "weekly",
    tier: "B",
    met: [true, false, true, true, true],
    evidence: [
      ["weekly/weekly-review-result-2026-W34.json#/project_attention_updated"],
      ["weekly/cmt-project-attention-w35.md", "weekly/cmt-project-full-w35.md"],
      ["weekly/cmt-project-attention-w35.md", "weekly/weekly-review-result-2026-W34.json#/project_attention_updated/2"],
      ["weekly/weekly-finalization-plan-2026-W34.md#Project reports", "weekly/work-query.json"],
      ["weekly/weekly-review-result-2026-W34.json#/project_attention_updated"],
    ],
    failures: [
      "The operated run preserves the replacement and read-back text, but does not preserve the exact expected-current checklist needed to prove the guarded comparison.",
    ],
    review_note: "The CMT carry-forward is canonical and source-linked, but the expected-current guard is not independently inspectable in this run bundle.",
  },
};

for (const [featureId, verdict] of Object.entries(verdicts)) {
  const assertions = assertionsFor(verdict.cadence, featureId);
  if (assertions.length !== verdict.met.length) {
    throw new Error(`${featureId} assertion count mismatch.`);
  }
  const outPath = resolve(operatedRoot, verdict.cadence, `eval/judges/${featureId}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({
    target: featureId,
    tier: verdict.tier,
    assertions: assertions.map((assertion, index) => ({
      assertion,
      met: verdict.met[index],
      evidence: verdict.evidence[index],
    })),
    failures: verdict.failures,
    review_note: verdict.review_note,
  }, null, 2)}\n`);
}

process.stdout.write(JSON.stringify({ wrote: Object.keys(verdicts).length, operatedRoot }, null, 2) + "\n");

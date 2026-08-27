import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ArtifactQualityReviewSchema } from "../../../schemas/automations/artifact-quality-review.zod.mjs";
import { SeedRealismReviewSchema } from "../../../evals/schemas/seed-realism-review.zod.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const rows = (result, keys) => keys.flatMap((key) => (result[key] || []).map((_, index) => `/${key}/${index}`));
const exactCoverage = (observed, expected, label) => {
  const sorted = [...observed].sort();
  const wanted = [...expected].sort();
  if (new Set(sorted).size !== sorted.length || JSON.stringify(sorted) !== JSON.stringify(wanted)) throw new Error(`${label} must cover every target exactly once; expected=[${wanted.join(", ")}], observed=[${sorted.join(", ")}].`);
};

export function validateArtifactQualityReview({ rawReview, result, resultBytes, scope, expectedReviewPath }) {
  const parsed = ArtifactQualityReviewSchema.safeParse(rawReview);
  if (!parsed.success) throw new Error(`artifact quality review failed Zod validation: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const review = parsed.data;
  if (review.scope !== scope || review.context_id !== result.context_id || review.result_sha256 !== hash(resultBytes)) throw new Error("artifact quality review is not bound to the exact result and context.");
  if (!isAbsolute(review.review_path) || review.review_path !== resolve(expectedReviewPath)) throw new Error(`artifact quality review_path must equal ${resolve(expectedReviewPath)}.`);
  const keys = scope === "daily"
    ? ["project_updates", "documentation_reviews", "weekly_progress_chases", "knowledge_updates"]
    : ["report_results", "promotion_dispositions", "next_week_project_replacements", "configuration_gaps"];
  exactCoverage(review.artifacts.map((row) => row.artifact_pointer), rows(result, keys), "artifact quality review");
  return { pass: review.tier === "A" && review.verdict === "pass", tier: review.tier };
}

export function validateSeedRealismReview({ rawReview, seed, seedBytes, seedSha256, expectedReviewPath }) {
  const parsed = SeedRealismReviewSchema.safeParse(rawReview);
  if (!parsed.success) throw new Error(`seed realism review failed Zod validation: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const review = parsed.data;
  const expectedSeedSha256 = seedSha256 || hash(seedBytes);
  if (review.seed_id !== seed.seed_id || review.seed_sha256 !== expectedSeedSha256) throw new Error("seed realism review is not bound to the exact seed.");
  const expectedRelativePath = relative(projectRoot, resolve(expectedReviewPath)).replaceAll("\\", "/");
  if (expectedRelativePath.startsWith("../") || review.review_path !== expectedRelativePath) throw new Error(`seed realism review_path must equal ${expectedRelativePath}.`);
  const entityIds = ["projects", "people", "work_items", "meetings", "reports"]
    .flatMap((group) => seed.entities[group].map((entity) => entity.id));
  const caseIds = seed.pipeline_cases.map((item) => item.feature_id);
  exactCoverage(review.entity_reviews.map((row) => row.target_id), entityIds, "seed entity review");
  exactCoverage(review.case_reviews.map((row) => row.target_id), caseIds, "seed case review");
  if (review.tier !== "A" || review.verdict !== "pass") throw new Error(`seed realism review must pass at tier A; received ${review.tier}/${review.verdict}.`);
  return { pass: true, tier: review.tier, seed_sha256: review.seed_sha256 };
}

export function loadAndValidateSeedRealismReview({ seed, seedSha256, reviewPath }) {
  return validateSeedRealismReview({
    rawReview: JSON.parse(readFileSync(reviewPath, "utf8")),
    seed,
    seedSha256,
    expectedReviewPath: reviewPath,
  });
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadKamdarSeedConfig } from "../scripts/kamdar-seed-config.mjs";
import { validateSeedRealismReview } from "../scripts/quality-review-contracts.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const seedPath = resolve(projectRoot, "evals/seed/kamdar-company-os.seed.json");
const reviewPath = resolve(projectRoot, "evals/seed/kamdar-company-os.seed-review.json");
const raw = () => JSON.parse(readFileSync(reviewPath, "utf8"));

test("the seed realism approval binds the exact seed and covers every entity and case", () => {
  assert.deepEqual(validateSeedRealismReview({ rawReview: raw(), seed: loadKamdarSeedConfig(), seedBytes: readFileSync(seedPath), expectedReviewPath: reviewPath }), {
    pass: true,
    tier: "A",
    seed_sha256: "a3a16c21568ccb5b25faf5e555e98b13f5cff0a5b7047257d89b39af60ceff7c",
  });
});

test("the seed realism gate rejects stale hashes and partial coverage", () => {
  const stale = raw();
  stale.seed_sha256 = "0".repeat(64);
  assert.throws(() => validateSeedRealismReview({ rawReview: stale, seed: loadKamdarSeedConfig(), seedBytes: readFileSync(seedPath), expectedReviewPath: reviewPath }), /not bound to the exact seed/);
  const partial = raw();
  partial.entity_reviews.pop();
  assert.throws(() => validateSeedRealismReview({ rawReview: partial, seed: loadKamdarSeedConfig(), seedBytes: readFileSync(seedPath), expectedReviewPath: reviewPath }), /must cover every target exactly once/);
});

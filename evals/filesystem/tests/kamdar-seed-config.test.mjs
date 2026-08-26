import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileKamdarSeedSnapshot,
  loadKamdarSeedConfig,
  validateKamdarSeedConfig,
} from "../scripts/kamdar-seed-config.mjs";
import { loadFrozenSnapshot } from "../scripts/template-first-kamdar.mjs";

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../seed/kamdar-company-os.seed.json");
function fixture() { return JSON.parse(readFileSync(configPath, "utf8")); }

test("the tracked seed stores only source and scenario facts", () => {
  const raw = fixture();
  const config = loadKamdarSeedConfig();
  const snapshot = compileKamdarSeedSnapshot(config);

  assert.equal(raw.schema_version, "kamdar-company-os-seed@4.0.0");
  assert.deepEqual(Object.keys(raw).sort(), ["capture", "clock", "entities", "environments", "pipeline_cases", "schema_version", "seed_id"]);
  assert.equal("templates" in raw, false);
  assert.equal("legacy_projection" in JSON.parse(JSON.stringify(raw)), false);
  assert.ok(readFileSync(configPath).length < 80_000);

  assert.equal(snapshot.projects.length, 7);
  assert.equal(snapshot.people.length, 6);
  assert.equal(snapshot.work_items.length, 13);
  assert.equal(snapshot.work_items.filter((item) => item.type === "Meeting").length, 3);
  assert.equal(snapshot.reports.length, 4);
  assert.equal(snapshot.source_gaps.length, 1);
  assert.equal(snapshot.projects.filter((item) => item.active).length, 7);
  const rows = Object.values(raw.entities).flat();
  assert.equal(rows.every((row) => typeof row.body === "string" && row.body.startsWith("## ")), true);
  assert.equal(rows.every((row) => !/^---|^# /m.test(row.body)), true);
  assert.deepEqual(raw.pipeline_cases.map((item) => item.feature_id), [
    "FEAT-0001", "FEAT-0002", "FEAT-0003", "FEAT-0004",
    "FEAT-0005", "FEAT-0006", "FEAT-0007",
  ]);
});

test("every feature case keeps one useful showcase and its controls", () => {
  const raw = fixture();
  const config = loadKamdarSeedConfig();
  const entity = (id) => [
    ...config.entities.projects,
    ...config.entities.work_items,
    ...config.entities.meetings,
    ...config.entities.reports,
  ].find((item) => item.id === id);

  const cmt = entity("PROJ-CMT-CMT_PIPELINE");
  assert.equal((cmt.body.match(/^- \[[ x]\]/gm) || []).length, 4);
  assert.match(cmt.properties.progress, /tech pack and measurement tolerances/);

  assert.ok((entity("TASK-115").body.match(/^### Documentation missing$/m)));
  assert.equal(entity("TASK-116").body.includes("### Documentation missing"), false);
  assert.match(entity("TASK-101").body, /Aisha 18\/8/);
  assert.match(entity("TASK-115").body, /Screenshot is in the WhatsApp thread/);
  assert.match(entity("TASK-102").body, /not 100% sure/);
  const completedControl = entity("TASK-122");
  assert.equal(completedControl.properties.status, "Processed");
  assert.equal(completedControl.metadata.daily_review_version, "daily-review-v1");
  for (const work of fixture().entities.work_items.filter((item) => item.properties.status === "Done")) {
    assert.equal(work.metadata.daily_review_version, null, `${work.id} must remain eligible for Daily processing`);
  }
  assert.ok(config.entities.meetings.every((item) => item.metadata.daily_review_version === null));

  const drafts = config.entities.reports.filter((item) => item.properties.report_status === "Draft");
  assert.equal(drafts.length, 3);
  for (const draft of drafts) for (const section of [
    "Summary", "Outcomes and open attention", "Problems and inefficiencies",
    "Decisions", "SOPs", "Next-week priorities", "Automation receipt",
  ]) assert.ok(draft.body.includes(`## ${section}`), `${draft.id} needs ${section}`);

  const cases = Object.fromEntries(raw.pipeline_cases.map((item) => [item.feature_id, item]));
  assert.match(cases["FEAT-0005"].shows.join(" "), /complete Company report/);
  assert.match(cases["FEAT-0006"].shows.join(" "), /not raw Work/);
  assert.equal(fixture().entities.work_items.find((item) => item.id === "TASK-122").metadata.daily_review_version, "daily-review-v1");
});

test("captured Projects are grounded while synthetic operating facts stay explicit", () => {
  const raw = fixture();
  const expectedProjects = [
    ["PROJ-CMT-CMT_PIPELINE", "CMT Pipeline", "CMT (Cut Make Trim)"],
    ["PROJ-MERCH-INDIA_SOURCING", "India Sourcing", "Merchandising"],
    ["PROJ-MKT-DEEPAVALI_MARKETING", "Deepavali Marketing", "Marketing"],
    ["PROJ-MKT-WEEKLY_META_ADS_UPDATES", "Weekly Meta Ads Updates", "Marketing"],
    ["PROJ-ECOM-ECOM_FIXES", "Ecom Fixes", "Ecommerce"],
    ["PROJ-ECOM-LISTING_PIPELINE", "Listing Pipeline", "Ecommerce"],
    ["PROJ-DTC-KALRAH_LAUNCH", "kalrah launch", "DTC Brands"],
  ];
  assert.deepEqual(raw.entities.projects.map((row) => [row.id, row.properties.name, row.properties.department]), expectedProjects);
  for (const row of raw.entities.projects) assert.deepEqual(row.metadata.provenance, {
    project_name: "captured",
    department: "captured",
    operating_scenario: "synthetic_eval",
  });
  for (const row of [...raw.entities.people, ...raw.entities.work_items, ...raw.entities.meetings, ...raw.entities.reports]) {
    assert.equal(row.metadata.provenance.operating_scenario, "synthetic_eval");
  }
  assert.equal(JSON.stringify(raw).includes("Festive E-commerce Launch"), false);
  assert.equal(JSON.stringify(raw).includes("Penang Replenishment Accuracy"), false);
  assert.equal(JSON.stringify(raw).includes("release QA"), false);
});

test("fictional People use representative approved test routes without tracked addresses", () => {
  const people = fixture().entities.people;
  assert.equal(people.length, 6);
  const emailRoutes = new Map([
    ["PERSON-AISHA", "operator_primary_email"],
    ["PERSON-JUN", "operator_secondary_email"]
  ]);
  for (const person of people) {
    const emailAlias = emailRoutes.get(person.id);
    if (emailAlias) {
      assert.equal(person.properties.preferred_contact_channel, "Email");
      assert.equal(person.properties.approved_contact_channels, "Email test sink; Telegram eval sink; Notion comment");
      assert.equal(person.properties.contact_endpoint, emailAlias);
      assert.match(person.properties.contact_instructions, new RegExp(emailAlias));
    } else {
      assert.equal(person.properties.preferred_contact_channel, "Telegram");
      assert.equal(person.properties.approved_contact_channels, "Telegram eval sink; Notion comment");
      assert.equal(person.properties.contact_endpoint, "telegram");
      assert.match(person.properties.contact_instructions, /operator-owned Telegram test sink/);
    }
    assert.match(person.properties.contact_instructions, new RegExp(`Intended for ${person.properties.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(person.body, /fictional eval Person, not a real employee contact/);
  }
  assert.doesNotMatch(JSON.stringify(people), /@outlook\.com/i);
});

test("every Project checklist citation resolves to Work on that Project", () => {
  const config = loadKamdarSeedConfig();
  const workById = new Map([...config.entities.work_items, ...config.entities.meetings].map((item) => [item.id, item]));
  for (const project of config.entities.projects) {
    const text = project.body;
    for (const workId of [...new Set([...text.matchAll(/TASK-\d+/g)].map((match) => match[0]))]) {
      const work = workById.get(workId);
      assert.ok(work, `${project.id} references missing ${workId}`);
      assert.equal(work.properties.project, project.id);
    }
  }
});

test("every Project Draft citation resolves to Work on that Project", () => {
  const config = loadKamdarSeedConfig();
  const workById = new Map([...config.entities.work_items, ...config.entities.meetings].map((item) => [item.id, item]));
  for (const draft of config.entities.reports.filter((item) => item.properties.report_status === "Draft")) {
    const text = `${draft.properties.source_report_ids || ""}\n${JSON.stringify(draft.body)}`;
    for (const workId of [...new Set([...text.matchAll(/TASK-\d+/g)].map((match) => match[0]))]) {
      const work = workById.get(workId);
      assert.ok(work, `${draft.id} cites missing ${workId}`);
      assert.equal(work.properties.project, draft.properties.project);
    }
  }
});

test("the frozen evaluator consumes the compact seed", () => {
  const snapshot = loadFrozenSnapshot();
  assert.equal(snapshot.projects.length, 7);
  assert.equal(snapshot.people.length, 6);
  assert.equal(snapshot.work_items.length, 13);
  assert.equal(snapshot.source_gaps.length, 1);
});

test("the seed rejects fields that do not belong to its compact entity contract", () => {
  const config = fixture();
  config.entities.work_items[0].properties.evidence = "Invented database field";
  assert.throws(() => validateKamdarSeedConfig(config), /properties not owned by task.md: evidence/);

  const wrongDate = fixture();
  wrongDate.entities.work_items[0].properties.due_date = 20260820;
  assert.throws(() => validateKamdarSeedConfig(wrongDate), /due_date must be an ISO local date/);
});

test("the seed rejects private endpoints and incomplete feature coverage", () => {
  const withEndpoint = fixture();
  withEndpoint.entities.people[0].properties.contact_endpoint = "person@example.test";
  assert.throws(() => validateKamdarSeedConfig(withEndpoint), /contact endpoint or mention/);

  const missingCase = fixture();
  missingCase.pipeline_cases.pop();
  assert.throws(() => validateKamdarSeedConfig(missingCase), /must cover FEAT-0001 through FEAT-0007 exactly once/);
});

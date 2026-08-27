import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  throw new Error(`Seed evidence viewer: ${message}`);
}

function readJson(path, label = path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function asArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
  return value;
}

function asText(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be non-empty text.`);
  return value;
}

function asHttpUrl(value, label) {
  const text = asText(value, label);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    fail(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    fail(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  return text;
}

function loadSeed(projectRoot) {
  const seedRoot = resolve(projectRoot, "seed");
  const manifest = readJson(resolve(seedRoot, "manifest.json"), "seed manifest");
  const tableKinds = {
    projects: "project",
    people: "person",
    work_items: "work",
    meetings: "meeting",
    reports: "report",
  };
  const entities = new Map();

  for (const [table, kind] of Object.entries(tableKinds)) {
    const relativePath = asText(manifest.tables?.[table], `seed manifest table ${table}`);
    if (relativePath.includes("/") || relativePath.includes("\\") || relativePath === "." || relativePath === "..") {
      fail(`seed manifest table ${table} must be a file inside seed/.`);
    }
    const rows = asArray(readJson(resolve(seedRoot, relativePath), `seed table ${table}`), `seed table ${table}`);
    for (const record of rows) {
      const id = asText(record?.id, `${table} record id`);
      if (entities.has(id)) fail(`duplicate seed entity ID ${id}.`);
      entities.set(id, {
        id,
        kind,
        name: record.properties?.name || id,
        status: record.properties?.status || record.properties?.report_status || "",
        record,
      });
    }
  }

  const scenariosPath = asText(manifest.tables?.pipeline_cases, "seed manifest table pipeline_cases");
  const scenarios = asArray(readJson(resolve(seedRoot, scenariosPath), "seed scenarios"), "seed scenarios");
  return { entities, scenarios: new Map(scenarios.map((row) => [row.feature_id, row])) };
}

function loadSuites(projectRoot) {
  return [
    { cadence: "daily", suite: readJson(resolve(projectRoot, "evals/daily/suite.json"), "Daily suite") },
    { cadence: "weekly", suite: readJson(resolve(projectRoot, "evals/weekly/suite.json"), "Weekly suite") },
    { cadence: "meeting", suite: readJson(resolve(projectRoot, "evals/meeting-intake/suite.json"), "Meeting Intake suite") },
  ];
}

function loadJudge(runRoot, feature) {
  if (!runRoot) {
    return {
      status: "unjudged",
      note: "No matching feature judge was supplied.",
      assertions: feature.assertions.map((assertion) => ({ assertion, status: "unjudged", evidence: [] })),
    };
  }
  const path = resolve(runRoot, `eval/judges/${feature.feature_id}.json`);
  if (!existsSync(path)) {
    return {
      status: "unjudged",
      note: "No matching feature judge was supplied.",
      assertions: feature.assertions.map((assertion) => ({ assertion, status: "unjudged", evidence: [] })),
    };
  }

  const judge = readJson(path, `${feature.feature_id} judge`);
  if (judge.target !== feature.feature_id) fail(`${feature.feature_id} judge targets ${judge.target || "nothing"}.`);
  const rows = asArray(judge.assertions, `${feature.feature_id} judge assertions`);
  if (rows.length !== feature.assertions.length) fail(`${feature.feature_id} judge assertion count does not match the suite.`);
  const assertions = feature.assertions.map((assertion, index) => {
    const row = rows[index];
    if (row?.assertion !== assertion || typeof row.met !== "boolean") {
      fail(`${feature.feature_id} judge assertion ${index + 1} does not match the suite.`);
    }
    return {
      assertion,
      status: row.met ? "pass" : "fail",
      evidence: Array.isArray(row.evidence) ? row.evidence.filter((item) => typeof item === "string") : [],
    };
  });
  const passed = judge.tier === "A" && assertions.every((row) => row.status === "pass");
  return {
    status: passed ? "pass" : "fail",
    note: passed ? "Tier A feature judge; every required assertion passed." : `Feature judge tier ${judge.tier || "unknown"}.`,
    assertions,
  };
}

function loadOutputs(evidencePath) {
  if (!evidencePath) return { rootUrl: null, byFeature: new Map() };
  const evidence = readJson(evidencePath, "operated evidence");
  const byFeature = new Map();
  for (const feature of asArray(evidence.features, "operated evidence features")) {
    const featureId = asText(feature.feature_id, "operated evidence feature_id");
    const outputs = [];
    for (const evaluationCase of asArray(feature.cases, `${featureId} evidence cases`)) {
      for (const artifact of asArray(evaluationCase.output_artifacts, `${featureId} output_artifacts`)) {
        const url = asHttpUrl(artifact.url, `${featureId} output URL`);
        outputs.push({
          id: asText(artifact.id, `${featureId} output ID`),
          caseId: asText(evaluationCase.case_id, `${featureId} case ID`),
          label: asText(artifact.label, `${featureId} output label`),
          kind: asText(artifact.kind, `${featureId} output kind`),
          state: artifact.state || "linked",
          url,
          accessNote: artifact.access_note || "",
        });
      }
    }
    byFeature.set(featureId, outputs);
  }
  return { rootUrl: evidence.root_url ? asHttpUrl(evidence.root_url, "operated evidence root_url") : null, byFeature };
}

export function buildEvidenceModel({ projectRoot, evidencePath = null, dailyRunRoot = null, weeklyRunRoot = null, meetingRunRoot = null }) {
  const seed = loadSeed(projectRoot);
  const suites = loadSuites(projectRoot);
  const outputs = loadOutputs(evidencePath);
  const seenFeatures = new Set();
  const features = [];

  for (const { cadence, suite } of suites) {
    for (const feature of asArray(suite.features, `${cadence} features`)) {
      const featureId = asText(feature.feature_id, `${cadence} feature ID`);
      if (seenFeatures.has(featureId)) fail(`duplicate feature ${featureId}.`);
      seenFeatures.add(featureId);
      const scenario = seed.scenarios.get(featureId);
      if (!scenario) fail(`${featureId} has no seed scenario.`);
      const sources = asArray(feature.entity_ids, `${featureId} entity_ids`).map((id) => {
        const entity = seed.entities.get(id);
        if (!entity) fail(`${featureId} references missing seed entity ${id}.`);
        return entity;
      });
      const cases = asArray(suite.evals, `${cadence} eval cases`)
        .filter((row) => row.metadata?.extensions?.kamdar?.feature_ids?.includes(featureId))
        .map((row) => ({
          id: row.id,
          title: row.metadata?.title || row.id,
          expectedOutput: row.expected_output,
        }));
      if (!cases.length) fail(`${featureId} has no eval cases.`);
      const runRoot = cadence === "daily" ? dailyRunRoot : cadence === "weekly" ? weeklyRunRoot : meetingRunRoot;
      const judge = loadJudge(runRoot, feature);
      features.push({
        id: featureId,
        cadence,
        name: scenario.name,
        claim: feature.claim,
        sources,
        cases,
        outputs: outputs.byFeature.get(featureId) || [],
        status: judge.status,
        statusNote: judge.note,
        assertions: judge.assertions,
      });
    }
  }

  const assertions = features.flatMap((feature) => feature.assertions);
  const linkedOutputs = features.flatMap((feature) => feature.outputs).filter((artifact) => artifact.state === "linked");
  const uniqueCases = new Set(features.flatMap((feature) => feature.cases.map((evaluationCase) => evaluationCase.id)));
  return {
    schemaVersion: "kamdar-seed-evidence-viewer@1.0.0",
    generatedAt: new Date().toISOString(),
    rootOutputUrl: outputs.rootUrl,
    metrics: {
      features: { total: features.length, passed: features.filter((feature) => feature.status === "pass").length },
      cases: { total: uniqueCases.size },
      checks: { total: assertions.length, passed: assertions.filter((row) => row.status === "pass").length },
      outputs: { total: linkedOutputs.length },
    },
    features,
  };
}

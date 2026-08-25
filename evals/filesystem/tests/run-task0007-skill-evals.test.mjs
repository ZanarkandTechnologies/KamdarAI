import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildCalibrationPrompt,
  buildJudgePrompt,
  inspectTask0007SkillEvals,
  parseJudge,
  runTask0007SkillEvals,
  taskSkillNames
} from "../scripts/run-task0007-skill-evals.mjs";

function temporaryRoot(t) {
  const root = mkdtempSync(resolve(tmpdir(), "task0007-skill-evals-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("TASK-0007 owns seven independently shaped normal/hard/boundary skill evals", () => {
  const inspection = inspectTask0007SkillEvals();
  assert.equal(inspection.skills.length, taskSkillNames.length);
  assert.equal(inspection.counts.cases, 21);
  for (const skill of inspection.skills) {
    assert.deepEqual(skill.cases.map((entry) => entry.kind).sort(), ["boundary", "hard", "normal"]);
    assert.match(skill.source_hash, /^[a-f0-9]{64}$/);
  }
});

test("candidate and baseline calibration prompts share source input while golden outputs stay outside the model prompt", () => {
  const skill = inspectTask0007SkillEvals().skills[0];
  const normal = skill.cases.find((entry) => entry.kind === "normal");
  const candidate = buildCalibrationPrompt({ skill, evaluationCase: normal, candidate: true });
  const baseline = buildCalibrationPrompt({ skill, evaluationCase: normal, candidate: false });
  assert.match(candidate, /Candidate skill contract:/);
  assert.doesNotMatch(baseline, /Candidate skill contract:/);
  for (const fixture of normal.fixtures.filter((fixture) => !fixture.includes("/examples/golden/") && !fixture.includes("/templates/"))) {
    assert.match(candidate, new RegExp(fixture.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(baseline, new RegExp(fixture.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(candidate, /golden project diff plan/i);
  assert.doesNotMatch(baseline, /golden project diff plan/i);
  assert.match(buildJudgePrompt({ skill, evaluationCase: normal, candidateOutput: "candidate", baselineOutput: "baseline" }), /\"tier\"/);
});

test("static mode emits a source-safe 21-case report without invoking Hermes", (t) => {
  const outputRoot = temporaryRoot(t);
  const report = runTask0007SkillEvals({ outputRoot });
  assert.equal(report.verdict, "pass");
  assert.equal(report.calibrations.length, 0);
  assert.equal(report.inspection.counts.cases, 21);
  assert.equal(existsSync(resolve(outputRoot, "summary.json")), true);
  assert.equal(JSON.parse(readFileSync(resolve(outputRoot, "summary.json"), "utf8")).side_effect_boundary.includes("no provider tools"), true);
});

test("a named calibration selection stays inside the seven owned packages", (t) => {
  const outputRoot = temporaryRoot(t);
  const calls = [];
  const commandRunner = (_command, args) => {
    calls.push(args);
    const prompt = args.at(-1);
    if (prompt.includes("strict evaluator")) return { status: 0, stdout: '{"tier":"A","candidate_checks":[],"baseline_checks":[],"winner":"candidate","reason":"ok"}' };
    return { status: 0, stdout: "artifact" };
  };
  const report = runTask0007SkillEvals({ outputRoot, calibratePipelines: true, calibrationSkillNames: ["apply-project-diffs"], commandRunner });
  assert.equal(report.calibrations.length, 1);
  assert.equal(report.calibrations[0].skill_name, "apply-project-diffs");
  assert.equal(calls.length, 3);
});

test("judge parser accepts a final valid verdict after harmless model preamble", () => {
  const verdict = parseJudge('I checked the artifacts.\n```json\n{"tier":"A","candidate_checks":[],"baseline_checks":[],"winner":"candidate","reason":"visible evidence passes"}\n```');
  assert.equal(verdict.tier, "A");
  assert.equal(verdict.winner, "candidate");
});

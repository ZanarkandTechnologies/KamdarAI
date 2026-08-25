/**
 * Reproducible first-pass evaluator for TASK-0007 skill packages.
 *
 * Static mode validates every normal/hard/boundary contract without invoking a
 * model. Calibration mode additionally runs the normal case for the four Daily
 * pipeline skills against the same Hermes profile twice: candidate instructions
 * present versus absent. A third isolated judge produces an A-D comparison.
 * No eval run receives provider tools, credentials, or a live workspace.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "../../..");
export const taskSkillNames = Object.freeze([
  "daily-project-memory",
  "daily-documentation-quality",
  "daily-project-control",
  "daily-knowledge-capture",
  "apply-project-diffs",
  "dispatch-employee-messages",
  "weekly-report-finalization"
]);
export const dailyPipelineNames = new Set(taskSkillNames.slice(0, 4));

function stable(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function fail(message) { throw new Error(`TASK-0007 skill eval: ${message}`); }
function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${relative(projectRoot, path)} is not valid JSON: ${error.message}`); }
}
function assertInsideProject(path, label) {
  const relativePath = relative(projectRoot, path);
  if (!relativePath || relativePath.startsWith("..")) fail(`${label} resolves outside the source repository.`);
}
function resolveFixture(skillDirectory, sourcePath) {
  const resolved = resolve(skillDirectory, sourcePath);
  assertInsideProject(resolved, `fixture ${sourcePath}`);
  if (!existsSync(resolved)) fail(`fixture ${sourcePath} is missing for ${relative(projectRoot, skillDirectory)}.`);
  return resolved;
}
function sourceHash(paths) {
  return sha256(paths.map((path) => `${relative(projectRoot, path)}\n${readFileSync(path, "utf8")}`).join("\n---\n"));
}

export function inspectTaskSkill(skillName) {
  if (!taskSkillNames.includes(skillName)) fail(`unknown owned skill ${skillName}.`);
  const directory = resolve(projectRoot, "skills", skillName);
  const skillPath = resolve(directory, "SKILL.md");
  const evalPath = resolve(directory, "evals/evals.json");
  if (!existsSync(skillPath) || !existsSync(evalPath)) fail(`${skillName} needs SKILL.md and evals/evals.json.`);
  const skill = readFileSync(skillPath, "utf8");
  const evaluation = readJson(evalPath);
  if (evaluation.skill_name !== skillName) fail(`${skillName} eval name does not match its package.`);
  if (!Array.isArray(evaluation.evals) || evaluation.evals.length !== 3) fail(`${skillName} must own exactly three first-pass cases.`);
  const kinds = evaluation.evals.map((item) => item.kind).sort();
  if (JSON.stringify(kinds) !== JSON.stringify(["boundary", "hard", "normal"])) {
    fail(`${skillName} must label one normal, one hard, and one boundary case.`);
  }
  const cases = evaluation.evals.map((item) => {
    if (!item?.id || !item.prompt || !item.expected_output || !Array.isArray(item.assertions) || !item.assertions.length) {
      fail(`${skillName} has an incomplete eval case.`);
    }
    const fixtures = (item.files || []).map((sourcePath) => resolveFixture(directory, sourcePath));
    return { ...item, fixtures: fixtures.map((path) => relative(projectRoot, path)) };
  });
  const localTemplateDirectory = resolve(directory, "templates");
  const localGoldenDirectory = resolve(directory, "examples/golden");
  const hasLocalTemplate = existsSync(localTemplateDirectory) && readdirSync(localTemplateDirectory).length > 0;
  const hasSharedRecordTemplate = skill.includes("../../automations/templates/");
  if (!hasLocalTemplate && !hasSharedRecordTemplate) fail(`${skillName} has no local output template or declared shared record template.`);
  if (!existsSync(localGoldenDirectory) || !readdirSync(localGoldenDirectory).length) fail(`${skillName} has no golden fixture.`);
  if (!evaluation.extensions?.calibration?.runner || !evaluation.extensions?.calibration?.rerun_rule && !evaluation.rerun_rule) {
    fail(`${skillName} lacks a calibration runner or rerun rule.`);
  }
  const referenced = [skillPath, evalPath, ...cases.flatMap((item) => item.fixtures.map((path) => resolve(projectRoot, path)))];
  return {
    skill_name: skillName,
    capability_kind: skill.match(/capability:\n\s+kind:\s*([^\n]+)/)?.[1]?.trim() || "unknown",
    artifact_contract: evaluation.artifact_contract,
    files: { skill: relative(projectRoot, skillPath), evals: relative(projectRoot, evalPath) },
    cases,
    source_hash: sourceHash(referenced)
  };
}

export function inspectTask0007SkillEvals() {
  const skills = taskSkillNames.map(inspectTaskSkill);
  return {
    schema_version: 1,
    kind: "task0007-skill-eval-inspection",
    skills,
    counts: {
      skills: skills.length,
      cases: skills.reduce((sum, skill) => sum + skill.cases.length, 0),
      normal: skills.length,
      hard: skills.length,
      boundary: skills.length
    }
  };
}

function fixtureBlock(evaluationCase, { include = () => true } = {}) {
  return evaluationCase.fixtures.filter(include).map((relativePath) => {
    const absolutePath = resolve(projectRoot, relativePath);
    return `--- ${relativePath} ---\n${readFileSync(absolutePath, "utf8")}`;
  }).join("\n\n");
}

function candidateContract(skill) {
  const source = readFileSync(resolve(projectRoot, skill.files.skill), "utf8");
  const signature = source.match(/## Skill Signature\n([\s\S]*?)(?=\n<!--|\n## |$)/)?.[0] || "";
  const rules = [...source.matchAll(/\n\s*Rule:\s*([\s\S]*?)(?=\n\s*Assert:)/g)]
    .map((match) => `- ${match[1].replace(/\s+/g, " ").trim()}`);
  const assertions = [...source.matchAll(/\n\s*Assert:\s*([\s\S]*?)(?=\n- \[ \]|\n<!-- END)/g)]
    .flatMap((match) => match[1].split("\n").map((line) => line.trim()).filter((line) => line.startsWith("- ")))
    .map((line) => `- ${line.slice(2)}`);
  const output = source.match(/## Output\n([\s\S]*?)$/)?.[0] || "";
  return [signature, rules.length ? `Mandatory rules:\n${rules.join("\n")}` : "", assertions.length ? `Mandatory assertions:\n${assertions.join("\n")}` : "", output].filter(Boolean).join("\n\n");
}

function isGoldenOutputFixture(path) {
  return path.includes("/examples/golden/") && !path.includes("daily-context-diff-");
}

function isInputFixture(path) {
  return !isGoldenOutputFixture(path) && !path.includes("/templates/");
}

function isCandidateReferenceFixture(path) {
  return !isGoldenOutputFixture(path);
}

export function buildCalibrationPrompt({ skill, evaluationCase, candidate }) {
  const blocks = [
    "This is a sandboxed, source-safe behavior evaluation. Do not call tools, do not fetch or send anything, and do not write files.",
    "Return only the requested artifact/result body. Do not wrap it in Markdown fences or add commentary. Keep the response under 100 lines.",
    "User request:",
    evaluationCase.prompt,
    "Source-safe fixtures:",
    fixtureBlock(evaluationCase, { include: candidate ? isCandidateReferenceFixture : isInputFixture })
  ];
  if (candidate) {
    blocks.push("Candidate skill contract:", candidateContract(skill));
  }
  return blocks.join("\n\n");
}

export function buildJudgePrompt({ skill, evaluationCase, candidateOutput, baselineOutput }) {
  return [
    "You are a strict evaluator comparing two sandboxed responses to the same artifact task.",
    "Judge visible evidence only. Do not assume missing facts. A is the only pass; B is a useful near miss; C is materially incomplete; D is unjudgeable.",
    "Return only valid JSON with this exact shape:",
    '{"tier":"A|B|C|D","candidate_checks":[{"assertion":"...","met":true|false,"evidence":"..."}],"baseline_checks":[{"assertion":"...","met":true|false,"evidence":"..."}],"winner":"candidate|baseline|tie","reason":"..."}',
    `Skill: ${skill.skill_name}`,
    `Task: ${evaluationCase.prompt}`,
    "Assertions:", evaluationCase.assertions.map((item) => `- ${item}`).join("\n"),
    "Candidate output:", candidateOutput || "[no output]",
    "Baseline output:", baselineOutput || "[no output]"
  ].join("\n\n");
}

function invokeHermes({ prompt, commandRunner = spawnSync, profile = "vishan-kamdar-ai", timeoutMs = 300000 }) {
  const result = commandRunner("hermes", [
    "-p", profile,
    "--safe-mode",
    "--reasoning", "none",
    "-z", prompt
  ], { cwd: projectRoot, encoding: "utf8", timeout: timeoutMs, maxBuffer: 2_000_000 });
  return {
    status: Number.isInteger(result.status) ? result.status : 1,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
    timed_out: Boolean(result.error?.code === "ETIMEDOUT")
  };
}

export function parseJudge(value) {
  const trimmed = String(value || "").trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(trimmed); }
  catch {
    // Some safe-mode calls add an explanation before an otherwise valid final
    // JSON object. Recover only a balanced object with the promised judge
    // shape; prose or a partial object is never a verdict.
    const candidates = [];
    for (let start = 0; start < trimmed.length; start += 1) {
      if (trimmed[start] !== "{") continue;
      let depth = 0; let quoted = false; let escaped = false;
      for (let end = start; end < trimmed.length; end += 1) {
        const character = trimmed[end];
        if (quoted) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') quoted = false;
          continue;
        }
        if (character === '"') { quoted = true; continue; }
        if (character === "{") depth += 1;
        if (character === "}") {
          depth -= 1;
          if (depth !== 0) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(start, end + 1));
            if (typeof parsed?.tier === "string" && Array.isArray(parsed?.candidate_checks) && Array.isArray(parsed?.baseline_checks)) candidates.push(parsed);
          } catch { /* Keep scanning for the final complete object. */ }
          break;
        }
      }
    }
    return candidates.at(-1) || { tier: "D", candidate_checks: [], baseline_checks: [], winner: "tie", reason: "Judge did not return valid JSON." };
  }
}

function ensureOutputRoot(outputRoot) {
  const resolved = outputRoot ? resolve(outputRoot) : mkdtempSync(resolve(tmpdir(), "task0007-skill-evals-"));
  if (existsSync(resolved) && !readdirSync(resolved).length) return resolved;
  if (existsSync(resolved) && outputRoot) fail(`output root already contains artifacts: ${resolved}`);
  mkdirSync(resolved, { recursive: true, mode: 0o700 });
  return resolved;
}

/** Run all static checks, with optional normal-case four-pipeline calibration. */
export function runTask0007SkillEvals({ outputRoot, calibratePipelines = false, calibrationSkillNames, commandRunner, profile } = {}) {
  const inspection = inspectTask0007SkillEvals();
  const root = ensureOutputRoot(outputRoot);
  const selectedNames = calibrationSkillNames ? new Set(calibrationSkillNames) : dailyPipelineNames;
  if (calibratePipelines && [...selectedNames].some((name) => !taskSkillNames.includes(name))) fail("calibration skill selection includes an unowned skill.");
  const report = {
    schema_version: 1,
    kind: "task0007-skill-eval-run",
    mode: calibratePipelines ? "static-plus-normal-case-calibration" : "static-contract",
    side_effect_boundary: "source fixtures and safe-mode model calls only; no provider tools or writes",
    inspection,
    calibrations: [],
    verdict: "pass",
    limitations: calibratePipelines
      ? ["Normal cases received candidate-versus-baseline model calibration; hard and boundary cases are structurally validated in this first run."]
      : ["Static mode validates all 27 case contracts but does not claim model behavior calibration."]
  };
  if (calibratePipelines) {
    for (const skill of inspection.skills.filter((entry) => selectedNames.has(entry.skill_name))) {
      const normal = skill.cases.find((entry) => entry.kind === "normal");
      const candidate = invokeHermes({ prompt: buildCalibrationPrompt({ skill, evaluationCase: normal, candidate: true }), commandRunner, profile });
      const baseline = invokeHermes({ prompt: buildCalibrationPrompt({ skill, evaluationCase: normal, candidate: false }), commandRunner, profile });
      const judgeRaw = invokeHermes({ prompt: buildJudgePrompt({ skill, evaluationCase: normal, candidateOutput: candidate.stdout, baselineOutput: baseline.stdout }), commandRunner, profile });
      const judge = parseJudge(judgeRaw.stdout);
      const calibration = {
        skill_name: skill.skill_name,
        case_id: normal.id,
        source_hash: skill.source_hash,
        candidate: { ...candidate, output_sha256: sha256(candidate.stdout) },
        baseline: { ...baseline, output_sha256: sha256(baseline.stdout) },
        judge: { ...judgeRaw, result: judge },
        verdict: candidate.status === 0 && baseline.status === 0 && judgeRaw.status === 0 && judge.tier === "A" ? "pass" : "needs-revision"
      };
      report.calibrations.push(calibration);
      if (calibration.verdict !== "pass") report.verdict = "needs-revision";
      writeFileSync(resolve(root, `${skill.skill_name}-normal-calibration.json`), stable(calibration), { mode: 0o600 });
    }
  }
  writeFileSync(resolve(root, "summary.json"), stable(report), { mode: 0o600 });
  return { ...report, output_root: root };
}

function parseArgs(argv) {
  const options = { calibratePipelines: false, outputRoot: null, calibrationSkillNames: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--calibrate-pipelines") options.calibratePipelines = true;
    else if (argument === "--calibrate-skills") {
      options.calibratePipelines = true;
      options.calibrationSkillNames = (argv[++index] || "").split(",").map((value) => value.trim()).filter(Boolean);
      if (!options.calibrationSkillNames.length) fail("--calibrate-skills needs one or more comma-separated owned skill names.");
    }
    else if (argument === "--output") options.outputRoot = argv[++index] || fail("--output needs a directory.");
    else fail("usage: node scripts/run-task0007-skill-evals.mjs [--calibrate-pipelines | --calibrate-skills <name,...>] [--output <directory>]");
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(stable(runTask0007SkillEvals(parseArgs(process.argv.slice(2)))));
  } catch (error) {
    process.stderr.write(stable({ status: "blocked", reason: error.message }));
    process.exitCode = 1;
  }
}

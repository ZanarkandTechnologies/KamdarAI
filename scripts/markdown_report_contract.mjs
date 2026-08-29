import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const PLACEHOLDER = /{{([^{}\n]+)}}/g;
const SENTENCE_END = /[.!?](?:\s|$)/g;
const PROTECTED_TOKEN = /(?:\b(?:[A-Z]{2,}(?:-[A-Z0-9]+)+|\d{4}-W\d{2}|\d{4}-\d{2}-\d{2})\b|\b\d+(?:\.\d+)?%?\b|\b(?:MYR|USD|EUR)\s*\d+(?:[.,]\d+)*\b|(?:https?:\/\/|[a-z]+:\/\/)[^\s)]+|\[[^\]]+\]\([^)]+\))/g;

const FieldBase = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  heading: z.string().trim().min(1),
  placeholder: z.string().trim().min(1).regex(/^[^{}\n]+$/),
  optional: z.boolean(),
  cleanup: z.boolean(),
  description: z.string().trim().min(1),
}).strict();

const ScalarField = FieldBase.extend({
  kind: z.literal("scalar"),
  sentences: z.number().int().positive().optional(),
});

const TableField = FieldBase.extend({
  kind: z.literal("table"),
  columns: z.array(z.object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    heading: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
  }).strict()).min(1),
  min_rows: z.number().int().nonnegative().optional(),
  max_rows: z.number().int().nonnegative().optional(),
}).superRefine((field, context) => {
  const keys = field.columns.map((column) => column.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: "custom", message: "column keys must be unique" });
  }
  if (field.min_rows !== undefined && field.max_rows !== undefined && field.max_rows < field.min_rows) {
    context.addIssue({ code: "custom", message: "max_rows must be greater than or equal to min_rows" });
  }
});

const InterpretationSchema = z.object({
  template_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  template_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  fields: z.array(z.discriminatedUnion("kind", [ScalarField, TableField])).min(1),
}).strict();

function normalize(value) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").trim();
}

function stripGoldenExample(comment) {
  return normalize(comment.replace(/GOLDEN EXAMPLE[\s\S]*?END GOLDEN EXAMPLE/gi, ""));
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error("Template must start with Markdown frontmatter.");
  const keys = match[1].split("\n").filter(Boolean).map((line) => line.match(/^([A-Za-z0-9_-]+):/)?.[1]).filter(Boolean);
  const values = Object.fromEntries(match[1].split("\n").map((line) => {
    const found = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    return found ? [found[1], found[2].replace(/^['\"]|['\"]$/g, "")] : ["", ""];
  }).filter(([key]) => key));
  return { raw: match[0], keys, values, body: markdown.slice(match[0].length) };
}

export function inspectMarkdownTemplate(markdown) {
  const frontmatter = parseFrontmatter(markdown);
  const headingMatches = [...frontmatter.body.matchAll(/^## (.+)$/gm)];
  const sections = headingMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = headingMatches[index + 1]?.index ?? frontmatter.body.length;
    const source = frontmatter.body.slice(start, end).trim();
    const comment = source.match(/^<!--([\s\S]*?)-->/)?.[1] ?? "";
    const table = source.match(/^\|(.+)\|\n\|(?:\s*:?-+)/m);
    const columns = table ? table[1].split("|").map((item) => item.trim()) : [];
    const placeholders = [...source.matchAll(PLACEHOLDER)].map((item) => item[1]);
    const golden = comment.match(/GOLDEN EXAMPLE[^\n]*\n([\s\S]*?)\nEND GOLDEN EXAMPLE/i)?.[1]?.trim() ?? null;
    return {
      heading: match[1].trim(),
      instruction: stripGoldenExample(comment),
      raw_instruction: normalize(comment),
      columns,
      placeholders: [...new Set(placeholders)],
      golden_example: golden,
    };
  });
  return {
    template_id: frontmatter.values.template_id,
    template_version: frontmatter.values.template_version,
    frontmatter_keys: frontmatter.keys,
    sections,
  };
}

function fail(issues) {
  const error = new Error(`Template interpretation is ambiguous or incompatible:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  error.name = "TemplateContractError";
  error.issues = issues;
  throw error;
}

function scalarSchema(field) {
  let schema = z.string().trim().min(1).describe(field.description);
  if (field.sentences) {
    schema = schema.refine((value) => (value.match(SENTENCE_END) ?? []).length === field.sentences, {
      message: `${field.name} must contain exactly ${field.sentences} sentences.`,
    });
  }
  return field.optional ? schema.optional() : schema;
}

function rowSchema(field) {
  const shape = Object.fromEntries(field.columns.map((column) => [
    column.key,
    z.string().trim().min(1).describe(column.description || column.heading),
  ]));
  let schema = z.array(z.object(shape).strict()).describe(field.description);
  if (field.min_rows !== undefined) schema = schema.min(field.min_rows);
  if (field.max_rows !== undefined) schema = schema.max(field.max_rows);
  return field.optional ? schema.optional() : schema;
}

export function compileMarkdownReportContract(markdown, interpretation) {
  const observed = inspectMarkdownTemplate(markdown);
  const issues = [];
  const parsedInterpretation = InterpretationSchema.safeParse(interpretation);
  if (!parsedInterpretation.success) {
    fail([`interpretation shape is invalid: ${z.prettifyError(parsedInterpretation.error)}`]);
  }
  interpretation = parsedInterpretation.data;
  if (interpretation.template_id !== observed.template_id) issues.push(`template_id expected ${observed.template_id}, received ${interpretation.template_id}.`);
  if (interpretation.template_version !== observed.template_version) issues.push(`template_version expected ${observed.template_version}, received ${interpretation.template_version}.`);

  const observedByHeading = new Map(observed.sections.map((section) => [section.heading, section]));
  const interpretedPlaceholders = [];
  for (const field of interpretation.fields) {
    const section = observedByHeading.get(field.heading);
    interpretedPlaceholders.push(field.placeholder);
    if (!section) {
      issues.push(`field ${field.name} references missing heading "${field.heading}".`);
      continue;
    }
    if (!section.placeholders.includes(field.placeholder)) issues.push(`${field.heading}: placeholder {{${field.placeholder}}} was not found.`);
    if (section.instruction && normalize(field.description) !== section.instruction) {
      issues.push(`${field.heading}: description must copy the Markdown instruction nearly verbatim; expected "${section.instruction}".`);
    }
    if (/\bexactly\s+three\b/i.test(section.instruction) && field.sentences !== 3) issues.push(`${field.heading}: "Exactly three" requires sentences: 3.`);
    if (field.kind === "table") {
      const interpretedColumns = (field.columns ?? []).map((column) => column.heading);
      if (JSON.stringify(interpretedColumns) !== JSON.stringify(section.columns)) {
        issues.push(`${field.heading}: table columns differ; expected ${JSON.stringify(section.columns)}, received ${JSON.stringify(interpretedColumns)}.`);
      }
      if (field.min_rows === undefined && !field.optional) issues.push(`${field.heading}: table cardinality is ambiguous; supply min_rows or mark optional.`);
    }
  }
  const observedPlaceholders = observed.sections.flatMap((section) => section.placeholders);
  const duplicateObservedPlaceholders = [...new Set(observedPlaceholders.filter(
    (placeholder, index) => observedPlaceholders.indexOf(placeholder) !== index,
  ))];
  for (const placeholder of duplicateObservedPlaceholders) {
    issues.push(`body placeholder {{${placeholder}}} appears in more than one report section; placeholders must be unique.`);
  }
  for (const placeholder of observedPlaceholders) {
    const count = interpretedPlaceholders.filter((candidate) => candidate === placeholder).length;
    if (count === 0) issues.push(`placeholder {{${placeholder}}} has no interpreted field.`);
    if (count > 1) issues.push(`placeholder {{${placeholder}}} is mapped by more than one interpreted field.`);
  }
  for (const placeholder of interpretedPlaceholders) {
    if (!observedPlaceholders.includes(placeholder)) issues.push(`interpreted placeholder {{${placeholder}}} does not exist in the report body.`);
  }
  const names = interpretation.fields.map((field) => field.name);
  if (new Set(names).size !== names.length) issues.push("Interpreted field names must be unique.");
  if (issues.length) fail(issues);

  const shape = Object.fromEntries(interpretation.fields.map((field) => [
    field.name,
    field.kind === "table" ? rowSchema(field) : scalarSchema(field),
  ]));
  const schema = z.object(shape).strict().describe(
    `Structured extraction for ${observed.template_id}@${observed.template_version}; compiled deterministically from a reviewed Markdown interpretation.`,
  );
  return { observed, interpretation: structuredClone(interpretation), schema, json_schema: z.toJSONSchema(schema, { target: "draft-2020-12" }) };
}

function protectedTokens(value) {
  return [...value.matchAll(PROTECTED_TOKEN)].map((match) => match[0].replace(/[.,;:!?]+$/, "")).sort();
}

export function applyConstrainedProseCleanup(data, replacements, interpretation) {
  const output = structuredClone(data);
  const fieldByName = new Map(interpretation.fields.map((field) => [field.name, field]));
  for (const [path, replacement] of Object.entries(replacements)) {
    const [fieldName, rowText, columnKey] = path.split(".");
    const field = fieldByName.get(fieldName);
    if (!field?.cleanup) fail([`${path}: field is not approved for prose cleanup.`]);
    const rowIndex = rowText === undefined ? null : Number(rowText);
    const current = rowIndex === null ? output[fieldName] : output[fieldName]?.[rowIndex]?.[columnKey];
    if (typeof current !== "string" || typeof replacement !== "string") fail([`${path}: cleanup target and replacement must both be strings.`]);
    const before = protectedTokens(current);
    const after = protectedTokens(replacement);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      fail([`${path}: cleanup changed protected facts, IDs, evidence, numbers, dates, money, or routes; before ${JSON.stringify(before)}, after ${JSON.stringify(after)}.`]);
    }
    if (rowIndex === null) output[fieldName] = replacement;
    else output[fieldName][rowIndex][columnKey] = replacement;
  }
  return output;
}

function renderTable(field, rows) {
  const cell = (value) => value.replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
  return rows.map((row) => `| ${field.columns.map((column) => cell(row[column.key])).join(" | ")} |`).join("\n");
}

export function renderMarkdownReport(markdown, data, interpretation, frontmatterValues = {}) {
  const compiled = compileMarkdownReportContract(markdown, interpretation);
  const parsed = compiled.schema.safeParse(data);
  if (!parsed.success) throw new Error(`Structured report failed compiled Zod validation:\n${z.prettifyError(parsed.error)}`);
  const replacements = { ...frontmatterValues };
  for (const field of interpretation.fields) {
    const value = parsed.data[field.name];
    replacements[field.placeholder] = field.kind === "table" ? renderTable(field, value ?? []) : value ?? "";
  }
  const rendered = markdown.replace(PLACEHOLDER, (original, name) => Object.hasOwn(replacements, name) ? String(replacements[name]) : original);
  const unresolved = [...rendered.matchAll(PLACEHOLDER)].map((match) => match[1]);
  if (unresolved.length) throw new Error(`Rendered report has unresolved placeholders: ${[...new Set(unresolved)].join(", ")}.`);
  const renderedShape = inspectMarkdownTemplate(rendered);
  const templateShape = inspectMarkdownTemplate(markdown);
  if (JSON.stringify(renderedShape.frontmatter_keys) !== JSON.stringify(templateShape.frontmatter_keys)
      || JSON.stringify(renderedShape.sections.map(({ heading, columns }) => ({ heading, columns }))) !== JSON.stringify(templateShape.sections.map(({ heading, columns }) => ({ heading, columns })))) {
    throw new Error("Rendered report changed the Markdown template shape.");
  }
  return rendered;
}

export function diffMarkdownReportContract(markdown, interpretation) {
  try {
    const compiled = compileMarkdownReportContract(markdown, interpretation);
    return { compatible: true, template_id: compiled.observed.template_id, template_version: compiled.observed.template_version, issues: [] };
  } catch (error) {
    if (error.name !== "TemplateContractError") throw error;
    return { compatible: false, issues: error.issues };
  }
}

async function main(argv) {
  const [templatePath, interpretationPath, extractionPath] = argv;
  if (!templatePath || !interpretationPath) {
    console.error("Usage: node scripts/markdown_report_contract.mjs TEMPLATE.md INTERPRETATION.json [EXTRACTION.json]");
    process.exitCode = 2;
    return;
  }
  const markdown = readFileSync(templatePath, "utf8");
  const interpretation = JSON.parse(readFileSync(interpretationPath, "utf8"));
  const result = diffMarkdownReportContract(markdown, interpretation);
  if (result.compatible && extractionPath) {
    const compiled = compileMarkdownReportContract(markdown, interpretation);
    const parsed = compiled.schema.safeParse(JSON.parse(readFileSync(extractionPath, "utf8")));
    result.extraction_valid = parsed.success;
    if (!parsed.success) result.extraction_errors = z.treeifyError(parsed.error);
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.compatible || result.extraction_valid === false) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));

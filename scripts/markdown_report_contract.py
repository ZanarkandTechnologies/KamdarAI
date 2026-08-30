#!/usr/bin/env python3
"""Compile reviewed Markdown report interpretations into strict Pydantic models."""

from __future__ import annotations

import argparse
import copy
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, create_model, model_validator


PLACEHOLDER = re.compile(r"{{([^{}\n]+)}}")
SENTENCE_END = re.compile(r"[.!?](?:\s|$)")
PROTECTED_TOKEN = re.compile(r"(?:\b(?:[A-Z]{2,}(?:-[A-Z0-9]+)+|\d{4}-W\d{2}|\d{4}-\d{2}-\d{2})\b|\b\d+(?:\.\d+)?%?\b|\b(?:MYR|USD|EUR)\s*\d+(?:[.,]\d+)*\b|(?:https?://|[a-z]+://)[^\s)]+|\[[^\]]+\]\([^)]+\))")
SafeName = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]*$")]
NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Column(StrictModel):
    key: SafeName
    heading: NonEmpty
    description: NonEmpty | None = None


class FieldInterpretation(StrictModel):
    name: SafeName
    heading: NonEmpty
    placeholder: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, pattern=r"^[^{}\n]+$")]
    kind: Literal["scalar", "table"]
    optional: bool
    cleanup: bool
    description: NonEmpty
    sentences: Annotated[int, Field(gt=0)] | None = None
    columns: list[Column] | None = None
    min_rows: Annotated[int, Field(ge=0)] | None = None
    max_rows: Annotated[int, Field(ge=0)] | None = None

    @model_validator(mode="after")
    def validate_kind(self) -> "FieldInterpretation":
        if self.kind == "table":
            if not self.columns:
                raise ValueError("table fields require columns")
            keys = [column.key for column in self.columns]
            if len(set(keys)) != len(keys):
                raise ValueError("column keys must be unique")
            if self.min_rows is not None and self.max_rows is not None and self.max_rows < self.min_rows:
                raise ValueError("max_rows must be greater than or equal to min_rows")
        elif self.columns is not None or self.min_rows is not None or self.max_rows is not None:
            raise ValueError("scalar fields forbid table settings")
        return self


class Interpretation(StrictModel):
    template_id: Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    template_version: Annotated[str, StringConstraints(pattern=r"^\d+\.\d+\.\d+$")]
    fields: Annotated[list[FieldInterpretation], Field(min_length=1)]


class TemplateContractError(ValueError):
    def __init__(self, issues: list[str]):
        self.issues = issues
        super().__init__("Template interpretation is ambiguous or incompatible:\n" + "\n".join(f"- {issue}" for issue in issues))


@dataclass(frozen=True)
class CompiledReportContract:
    observed: dict[str, Any]
    interpretation: dict[str, Any]
    schema: type[BaseModel]
    json_schema: dict[str, Any]


def _normalize(value: str) -> str:
    return re.sub(r"\n[ \t]+", "\n", re.sub(r"[ \t]+", " ", value.replace("\r\n", "\n"))).strip()


def _frontmatter(markdown: str) -> tuple[list[str], dict[str, str], str]:
    match = re.match(r"^---\n([\s\S]*?)\n---\n", markdown)
    if not match:
        raise ValueError("Template must start with Markdown frontmatter.")
    rows = [re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line) for line in match.group(1).splitlines()]
    pairs = [(row.group(1), row.group(2).strip("'\"")) for row in rows if row]
    return [key for key, _ in pairs], dict(pairs), markdown[match.end():]


def inspect_markdown_template(markdown: str) -> dict[str, Any]:
    keys, values, body = _frontmatter(markdown)
    headings = list(re.finditer(r"^## (.+)$", body, re.MULTILINE))
    sections = []
    for index, heading in enumerate(headings):
        source = body[heading.end() : headings[index + 1].start() if index + 1 < len(headings) else len(body)].strip()
        comment_match = re.match(r"^<!--([\s\S]*?)-->", source)
        comment = comment_match.group(1) if comment_match else ""
        golden_match = re.search(r"GOLDEN EXAMPLE[^\n]*\n([\s\S]*?)\nEND GOLDEN EXAMPLE", comment, re.IGNORECASE)
        instruction = re.sub(r"GOLDEN EXAMPLE[\s\S]*?END GOLDEN EXAMPLE", "", comment, flags=re.IGNORECASE)
        table = re.search(r"^\|(.+)\|\n\|(?:\s*:?-+)", source, re.MULTILINE)
        sections.append({
            "heading": heading.group(1).strip(),
            "instruction": _normalize(instruction),
            "raw_instruction": _normalize(comment),
            "columns": [cell.strip() for cell in table.group(1).split("|")] if table else [],
            "placeholders": list(dict.fromkeys(PLACEHOLDER.findall(source))),
            "golden_example": golden_match.group(1).strip() if golden_match else None,
        })
    return {"template_id": values.get("template_id"), "template_version": values.get("template_version"), "frontmatter_keys": keys, "sections": sections}


def build_report_model(interpretation_value: dict[str, Any], *, model_name: str = "GeneratedReport") -> type[BaseModel]:
    interpretation = Interpretation.model_validate(interpretation_value)
    definitions: dict[str, tuple[Any, Any]] = {}
    for field in interpretation.fields:
        if field.kind == "scalar":
            annotation: Any = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1), Field(description=field.description)]
        else:
            row = create_model(
                f"{model_name}{''.join(part.title() for part in field.name.split('_'))}Row",
                __base__=StrictModel,
                **{
                    column.key: (Annotated[str, StringConstraints(strip_whitespace=True, min_length=1), Field(description=column.description or column.heading)], ...)
                    for column in field.columns or []
                },
            )
            annotation = Annotated[list[row], Field(min_length=field.min_rows, max_length=field.max_rows, description=field.description)]
        if field.optional:
            annotation = annotation | None
            default: Any = None
        else:
            default = ...
        definitions[field.name] = (annotation, default)

    def validate_sentences(self: BaseModel) -> BaseModel:
        for field in interpretation.fields:
            if field.sentences and len(SENTENCE_END.findall(getattr(self, field.name))) != field.sentences:
                raise ValueError(f"{field.name} must contain exactly {field.sentences} sentences.")
        return self

    return create_model(
        model_name,
        __base__=StrictModel,
        __validators__={"validate_sentences": model_validator(mode="after")(validate_sentences)},
        **definitions,
    )


def compile_markdown_report_contract(markdown: str, interpretation_value: dict[str, Any]) -> CompiledReportContract:
    observed = inspect_markdown_template(markdown)
    try:
        interpretation = Interpretation.model_validate(interpretation_value)
    except Exception as error:
        raise TemplateContractError([f"interpretation shape is invalid: {error}"]) from error
    issues = []
    if interpretation.template_id != observed["template_id"]:
        issues.append(f"template_id expected {observed['template_id']}, received {interpretation.template_id}.")
    if interpretation.template_version != observed["template_version"]:
        issues.append(f"template_version expected {observed['template_version']}, received {interpretation.template_version}.")
    sections = {section["heading"]: section for section in observed["sections"]}
    interpreted_placeholders = []
    for field in interpretation.fields:
        interpreted_placeholders.append(field.placeholder)
        section = sections.get(field.heading)
        if not section:
            issues.append(f"field {field.name} references missing heading \"{field.heading}\".")
            continue
        if field.placeholder not in section["placeholders"]:
            issues.append(f"{field.heading}: placeholder {{{{{field.placeholder}}}}} was not found.")
        if section["instruction"] and _normalize(field.description) != section["instruction"]:
            issues.append(f"{field.heading}: description must copy the Markdown instruction nearly verbatim; expected \"{section['instruction']}\".")
        if re.search(r"\bexactly\s+three\b", section["instruction"], re.IGNORECASE) and field.sentences != 3:
            issues.append(f"{field.heading}: \"Exactly three\" requires sentences: 3.")
        if field.kind == "table":
            headings = [column.heading for column in field.columns or []]
            if headings != section["columns"]:
                issues.append(f"{field.heading}: table columns differ; expected {section['columns']}, received {headings}.")
            if field.min_rows is None and not field.optional:
                issues.append(f"{field.heading}: table cardinality is ambiguous; supply min_rows or mark optional.")
    observed_placeholders = [placeholder for section in observed["sections"] for placeholder in section["placeholders"]]
    for placeholder in sorted({value for value in observed_placeholders if observed_placeholders.count(value) > 1}):
        issues.append(f"body placeholder {{{{{placeholder}}}}} appears in more than one report section; placeholders must be unique.")
    for placeholder in observed_placeholders:
        count = interpreted_placeholders.count(placeholder)
        if count == 0:
            issues.append(f"placeholder {{{{{placeholder}}}}} has no interpreted field.")
        elif count > 1:
            issues.append(f"placeholder {{{{{placeholder}}}}} is mapped by more than one interpreted field.")
    if len({field.name for field in interpretation.fields}) != len(interpretation.fields):
        issues.append("Interpreted field names must be unique.")
    if issues:
        raise TemplateContractError(issues)
    model = build_report_model(interpretation.model_dump(mode="json"), model_name="CompiledReport")
    schema = model.model_json_schema()
    schema["description"] = f"Structured extraction for {interpretation.template_id}@{interpretation.template_version}; compiled deterministically from a reviewed Markdown interpretation."
    return CompiledReportContract(observed, interpretation.model_dump(mode="json"), model, schema)


def _protected_tokens(value: str) -> list[str]:
    return sorted(match.group(0).rstrip(".,;:!?") for match in PROTECTED_TOKEN.finditer(value))


def apply_constrained_prose_cleanup(data: dict[str, Any], replacements: dict[str, str], interpretation_value: dict[str, Any]) -> dict[str, Any]:
    output = copy.deepcopy(data)
    fields = {field.name: field for field in Interpretation.model_validate(interpretation_value).fields}
    for path, replacement in replacements.items():
        parts = path.split(".")
        field = fields.get(parts[0])
        if not field or not field.cleanup:
            raise TemplateContractError([f"{path}: field is not approved for prose cleanup."])
        current = output[parts[0]] if len(parts) == 1 else output[parts[0]][int(parts[1])][parts[2]]
        if _protected_tokens(current) != _protected_tokens(replacement):
            raise TemplateContractError([f"{path}: cleanup changed protected facts, IDs, evidence, numbers, dates, money, or routes; before {_protected_tokens(current)}, after {_protected_tokens(replacement)}."])
        if len(parts) == 1:
            output[parts[0]] = replacement
        else:
            output[parts[0]][int(parts[1])][parts[2]] = replacement
    return output


def render_markdown_report(markdown: str, data: dict[str, Any], interpretation_value: dict[str, Any], frontmatter_values: dict[str, Any] | None = None) -> str:
    compiled = compile_markdown_report_contract(markdown, interpretation_value)
    parsed = compiled.schema.model_validate(data).model_dump(mode="json")
    replacements = dict(frontmatter_values or {})
    for field in Interpretation.model_validate(interpretation_value).fields:
        value = parsed.get(field.name)
        if field.kind == "table":
            rows = []
            for row in value or []:
                cells = [str(row[column.key]).replace("\r\n", "<br>").replace("\n", "<br>").replace("|", r"\|") for column in field.columns or []]
                rows.append(f"| {' | '.join(cells)} |")
            replacements[field.placeholder] = "\n".join(rows)
        else:
            replacements[field.placeholder] = value or ""
    rendered = PLACEHOLDER.sub(lambda match: str(replacements.get(match.group(1), match.group(0))), markdown)
    unresolved = sorted(set(PLACEHOLDER.findall(rendered)))
    if unresolved:
        raise ValueError(f"Rendered report has unresolved placeholders: {', '.join(unresolved)}.")
    before, after = inspect_markdown_template(markdown), inspect_markdown_template(rendered)
    before_shape = [(section["heading"], section["columns"]) for section in before["sections"]]
    after_shape = [(section["heading"], section["columns"]) for section in after["sections"]]
    if before["frontmatter_keys"] != after["frontmatter_keys"] or before_shape != after_shape:
        raise ValueError("Rendered report changed the Markdown template shape.")
    return rendered


def diff_markdown_report_contract(markdown: str, interpretation: dict[str, Any]) -> dict[str, Any]:
    try:
        compiled = compile_markdown_report_contract(markdown, interpretation)
        return {"compatible": True, "template_id": compiled.observed["template_id"], "template_version": compiled.observed["template_version"], "issues": []}
    except TemplateContractError as error:
        return {"compatible": False, "issues": error.issues}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("template", type=Path)
    parser.add_argument("interpretation", type=Path)
    parser.add_argument("extraction", type=Path, nargs="?")
    args = parser.parse_args()
    markdown = args.template.read_text(encoding="utf-8")
    interpretation = json.loads(args.interpretation.read_text(encoding="utf-8"))
    result = diff_markdown_report_contract(markdown, interpretation)
    if result["compatible"] and args.extraction:
        try:
            compile_markdown_report_contract(markdown, interpretation).schema.model_validate_json(args.extraction.read_text())
            result["extraction_valid"] = True
        except Exception as error:
            result["extraction_valid"] = False
            result["extraction_errors"] = str(error)
    print(json.dumps(result, indent=2))
    return 0 if result["compatible"] and result.get("extraction_valid", True) else 1


if __name__ == "__main__":
    raise SystemExit(main())

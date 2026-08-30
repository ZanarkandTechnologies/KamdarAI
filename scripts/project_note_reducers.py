"""Pydantic-validated Weekly reducers over frozen Project Notes."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from typing import Any

from schemas.automations.weekly_review_result import EmployeeMemoryUpdate, SopUpdate


def _stable(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _unique(values: list[Any]) -> list[str]:
    return sorted({str(value) for value in values if value})


def _normalize(value: Any) -> str:
    return str(value if value is not None else "").replace("\r\n", "\n").strip()


def _iso(value: str) -> str:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat().replace("+00:00", "Z")


def section_text(markdown: str, heading: str) -> str:
    marker = f"## {heading}"
    start = markdown.find(marker)
    if start < 0:
        raise ValueError(f"Entity projection: missing section {heading}.")
    content_start = start + len(marker)
    next_heading = markdown.find("\n## ", content_start)
    return markdown[content_start : None if next_heading < 0 else next_heading].strip()


def _replace_section(markdown: str, heading: str, replacement: str) -> str:
    marker = f"## {heading}"
    start = markdown.find(marker)
    if start < 0:
        raise ValueError(f"Entity projection: missing section {heading}.")
    content_start = start + len(marker)
    next_heading = markdown.find("\n## ", content_start)
    suffix = "" if next_heading < 0 else markdown[next_heading:]
    return f"{markdown[:content_start]}\n\n{_normalize(replacement)}\n{suffix}"


def _latest_by_work(notes: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for note in notes:
        if note.get("work_id"):
            grouped.setdefault(note["work_id"], []).append(note)
    rows: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    for work_id, candidates in grouped.items():
        latest_time = max(note["source_updated_at"] for note in candidates)
        latest = [note for note in candidates if note["source_updated_at"] == latest_time]
        if len({_stable(note["structured_payload"]) for note in latest}) > 1:
            conflicts.append({
                "work_id": work_id,
                "source_updated_at": latest_time,
                "note_keys": _unique([note["note_key"] for note in latest]),
                "project_ids": _unique([note["project_id"] for note in latest]),
                "employee_ids": _unique([employee for note in latest for employee in note["employee_ids"]]),
            })
        else:
            rows.append(min(latest, key=lambda note: note["note_key"]))
    return {"rows": rows, "conflicts": conflicts}


def reduce_latest_work_snapshots(projects: list[dict[str, Any]]) -> dict[str, Any]:
    return _latest_by_work([
        note for project in projects for note in project["notes"]
        if note["observation_kind"] == "work_snapshot"
    ])


def reduce_latest_documentation_questions(projects: list[dict[str, Any]]) -> dict[str, Any]:
    return _latest_by_work([
        note for project in projects for note in project["notes"]
        if note["observation_kind"] == "documentation_question"
    ])


def reduce_employee_memory(
    *, week: str, projects: list[dict[str, Any]], existing_people: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    index = {row["person_id"]: row for row in existing_people or []}
    all_notes = [note for project in projects for note in project["notes"]]
    latest_work = reduce_latest_work_snapshots(projects)
    latest_questions = reduce_latest_documentation_questions(projects)
    conflicts = latest_work["conflicts"] + latest_questions["conflicts"]
    results = []
    for person_id in _unique([employee for note in all_notes for employee in note["employee_ids"]]):
        person = index.get(person_id)
        accepted = [note for note in all_notes if note["observation_kind"] == "completed_outcome" and person_id in note["employee_ids"]]
        gaps = [f"{row['work_id']}: divergent snapshots at {row['source_updated_at']}." for row in conflicts if person_id in row["employee_ids"]]
        persistent, seen = [], {}
        for note in accepted:
            payload = note["structured_payload"]
            if payload.get("documentation_state") != "sufficient" or not payload.get("accepted_at") or not payload.get("outcome"):
                gaps.append(f"{note['work_id']}: accepted outcome is incomplete.")
                continue
            artifacts = [artifact if isinstance(artifact, str) else artifact.get("id") for artifact in payload.get("delivered_artifacts", [])]
            observation = {
                "observation_key": f"{person_id}:{note['work_id']}",
                "project_id": note["project_id"],
                "work_id": note["work_id"],
                "accepted_outcome": payload["outcome"],
                "accepted_artifact_ids": _unique(artifacts),
                "elapsed_hours": payload.get("elapsed_hours") if isinstance(payload.get("elapsed_hours"), (int, float)) else None,
                "documentation_state": "sufficient",
                "accepted_at": _iso(payload["accepted_at"]),
                "evidence_refs": _unique(note["source_ids"]),
            }
            prior = seen.get(observation["observation_key"])
            if prior and _stable(prior) != _stable(observation):
                gaps.append(f"{note['work_id']}: conflicting accepted outcomes.")
            elif not prior:
                seen[observation["observation_key"]] = observation
                persistent.append(observation)
        weekly = [note for note in latest_work["rows"] + latest_questions["rows"] if person_id in note["employee_ids"]]
        person_conflicts = [row for row in conflicts if person_id in row["employee_ids"]]
        notes = accepted + weekly
        markdown = "\n".join(
            f"- **{note['work_id']} · {note['project_id']}:** {note['structured_payload'].get('status') or note['observation_kind']}. [{', '.join(note['source_ids'])}]"
            for note in weekly
        ) or "No current Work snapshot this week."
        if not person:
            gaps.insert(0, f"{person_id}: Person record is absent from the targeted Weekly context.")
        persistent_text = None if not person else person.get("persistent_text")
        if person and persistent_text is None and person.get("markdown") is not None:
            persistent_text = section_text(person["markdown"], "Persistent operating memory")
        row = {
            "person_id": person_id,
            "week": week,
            "source_project_ids": _unique([note["project_id"] for note in notes] + [project for conflict in person_conflicts for project in conflict["project_ids"]]),
            "source_work_ids": _unique([note.get("work_id") for note in notes] + [conflict["work_id"] for conflict in person_conflicts]),
            "source_note_keys": _unique([note["note_key"] for note in notes] + [key for conflict in person_conflicts for key in conflict["note_keys"]]),
            "expected_record_version": None if not person else person.get("record_version"),
            "expected_persistent_text_sha256": None if persistent_text is None else person.get("persistent_text_sha256", _sha256(_normalize(persistent_text))),
            "persistent_observations": persistent,
            "latest_weekly_evidence_markdown": markdown,
            "disposition": "blocked" if not person or gaps else ("update" if persistent or weekly else "no_change"),
            "gaps": gaps,
        }
        if row["source_note_keys"]:
            results.append(EmployeeMemoryUpdate.model_validate(row).model_dump(mode="json"))
    return results


def reduce_sop_updates(
    *, week: str, projects: list[dict[str, Any]], existing_sops: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    index = {row["workflow_key"]: row for row in existing_sops or []}
    grouped: dict[str, list[dict[str, Any]]] = {}
    for project in projects:
        for note in project["notes"]:
            if note["observation_kind"] == "workflow_sample":
                grouped.setdefault(note["workflow_key"], []).append(note)
    results = []
    for workflow_key, candidates in sorted(grouped.items()):
        sop = index.get(workflow_key)
        samples, gaps, seen = [], [], {}
        for note in candidates:
            payload = note["structured_payload"]
            elapsed = payload.get("elapsed_hours")
            if payload.get("documentation_state") != "sufficient" or not payload.get("accepted_at") or not payload.get("output_artifact_type") or not isinstance(elapsed, (int, float)):
                gaps.append(f"{note.get('work_id') or note['note_key']}: sample is not comparable.")
                continue
            sample = {
                "sample_key": f"{workflow_key}:{note['work_id']}",
                "project_id": note["project_id"],
                "work_id": note["work_id"],
                "output_artifact_type": payload["output_artifact_type"],
                "elapsed_hours": elapsed,
                "active_hours": payload.get("active_hours") if isinstance(payload.get("active_hours"), (int, float)) else None,
                "wait_hours": payload.get("wait_hours") if isinstance(payload.get("wait_hours"), (int, float)) else None,
                "accepted_at": _iso(payload["accepted_at"]),
                "evidence_refs": _unique(note["source_ids"]),
            }
            prior = seen.get(sample["sample_key"])
            if prior and _stable(prior) != _stable(sample):
                gaps.append(f"{note['work_id']}: conflicting workflow samples.")
            elif not prior:
                seen[sample["sample_key"]] = sample
                samples.append(sample)
        if len(_unique([sample["output_artifact_type"] for sample in samples])) > 1:
            gaps.append("Samples use different output artifact types.")
        project_count = len(_unique([sample["project_id"] for sample in samples]))
        eligible = not gaps and len(samples) >= 3 and project_count >= 2
        elapsed_values = [sample["elapsed_hours"] for sample in samples]
        timing = None
        if eligible:
            accepted = sorted(sample["accepted_at"] for sample in samples)
            timing = {"sample_count": len(samples), "project_count": project_count, "mean_elapsed_hours": sum(elapsed_values) / len(elapsed_values), "min_elapsed_hours": min(elapsed_values), "max_elapsed_hours": max(elapsed_values), "evidence_window_start": accepted[0], "evidence_window_end": accepted[-1], "requires_owner_approval": True}
        markdown = "\n".join(
            f"- **{sample['work_id']} · {sample['project_id']}:** {sample['elapsed_hours']} elapsed hours; {sample['output_artifact_type']}. [{', '.join(sample['evidence_refs'])}]"
            for sample in samples
        ) or "No comparable accepted sample this week."
        row = {
            "workflow_key": workflow_key,
            "sop_id": None if not sop else sop.get("sop_id"),
            "week": week,
            "source_project_ids": _unique([note["project_id"] for note in candidates]),
            "source_work_ids": _unique([note.get("work_id") for note in candidates]),
            "source_note_keys": _unique([note["note_key"] for note in candidates]),
            "expected_record_version": None if not sop else sop.get("record_version"),
            "expected_baseline_version": None if not sop else sop.get("baseline_version"),
            "samples": samples,
            "candidate_timing": timing,
            "latest_weekly_samples_markdown": markdown,
            "disposition": "blocked" if any("conflicting" in gap or "different output" in gap for gap in gaps) else ("baseline_proposed" if timing else "samples_only"),
            "gaps": gaps,
        }
        results.append(SopUpdate.model_validate(row).model_dump(mode="json"))
    return results


def _observation_block(observation: dict[str, Any]) -> str:
    key = observation["observation_key"]
    return (
        f"<!-- kamdar-employee-observation: {key} -->\n"
        f"- **{observation['work_id']} · {observation['project_id']}:** {observation['accepted_outcome']}\n"
        f"  - Artifacts: {', '.join(observation['accepted_artifact_ids']) or 'none recorded'}.\n"
        f"  - Accepted: {observation['accepted_at']}; elapsed: {observation['elapsed_hours'] if observation['elapsed_hours'] is not None else 'unknown'} hours.\n"
        f"  - Evidence: {', '.join(observation['evidence_refs'])}.\n"
        f"<!-- /kamdar-employee-observation: {key} -->"
    )


def apply_employee_memory_update(
    *, current_markdown: str, current_record_version: int, update: dict[str, Any]
) -> dict[str, Any]:
    row = EmployeeMemoryUpdate.model_validate(update).model_dump(mode="json")
    if row["disposition"] == "blocked":
        return {"state": "blocked", "reason": " ".join(row["gaps"]), "markdown": current_markdown, "record_version": current_record_version}
    if row["expected_record_version"] is None or row["expected_persistent_text_sha256"] is None:
        return {"state": "blocked", "reason": "missing Person version or persistent-section hash", "markdown": current_markdown, "record_version": current_record_version}
    if row["expected_record_version"] != current_record_version:
        return {"state": "conflict", "reason": "Person record version changed", "markdown": current_markdown, "record_version": current_record_version}
    persistent = section_text(current_markdown, "Persistent operating memory")
    if _sha256(_normalize(persistent)) != row["expected_persistent_text_sha256"]:
        return {"state": "conflict", "reason": "Person persistent memory changed", "markdown": current_markdown, "record_version": current_record_version}
    fresh, duplicates = [], []
    for observation in row["persistent_observations"]:
        block = _observation_block(observation)
        pattern = re.compile(rf"<!-- kamdar-employee-observation: {re.escape(observation['observation_key'])} -->\n[\s\S]*?\n<!-- /kamdar-employee-observation: {re.escape(observation['observation_key'])} -->")
        match = pattern.search(persistent)
        if not match:
            fresh.append(block)
        elif _normalize(match.group(0)) == _normalize(block):
            duplicates.append(observation["observation_key"])
        else:
            return {"state": "conflict", "reason": f"Person observation {observation['observation_key']} changed", "markdown": current_markdown, "record_version": current_record_version}
    retained = "" if persistent == "No accepted cross-week observation yet." else persistent
    markdown = _replace_section(current_markdown, "Persistent operating memory", "\n\n".join(value for value in [retained, *fresh] if value) or "No accepted cross-week observation yet.")
    markdown = _replace_section(markdown, "Latest weekly evidence", row["latest_weekly_evidence_markdown"])
    changed = _normalize(markdown) != _normalize(current_markdown)
    return {"state": "applied" if changed else "duplicate", "markdown": markdown, "record_version": current_record_version + 1 if changed else current_record_version, "applied_observations": len(fresh), "duplicates": duplicates}


def apply_sop_update(
    *, current_markdown: str, current_record_version: int, current_baseline_version: int, update: dict[str, Any]
) -> dict[str, Any]:
    row = SopUpdate.model_validate(update).model_dump(mode="json")
    base = {"markdown": current_markdown, "record_version": current_record_version, "baseline_version": current_baseline_version}
    if row["disposition"] == "blocked":
        return {"state": "blocked", "reason": " ".join(row["gaps"]), **base}
    if not row["sop_id"] or row["expected_record_version"] is None or row["expected_baseline_version"] is None:
        return {"state": "blocked", "reason": "existing SOP and version guards are required", **base}
    if row["expected_record_version"] != current_record_version or row["expected_baseline_version"] != current_baseline_version:
        return {"state": "conflict", "reason": "SOP record or baseline version changed", **base}
    baseline = section_text(current_markdown, "Timing and volume baseline")
    weekly = row["latest_weekly_samples_markdown"]
    timing = row["candidate_timing"]
    if timing:
        weekly += (
            "\n\n### Candidate timing — owner approval required\n\n"
            f"- Samples: {timing['sample_count']} across {timing['project_count']} Projects.\n"
            f"- Mean/min/max elapsed hours: {timing['mean_elapsed_hours']} / {timing['min_elapsed_hours']} / {timing['max_elapsed_hours']}.\n"
            f"- Evidence window: {timing['evidence_window_start']} to {timing['evidence_window_end']}.\n"
            "- The approved baseline remains unchanged."
        )
    markdown = _replace_section(current_markdown, "Latest weekly samples", weekly)
    if section_text(markdown, "Timing and volume baseline") != baseline:
        raise ValueError("Entity projection: SOP baseline changed without approval.")
    changed = _normalize(markdown) != _normalize(current_markdown)
    return {"state": "applied" if changed else "duplicate", "markdown": markdown, "record_version": current_record_version + 1 if changed else current_record_version, "baseline_version": current_baseline_version, "baseline_changed": False}

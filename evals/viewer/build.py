#!/usr/bin/env python3
"""Build a private static HTML dossier for a delivery-disabled Doctor run."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from evals.viewer.model import build_evidence_model


ROOT = Path(__file__).resolve().parents[2]


def render_markdown(markdown: str) -> str:
    output, paragraph, list_tag = [], [], None
    code = False

    def flush() -> None:
        nonlocal paragraph, list_tag
        if paragraph:
            output.append(f"<p>{html.escape(' '.join(paragraph))}</p>")
            paragraph = []
        if list_tag:
            output.append(f"</{list_tag}>")
            list_tag = None

    for line in markdown.replace("\r\n", "\n").splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            flush()
            output.append("</code></pre>" if code else "<pre><code>")
            code = not code
        elif code:
            output.append(html.escape(line) + "\n")
        elif not stripped:
            flush()
        elif match := re.match(r"^(#{1,6})\s+(.+)$", stripped):
            flush()
            level = len(match.group(1))
            output.append(f"<h{level}>{html.escape(match.group(2))}</h{level}>")
        elif match := re.match(r"^[-*]\s+(.+)$", stripped):
            if list_tag != "ul":
                flush()
                output.append("<ul>")
                list_tag = "ul"
            output.append(f"<li>{html.escape(match.group(1))}</li>")
        else:
            paragraph.append(stripped)
    flush()
    return "".join(output)


def render_evidence_html(model: dict) -> str:
    cards = []
    for feature in model["features"]:
        sources = "".join(f"<details><summary>{html.escape(str(source['name']))} — {html.escape(str(source['status']))}</summary><pre>{html.escape(json.dumps(source['record'], indent=2))}</pre></details>" for source in feature["sources"])
        checks = "".join(f"<li class='{row['status']}'>{html.escape(row['assertion'])}</li>" for row in feature["assertions"])
        previews = "".join(f"<a href='{html.escape(output['url'])}'>{html.escape(output['label'])}</a><div class='preview'>{render_markdown(output['markdown'])}</div>" for output in feature["outputs"])
        cards.append(f"<article><header><b>{feature['id']} · {html.escape(feature['name'])}</b><span class='{feature['status']}'>{feature['status']}</span></header><p>{html.escape(feature['claim'])}</p><h3>{feature['sourceLabel']}</h3>{sources}<h3>Actual agent output</h3>{previews}<h3>Expected criteria</h3><ul>{checks}</ul></article>")
    safe_model = json.dumps(model).replace("<", "\\u003c")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Company OS evals</title><style>body{{margin:0;background:#090909;color:#ddd;font:14px/1.5 ui-monospace,monospace}}main{{max-width:1100px;margin:auto;padding:24px}}.summary,article{{border:1px solid #333;background:#111;padding:16px;margin:12px 0}}article header{{display:flex;justify-content:space-between}}.pass{{color:#9dd3b8}}.fail{{color:#e5a3b4}}.needs_information{{color:#e8d38f}}details,pre,.preview{{border:1px solid #2a2a2a;padding:10px;overflow:auto}}a{{color:#c9c1ee}}</style></head><body><main><section class="summary"><h1>Kamdar Company OS — real setup test</h1><p>{model['metrics']['features']['passed']}/{model['metrics']['features']['total']} features passed · nothing published</p></section>{''.join(cards)}</main><script type="application/json" id="evidence-model">{safe_model}</script></body></html>'''


def build_static_evidence_viewer(*, out_dir: Path, doctor_run_root: Path) -> dict:
    model = build_evidence_model(project_root=ROOT, doctor_run_root=doctor_run_root)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "model.json").write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    (out_dir / "index.html").write_text(render_evidence_html(model), encoding="utf-8")
    return model


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--doctor-run", type=Path, required=True)
    args = parser.parse_args()
    model = build_static_evidence_viewer(out_dir=args.out.resolve(), doctor_run_root=args.doctor_run.resolve())
    print(json.dumps({"out_dir": str(args.out.resolve()), "metrics": model["metrics"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

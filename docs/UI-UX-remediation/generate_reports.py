#!/usr/bin/env python3
"""Generate styled PDF companions for every Markdown report in this folder."""

from __future__ import annotations

import re
import sys
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent
ROOT = OUTPUT_DIR.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer

from scripts import generate_landing_innovation_pdfs as base


DATE = "2026-08-06"


def normalize_fenced_blocks(markdown: str) -> str:
    """Convert fenced blocks to the inline-code subset supported by the renderer."""

    output: list[str] = []
    block: list[str] = []
    language = ""
    in_block = False

    for line in markdown.splitlines():
        if line.strip().startswith("```"):
            if not in_block:
                language = line.strip()[3:].strip()
                block = []
                in_block = True
            else:
                label = "Architecture diagram source" if language == "mermaid" else "Code or command excerpt"
                output.extend([f"> {label}", ""])
                output.extend(f"`{entry}`" if entry else "" for entry in block)
                output.append("")
                in_block = False
            continue
        if in_block:
            block.append(line.replace("`", "'"))
        else:
            output.append(line)

    if in_block:
        output.extend(["> Code or command excerpt", ""])
        output.extend(f"`{entry}`" if entry else "" for entry in block)
    return "\n".join(output)


def cover(title: str, document_type: str, subtitle: str, styles: dict[str, ParagraphStyle]) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / ENTERPRISE UI/UX REMEDIATION", styles["cover_kicker"]),
        HRFlowable(width=42 * mm, thickness=3, color=base.TEAL, hAlign="LEFT"),
        Spacer(1, 9 * mm),
        Paragraph(base.inline_markup(title), styles["cover_title"]),
        Paragraph(base.inline_markup(subtitle), styles["cover_subtitle"]),
        Spacer(1, 10 * mm),
        KeepTogether(
            [
                Paragraph(f"<b>{document_type}</b>", styles["meta"]),
                Paragraph(f"Published {DATE}", styles["meta"]),
                Paragraph(
                    "Evidence-led | contract-governed | accessibility-aware | rollout-ready",
                    styles["meta"],
                ),
            ]
        ),
        Spacer(1, 64 * mm),
        HRFlowable(width="100%", thickness=0.8, color=base.RULE),
        Spacer(1, 5),
        Paragraph(
            "Truthful workflows. Explicit controls. Verifiable enterprise evidence.",
            styles["meta"],
        ),
        PageBreak(),
    ]


def page_decor(canvas, document) -> None:
    canvas.saveState()
    width, height = A4
    if document.page > 1:
        canvas.setStrokeColor(base.RULE)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, height - 13 * mm, width - 18 * mm, height - 13 * mm)
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(base.NAVY)
        canvas.drawString(18 * mm, height - 10 * mm, "STOQUIFY")
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(base.MUTED)
        canvas.drawRightString(width - 18 * mm, height - 10 * mm, "Enterprise UI/UX remediation")
    canvas.setStrokeColor(base.RULE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(base.MUTED)
    canvas.drawString(18 * mm, 9 * mm, DATE)
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{document.page:02d}")
    canvas.restoreState()


def subtitle_for(source: Path) -> str:
    stem = source.stem
    if stem.startswith("STOQUIFY_ENTERPRISE"):
        return "Authoritative execution roadmap for remediation, verification, validation and release"
    if stem == "INDEX":
        return "Navigation and publication boundary for the complete remediation package"
    if stem.startswith("00_"):
        return "Executive scope, baseline, critical path, delivery model and accountability"
    if stem.startswith("01_"):
        return "Audit-to-work traceability, evidence requirements and closure authority"
    if stem.startswith("02_"):
        return "Contract interfaces, dependencies, parallelization and architectural decisions"
    if stem.startswith("03_"):
        return "Execution-ready work packages with ownership, proof, rollout and rollback"
    if stem.startswith("04_"):
        return "Automated verification, human validation and evidence-governance matrix"
    if stem.startswith("06_"):
        return "Phase entry, exit, promotion, waiver and release decision criteria"
    if stem.startswith("07_"):
        return "Progressive cohorts, production guardrails, incident response and rollback"
    if stem.startswith("08_"):
        return "Risk, assumption, decision and multidisciplinary review register"
    if stem.startswith("09_"):
        return "Communications, role-based training, support readiness and adoption"
    if stem.startswith("10_"):
        return "Template for evidence-backed independent release assurance"
    return "Stoquify enterprise UI/UX remediation report"


def build_document(source: Path) -> Path:
    markdown = source.read_text(encoding="utf-8")
    title_match = re.search(r"^#\s+(.+)$", markdown, flags=re.MULTILINE)
    if not title_match:
        raise ValueError(f"No level-one title found in {source.name}")
    title = title_match.group(1).strip()
    destination = source.with_suffix(".pdf")
    styles = base.make_styles()
    document = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title=title,
        author="Stoquify",
        subject=subtitle_for(source),
        creator="Stoquify / Codex",
    )
    story = cover(title, "ENTERPRISE REMEDIATION REPORT", subtitle_for(source), styles)
    story.extend(base.markdown_story(normalize_fenced_blocks(markdown), styles))
    document.build(story, onFirstPage=page_decor, onLaterPages=page_decor)
    return destination


def main() -> int:
    reports = sorted(OUTPUT_DIR.glob("*.md"), key=lambda path: path.name.lower())
    if not reports:
        raise RuntimeError(f"No Markdown reports found in {OUTPUT_DIR}")
    for source in reports:
        destination = build_document(source)
        print(f"{source.name}\t{destination.name}\t{destination.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

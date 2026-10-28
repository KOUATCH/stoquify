"""Render the current blockers-and-gates Markdown reports as PDFs."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, Spacer

from scripts import generate_landing_innovation_pdfs as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "blockers-and-gates"
DATE = "2026-08-18"
SOURCES = (
    "EXECUTION_06_G1_CONTRACT_GATE_REASSESSMENT_POST_FIX_20260818.md",
    "EXECUTION_07_G2_G9_GATE_STATUS_POST_FIX_20260818.md",
    "G1_SIGNATURE_VALIDATION_AND_GATE_CLOSURE_GUIDE_2026-08-18.md",
)
BASE_MARKDOWN_STORY = base.markdown_story


def normalize_fenced_blocks(markdown: str) -> str:
    output: list[str] = []
    block: list[str] = []
    in_block = False
    for line in markdown.splitlines():
        if line.strip().startswith("```"):
            if not in_block:
                block = []
                in_block = True
            else:
                output.extend(["> Code or command excerpt", ""])
                output.extend(f"`{entry.replace('`', chr(39))}`" if entry else "" for entry in block)
                output.append("")
                in_block = False
            continue
        if in_block:
            block.append(line)
        else:
            output.append(line)
    if in_block:
        output.extend(["> Code or command excerpt", ""])
        output.extend(f"`{entry.replace('`', chr(39))}`" if entry else "" for entry in block)
    return "\n".join(output)


def report_story(markdown: str, styles: dict[str, ParagraphStyle]) -> list:
    return BASE_MARKDOWN_STORY(normalize_fenced_blocks(markdown), styles)


def cover(title: str, document_type: str, subtitle: str, styles: dict[str, ParagraphStyle]) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / BLOCKERS AND GATES", styles["cover_kicker"]),
        HRFlowable(width=42 * mm, thickness=3, color=base.TEAL, hAlign="LEFT"),
        Spacer(1, 9 * mm),
        Paragraph(base.inline_markup(title), styles["cover_title"]),
        Paragraph(base.inline_markup(subtitle), styles["cover_subtitle"]),
        Spacer(1, 10 * mm),
        KeepTogether(
            [
                Paragraph(f"<b>{document_type}</b>", styles["meta"]),
                Paragraph(f"Prepared {DATE}", styles["meta"]),
                Paragraph("Evidence-bound | approval-gated | fail-closed", styles["meta"]),
            ]
        ),
        Spacer(1, 64 * mm),
        HRFlowable(width="100%", thickness=0.8, color=base.RULE),
        Spacer(1, 5),
        Paragraph("No production claim without authentic evidence.", styles["meta"]),
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
        canvas.drawRightString(width - 18 * mm, height - 10 * mm, "Blockers and gates")
    canvas.setStrokeColor(base.RULE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(base.MUTED)
    canvas.drawString(18 * mm, 9 * mm, DATE)
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{document.page:02d}")
    canvas.restoreState()


def main() -> None:
    base.DATE = DATE
    base.cover = cover
    base.page_decor = page_decor
    base.markdown_story = report_story
    for filename in SOURCES:
        source = OUTPUT_DIR / filename
        destination = source.with_suffix(".pdf")
        base.build_document(
            source,
            destination,
            "BLOCKER AND GATE CONTROL REPORT",
            "G1 technical remediation, authentic approval requirements, and controlled next steps",
        )
        print(f"{destination.name}\t{destination.stat().st_size}")


if __name__ == "__main__":
    main()

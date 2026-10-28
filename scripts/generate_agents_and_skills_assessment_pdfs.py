"""Render the Stoquify next-five skill assessment Markdown sources as PDFs.

The Markdown files remain the reviewable source of truth. This renderer reuses
the repository's established ReportLab Markdown subset and changes only the
document identity, cover, footer, and target files for this assessment.
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, Spacer

from scripts import generate_landing_innovation_pdfs as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "agents-and-skills"
DATE = "2026-08-05"

DOCUMENTS = (
    (
        OUTPUT_DIR / "STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_ASSESSMENT_PROMPT_2026-08-05.md",
        OUTPUT_DIR / "STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_ASSESSMENT_PROMPT_2026-08-05.pdf",
        "ASSESSMENT PROMPT",
        "Runnable evidence, scoring, safety, and output contract",
    ),
    (
        OUTPUT_DIR / "STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_EXPERT_REPORT_2026-08-05.md",
        OUTPUT_DIR / "STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_EXPERT_REPORT_2026-08-05.pdf",
        "EXPERT REPORT",
        "Five external skills ranked for governed Stoquify adoption",
    ),
)


def cover(
    title: str,
    document_type: str,
    subtitle: str,
    styles: dict[str, ParagraphStyle],
) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / AGENT AND SKILL ASSURANCE", styles["cover_kicker"]),
        HRFlowable(width=42 * mm, thickness=3, color=base.TEAL, hAlign="LEFT"),
        Spacer(1, 9 * mm),
        Paragraph(base.inline_markup(title), styles["cover_title"]),
        Paragraph(base.inline_markup(subtitle), styles["cover_subtitle"]),
        Spacer(1, 10 * mm),
        KeepTogether(
            [
                Paragraph(f"<b>{document_type}</b>", styles["meta"]),
                Paragraph(f"Prepared {DATE}", styles["meta"]),
                Paragraph(
                    "Evidence-led | read-only assessment | governance-first",
                    styles["meta"],
                ),
            ]
        ),
        Spacer(1, 64 * mm),
        HRFlowable(width="100%", thickness=0.8, color=base.RULE),
        Spacer(1, 5),
        Paragraph(
            "Pinned sources. Explicit controls. Reproducible evidence.",
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
        canvas.drawRightString(
            width - 18 * mm,
            height - 10 * mm,
            "Agent and skill assurance",
        )
    canvas.setStrokeColor(base.RULE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(base.MUTED)
    canvas.drawString(18 * mm, 9 * mm, DATE)
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{document.page:02d}")
    canvas.restoreState()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    base.DATE = DATE
    base.cover = cover
    base.page_decor = page_decor
    for source, destination, document_type, subtitle in DOCUMENTS:
        if not source.exists():
            raise FileNotFoundError(source)
        base.build_document(source, destination, document_type, subtitle)
        print(f"{destination.name}\t{destination.stat().st_size}")


if __name__ == "__main__":
    main()

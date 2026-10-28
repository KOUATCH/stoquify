"""Render the Stoquify enterprise UI/UX system audit as a PDF.

The Markdown document remains the reviewable source of truth. This wrapper
reuses the repository's established ReportLab Markdown subset and supplies the
system-audit identity, date, cover, footer, and fenced-block normalization.
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
OUTPUT_DIR = ROOT / "docs" / "system-audit"
DATE = "2026-08-06"
SOURCE = OUTPUT_DIR / "STOQUIFY_ENTERPRISE_UI_UX_SYSTEM_AUDIT_2026-08-06.md"
DESTINATION = OUTPUT_DIR / "STOQUIFY_ENTERPRISE_UI_UX_SYSTEM_AUDIT_2026-08-06.pdf"


def normalize_fenced_blocks(markdown: str) -> str:
    """Convert fenced source blocks to the inline-code subset used by the renderer."""

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
                label = "Architecture diagram source" if language == "mermaid" else "Code excerpt"
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
        output.extend(["> Code excerpt", ""])
        output.extend(f"`{entry}`" if entry else "" for entry in block)
    return "\n".join(output)


def audit_story(markdown: str, styles: dict[str, ParagraphStyle]) -> list:
    return base.markdown_story_original(normalize_fenced_blocks(markdown), styles)


def cover(
    title: str,
    document_type: str,
    subtitle: str,
    styles: dict[str, ParagraphStyle],
) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / ENTERPRISE SYSTEM ASSURANCE", styles["cover_kicker"]),
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
                    "Evidence-led | multidisciplinary | accessibility-aware | remediation-ready",
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
        canvas.drawRightString(width - 18 * mm, height - 10 * mm, "Enterprise UI/UX system audit")
    canvas.setStrokeColor(base.RULE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(base.MUTED)
    canvas.drawString(18 * mm, 9 * mm, DATE)
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{document.page:02d}")
    canvas.restoreState()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    base.DATE = DATE
    base.cover = cover
    base.page_decor = page_decor
    base.markdown_story_original = base.markdown_story
    base.markdown_story = audit_story
    base.build_document(
        SOURCE,
        DESTINATION,
        "ENTERPRISE UI/UX SYSTEM AUDIT",
        "Findings, release blockers, target architecture, and phased remediation",
    )
    print(f"{DESTINATION.name}\t{DESTINATION.stat().st_size}")


if __name__ == "__main__":
    main()

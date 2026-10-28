"""Render Markdown reports in docs/platform-progress-blockers as PDFs."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, Spacer

from scripts import generate_landing_innovation_pdfs as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "platform-progress-blockers"
DATE = "2026-08-10"
BASE_MARKDOWN_STORY = base.markdown_story


def normalize_fenced_blocks(markdown: str) -> str:
    """Convert fenced blocks to the renderer's supported inline-code subset."""

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
                label = "Diagram source" if language == "mermaid" else "Code excerpt"
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


def blocker_story(markdown: str, styles: dict[str, ParagraphStyle]) -> list:
    return BASE_MARKDOWN_STORY(normalize_fenced_blocks(markdown), styles)


def cover(
    title: str,
    document_type: str,
    subtitle: str,
    styles: dict[str, ParagraphStyle],
) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / PLATFORM PROGRESS CONTROL", styles["cover_kicker"]),
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
                    "Evidence-bound | secret-safe | approval-gated | resumable",
                    styles["meta"],
                ),
            ]
        ),
        Spacer(1, 64 * mm),
        HRFlowable(width="100%", thickness=0.8, color=base.RULE),
        Spacer(1, 5),
        Paragraph(
            "No readiness claim without target-observed evidence.",
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
            "Platform progress blockers",
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
    sources = sorted(OUTPUT_DIR.glob("*.md"))
    if not sources:
        raise FileNotFoundError(f"No Markdown reports found in {OUTPUT_DIR}")

    base.DATE = DATE
    base.cover = cover
    base.page_decor = page_decor
    base.markdown_story = blocker_story

    for source in sources:
        destination = source.with_suffix(".pdf")
        base.build_document(
            source,
            destination,
            "PLATFORM PROGRESS BLOCKER REPORT",
            "External readiness blockers, evidence, and controlled resume conditions",
        )
        print(f"{destination.name}\t{destination.stat().st_size}")


if __name__ == "__main__":
    main()

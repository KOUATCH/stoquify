"""Generate the Stoquify landing innovation prompt and report PDFs.

The Markdown sources remain the reviewable source of truth. This formatter keeps
the PDF dependency surface deliberately small and uses ReportLab's built-in
fonts so the output is reproducible in the Codex document runtime.
"""

from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "panging-page"
DATE = "2026-07-27"

DOCUMENTS = (
    (
        OUTPUT_DIR
        / "STOQUIFY_BREAKTHROUGH_LANDING_EXPERIENCE_EXECUTION_PROMPT_2026-07-27.md",
        OUTPUT_DIR
        / "STOQUIFY_BREAKTHROUGH_LANDING_EXPERIENCE_EXECUTION_PROMPT_2026-07-27.pdf",
        "EXECUTION PROMPT",
        "Research and decision brief",
    ),
    (
        OUTPUT_DIR
        / "STOQUIFY_BREAKTHROUGH_LANDING_EXPERIENCE_RESEARCH_REPORT_2026-07-27.md",
        OUTPUT_DIR
        / "STOQUIFY_BREAKTHROUGH_LANDING_EXPERIENCE_RESEARCH_REPORT_2026-07-27.pdf",
        "RESEARCH REPORT",
        "Three concepts, scorecard, implementation plan, and verification",
    ),
)

INK = colors.HexColor("#102032")
MUTED = colors.HexColor("#526273")
NAVY = colors.HexColor("#0D223A")
TEAL = colors.HexColor("#0B8F87")
PALE_TEAL = colors.HexColor("#E8F6F4")
PALE_BLUE = colors.HexColor("#EEF4FA")
RULE = colors.HexColor("#D7E1EA")
WHITE = colors.white


def inline_markup(text: str) -> str:
    """Convert the small Markdown inline subset used by the sources."""

    placeholders: list[str] = []

    def reserve(value: str) -> str:
        token = f"@@TOKEN{len(placeholders)}@@"
        placeholders.append(value)
        return token

    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        lambda match: reserve(
            f'<link href="{html.escape(match.group(2), quote=True)}" '
            f'color="#087D78"><u>{html.escape(match.group(1))}</u></link>'
        ),
        text,
    )
    text = re.sub(
        r"`([^`]+)`",
        lambda match: reserve(
            f'<font name="Courier" color="#1C4B5B">{html.escape(match.group(1))}</font>'
        ),
        text,
    )
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    for index, value in enumerate(placeholders):
        text = text.replace(f"@@TOKEN{index}@@", value)
    return text


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "CoverKicker",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=TEAL,
            spaceAfter=8,
            alignment=TA_LEFT,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=27,
            leading=31,
            textColor=NAVY,
            spaceAfter=14,
            alignment=TA_LEFT,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=18,
            textColor=MUTED,
            spaceAfter=20,
        ),
        "h1": ParagraphStyle(
            "Heading1Custom",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=23,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=10,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Heading2Custom",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=NAVY,
            spaceBefore=13,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "Heading3Custom",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=TEAL,
            spaceBefore=9,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "BodyCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.25,
            leading=13.5,
            textColor=INK,
            spaceAfter=6,
            splitLongWords=True,
        ),
        "small": ParagraphStyle(
            "SmallCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.3,
            leading=10,
            textColor=INK,
        ),
        "quote": ParagraphStyle(
            "QuoteCustom",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=15,
            leftIndent=12,
            rightIndent=12,
            borderColor=TEAL,
            borderWidth=0,
            borderPadding=8,
            backColor=PALE_TEAL,
            textColor=NAVY,
            spaceBefore=5,
            spaceAfter=9,
        ),
        "meta": ParagraphStyle(
            "MetaCustom",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            spaceAfter=3,
        ),
    }


def parse_table(lines: list[str], styles: dict[str, ParagraphStyle]):
    rows: list[list[Paragraph]] = []
    for row_index, line in enumerate(lines):
        if row_index == 1:
            continue
        cells = [part.strip() for part in line.strip().strip("|").split("|")]
        rows.append(
            [
                Paragraph(
                    inline_markup(cell),
                    styles["small"],
                )
                for cell in cells
            ]
        )
    column_count = max(len(row) for row in rows)
    for row in rows:
        row.extend(Paragraph("", styles["small"]) for _ in range(column_count - len(row)))
    available = A4[0] - 36 * mm
    if column_count == 2:
        widths = [available * 0.28, available * 0.72]
    elif column_count == 4:
        widths = [available * 0.19, available * 0.27, available * 0.27, available * 0.27]
    else:
        widths = [available / column_count] * column_count
    table = LongTable(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, RULE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE_BLUE]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def markdown_story(markdown: str, styles: dict[str, ParagraphStyle]) -> list:
    lines = markdown.splitlines()
    story: list = []
    index = 0
    paragraph_buffer: list[str] = []
    list_buffer: list[tuple[int, str]] = []

    def flush_paragraph() -> None:
        if paragraph_buffer:
            text = " ".join(part.strip() for part in paragraph_buffer)
            story.append(Paragraph(inline_markup(text), styles["body"]))
            paragraph_buffer.clear()

    def flush_list() -> None:
        if not list_buffer:
            return
        ordered = all(kind == 1 for kind, _ in list_buffer)
        items = [
            ListItem(Paragraph(inline_markup(text), styles["body"]), leftIndent=9)
            for _, text in list_buffer
        ]
        story.append(
            ListFlowable(
                items,
                bulletType="1" if ordered else "bullet",
                start="1",
                leftIndent=18,
                bulletFontName="Helvetica",
                bulletFontSize=8,
                bulletColor=TEAL,
                spaceAfter=5,
            )
        )
        list_buffer.clear()

    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.strip()

        if stripped.startswith("|") and index + 1 < len(lines):
            separator = lines[index + 1].strip()
            if separator.startswith("|") and re.search(r"-{3,}", separator):
                flush_paragraph()
                flush_list()
                table_lines = [line, lines[index + 1]]
                index += 2
                while index < len(lines) and lines[index].strip().startswith("|"):
                    table_lines.append(lines[index])
                    index += 1
                story.append(parse_table(table_lines, styles))
                story.append(Spacer(1, 7))
                continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            flush_list()
            level = len(heading.group(1))
            title = heading.group(2)
            # The document title is already represented on the cover.
            if level == 1 and not story:
                index += 1
                continue
            story.append(Paragraph(inline_markup(title), styles[f"h{level}"]))
            index += 1
            continue

        bullet = re.match(r"^[-*]\s+(.+)$", stripped)
        numbered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if bullet or numbered:
            flush_paragraph()
            list_buffer.append((1 if numbered else 0, (numbered or bullet).group(1)))
            index += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            flush_list()
            story.append(Paragraph(inline_markup(stripped[1:].strip()), styles["quote"]))
            index += 1
            continue

        if stripped == "---":
            flush_paragraph()
            flush_list()
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.6, color=RULE))
            story.append(Spacer(1, 5))
            index += 1
            continue

        if stripped.startswith("**") and stripped.endswith("**") and ":" in stripped:
            flush_paragraph()
            flush_list()
            story.append(Paragraph(inline_markup(stripped), styles["meta"]))
            index += 1
            continue

        if not stripped:
            flush_paragraph()
            flush_list()
        else:
            paragraph_buffer.append(stripped)
        index += 1

    flush_paragraph()
    flush_list()
    return story


def cover(
    title: str,
    document_type: str,
    subtitle: str,
    styles: dict[str, ParagraphStyle],
) -> list:
    return [
        Spacer(1, 18 * mm),
        Paragraph("STOQUIFY / PRODUCT EXPERIENCE", styles["cover_kicker"]),
        HRFlowable(width=42 * mm, thickness=3, color=TEAL, hAlign="LEFT"),
        Spacer(1, 9 * mm),
        Paragraph(inline_markup(title), styles["cover_title"]),
        Paragraph(inline_markup(subtitle), styles["cover_subtitle"]),
        Spacer(1, 10 * mm),
        KeepTogether(
            [
                Paragraph(f"<b>{document_type}</b>", styles["meta"]),
                Paragraph(f"Prepared {DATE}", styles["meta"]),
                Paragraph(
                    "Evidence-led · bilingual-ready · accessibility-aware · implementation-bounded",
                    styles["meta"],
                ),
            ]
        ),
        Spacer(1, 64 * mm),
        HRFlowable(width="100%", thickness=0.8, color=RULE),
        Spacer(1, 5),
        Paragraph(
            "Connected operations. Explicit controls. Inspectable evidence.",
            styles["meta"],
        ),
        PageBreak(),
    ]


def page_decor(canvas, document) -> None:
    canvas.saveState()
    width, height = A4
    if document.page > 1:
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, height - 13 * mm, width - 18 * mm, height - 13 * mm)
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(18 * mm, height - 10 * mm, "STOQUIFY")
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 18 * mm, height - 10 * mm, "Landing experience research")
    canvas.setStrokeColor(RULE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, DATE)
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"{document.page:02d}")
    canvas.restoreState()


def build_document(source: Path, destination: Path, document_type: str, subtitle: str) -> None:
    markdown = source.read_text(encoding="utf-8")
    title_match = re.search(r"^#\s+(.+)$", markdown, flags=re.MULTILINE)
    if not title_match:
        raise ValueError(f"No title found in {source}")
    title = title_match.group(1).strip()
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title=title,
        author="Stoquify",
        subject=subtitle,
        creator="Stoquify / Codex",
    )
    story = cover(title, document_type, subtitle, styles)
    story.extend(markdown_story(markdown, styles))
    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source, destination, document_type, subtitle in DOCUMENTS:
        build_document(source, destination, document_type, subtitle)
        print(f"{destination.name}\t{destination.stat().st_size}")


if __name__ == "__main__":
    main()

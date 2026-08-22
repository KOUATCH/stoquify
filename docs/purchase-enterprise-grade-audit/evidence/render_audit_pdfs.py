from __future__ import annotations

import html
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor("#11263D")
TEAL = colors.HexColor("#0C7C86")
LIGHT = colors.HexColor("#EAF2F5")
MID = colors.HexColor("#637785")
RED = colors.HexColor("#A32929")


def register_fonts() -> None:
    font_dir = Path(r"C:\Windows\Fonts")
    pdfmetrics.registerFont(TTFont("AuditSans", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("AuditSans-Bold", str(font_dir / "arialbd.ttf")))
    italic = font_dir / "ariali.ttf"
    if italic.exists():
        pdfmetrics.registerFont(TTFont("AuditSans-Italic", str(italic)))
    else:
        pdfmetrics.registerFont(TTFont("AuditSans-Italic", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFontFamily(
        "AuditSans",
        normal="AuditSans",
        bold="AuditSans-Bold",
        italic="AuditSans-Italic",
        boldItalic="AuditSans-Bold",
    )


def inline_markup(value: str) -> str:
    value = html.escape(value.strip(), quote=True)
    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<link href="\2" color="#0C6670"><u>\1</u></link>',
        value,
    )
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", value)
    return value


def split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_separator_row(line: str) -> bool:
    cells = split_table_row(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def column_widths(rows: list[list[str]], available: float) -> list[float]:
    count = max(len(row) for row in rows)
    weights = []
    for index in range(count):
        lengths = [len(row[index]) if index < len(row) else 0 for row in rows[:30]]
        weights.append(max(8, min(max(lengths, default=8), 44)))
    floor = available * (0.055 if count >= 7 else 0.075)
    widths = [max(floor, available * weight / sum(weights)) for weight in weights]
    scale = available / sum(widths)
    return [width * scale for width in widths]


def styles_for(page_landscape: bool):
    sheet = getSampleStyleSheet()
    body_size = 8.6 if page_landscape else 9.2
    styles = {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=sheet["Title"],
            fontName="AuditSans-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.white,
            alignment=TA_LEFT,
            spaceAfter=18,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=sheet["BodyText"],
            fontName="AuditSans",
            fontSize=11,
            leading=16,
            textColor=colors.white,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=sheet["Heading1"],
            fontName="AuditSans-Bold",
            fontSize=17,
            leading=21,
            textColor=NAVY,
            spaceBefore=12,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=sheet["Heading2"],
            fontName="AuditSans-Bold",
            fontSize=13,
            leading=16,
            textColor=TEAL,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=sheet["Heading3"],
            fontName="AuditSans-Bold",
            fontSize=10.5,
            leading=13,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=sheet["BodyText"],
            fontName="AuditSans",
            fontSize=body_size,
            leading=body_size * 1.35,
            textColor=colors.HexColor("#243746"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=sheet["BodyText"],
            fontName="AuditSans",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#243746"),
        ),
        "table": ParagraphStyle(
            "Table",
            parent=sheet["BodyText"],
            fontName="AuditSans",
            fontSize=6.4 if page_landscape else 6.7,
            leading=8.1,
            textColor=colors.HexColor("#22323C"),
        ),
        "table_head": ParagraphStyle(
            "TableHead",
            parent=sheet["BodyText"],
            fontName="AuditSans-Bold",
            fontSize=6.5 if page_landscape else 6.8,
            leading=8.2,
            textColor=colors.white,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=sheet["Code"],
            fontName="Courier",
            fontSize=6.2,
            leading=8,
            textColor=colors.HexColor("#23313A"),
            backColor=LIGHT,
            borderColor=colors.HexColor("#C6D5DA"),
            borderWidth=0.5,
            borderPadding=6,
            spaceAfter=7,
        ),
    }
    return styles


def make_table(raw_rows: list[list[str]], styles, available: float) -> Table:
    count = max(len(row) for row in raw_rows)
    normalized = [row + [""] * (count - len(row)) for row in raw_rows]
    rendered = []
    for row_index, row in enumerate(normalized):
        style = styles["table_head"] if row_index == 0 else styles["table"]
        rendered.append([Paragraph(inline_markup(cell), style) for cell in row])
    table = Table(
        rendered,
        colWidths=column_widths(normalized, available),
        repeatRows=1,
        hAlign="LEFT",
        splitByRow=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B8C8CE")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8F9")]),
            ]
        )
    )
    return table


def parse_markdown(text: str, styles, available: float):
    lines = text.splitlines()
    story = []
    title = next((line[2:].strip() for line in lines if line.startswith("# ")), "Stoquify Audit")
    first_h1_skipped = False
    paragraph: list[str] = []
    bullets: list[str] = []
    numbered: list[str] = []
    in_code = False
    code_lines: list[str] = []
    index = 0

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            story.append(Paragraph(inline_markup(" ".join(part.strip() for part in paragraph)), styles["body"]))
            paragraph = []

    def flush_lists():
        nonlocal bullets, numbered
        if bullets:
            items = [ListItem(Paragraph(inline_markup(item), styles["body"])) for item in bullets]
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=13, bulletFontName="AuditSans"))
            story.append(Spacer(1, 3))
            bullets = []
        if numbered:
            items = [ListItem(Paragraph(inline_markup(item), styles["body"])) for item in numbered]
            story.append(ListFlowable(items, bulletType="1", leftIndent=16, bulletFontName="AuditSans"))
            story.append(Spacer(1, 3))
            numbered = []

    while index < len(lines):
        line = lines[index]
        if line.startswith("~~~"):
            flush_paragraph()
            flush_lists()
            if in_code:
                label = "Workflow diagram source" if code_lines and code_lines[0].strip().startswith(("flowchart", "sequenceDiagram")) else "Evidence block"
                story.append(Paragraph(f"<b>{label}</b>", styles["small"]))
                story.append(Preformatted("\n".join(code_lines), styles["code"], maxLineLength=125))
                code_lines = []
                in_code = False
            else:
                in_code = True
            index += 1
            continue
        if in_code:
            code_lines.append(line)
            index += 1
            continue
        if line.startswith("|") and index + 1 < len(lines) and is_separator_row(lines[index + 1]):
            flush_paragraph()
            flush_lists()
            rows = [split_table_row(line)]
            index += 2
            while index < len(lines) and lines[index].startswith("|"):
                rows.append(split_table_row(lines[index]))
                index += 1
            story.append(make_table(rows, styles, available))
            story.append(Spacer(1, 7))
            continue
        if line.startswith("# "):
            flush_paragraph()
            flush_lists()
            if not first_h1_skipped:
                first_h1_skipped = True
            else:
                story.append(PageBreak())
                story.append(Paragraph(inline_markup(line[2:]), styles["h1"]))
        elif line.startswith("## "):
            flush_paragraph()
            flush_lists()
            story.append(Paragraph(inline_markup(line[3:]), styles["h1"]))
        elif line.startswith("### "):
            flush_paragraph()
            flush_lists()
            story.append(Paragraph(inline_markup(line[4:]), styles["h2"]))
        elif line.startswith("#### "):
            flush_paragraph()
            flush_lists()
            story.append(Paragraph(inline_markup(line[5:]), styles["h3"]))
        elif re.match(r"^\s*-\s+", line):
            flush_paragraph()
            numbered and flush_lists()
            bullets.append(re.sub(r"^\s*-\s+", "", line))
        elif re.match(r"^\s*\d+\.\s+", line):
            flush_paragraph()
            bullets and flush_lists()
            numbered.append(re.sub(r"^\s*\d+\.\s+", "", line))
        elif not line.strip():
            flush_paragraph()
            flush_lists()
        else:
            flush_lists()
            paragraph.append(line)
        index += 1

    flush_paragraph()
    flush_lists()
    if code_lines:
        story.append(Preformatted("\n".join(code_lines), styles["code"], maxLineLength=125))
    return title, story


def render(source: Path) -> Path:
    main_report = "AUDIT_AND_MODERNIZATION" in source.name
    pagesize = landscape(A4) if main_report else A4
    width, height = pagesize
    left = right = 17 * mm
    top = 18 * mm
    bottom = 17 * mm
    available = width - left - right
    styles = styles_for(main_report)
    text = source.read_text(encoding="utf-8")
    title, content = parse_markdown(text, styles, available)
    target = source.with_suffix(".pdf")

    document = SimpleDocTemplate(
        str(target),
        pagesize=pagesize,
        rightMargin=right,
        leftMargin=left,
        topMargin=top,
        bottomMargin=bottom,
        title=title,
        author="Stoquify multidisciplinary audit board",
        subject="Enterprise procure-to-pay audit planning — no certification",
    )

    cover_height = 118 * mm
    cover = Table(
        [[Paragraph("STOQUIFY / AQSTOQFLOW", styles["cover_meta"])],
         [Spacer(1, 10)],
         [Paragraph(inline_markup(title), styles["cover_title"])],
         [Paragraph("Evidence-first enterprise procure-to-pay review", styles["cover_meta"])],
         [Spacer(1, 15)],
         [Paragraph("17 August 2026", styles["cover_meta"])],
         [Paragraph("Audit planning • No legal, tax, accounting, security, accessibility, or release certification", styles["cover_meta"])]],
        colWidths=[available],
        rowHeights=[None, None, None, None, None, None, None],
    )
    cover.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("BOX", (0, 0), (-1, -1), 0, NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story = [Spacer(1, 20 * mm), KeepTogether([cover]), PageBreak()] + content

    def decorate(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#C5D2D7"))
        canvas.setLineWidth(0.4)
        canvas.line(left, 12 * mm, width - right, 12 * mm)
        canvas.setFont("AuditSans", 7)
        canvas.setFillColor(MID)
        canvas.drawString(left, 7.5 * mm, "Stoquify procure-to-pay audit • planning evidence • no certification")
        canvas.drawRightString(width - right, 7.5 * mm, f"Page {doc.page}")
        if doc.page > 1:
            canvas.setFillColor(TEAL)
            canvas.rect(left, height - 10 * mm, 14 * mm, 1.2 * mm, fill=1, stroke=0)
        canvas.restoreState()

    document.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return target


def main() -> int:
    register_fonts()
    sources = [Path(arg).resolve() for arg in sys.argv[1:]]
    if not sources:
        sources = sorted(ROOT.glob("*.md"))
    for source in sources:
        target = render(source)
        print(f"rendered {source.name} -> {target.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


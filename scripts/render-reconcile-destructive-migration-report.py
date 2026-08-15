from pathlib import Path
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "reconcile-destructive-migration" / "RECONCILE_DESTRUCTIVE_MIGRATION_REPORT.md"
TARGET = ROOT / "docs" / "reconcile-destructive-migration" / "RECONCILE_DESTRUCTIVE_MIGRATION_REPORT.pdf"


def register_fonts():
    regular = Path(r"C:\Windows\Fonts\arial.ttf")
    bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    mono = Path(r"C:\Windows\Fonts\consola.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("StoquifySans", regular))
        pdfmetrics.registerFont(TTFont("StoquifySans-Bold", bold))
        if mono.exists():
            pdfmetrics.registerFont(TTFont("StoquifyMono", mono))
        return "StoquifySans", "StoquifySans-Bold", "StoquifyMono" if mono.exists() else "Courier"
    return "Helvetica", "Helvetica-Bold", "Courier"


BODY_FONT, BOLD_FONT, MONO_FONT = register_fonts()


def inline_markup(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", rf'<font name="{MONO_FONT}" color="#273449">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", rf'<font name="{BOLD_FONT}">\1</font>', text)
    return text


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName=BOLD_FONT,
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#132A3A"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName=BOLD_FONT,
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#124E66"),
            spaceBefore=13,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName=BOLD_FONT,
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#1D5A6C"),
            spaceBefore=9,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName=BODY_FONT,
            fontSize=9.2,
            leading=13.4,
            textColor=colors.HexColor("#263238"),
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName=BODY_FONT,
            fontSize=9,
            leading=13,
            leftIndent=13,
            firstLineIndent=-7,
            bulletIndent=4,
            textColor=colors.HexColor("#263238"),
            spaceAfter=3,
        ),
        "number": ParagraphStyle(
            "Number",
            parent=base["BodyText"],
            fontName=BODY_FONT,
            fontSize=9,
            leading=13,
            leftIndent=16,
            firstLineIndent=-12,
            textColor=colors.HexColor("#263238"),
            spaceAfter=3,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["BodyText"],
            fontName=BODY_FONT,
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#4E5D66"),
            alignment=TA_LEFT,
        ),
    }


def build_story(markdown):
    style = styles()
    story = []
    lines = markdown.splitlines()
    index = 0
    metadata = []

    while index < len(lines):
        raw = lines[index].rstrip()
        stripped = raw.strip()
        if not stripped:
            index += 1
            continue
        if stripped.startswith("# "):
            story.append(Spacer(1, 5 * mm))
            story.append(Paragraph(inline_markup(stripped[2:]), style["title"]))
            index += 1
            while index < len(lines) and lines[index].strip() and not lines[index].startswith("## "):
                metadata.append(lines[index].strip().rstrip("  "))
                index += 1
            if metadata:
                data = [[Paragraph(inline_markup(item), style["meta"])] for item in metadata]
                table = Table(data, colWidths=[167 * mm])
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF5F7")),
                            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#9BB8C2")),
                            ("LEFTPADDING", (0, 0), (-1, -1), 8),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ]
                    )
                )
                story.extend([table, Spacer(1, 4 * mm)])
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:]), style["h2"]))
            index += 1
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:]), style["h3"]))
            index += 1
            continue
        if re.match(r"^- ", stripped):
            story.append(
                Paragraph(inline_markup(stripped[2:]), style["bullet"], bulletText="•")
            )
            index += 1
            continue
        numbered = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if numbered:
            story.append(
                Paragraph(
                    inline_markup(numbered.group(2)),
                    style["number"],
                    bulletText=f"{numbered.group(1)}.",
                )
            )
            index += 1
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if (
                not candidate
                or candidate.startswith("#")
                or candidate.startswith("- ")
                or re.match(r"^\d+\.\s+", candidate)
            ):
                break
            paragraph_lines.append(candidate)
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), style["body"]))

    return story


def decorate(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#124E66"))
    canvas.rect(0, height - 8 * mm, width, 8 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#C8D8DE"))
    canvas.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
    canvas.setFont(BODY_FONT, 7.5)
    canvas.setFillColor(colors.HexColor("#60757E"))
    canvas.drawString(20 * mm, 9 * mm, "Stoquify — destructive migration reconciliation")
    canvas.drawRightString(width - 20 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source report: {SOURCE}")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(TARGET),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title="Stoquify destructive migration reconciliation report",
        author="Stoquify migration assurance workbench",
        subject="Evidence requirements and current release disposition",
    )
    document.build(build_story(SOURCE.read_text(encoding="utf-8")), onFirstPage=decorate, onLaterPages=decorate)
    print(TARGET)


if __name__ == "__main__":
    main()

"""Scoped ReportLab fallback using the existing repository Markdown renderer."""
import html
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/unblock'
sys.path.insert(0, str(ROOT))
sys.dont_write_bytecode = True
from scripts import generate_landing_innovation_pdfs as base
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer, PageBreak, HRFlowable, LongTable, TableStyle


def render(stage, stems, prepared_date='29 October 2026', edition='Draft 3', link_root=None):
    original_inline = base.inline_markup

    def inline(value):
        links = []
        def reserve(match):
            target = match[2]
            uri = target if target.startswith(('http://', 'https://')) else ((link_root or OUT) / target).resolve().as_uri()
            links.append(f'<link href="{html.escape(uri, quote=True)}" color="#087D78"><u>{html.escape(match[1])}</u></link>')
            return f'LINKSLOT{len(links)-1}END'
        result = original_inline(re.sub(r'\[([^\]]+)\]\(([^)]+)\)', reserve, value))
        for i, link in enumerate(links):
            result = result.replace(f'LINKSLOT{i}END', link)
        return result

    def table(lines, styles):
        head = ParagraphStyle('Head', parent=styles['small'], fontName='Helvetica-Bold', textColor=colors.white)
        rows = [[Paragraph(inline(cell.strip()), head if i == 0 else styles['small']) for cell in line.strip().strip('|').split('|')]
                for i, line in enumerate(lines) if i != 1]
        label = rows[0][0].getPlainText()
        ratios = [.19, .51, .30]
        if label == 'ID': ratios = [.10, .70, .20]
        if label == 'Decision': ratios = [.23, .55, .22]
        if label == 'Task': ratios = [.24, .30, .46]
        if len(rows[0]) != 3:
            ratios = [.30, .70] if len(rows[0]) == 2 else [1 / len(rows[0])] * len(rows[0])
        result = LongTable(rows, colWidths=[(A4[0]-36*mm)*r for r in ratios], repeatRows=1)
        result.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),base.NAVY), ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('GRID',(0,0),(-1,-1),.35,base.RULE),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,base.PALE_BLUE]),
            ('LEFTPADDING',(0,0),(-1,-1),6), ('RIGHTPADDING',(0,0),(-1,-1),6),
            ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
        ]))
        return result

    def cover(title, kind, subtitle, styles):
        return [Spacer(1,22*mm), Paragraph('STOQUIFY / PAYROLL REVIEW PACKET',styles['cover_kicker']),
                HRFlowable(width=42*mm,thickness=3,color=base.TEAL,hAlign='LEFT'),Spacer(1,10*mm),
                Paragraph(inline(title),styles['cover_title']), Paragraph(subtitle,styles['cover_subtitle']),
                Paragraph(kind,styles['meta']),Paragraph(f'{prepared_date} | {edition} | Engineering continuation',styles['meta']),
                Spacer(1,55*mm),HRFlowable(width='100%',thickness=.8,color=base.RULE),Spacer(1,5*mm),
                Paragraph('Prepared for independent review. No statutory approval or production authorization recorded.',styles['meta']),PageBreak()]

    def decor(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica',7)
        canvas.setFillColor(base.MUTED)
        if doc.page > 1:
            canvas.drawString(18*mm,A4[1]-11*mm,'STOQUIFY / PAYROLL REVIEW — DRAFT')
            canvas.setStrokeColor(base.RULE)
            canvas.line(18*mm,A4[1]-14*mm,A4[0]-18*mm,A4[1]-14*mm)
        canvas.drawString(18*mm,10*mm,f'{prepared_date} | Pending independent review')
        canvas.drawRightString(A4[0]-18*mm,10*mm,f'Page {doc.page}')
        canvas.restoreState()

    base.inline_markup = inline
    base.parse_table = table
    base.cover = cover
    base.page_decor = decor
    original_list = base.ListFlowable
    def list_flow(*args, **kwargs):
        if kwargs.get('bulletType') == 'bullet': kwargs.pop('start', None)
        return original_list(*args, **kwargs)
    base.ListFlowable = list_flow
    for stem in stems:
        subtitle = 'Evidence-supported baseline, unresolved decisions and engineering acceptance' if stem.endswith('CONTRACT') else 'Decision checklist, independent fixtures and signed return requirements'
        if stem.startswith('PAYROLL-UNBLOCK-REPORT'):
            subtitle = 'Unblock inventory, completed engineering substeps and remaining approval gates'
        base.build_document(stage/(stem+'.md'), stage/(stem+'.pdf'), 'REVIEW DRAFT / NOT APPROVED', subtitle)

"""Export the approved prompt and completion report; no application/DB access."""
from pathlib import Path
import sys, re, html, json

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.dont_write_bytecode = True
from scripts import generate_landing_innovation_pdfs as base
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Spacer, PageBreak, HRFlowable, LongTable, TableStyle
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

OUT = ROOT / 'docs/unblock'
base.DATE = '2026-10-29'
original_inline = base.inline_markup

def inline(text):
    # Preserve clickable document links without exposing long paths in table cells.
    slots = []
    def link(m):
        target = m.group(2)
        href = target if target.startswith(('https://','http://')) else (OUT / target).resolve().as_uri()
        slots.append(f'<link href="{html.escape(href, quote=True)}" color="#087D78"><u>{html.escape(m.group(1))}</u></link>')
        return f'LINKSLOT{len(slots)-1}END'
    result = original_inline(re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text))
    for i,value in enumerate(slots): result = result.replace(f'LINKSLOT{i}END',value)
    return result

def table(lines, styles):
    rows=[]
    header=ParagraphStyle('TableHead',parent=styles['small'],fontName='Helvetica-Bold',textColor=colors.white)
    for i,line in enumerate(lines):
        if i==1: continue
        rows.append([Paragraph(inline(s.strip()),header if i==0 else styles['small']) for s in line.strip().strip('|').split('|')])
    available=A4[0]-36*mm
    if len(rows[0])==3:
        ratios=[.12,.48,.40] if rows[0][0].getPlainText()=='ID' else [.23,.29,.48]
    elif len(rows[0])==2: ratios=[.72,.28]
    else: ratios=[1/len(rows[0])]*len(rows[0])
    result=LongTable(rows,colWidths=[available*r for r in ratios],repeatRows=1,hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),base.NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('GRID',(0,0),(-1,-1),.35,base.RULE),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,base.PALE_BLUE]),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
    ]))
    return result

def cover(title,kind,subtitle,styles):
    return [Spacer(1,22*mm),Paragraph('STOQUIFY / PAYROLL UNBLOCK',styles['cover_kicker']),
        HRFlowable(width=42*mm,thickness=3,color=base.TEAL,hAlign='LEFT'),Spacer(1,10*mm),
        Paragraph(inline(title),styles['cover_title']),Paragraph(subtitle,styles['cover_subtitle']),
        Paragraph(kind,styles['meta']),Paragraph('29 October 2026',styles['meta']),Spacer(1,65*mm),
        HRFlowable(width='100%',thickness=.8,color=base.RULE),Spacer(1,5*mm),
        Paragraph('Documentation preparation complete. Payroll admission and production remain blocked.',styles['meta']),PageBreak()]

def decor(canvas,doc):
    canvas.saveState()
    w,h=A4
    canvas.setFont('Helvetica',7)
    canvas.setFillColor(base.MUTED)
    if doc.page>1:
        canvas.drawString(18*mm,h-11*mm,'STOQUIFY / PAYROLL UNBLOCK')
        canvas.setStrokeColor(base.RULE)
        canvas.line(18*mm,h-14*mm,w-18*mm,h-14*mm)
    canvas.drawString(18*mm,10*mm,'29 October 2026')
    canvas.drawRightString(w-18*mm,10*mm,f'Page {doc.page}')
    canvas.restoreState()

base.inline_markup=inline
base.parse_table=table
base.cover=cover
base.page_decor=decor
original_list=base.ListFlowable
def list_flow(*args,**kwargs):
    if kwargs.get('bulletType')=='bullet': kwargs.pop('start',None)
    return original_list(*args,**kwargs)
base.ListFlowable=list_flow

register=json.loads((ROOT/'docs/database-seed/payroll-unblock-register.json').read_text(encoding='utf8'))
validation=json.loads((ROOT/'docs/database-seed/payroll-unblock-workpapers/validation.json').read_text(encoding='utf8'))
gates=json.loads((ROOT/'docs/database-seed/payroll-unblock-workpapers/review-gate-diagnostics.json').read_text(encoding='utf8'))
engineering=json.loads((ROOT/'docs/database-seed/payroll-unblock-workpapers/engineering-results.json').read_text(encoding='utf8'))
counts=register['counts']
summary='# Payroll unblock — execution report\n\nUpdated 2026-10-29 after the authorized engineering continuation.\n\n## Outcome and evidence summary\n\n'
summary+='ENG-10 is complete: reconciled review-tool states, integrated signature/checker validation into preflight, and closed related approval-interval and incomplete-workbook gaps. The field-level register, 36 intended pay dates, review working copies and retained source evidence remain available. Application payroll behavior, canonical approval status and databases were not changed.\n\n'
summary+='| Register status | Entries |\n|---|---:|\n'+''.join(f'| {k.replace("_"," ")} | {v} |\n' for k,v in counts.items())
summary+=f'\nTotal: **{len(register["entries"])} field/dependency entries**. Repeated family/artifact fields are distinct register rows, not unique human questions.\n\n'
summary+=f'Scoped verification: **{len(validation["checks"])} checks passed**. Workflow contract check: **PASS**. Unit tests: **{engineering["after"]["passedTests"]}/{engineering["after"]["tests"]} passed in {engineering["after"]["suites"]} isolated suites**; {engineering["before"]["failedTests"]} regression failures were reproduced before correction. Actual review preflight remains **{sum(c["passed"] for c in gates["preflight"]["checks"])}/12** because authentic reviewer/signature/fixture evidence is missing. Real PostgreSQL and browser checks were not run.\n\n'
summary+='The detailed completion packet follows. The [complete Markdown register](../database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [machine-readable register](../database-seed/payroll-unblock-register.json) retain all field-level records; the report explains the remaining inputs, owners, engineering work and acceptance criteria.\n\n'
packet=(ROOT/'docs/database-seed/PAYROLL-UNBLOCK-COMPLETION-PACKET.md').read_text(encoding='utf8')
packet=re.sub(r'^# Payroll unblock completion packet','## Detailed completion packet',packet,count=1)
packet=re.sub(r'\]\((?!https?://)([^)]+)\)',lambda m:'](../database-seed/'+m.group(1)+')',packet)
(OUT/'PAYROLL-UNBLOCK-REPORT.md').write_text(summary+packet,encoding='utf8')

# Join wrapped list continuations for the repository's small Markdown renderer.
original_story=base.markdown_story
def story(markdown,styles):
    lines=[]
    for line in markdown.splitlines():
        if re.match(r'^  \S',line) and lines and re.match(r'^[-*] ',lines[-1]): lines[-1]+=' '+line.strip()
        else: lines.append(line)
    flows=original_story('\n'.join(lines),styles)
    result=[]
    for flow in flows:
        if isinstance(flow,Paragraph) and flow.getPlainText()=='Ordered continuation': result.append(PageBreak())
        result.append(flow)
    return result
base.markdown_story=story

results=[]
for stem,kind,subtitle in [
    ('PAYROLL-UNBLOCK-PROMPT','FULL REFINED EXECUTION PROMPT','Approved scope, evidence requirements and acceptance criteria'),
    ('PAYROLL-UNBLOCK-REPORT','EXECUTION REPORT','Completed preparation, remaining inputs and engineering handoff'),
]:
    source=OUT/(stem+'.md')
    # Keep the earlier report available; Windows may lock a PDF open in a viewer.
    export_stem=stem+'-2026-10-29-ENGINEERING' if stem.endswith('REPORT') else stem
    destination=OUT/(export_stem+'.pdf')
    base.build_document(source,destination,kind,subtitle)
    reader=PdfReader(str(destination))
    text='\n'.join(p.extract_text() or '' for p in reader.pages)
    if not text.strip() or any(not (p.extract_text() or '').strip() for p in reader.pages): raise RuntimeError('Empty PDF page')
    required=['Acceptance criteria','Do not claim the system is unblocked'] if stem.endswith('PROMPT') else [str(len(register['entries'])),'ENG-10','Ordered continuation','4/12',f'{engineering["after"]["passedTests"]}/{engineering["after"]["tests"]}']
    if not all(x in text for x in required): raise RuntimeError('Missing required PDF content')
    # Contact sheet renders every page for visual inspection without altering PDFs.
    doc=pdfium.PdfDocument(str(destination)); thumbs=[]
    for i in range(len(doc)):
        image=doc[i].render(scale=.65).to_pil().convert('RGB')
        image.thumbnail((310,440))
        tile=Image.new('RGB',(330,470),'#dce3e9'); tile.paste(image,((330-image.width)//2,5))
        ImageDraw.Draw(tile).text((12,450),f'Page {i+1}',fill='black'); thumbs.append(tile)
    cols=3; sheet=Image.new('RGB',(330*cols,470*((len(thumbs)+cols-1)//cols)),'white')
    for i,tile in enumerate(thumbs): sheet.paste(tile,((i%cols)*330,(i//cols)*470))
    sheet.save(OUT/(export_stem+'-preview.png'))
    results.append({'file':str(destination),'pages':len(reader.pages),'bytes':destination.stat().st_size,'textCheck':'PASS'})
(OUT/'pdf-export-check.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf8')
print(json.dumps(results))

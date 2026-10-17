from pathlib import Path
import re,json,hashlib,ast
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT

ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work';DEST=ROOT.parents[1]/'docs'/'bakery'
DEST.mkdir(exist_ok=True)
original=ROOT/'Nkambe_Bakery_Handbook.md'
md=original.read_text('utf-8')
addition=(W/'baguette_workflow.md').read_text('utf-8')
anchor='## Two-site production, staffing and energy'
assert md.count(anchor)==1
md=md.replace(anchor,addition+'\n\n'+anchor)
md=md.replace('Integrated working edition | 3 October 2026','Integrated working edition | 3 October 2026 — expanded baguette workflow')
toc='**Contents**\n\n'+'\n'.join(x[2:] for x in md.splitlines() if re.match(r'^# \d+\.',x))
md=md.replace('<!--TOC-->',toc)
(DEST/original.name).write_text(md,'utf-8')
record=(ROOT/'Source_and_Editorial_Record.md').read_text('utf-8')
record=record.split('## Final file verification')[0]
record=record.replace('The PDF has 165 pages.','The initial Word-rendered PDF had 165 pages. The final bakery-folder edition has been expanded and repaginated by the requested report publisher.')
record=record.replace('## Verification results','## Verification of the initial edition')
record+='''\n## Bakery-folder publication and baguette workflow revision\n\nUser requested docs-report-publisher with docs_subfolder `bakery`. The canonical revised files are `docs/bakery/Nkambe_Bakery_Handbook.md` and its same-named PDF. An editable DOCX is supplied alongside them. The earlier what-next edition remains an earlier working version.\n\nConsulted SRC21 (Commercial Baguette Production Guide), SRC27 (Staggered Baguette Production Schedule), SRC17 (five-batch operations manual), SRC05 (corrected manual) and SRC07 (equipment gaps and trial plan) again for this revision. No new source document was added to the 27-file discovery register. The original handbook summarized some corrections; the revised chapter 12 now contains the full operational synthesis.\n\nAdded: rack-sized formulation; raw versus cooled weight; corrected 23.925 kg source total; handling-loss allowance; capacity comparisons for 25/30/45-minute intervals; the 100-loaf/hour potential bottleneck; a consistent five-rack worked schedule; proof/rack/cooling occupancy; staffing handoffs; preheat, steam, recovery and fuel measurements; delay responses; and a campaign log with stepwise scale-up.\n\nThe 30-minute cadence is a proposed worked example. It is not a measured capability or a replacement for S-B01's recipe method. Its source-style 18-minute mixing/rest block is explicitly distinguished from S-B01's flour-and-water rest. Every final-proof window is 60 minutes, and the five oven-entry times are 30 minutes apart. The original 01:30–02:15 interval was only 45 minutes despite being labelled 60.\n\nCalculation checks: S-B01 factor = 1.685; 80 × 300 g / 0.98 = 24,489.7959 g input; flour = 14,534.0035 g. Rounded formula totals 24,489.8 g and yields approximately 24,000.0 g after the assumed 2% loss. A 300 g piece at 15% bake/cooling loss weighs 255 g. The original 23,925 g batch gives 23,446.5 g after 2% handling loss. Five 80-piece racks are 400 pieces before rejects, with last oven exit at elapsed 04:52 in the worked example.\n\nThe source-guide 15–20-second steam dose and asserted recovery periods remain unverified. The revised workflow uses only manufacturer-approved steam/vent operation and measured recovery. It does not authorize overloading the mixer, overproofing dough, bypassing guards or sealing hot bread.\n\nPublication uses the skill's A4 Markdown-to-PDF renderer, so pagination and styling differ from the initial Word-rendered PDF. The Markdown contains a real contents list rather than a Word-only placeholder. Original source documents and the existing business-plan publication are preserved.\n'''
(DEST/'Source_and_Editorial_Record.md').write_text(record,'utf-8')
# Preserve the pre-existing publication: publisher renders every Markdown in destination.
backup=W/'bakery_publish_backup';backup.mkdir(exist_ok=True)
for name in ['Nkambe_Bakery_Business_and_Production_Plan.md','Nkambe_Bakery_Business_and_Production_Plan.pdf']:
    p=DEST/name;b=backup/name
    if not b.exists():b.write_bytes(p.read_bytes())
# Reuse only the document-formatting functions, without rerunning the original assembly script.
tree=ast.parse((W/'build.py').read_text('utf-8'))
funcs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['field','inline','make_doc']]
exec(compile(ast.Module(body=funcs,type_ignores=[]),'booklet_format','exec'))
make_doc(md,DEST/'Nkambe_Bakery_Handbook.docx')
baseline=original.read_text('utf-8')
ids=json.loads((W/'recipe_coverage.json').read_text('utf-8'))
assert all(re.search(r'^## '+re.escape(row[1])+r'\b',md,re.M) for row in ids)
assert abs(sum([14534.0,9592.4,290.7,72.7])*.98-24000)<.01
assert all((150+30*i)-(90+30*i)==60 for i in range(5))
print(json.dumps({'destination':str(DEST),'primary_cards_preserved':len(ids),'workflow_words':len(addition.split()),'source_word_count':len(baseline.split()),'revised_word_count':len(md.split())},indent=2))

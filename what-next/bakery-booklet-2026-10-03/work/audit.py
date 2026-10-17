from pathlib import Path
import json,re,hashlib
from pypdf import PdfReader
from docx import Document
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work'
inv=json.loads((W/'inventory.json').read_text('utf-8'))
cov=json.loads((W/'recipe_coverage.json').read_text('utf-8'))
checks=json.loads((W/'arithmetic_checks.json').read_text('utf-8'))
original=Path(inv[0]['path']).read_text('utf-8-sig')
octchecks=[]
for m in re.finditer(r'^## ((?:B\d{2}|FBASE\d+))[^\n]*\n([\s\S]*?)(?=^#{1,2} |\Z)',original,re.M):
    body=m[2];p=re.search(r'Pilot input ([\d,]+) g',body)
    if not p:continue
    tb=re.search(r'(?:^\|[^\n]+\n)+',body,re.M)
    rows=[[x.strip() for x in l.strip().strip('|').split('|')] for l in tb[0].splitlines()]
    pi=rows[0].index('Pilot g');pr=rows[0].index('Production g');a=[];b=[]
    for row in rows[2:]:
        a.append(float(row[pi].replace(',','')));b.append(float(row[pr].replace(',','')))
    stated=float(p[1].replace(',',''))
    octchecks.append({'id':m[1],'sum':sum(a),'stated':stated,'pass':abs(sum(a)-stated)<.1,'scale5_pass':all(abs(y-5*x)<.1 for x,y in zip(a,b))})
assert all(x['pass'] and x['scale5_pass'] for x in octchecks),[x for x in octchecks if not x['pass'] or not x['scale5_pass']]
unchanged=all(hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] for x in inv)
assert unchanged
md=(ROOT/'Nkambe_Bakery_Handbook.md').read_text('utf-8')
assert len(cov)==104
assert all(re.search(r'^## '+re.escape(row[1])+r'\b',md,re.M) for row in cov)
pdf=PdfReader(str(ROOT/'Nkambe_Bakery_Handbook.pdf'))
texts=[p.extract_text() or '' for p in pdf.pages]
assert all(row[1] in '\n'.join(texts) for row in cov)
short=[i+1 for i,t in enumerate(texts) if len(t.strip())<100]
bad=[(i+1,t[:100]) for i,t in enumerate(texts) if 'Error! Bookmark' in t or 'Error! Reference' in t]
result={'primary_recipe_and_component_cards':len(cov),'september_total_rows_checked':len(checks),'october_input_totals_and_x5_scales_checked':len(octchecks),'source_hashes_unchanged':unchanged,'pdf_pages':len(pdf.pages),'near_blank_pages':short,'broken_word_fields':bad}
(W/'final_audit.json').write_text(json.dumps(result,indent=2),'utf-8')
dispositions={
'SRC01':'Governing October source: all 36 bakery/savoury bases, 20 core products, 4 additions, 7 frozen bases and 8 frozen formats retained with O identifiers; equipment, operations and costing consolidated.',
'SRC02':'PDF publication of SRC01; text checked as a companion, not counted as extra recipes.',
'SRC03':'Agege/Shokupan retained in V01; slicer, divider, planetary mixer, sheeter, RFQ, packaging and positioning suggestions harmonized in chapters 3 and 12.',
'SRC04':'PDF publication paired with SRC03; not counted as separate recipes.',
'SRC05':'Earlier expanded manual: overlapping formulas superseded by S cards; unique cocoa-groundnut bread, pocket, mango soft serve, spring rolls and brioche shaping retained in V03/V08. Recipe portfolio represented in V02.',
'SRC06':'PDF publication paired with SRC05; no separate recipe count.',
'SRC07':'Equipment gaps and trial sequencing incorporated into equipment, H controls and launch records; hypothetical purchases remain conditional.',
'SRC08':'All 28 research-edition cards retained with S identifiers. Component mass balances, ingredient quantities, methods, variants and defects retained; repeated general controls centralized.',
'SRC09':'PDF publication paired with SRC08; no separate recipe count.',
'SRC10':'Workbook inspected with openpyxl, including all sheet dimensions and scenario/capacity/batch-input formulas. Recipe formulas/yields are represented by S cards. Missing commercial inputs remain unknown; no workbook recalculation or new forecast claimed.',
'SRC11':'Research source register retained in chapter 14 with original access dates and limits.',
'SRC12':'Revision/verification history used for context; does not certify this edition. Its technical corrections are reflected in the working source hierarchy; historic build logs excluded from the operator booklet.',
'SRC13':'Condensed updated PDF: overlaps SRC14/SRC05; source corrections and product families consolidated, not counted anew.',
'SRC14':'Earlier manual iteration; overlapping recipes superseded by SRC05/SRC08, distinct concepts retained in V02/V03.',
'SRC15':'Early condensed manual; cocoa-banana frozen formula preserved in V02; general portfolio and scheduling ideas consolidated.',
'SRC16':'24-product earlier formulation manual; specialist bread/pastry/frozen formulas preserved or mapped in V02, with later complete versions preferred.',
'SRC17':'Earlier operations/formulation manuscript; timeline, staffing, logistics and portfolio consolidated. Conflicting recipe quantities remain development variants, not merged into invented formulas.',
'SRC18':'Early condensed master PDF; repeated bakery portfolio and operational concepts consolidated.',
'SRC19':'Cameroon master guide; baguette water/ice, rack capacity, scheduling and market claims reconciled. Repeated product families map to S cards and V02.',
'SRC20':'All ten recipe concepts and distinctive quantities retained in V05; unsafe shelf-life/machine claims corrected explicitly.',
'SRC21':'Baguette guide: water/ice, dough temperature, oven/steam and capacity concepts harmonized; unsupported yield assertions corrected.',
'SRC22':'All twenty blueprint products and quantities retained in V04, with development gaps and primary-card alternatives.',
'SRC23':'Byte-identical duplicate of SRC22 (same SHA-256); excluded from unique content count.',
'SRC24':'Short commercial blueprint: overlapping equipment/menu ideas consolidated into chapters 3 and 12.',
'SRC25':'Condensed-milk collection preserved in V06; duplicate yogurt-mayo sauce mapped to V04/V07; main O-series supplies more detailed working alternatives.',
'SRC26':'Toum and yogurt-mayo variants retained in V07; unmeasured volumes and refrigeration requirements made explicit.',
'SRC27':'Staggered baguette schedule consolidated; 45-minute mix starts versus 25-minute oven cycles corrected rather than repeated as guaranteed synchronization.'}
lines=['# Bakery booklet — source and editorial record','', 'Edition: 3 October 2026. Discovery window: 4 September–3 October 2026 inclusive, using local modification dates and dated bakery conversation context.','',
'## Deliverables and coverage','',
f'The integrated handbook contains {len(cov)} primary recipe/component/trial cards: 75 October cards, 28 September cards and the user’s cake-donut trial. Chapter 11 contains eight groups of earlier formulas, meaningful alternatives and incomplete concepts. This count includes bases and assembly cards; it is not a claim of 104 distinct finished products. The PDF has {len(pdf.pages)} pages.','',
'The 27 discovered files include published Markdown/PDF pairs, earlier iterations and one byte-identical duplicate. They are not 27 independent research sources. Coverage means all identified product families and substantive operational ideas were accounted for; it does not mean every sentence, superseded range or repeated table was reprinted.','',
'## Discovery boundary','',
'Searched the current project bakery folders, bakery working folders identified from recent related chats, relevant Downloads, accessible Google Drive and Pages. Google Drive and Pages searches returned no additional in-window bakery sources. Read the “Reduce cracks in cake donuts”, “new bakery recipes” and “bakery innovations” discussions for source locations and requested context. No unrestricted search of every private drive/account is claimed. Local file modification dates may reflect downloading or regeneration rather than original authorship.','',
'The pasted prompt is an instruction, not recipe evidence. Older unrelated software/technology material was excluded. No supplier was contacted; no purchases, messages, uploads or publishing were performed.','',
'## Source register','']
for x in inv:
    lines += [f"### {x['id']} — {x['name']}",'',f"Path: `{x['path']}`",'',f"Modified: {x['modified']} | SHA-256: `{x['sha256']}`",'',dispositions[x['id']],'']
lines += ['### CHAT01 — Reduce cracks in cake donuts','', 'Chat ID: `01a0e11d-ce55-76c1-ba20-cced9267206a`. User-supplied 6 kg flour formula retained in T01. EDC identity was not confirmed; earlier assumptions about EDC-95 were not adopted. The water and emulsifier comparisons are proposed tests, not completed experiments.','',
'## Harmonization decisions','',
'- October equipment information governs the current operating layout; conflicting mixer ratings and missing model plates remain unresolved.','- H01–H05 centralize handling: cold storage target 4°C or below, frozen stock −18°C or colder, hot holding at least 63°C, meat/fish/poultry/cooked-egg cooking and reheating 75°C for 30 seconds. Product-specific milk treatment and yogurt incubation remain separate. External guidance is not represented as Cameroonian law.','- Continuous dairy treatment seconds were not transferred to an ordinary pot. The batch reference remains 69°C/30 minutes in a qualified system; approved ready mix is the fallback.','- A seven-day frozen pilot suggestion was removed as an automatic sale period. No generic commercial juice or yogurt shelf life was invented.','- Current Yogourmet guidance specifies one sachet per litre; the retained 6 g source entry is conditional on verifying the local sachet mass and identity.','- O and S prefixes prevent conflicting B01/P01/F01 identifiers from being mistaken for the same formula.','- O-B32 is identified as a batter-to-baked-sponge component; assembled cake uses baked sponge output.','- O-F07 conservative 12-bar costing is distinguished from the arithmetic maximum of 13 × 70 g from 970 g usable mix.','- Agege improver dose, Shokupan liquid allocation, levain hydration, unidentified stabilizers, unnamed EDC and missing pastry/filling quantities remain visible gaps.','- Koki corn and makabo are not treated as interchangeable raw materials. Avocado antibrowning, garlic/oil sauce, caramel and hot-filled condiments are not described as shelf-stable.','- Solar electricity and residual oven heat are not free operating costs. Supplier and market claims remain hypotheses.','- Generic repeated controls, duplicated publications, historic build logs, unsupported promotional language and superseded prose were consolidated; no source files were edited.','',
'## Primary-card coverage map','', '| Source | Booklet ID | Source title | Disposition |','|---|---|---|---|']
for row in cov:lines.append('| '+' | '.join(row)+' |')
lines += ['', '## Verification results','',f'- {len(checks)} September formula total rows independently summed; all passed within 0.1 g display tolerance.',f'- {len(octchecks)} October base input totals and ×5 production columns independently checked; all passed.', '- B36’s separate 1,081 g input was checked against its ingredient table during source review; no ×5 column is claimed for that card.','- All 104 primary IDs appear in both the manuscript and the exported PDF.','- All 27 original file SHA-256 hashes remain unchanged.','- DOCX exported through installed Microsoft Word with updated contents and PDF bookmarks. The canonical LibreOffice renderer could not run because soffice is unavailable; Word provided the actual document layout for PDF review.',f'- Near-blank PDF pages detected by text screening: {short or "none"}. Broken Word reference fields: {bad or "none"}.','- Page images were rendered for visual review; the final review note is appended after inspection.','',
'These checks verify source accounting, selected arithmetic and document output. They do not establish physical recipe performance, laboratory composition, microbial shelf life, machine capacity, supplier pricing or market demand. October monetary examples were retained as illustrative source calculations; not every financial cell was independently recomputed. The September workbook was read, not recalculated or certified.','',
'## Remaining information before commercial release','',
'Actual equipment manuals/nameplates and loads; current ingredient specifications and quotations; culture/stabilizer/improver identities; fruit pH/Brix variability; validated heating/cooling and packing; measured yields and sale weights; laboratory-supported shelf life; local labeling and food-business requirements; real sales and energy data. These are production-validation requirements, not missing booklet pages.','',
'## New preservation references','', (W/'new_references.md').read_text('utf-8')]
(ROOT/'Source_and_Editorial_Record.md').write_text('\n'.join(lines)+'\n','utf-8')
print(json.dumps(result,indent=2))

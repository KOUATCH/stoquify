"""Local ReportLab fallback for the unavailable Chromium publisher; validates every PDF."""
from pathlib import Path
import importlib.util, hashlib, json, re, os
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/payroll-blockers'
spec=importlib.util.spec_from_file_location('review_renderer',ROOT/'docs/unblock/render_calculation_review_pdf.py')
renderer=importlib.util.module_from_spec(spec); spec.loader.exec_module(renderer)
stems=['PAYROLL-CALCULATION-CONTRACT','PAYROLL-CALCULATION-REVIEWER-CHECKLIST','PAYROLL-UNBLOCK-REGISTER','PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4']
renderer.render(OUT,stems,prepared_date='2 November 2026',edition='Draft 4',link_root=OUT)
results=[]
for stem in stems:
    file=OUT/(stem+'.pdf')
    reader=PdfReader(file)
    text='\n'.join(page.extract_text() or '' for page in reader.pages)
    assert len(reader.pages)>0 and '2 November 2026' in text and 'ED-05' in text
    assert file.stat().st_size>1000
    missing=[]
    for page in reader.pages:
        for ref in page.get('/Annots',[]):
            action=ref.get_object().get('/A',{})
            uri=action.get('/URI','')
            if uri.startswith('file:'):
                raw=unquote(urlparse(uri).path)
                if re.match(r'^/[A-Za-z]:/',raw): raw=raw[1:]
                if not Path(raw).exists(): missing.append(raw)
    assert not missing, (stem,missing)
    document=pdfium.PdfDocument(str(file))
    columns=3; width=300; height=445
    sheet=Image.new('RGB',(columns*width,((len(document)+columns-1)//columns)*height),'#ccd5dd')
    draw=ImageDraw.Draw(sheet)
    for index in range(len(document)):
        page=document[index]; pic=page.render(scale=.5).to_pil().convert('RGB'); pic.thumbnail((width-12,height-28))
        x=(index%columns)*width+6; y=(index//columns)*height+22
        sheet.paste(pic,(x,y)); draw.text((x,y-17),f'{stem} / {index+1}',fill='black')
        page.close()
    document.close()
    preview=OUT/'evidence'/(stem+'-preview.png'); sheet.save(preview)
    results.append({'file':str(file.relative_to(ROOT)).replace(chr(92),'/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pages':len(reader.pages),'bytes':file.stat().st_size,'textCheck':'PASS','localLinkCheck':'PASS','preview':str(preview.relative_to(ROOT)).replace(chr(92),'/')})
form=json.loads((OUT/'PAYROLL-CALCULATION-REVIEW-RETURN.json').read_text(encoding='utf8'))
assert all(d['status']=='PENDING_REVIEW' and d['selectedTreatmentOrFormula'] is None and d['reviewedBy'] is None for d in form['decisions'])
assert all(f['expectedOutput'] is None for f in form['fixtures'])
result={'generatedAt':datetime.now(timezone.utc).isoformat(),'renderer':'ReportLab fallback; repository Chromium publisher could not launch because its executable was absent','documents':results,'statutoryApprovalsPending':16,'fixtureExpectationsPending':22,'visualReview':'PENDING'}
(OUT/'PAYROLL-PUBLICATION-CHECK.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps(results,indent=2))

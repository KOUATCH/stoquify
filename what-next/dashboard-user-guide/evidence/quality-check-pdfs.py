from pathlib import Path
import json, re, shutil, unicodedata
import pdfplumber, pypdfium2
from pypdf import PdfReader, PdfWriter
from pypdf.generic import TextStringObject, NameObject, Fit

base = Path('docs/dashboard-user-guide').resolve()
audit = Path('what-next/dashboard-user-guide').resolve()
evidence = audit / 'evidence'
reports = []
def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFKC', value).lower() if c.isalnum())
def slug(value):
    return re.sub(r'\s', '-', ''.join(c for c in value.lower() if c.isalnum() or c.isspace() or c in '_-'))

for pdf in sorted(base.rglob('*.pdf')):
    md = pdf.with_suffix('.md')
    expected = [(len(m[1]), m[2]) for m in re.finditer(r'^(#{1,3}) (.+)$', md.read_text(encoding='utf-8'), re.M)]
    found, clipping, blanks, texts = [], [], [], []
    with pdfplumber.open(pdf) as document:
        count = len(document.pages)
        for page_index, page in enumerate(document.pages):
            text = page.extract_text() or ''
            texts.append(text)
            if len(text.strip()) < 15:
                blanks.append(page_index + 1)
            chars = [c for c in page.chars if c.get('text','').strip()]
            outside = [c for c in chars if c['x0'] < -1 or c['x1'] > page.width + 1 or c['top'] < -1 or c['bottom'] > page.height + 1]
            if outside:
                clipping.append({'page':page_index + 1, 'characters':len(outside)})
            words = [w for w in page.extract_words(extra_attrs=['size']) if float(w['size']) >= 13]
            lines = []
            for word in sorted(words, key=lambda w:(round(w['top'],1),w['x0'])):
                if lines and abs(lines[-1]['top']-word['top']) < 2:
                    lines[-1]['words'].append(word['text'])
                else:
                    lines.append({'top':word['top'],'size':float(word['size']),'words':[word['text']]})
            for i,line in enumerate(lines):
                value = ' '.join(line['words'])
                found.append((normalized(value),page_index,line['top'],page.height))
                # Long headings can wrap to a second line.
                if i+1 < len(lines) and lines[i+1]['top']-line['top'] < 42 and abs(lines[i+1]['size']-line['size']) < 1:
                    found.append((normalized(value+' '+' '.join(lines[i+1]['words'])),page_index,line['top'],page.height))
            page.close()
    reader = PdfReader(pdf)
    writer = PdfWriter(clone_from=reader)
    parents, duplicate_slugs, heading_matches, missing = {}, {}, [], []
    last_position = (-1,-1)
    for level,title in expected:
        key = normalized(title)
        match = next((f for f in found if f[0] == key and (f[1],f[2]) >= last_position), None)
        if match is None:
            missing.append(title)
            continue
        _,page_index,top,height = match
        last_position = (page_index,top)
        effective_level=min(level,max(parents.keys(),default=0)+1)
        parent=parents.get(effective_level-1)
        bookmark=writer.add_outline_item(title,page_index,parent=parent,bold=effective_level==1,fit=Fit.xyz(left=0,top=height-top,zoom=0))
        parents[effective_level]=bookmark
        for old in list(parents):
            if old>effective_level: del parents[old]
        name=slug(title)
        seen=duplicate_slugs.get(name,0)
        duplicate_slugs[name]=seen+1
        writer.add_named_destination(name+(('-'+str(seen)) if seen else ''),page_index)
        heading_matches.append({'title':title,'page':page_index+1,'level':level})
    converted=0
    for page in writer.pages:
        for ref in page.get('/Annots',[]):
            obj=ref.get_object()
            action=obj.get('/A')
            if action and action.get('/URI'):
                uri=str(action['/URI'])
                if '.md' in uri and 'dashboard-user-guide' in uri:
                    uri=uri.replace('.md#','.pdf#nameddest=').replace('.md','.pdf')
                    action[NameObject('/URI')]=TextStringObject(uri)
                    converted+=1
    writer.add_metadata({'/Title': expected[0][1] if expected else pdf.stem,'/Subject':'Source-based dashboard user guide; runtime verification blocked by sign-in','/Author':'Stoquify documentation review'})
    temporary=evidence/(pdf.stem+'-navigation.pdf')
    writer.write(temporary)
    writer.close()
    # Replace only the known report inside the requested publication directory.
    if not pdf.is_relative_to(base): raise ValueError('Unexpected output path')
    shutil.copyfile(temporary,pdf)
    temporary.unlink()
    checked=PdfReader(pdf)
    assert len(checked.pages)==count and pdf.stat().st_size>1024
    report={'file':str(pdf.relative_to(base)).replace('\\','/'),'pages':count,'bookmarks':len(heading_matches),'unmatchedHeadings':missing,'outOfPageText':clipping,'blankPages':blanks,'documentLinksConvertedToPDF':converted,'bytes':pdf.stat().st_size}
    reports.append(report)
    print(json.dumps(report),flush=True)
    if pdf.name in ['dashboard-user-guide.pdf','metric-dictionary.pdf','settings.pdf','inventory.pdf']:
        preview=pypdfium2.PdfDocument(str(pdf))
        selected=[0]
        if pdf.name=='settings.pdf':
            section=next((h for h in heading_matches if h['title']=='Module control center'),None)
            if section:selected.append(section['page']-1)
        elif pdf.name=='dashboard-user-guide.pdf': selected.append(count-1)
        for index in sorted(set(selected)):
            page=preview[index]
            bitmap=page.render(scale=1.35)
            image=bitmap.to_pil()
            image.save(evidence/(pdf.stem+'-page-'+str(index+1)+'.png'))
            image.close(); bitmap.close(); page.close()
        preview.close()
    target=audit/pdf.relative_to(base)
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(pdf,target)

result={'reports':reports,'pairs':len(reports),'totalPagesIncludingCompleteEdition':sum(r['pages'] for r in reports),'completeGuidePages':next(r['pages'] for r in reports if r['file']=='dashboard-user-guide.pdf'),'textOutsidePage':sum(len(r['outOfPageText']) for r in reports),'blankPages':sum(len(r['blankPages']) for r in reports),'unmatchedHeadings':sum(len(r['unmatchedHeadings']) for r in reports)}
(evidence/'pdf-quality.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='reports'}),flush=True)
if result['textOutsidePage'] or result['blankPages'] or result['unmatchedHeadings']:
    raise SystemExit(1)

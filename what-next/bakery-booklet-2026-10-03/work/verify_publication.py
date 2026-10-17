from pathlib import Path
import hashlib,json,re,shutil
import pypdfium2 as pdfium
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work';D=ROOT.parents[1]/'docs'/'bakery';S=D/'_publication-staging'
names=['Nkambe_Bakery_Handbook','Source_and_Editorial_Record']
for name in names:
    assert (S/(name+'.md')).read_bytes()==(D/(name+'.md')).read_bytes()
    data=(S/(name+'.pdf')).read_bytes();assert data[:5]==b'%PDF-' and len(data)>1024
    shutil.copyfile(S/(name+'.pdf'),D/(name+'.pdf'))
for ext in ['md','pdf']:
    assert (D/('Nkambe_Bakery_Business_and_Production_Plan.'+ext)).read_bytes()==(W/'bakery_publish_backup'/('Nkambe_Bakery_Business_and_Production_Plan.'+ext)).read_bytes()
for p in D.glob('*.md'):
    data=p.with_suffix('.pdf').read_bytes();assert data[:5]==b'%PDF-' and len(data)>1024
out=W/'published-review';out.mkdir(exist_ok=True)
book=pdfium.PdfDocument(str(D/'Nkambe_Bakery_Handbook.pdf'));texts=[];thumbs=[];workflow=[]
for i in range(len(book)):
    page=book[i];tp=page.get_textpage();text=tp.get_text_range();texts.append(text);tp.close()
    im=page.render(scale=.65).to_pil().convert('RGB');thumb=ImageOps.contain(im,(240,340));tile=Image.new('RGB',(260,365),'#ddd');tile.paste(thumb,((260-thumb.width)//2,3));ImageDraw.Draw(tile).text((8,348),str(i+1),fill='black');thumbs.append(tile)
    if any(phrase in text for phrase in ['Large-scale baguette production','One-rack planning example','Corrected five-rack worked schedule','Proofers, racks, cooling space','When the timetable slips','Campaign record and scale-up']):workflow.append(i+1)
    if i==0 or i+1 in workflow:page.render(scale=1.5).to_pil().save(out/f'page-{i+1:03}.png')
    page.close()
for start in range(0,len(thumbs),24):
    sheet=Image.new('RGB',(1560,1460),'white')
    for j,t in enumerate(thumbs[start:start+24]):sheet.paste(t,((j%6)*260,(j//6)*365))
    sheet.save(out/f'contact-{start//24+1:02}.jpg',quality=88)
alltext='\n'.join(texts);compact=re.sub(r'\s+','',alltext)
ids=json.loads((W/'recipe_coverage.json').read_text('utf-8'))
missing=[x[1] for x in ids if x[1] not in compact];assert not missing,missing
assert '<!--TOC-->' not in alltext
nearblank=[i+1 for i,x in enumerate(texts) if len(x.strip())<60]
result={'destination':str(D),'pdf_pages':len(book),'all_104_primary_cards_present':True,'workflow_pages':workflow,'near_blank_pages':nearblank,'existing_business_plan_unchanged':True,'all_markdown_pdf_pairs_valid':True,'publisher_exit_code':0,'publication_method':'Skill publisher in bakery/_publication-staging, then copied validated PDFs into bakery; existing business-plan PDF was locked against replacement.'}
result['files']={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in D.iterdir() if p.is_file() and p.suffix in ['.md','.pdf','.docx']}
(W/'publication_validation.json').write_text(json.dumps(result,indent=2),'utf-8')
# Remove only the four known staging artifacts and then the empty staging directory.
for name in names:
    for ext in ['md','pdf']:(S/(name+'.'+ext)).unlink()
S.rmdir()
print(json.dumps(result,indent=2))

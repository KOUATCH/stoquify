from pathlib import Path
import hashlib,json,re
from datetime import datetime
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
old=Path(r'C:\Users\J COMPUTER\Documents\Codex\2026-09-12\x20-using-this-document-download-the\docs\bakery')
roots=[Path('docs/bakery'),Path('docs/bakery-recipes'),old,Path(r'C:\Users\J COMPUTER\Documents\Codex\2026-09-12\x20-go\docs\bakery'),Path(r'C:\Users\J COMPUTER\Documents\Codex\2026-09-12\x20-go\outputs'),Path(r'C:\Users\J COMPUTER\Downloads')]
records=[]; seen={}; pdftexts=[]
for root in roots:
 for p in sorted(root.glob('*')):
  if not p.is_file() or p.suffix.lower() not in ['.pdf','.md','.xlsx']:continue
  if root.name=='Downloads' and not re.search('bakery|baguette|recipe|recett|yogurt|yaourt|juice|patis|bread',p.name,re.I):continue
  if max(p.stat().st_mtime,p.stat().st_ctime)<datetime(2026,9,4).timestamp():continue
  digest=hashlib.sha256(p.read_bytes()).hexdigest(); code=f'SRC{len(records)+1:02}'
  rec={'id':code,'path':str(p.resolve()),'name':p.name,'sha256':digest,'modified':datetime.fromtimestamp(p.stat().st_mtime).isoformat(),'duplicate_of':seen.get(digest)}
  if digest not in seen:seen[digest]=code
  if p.suffix=='.pdf':
   reader=PdfReader(p); t='\n\n'.join(page.extract_text() or '' for page in reader.pages);rec.update(pages=len(reader.pages),images=sum(len(page.images) for page in reader.pages))
   (ROOT/'work'/f'{code}.txt').write_text(t,encoding='utf-8')
   if not rec['duplicate_of'] and root.name=='Downloads':pdftexts.append(f'\n\n===== {code} {p.name} =====\n{t}')
  records.append(rec)
(ROOT/'work'/'inventory.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
(ROOT/'work'/'download_sources.txt').write_text(''.join(pdftexts),encoding='utf-8')
print(json.dumps([{'id':r['id'],'name':r['name'],'duplicate_of':r['duplicate_of'],'pages':r.get('pages'),'images':r.get('images')} for r in records],indent=2))

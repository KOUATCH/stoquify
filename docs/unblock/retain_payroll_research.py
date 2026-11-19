"""Retain explicitly selected official documents; extract text without app/DB access."""
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json, hashlib
import pypdfium2 as pdfium
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/unblock/research'
items=[
 ('DGI-finance-circular-2024.pdf','https://www.impots.cm/sites/default/files/documents/Circulaire%20LF%202024.pdf'),
 ('DGI-CGI-2024.pdf','https://www.impots.cm/sites/default/files/documents/CGI%202024%20version%20francaise.pdf'),
 ('DGI-IRPP-bareme.pdf','https://www.impots.cm/sites/default/files/documents/BAREME%20IRPP_DSSI%20final.pdf'),
 ('DGI-TDL-bareme.pdf','https://www.impots.cm/sites/default/files/documents/BAREME%20TDL_DSSI%20final.pdf'),
 ('DGI-IRPP-declaration-circular.pdf','https://www.impots.cm/sites/default/files/documents/circulaire%20d%C3%A9claration%20IRPP.pdf'),
 ('DGI-finance-circular-2025.pdf','https://www.impots.cm/sites/default/files/documents/CIRCULAIRE%20LF2025..pdf'),
 ('DGI-finance-circular-2026.pdf','https://impots.cm/sites/default/files/publications/circulaire%20lf%202026%20VF%20%281%29-compress%C3%A9.pdf'),
]
index_file=OUT/'retained-source-index.json'
previous={r.get('file'):r for r in json.loads(index_file.read_text())} if index_file.exists() else {}
records=[]
for name,url in items:
 file=OUT/name
 try:
  if not file.exists():
   with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45) as response: data=response.read()
   assert data.startswith(b'%PDF-')
   file.write_bytes(data)
  data=file.read_bytes()
  relative=file.relative_to(ROOT).as_posix()
  now=datetime.now(timezone.utc).isoformat()
  record={'file':relative,'url':url,'retrievedAt':previous.get(relative,{}).get('retrievedAt',now),'inspectedAt':now,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
  doc=pdfium.PdfDocument(str(file))
  parts=[]
  for i in range(len(doc)):
   page=doc[i]; text=page.get_textpage(); parts.append(f'\n--- PDF PAGE {i+1} ---\n'+text.get_text_range()); text.close();page.close()
  record['pages']=len(doc);doc.close()
  file.with_suffix('.txt').write_text('\n'.join(parts),encoding='utf8')
  records.append(record)
 except Exception as error: records.append({'url':url,'error':str(error)})
 print(json.dumps(records[-1]),flush=True)
file=ROOT/'docs/database-seed/payroll-unblock-workpapers/DGI-finance-law-2025.pdf'
doc=pdfium.PdfDocument(str(file));parts=[]
for i in range(len(doc)):
 page=doc[i]; text=page.get_textpage();parts.append(f'\n--- PDF PAGE {i+1} ---\n'+text.get_text_range());text.close();page.close()
doc.close()
(OUT/'DGI-finance-law-2025.txt').write_text('\n'.join(parts),encoding='utf8')
(OUT/'retained-source-index.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf8')

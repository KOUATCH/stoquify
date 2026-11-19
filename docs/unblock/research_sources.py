"""Extract retained official source pages for scoped payroll research."""
from pathlib import Path
import json
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/unblock/research'
OUT.mkdir(exist_ok=True)
items=[
 ('CGI-2026-first-120',ROOT/'docs/database-seed/payroll-unblock-workpapers/DGI-CGI-2026.pdf',120),
 ('CNPS-decree',ROOT/'docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Decree-2016-072-contribution-rates.pdf',100),
 ('CNPS-FAQ',ROOT/'docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Official-FAQ-Decree-2016-072.pdf',100),
]
for name,file,limit in items:
 reader=PdfReader(str(file))
 text='\n'.join(f'\n--- PDF PAGE {i+1} ---\n'+(reader.pages[i].extract_text() or '') for i in range(min(limit,len(reader.pages))))
 (OUT/(name+'.txt')).write_text(text,encoding='utf8')
 print(json.dumps({'source':str(file),'pages':len(reader.pages),'extracted':min(limit,len(reader.pages)),'characters':len(text)}))

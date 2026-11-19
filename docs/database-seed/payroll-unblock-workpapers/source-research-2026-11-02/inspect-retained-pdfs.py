"""Read retained PDF bytes; write engineering page/locator evidence only."""
from pathlib import Path
import hashlib
import json
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'retained-source-manifest.json').read_text(encoding='utf-8'))
rows = []
for item in manifest['entries']:
    if item['status'] != 'RETAINED' or not item['file'].endswith('.pdf'):
        continue
    source = ROOT / item['file']
    data = source.read_bytes()
    assert hashlib.sha256(data).hexdigest() == item['sha256']
    reader = PdfReader(source)
    pages = len(reader.pages)
    # Full page text inspection is reserved for the two new amendment circulars.
    selected = range(pages) if 'CIRCULAIRE' in item['file'] else range(min(3,pages))
    hits = {key: [] for key in ('TVA', 'IRPP', 'salaire', 'Article 128', 'Article 142', 'Article 69', 'Article 34')}
    readable = 0
    for index in selected:
        text = reader.pages[index].extract_text() or ''
        readable += bool(text.strip())
        for key in hits:
            if re.search(re.escape(key).replace(r'\ ', r'\s+'), text, re.IGNORECASE):
                hits[key].append(index+1)
    rows.append({'file':item['file'],'bytes':len(data),'sha256':item['sha256'],'pageCount':pages,'readablePagesInInspectedScope':readable,'inspectedPages':list(i+1 for i in selected),'candidateTermPages':hits,'classification':'ENGINEERING_EXTRACTION_LOCATORS_NOT_LEGAL_REVIEW'})
    print(json.dumps({'file':item['file'],'pages':pages,'readableInspectedPages':readable,'candidateTermPages':hits}))
(ROOT / 'pdf-inspection.json').write_text(json.dumps({'schemaVersion':1,'statutoryApproval':False,'entries':rows},indent=2)+'\n',encoding='utf-8')

from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import hashlib, json
out = Path(__file__).resolve().parent
root = out.parents[3]
folder = root / 'docs/blockers-and-gates/hris-payroll-compliance-prefill'
records=[]
for file in sorted(folder.glob('*.docx')):
    if file.name.startswith('~$'):
        continue
    with ZipFile(file) as archive:
        doc=ET.fromstring(archive.read('word/document.xml'))
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs=[''.join(node.text or '' for node in p.findall('.//w:t',ns)) for p in doc.findall('.//w:p',ns)]
    target=out/(file.stem+'.txt')
    target.write_text('\n'.join(f'{i+1}: {p}' for i,p in enumerate(paragraphs)),encoding='utf-8')
    records.append({'source':str(file.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'paragraphCount':len(paragraphs),'extractedFile':target.name,'method':'Read only DOCX zip word/document.xml w:p/w:t; no document edited; signatures/images not interpreted as authenticated approvals'})
(out/'prior-authority-docs.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print(json.dumps(records,indent=2))

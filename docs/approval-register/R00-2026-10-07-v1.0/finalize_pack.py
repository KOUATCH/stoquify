"""Verify draft artifacts and add only the R00 preparation links to the live ledger."""
from pathlib import Path
from datetime import datetime, timezone
import copy, hashlib, json, re, zipfile
from docx import Document
from pypdf import PdfReader

PACK = Path(__file__).resolve().parent
ROOT = PACK.parents[2]
RUN = ROOT / 'what-next/platform-remediation/2026-09-30-run-01'
data = json.loads((PACK/'decision-data.json').read_text(encoding='utf-8'))
canonical = (ROOT/data['sources'][0]['path']).read_text(encoding='utf-8')
rows = re.findall(r"\['(D0[1-8])','([^']+)','([^']+)','([^']+)'\]", canonical)
assert len(rows) == len(data['decisions']) == 8
for item, (identifier, meaning, roles, timing) in zip(data['decisions'], rows):
    assert (item['id'], item['exact'], item['owner']) == (identifier, meaning, roles)
    assert item['status'] == 'AWAITING_HUMAN_VALIDATION'
    assert all(item[key] is None for key in ['selectedDecision','decisionMaker','outcome','signature','approvalReference'])
    assert item['reviewers'] == [] and len(item['questions']) == 6
assert data['productionAuthorized'] is False and data['status'] == 'DRAFT'

ledger = RUN/'execution-register.json'
raw = ledger.read_text(encoding='utf-8')
before = json.loads(raw)
original = copy.deepcopy(before)
snapshot = PACK/'qa/execution-register-before-pack.json'
if not snapshot.exists():
    snapshot.write_bytes(ledger.read_bytes())
for source in data['sources']:
    path = ROOT/source['path']
    assert path.exists(), path
    if source['id'] == 'S2':
        path = snapshot
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256'], source['id']

counts = [3,16,2,2,3]
pdfs = sorted(PACK.glob('*.pdf'))
assert len(pdfs) == 5
files = []
for pdf, count in zip(pdfs, counts):
    reader = PdfReader(pdf)
    assert len(reader.pages) == count
    doc = Document(pdf.with_suffix('.docx'))
    assert not doc.element.xpath('.//w:pBdr') and not doc.styles.element.xpath('.//w:pBdr')
    texts = []
    for n,page in enumerate(reader.pages,1):
        text = page.extract_text()
        assert 'DRAFT' in text and '1.0' in text and '7 October 2026' in text
        assert len(text) > 400
        assert (PACK/'qa'/pdf.stem/f'page-{n}.png').exists()
        texts.append(text)
    if pdf.name.startswith('02_'):
        text = '\n'.join(texts)
        for item in data['decisions']:
            for n in range(1,7):
                assert f"{item['id']}.{n}" in text
    for suffix in ['.docx','.pdf','.md']:
        path = pdf.with_suffix(suffix)
        files.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'pages':count if suffix=='.pdf' else None})
for name in ['README.md','SOURCE_INDEX.md']:
    for target in re.findall(r'\]\(([^)]+)\)',(PACK/name).read_text(encoding='utf-8')):
        assert (PACK/target).resolve().exists(), target

r00 = before['packages'][0]
assert r00['id']=='R00' and r00['status']=='PARTIAL' and r00['humanAssignment']=='UNCONFIRMED'
prefix = '../../../docs/approval-register/R00-2026-10-07-v1.0/'
for name in ['README.md','decision-data.json','VERIFICATION.json']:
    if prefix+name not in r00['evidence']:
        r00['evidence'].append(prefix+name)
addition = ' October 7 R00 preparation: five versioned Word/PDF documents and structured D01–D08 records prepared as DRAFT/AWAITING HUMAN VALIDATION. All eight meanings and joint accountable roles match the roadmap. No human appointment, decision approval or release authorization was created.'
if addition not in r00['progress']:
    r00['progress'] += addition
r00['nextAction'] = 'Complete the R00 decision workbook, verify named reviewer appointments and record scoped D01–D08 decisions or valid deferrals with evidence using the draft pack; obtain R00 acceptance review before any release decision.'
now = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
old_block = '\n'.join('    '+line for line in json.dumps(original['packages'][0],ensure_ascii=False,indent=2).splitlines())
new_block = '\n'.join('    '+line for line in json.dumps(r00,ensure_ascii=False,indent=2).splitlines())
assert raw.count(old_block)==1
raw = raw.replace(old_block,new_block,1)
raw = raw.replace('"updatedAt": '+json.dumps(original['updatedAt']), '"updatedAt": '+json.dumps(now),1)
updated = json.loads(raw)
assert updated['packages'][1:] == original['packages'][1:]
for key,value in original.items():
    if key not in ['packages','updatedAt']:
        assert updated[key] == value
for key,value in original['packages'][0].items():
    if key not in ['progress','evidence','nextAction']:
        assert r00[key] == value
assert all(value in r00['evidence'] for value in original['packages'][0]['evidence'])
ledger.write_text(raw,encoding='utf-8',newline='\r\n')
mdpath = RUN/'EXECUTION_REGISTER.md'
md = mdpath.read_text(encoding='utf-8')
md = re.sub(r'^Updated: .*$',f'Updated: {now}',md,count=1,flags=re.M)
section = ('## October 7 R00 decision pack\n\n'
    f'[Start here]({prefix}README.md), [structured decisions]({prefix}decision-data.json) and [document verification]({prefix}VERIFICATION.json).\n\n'
    '**DRAFT / AWAITING HUMAN VALIDATION.** Five editable Word documents and printable PDFs cover D01–D08, reviewer appointments, decision/signature records and unresolved evidence. All 26 PDF pages were visually inspected. R00 remains PARTIAL and humanAssignment remains UNCONFIRMED. Preparation supplies no appointment, approval, compliance certification or release authority.\n\n')
if '## October 7 R00 decision pack' not in md:
    md = md.replace('## Material data findings',section+'## Material data findings',1)
md = re.sub(r'^\| R00 \|.*$',f"| R00 | {r00['title']} | PARTIAL | {r00['nextAction']} |",md,count=1,flags=re.M)
mdpath.write_text(md,encoding='utf-8',newline='\r\n')
for ref in r00['evidence'][-3:-1]:
    assert (RUN/ref).resolve().exists()

receipt = {'status':'VERIFIED_DRAFT_DOCUMENTS_ONLY','verifiedAt':now,'revision':'1.0',
 'canonicalDecisionsMatched':8,'questionFieldsChecked':48,'documents':5,'pdfPages':26,
 'visualReview':'All 26 final PDF pages inspected individually: readable tables, blank response/signature fields, page breaks and footers; no clipping or overlap observed.',
 'renderMethod':'Microsoft Word hidden local COM export of actual DOCX; Poppler page renders. Bundled render_docx was unavailable because bundled soffice.exe was absent.',
 'checks':['All decision definitions and joint accountable roles match build-roadmap.cjs','Confirmed context retained; no policy, numeric target or appointment invented','README and source links resolve','PDF dates/revisions/draft labels and all 48 question IDs verified','No executed signatures or approvals supplied','R00 PARTIAL and UNCONFIRMED retained; other 37 package records unchanged; historical evidence retained'],
 'sourceSnapshotNote':'S2 in decision-data.json hashes the ledger before adding this draft pack. Exact bytes retained in qa/execution-register-before-pack.json. This preparation hash is not a signature or identity check.',
 'releaseApproved':False,'r00Complete':False,'legalSignatureValidityAssessed':False,
 'applicationTestsRun':False,'testReason':'Documentation-only task; application code was not changed.',
 'artifacts':files}
(PACK/'VERIFICATION.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
bundle = PACK/'R00_VALIDATION_PACK_v1.0.zip'
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(PACK.iterdir()):
        if path.suffix in ['.docx','.pdf','.md'] or path.name in ['decision-data.json','VERIFICATION.json']:
            archive.write(path,path.name)
print(json.dumps({'status':receipt['status'],'documents':5,'pages':26,'decisions':8,'r00':'PARTIAL','otherPackagesUnchanged':37,'bundle':str(bundle)}))

from pathlib import Path
import hashlib, json
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
repo=Path(__file__).resolve().parent.parent
run=repo/'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-25-run-01'
private=Path('C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993')
rows,errors,cards=[],[],[]
for file in ['AF08/sample-workpapers.pdf','AF12/sample-advisory-pack.pdf','AF12/browser-advisory.pdf']:
    path=run/file;reader=PdfReader(path);text='\n'.join(page.extract_text() or '' for page in reader.pages)
    if not reader.pages or not text.strip():errors.append('Unreadable PDF: '+file)
    for forbidden in ['PRIVATE_FIRM_NOTE','private-personal-data','private://synthetic-document']:
        if forbidden in text:errors.append('Private marker in '+file+': '+forbidden)
    payload=json.loads(path.with_suffix('.json').read_text(encoding='utf-8-sig'))
    document=payload.get('document',payload)
    schedules=document.get('observations',document.get('schedules',[]))
    balances=sorted({account['balances']['ledger']['closingBalance'] for schedule in schedules for account in schedule.get('accounts',[]) if account.get('balances')})
    if not balances:errors.append('No reviewed balances in JSON: '+file)
    for amount in balances:
        if amount not in text:errors.append('Expected reviewed balance absent: '+file+' '+amount)
    rows.append({'file':file,'pages':len(reader.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'expectedReviewedBalancesFromJson':balances})
    doc=pdfium.PdfDocument(str(path));page=doc[0];bitmap=page.render(scale=1);pic=bitmap.to_pil().convert('RGB')
    card=Image.new('RGB',(610,880),'white');pic.thumbnail((595,842));card.paste(pic,((610-pic.width)//2,30));ImageDraw.Draw(card).text((5,5),file,fill='black');cards.append(card)
    bitmap.close();page.close();doc.close()
metadata=json.loads((run/'AF08/reconciliation-checks.json').read_text(encoding='utf-8-sig'))
for row in metadata['formats']:
    suffix=Path(row['fileName']).suffix;file=run/('AF08/sample-workpapers'+suffix)
    if 'sha256:'+hashlib.sha256(file.read_bytes()).hexdigest()!=row['artifactHash']:errors.append('Artifact bytes differ: '+str(file))
sheet=Image.new('RGB',(610*len(cards),880),'#ddd')
for i,card in enumerate(cards):sheet.paste(card,(610*i,0))
sheet.save(private/'af16-export-contact.png')
receipt={'passed':not errors,'files':rows,'errors':errors,'checks':['extractable PDF text','reviewed balances selected by the exact paired JSON','private markers excluded','AF08 JSON/CSV/PDF artifact hashes'],'visualReview':'Separate visual-review.json'}
(run/'export-artifact-verification.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps(receipt,indent=2));raise SystemExit(1 if errors else 0)

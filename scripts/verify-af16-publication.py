from pathlib import Path
import hashlib, json, re
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

repo = Path(__file__).resolve().parent.parent
docs = repo / 'docs/accounting-firms'
phase = docs / 'roadmap-2026-10-19/execution/AF16'
run = phase / '2026-10-25-run-01'
private = Path('C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993')
errors, pairs, cards = [], [], []
allowed = {'docs/accounting-firms/README.md', 'docs/accounting-firms/roadmap-2026-10-19/STATUS.md', 'docs/accounting-firms/roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.md', 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/RELEASE_SCOPE.md'}
preserved = 0
for row in json.loads((run/'documents-before.json').read_text(encoding='utf-8-sig')):
    if row['file'] not in allowed:
        if hashlib.sha256((repo/row['file']).read_bytes()).hexdigest() != row['sha256']:
            errors.append('Unexpected Markdown change: '+row['file'])
        else:
            preserved += 1
for md in sorted(docs.rglob('*.md')):
    pdf = md.with_suffix('.pdf')
    if not pdf.exists() or pdf.stat().st_size < 1024:
        errors.append('Missing/empty PDF: '+str(pdf)); continue
    reader = PdfReader(pdf)
    text = ''
    for page in reader.pages:
        if abs(float(page.mediabox.width)-595.28)>2 or abs(float(page.mediabox.height)-841.89)>2:
            errors.append('Not A4: '+str(pdf))
        content = page.extract_text() or ''
        if not content.strip(): errors.append('Empty page: '+str(pdf))
        text += content
    if md.parent == phase:
        compact = re.sub(r'\s+', '', text)
        for heading in re.findall(r'^#{1,6}\s+(.+)$', md.read_text(encoding='utf-8-sig'), flags=re.M):
            if re.sub(r'\s+', '', heading) not in compact: errors.append('Missing heading: '+heading)
        document = pdfium.PdfDocument(str(pdf))
        for index in range(len(document)):
            page = document[index]; bitmap = page.render(scale=.75); pic = bitmap.to_pil().convert('RGB')
            card = Image.new('RGB',(470,670),'white');pic.thumbnail((450,635));card.paste(pic,((470-pic.width)//2,25))
            ImageDraw.Draw(card).text((5,5),f'{pdf.stem} p{index+1}',fill='black');cards.append(card)
            bitmap.close();page.close()
        document.close()
    pairs.append({'markdown':str(md.relative_to(docs)), 'pages':len(reader.pages)})
followup = '2026-10-25-af16-development-verification.md'
if (repo/'what-next'/followup).read_bytes() != (docs/'supporting-reports'/followup).read_bytes(): errors.append('Follow-up copy differs')
for offset in range(0,len(cards),9):
    batch=cards[offset:offset+9];sheet=Image.new('RGB',(1410,670*((len(batch)+2)//3)),'#d5d5d5')
    for i,card in enumerate(batch):sheet.paste(card,((i%3)*470,(i//3)*670))
    sheet.save(private/f'af16-publication-contact-{offset//9+1}.png')
receipt={'date':'2026-10-25','pairs':len(pairs),'pages':sum(p['pages'] for p in pairs),'unrelatedMarkdownPreserved':preserved,'errors':errors,'documents':pairs,'checks':['same-name nonempty PDF','A4 and extractable text','AF16 heading coverage','prior Markdown hashes','follow-up equality'],'visualReview':'Separate visual-review.json; not implied by these checks'}
(run/'publication-verification.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps({k:receipt[k] for k in ['pairs','pages','unrelatedMarkdownPreserved','errors']}))
raise SystemExit(1 if errors else 0)

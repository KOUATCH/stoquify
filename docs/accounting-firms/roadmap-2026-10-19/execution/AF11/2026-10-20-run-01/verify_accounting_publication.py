import hashlib
import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

ROOT = Path('E:/ohada saas/Focused projects/stoquify')
OUT = Path(__file__).parent
PUB = ROOT / 'docs/accounting-firms'

def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKC', text).casefold() if c.isalnum())

baseline = json.loads((OUT / 'accounting-publication-before.json').read_text(encoding='utf-8'))
headings = json.loads((OUT / 'accounting-publication-headings.json').read_text(encoding='utf-8'))
errors = []
for rel, expected in baseline.items():
    actual = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()
    if actual != expected:
        errors.append(f'Source changed: {rel}')
copies = [
    ('what-next/2026-10-20-af11-obligation-register.md', '2026-10-20-af11-obligation-register.md'),
    ('what-next/2026-10-20-af10-controlled-opening-apply.md', '2026-10-20-af10-controlled-opening-apply.md'),
    ('what-next/2026-10-20-af09-opening-position-preview.md', '2026-10-20-af09-opening-position-preview.md'),
    ('what-next/2026-10-20-af08-review-workpapers.md', '2026-10-20-af08-review-workpapers.md'),
    ('what-next/2026-10-20-af07-provider-formats.md', '2026-10-20-af07-provider-formats.md'),
    ('what-next/2026-10-20-af06-delegated-evidence-desk.md', '2026-10-20-af06-delegated-evidence-desk.md'),
    ('what-next/2026-10-20-af05-firm-engagement-workflows.md', '2026-10-20-af05-firm-engagement-workflows.md'),
    ('what-next/2026-10-20-af04-firm-engagement-authority.md', '2026-10-20-af04-firm-engagement-authority.md'),
    ('what-next/2026-10-19-af01-accountant-portfolio.md', '2026-10-19-af01-accountant-portfolio.md'),
    ('what-next/2026-10-19-af02-accountant-portfolio-ui.md', '2026-10-19-af02-accountant-portfolio-ui.md'),
    ('what-next/2026-10-19-af03-firm-engagement-model.md', '2026-10-19-af03-firm-engagement-model.md'),
    ('docs/landing/accounting-firm-workflow-evidence-2026-10-18.md', 'accounting-firm-workflow-evidence-2026-10-18.md'),
]
for source, name in copies:
    if (ROOT / source).read_bytes() != (PUB / 'supporting-reports' / name).read_bytes():
        errors.append(f'Copy differs: {source}')

for name in ['roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.pdf', 'roadmap-2026-10-19/STATUS.pdf', 'roadmap-2026-10-19/execution/AF11/RESULT.pdf']:
    current_text = norm(' '.join(p.extract_text() or '' for p in PdfReader(PUB / name).pages))
    if norm('IMPLEMENTED_UNVERIFIED') not in current_text:
        errors.append(f'Missing current AF11 status: {name}')

records = []
for md in sorted(PUB.rglob('*.md')):
    pdf = md.with_suffix('.pdf')
    rel = str(md.relative_to(ROOT)).replace('\\', '/')
    if not pdf.exists() or pdf.stat().st_size < 1024:
        errors.append(f'Missing/empty PDF: {rel}')
        continue
    reader = PdfReader(pdf)
    pages = [p.extract_text() or '' for p in reader.pages]
    text = norm(' '.join(pages))
    hs = next(v for k, v in headings.items() if k.replace('\\', '/') == rel)
    missing = [h for h in hs if norm(h) not in text]
    if missing:
        errors.append({'file': rel, 'missingHeadings': missing})
    if any(len(norm(p)) < 4 for p in pages):
        errors.append(f'Empty text page: {rel}')
    if any(abs(float(p.mediabox.width) - 595.28) > 2 or abs(float(p.mediabox.height) - 841.89) > 2 for p in reader.pages):
        errors.append(f'Non-A4 page: {rel}')
    records.append({'markdown': rel, 'pdfBytes': pdf.stat().st_size, 'pages': len(pages), 'headings': len(hs), 'mdSha256': hashlib.sha256(md.read_bytes()).hexdigest(), 'pdfSha256': hashlib.sha256(pdf.read_bytes()).hexdigest()})

# Render representative first and dense pages for visual inspection.
samples = [
    ('roadmap-2026-10-19/execution/AF11/RESULT.pdf', 0),
    ('roadmap-2026-10-19/execution/AF11/RESULT.pdf', 1),
    ('roadmap-2026-10-19/execution/AF11/RESULT.pdf', 3),
    ('roadmap-2026-10-19/execution/AF11/OBLIGATION_SOURCE_REGISTER.pdf', 0),
    ('roadmap-2026-10-19/STATUS.pdf', 0),
    ('README.pdf', 0),
]
sheet = Image.new('RGB', (1500, 1470), 'white')
draw = ImageDraw.Draw(sheet)
for i, (rel, number) in enumerate(samples):
    doc = pdfium.PdfDocument(str(PUB / rel))
    page = doc[min(number, len(doc) - 1)]
    im = page.render(scale=0.8).to_pil().convert('RGB')
    im.thumbnail((480, 690))
    x, y = (i % 3) * 500 + 10, (i // 3) * 735 + 30
    sheet.paste(im, (x, y))
    draw.text((x, y - 22), f'{Path(rel).stem[:38]} / p{number + 1}', fill='black')
    page.close()
    doc.close()
sheet.save(OUT / 'accounting-publication-contact-sheet.png')
result = {'pairs': len(records), 'pages': sum(r['pages'] for r in records), 'headingsChecked': sum(r['headings'] for r in records), 'originalSourcesUnchanged': len(baseline), 'identicalSupportingCopies': len(copies), 'errors': errors, 'documents': records}
(OUT / 'accounting-publication-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'documents'}, indent=2))
raise SystemExit(bool(errors))

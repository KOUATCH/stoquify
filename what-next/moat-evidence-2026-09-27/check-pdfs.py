import json
from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image, ImageDraw

root = Path.cwd()
out = root / 'what-next/moat-evidence-2026-09-27'
checks = []
for pdf_path in sorted((root / 'docs/moat').glob('*.pdf')):
    reader = PdfReader(pdf_path)
    texts = [p.extract_text() or '' for p in reader.pages]
    doc = pdfium.PdfDocument(str(pdf_path))
    thumbs = []
    for index in range(len(doc)):
        page = doc[index]
        rendered = page.render(scale=0.55).to_pil().convert('RGB')
        rendered.thumbnail((275, 390))
        tile = Image.new('RGB', (295, 415), '#e4e7eb')
        tile.paste(rendered, ((295-rendered.width)//2, 8))
        ImageDraw.Draw(tile).text((10, 399), f'Page {index+1}', fill='#102a43')
        thumbs.append(tile)
    columns = 4
    rows = (len(thumbs)+columns-1)//columns
    contact = Image.new('RGB', (columns*295, rows*415), '#cbd5e1')
    for index,tile in enumerate(thumbs):
        contact.paste(tile, ((index%columns)*295, (index//columns)*415))
    contact_path = out / (pdf_path.stem+'-contact.png')
    contact.save(contact_path)
    doc[0].render(scale=1.3).to_pil().save(out/(pdf_path.stem+'-first.png'))
    if pdf_path.stem.startswith('strategic'):
        for index,text in enumerate(texts):
            if '9. Prioritization and sensitivity' in text:
                doc[index].render(scale=1.3).to_pil().save(out/'report-prioritization.png')
                break
    checks.append({'file':pdf_path.name,'pages':len(reader.pages),'charactersByPage':[len(t) for t in texts], 'nonemptyPages':all(len(t.strip())>20 for t in texts),'contactSheet':str(contact_path)})
    doc.close()
(out/'pdf-layout-check.json').write_text(json.dumps({'checks':checks,'visualReview':'pending'},indent=2),encoding='utf8')
print(json.dumps(checks,indent=2))

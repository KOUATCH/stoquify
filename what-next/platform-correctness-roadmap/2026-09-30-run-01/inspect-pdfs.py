"""Inspect the published PDFs; rendering for QA only, never PDF generation."""
from pathlib import Path
import json
import re
import pypdf
import pypdfium2 as pdfium

run = Path(__file__).resolve().parent
root = run.parents[2]
dest = root / 'docs' / 'prompt-execution'
qa = run / 'pdf-qa'
qa.mkdir(exist_ok=True)
results = []
for file in sorted(dest.glob('*.pdf')):
    reader = pypdf.PdfReader(file)
    pages = [page.extract_text() or '' for page in reader.pages]
    assert all(len(text.strip()) > 30 for text in pages), f'Empty content page: {file.name}'
    text = '\n'.join(pages)
    (qa / (file.stem + '.txt')).write_text(text, encoding='utf-8')
    item = {'file': file.name, 'pages': len(pages), 'characters': len(text), 'allPagesHaveText': True}
    if file.name == '04_IMPLEMENTATION_ROADMAP.pdf':
        missing = [f'R{i:02d}' for i in range(38) if f'R{i:02d}' not in text]
        assert not missing, missing
        doc = pdfium.PdfDocument(str(file))
        selected = sorted(set([0, len(pages)//2, len(pages)-1]))
        item['qaRenderedPages'] = [i+1 for i in selected]
        for index in selected:
            page = doc[index]
            bitmap = page.render(scale=1.35)
            bitmap.to_pil().save(qa / f'roadmap-page-{index+1}.png')
            bitmap.close()
            page.close()
        doc.close()
    results.append(item)
(run / 'pdf-inspection.json').write_text(json.dumps({'status':'PASS','reports':results},indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))

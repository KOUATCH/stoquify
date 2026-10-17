from pathlib import Path
import json
from pdf2image import convert_from_path
from pypdf import PdfReader

root=Path(__file__).resolve().parent
poppler=Path(r'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin')
summary=[]
for pdf in sorted(root.glob('*.pdf')):
 out=root/'qa'/pdf.stem; out.mkdir(parents=True,exist_ok=True)
 images=convert_from_path(pdf,dpi=96,poppler_path=str(poppler))
 reader=PdfReader(pdf)
 for n,(img,page) in enumerate(zip(images,reader.pages),1):
  img.save(out/f'page-{n}.png')
  txt=page.extract_text()
  (out/f'page-{n}.txt').write_text(txt,encoding='utf-8')
  summary.append({'file':pdf.name,'page':n,'chars':len(txt),'first':txt[:170],'last':txt[-240:]})
(root/'qa'/'pages.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))

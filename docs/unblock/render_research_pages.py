from pathlib import Path
import sys
import pypdfium2 as pdfium
root=Path(__file__).resolve().parents[2]
source=root/sys.argv[1]
doc=pdfium.PdfDocument(str(source))
for one_based in map(int,sys.argv[2:]):
 page=doc[one_based-1]; bitmap=page.render(scale=1.3)
 target=root/'docs/unblock/research'/f'{source.stem}-page-{one_based}.png'
 bitmap.to_pil().save(target);bitmap.close();page.close();print(target)
doc.close()

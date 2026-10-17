from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1]; out=ROOT/'work'/'pages';out.mkdir(exist_ok=True)
pdf=pdfium.PdfDocument(str(ROOT/'Nkambe_Bakery_Handbook.pdf'))
thumbs=[]
for i in range(len(pdf)):
    p=pdf[i];im=p.render(scale=1.4).to_pil().convert('RGB');im.save(out/f'page-{i+1:03}.png')
    t=ImageOps.contain(im,(255,330));tile=Image.new('RGB',(275,355),'#d7d7d7');tile.paste(t,((275-t.width)//2,3));ImageDraw.Draw(tile).text((8,337),str(i+1),fill='black');thumbs.append(tile)
    p.close()
for start in range(0,len(thumbs),20):
    sheet=Image.new('RGB',(1375,1420),'white')
    for j,t in enumerate(thumbs[start:start+20]):sheet.paste(t,((j%5)*275,(j//5)*355))
    sheet.save(out/f'contact-{start//20+1:02}.jpg',quality=90)
print(f'Rendered {len(pdf)} pages to {out}')

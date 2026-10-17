from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
from docx.shared import RGBColor
p=Path(__file__).resolve().parents[1]/'Nkambe_Bakery_Handbook.docx'
d=Document(p)
for s in d.styles:
    for b in s.element.findall('.//'+qn('w:pBdr')): b.getparent().remove(b)
for sec in d.sections:
    for para in sec.header.paragraphs:
        for run in para.runs:run.font.color.rgb=RGBColor(75,75,75)
d.save(p)
print('Removed inherited title border; harmonized running-header colour.')

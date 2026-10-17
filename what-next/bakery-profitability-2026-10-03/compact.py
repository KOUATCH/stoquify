import json
from pathlib import Path
d=json.loads((Path(__file__).parent/'source_extract.json').read_text(encoding='utf-8'))
for s in d['sheets']:
 c=s['cells']; val=lambda k:c.get(k,{}).get('cached'); raw=lambda k:c.get(k,{}).get('value')
 print('\n'+s['name']+' HEAD '+str({k:val(k) for k in c if k.endswith('4')}))
 for r in range(5,22):
  if isinstance(val('C'+str(r)),str) and val('C'+str(r)).strip() not in ('','Totals','weight','price','bread TYPE','chosen weight'):
   print(r,val('C'+str(r)),{a:val(a+str(r)) for a in ['D','F','H','J','L','M'] if val(a+str(r)) is not None},'rate:',[(a,raw(a+str(r)),val(a+str(r))) for a in ['H','I','J','K','L','M','N','O'] if isinstance(raw(a+str(r)),str) and 'RAW MATERIAL' in raw(a+str(r))])
 print('SALES/NOTES:')
 for r in range(15,38):
  vals={a:val(a+str(r)) for a in ['A','B','C','D','E','F','G','H'] if val(a+str(r)) is not None}
  if vals: print(r,vals)

from pathlib import Path
import json,re,math
root=Path(__file__).parent
d=json.loads((root/'source_extract.json').read_text(encoding='utf-8'))
prices=d['prices']
for p in prices:
 p.update(id='P'+str(p['row']),source="' COST rRAW MATERIAL'!B%d:D%d"%(p['row'],p['row']),note='Workbook pack weight treated as grams; quotation date not supplied.')
prices += [dict(id='P_cabbage',name='Cabbage',price=None,weight=1000,source='Fish Pie!C16:K16',note='No price supplied.'),dict(id='P_others',name='Ice Cream others',price=5000,weight=500,source='Ice Cream!J9:K9',note='Recipe-specific source price retained; ingredient identity unspecified.')]
pm={p['id']:p for p in prices}
mapping={'flour':4,'sugar':5,'salt':6,'butter':7,'butter for layers':7,'oil':8,'frying oil':8,'yeast':9,'baking powder':10,'egg':13,'eggs':13,'improver':12,'nutmeg':14,'nut meg':14,'milk':15,'conc milk':15,'water':16,'ice water':16,'cold water':16,'powder milk':17,'powdered milk':17,'pwd milk':17,'milk tantalizer':18,'edc':19,'chocolate':21,'choclate':21,'fish':22,'carrots':23,'green beans':24,'peppers':25,'onions':26,'onion':38,'irish':27,'honey':29,'icing sugar':30,'stabilizer':32,'meat':37}
issues={
'baguette':'The 18 kg column actually starts with 111 kg flour. Improver is 3% of flour; verify its specified dose. The 200 g/100 CFA format is much weaker than the 90 g format.',
'Baguette AI':'D uses 18 kg flour despite its 10 kg heading. F and J use different salt/improver ratios, so they are separate formulas. Bulk revenue uses 12 pieces for 1,000 CFA.',
'Banh Mi':'The 50 kg column actually has 150 kg flour. Correct sugar from 37,000 to the master 32,000 per 50 kg. Very low salt and 2.5% improver require recipe review.',
'cake marbre':'Piece-count formulas divide batch COST by piece weight. Historical ingredient rates differ sharply from the master. Milk identity is unclear. No cocoa/chocolate line identifies the marbling.',
'gateau':'Frying oil is entered as 10 against a pack weight of 20; units and net oil consumption are unresolved. Butter uses 20,000 g instead of 9,500 g. Condensed milk and egg mass need confirmation.',
'buns new look':'D/F/H/N are different formulas, not exact scales. D16 omits the 100 g EDC. Manual per-bun costs use selling weight/price instead of ingredient cost.',
'Donuts':'Keep the 5 kg frying-oil charge out of dough yield. Its full cost is charged provisionally; measure oil consumed/discarded. Large-scale cost and quantity use different multipliers; sales formulas have broken references.',
'Fish Pie':'Cabbage (200 g) is unpriced. Improver points to baking powder. Filling trim/cook losses and labour are missing. Manual 60 g/100 CFA differs from the main 85 g/100 CFA format.',
'Galette':'Baking powder uses a 4,000 g milk-tantalizer denominator instead of 500 g. Manual per-piece cost is a price/weight ratio, not ingredient cost. EDC identity needs confirmation.',
'New bread':'Condensed milk combines a milk price with a 25 kg powder-milk pack. Egg denominator is 540 g rather than the master 1,500 g. The purported 50 kg batch contains 125 kg flour.',
'NGALA BREAD':'Condensed milk uses the 25 kg powder-milk denominator. Egg pack weight is inconsistent. Manual cost formulas contain broken references.',
'Pain au lait':'E19 omits ingredients after yeast although D19 includes them. The purported 18 kg batch starts with 43.2 kg flour. Confirm milk identity, EDC and flavour dosage.',
'NEW BRIOCHE':'The secondary batch total omits rows and is not a faithful scale. The 82 g/100 CFA entry needs separate economics from 140 g/200 CFA. Compare flavour and demand before combining with brioche.',
'Brioche Professionel':'E15 omits yeast and nutmeg. The 50 kg column starts with only 13.64 kg flour. Condensed-milk identity is unresolved; the manual 80 g/100 CFA is weaker than 70 g/100 CFA.',
'professinal Buns':'E19 omits milk flavour, oil and nutmeg. Sales formulas multiply price twice. Water is only 300 g per 10 kg flour: confirm an omitted liquid before production.',
'brioche':'Secondary batch quantities are blank. Some profit cells deduct 16% of ingredient surplus without a supported expense basis. Compare with NEW BRIOCHE by taste and measured yield.',
'Chinchin':'Oil is entered as 2 and priced as 2 g; confirm its unit and consumption. The manual 30 g / 1,200 CFA pair lacks a price header and is only a possible offer, requiring confirmation. Egg mass is 1,200 g for 3,600 g flour.',
'choko bread':'Old hard-coded prices and a powder-sized milk pack. Milk is provisionally mapped to powder milk. Base-cost total omits chocolate while scaled cost includes it.',
'YUMMY BREAD':'Flour Bir at 20,000/50 kg is retained. The source total omits 100 g EDC. D/F/H are different formulas; 125 and 150 CFA are separate prices for the same 139 g piece.',
'Kouatchoua gato':'Exclude 8 kg frying oil from dough yield, while provisionally charging its full cost. Condensed-milk identity remains unclear. The older report included fryer oil in saleable mass.',
'Cake Prof':'D and H are materially different egg/butter/sugar formulas. Its profit-margin cell is a markup on cost. Use one approved formula and a measured cooled yield.',
'Best Chinchin':'The 15 kg frying-oil line is excluded from dough mass but fully charged provisionally. Improver is incorrectly priced as milk. Smaller-batch ingredient ratios differ.',
'Sugar Balls':'Improver is priced as baking powder. No frying-oil consumption is costed. Small and large batch formulas differ. The 500 CFA offer is a price hypothesis, not evidence of demand.',
'Beignet soufle':'Use the explicit 6 kg-flour F column. D/H are scaled from a different 7 kg formula. Frying oil is absent. Confirm EDC identity and dose.',
'Zebree':'Baking powder uses the wrong pack weight; EDC uses a 25 kg milk-powder pack. Large and small formulas differ, including chocolate and butter.',
'Danisa biscuits':'The 2 kg and trial formulas change sugar/egg ratios. The 30 g/50 CFA offer has a different price per gram from large packs. Packaging and cooled biscuit yield are missing.',
'Delice':'Baking powder pack weight is wrong. The smaller formula omits honey and changes butter/sugar. Manual 86 g/100 CFA needs its own lower-margin calculation.',
'Okinawa':'Egg is priced as butter. Exclude the 1 kg frying-oil line from yield but charge it provisionally. No water line is supplied; confirm the formula before judging texture or yield.',
'CAKE NOW':'Water row is blank and treated as unused in the listed formula. The 100 CFA row without a weight cannot be costed. Source margin is markup, not sales margin.',
'Short bread':'Salt is 150 g per 2 kg flour (7.5%): confirm transcription before production. The smaller formula changes ratios. Two weights are sold at the same 50 CFA price.',
'Melto':'F scales H, but H has 50 g egg while D has 150 g. The 50 kg column has 56.25 kg flour. At 50 CFA, moving from 34 to 45 g sharply reduces margin.',
'Kumba bread':'Secondary sales rows reference empty batches. Wholesale formulas imply 12 pieces of 900 g for only 1,000 CFA, apparently a copied pricing error. The 80 g manual offer differs from 90 g main offer.',
'Hamburger buns':'EDC uses powder-milk pack weight. Scaled batches use a different formula. The 370–700 g sale sizes look like loaves/packs; confirm units and whether any filling is included.',
'Taste it':'Baking powder denominator is wrong. The 800 g/1,000 CFA format has a lower margin than 700 g at the same price. Manual costs use price/weight, not recipe cost.',
'Samosa':'No frying oil or spices are listed. Filling cooking loss and assembly labour are missing. Salt is 110 g for 1,500 g flour; check formula and batch basis.',
'Ice Cream':'The 200 g stabilizer is 1.29% of mix: verify the specific product dose. The 200 g others are priced but unidentified. Overrun cannot increase saleable grams; cups, refrigeration and cleaning are missing.',
'Melto1':'H is not an exact scale of D. Its 50 kg column uses 50.04 kg flour. Confirm the distinct product purpose versus Melto; the 45 g/50 CFA format is weaker.',
'Croissant':'Source margin uses D18=350 rather than C18=45. Confirm whether 1,000 g butter includes all lamination butter. Lamination labour, trim and refrigeration are uncosted.',
'Universal bread':'Exclude 9 kg frying oil from dough yield while provisionally charging it in full. Condensed-milk identity is unresolved. The old report overstated output by including fryer oil.',
'Sheet3':'This is an unnamed but populated bread recipe, so it is included. Name and approve it before use. D/F/H formulations and manual price calculations differ.',
'Croissant new':'Layering butter points to EDC price divided by powder-milk weight. Reprice its 600 g at the master butter rate, provisionally. Confirm that the quoted fat is suitable for lamination.'
}
recipes=[]; lines=[]; formats=[]
for s in d['sheets']:
 name=s['name']; c=s['cells']; val=lambda k:c.get(k,{}).get('cached'); raw=lambda k:c.get(k,{}).get('value')
 qcol='F' if name in ['Banh Mi','Beignet soufle','Croissant new'] else 'D'
 pcol=next((a for a in ['H','J','L'] if str(val(a+'4')).lower() in ['cost','50 kg cost']),None)
 if pcol is None: raise ValueError(name)
 wcol=chr(ord(pcol)+1); costcol=chr(ord(qcol)+1)
 ing=[]
 for r in range(5,22):
  label=val('C'+str(r))
  if not isinstance(label,str): continue
  key=label.lower().strip()
  if key not in mapping and key not in ['cabbage','others']: continue
  qty=val(qcol+str(r)); sourceqty=qty
  if qty is None and name=='CAKE NOW' and key=='water': qty=0
  if not isinstance(qty,(int,float)): raise ValueError((name,r,label,qty))
  pid='P'+str(mapping[key]) if key in mapping else 'P_'+key
  ref=raw(pcol+str(r)); refmatch=re.search(r"RAW MATERIAL'!\$?C\$?(\d+)",str(ref))
  if key in ['egg','eggs'] and refmatch and int(refmatch[1]) in [11,13]: pid='P'+refmatch[1]
  if key=='flour' and refmatch and int(refmatch[1])==36: pid='P36'
  note=''
  if key=='conc milk': note='Generic milk price used provisionally for condensed milk; confirm identity.'
  if name=='choko bread' and key=='milk': pid='P17'; note='25 kg source pack suggests powder; confirm identity.'
  if name=='cake marbre' and key=='milk': note='Milk type unclear; generic master milk rate used provisionally.'
  if key=='butter for layers': note='Master butter rate used provisionally; lamination fat specification unconfirmed.'
  if key=='others': note='Recipe price retained; item identity unknown.'
  usemass=1
  if key=='frying oil' or (name=='Donuts' and key=='oil') or (name=='Best Chinchin' and r==14) or (name=='Chinchin' and key=='oil'):
   usemass=0; note+=' Frying oil excluded from dough yield; stated charge is not measured net consumption.'
  if (name=='gateau' and key=='frying oil') or (name=='Chinchin' and key=='oil'):
   qty=None; note+=' Quantity unit unresolved; no invented conversion.'
  p=pm[pid]; rate=p['price']/p['weight'] if p['price'] is not None else None
  known=qty*rate if qty is not None and rate is not None else None
  oldprice=val(pcol+str(r)); oldwt=val(wcol+str(r))
  old=sourceqty*oldprice/oldwt if all(isinstance(x,(float,int)) for x in [sourceqty,oldprice,oldwt]) and oldwt else None
  line=dict(recipe=name,ingredient=label,qty=qty,sourceQty=sourceqty,priceId=pid,massFactor=usemass,rate=rate,cost=known,source=f"'{name}'!C{r}:{qcol}{r}",priceSource=f"'{name}'!{pcol}{r}:{wcol}{r}",oldCost=old,oldCachedCost=val(costcol+str(r)),note=note.strip())
  ing.append(line); lines.append(line)
 # Missing frying oil is a required cost input, not zero.
 if name in ['Sugar Balls','Beignet soufle','Samosa']:
  line=dict(recipe=name,ingredient='Frying oil consumed/discarded',qty=None,sourceQty=None,priceId='P8',massFactor=0,rate=pm['P8']['price']/pm['P8']['weight'],cost=None,source=f"'{name}'!ingredient list (absent)",priceSource='',oldCost=None,oldCachedCost=None,note='Measure net oil cost allocated to this batch; source has no line.')
  lines.append(line); ing.append(line)
 mass=sum((i['qty'] or 0)*i['massFactor'] for i in ing)
 cost=sum(i['cost'] or 0 for i in ing); missing=sum(i['cost'] is None for i in ing)
 last=max(int(re.search(r'(\d+)$',x['source']).group(1)) for x in ing if re.search(r'(\d+)$',x['source']))
 rec=dict(name=name,column=qcol,first=5,last=last,mass=mass,cost=cost,missing=missing,issue=issues[name],errors=[k for k,z in c.items() if isinstance(z['cached'],str) and z['cached'].startswith('#')],lines=ing,formats=[])
 # Main offer table. Never use calculated revenues from the source workbook.
 pc,wc=('C','D') if name in ['New bread','NGALA BREAD'] else ('B','C')
 for r in range(last+1,38):
  p,wt=val(pc+str(r)),val(wc+str(r))
  if isinstance(p,(int,float)) and isinstance(wt,(int,float)) and p>0 and wt>0:
   rec['formats'].append(dict(recipe=name,price=p,weight=wt,source=f"'{name}'!{pc}{r}:{wc}{r}",kind='Main offer'))
 # Explicit manual price/weight inputs below the main table.
 manual={
  'New bread':('E','G',24,25),'NGALA BREAD':('E','G',24,25),
  'buns new look':('F','J',27,28),'YUMMY BREAD':('F','J',27,28),'Sheet3':('F','J',28,29),
  'Croissant new':('F','H',27,28),'Kouatchoua gato':('E','G',30,30),'Universal bread':('E','G',30,30),'Kumba bread':('E','G',27,27),
  'Donuts':('C','D',24,25),'Fish Pie':('C','D',28,29),'Sugar Balls':('C','D',24,25),'Okinawa':('C','D',22,23),'Chinchin':('C','D',25,26), 'Best Chinchin':('C','D',25,26),
  'Galette':('D','F',29,30),'Pain au lait':('D','F',30,31),'NEW BRIOCHE':('D','F',28,29),'Brioche Professionel':('D','F',25,25),'professinal Buns':('D','F',29,30),'Zebree':('D','F',29,30),'Danisa biscuits':('D','F',25,26),'Delice':('D','F',30,31),'Hamburger buns':('D','F',25,26),'Taste it':('D','F',28,29),'Samosa':('D','F',22,23),'Croissant':('D','F',25,26)}
 if name in manual:
  wc,pc,r1,r2=manual[name]
  for r in range(r1,r2+1):
   p,wt=val(pc+str(r)),val(wc+str(r))
   if isinstance(p,(int,float)) and isinstance(wt,(int,float)) and p>0 and wt>0:
    rec['formats'].append(dict(recipe=name,price=p,weight=wt,source=f"'{name}'!{wc}{r},{pc}{r}",kind='Manual offer; confirm'))
 bulk={'baguette':[(90,1000,'K16')],'Baguette AI':[(85,1000,'M16')],'Banh Mi':[(90,1000,'M17')],'Fish Pie':[(85,1000,'K22'),(65,1000,'K23')],'Galette':[(79,1000,'J22/K22')],'Donuts':[(40,500,'H18'),(22,500,'I19')],'Pain au lait':[(800,10000,'K25')],'NEW BRIOCHE':[(82,1000,'K21')],'Kouatchoua gato':[(81.4,1000,'I21:I24/J21:J24')],'Sugar Balls':[(70,1000,'K18')],'Okinawa':[(80,1000,'K16')],'Kumba bread':[(900,1000,'I19:I21/J19:J21')],'Samosa':[(25,500,'J15/K15')],'Universal bread':[(81.4,1000,'I21:I24/J21:J24')]}
 if name in bulk:
  for wt,packprice,cell in bulk[name]:
   rec['formats'].append(dict(recipe=name,price=packprice/12,weight=wt,source=f"'{name}'!{cell}",kind='Suspect wholesale formula' if name=='Kumba bread' else '12-piece wholesale pack',packSize=12,packPrice=packprice))
 for f in rec['formats']:
  pack=f.get('packSize',1)
  f['units']=math.floor(mass/f['weight']/pack)*pack; f['revenue']=f['units']*f['price']; f['surplus']=f['revenue']-cost
  f['unitCost']=cost/f['units'] if f['units'] else None
  f['margin']=f['surplus']/f['revenue'] if f['revenue'] else None
  f['breakEven']=math.ceil(cost/f['price']); f['sellThroughBreakEven']=f['breakEven']/f['units'] if f['units'] else None
  formats.append(f)
 assert rec['formats'],name
 recipes.append(rec)
out=dict(source=d['file'],sha256=d['sha256'],prices=prices,recipes=recipes,lines=lines,formats=formats)
(root/'analysis.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
for r in recipes:
 f=r['formats'][0]
 print(f"{r['name']:22} {r['column']} {r['mass']:9,.0f}g cost {r['cost']:9,.2f} missing {r['missing']} | {f['weight']:5g}g/{f['price']:4g} cost/pc {f['unitCost']:7.2f} margin {f['margin']:6.1%} formats {len(r['formats'])}")
print('TOTAL',len(recipes),'recipes',len(lines),'ingredients',len(formats),'formats')

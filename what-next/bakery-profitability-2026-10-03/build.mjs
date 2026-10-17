import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const dir=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(await fs.readFile(path.join(dir,'analysis.json'),'utf8'));
const out=path.resolve(dir,'../../outputs/bakery-profitability-2026-10-03');
await fs.mkdir(out,{recursive:true});
const w=Workbook.create();
const names=['Profitability','Sale formats','Batches','Ingredients','Prices'];
const sheets=Object.fromEntries(names.map(n=>[n,w.worksheets.add(n)]));
const fmt='#,##0.00;(#,##0.00);"–"';
const whole='#,##0;(#,##0);"–"';
const pmap=new Map(data.prices.map((p,i)=>[p.id,i+7]));
const bmap=new Map(data.recipes.map((p,i)=>[p.name,i+7]));
const put=(s,cell,v)=>s.getRange(cell).values=[[v]];
const formula=(s,cell,v)=>{s.getRange(cell).formulas=[[v]];s.getRange(cell).format.font.color=v.includes('!')?'#008040':'#172D40';};
function layout(s,title,subtitle,headers,rows,widths){
 const end=String.fromCharCode(64+headers.length);
 s.showGridLines=false;
 s.getRange(`A1:${end}${rows+6}`).format.font={name:'Arial',size:10,color:'#172D40'};
 s.getRange(`A1:${end}${rows+6}`).format.verticalAlignment='center';
 put(s,'A2',title);s.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#172D40'};
 put(s,'A4',subtitle);s.getRange('A4').format.font.italic=true;
 s.getRange(`A3:${end}3`).format.borders={bottom:{style:'thin',color:'#BBC6CC'}};
 s.getRange(`A6:${end}6`).values=[headers];
 s.getRange(`A6:${end}6`).format={fill:'#243E53',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',rowHeight:43};
 s.getRange(`A7:${end}${rows+6}`).format.rowHeight=28;
 widths.forEach((width,i)=>s.getRange(`${String.fromCharCode(65+i)}1:${String.fromCharCode(65+i)}${rows+6}`).format.columnWidth=width);
 for(let r=7;r<rows+7;r++)if(r%2===0)s.getRange(`A${r}:${end}${r}`).format.fill='#F0F4F6';
 s.freezePanes.freezeRows(6);s.freezePanes.freezeColumns(1);
 s.getRange(`B7:${end}${rows+6}`).setNumberFormat(fmt);
}
const prices=sheets.Prices;
layout(prices,'Ingredient purchase prices','CFA (XAF assumed). Original pack values retained. Numeric blue cells are editable inputs. No supplier quote dates supplied.',
 ['Price ID','Ingredient / purchase basis','Pack price CFA','Pack weight g','CFA / g','Source cells','Meaning / limitation'],data.prices.length,[15,29,18,18,16,42,85]);
data.prices.forEach((p,i)=>{
 const r=i+7;
 prices.getRange(`A${r}:D${r}`).values=[[p.id,p.name,p.price,p.weight]];
 formula(prices,`E${r}`,`=IF(AND(ISNUMBER(C${r}),ISNUMBER(D${r}),D${r}>0),C${r}/D${r},"n.a.")`);
 prices.getRange(`F${r}:G${r}`).values=[[p.source,p.note]];
 prices.getRange(`C${r}:D${r}`).format.font.color='#0000FF';
 if(p.price===null)prices.getRange(`C${r}`).format.fill='#FFF0BF';
});
prices.getRange(`E7:E${data.prices.length+6}`).setNumberFormat('0.0000');
prices.getRange(`F7:F${data.prices.length+6}`).setNumberFormat('  @');
put(prices,'A43','Source: '+data.source+'; inspected 3 October 2026. Only bakery costing cells are reproduced.');
const ing=sheets.Ingredients;
layout(ing,'Recipe ingredient costing','Prepared quantities are grams except unresolved blanks. Fryer charges are costed separately from dough mass. Known costs exclude missing lines.',
 ['Recipe','Ingredient','Source quantity','Prepared grams','Price ID','CFA / g','Known line cost CFA','In dough mass (1/0)','Dough / mix grams','Missing cost (1/0)','Quantity source','Mapping / quantity limitation'],data.lines.length,[25,25,18,18,15,15,20,18,19,18,36,100]);
data.lines.forEach((l,i)=>{
 const r=i+7,pr=pmap.get(l.priceId);
 ing.getRange(`A${r}:E${r}`).values=[[l.recipe,l.ingredient,l.sourceQty,l.qty,l.priceId]];
 formula(ing,`F${r}`,`=Prices!E${pr}`);
 formula(ing,`G${r}`,`=IF(AND(ISNUMBER(D${r}),ISNUMBER(F${r})),D${r}*F${r},"n.a.")`);
 put(ing,`H${r}`,l.massFactor);
 formula(ing,`I${r}`,`=IF(H${r}=0,0,IF(ISNUMBER(D${r}),D${r}*H${r},"n.a."))`);
 formula(ing,`J${r}`,`=IF(ISNUMBER(G${r}),0,1)`);
 ing.getRange(`K${r}:L${r}`).values=[[l.source,l.note]];
 ing.getRange(`D${r}`).format.font.color='#0000FF';
 if(l.qty===null)ing.getRange(`D${r}`).format.fill='#FFF0BF';
});
const ie=data.lines.length+6;
ing.getRange(`F7:F${ie}`).setNumberFormat('0.0000');
ing.getRange(`E7:E${ie}`).format.horizontalAlignment='center';
ing.getRange(`G7:G${ie}`).format.horizontalAlignment='right';
ing.getRange(`H7:J${ie}`).setNumberFormat(whole);
const batches=sheets.Batches;
layout(batches,'Batch costs and operating inputs','Defaults: 100% nominal mass yield and sell-through, both unmeasured. Enter real non-ingredient costs; blank is unknown, zero means no charge.',
 ['Recipe','Dough / mix grams','Known ingredient CFA','Missing cost lines','Usable mass factor','Sell-through','Pack / produced pc CFA','Labour / batch CFA','Energy / batch CFA','Other variable / batch CFA','Allocated fixed / batch CFA','Usable mass g','Non-pack costs CFA','Ingredient basis / limitation'],data.recipes.length,[25,21,23,18,20,18,23,23,23,26,26,21,23,100]);
data.recipes.forEach((rec,i)=>{
 const r=i+7;
 put(batches,`A${r}`,rec.name);
 formula(batches,`B${r}`,`=SUMIFS(Ingredients!$I$7:$I$${ie},Ingredients!$A$7:$A$${ie},A${r})`);
 formula(batches,`C${r}`,`=SUMIFS(Ingredients!$G$7:$G$${ie},Ingredients!$A$7:$A$${ie},A${r})`);
 formula(batches,`D${r}`,`=SUMIFS(Ingredients!$J$7:$J$${ie},Ingredients!$A$7:$A$${ie},A${r})`);
 batches.getRange(`E${r}:F${r}`).values=[[1,1]];
 formula(batches,`L${r}`,`=IF(AND(ISNUMBER(E${r}),E${r}>0),B${r}*E${r},"n.a.")`);
 formula(batches,`M${r}`,`=IF(COUNT(H${r}:K${r})=4,SUM(H${r}:K${r}),"n.a.")`);
 put(batches,`N${r}`,`Source ${rec.column}5:${rec.column}${rec.last}. `+rec.issue);
 batches.getRange(`E${r}:K${r}`).format.font.color='#0000FF';
 batches.getRange(`G${r}:K${r}`).format.fill='#FFF0BF';
});
batches.getRange('E7:F47').setNumberFormat('0.0%');
batches.getRange('D7:D47').setNumberFormat(whole);
batches.getRange('M7:M47').format.horizontalAlignment='right';
batches.getRange('F7:F47').dataValidation={rule:{type:'decimal',operator:'between',formula1:0,formula2:1}};
const sales=sheets['Sale formats'];
layout(sales,'Profitability by selling format','Each row is an alternative use of one batch. Do not add row profits. Ingredient surplus excludes packaging, labour, energy, overhead and tax.',
 ['Recipe','Offer basis','Portion g','Price / pc CFA','Pieces / pack','Usable mass g','Known batch cost CFA','Produced pieces','Sold pieces','Revenue CFA','Ingredients / sold pc CFA','Ingredient surplus CFA','Ingredient margin','Ingredient break-even pieces','Break-even sell-through','Missing cost lines','Operating profit CFA','Calculation status','Offer source'],data.formats.length,[25,29,15,18,18,21,22,19,19,20,24,23,20,25,23,18,23,38,38]);
const fmap=new Map();
data.formats.forEach((f,i)=>{
 const r=i+7,br=bmap.get(f.recipe);if(!fmap.has(f.recipe))fmap.set(f.recipe,r);
 sales.getRange(`A${r}:E${r}`).values=[[f.recipe,f.kind,f.weight,f.price,f.packSize||1]];
 formula(sales,`F${r}`,`=Batches!L${br}`);formula(sales,`G${r}`,`=Batches!C${br}`);
 formula(sales,`H${r}`,`=IF(AND(ISNUMBER(F${r}),ISNUMBER(C${r}),C${r}>0,E${r}>0),ROUNDDOWN(F${r}/C${r}/E${r},0)*E${r},"n.a.")`);
 formula(sales,`I${r}`,`=IF(AND(ISNUMBER(H${r}),ISNUMBER(Batches!F${br}),Batches!F${br}>=0,Batches!F${br}<=1),ROUNDDOWN(H${r}*Batches!F${br}/E${r},0)*E${r},"n.a.")`);
 formula(sales,`J${r}`,`=IF(AND(ISNUMBER(I${r}),ISNUMBER(D${r})),I${r}*D${r},"n.a.")`);
 formula(sales,`K${r}`,`=IF(AND(ISNUMBER(I${r}),I${r}>0),G${r}/I${r},"n.a.")`);
 formula(sales,`L${r}`,`=IF(ISNUMBER(J${r}),J${r}-G${r},"n.a.")`);
 formula(sales,`M${r}`,`=IF(AND(ISNUMBER(J${r}),J${r}>0),L${r}/J${r},"n.a.")`);
 formula(sales,`N${r}`,`=IF(AND(ISNUMBER(D${r}),D${r}>0),ROUNDUP(G${r}/(D${r}*E${r}),0)*E${r},"n.a.")`);
 formula(sales,`O${r}`,`=IF(AND(ISNUMBER(H${r}),H${r}>0,ISNUMBER(N${r})),N${r}/H${r},"n.a.")`);
 formula(sales,`P${r}`,`=Batches!D${br}`);
 formula(sales,`Q${r}`,`=IF(AND(P${r}=0,ISNUMBER(J${r}),COUNT(Batches!G${br}:K${br})=5),J${r}-G${r}-H${r}*Batches!G${br}-Batches!M${br},"n.a.")`);
 formula(sales,`R${r}`,`=IF(P${r}>0,"Partial ingredient costs",IF(ISNUMBER(Q${r}),"Modeled operating profit","Other operating costs missing"))`);
 put(sales,`S${r}`,f.source);
 sales.getRange(`C${r}:E${r}`).format.font.color='#0000FF';
});
sales.getRange(`M7:M${data.formats.length+6}`).setNumberFormat('0.0%');
sales.getRange(`O7:O${data.formats.length+6}`).setNumberFormat('0.0%');
sales.getRange(`H7:I${data.formats.length+6}`).setNumberFormat(whole);
sales.getRange(`N7:N${data.formats.length+6}`).setNumberFormat(whole);
sales.getRange(`P7:P${data.formats.length+6}`).setNumberFormat(whole);
sales.getRange(`Q7:Q${data.formats.length+6}`).format.horizontalAlignment='right';
sales.getRange(`R7:R${data.formats.length+6}`).conditionalFormats.add('containsText',{text:'Partial',format:{fill:'#FBE2DE',font:{color:'#A32F26'}}});
const summary=sheets.Profitability;
layout(summary,'Melto recipe profitability',`41 recipes. First main offer shown; all ${data.formats.length} offers are on Sale formats. CFA (XAF assumed). Theoretical ingredient returns, not verified net profits.`,
 ['Recipe','Batch mass kg','Known batch cost CFA','Portion g','Price / pc CFA','Whole pieces','Ingredients / pc CFA','Remainder / pc CFA','Ingredient margin','Ingredient surplus / batch CFA','Operating profit CFA','Calculation status'],data.recipes.length,[26,18,23,15,19,19,23,23,21,29,24,37]);
data.recipes.forEach((rec,i)=>{
 const r=i+7,sr=fmap.get(rec.name),br=bmap.get(rec.name);
 put(summary,`A${r}`,rec.name);
 formula(summary,`B${r}`,`=Batches!B${br}/1000`);
 for(const [dst,src] of [['C','G'],['D','C'],['E','D'],['F','H'],['G','K'],['I','M'],['J','L'],['K','Q'],['L','R']])formula(summary,`${dst}${r}`,`='Sale formats'!${src}${sr}`);
 formula(summary,`H${r}`,`=IF(ISNUMBER(G${r}),E${r}-G${r},"n.a.")`);
 summary.getRange(`B${r}:L${r}`).format.font.color='#172D40';
 put(summary,`N${r}`,rec.issue);
 summary.getRange(`N${r}`).format={font:{name:'Arial',size:10,color:'#435767'},wrapText:false};
});
put(summary,'N6','Key problem / action');summary.getRange('N6:N47').format.columnWidth=155;
summary.getRange('M1:M47').format.columnWidth=3;
summary.getRange('I7:I47').setNumberFormat('0.0%');summary.getRange('F7:F47').setNumberFormat(whole);
summary.getRange('K7:K47').format.horizontalAlignment='right';
summary.getRange('L7:L47').conditionalFormats.add('containsText',{text:'Partial',format:{fill:'#FBE2DE',font:{color:'#A32F26'}}});
summary.tabColor='#243E53';batches.tabColor='#63879D';
put(summary,'A50','Missing costs: gateau oil units; Fish Pie cabbage; Chinchin oil units; Sugar Balls, Beignet soufle and Samosa frying oil.');
put(summary,'A52','Milk identities and edible purchase weights are provisional. Usable mass factors and sell-through default to 100%; replace with measured values.');
put(summary,'A54','Blue numeric cells are editable. Amber inputs are missing. Operating profit requires all five operating-cost inputs, even when an explicit zero is appropriate.');
put(summary,'A56','All per-piece remainder must still cover missing ingredients, packaging, production, spoilage, overhead and tax. No sales-volume forecast is implied.');
// Verify changes propagate, blanks stay unknown and zero remains a valid input.
const base=summary.getRange('C7').values[0][0],flourRow=pmap.get('P4');
put(prices,`C${flourRow}`,23100);
const changed=summary.getRange('C7').values[0][0];
if(Math.abs(changed-base-252)>1e-6)throw new Error('Flour sensitivity failed '+JSON.stringify({base,changed}));
put(prices,`C${flourRow}`,21000);
put(batches,'F7',0);
if(sales.getRange('J7').values[0][0]!==0||sales.getRange('M7').values[0][0]!=='n.a.')throw new Error('Zero sell-through failed');
put(batches,'F7',1);
batches.getRange('G7:K7').values=[[0,0,0,0,0]];
if(Math.abs(sales.getRange('Q7').values[0][0]-sales.getRange('L7').values[0][0])>1e-6)throw new Error('Zero operating-cost test failed');
batches.getRange('G7:K7').clear({applyTo:'contents'});
if(sales.getRange('Q7').values[0][0]!=='n.a.')throw new Error('Blank operating costs failed');
put(prices,`C${flourRow}`,null);
if(batches.getRange('D7').values[0][0]!==1||sales.getRange('R7').values[0][0]!=='Partial ingredient costs')throw new Error('Missing price test failed');
put(prices,`C${flourRow}`,21000);
w.recalculate();
for(let i=0;i<data.formats.length;i++){
 const r=i+7,f=data.formats[i],v=sales.getRange(`G${r}:M${r}`).values[0];
 const expected=[data.recipes.find(x=>x.name===f.recipe).cost,f.units,f.units,f.revenue,f.unitCost,f.surplus,f.margin];
 v.forEach((n,j)=>{if(Math.abs(n-expected[j])>1e-6)throw new Error(`Independent calculation mismatch ${r} ${j}: ${n} vs ${expected[j]}`);});
}
const err=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'Final formula errors'});
await fs.writeFile(path.join(dir,'formula-check.txt'),err.ndjson);
const views=[['Profitability','A1:L17'],['Sale formats','A1:K15'],['Sale formats','L6:S15'],['Batches','A1:G15'],['Batches','H6:M15'],['Ingredients','A1:J20'],['Prices','A1:F21']];
for(let i=0;i<views.length;i++){
 const [sheetName,range]=views[i];
 const blob=await w.render({sheetName,range,scale:1.3,format:'png'});
 await fs.writeFile(path.join(dir,`preview-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const file=path.join(out,'Bakery_Melto_Profitability_2026-10-03.xlsx');
await (await SpreadsheetFile.exportXlsx(w)).save(file);
await fs.writeFile(path.join(dir,'model-validation.json'),JSON.stringify({recipes:data.recipes.length,ingredientLines:data.lines.length,offers:data.formats.length,allOfferCalculationsCompared:true,flourChangePassed:true,blankVersusZeroPassed:true,output:file,sourceSha256:data.sha256},null,2));
console.log(JSON.stringify({output:file,recipes:data.recipes.length,offers:data.formats.length,errors:err.ndjson}));
process.exitCode=0;

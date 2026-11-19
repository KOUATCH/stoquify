const fs=require('node:fs'),path=require('node:path');
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'../public-performance-2026-10-26/after.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'after.json'),'utf8'));
const rows=[];
for(const locale of ['en','fr'])for(const width of [1440,390]){
 const select=r=>r.results.filter(x=>x.locale===locale&&x.width===width&&!x.failure);
 const a=select(before),b=select(after);if(a.length!==2||b.length!==2)throw Error(`Incomplete samples: ${locale}/${width}`);
 const range=(r,key)=>[Math.min(...r.map(x=>x[key])),Math.max(...r.map(x=>x[key]))];
 rows.push({locale,width,beforeHtmlBytes:range(a,'htmlBytes'),afterHtmlBytes:range(b,'htmlBytes'),htmlReductionPercent:100*(1-b[0].htmlBytes/a[0].htmlBytes),beforeDom:range(a,'domNodes'),afterDom:range(b,'domNodes'),beforeLcpMs:a.map(x=>x.lcp),afterLcpMs:b.map(x=>x.lcp),errors:b.flatMap(x=>x.errors),afterCls:b.map(x=>x.cls),afterOverflow:b.map(x=>x.overflow)});
}
const result={limitation:'Local observations from separate runs on a contended workstation. Payload/DOM counts describe the built pages; timings do not establish a controlled causal speed improvement or field performance.',rows};
fs.writeFileSync(path.join(__dirname,'comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

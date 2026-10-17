const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function derive(from,to,changes){let source=fs.readFileSync(path.join(__dirname,from),'utf8');for(const [before,after]of changes){assert.ok(source.includes(before),before);source=source.split(before).join(after);}fs.writeFileSync(path.join(__dirname,to),source,{flag:'wx'});}
derive('cash-request-profiler.ts','cash-batch-profiler.ts',[
 ['cash-request-spans-2026-09-30.jsonl','cash-batch-spans-2026-09-30.jsonl'],
]);
derive('manage-cash-request-profiler.cjs','manage-cash-batch-profiler.cjs',[
 ['cash-request-profiler-source-2026-09-30.json','cash-batch-profiler-source-2026-09-30.json'],
 ['lanes/environment/cash-request-profiler"','lanes/environment/cash-batch-profiler"'],
 ['cash-request-profiler-restored-2026-09-30.json','cash-batch-profiler-restored-2026-09-30.json'],
]);
derive('profile-cash-navigation.cjs','profile-cash-batch-navigation.cjs',[
 ["'services/modules/module-navigation.service.ts'];","'services/modules/module-navigation.service.ts', 'services/modules/module-access-batch.service.ts'];"],
 ['cash-request-spans-2026-09-30.jsonl','cash-batch-spans-2026-09-30.jsonl'],
 ['cash-navigation-profile-','cash-batch-navigation-profile-'],
 ["receipt.samples.push({locale,sample,cpuProfiled:profiled", "const screenshot = 'cash-batch-' + stamp + '-' + locale + '-' + sample + '.png'; await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true});\n      receipt.samples.push({locale,sample,screenshot,cpuProfiled:profiled"],
]);
console.log('Prepared isolated copies; historical profile tools unchanged.');

// Read-only source/graph inventory. Does not import application code or execute tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'../../../../..'));
const files=[
 'services/regulatory/country-packs/registry.ts','services/regulatory/country-packs/cameroon.ts','services/regulatory/country-packs/cameroon.constants.ts','services/regulatory/country-packs/resolve.ts',
 'services/regulatory/regulatory-capability.service.ts','services/regulatory/runtime/regulatory-runtime-class.ts','services/regulatory/adapters/published-country-pack.adapter.ts',
 'services/payroll/payroll-production-admission.ts','services/payroll/authority-adapter-worker.service.ts',
 'services/accounting/accounting-settings.service.ts','services/onboarding/opening-readiness.ts',
 'services/payments/adapters/mobile-money-hmac.adapter.ts','services/payments/provider-event.service.ts','services/payments/statement-import.service.ts','services/payments/provider-operations.service.ts','actions/payments/reconciliation.actions.ts',
 'services/regulatory/__tests__/country-pack.service.test.ts','services/regulatory/__tests__/regulatory-capability.service.test.ts',
 'services/payroll/__tests__/payroll-production-admission.test.ts','services/payroll/__tests__/authority-adapter-worker.service.test.ts',
 'services/payments/__tests__/mobile-money-hmac.adapter.test.ts','services/payments/__tests__/statement-import.service.test.ts','services/payments/__tests__/provider-event.service.test.ts',
 'services/onboarding/__tests__/fixtures/opening-position-source.json','services/onboarding/__tests__/fixtures/opening-position-controls.json','services/onboarding/__tests__/fixtures/opening-position-contract.ts','services/onboarding/__tests__/opening-position-contract.test.ts',
 'prisma/schema.prisma','package.json','scripts/verify-agent-workflow-contract.js','docs/ecc/command-registry.json',
 'graphify-out/graph.json','graphify-out/graph_actions.json','graphify-out/manifest.json','graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const graph=JSON.parse(fs.readFileSync('graphify-out/graph.json'));
const nodes=graph.nodes.filter(n=>/getAccountingSettings|resolveRegulatoryParameter|getCountryPack/.test(n.label||''));
const ids=new Set(nodes.map(n=>n.id));
const result={at:new Date().toISOString(),method:'Source text and graph JSON only; no runtime imports',files:files.map(p=>({path:p,sha256:hash(p)})),graph:{freshness:'2026-08-09 refresh; stale for current behavior',nodes,links:graph.links.filter(l=>ids.has(l.source)||ids.has(l.target))},claims:[
 ['services/regulatory/country-packs/registry.ts',4,14],['services/regulatory/country-packs/cameroon.ts',10,73],['services/regulatory/country-packs/cameroon.ts',466,501],['services/regulatory/regulatory-capability.service.ts',17,24],['services/regulatory/regulatory-capability.service.ts',55,82],['services/payroll/payroll-production-admission.ts',65,151],['services/payroll/authority-adapter-worker.service.ts',386,447],['services/payments/adapters/mobile-money-hmac.adapter.ts',115,145],['services/accounting/accounting-settings.service.ts',272,302],['services/onboarding/opening-readiness.ts',52,58]
 ].map(([p,a,b])=>({path:p,start:a,end:b,lines:fs.readFileSync(p,'utf8').split(/\r?\n/).slice(a-1,b)}))};
fs.writeFileSync(path.join(__dirname,'SOURCE_REVIEW.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:files.length,nodes:nodes.map(n=>({id:n.id,community:n.community,source:n.source_file,line:n.source_location})),edges:result.graph.links.length},null,2));

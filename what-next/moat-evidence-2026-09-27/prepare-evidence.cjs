const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = process.cwd();
const evidence = path.join(root, 'what-next/moat-evidence-2026-09-27');
const destination = path.join(root, 'docs/moat');
const raw = fs.readFileSync('C:/Users/J COMPUTER/.codex/attachments/a55111b3-f0f6-44e8-9898-38f644e4129b/Pasted text.txt', 'utf8');
const headings = new Set(['Mission', 'Execution checklist', 'Evidence to inspect', 'Required analysis for each shortlisted opportunity', 'Prioritization', 'Expected artifacts', 'Verification commands and checks', 'Risk controls', 'Success criteria', 'Non-goals', 'Optional next prompts']);
const formatted = raw.replace(/\r\n/g, '\n').split('\n').map(line => headings.has(line.trim()) ? '\n## ' + line.trim() + '\n' : line).join('\n');
const prompt = '# Stoquify moat assessment — execution prompt\n\nPublished 27 September 2026. Supplied prompt wording preserved; headings and spacing normalized for publication. Publication destination: `docs/moat/`; the requested dated assessment copy is also retained under `what-next/`.\n\n' + formatted.replace(/\n(?=(?:Operate as|Maintain explicit|Treat this as|Answer this central|Which missing|Do not equate|Keep evidence|Distinguish:|Use a transparent|It must be))/g, '\n\n') + '\n';
fs.writeFileSync(path.join(destination, 'stoquify-moat-assessment-prompt-2026-09-27.md'), prompt);
const selected = [
 'services/accounting/accountant-access.service.ts', 'actions/accounting/accountant-access.actions.ts',
 'components/accounting/AccountantPortfolio.tsx', 'services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts',
 'services/accounting/close-assurance-pack.service.ts', 'services/purchase-order/supplier-po-acknowledgement.service.ts',
 'services/payments/adapters/mobile-money-hmac.adapter.ts', 'services/payments/provider-event.service.ts',
 'services/reconciliation/payment-exception-closure.service.ts', 'services/cash-command/cash-command.service.ts',
 'services/stock-to-cash/stock-to-cash-flow.service.ts', 'services/onboarding/master-data-import.service.ts',
 'services/referrals/referral-funnel-read-model.service.ts', 'services/regulatory/country-packs/registry.ts',
 'services/modules/module-catalog.service.ts', 'prisma/schema.prisma', 'components/landing/public-product-copy.ts',
 'services/accounting/__tests__/accountant-access.service.test.ts', 'services/payments/__tests__/provider-event.service.test.ts',
 'services/cash-command/__tests__/cash-command.service.test.ts', 'services/purchase-order/__tests__/supplier-po-authority-boundary.test.ts'
];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => cp.execFileSync('git', args, {encoding:'utf8',stdio:['ignore','pipe','ignore']}).trimEnd();
const status = git(['status', '--porcelain', '--ignore-submodules']);
const manifest = { assessedAt: new Date().toISOString(), head: git(['rev-parse','HEAD']), branch: git(['branch','--show-current']), statusMethod: 'git status --porcelain --ignore-submodules', trackedChanges: status.split('\n').filter(x => x && !x.startsWith('??')).length, untrackedEntries: status.split('\n').filter(x => x.startsWith('??')).length, originalPromptSha256: hash(Buffer.from(raw)), files: selected.map(file => ({file, sha256: hash(fs.readFileSync(path.join(root,file)))})) };
fs.writeFileSync(path.join(evidence,'source-manifest.json'), JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(evidence,'git-status-before.txt'), status+'\n');
const graphSummary = ['actions','app','components','hooks','types'].map(name => {
 const data = JSON.parse(fs.readFileSync(`graphify-out/graph_${name}.json`,'utf8'));
 return {graph:name,nodes:data.nodes.length,edges:data.links.length,examples:data.nodes.filter(n=>/accountantportfolio|cashcommand|paymentreconciliationworkbench/.test(n.id)).slice(0,5)};
});
fs.writeFileSync(path.join(evidence,'graph-summary.json'), JSON.stringify(graphSummary,null,2));
const scopes = ['app','actions','services','components','hooks','lib','config','prisma/schema.prisma'];
const groups = {
 planning: '13.week|cash.?forecast|forecast.?scenario|scenario.?version|forecast.?actual|cash.?budget|cash.?aware',
 network: 'cross.?tenant.?benchmark|CounterpartyRelationship|shared.?supplier.?identity|supplier.?invoice.?portal|network.?identity',
 adoption: 'retained.?activation|retention.?cohort|first.?trusted.?value|financial.?cutover',
 portfolios: 'getAccountantPortfolio|AWAITING_ACCOUNTANT_REVIEW|outboxMessages: \\[\\]'
};
const searches = [];
for (const [name,pattern] of Object.entries(groups)) {
 const args=['-n','-i',pattern,...scopes,'-g','*.ts','-g','*.tsx','-g','*.prisma','-g','!**/graphify-out/**','-g','!**/__tests__/**'];
 const r=cp.spawnSync('rg',args,{encoding:'utf8',maxBuffer:10*1024*1024});
 fs.writeFileSync(path.join(evidence,`search-${name}.txt`),r.stdout+(r.stderr||''));
 searches.push({name,pattern,scopes,exitCode:r.status,matchingLines:r.stdout.trim()?r.stdout.trim().split('\n').length:0});
}
fs.writeFileSync(path.join(evidence,'search-register.json'),JSON.stringify(searches,null,2));
console.log(JSON.stringify({promptWritten:true,manifestFiles:manifest.files.length,trackedChanges:manifest.trackedChanges,untrackedEntries:manifest.untrackedEntries,searches},null,2));

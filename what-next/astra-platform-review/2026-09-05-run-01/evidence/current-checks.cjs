const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const api = require(path.join(root, 'scripts/api-route-guard-inventory.js'));
const apiReport = api.buildApiRouteGuardInventory(root, { mode: 'fail' });
write('api-inventory-current.json', apiReport);
const validator = require(path.join(root, 'scripts/validate-finance-x1-evidence.ts'));
const preflight = require(path.join(root, 'scripts/finance-x1-evidence-preflight.ts'));
const manifest = 'what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json';
write('x1-evidence-current.json', validator.validateFinanceX1EvidenceManifest({ root, manifest, mode: 'fail' }));
try {
  write('x1-preflight-current.json', preflight.evaluateFinanceX1EvidencePreflight(preflight.loadFinanceX1ApprovalManifest(root, manifest), process.env, { root, manifestPath: manifest }));
} catch (e) { write('x1-preflight-current.json', { status: 'blocked', reason: e.message }); }
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const versions = ['next', 'eslint-config-next', 'react', 'react-dom', 'better-auth', '@prisma/client', '@prisma/adapter-pg', 'prisma', 'xlsx'].map(name => {
  let installed = null;
  try { installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version; } catch {}
  return { name, declared: pkg.dependencies?.[name] ?? pkg.devDependencies?.[name], installed, npmCi: lock.packages?.['node_modules/' + name]?.version };
});
write('dependency-versions.json', { checkedAt: new Date().toISOString(), versions, packageManagerConfigured: pkg.packageManager ?? null, bothNpmAndPnpmLocks: fs.existsSync(path.join(root, 'pnpm-lock.yaml')), allDependenciesAudited: false });
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const expectedModels = ['GovernanceRegister','PolicyRevision','AuthorityAppointment','ApprovalRequest','ApprovalDecision','ApprovalVerification'];
write('native-register-status.json', {
  checkedAt: new Date().toISOString(),
  blueprint: 'docs/approval-register/STOQUIFY_APPROVAL_REGISTER_BLUEPRINT_2026-09-03.md',
  status: 'PROPOSED_NOT_IMPLEMENTED',
  modelChecks: expectedModels.map(name => ({ name, present: new RegExp('model\\s+' + name + '\\s*\\{').test(schema) })),
  approvalRoutePresent: fs.existsSync(path.join(root, 'app/[locale]/(dashboard)/dashboard/governance/approvals')),
  distinction: 'Other domain approvals and the local simulator are not the proposed native register. No signed approval or authority was issued by this audit.'
});
console.log(JSON.stringify({ api: apiReport.summary, dependencies: versions, outputs: ['api-inventory-current.json','x1-evidence-current.json','x1-preflight-current.json','dependency-versions.json','native-register-status.json'] }, null, 2));

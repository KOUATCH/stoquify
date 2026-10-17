const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { Prisma } = require('@prisma/client');
const root = path.resolve(__dirname, '../../../..');
const out = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const save = (file, data) => fs.writeFileSync(path.join(out, file), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
const schema = read('prisma/schema.prisma');
const sourceModels = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
const baseline = JSON.parse(read('what-next/database-reseed/2026-09-27-systematic-1500/baseline-profile.json'));
const baselineCounts = new Map(baseline.counts.map((entry) => [entry.table, entry.count]));
const readRunProfile = (name) => {
 const target = path.join(out, '..', name);
 return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
};
const candidateAuditFile = path.join(out, 'business-invariants.json');
const candidateAudit = fs.existsSync(candidateAuditFile) ? JSON.parse(fs.readFileSync(candidateAuditFile, 'utf8')) : null;
const candidateProfileFile = readRunProfile('candidate-final-profile.json') ? 'candidate-final-profile.json' : 'candidate-validated-profile.json';
const candidateProfile = readRunProfile(candidateProfileFile);
const candidateCountEvidence = candidateProfile && (!candidateAudit || candidateProfile.generatedAt > candidateAudit.generatedAt) ? { ...candidateProfile, tableCounts: candidateProfile.counts, file: candidateProfileFile } : { ...candidateAudit, file: 'assurance/business-invariants.json' };
const candidateCounts = new Map((candidateCountEvidence.tableCounts || []).map((entry) => [entry.table, entry.count]));
const sourceAuditFile = path.join(out, 'source-business-invariants.json');
const sourceAudit = fs.existsSync(sourceAuditFile) ? JSON.parse(fs.readFileSync(sourceAuditFile, 'utf8')) : null;
const sourceProfile = readRunProfile('source-final-profile.json');
const sourceCountEvidence = sourceProfile && (!sourceAudit || sourceProfile.generatedAt > sourceAudit.generatedAt) ? { ...sourceProfile, tableCounts: sourceProfile.counts, file: 'source-final-profile.json' } : { ...sourceAudit, file: 'assurance/source-business-invariants.json' };
const sourceCounts = new Map((sourceCountEvidence.tableCounts || []).map((entry) => [entry.table, entry.count]));
const clientModels = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const coverageSource = read('prisma/comprehensive-seed-coverage.ts');
const coverageModels = new Set([...coverageSource.match(/const COVERAGE_MODELS = \[([\s\S]*?)\] as const/)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]));
const seedFiles = fs.readdirSync(path.join(root, 'prisma')).filter((f) => /seed.*\.ts$/.test(f)).map((f) => ({ file: 'prisma/' + f, source: read('prisma/' + f) }));
const domains = [
 ['identity', /^(User|Role|Account|Session|Verification|Invite|PasswordHistory|PublicIdentityAbuseBucket)$/],
 ['organization and modules', /^(Organization|Location|TenantModule)/],
 ['reference data and inventory', /^(Category|Brand|Unit|TaxRate|Item|Inventory|SerialNumber|Stock|PictureAsset)/],
 ['master data onboarding', /^Onboarding/],
 ['purchasing and AP', /^(Supplier|Purchase|GoodsReceipt|ThreeWayMatch)/],
 ['HRIS and payroll', /^(Hris|Payroll)/],
 ['sales POS and delivery', /^(Sales|POS|DailySales|CashDrawer|CashShortage|Delivery|PublicReceipt|BranchDailyClose)/],
 ['payments and reconciliation', /^(Payment|Provider|SettlementAccount|StatementFile|StatementLine|MatchRecord|SuspenseItem|ReconciliationRun)/],
 ['customer receivables and external access', /^(Customer|Referral|AccountantClient)/],
 ['accounting and close', /^(OrganizationAccountingSettings|FiscalYear|AccountingPeriod|Close|Accountant|ChartOfAccount|Journal|Ledger|AccountingSourceLink|PostingRule|Expense|DocumentSequence)/],
 ['business events and workflow assurance', /^(BusinessEvent|WorkflowAssurance|PosCashShortageWorkerCheckpoint|AuditLog)/],
 ['fiscal compliance', /^(FiscalDocument|FiscalSequence|Compliance)/],
 ['AI governance', /^(Agent|AiAction)/],
];
const optionalTechnical = /^(Session|Verification|PublicIdentityAbuseBucket|PasswordHistory|Invite|SupplierPoAccessToken|SupplierPoAccessLog|PublicReceiptAccessToken|CustomerStatementAccessToken|CustomerStatementAccessLog|AgentRun|AgentStep|AgentCostLedger|AgentPolicyIncident|AgentPilotCertification|AgentActivationApproval|AgentActivationPackage|AgentActivationOwner|AgentReconcilerInvocation|WorkflowAssuranceWaiver|PosCashShortageWorkerCheckpoint)$/;
const preservation = /^(User|Role|Account|Organization|Location|Customer|Supplier|Item|PayrollEmployee)$/;
const models = sourceModels.map(([block, name, body]) => {
 const dmmf = clientModels.get(name);
 if (!dmmf) throw new Error('Generated client missing source model ' + name);
 const scalarFields = dmmf.fields.filter((f) => f.kind !== 'object');
 const relations = dmmf.fields.filter((f) => f.kind === 'object');
 const delegate = name[0].toLowerCase() + name.slice(1);
 const refs = seedFiles.filter((f) => f.file !== 'prisma/comprehensive-seed-coverage.ts' && (new RegExp('\\b' + delegate + '\\s*\\.').test(f.source) || f.source.includes('"' + name + '"'))).map((f) => f.file);
 const domain = domains.find(([, re]) => re.test(name))?.[0] || 'unclassified';
 return {
  model: name, table: dmmf.dbName || name, domain,
  sourceLine: schema.slice(0, schema.indexOf(block)).split('\n').length,
  populationDecision: preservation.test(name) ? 'PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS' : optionalTechnical.test(name) ? 'PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD' : 'POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS',
  rationale: optionalTechnical.test(name) ? 'Session, token, approval or runtime state must originate from a real local workflow; fabricated records would be misleading or insecure.' : 'Meaningful ' + domain + ' records require connected scenarios and invariants; this is a coverage decision, not populated-row evidence.',
  seedEvidence: { directSourceReferences: refs, genericCoverageGenerator: coverageModels.has(name), baselineCount: baselineCounts.get(dmmf.dbName || name) ?? null, candidateCount: candidateCounts.get(dmmf.dbName || name) ?? null, sourceCount: sourceCounts.get(dmmf.dbName || name) ?? null, candidateGenericPayloadFindings: candidateAudit?.payloadFindings.filter((finding) => finding.model === name) || [], sourceGenericPayloadFindings: sourceAudit?.payloadFindings.filter((finding) => finding.model === name) || [], semanticValidationStatus: coverageModels.has(name) ? 'GENERIC_FIXTURE_RISK_REQUIRES_PAYLOAD_AND_HISTORY_AUDIT' : 'REFER_TO_EXECUTED_DOMAIN_CHECKS; ROW_COUNT_ALONE_IS_NOT_CERTIFICATION' },
  primaryKey: dmmf.primaryKey || scalarFields.filter((f) => f.isId).map((f) => f.name), uniqueFields: dmmf.uniqueFields,
  constraintsAndIndexes: body.split('\n').map((s) => s.trim()).filter((s) => /^@@(?:id|unique|index|map)/.test(s)),
  fields: scalarFields.map((f) => ({ name: f.name, column: f.dbName || f.name, type: f.type, kind: f.kind, required: f.isRequired, list: f.isList, unique: f.isUnique, id: f.isId, nativeType: f.nativeType, default: f.default })),
  relations: relations.map((f) => ({ field: f.name, target: f.type, name: f.relationName, required: f.isRequired, list: f.isList, from: f.relationFromFields || [], to: f.relationToFields || [], onDelete: f.relationOnDelete })),
  applicationReferenceCandidates: scalarFields.filter((f) => /(?:Id|Hash|Ref|Reference|Key)$/.test(f.name) && !relations.some((r) => r.relationFromFields?.includes(f.name))).map((f) => f.name),
  payloadsRequiringConsumerValidation: scalarFields.filter((f) => f.type === 'Json').map((f) => f.name),
  acceptance: ['FK and required relations', 'declared uniqueness', ...(scalarFields.some((f) => f.name === 'organizationId') ? ['same organization across relations'] : []), ...(scalarFields.some((f) => f.type === 'Json') ? ['payloads validate against consumer schema'] : []), ...(scalarFields.some((f) => f.type === 'Decimal') ? ['amounts and quantities reconcile with source history'] : []), ...(['Item','InventoryLevel'].includes(name) ? ['all items quantityOnHand >= 1500 after verification'] : [])]
 };
});
if (models.length !== clientModels.size) throw new Error('Source/client model counts differ; coordinator must review');
const implicitJoins = new Map();
for (const model of models) for (const r of model.relations) {
 if (!r.list || r.from.length) continue;
 const opposite = models.find((m) => m.model === r.target)?.relations.find((x) => (r.target !== model.model || x.field !== r.field) && x.target === model.model && x.name === r.name && x.list && !x.from.length);
 if (opposite) implicitJoins.set(r.name, { relation: r.name, expectedTable: '_' + r.name, models: [model.model, r.target].sort(), acceptance: 'preserve pairs; verify unique pair and same-tenant scope in live catalog' });
}
const migrations = [];
for (const dir of fs.readdirSync(path.join(root, 'prisma/migrations')).sort()) {
 const file = 'prisma/migrations/' + dir + '/migration.sql';
 if (!fs.existsSync(path.join(root, file))) continue;
 const sql = read(file);
 const declarations = sql.split('\n').map((line, index) => ({ line: index + 1, sql: line.trim() })).filter((entry) => /\b(?:CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNIQUE\s+)?(?:TABLE|INDEX|FUNCTION|TRIGGER|VIEW|TYPE|SEQUENCE)|ADD\s+CONSTRAINT|CHECK\s*\(|DROP\s+(?:TABLE|INDEX|FUNCTION|TRIGGER|VIEW|TYPE|SEQUENCE))\b/i.test(entry.sql));
 migrations.push({ file, sha256: hash(sql), declarations });
}
const graph = JSON.parse(read('graphify-out/graph_actions.json'));
const graphRelevant = (graph.nodes || []).filter((n) => /inventory|accountant|close.assurance|payroll|supplier/i.test(JSON.stringify(n))).slice(0, 35);
save('schema-coverage.json', { generatedAt: new Date().toISOString(), method: 'Current source blocks joined with installed Prisma DMMF; model counts compared. Migration declarations are source inventory, not live DDL proof.', schemaSha256: hash(schema), countEvidence: { candidate: { file: candidateCountEvidence.file, generatedAt: candidateCountEvidence.generatedAt }, source: { file: sourceCountEvidence.file, generatedAt: sourceCountEvidence.generatedAt }, sourceFinalProfileGeneratedAt: sourceProfile?.generatedAt, candidateBusinessAuditGeneratedAt: candidateAudit?.generatedAt, sourceBusinessAuditGeneratedAt: sourceAudit?.generatedAt }, modelCount: models.length, enumCount: Prisma.dmmf.datamodel.enums.length, genericCoverageModelCount: coverageModels.size, models, enums: Prisma.dmmf.datamodel.enums, implicitJoinTables: [...implicitJoins.values()], migrationSourceDeclarations: migrations, graphContext: { reportDate: '2026-08-09', freshness: 'historical navigation only; current source supersedes graph', sampleNodes: graphRelevant } });
save('model-coverage.md', '# Model and dependency coverage\n\nCoverage decisions and source dependencies are not proof that rows are meaningful or workflows pass. Baseline counts are from baseline-profile.json; row thresholds are not quality tests. Candidate counts: ' + (candidateCountEvidence.generatedAt || 'not captured') + '. Source after execution counts: ' + (sourceCountEvidence.generatedAt || 'not captured') + '.\n\nModels: ' + models.length + '. Enums: ' + Prisma.dmmf.datamodel.enums.length + '. Generic coverage models: ' + coverageModels.size + '.\n\nPer-field checks, SQL declarations and implicit joins: schema-coverage.json. Other physical tables: ' + baseline.counts.filter((r) => !models.some((m) => m.table === r.table)).map((r) => r.table + ' (' + r.count + ')').join(', ') + '. Legacy production tables are intentionally retained without adding retired functionality.\n\n| Model / table | Domain | Baseline / candidate / source count | Population decision | Generic generator |\n|---|---|---|---|---|\n' + models.map((m) => '| ' + m.model + ' / `' + m.table + '` | ' + m.domain + ' | ' + m.seedEvidence.baselineCount + ' / ' + (m.seedEvidence.candidateCount ?? 'unverified') + ' / ' + (m.seedEvidence.sourceCount ?? 'unverified') + ' | ' + m.populationDecision + ' | ' + (m.seedEvidence.genericCoverageGenerator ? 'YES: review semantics' : 'no') + ' |').join('\n') + '\n');
if (process.argv.includes('--metadata-only')) { console.log(JSON.stringify({models: models.length, implicitJoins: implicitJoins.size})); process.exit(0); }
const gateFiles = ['inventory-valuation-truth-gate', 'ledger-close-truth-gate', 'payment-cash-truth-gate', 'purchasing-ap-consolidation-gate', 'role-based-operating-cockpit-gate', 'statutory-country-pack-development-gate', 'statutory-country-pack-production-gate', 'workflow-assurance-release-gate'];
const gateResults = [];
for (const gate of gateFiles) {
 const args = ['scripts/' + gate + '.js', '--mode', 'fail', '--out', path.join(out, gate + '.md'), '--json-out', path.join(out, gate + '.json')];
 const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true });
 save(gate + '.log', (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''));
 const reportFile = path.join(out, gate + '.json');
 const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
 gateResults.push({ gate, command: [process.execPath, ...args], exitCode: result.status, signal: result.signal, summary: report?.summary, blockers: report?.blockers || report?.summary?.blockers || [], meaning: 'Static repository/evidence gate only; no database changes, external transmissions, or runtime certification.' });
}
save('gate-execution-results.json', { generatedAt: new Date().toISOString(), gates: gateResults });
console.log(JSON.stringify({ models: models.length, enums: Prisma.dmmf.datamodel.enums.length, implicitJoins: implicitJoins.size, genericCoverageModels: coverageModels.size, gates: gateResults.map(({gate,exitCode,blockers})=>({gate,exitCode,blockers})) }, null, 2));

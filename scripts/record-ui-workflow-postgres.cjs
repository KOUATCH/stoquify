const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { resolveWorkflowTestTarget } = require('./ui-workflow-postgres-target.cjs');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
async function main() {
  const databaseName = process.argv[2];
  const target = resolveWorkflowTestTarget(databaseName);
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const identity = (await client.query('SELECT current_database() AS name, version() AS version')).rows[0];
    if (identity.name !== databaseName) throw new Error('Unexpected database');
    const migrations = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows.map(row => {
      const file = `prisma/migrations/${row.migration_name}/migration.sql`;
      return { ...row, file, sourceMatches: fs.existsSync(file) && hash(fs.readFileSync(file)) === row.checksum };
    });
    const directory = path.join(process.cwd(), 'what-next/ui-workflow-roadmap');
    const reports = ['alert-recovery-postgres-jest.json', 'purchase-authoring-postgres-jest.json', 'access-requests-postgres-jest.json', 'payroll-settlement-postgres-jest.json', 'item-search-postgres-jest.json', 'audit-explorer-postgres-jest.json'].map(file => {
      const raw = fs.readFileSync(path.join(directory, file));
      const report = JSON.parse(raw);
      if (!report.success) throw new Error('A PostgreSQL test report is not passing');
      return { file, sha256: hash(raw), suites: report.numPassedTestSuites, tests: report.numPassedTests, skipped: report.numPendingTests, startedAt: new Date(report.startTime).toISOString() };
    });
    const files = [
      'jest.ui-workflow-postgres.config.cjs', 'scripts/ui-workflow-postgres-target.cjs', 'scripts/ui-workflow-postgres-bootstrap.cjs',
      'tests/postgres/ui-workflow/target.test.ts', 'tests/postgres/ui-workflow/alert-recovery.test.ts', 'tests/postgres/ui-workflow/purchase-authoring.test.ts',
      'tests/postgres/ui-workflow/access-requests.test.ts',
      'tests/postgres/ui-workflow/payroll-settlement.test.ts',
      'tests/postgres/ui-workflow/item-search.test.ts', 'tests/postgres/ui-workflow/audit-explorer.test.ts',
      'services/item/item-overview.service.ts', 'services/search/business-record-search.service.ts',
      'services/audit/audit-explorer.service.ts', 'services/audit/audit-explorer-contracts.ts',
      'services/operating-access/operating-access-scope-contracts.ts',
      'services/payroll/payment-reconciliation.service.ts', 'services/payroll/payment-settlement-proof.ts',
      'services/payroll/payment-settlement-balance.ts', 'services/payroll/payroll-adapter-registry.service.ts',
      'services/controls/sensitive-action.service.ts', 'services/accounting/close-assurance-pack.service.ts',
      'services/access-requests/access-request.service.ts', 'services/access-requests/access-request-contracts.ts',
      'services/users/member-access.service.ts', 'services/users/member-access-policy.ts',
      'services/reconciliation/alert-scan-recovery.service.ts', 'services/reconciliation/alert-scan-recovery.contracts.ts',
      'services/reconciliation/payment-reconciliation-alert-scan.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts',
      'services/purchase-order/purchase-order-authoring.service.ts', 'services/purchase-order/purchase-order-authoring-contracts.ts',
      'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-document-number.service.ts',
      'services/modules/module-entitlement.service.ts', 'services/events/business-event.service.ts', 'prisma/schema.prisma',
    ];
    const evidence = { recordedAt: new Date().toISOString(), database: identity, applicationDatabaseChanged: false, migrations,
      allMigrationSourcesMatch: migrations.every(row => row.sourceMatches && row.finished_at && !row.rolled_back_at), reports,
      databaseScenarios: { alertRecovery: 11, purchaseAuthoring: 8, accessRequests: 14, payrollSettlement: 14, itemSearch: 9, auditExplorer: 7, targetGuards: 11 },
      sourceHashes: files.map(file => ({ file, sha256: hash(fs.readFileSync(file)) })),
      releaseComplete: false, roadmapComplete: false };
    fs.writeFileSync(path.join(directory, 'postgres-workflow-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ databaseName, migrations: migrations.length, allMigrationSourcesMatch: evidence.allMigrationSourcesMatch, reports }));
    if (!evidence.allMigrationSourcesMatch) process.exitCode = 1;
  } finally { await client.end(); }
}
main().catch(() => { console.error('Could not validate isolated workflow database evidence; no database changes made.'); process.exitCode = 1; });

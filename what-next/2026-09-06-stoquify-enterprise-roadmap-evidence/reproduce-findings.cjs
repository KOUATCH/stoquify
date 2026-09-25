// Read-only audit harness. Uses synthetic records and never loads the database client.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = process.cwd();
const sources = {};
function load(relative, dependencies) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  sources[relative] = crypto.createHash('sha256').update(source).digest('hex');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(id) {
    if (!(id in dependencies)) throw new Error('Unexpected dependency: ' + id);
    return dependencies[id];
  }, Date, Intl, console }, { filename: relative });
  return exports;
}
async function main() {
  process.env.TZ = 'UTC';
  const instant = new Date('2026-09-06T10:00:00.000Z');
  const records = [
    { id: 'completed', status: 'COMPLETED', total: 100 },
    { id: 'unfinished-cart', status: 'DRAFT', total: 900 },
    { id: 'cancelled', status: 'CANCELLED', total: 700 },
  ].map(row => ({ ...row, organizationId: 'audit-org', locationId: 'audit-location',
    createdAt: instant, lines: [], payments: [] }));
  let query;
  const sales = load('services/analytics/sales-analytics.service.ts', {
    'server-only': {}, 'date-fns': require('date-fns'),
    '@/prisma/db': { db: { salesOrder: { async findMany(input) {
      query = input.where;
      return records.filter(row => row.organizationId === query.organizationId &&
        row.locationId === query.locationId && row.createdAt >= query.createdAt.gte &&
        row.createdAt <= query.createdAt.lte && row.status !== query.status.not);
    }}}},
    '@/services/_shared/action-errors': {
      ApplicationError: class ApplicationError extends Error {},
      toSafeActionError: error => { throw error; },
    },
  });
  const result = await sales.getSalesAnalyticsReadModel({ organizationId: 'audit-org',
    locationId: 'audit-location', startDate: instant, endDate: instant });
  const summary = { today: { sales: result.totalSales, transactions: result.totalTransactions,
    averageTransaction: result.averageTransaction, salesChange: 0, transactionsChange: 0 },
    week: { sales: 0, transactions: 0, averageTransaction: 0 },
    month: { sales: 0, transactions: 0, averageTransaction: 0 },
    activeSessions: 0, lowStockItems: 0, topSellingItems: [] };
  const pulse = sales.composeBusinessPulseCommandData({ organizationId: 'audit-org',
    locationId: 'audit-location', summary, now: instant });
  let downstreamReadInvoked = false;
  class RbacError extends Error {}
  const context = { orgId: 'audit-org', permissions: ['reports.read'],
    syntheticEntitlements: { analytics: 'DISABLED' } };
  const catalog = load('app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts', {});
  const access = load('app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx', {
    'react/jsx-runtime': { jsx: (...args) => args, jsxs: (...args) => args },
    '@/components/dashboard/DashboardRouteState': { DashboardRouteState: () => null },
    '@/i18n/routing': { pickLocale: value => value, localizePath: value => value },
    '@/lib/security/rbac': { RbacError, requirePermission: async () => context,
      requireAllPermissions: async () => context, requireAnyPermission: async () => context },
    './analytics-route-data-access': catalog,
  });
  await access.withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale: 'en' }),
    surface: catalog.analyticsRouteCatalog[0], onAllowed() {
      downstreamReadInvoked = true;
      return 'synthetic read';
    }});
  const evidence = {
    generatedAt: new Date().toISOString(), boundary: 'isolated source execution; synthetic DB and RBAC; no network or database', sources,
    unfinishedCartCountedAsSale: { predicate: query.status, expectedFinalizedSales: 100,
      observedSales: result.totalSales, expectedFinalizedTransactions: 1,
      observedTransactions: result.totalTransactions, reproduced: result.totalSales === 1000 },
    businessPulseDefaults: { observedCurrency: pulse.currency,
      observedPeriodStart: pulse.periodStart, configuredHarnessTimezone: 'UTC',
      intendedDoualaPeriodStart: '2026-09-05T23:00:00.000Z',
      boundary: 'Composer receives no organization currency or timezone; production wrapper also supplies neither.' },
    analyticsRouteEntitlementOmission: { rbacPermissionGranted: true,
      syntheticTenantAnalyticsEntitlement: 'DISABLED', downstreamReadInvoked,
      boundary: 'Wrapper-level reproduction; not an authenticated browser or deployed middleware test.' },
  };
  fs.writeFileSync(path.join(__dirname, 'finding-reproductions.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

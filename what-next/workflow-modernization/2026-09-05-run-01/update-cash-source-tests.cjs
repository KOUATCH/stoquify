const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const p=path.resolve(__dirname,'../../../services/cash-command/__tests__/cash-command.service.test.ts');let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
s=s.replace('    organization: { findFirst: jest.fn() },','    organization: { findFirst: jest.fn() },\n    payment: { aggregate: jest.fn() },\n    payrollEmployeeBalanceCase: { groupBy: jest.fn() },\n    purchaseOrder: { groupBy: jest.fn() },');
s=s.replace('jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({\n  getTenantOperatingSnapshotFromRelated: jest.fn(),\n}))','jest.mock("@/services/payroll/payroll-finance-forecast.service", () => ({\n  ...jest.requireActual("@/services/payroll/payroll-finance-forecast.service"),\n  getPayrollFinanceForecast: jest.fn(),\n}))');
s=s.replace('import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"','import { getPayrollFinanceForecast } from "@/services/payroll/payroll-finance-forecast.service"');
s=s.replace('const mockGetTenantOperatingSnapshotFromRelated = getTenantOperatingSnapshotFromRelated as jest.Mock','const mockGetPayrollFinanceForecast = getPayrollFinanceForecast as jest.Mock');
s=s.replace(/mockGetTenantOperatingSnapshotFromRelated/g,'mockGetPayrollFinanceForecast');
s=s.replace('    mockGetPayrollFinanceForecast.mockResolvedValue(tenantSnapshot())','    mockGetPayrollFinanceForecast.mockResolvedValue({ metrics: payrollForecastMetrics(), sourceMaxUpdatedAt: new Date(generatedAt), sourceEvidenceHash: "payroll-hash" })\n    ;(db.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 180000 }, _count: { _all: 1 }, _max: { updatedAt: new Date(generatedAt) } })\n    ;(db.payrollEmployeeBalanceCase.groupBy as jest.Mock).mockResolvedValue([{ currency: "XAF", _sum: { outstandingAmount: 120000 }, _count: { _all: 2 }, _max: { updatedAt: new Date(generatedAt) } }])\n    ;(db.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([])');
s=s.replace('    db.organization.findFirst as jest.Mock,','    db.organization.findFirst as jest.Mock,\n    db.payment.aggregate as jest.Mock,\n    db.payrollEmployeeBalanceCase.groupBy as jest.Mock,\n    db.purchaseOrder.groupBy as jest.Mock,');
s=s.replace('    mockCreateBusinessSignalFromFact.mockReturnValue(null)','    mockCreateBusinessSignalFromFact.mockImplementation(jest.requireActual("@/services/signals/business-signal-rules.service").createBusinessSignalFromFact)');
s=s.replace('uses one resolved source set for both the aggregate and visible cash indicators','loads each permitted source once and uses its own provenance');
s=s.replace('actorPermissions: ["finance.read", "payments.reconciliation.read", "inventory.read"], now: generatedAt,','actorPermissions: ["finance.read", "payments.reconciliation.read", "inventory.read", "accounting.close.read"], now: generatedAt,');
s=s.replace('expect.objectContaining({ organizationId: "org-1", now: generatedAt })','expect.objectContaining({ organizationId: "org-1", now: new Date(generatedAt) })');
const a=s.indexOf('    expect(mockGetPayrollFinanceForecast).toHaveBeenCalledTimes(1)',s.indexOf('loads each permitted source once')),b=s.indexOf('    expect(result.cards.find',a);
s=s.slice(0,a)+'    expect(mockGetPayrollFinanceForecast).not.toHaveBeenCalled()\n'+s.slice(b);
s=s.replace('    ["payment", mockGetPaymentTruthSnapshot],\n    ["inventory", mockGetInventoryCashSnapshot],\n    ["close", mockGetCloseReadinessSnapshot],','    ["payment", mockGetPaymentTruthSnapshot, "payments.reconciliation.read"],\n    ["inventory", mockGetInventoryCashSnapshot, "inventory.read"],\n    ["close", mockGetCloseReadinessSnapshot, "accounting.close.read"],');
s=s.replace('async (_name, source) => {','async (_name, source, permission) => {');
const f=s.indexOf('const failure = new Error("controlled related source failure")'),e=s.indexOf('\n  })',f);let part=s.slice(f,e).replace('actorPermissions: ["finance.read"]','actorPermissions: ["finance.read", permission as string]').replace('expect(mockGetPayrollFinanceForecast).toHaveBeenCalledTimes(1)','expect(source).toHaveBeenCalledTimes(2)');s=s.slice(0,f)+part+s.slice(e);
s=s.replace('mockGetPayrollFinanceForecast.mockResolvedValue(hidden)','mockGetPayrollFinanceForecast.mockResolvedValue({ metrics: hidden.metrics.payrollFinanceForecast, sourceMaxUpdatedAt: new Date("2099-01-01"), sourceEvidenceHash: hidden.sourceHash })');
s=s.replace('expect(result.cards.find(card => card.id === "cash_collected")?.provenance.sourceHash).toBe("tenant-hash")','expect(result.cards.find(card => card.id === "cash_collected")?.provenance).toMatchObject({ sourceKind: "cash.collected", sourceHash: expect.any(String), sourceModules: ["finance"] })');
const c=s.indexOf('    expect(mockGetPayrollFinanceForecast).toHaveBeenCalledTimes(1)',s.indexOf('allows $label authority')),d=s.indexOf('    expect(mockGetInventoryLossSnapshot)',c);
s=s.slice(0,c)+`    expect(mockGetPayrollFinanceForecast).not.toHaveBeenCalled()
    expect(mockGetPaymentTruthSnapshot).not.toHaveBeenCalled()
    expect(mockGetInventoryCashSnapshot).not.toHaveBeenCalled()
    expect(mockGetCloseReadinessSnapshot).not.toHaveBeenCalled()
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.source")).toHaveLength(actorPermissions.includes("finance.read") ? 1 : 0)
`+s.slice(d);
const tmp=p+'.pending-'+crypto.randomUUID();fs.writeFileSync(tmp,s);fs.renameSync(tmp,p);

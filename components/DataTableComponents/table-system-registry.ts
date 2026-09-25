import {
  inventoryItemsTableContract,
  paymentReconciliationTableContract,
  purchaseOrdersTableContract,
} from "./pilot-table-contracts"

export type TableMigrationState = "canonical-pilot" | "canonical-adopted" | "registered-legacy" | "shared-core" | "public-portal"

export interface TableSurfaceRegistration {
  source: string
  owner: string
  state: TableMigrationState
  contractId?: string
  note?: string
}

const legacy = (source: string, owner: string): TableSurfaceRegistration => ({
  source,
  owner,
  state: "registered-legacy",
  note: "Registered for ratchet visibility; outside the NOW migration scope.",
})

export const tableSystemRegistry: readonly TableSurfaceRegistration[] = [
  { source: "components/inventory/movements/InventoryMovementHistoryTable.tsx", owner: "inventory", state: "canonical-adopted", contractId: "inventory.movements" },
  { source: "components/DataTableComponents/DataTable.tsx", owner: "frontend-platform", state: "shared-core" },
  { source: "components/DataTableComponents/RenderedDataTable.tsx", owner: "frontend-platform", state: "shared-core" },
  { source: "components/accounting/AccountingDataTable.tsx", owner: "accounting", state: "shared-core" },
  { source: "app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/financial-statement-lines-table.tsx", owner: "accounting", state: "canonical-adopted", note: "Shared account detail for the financial statement contracts." },
  { source: "components/ui/table.tsx", owner: "frontend-platform", state: "shared-core" },
  { source: "components/ui/data-table/table-loading.tsx", owner: "frontend-platform", state: "shared-core" },
  { source: "components/ui/groups/inventory/ItemManagement.tsx", owner: "inventory", state: "canonical-pilot", contractId: inventoryItemsTableContract.id },
  { source: "components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx", owner: "purchasing", state: "canonical-pilot", contractId: purchaseOrdersTableContract.id },
  { source: "components/finance/PaymentReconciliationWorkbench.tsx", owner: "payments", state: "canonical-pilot", contractId: paymentReconciliationTableContract.id },
  { source: "app/customer-statement/[statementId]/CustomerStatementPortal.tsx", owner: "receivables", state: "public-portal" },
  { source: "app/[locale]/supplier-purchase-order/[envelopeId]/SupplierPoAcknowledgementPortal.tsx", owner: "purchasing", state: "public-portal" },
  ...[
    ["components/compliance/ComplianceCenterDashboard.tsx", "compliance"],
    ["components/accounting/CloseAssuranceCenter.tsx", "accounting"],
    ["components/accounting/AccountingControlCenter.tsx", "accounting"],
    ["components/finance/FinanceSpecializedLedgerSurfaces.tsx", "finance"],
    ["components/finance/FinanceCommandCenterDashboard.tsx", "finance"],
    ["components/accounting/AccountantPortal.tsx", "accounting"],
    ["components/accounting/AccountantAccessManager.tsx", "accounting"],
    ["components/dashboard/Tables/Invites.tsx", "identity"],
    ["components/payroll/PayrollSetupControlPlane.tsx", "payroll"],
    ["components/payroll/PayrollRunWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollRegisterTieOut.tsx", "payroll"],
    ["components/payroll/PayrollPaymentReconciliationWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollEmployeeSourceWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollEmployeeBalanceWorkbench.tsx", "payroll"],
    ["components/dashboard/history/TransactionHistoryWorkbenchShell.tsx", "platform"],
    ["components/payroll/PayrollDeclarationWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollContractLifecycleWorkbench.tsx", "payroll"],
    ["components/payroll/PayrollCompensationWorkbench.tsx", "payroll"],
    ["components/tax-rates/TaxRatesManagementDashboard.tsx", "tax"],
    ["components/hris/HrisMovementHistory.tsx", "hris"],
    ["components/hris/HrisManagerSelfService.tsx", "hris"],
    ["components/hris/HrisEmployeeDirectoryTable.tsx", "hris"],
    ["components/hris/HrisApprovalInbox.tsx", "hris"],
    ["components/settings/OrganizationManagementTable.tsx", "settings"],
    ["components/locations/LocationsManagementDashboard.tsx", "locations"],
    ["components/purchasing/APControlWorkbench.tsx", "purchasing"],
    ["components/pos/CashDrawerManagementDashboard.tsx", "pos"],
    ["components/purchase-orders/ModernPurchaseOrderDetailPage.tsx", "purchasing"],
    ["components/purchase-orders/PurchaseOrderAnalyticsTable.tsx", "purchasing"],
    ["components/purchase-orders/ModernCreatePurchaseOrderForm.tsx", "purchasing"],
    ["components/referrals/ReferralFunnelDashboard.tsx", "growth"],
    ["components/pos/TerminalManagementDashboard.tsx", "pos"],
    ["components/inventory/transfers/TransferDetailsModal.tsx", "inventory"],
    ["components/inventory/transfers/TransferDashboard.tsx", "inventory"],
    ["components/inventory/movements/StockMovementDashboard.tsx", "inventory"],
    ["components/inventory/loss/InventoryLossWorkbench.tsx", "inventory"],
    ["app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx", "sales"],
    ["app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/trial-balance-table.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/accounting/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx", "accounting"],
    ["app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx", "purchasing"],
    ["app/[locale]/(dashboard)/dashboard/purchases/page.tsx", "purchasing"],
  ].map(([source, owner]) => legacy(source, owner)),
]

export const registeredTableSources = new Set(tableSystemRegistry.map((entry) => entry.source))

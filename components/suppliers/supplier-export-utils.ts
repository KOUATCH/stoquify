import { type SupplierManagementRow } from "@/services/supplier/supplier.service"

export type SupplierExportOptions = {
  includeSensitiveFields?: boolean
}

type SupplierExportColumn = {
  header: string
  sensitive: boolean
  value: (supplier: SupplierManagementRow) => string | number | boolean
}

const supplierExportColumns: SupplierExportColumn[] = [
  { header: "Name", sensitive: false, value: (supplier) => supplier.name },
  { header: "Code", sensitive: false, value: (supplier) => supplier.code ?? "" },
  { header: "Contact", sensitive: true, value: (supplier) => supplier.contactPerson ?? "" },
  { header: "Email", sensitive: true, value: (supplier) => supplier.email ?? "" },
  { header: "Phone", sensitive: true, value: (supplier) => supplier.phone ?? "" },
  { header: "Country", sensitive: false, value: (supplier) => supplier.country ?? "" },
  { header: "Tax ID", sensitive: true, value: (supplier) => supplier.taxId ?? "" },
  { header: "Payment Terms", sensitive: false, value: (supplier) => supplier.paymentTerms ?? "" },
  { header: "Credit Limit", sensitive: false, value: (supplier) => supplier.creditLimit ?? "" },
  { header: "Balance", sensitive: false, value: (supplier) => supplier.currentBalance },
  { header: "Active", sensitive: false, value: (supplier) => (supplier.isActive ? "true" : "false") },
  { header: "Linked Items", sensitive: false, value: (supplier) => supplier.supplierItemsCount },
  { header: "Open Orders", sensitive: false, value: (supplier) => supplier.openPurchaseOrdersCount },
]

export function buildSupplierExportHeaders(includeSensitiveFields: boolean) {
  return supplierExportColumns.filter((column) => includeSensitiveFields || !column.sensitive).map((column) => column.header)
}

export function buildSupplierExportRows(suppliers: SupplierManagementRow[], options: SupplierExportOptions = {}): Array<Array<string | number | boolean>> {
  return suppliers.map((supplier) =>
    supplierExportColumns
      .filter((column) => options.includeSensitiveFields || !column.sensitive)
      .map((column) => column.value(supplier)),
  )
}

export function buildSupplierExportCsv(suppliers: SupplierManagementRow[], options: SupplierExportOptions = {}) {
  const rows = buildSupplierExportRows(suppliers, options)
  const header = buildSupplierExportHeaders(Boolean(options.includeSensitiveFields))
  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\n")
}

export function buildSupplierClipboardPayload(supplier: SupplierManagementRow) {
  return supplier.id
}

function escapeCsv(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

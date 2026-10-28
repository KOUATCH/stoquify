const fs = require("fs")

const path = "components/suppliers/SupplierManagementDashboard.tsx"
let text = fs.readFileSync(path, "utf8")

const replacements = []

replacements.push([
`interface SupplierManagementDashboardProps {\n  organizationId: string\n  locale?: Locale\n  basePath?: string\n  initialAction?: "create"\n  initialEditId?: string\n  initialAnalyticsId?: string\n}`,
`interface SupplierManagementDashboardProps {\n  organizationId: string\n  locale?: Locale\n  basePath?: string\n  initialAction?: "create"\n  initialEditId?: string\n  initialAnalyticsId?: string\n  canExportSensitive?: boolean\n}`
])

replacements.push([
`    exportBody: "The current supplier view was exported as CSV.",`,
`    exportBody: "The current supplier view was exported as CSV.",\n    exportSensitiveNotice: "Contact, email, phone, and tax ID are omitted from export by default for data minimization.",\n    includeSensitiveFields: "Include sensitive fields",\n    sensitiveFieldsIncluded: "Sensitive fields included",`
])

replacements.push([
`    exportBody: "La vue fournisseur actuelle a ete exportee en CSV.",`,
`    exportBody: "La vue fournisseur actuelle a ete exportee en CSV.",\n    exportSensitiveNotice: "Le contact, l\'email, le telephone et l\'ID fiscal sont omis de l\'export par defaut.",\n    includeSensitiveFields: "Inclure les informations sensibles",\n    sensitiveFieldsIncluded: "Informations sensibles inclues",`
])

const helperBlock = `const copy = {`
const helperInsert = `const copy = {`

const helperBlockAnchor = `} as const\n\nfunction getDefaultForm(): SupplierFormState {`
const helperInsertBlock = `} as const\n\ntype SupplierExportColumn = {\n  header: string\n  sensitive: boolean\n  value: (supplier: SupplierManagementRow) => string | number | boolean\n}\n\nconst supplierExportColumns: SupplierExportColumn[] = [\n  { header: "Name", sensitive: false, value: (supplier) => supplier.name },\n  { header: "Code", sensitive: false, value: (supplier) => supplier.code ?? "" },\n  { header: "Contact", sensitive: true, value: (supplier) => supplier.contactPerson ?? "" },\n  { header: "Email", sensitive: true, value: (supplier) => supplier.email ?? "" },\n  { header: "Phone", sensitive: true, value: (supplier) => supplier.phone ?? "" },\n  { header: "Country", sensitive: false, value: (supplier) => supplier.country ?? "" },\n  { header: "Tax ID", sensitive: true, value: (supplier) => supplier.taxId ?? "" },\n  { header: "Payment Terms", sensitive: false, value: (supplier) => supplier.paymentTerms ?? "" },\n  { header: "Credit Limit", sensitive: false, value: (supplier) => supplier.creditLimit ?? "" },\n  { header: "Balance", sensitive: false, value: (supplier) => supplier.currentBalance },\n  { header: "Active", sensitive: false, value: (supplier) => (supplier.isActive ? "true" : "false") },\n  { header: "Linked Items", sensitive: false, value: (supplier) => supplier.supplierItemsCount },\n  { header: "Open Orders", sensitive: false, value: (supplier) => supplier.openPurchaseOrdersCount },\n]\n\nexport function buildSupplierExportHeaders(includeSensitiveFields: boolean) {\n  return supplierExportColumns.filter((column) => includeSensitiveFields || !column.sensitive).map((column) => column.header)\n}\n\nexport function buildSupplierExportRows(\n  suppliers: SupplierManagementRow[],\n  options: { includeSensitiveFields?: boolean } = {},\n): Array<Array<string | number | boolean>> {\n  return suppliers.map((supplier) =>\n    supplierExportColumns\n      .filter((column) => options.includeSensitiveFields || !column.sensitive)\n      .map((column) => column.value(supplier)),\n  )\n}\n\nexport function buildSupplierExportCsv(\n  suppliers: SupplierManagementRow[],\n  options: { includeSensitiveFields?: boolean } = {},\n) {\n  const rows = buildSupplierExportRows(suppliers, options)\n  const header = buildSupplierExportHeaders(Boolean(options.includeSensitiveFields))\n  return [header, ...rows]\n    .map((row) => row.map((value) => escapeCsv(value)).join(","))\n    .join("\\n")\n}\n\nexport function buildSupplierClipboardPayload(supplier: SupplierManagementRow) {\n  return supplier.id\n}\n\nfunction getDefaultForm(): SupplierFormState {`

replacements.push([helperBlockAnchor, helperInsertBlock])

const signatureOld = `export default function SupplierManagementDashboard({\n  organizationId,\n  locale = "en",\n  basePath = "/dashboard/purchases/suppliers",\n  initialAction,\n  initialEditId,\n  initialAnalyticsId,\n}: SupplierManagementDashboardProps) {`
const signatureNew = `export default function SupplierManagementDashboard({\n  organizationId,\n  locale = "en",\n  basePath = "/dashboard/purchases/suppliers",\n  initialAction,\n  initialEditId,\n  initialAnalyticsId,\n  canExportSensitive = false,\n}: SupplierManagementDashboardProps) {`
replacements.push([signatureOld, signatureNew])

const stateOld = `  const [analyticsSupplierId, setAnalyticsSupplierId] = useState<string | null>(null)\n  const [formState, setFormState] = useState<SupplierFormState>(() => getDefaultForm())`
const stateNew = `  const [analyticsSupplierId, setAnalyticsSupplierId] = useState<string | null>(null)\n  const [includeSensitiveExport, setIncludeSensitiveExport] = useState(false)\n  const [formState, setFormState] = useState<SupplierFormState>(() => getDefaultForm())`
replacements.push([stateOld, stateNew])

const copyOld = `  const copySupplierId = useCallback(async (supplier: SupplierManagementRow) => {\n    try {\n      await navigator.clipboard.writeText(supplier.id)\n      notifications.success(t.copiedTitle, t.copiedBody)\n    } catch {\n      notifications.error(t.copyFailedTitle, t.copyFailedBody)\n    }\n  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])`
const copyNew = `  const copySupplierId = useCallback(async (supplier: SupplierManagementRow) => {\n    try {\n      await navigator.clipboard.writeText(buildSupplierClipboardPayload(supplier))\n      notifications.success(t.copiedTitle, t.copiedBody)\n    } catch {\n      notifications.error(t.copyFailedTitle, t.copyFailedBody)\n    }\n  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])`
replacements.push([copyOld, copyNew])

const exportOld = `  const exportSuppliers = useCallback(() => {\n    const header = [\n      "Name",\n      "Code",\n      "Contact",\n      "Email",\n      "Phone",\n      "Country",\n      "Payment Terms",\n      "Credit Limit",\n      "Balance",\n      "Active",\n      "Linked Items",\n      "Open Orders",\n    ]\n    const rows = filteredSuppliers.map((supplier) => [\n      supplier.name,\n      supplier.code ?? "",\n      supplier.contactPerson ?? "",\n      supplier.email ?? "",\n      supplier.phone ?? "",\n      supplier.country ?? "",\n      supplier.paymentTerms ?? "",\n      supplier.creditLimit ?? "",\n      supplier.currentBalance,\n      supplier.isActive ? "true" : "false",\n      supplier.supplierItemsCount,\n      supplier.openPurchaseOrdersCount,\n    ])\n    const csv = [header, ...rows]\n      .map((row) => row.map((value) => escapeCsv(value)).join(","))\n      .join("\\n")\n    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })\n    const url = URL.createObjectURL(blob)\n    const anchor = document.createElement("a")\n    anchor.href = url\n    anchor.download = "suppliers.csv"\n    anchor.click()\n    URL.revokeObjectURL(url)\n    notifications.success(t.exportTitle, t.exportBody)\n  }, [filteredSuppliers, notifications, t.exportBody, t.exportTitle])`
const exportNew = `  const exportSuppliers = useCallback(() => {\n    const csv = buildSupplierExportCsv(filteredSuppliers, {\n      includeSensitiveFields: canExportSensitive && includeSensitiveExport,\n    })\n    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })\n    const url = URL.createObjectURL(blob)\n    const anchor = document.createElement("a")\n    anchor.href = url\n    anchor.download = canExportSensitive && includeSensitiveExport ? "suppliers-full.csv" : "suppliers-redacted.csv"\n    anchor.click()\n    URL.revokeObjectURL(url)\n    notifications.success(t.exportTitle, t.exportBody)\n  }, [\n    canExportSensitive,\n    includeSensitiveExport,\n    filteredSuppliers,\n    notifications,\n    t.exportBody,\n    t.exportTitle,\n  ])`
replacements.push([exportOld, exportNew])

const toolbarOld = `                <Button\n                  type="button"\n                  variant="outline"\n                  size="sm"\n                  onClick={() => refetch()}\n                  disabled={isFetching}\n                  className="dashboard-button-secondary h-9 rounded-lg"\n                >\n                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />\n                  {isFetching ? t.refreshing : t.refresh}\n                </Button>\n                <Button type="button" variant="outline" size="sm" onClick={exportSuppliers} className="dashboard-button-secondary h-9 rounded-lg">\n                  <Download className="h-4 w-4" />\n                  {t.export}\n                </Button>`
const toolbarNew = `                <p className="max-w-sm text-[0.68rem] leading-4 text-[var(--dash-text-soft)]">\n                  {t.exportSensitiveNotice}\n                </p>\n                <Button\n                  type="button"\n                  variant="outline"\n                  size="sm"\n                  onClick={() => refetch()}\n                  disabled={isFetching}\n                  className="dashboard-button-secondary h-9 rounded-lg"\n                >\n                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />\n                  {isFetching ? t.refreshing : t.refresh}\n                </Button>\n                {canExportSensitive ? (\n                  <div className="flex items-center gap-2 rounded-lg border border-[var(--dash-warning)]/30 bg-[rgba(243,188,0,0.12)] px-2 py-1.5">\n                    <Switch\n                      checked={includeSensitiveExport}\n                      onCheckedChange={setIncludeSensitiveExport}\n                      aria-label={t.includeSensitiveFields}\n                    />\n                    <span className="text-xs text-[var(--dash-text)]">\n                      {includeSensitiveExport ? t.sensitiveFieldsIncluded : t.includeSensitiveFields}\n                    </span>\n                  </div>\n                ) : null}\n                <Button\n                  type="button"\n                  variant="outline"\n                  size="sm"\n                  onClick={exportSuppliers}\n                  className="dashboard-button-secondary h-9 rounded-lg"\n                >\n                  <Download className="h-4 w-4" />\n                  {t.export}\n                </Button>`
replacements.push([toolbarOld, toolbarNew])

for (const [from, to] of replacements) {
  if (!text.includes(from)) {
    console.error("Missing replacement block")
    console.error(from.slice(0, 120))
    process.exit(1)
  }
  text = text.replace(from, to)
}

fs.writeFileSync(path, text)
console.log("ok")

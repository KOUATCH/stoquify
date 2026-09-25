const fs = require('fs')
const path = require('path')
const edits = [
  ['components/pos/CashDrawerManagementDashboard.tsx', [
    ['import Link from "next/link"', 'import { Link } from "@/i18n/navigation"'],
    ['import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"', 'import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"\nimport { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"'],
    ['if (result.data?.success) {', 'if (!result.isError && result.data?.success) {'],
    ['  if (errorMessage && !dashboard) {\n    return <DashboardErrorState error="Cash drawer dashboard unavailable" reset={() => { void dashboardQuery.refetch() }} />\n  }', '  if (dashboardQuery.readState === "denied") {\n    return <DashboardRouteState kind="permission_denied" locale={locale === "fr" ? "fr" : "en"} primaryHref={`/${locale}/dashboard`} actions={<Button onClick={() => { void dashboardQuery.retryRead() }}>{t("actions.refresh")}</Button>} />\n  }\n\n  if (dashboardQuery.isError && !dashboard) {\n    return <DashboardErrorState error={t("notifications.refreshFailedMessage")} reset={() => { void dashboardQuery.retryRead() }} />\n  }'],
  ]],
  ['components/pos/TerminalManagementDashboard.tsx', [
    ['href="/dashboard/cashDrawer"', 'href="/dashboard/finance/cash-drawer"'],
  ]],
]
for (const [file, changes] of edits) {
  const absolute = path.resolve(file)
  const original = fs.readFileSync(absolute, 'utf8')
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  let content = original.replace(/\r\n/g, '\n')
  for (const [from, to] of changes) {
    if (content.split(from).length !== 2) throw new Error(`Expected exactly one match in ${file}`)
    content = content.replace(from, to)
  }
  if (fs.readFileSync(absolute, 'utf8') !== original) throw new Error(`Concurrent edit: ${file}`)
  const temp = absolute + '.pos-modernization.tmp'
  fs.writeFileSync(temp, content.replace(/\n/g, eol), { flag: 'wx' })
  fs.renameSync(temp, absolute)
  console.log(`Updated ${file}`)
}

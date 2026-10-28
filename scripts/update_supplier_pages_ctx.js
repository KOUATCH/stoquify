const fs = require("fs")

const files = [
  "app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx",
  "app/[locale]/(dashboard)/dashboard/purchases/suppliers/create/page.tsx",
  "app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx",
  "app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/edit/page.tsx",
]

for (const file of files) {
  let text = fs.readFileSync(file, "utf8")
  const old = `        <SupplierManagementDashboard\n          organizationId={ctx.orgId}\n          locale={locale}\n          basePath={basePath}\n`
  const replacement = `        <SupplierManagementDashboard\n          organizationId={ctx.orgId}\n          locale={locale}\n          basePath={basePath}\n          canExportSensitive={ctx.isSuperUser}\n`
  if (!text.includes(old)) {
    console.error(`Missing expected snippet in ${file}`)
    process.exit(1)
  }
  text = text.replace(old, replacement)
  fs.writeFileSync(file, text)
}

console.log("ok")

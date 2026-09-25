const fs = require("node:fs")
const hash = require("node:crypto")
const file = ".next-pos-enterprise-build-20260924/server/app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.js"
const source = fs.readFileSync(file, "utf8")
const markers = [
  "salesOrderId:null,purchaseOrder:{is:{locationId:",
  "purchaseOrder:{is:{locationId:",
  "payment.findMany",
  "payment.aggregate",
]
const report = {
  inspectedAt: new Date().toISOString(),
  file,
  sha256: hash.createHash("sha256").update(source).digest("hex"),
  method: "Read generated server code only; no code execution, request, or database access.",
  markers: markers.map((marker) => {
    const index = source.indexOf(marker)
    return { marker, found: index >= 0, excerpt: index < 0 ? null : source.slice(Math.max(0, index - 180), index + 400) }
  }),
}
console.log(JSON.stringify(report, null, 2))

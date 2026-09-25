const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
const messages = Object.fromEntries(["en", "fr"].map((locale) => [locale, JSON.parse(read(`messages/${locale}.json`))]))
const flatten = (value, prefix = "", result = {}) => {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, result)
  } else result[prefix] = value
  return result
}
const parameters = (value) => [...String(value).matchAll(/\{\s*([A-Za-z0-9_]+)(?:\s*[,}])/g)].map((match) => match[1]).sort().join(",")
const compare = (namespace, values) => {
  const en = flatten(values.en), fr = flatten(values.fr)
  return {
    namespace,
    enLeaves: Object.keys(en).length,
    frLeaves: Object.keys(fr).length,
    missingFr: Object.keys(en).filter((key) => !(key in fr)),
    missingEn: Object.keys(fr).filter((key) => !(key in en)),
    parameterMismatches: Object.keys(en).filter((key) => key in fr && parameters(en[key]) !== parameters(fr[key])),
  }
}
const checks = ["pos", "cashDrawerDashboard", "cashPaymentHistory"].map((namespace) => compare(namespace, { en: messages.en[namespace], fr: messages.fr[namespace] }))

// Parse the terminal component's static dictionaries; do not execute application code.
const file = "components/pos/TerminalManagementDashboard.tsx"
const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const staticObject = (node) => {
  if (ts.isAsExpression(node)) return staticObject(node.expression)
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) throw new Error("Unexpected nonstatic terminal copy property")
      return [property.name.getText(source).replace(/^['"]|['"]$/g, ""), staticObject(property.initializer)]
    }))
  }
  if (ts.isStringLiteralLike(node)) return node.text
  throw new Error("Unexpected nonstatic terminal copy value")
}
let terminalCopy
const visit = (node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "copy") terminalCopy = staticObject(node.initializer)
  ts.forEachChild(node, visit)
}
visit(source)
if (!terminalCopy?.en || !terminalCopy?.fr) throw new Error("Terminal en/fr dictionaries were not found")
checks.push(compare("TerminalManagementDashboard.copy", terminalCopy))
const failed = checks.some((check) => check.missingFr.length || check.missingEn.length || check.parameterMismatches.length)
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  command: "node what-next/pos-enterprise-modernization/2026-09-23/evidence/check-localization-parity.cjs",
  status: failed ? "failed" : "passed",
  method: "Static leaf-key parity and named interpolation-token parity; does not establish translation quality, ICU validity, or absence of hardcoded UI labels.",
  checks,
}, null, 2))
process.exitCode = failed ? 1 : 0

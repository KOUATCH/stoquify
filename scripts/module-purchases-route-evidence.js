const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const ts = require("typescript")

const directory = "app/[locale]/(dashboard)/dashboard/purchases"
const wrapperFile = `${directory}/purchases-route-access.tsx`
const catalogFile = `${directory}/purchases-route-data-access.ts`
// Reviewed wrapper: current RBAC, organization context and explicit module mode
// precede onAllowed. Changed wrapper implementations must be reviewed again.
const reviewedWrapperHash = "198d94a29295679470fb2292adc24f6dc632fc48a78dd594e2dc4102046cd94e"
const reviewedCatalogPlumbingHash = "c7d27d3dd244b837c1059d62310d76e55c24467c99a9c308a2275d9fb45a2b9f"
const literal = node => node && ts.isStringLiteral(node) ? node.text : null
const property = (node, name) => node && ts.isObjectLiteralExpression(node) ? node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === name)?.initializer : undefined
const variable = (statements, name) => statements.flatMap(s => ts.isVariableStatement(s) ? [...s.declarationList.declarations] : []).find(d => d.name.getText() === name)?.initializer

function purchasesRouteEvidence(root, file, source, route) {
  if (!file.startsWith(directory + "/")) return null
  let wrapper, catalogSource
  try { wrapper = fs.readFileSync(path.join(root, wrapperFile)); catalogSource = fs.readFileSync(path.join(root, catalogFile), "utf8") } catch { return null }
  if (crypto.createHash("sha256").update(wrapper).digest("hex") !== reviewedWrapperHash) return null
  const page = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const catalog = ts.createSourceFile(catalogFile, catalogSource, ts.ScriptTarget.Latest, true)
  const imports = new Map()
  for (const statement of page.statements) {
    if (!ts.isImportDeclaration(statement) || !literal(statement.moduleSpecifier)) continue
    const resolved = path.resolve(root, path.dirname(file), statement.moduleSpecifier.text) + ".tsx"
    if (resolved !== path.resolve(root, wrapperFile)) continue
    for (const item of statement.importClause?.namedBindings?.elements ?? []) imports.set(item.propertyName?.text ?? item.name.text, item.name.text)
  }
  const wrapperName = imports.get("withPurchasesSurfaceAccess"), keyName = imports.get("routeByKey")
  if (!wrapperName || !keyName) return null
  const entry = page.statements.find(s => ts.isFunctionDeclaration(s) && s.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword))
  if (!entry?.body) return null
  const returns = entry.body.statements.filter(ts.isReturnStatement)
  if (returns.length !== 1) return null
  let call = returns[0].expression
  if (call && ts.isAwaitExpression(call)) call = call.expression
  if (!call || !ts.isCallExpression(call) || call.expression.getText() !== wrapperName || call.arguments.length !== 1) return null
  const args = call.arguments[0]
  if (!ts.isObjectLiteralExpression(args) || args.properties.some(ts.isSpreadAssignment)) return null
  const surfaceProperty = args.properties.find(p => p.name?.getText() === "surface")
  const surfaceName = surfaceProperty && (ts.isShorthandPropertyAssignment(surfaceProperty) ? surfaceProperty.name.text : ts.isPropertyAssignment(surfaceProperty) && ts.isIdentifier(surfaceProperty.initializer) ? surfaceProperty.initializer.text : null)
  const lookup = surfaceName && variable(entry.body.statements, surfaceName)
  if (!lookup || !ts.isCallExpression(lookup) || lookup.expression.getText() !== keyName || lookup.arguments.length !== 1 || !literal(lookup.arguments[0])) return null
  let argumentMutation = false
  function visitArgument(node) {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return
    if (ts.isIdentifier(node) && node.text === surfaceName) argumentMutation = true
    ts.forEachChild(node, visitArgument)
  }
  args.properties.filter(p => p !== surfaceProperty).forEach(visitArgument)
  if (argumentMutation) return null
  const key = lookup.arguments[0].text, rows = variable(catalog.statements, "purchasesRouteCatalog")
  if (!rows || !ts.isArrayLiteralExpression(rows) || rows.elements.some(row => !ts.isObjectLiteralExpression(row) || row.properties.some(ts.isSpreadAssignment))) return null
  const plumbing = (catalogSource.slice(0, rows.getStart()) + "[]" + catalogSource.slice(rows.end)).replace(/\s+/g, "")
  if (crypto.createHash("sha256").update(plumbing).digest("hex") !== reviewedCatalogPlumbingHash) return null
  // The imported wrapper/lookup must not be shadowed, and the selected object
  // cannot be modified or aliased before its permission check.
  let shadowed = false
  function checkShadow(node) {
    if ((ts.isVariableDeclaration(node) || ts.isBindingElement(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node)) && node.name && [wrapperName, keyName].includes(node.name.getText())) shadowed = true
    ts.forEachChild(node, checkShadow)
  }
  entry.parameters.forEach(checkShadow); entry.body.statements.filter(s => s !== returns[0]).forEach(checkShadow)
  if (shadowed) return null
  for (const statement of entry.body.statements) {
    if (statement === returns[0]) continue
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(d => d.name.getText() === surfaceName && d.initializer === lookup)) {
      if (!(statement.declarationList.flags & ts.NodeFlags.Const) || statement.declarationList.declarations.length !== 1) return null
      continue
    }
    if (ts.isIfStatement(statement) && ts.isPrefixUnaryExpression(statement.expression) && statement.expression.operator === ts.SyntaxKind.ExclamationToken && statement.expression.operand.getText() === surfaceName && ts.isThrowStatement(statement.thenStatement) && !statement.elseStatement) continue
    let usesSurface = false
    function visit(node) { if (ts.isIdentifier(node) && node.text === surfaceName) usesSurface = true; ts.forEachChild(node, visit) }
    visit(statement); if (usesSurface) return null
  }
  // Bind the catalog key to the actual lookup plumbing; dynamic selectors are
  // intentionally left as unresolved evidence rather than assumed equivalent.
  const map = variable(catalog.statements, "purchasesRouteMap")?.getText().replace(/\s+/g, "")
  const getter = catalog.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "getPurchasesRouteSurface")
  if (map !== "Object.fromEntries(purchasesRouteCatalog.map((entry)=>[entry.key,entry]),)" || getter?.body?.getText().replace(/\s+/g, "") !== "{returnpurchasesRouteMap[key]}") return null
  const matches = rows.elements.filter(row => literal(property(row, "key")) === key)
  if (matches.length !== 1 || literal(property(matches[0], "route")) !== route) return null
  const row = matches[0], permissionNodes = property(row, "permissions")
  const plain = node => ts.isObjectLiteralExpression(node) && node.properties.every(p => ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name)) && new Set(node.properties.map(p => p.name.getText())).size === node.properties.length
  if (!plain(row) || args.properties.some(p => (!ts.isShorthandPropertyAssignment(p) && !ts.isPropertyAssignment(p)) || ts.isComputedPropertyName(p.name)) || new Set(args.properties.map(p => p.name?.getText())).size !== args.properties.length) return null
  if (!permissionNodes || !ts.isArrayLiteralExpression(permissionNodes) || !permissionNodes.elements.length || permissionNodes.elements.some(node => !literal(node))) return null
  const permissions = permissionNodes.elements.map(literal), permissionMode = literal(property(row, "permissionMode")) ?? "single"
  if (!["single", "all", "any"].includes(permissionMode)) return null
  const moduleRequirement = property(row, "module"), modules = property(row, "modules")
  // Multiple module gates need a richer inventory record; keep them visible.
  if (modules || !moduleRequirement || !plain(moduleRequirement)) return null
  const moduleSlug = literal(property(moduleRequirement, "moduleSlug")), mode = literal(property(moduleRequirement, "mode")) ?? "observe"
  if (!moduleSlug || !["observe", "enforce"].includes(mode) || literal(property(moduleRequirement, "surface")) !== route) return null
  return {
    permission: permissionMode === "single" ? permissions[0] : permissions.join(permissionMode === "all" ? " & " : " | "),
    guard: "withPurchasesSurfaceAccess", moduleSlug, observeOrEnforce: mode,
    metadata: { evidenceKind: "reviewed-wrapper-and-static-catalog", routeKey: key, permissionMode, permissions, wrapperFile, wrapperSha256: reviewedWrapperHash, catalogFile, catalogPlumbingSha256: reviewedCatalogPlumbingHash, runtimeCertification: false },
  }
}
module.exports = { purchasesRouteEvidence }

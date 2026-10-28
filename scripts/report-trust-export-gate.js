const fs = require("fs")
const path = require("path")
const ts = require("typescript")

const DEFAULT_JSON_OUT = "what-next/report-trust-export-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/report-trust-export-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }
  if (!["report", "fail"].includes(options.mode))
    throw new Error("Unsupported mode: " + options.mode)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function variableDeclaration(statement, name) {
  if (!ts.isVariableStatement(statement)) return null
  return (
    statement.declarationList.declarations.find(
      (declaration) =>
        ts.isIdentifier(declaration.name) && declaration.name.text === name,
    ) ?? null
  )
}

function unwrapAwait(expression) {
  return ts.isAwaitExpression(expression) ? expression.expression : expression
}

function namedCall(expression, name) {
  const candidate = expression ? unwrapAwait(expression) : null
  return candidate &&
    ts.isCallExpression(candidate) &&
    ts.isIdentifier(candidate.expression) &&
    candidate.expression.text === name
    ? candidate
    : null
}

function propertyName(property) {
  if (!property.name) return null
  return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
    ? property.name.text
    : null
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return null
  return (
    object.properties.find((property) => propertyName(property) === name) ??
    null
  )
}

function uniqueObjectProperty(object, name) {
  if (
    !object ||
    !ts.isObjectLiteralExpression(object) ||
    object.properties.some(ts.isSpreadAssignment)
  ) {
    return null
  }
  const matches = object.properties.filter(
    (property) => propertyName(property) === name,
  )
  return matches.length === 1 ? matches[0] : null
}

function constVariableDeclaration(sourceFile, name) {
  const statement = sourceFile.statements.find((candidate) =>
    Boolean(variableDeclaration(candidate, name)),
  )
  if (
    !statement ||
    !ts.isVariableStatement(statement) ||
    statement.declarationList.declarations.length !== 1 ||
    (statement.declarationList.flags & ts.NodeFlags.Const) === 0
  ) {
    return null
  }
  return variableDeclaration(statement, name)
}

function hasExactActionWrapper(sourceFile, actionName, bindingName) {
  const action = sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === actionName,
  )
  const statement =
    action?.body?.statements.length === 1 &&
    ts.isReturnStatement(action.body.statements[0])
      ? action.body.statements[0]
      : null
  const call = statement?.expression
    ? namedCall(statement.expression, bindingName)
    : null
  const modifiers = new Set(
    action?.modifiers?.map((modifier) => modifier.kind) ?? [],
  )
  return Boolean(
    action &&
    !action.asteriskToken &&
    modifiers.has(ts.SyntaxKind.ExportKeyword) &&
    modifiers.has(ts.SyntaxKind.AsyncKeyword) &&
    action.parameters.length === 1 &&
    ts.isIdentifier(action.parameters[0].name) &&
    action.parameters[0].name.text === "input" &&
    !action.parameters[0].initializer &&
    !action.parameters[0].dotDotDotToken &&
    call?.arguments.length === 1 &&
    compactNodeText(sourceFile, call.arguments[0]) === "input",
  )
}

function compactNodeText(sourceFile, node) {
  return node.getText(sourceFile).replace(/\s+/g, "")
}

function flattenLogicalOr(expression) {
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
  ) {
    return [
      ...flattenLogicalOr(expression.left),
      ...flattenLogicalOr(expression.right),
    ]
  }
  return [expression]
}

function hasVerifiedFreshAuthHelper(
  sourceFile,
  helperName = "verifiedFreshAuthTime",
) {
  const helper = sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === helperName,
  )
  if (
    !helper ||
    !ts.isFunctionDeclaration(helper) ||
    !helper.body ||
    !helper.type ||
    compactNodeText(sourceFile, helper.type) !== "Date"
  ) {
    return false
  }

  const statements = [...helper.body.statements]
  const freshAuthDeclarationIndex = statements.findIndex((statement) =>
    Boolean(variableDeclaration(statement, "freshAuth")),
  )
  const guardIndex = statements.findIndex(ts.isIfStatement)
  const resultIndex = statements.findIndex(ts.isReturnStatement)
  const freshAuthDeclaration =
    freshAuthDeclarationIndex >= 0
      ? variableDeclaration(statements[freshAuthDeclarationIndex], "freshAuth")
      : null
  const freshAuthStatement = statements[freshAuthDeclarationIndex]
  const freshAuthIsConst =
    freshAuthStatement &&
    ts.isVariableStatement(freshAuthStatement) &&
    freshAuthStatement.declarationList.declarations.length === 1 &&
    (freshAuthStatement.declarationList.flags & ts.NodeFlags.Const) !== 0
  const guard = guardIndex >= 0 ? statements[guardIndex] : null
  const result = resultIndex >= 0 ? statements[resultIndex] : null
  if (
    !freshAuthDeclaration?.initializer ||
    compactNodeText(sourceFile, freshAuthDeclaration.initializer) !==
      "ctx.freshAuth" ||
    !guard ||
    !ts.isIfStatement(guard) ||
    !result?.expression ||
    compactNodeText(sourceFile, result.expression) !== "freshAuth.lastAuthAt" ||
    !freshAuthIsConst ||
    statements.length !== 3 ||
    freshAuthDeclarationIndex !== 0 ||
    guardIndex !== 1 ||
    resultIndex !== 2
  ) {
    return false
  }

  const conditions = new Set(
    flattenLogicalOr(guard.expression).map((condition) =>
      compactNodeText(sourceFile, condition),
    ),
  )
  const requiredConditions = [
    "!freshAuth",
    "freshAuth.claims.userId!==ctx.userId",
    "freshAuth.claims.tenantId!==ctx.orgId",
    "freshAuth.claims.assuranceOrganizationId!==ctx.orgId",
    "!Number.isFinite(freshAuth.claims.assuranceLevel)",
    "freshAuth.claims.assuranceLevel<SESSION_ASSURANCE_LEVEL.PASSWORD",
    "freshAuth.claims.lastAuthAt!==freshAuth.lastAuthAt.getTime()",
  ]
  const guardStatement =
    ts.isBlock(guard.thenStatement) &&
    guard.thenStatement.statements.length === 1
      ? guard.thenStatement.statements[0]
      : null
  const guardThrowsFreshAuth =
    guardStatement &&
    ts.isThrowStatement(guardStatement) &&
    guardStatement.expression &&
    ts.isNewExpression(guardStatement.expression) &&
    ts.isIdentifier(guardStatement.expression.expression) &&
    guardStatement.expression.expression.text === "FreshAuthRequiredError"

  return (
    conditions.size === requiredConditions.length &&
    requiredConditions.every((condition) => conditions.has(condition)) &&
    guardThrowsFreshAuth
  )
}

function hasVerifiedAccountantTrustPackFreshAuthEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "data-trust.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const declaration = sourceFile.statements
      .map((statement) => variableDeclaration(statement, "exportTrustPack"))
      .find(Boolean)
    const protectedCall = declaration?.initializer
      ? namedCall(declaration.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !options ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body)
    ) {
      return false
    }

    const freshAuth = objectProperty(options, "freshAuth")
    const maxAge =
      freshAuth && ts.isPropertyAssignment(freshAuth)
        ? objectProperty(freshAuth.initializer, "maxAgeSeconds")
        : null
    if (
      !maxAge ||
      !ts.isPropertyAssignment(maxAge) ||
      !ts.isNumericLiteral(maxAge.initializer) ||
      maxAge.initializer.text !== "300"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const authIndex = statements.findIndex((statement) => {
      const authDeclaration = variableDeclaration(statement, "lastAuthAt")
      const authCall = authDeclaration?.initializer
        ? namedCall(authDeclaration.initializer, "verifiedFreshAuthTime")
        : null
      return (
        authCall?.arguments.length === 1 &&
        compactNodeText(sourceFile, authCall.arguments[0]) === "ctx"
      )
    })
    const accessIndex = statements.findIndex((statement) => {
      const accessDeclaration = variableDeclaration(statement, "access")
      const accessCall = accessDeclaration?.initializer
        ? namedCall(
            accessDeclaration.initializer,
            "resolveAccountantClientAccess",
          )
        : null
      const capability = accessCall
        ? objectProperty(accessCall.arguments[0], "capability")
        : null
      return (
        capability &&
        ts.isPropertyAssignment(capability) &&
        ts.isStringLiteral(capability.initializer) &&
        capability.initializer.text === "EXPORT"
      )
    })
    const exportIndex = statements.findIndex(
      (statement) =>
        ts.isReturnStatement(statement) &&
        namedCall(statement.expression, "exportAccountantTrustPack"),
    )
    if (
      authIndex < 0 ||
      accessIndex < 0 ||
      exportIndex < 0 ||
      !(authIndex < accessIndex && accessIndex < exportIndex)
    ) {
      return false
    }

    const exportStatement = statements[exportIndex]
    const exportCall = ts.isReturnStatement(exportStatement)
      ? namedCall(exportStatement.expression, "exportAccountantTrustPack")
      : null
    const exportInput = exportCall?.arguments[0]
    const lastAuthAt = objectProperty(exportInput, "lastAuthAt")
    const passesVerifiedTimestamp =
      lastAuthAt &&
      (ts.isShorthandPropertyAssignment(lastAuthAt) ||
        (ts.isPropertyAssignment(lastAuthAt) &&
          ts.isIdentifier(lastAuthAt.initializer) &&
          lastAuthAt.initializer.text === "lastAuthAt"))
    if (!passesVerifiedTimestamp || !exportInput) return false

    const allowedExportProperties = new Set([
      "organizationId",
      "exportedById",
      "actorPermissions",
      "lastAuthAt",
      "periodId",
      "startDate",
      "endDate",
      "fileType",
      "includeLedgerRows",
    ])
    let leaksClaims = exportInput.properties.some(
      (property) =>
        ts.isSpreadAssignment(property) ||
        !allowedExportProperties.has(propertyName(property)),
    )
    const visit = (node) => {
      if (
        ts.isSpreadAssignment(node) ||
        (ts.isIdentifier(node) &&
          ["freshAuth", "claims"].includes(node.text)) ||
        (ts.isPropertyAccessExpression(node) &&
          ["freshAuth", "claims"].includes(node.name.text)) ||
        (ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression) &&
          ["freshAuth", "claims"].includes(node.argumentExpression.text))
      ) {
        leaksClaims = true
      }
      ts.forEachChild(node, visit)
    }
    visit(exportInput)

    return !leaksClaims && hasVerifiedFreshAuthHelper(sourceFile)
  } catch {
    return false
  }
}

function hasVerifiedCertifiedClosePackFreshAuthEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const declarationStatement = sourceFile.statements.find((statement) =>
      Boolean(variableDeclaration(statement, "exportCertifiedPack")),
    )
    const declaration = declarationStatement
      ? variableDeclaration(declarationStatement, "exportCertifiedPack")
      : null
    const declarationIsConst =
      declarationStatement &&
      ts.isVariableStatement(declarationStatement) &&
      declarationStatement.declarationList.declarations.length === 1 &&
      (declarationStatement.declarationList.flags & ts.NodeFlags.Const) !== 0
    const protectedCall = declaration?.initializer
      ? namedCall(declaration.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !declarationIsConst ||
      !options ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body)
    ) {
      return false
    }

    const action = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "exportCertifiedClosePackAction",
    )
    const actionReturn =
      action?.body?.statements.length === 1 &&
      ts.isReturnStatement(action.body.statements[0])
        ? action.body.statements[0]
        : null
    const actionCall = actionReturn?.expression
      ? namedCall(actionReturn.expression, "exportCertifiedPack")
      : null
    const modifiers = new Set(
      action?.modifiers?.map((modifier) => modifier.kind) ?? [],
    )
    if (
      !action ||
      !modifiers.has(ts.SyntaxKind.ExportKeyword) ||
      !modifiers.has(ts.SyntaxKind.AsyncKeyword) ||
      action.parameters.length !== 1 ||
      !ts.isIdentifier(action.parameters[0].name) ||
      action.parameters[0].name.text !== "input" ||
      actionCall?.arguments.length !== 1 ||
      compactNodeText(sourceFile, actionCall.arguments[0]) !== "input"
    ) {
      return false
    }

    const permission = objectProperty(options, "permission")
    const freshAuth = objectProperty(options, "freshAuth")
    const maxAge =
      freshAuth && ts.isPropertyAssignment(freshAuth)
        ? objectProperty(freshAuth.initializer, "maxAgeSeconds")
        : null
    if (
      !permission ||
      !ts.isPropertyAssignment(permission) ||
      !ts.isStringLiteral(permission.initializer) ||
      permission.initializer.text !== "accounting.close.certify" ||
      !maxAge ||
      !ts.isPropertyAssignment(maxAge) ||
      !ts.isNumericLiteral(maxAge.initializer) ||
      maxAge.initializer.text !== "300"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const declarationCallIndex = (name, callText) =>
      statements.findIndex((statement) => {
        const found = variableDeclaration(statement, name)
        return (
          found?.initializer &&
          compactNodeText(sourceFile, found.initializer) === callText
        )
      })
    const authIndex = declarationCallIndex(
      "lastAuthAt",
      "verifiedCloseFreshAuthTime(ctx)",
    )
    const parseIndex = declarationCallIndex(
      "parsed",
      "exportClosePackInputSchema.parse(input)",
    )
    const exportIndex = statements.findIndex((statement) => {
      const result = variableDeclaration(statement, "result")
      return Boolean(
        result?.initializer && namedCall(result.initializer, "exportClosePack"),
      )
    })
    const authStatement = statements[authIndex]
    const authIsConst =
      authStatement &&
      ts.isVariableStatement(authStatement) &&
      (authStatement.declarationList.flags & ts.NodeFlags.Const) !== 0
    if (
      authIndex < 0 ||
      authIndex !== 0 ||
      parseIndex < 0 ||
      exportIndex < 0 ||
      !authIsConst ||
      authIndex + 1 !== parseIndex ||
      parseIndex + 1 !== exportIndex
    ) {
      return false
    }

    const result = variableDeclaration(statements[exportIndex], "result")
    const exportCall = result?.initializer
      ? namedCall(result.initializer, "exportClosePack")
      : null
    const packInput = exportCall?.arguments[1]
    const controlInput = exportCall?.arguments[2]
    if (
      !exportCall ||
      exportCall.arguments.length !== 3 ||
      compactNodeText(sourceFile, exportCall.arguments[0]) !== "ctx.orgId" ||
      !packInput ||
      !ts.isObjectLiteralExpression(packInput) ||
      !controlInput ||
      !ts.isObjectLiteralExpression(controlInput)
    ) {
      return false
    }

    const parsedSpread = packInput.properties.find(ts.isSpreadAssignment)
    const mode = objectProperty(packInput, "mode")
    if (
      packInput.properties.length !== 2 ||
      !parsedSpread ||
      compactNodeText(sourceFile, parsedSpread.expression) !== "parsed" ||
      !mode ||
      !ts.isPropertyAssignment(mode) ||
      !ts.isStringLiteral(mode.initializer) ||
      mode.initializer.text !== "CERTIFIED"
    ) {
      return false
    }

    const actorId = objectProperty(controlInput, "actorId")
    const actorPermissions = objectProperty(controlInput, "actorPermissions")
    const lastAuthAt = objectProperty(controlInput, "lastAuthAt")
    const names = controlInput.properties.map(propertyName)
    const exactTimestamp =
      lastAuthAt &&
      (ts.isShorthandPropertyAssignment(lastAuthAt) ||
        (ts.isPropertyAssignment(lastAuthAt) &&
          ts.isIdentifier(lastAuthAt.initializer) &&
          lastAuthAt.initializer.text === "lastAuthAt"))

    return Boolean(
      controlInput.properties.length === 3 &&
      names.includes("actorId") &&
      names.includes("actorPermissions") &&
      names.includes("lastAuthAt") &&
      actorId &&
      ts.isPropertyAssignment(actorId) &&
      compactNodeText(sourceFile, actorId.initializer) === "ctx.userId" &&
      actorPermissions &&
      ts.isPropertyAssignment(actorPermissions) &&
      compactNodeText(sourceFile, actorPermissions.initializer) ===
        "ctx.permissions" &&
      exactTimestamp &&
      hasVerifiedFreshAuthHelper(sourceFile, "verifiedCloseFreshAuthTime"),
    )
  } catch {
    return false
  }
}

function hasVerifiedCloseWaiverActionFreshAuthEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const declaration = constVariableDeclaration(sourceFile, "approveWaiver")
    const protectedCall = declaration?.initializer
      ? namedCall(declaration.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !protectedCall ||
      protectedCall.arguments.length !== 2 ||
      !options ||
      !ts.isObjectLiteralExpression(options) ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body) ||
      !hasExactActionWrapper(
        sourceFile,
        "approveCloseWaiverAction",
        "approveWaiver",
      )
    ) {
      return false
    }

    const permission = uniqueObjectProperty(options, "permission")
    const freshAuth = uniqueObjectProperty(options, "freshAuth")
    const maxAge =
      freshAuth &&
      ts.isPropertyAssignment(freshAuth) &&
      ts.isObjectLiteralExpression(freshAuth.initializer)
        ? uniqueObjectProperty(freshAuth.initializer, "maxAgeSeconds")
        : null
    if (
      !permission ||
      !ts.isPropertyAssignment(permission) ||
      !ts.isStringLiteral(permission.initializer) ||
      permission.initializer.text !== "accounting.close.waiver.approve" ||
      !maxAge ||
      !ts.isPropertyAssignment(maxAge) ||
      !ts.isNumericLiteral(maxAge.initializer) ||
      maxAge.initializer.text !== "300"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const exactConst = (index, name, initializerText) => {
      const statement = statements[index]
      const found = variableDeclaration(statement, name)
      return Boolean(
        statement &&
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.length === 1 &&
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
        found?.initializer &&
        compactNodeText(sourceFile, found.initializer) === initializerText,
      )
    }
    if (
      statements.length !== 5 ||
      !exactConst(0, "lastAuthAt", "verifiedCloseFreshAuthTime(ctx)") ||
      !exactConst(1, "parsed", "approveCloseWaiverInputSchema.parse(input)")
    ) {
      return false
    }

    const resultStatement = statements[2]
    const resultDeclaration = variableDeclaration(resultStatement, "result")
    const serviceCall = resultDeclaration?.initializer
      ? namedCall(resultDeclaration.initializer, "approveCloseWaiver")
      : null
    const resultIsConst =
      ts.isVariableStatement(resultStatement) &&
      resultStatement.declarationList.declarations.length === 1 &&
      (resultStatement.declarationList.flags & ts.NodeFlags.Const) !== 0
    const revalidate = statements[3]
    const resultReturn = statements[4]
    if (
      !resultIsConst ||
      !serviceCall ||
      serviceCall.arguments.length !== 3 ||
      !ts.isExpressionStatement(revalidate) ||
      compactNodeText(sourceFile, revalidate.expression) !==
        "revalidateClosePaths()" ||
      !ts.isReturnStatement(resultReturn) ||
      !resultReturn.expression ||
      compactNodeText(sourceFile, resultReturn.expression) !== "result"
    ) {
      return false
    }

    const control = serviceCall.arguments[2]
    if (
      compactNodeText(sourceFile, serviceCall.arguments[0]) !== "ctx.orgId" ||
      compactNodeText(sourceFile, serviceCall.arguments[1]) !== "parsed" ||
      !ts.isObjectLiteralExpression(control) ||
      control.properties.length !== 3
    ) {
      return false
    }
    const actorId = uniqueObjectProperty(control, "actorId")
    const actorPermissions = uniqueObjectProperty(control, "actorPermissions")
    const freshEvidenceProperty = uniqueObjectProperty(control, "freshAuth")
    const freshEvidence =
      freshEvidenceProperty &&
      ts.isPropertyAssignment(freshEvidenceProperty) &&
      ts.isObjectLiteralExpression(freshEvidenceProperty.initializer)
        ? freshEvidenceProperty.initializer
        : null
    const evidenceActorId = freshEvidence
      ? uniqueObjectProperty(freshEvidence, "actorId")
      : null
    const evidenceOrganizationId = freshEvidence
      ? uniqueObjectProperty(freshEvidence, "organizationId")
      : null
    const lastAuthAt = freshEvidence
      ? uniqueObjectProperty(freshEvidence, "lastAuthAt")
      : null
    return Boolean(
      actorId &&
      ts.isPropertyAssignment(actorId) &&
      compactNodeText(sourceFile, actorId.initializer) === "ctx.userId" &&
      actorPermissions &&
      ts.isPropertyAssignment(actorPermissions) &&
      compactNodeText(sourceFile, actorPermissions.initializer) ===
        "ctx.permissions" &&
      freshEvidence?.properties.length === 3 &&
      evidenceActorId &&
      ts.isPropertyAssignment(evidenceActorId) &&
      compactNodeText(sourceFile, evidenceActorId.initializer) ===
        "ctx.userId" &&
      evidenceOrganizationId &&
      ts.isPropertyAssignment(evidenceOrganizationId) &&
      compactNodeText(sourceFile, evidenceOrganizationId.initializer) ===
        "ctx.orgId" &&
      lastAuthAt &&
      ts.isShorthandPropertyAssignment(lastAuthAt) &&
      hasVerifiedFreshAuthHelper(sourceFile, "verifiedCloseFreshAuthTime"),
    )
  } catch {
    return false
  }
}

function hasServiceOwnedCloseWaiverFreshAuthPolicy(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const maxAge = constVariableDeclaration(
      sourceFile,
      "CLOSE_WAIVER_FRESH_AUTH_MAX_AGE_MS",
    )
    if (
      !maxAge?.initializer ||
      compactNodeText(sourceFile, maxAge.initializer) !== "5*60*1000"
    ) {
      return false
    }

    const helper = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "requireFreshWaiverControl",
    )
    if (!helper?.body || helper.body.statements.length !== 7) return false
    const helperStatements = [...helper.body.statements]
    const exactConst = (index, name, initializerText) => {
      const statement = helperStatements[index]
      const found = variableDeclaration(statement, name)
      return Boolean(
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.length === 1 &&
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
        found?.initializer &&
        compactNodeText(sourceFile, found.initializer) === initializerText,
      )
    }
    const normalizedAuth =
      "rawLastAuthAtinstanceofDate?rawLastAuthAt.getTime():" +
      "rawLastAuthAt===null||rawLastAuthAt===undefined?" +
      "Number.NaN:newDate(rawLastAuthAt).getTime()"
    if (
      !exactConst(0, "actorId", "control.actorId") ||
      !exactConst(1, "freshAuth", "control.freshAuth") ||
      !exactConst(2, "rawLastAuthAt", "freshAuth?.lastAuthAt") ||
      !exactConst(3, "lastAuthAt", normalizedAuth) ||
      !exactConst(4, "nowTime", "now.getTime()")
    ) {
      return false
    }

    const guard = helperStatements[5]
    if (!ts.isIfStatement(guard) || !ts.isBlock(guard.thenStatement)) {
      return false
    }
    const conditions = new Set(
      flattenLogicalOr(guard.expression).map((condition) =>
        compactNodeText(sourceFile, condition),
      ),
    )
    const requiredConditions = [
      "!actorId",
      "!freshAuth",
      "freshAuth.actorId!==actorId",
      "freshAuth.organizationId!==organizationId",
      "!Number.isFinite(nowTime)",
      "!Number.isFinite(lastAuthAt)",
      "lastAuthAt<=0",
      "lastAuthAt>nowTime",
      "nowTime-lastAuthAt>CLOSE_WAIVER_FRESH_AUTH_MAX_AGE_MS",
    ]
    const thrown = guard.thenStatement.statements
    const throwStatement = thrown.length === 1 ? thrown[0] : null
    const error =
      throwStatement &&
      ts.isThrowStatement(throwStatement) &&
      throwStatement.expression &&
      ts.isNewExpression(throwStatement.expression)
        ? throwStatement.expression
        : null
    const actorReturn = helperStatements[6]
    if (
      conditions.size !== requiredConditions.length ||
      !requiredConditions.every((condition) => conditions.has(condition)) ||
      !error ||
      !ts.isIdentifier(error.expression) ||
      error.expression.text !== "BusinessRuleError" ||
      error.arguments?.length !== 2 ||
      !ts.isStringLiteral(error.arguments[1]) ||
      error.arguments[1].text !== "FRESH_AUTH_REQUIRED" ||
      !ts.isReturnStatement(actorReturn) ||
      !actorReturn.expression ||
      compactNodeText(sourceFile, actorReturn.expression) !== "actorId"
    ) {
      return false
    }

    const service = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "approveCloseWaiver",
    )
    if (
      !service?.body ||
      service.body.statements.length !== 4 ||
      !service.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ||
      !service.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
      )
    ) {
      return false
    }
    const statements = [...service.body.statements]
    const nowDeclaration = variableDeclaration(statements[0], "now")
    const actorDeclaration = variableDeclaration(statements[1], "actorId")
    const correlation = variableDeclaration(statements[2], "correlationId")
    const result = statements[3]
    const transaction =
      ts.isReturnStatement(result) &&
      result.expression &&
      ts.isCallExpression(result.expression) &&
      ts.isPropertyAccessExpression(result.expression.expression) &&
      compactNodeText(sourceFile, result.expression.expression) ===
        "db.$transaction"
    if (
      !nowDeclaration?.initializer ||
      compactNodeText(sourceFile, nowDeclaration.initializer) !== "newDate()" ||
      !actorDeclaration?.initializer ||
      compactNodeText(sourceFile, actorDeclaration.initializer) !==
        "requireFreshWaiverControl(organizationId,control,now)" ||
      !correlation?.initializer ||
      compactNodeText(sourceFile, correlation.initializer) !==
        "input.correlationId??randomUUID()" ||
      !transaction
    ) {
      return false
    }

    let approvalTimeProperties = 0
    let exactApprovalTime = false
    let approvalActorProperties = 0
    let exactApprovalActor = false
    let nowReferences = 0
    const visit = (node) => {
      if (
        ts.isIdentifier(node) &&
        node.text === "now" &&
        !(
          ts.isPropertyAccessExpression(node.parent) &&
          node.parent.name === node
        )
      ) {
        nowReferences += 1
      }
      if (
        ts.isPropertyAssignment(node) &&
        propertyName(node) === "waiverApprovedAt"
      ) {
        approvalTimeProperties += 1
        exactApprovalTime =
          compactNodeText(sourceFile, node.initializer) === "now"
      }
      if (
        ts.isPropertyAssignment(node) &&
        propertyName(node) === "waiverApprovedById"
      ) {
        approvalActorProperties += 1
        exactApprovalActor =
          compactNodeText(sourceFile, node.initializer) === "actorId"
      }
      ts.forEachChild(node, visit)
    }
    visit(service.body)
    return (
      approvalTimeProperties === 1 &&
      exactApprovalTime &&
      approvalActorProperties === 1 &&
      exactApprovalActor &&
      nowReferences === 3
    )
  } catch {
    return false
  }
}

function hasServiceOwnedVerifiedCloseWaiverFreshAuthEvidence(
  actionSource,
  serviceSource,
) {
  return (
    hasVerifiedCloseWaiverActionFreshAuthEvidence(actionSource) &&
    hasServiceOwnedCloseWaiverFreshAuthPolicy(serviceSource)
  )
}

function hasHonestAccountantAccessTemporalSemantics(
  serviceSource,
  managerSource,
) {
  try {
    const sourceFile = ts.createSourceFile(
      "accountant-access.service.ts",
      serviceSource,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const declaration = (name) =>
      sourceFile.statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) && statement.name?.text === name,
      )
    const effectiveStatus = declaration("effectiveStatus")
    const grant = declaration("grantAccountantAccess")
    const revoke = declaration("revokeAccountantAccess")
    if (!effectiveStatus?.body || !grant?.body || !revoke?.body) return false

    const statusText = compactNodeText(sourceFile, effectiveStatus.body)
    const validRevokedIndex = statusText.indexOf(
      "grant.status===AccountantAccessStatus.REVOKED&&(grant.revokedAt===null||grant.revokedAt<grant.expiresAt)",
    )
    const expiredIndex = statusText.indexOf(
      'grant.expiresAt<=now)return"EXPIRED"',
    )
    const legacyRevokedIndex = statusText.indexOf(
      'grant.status===AccountantAccessStatus.REVOKED)return"REVOKED"',
      validRevokedIndex + 1,
    )
    const scheduledIndex = statusText.indexOf(
      'grant.effectiveFrom>now)return"SCHEDULED"',
    )
    const activeIndex = statusText.indexOf('return"ACTIVE"')
    if (
      !serviceSource.includes(
        'status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED"',
      ) ||
      validRevokedIndex < 0 ||
      legacyRevokedIndex < 0 ||
      !(
        validRevokedIndex < expiredIndex &&
        expiredIndex < legacyRevokedIndex &&
        legacyRevokedIndex < scheduledIndex &&
        scheduledIndex < activeIndex
      )
    ) {
      return false
    }

    const grantText = compactNodeText(sourceFile, grant.body)
    const staleIndex = grantText.indexOf(
      "if(input.expiresAt<=now){thrownewBusinessRuleError(",
    )
    const rangeIndex = grantText.indexOf(
      "if(input.expiresAt<=effectiveFrom){thrownewBusinessRuleError(",
    )
    const userIndex = grantText.indexOf(
      "constaccountant=awaitdb.user.findUnique(",
    )
    if (
      staleIndex < 0 ||
      !(staleIndex < rangeIndex && rangeIndex < userIndex)
    ) {
      return false
    }

    const revokeText = compactNodeText(sourceFile, revoke.body)
    const expiredRevokeIndex = revokeText.indexOf(
      "if(existing.expiresAt<=now){",
    )
    const retireExpiredIndex = revokeText.indexOf(
      "awaitretireExpiredAccountantAccessGrantInTx(",
      expiredRevokeIndex,
    )
    const preserveExpiredIndex = revokeText.indexOf(
      "returntoDto(existing,now)",
      retireExpiredIndex,
    )
    const transitionIndex = revokeText.indexOf(
      "accountantAccessGrant.updateMany({",
    )
    const lostRaceIndex = revokeText.indexOf(
      "if(transition.count===0){",
      transitionIndex,
    )
    const eventIndex = revokeText.indexOf(
      'eventType:"ACCOUNTANT_ACCESS_REVOKED"',
      lostRaceIndex,
    )
    const transitionHasExpectedScopeKey =
      revokeText.includes(
        "activeScopeKey:`${organizationId}:${existing.accountantUserId}`",
      ) ||
      revokeText.includes(
        'activeScopeKey:organizationId+":"+existing.accountantUserId',
      )
    const transitionIsTenantScoped =
      revokeText.includes(
        "id:existing.id,organizationId,status:AccountantAccessStatus.ACTIVE",
      ) &&
      transitionHasExpectedScopeKey &&
      revokeText.includes("expiresAt:{gt:now}")
    if (
      expiredRevokeIndex < 0 ||
      retireExpiredIndex < 0 ||
      preserveExpiredIndex < 0 ||
      transitionIndex < 0 ||
      lostRaceIndex < 0 ||
      eventIndex < 0 ||
      !transitionIsTenantScoped ||
      !(
        expiredRevokeIndex < retireExpiredIndex &&
        retireExpiredIndex < preserveExpiredIndex &&
        preserveExpiredIndex < transitionIndex &&
        transitionIndex < lostRaceIndex &&
        lostRaceIndex < eventIndex
      )
    ) {
      return false
    }

    const managerFile = ts.createSourceFile(
      "AccountantAccessManager.tsx",
      managerSource,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const managerText = compactNodeText(managerFile, managerFile)
    return (
      managerText.includes("parsed.toISOString()") &&
      managerText.includes(
        'toAbsoluteIsoDateTime(formData.get("effectiveFrom"))',
      ) &&
      managerText.includes(
        'toAbsoluteIsoDateTime(formData.get("expiresAt"))',
      ) &&
      managerText.includes('["ACTIVE","SCHEDULED"].includes(grant.status)') &&
      managerText.includes('result.data.status==="EXPIRED"') &&
      managerText.includes('"Accountantaccesshadalreadyexpired."') &&
      managerText.includes(
        "<timedateTime={grant.expiresAt}title={grant.expiresAt}>",
      )
    )
  } catch {
    return false
  }
}
function findFirstDescendant(node, predicate) {
  let result = null
  const visit = (candidate) => {
    if (result) return
    if (predicate(candidate)) {
      result = candidate
      return
    }
    ts.forEachChild(candidate, visit)
  }
  visit(node)
  return result
}

function callPath(expression) {
  if (ts.isIdentifier(expression)) return [expression.text]
  if (ts.isPropertyAccessExpression(expression)) {
    return [...callPath(expression.expression), expression.name.text]
  }
  return []
}

function propertyInitializer(object, name) {
  const property = objectProperty(object, name)
  return property && ts.isPropertyAssignment(property)
    ? property.initializer
    : null
}

function statementThrowsNamedError(statement, errorName) {
  return Boolean(
    findFirstDescendant(
      statement,
      (node) =>
        ts.isThrowStatement(node) &&
        node.expression &&
        ts.isNewExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === errorName,
    ),
  )
}
function hasProtectedMissingProofActionEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const binding = constVariableDeclaration(
      sourceFile,
      "requestMissingEvidence",
    )
    const protectedCall = binding?.initializer
      ? namedCall(binding.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !protectedCall ||
      protectedCall.arguments.length !== 2 ||
      !options ||
      !ts.isObjectLiteralExpression(options) ||
      options.properties.length !== 3 ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body) ||
      !hasExactActionWrapper(
        sourceFile,
        "requestMissingCloseEvidenceAction",
        "requestMissingEvidence",
      )
    ) {
      return false
    }
    const optionText = (name) => {
      const property = uniqueObjectProperty(options, name)
      return property && ts.isPropertyAssignment(property)
        ? compactNodeText(sourceFile, property.initializer)
        : ""
    }
    if (
      optionText("permission") !== '"accounting.close.evidence.request"' ||
      optionText("auditResource") !== '"AccountantComment"' ||
      optionText("auditAllowed") !== "true"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const parsed = variableDeclaration(statements[0], "parsed")
    const result = variableDeclaration(statements[1], "result")
    const serviceCall = result?.initializer
      ? namedCall(result.initializer, "requestMissingCloseEvidence")
      : null
    const revalidate = statements[2]
    const resultReturn = statements[3]
    const control = serviceCall?.arguments[2]
    const actorId = uniqueObjectProperty(control, "actorId")
    const actorPermissions = uniqueObjectProperty(control, "actorPermissions")
    return Boolean(
      statements.length === 4 &&
      parsed?.initializer &&
      compactNodeText(sourceFile, parsed.initializer) ===
        "requestMissingCloseEvidenceInputSchema.parse(input)" &&
      serviceCall &&
      serviceCall.arguments.length === 3 &&
      compactNodeText(sourceFile, serviceCall.arguments[0]) === "ctx.orgId" &&
      compactNodeText(sourceFile, serviceCall.arguments[1]) === "parsed" &&
      ts.isObjectLiteralExpression(control) &&
      control.properties.length === 2 &&
      actorId &&
      ts.isPropertyAssignment(actorId) &&
      compactNodeText(sourceFile, actorId.initializer) === "ctx.userId" &&
      actorPermissions &&
      ts.isPropertyAssignment(actorPermissions) &&
      compactNodeText(sourceFile, actorPermissions.initializer) ===
        "ctx.permissions" &&
      ts.isExpressionStatement(revalidate) &&
      compactNodeText(sourceFile, revalidate.expression) ===
        "revalidateClosePaths(result.periodId)" &&
      ts.isReturnStatement(resultReturn) &&
      resultReturn.expression &&
      compactNodeText(sourceFile, resultReturn.expression) === "result",
    )
  } catch {
    return false
  }
}

function hasServiceOwnedMissingProofRequestEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const service = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "requestMissingCloseEvidence",
    )
    const helper = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "runMissingCloseEvidenceTransaction",
    )
    const modifiers = new Set(
      service?.modifiers?.map((modifier) => modifier.kind) ?? [],
    )
    if (
      !service?.body ||
      service.body.statements.length !== 7 ||
      !modifiers.has(ts.SyntaxKind.ExportKeyword) ||
      !modifiers.has(ts.SyntaxKind.AsyncKeyword) ||
      !helper?.body
    ) {
      return false
    }

    const transactionReturn = service.body.statements[6]
    const transactionCall =
      ts.isReturnStatement(transactionReturn) && transactionReturn.expression
        ? namedCall(
            transactionReturn.expression,
            "runMissingCloseEvidenceTransaction",
          )
        : null
    const operation = transactionCall?.arguments[0]
    if (
      !transactionCall ||
      transactionCall.arguments.length !== 1 ||
      !(ts.isArrowFunction(operation) || ts.isFunctionExpression(operation)) ||
      !ts.isBlock(operation.body)
    ) {
      return false
    }

    const serviceText = compactNodeText(sourceFile, service.body)
    const helperText = compactNodeText(sourceFile, helper.body)
    const operationText = compactNodeText(sourceFile, operation.body)
    const preflightMarkers = [
      "constactorId=control.actorId?.trim()",
      "if(!actorId){thrownewBusinessRuleError(",
      "constnow=newDate()",
      "constdueAt=newDate(input.dueAt.getTime())",
      "!Number.isFinite(dueAt.getTime())||dueAt.getTime()<=now.getTime()",
      "constcorrelationId=input.correlationId??randomUUID()",
    ]
    const operationMarkers = [
      'resolveAccountantClientAccess({homeOrganizationId,clientOrganizationId:input.clientOrganizationId,accountantUserId:actorId,capability:"REVIEW",now,client:tx',
      "constorganizationId=access.organizationId",
      "where:{organizationId,findingId:input.findingId,correlationId,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY",
      "returnassertMatchingMissingCloseEvidenceReplay(",
      "where:{id:input.findingId,organizationId}",
      "checklistItem:{select:{status:true,evidenceCount:true",
      "evidenceItems:{where:{available:false}",
      "finding.status===CloseFindingStatus.RESOLVED||finding.status===CloseFindingStatus.WAIVED_WITH_APPROVAL",
      "consthasMissingEvidence=finding.evidenceItems.length>0||finding.checklistItem?.status===CloseChecklistStatus.UNAVAILABLE||finding.checklistItem?.evidenceCount===0",
      "where:{id:input.requestedFromId,organizationId,isActive:true",
      "ownerId:recipient.id,assignedById:actorId,assignedAt:now,dueAt,status:CloseFindingStatus.ASSIGNED,correlationId",
      "tx.accountantComment.create({data:{organizationId,periodId:finding.periodId,closeRunId:finding.closeRunId,findingId:finding.id,authorId:actorId,body:input.requestText,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY",
      "requestType:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE",
      'auditCloseWorkflow(tx,{organizationId,actorId,action:"CLOSE_MISSING_EVIDENCE_REQUESTED",resourceType:"AccountantComment"',
      'recordCloseWorkflowEventInTx(tx,{organizationId,actorId,eventType:"close.assurance.missing_evidence.requested"',
      "ownerId:recipient.id,dueAt,",
    ]
    return (
      preflightMarkers.every((marker) => serviceText.includes(marker)) &&
      operationMarkers.every((marker) => operationText.includes(marker)) &&
      !serviceText.includes("input.organizationId") &&
      !serviceText.includes("control.organizationId") &&
      !serviceText.includes("control.now") &&
      !serviceText.includes("input.actorId") &&
      helperText.includes("for(letattempt=0;attempt<3;attempt+=1)") &&
      helperText.includes(
        "db.$transaction(operation,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
      ) &&
      helperText.includes('code!=="P2034"&&code!=="P2002"')
    )
  } catch {
    return false
  }
}

function hasDelegatedMissingProofReviewEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "accountant-access.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const capability = sourceFile.statements.find(
      (statement) =>
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === "AccessCapability",
    )
    const values =
      capability && ts.isUnionTypeNode(capability.type)
        ? new Set(
            capability.type.types
              .filter(ts.isLiteralTypeNode)
              .map((type) =>
                ts.isStringLiteral(type.literal) ? type.literal.text : "",
              ),
          )
        : new Set()
    const resolver = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "resolveAccountantClientAccess",
    )
    const reviewGuard = resolver?.body?.statements.find((statement) => {
      if (!ts.isIfStatement(statement)) return false
      const condition = compactNodeText(sourceFile, statement.expression)
      return (
        condition.includes('input.capability==="REVIEW"') &&
        condition.includes("grant.role===AccountantAccessRole.READ_ONLY")
      )
    })
    return (
      values.has("READ") &&
      values.has("EXPORT") &&
      values.has("REVIEW") &&
      Boolean(
        reviewGuard &&
        statementThrowsNamedError(reviewGuard.thenStatement, "ForbiddenError"),
      )
    )
  } catch {
    return false
  }
}

function hasMissingProofRequestCommandEvidence(
  actionSource,
  serviceSource,
  accessSource,
) {
  return (
    hasProtectedMissingProofActionEvidence(actionSource) &&
    hasServiceOwnedMissingProofRequestEvidence(serviceSource) &&
    hasDelegatedMissingProofReviewEvidence(accessSource)
  )
}

function hasProtectedMissingProofResponseActionEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const binding = constVariableDeclaration(
      sourceFile,
      "respondToMissingEvidence",
    )
    const protectedCall = binding?.initializer
      ? namedCall(binding.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !protectedCall ||
      protectedCall.arguments.length !== 2 ||
      !options ||
      !ts.isObjectLiteralExpression(options) ||
      options.properties.length !== 3 ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body) ||
      !hasExactActionWrapper(
        sourceFile,
        "respondToMissingCloseEvidenceAction",
        "respondToMissingEvidence",
      )
    ) {
      return false
    }
    const optionText = (name) => {
      const property = uniqueObjectProperty(options, name)
      return property && ts.isPropertyAssignment(property)
        ? compactNodeText(sourceFile, property.initializer)
        : ""
    }
    if (
      optionText("permission") !== '"accounting.close.finding.comment"' ||
      optionText("auditResource") !== '"AccountantComment"' ||
      optionText("auditAllowed") !== "true"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const parsed = variableDeclaration(statements[0], "parsed")
    const result = variableDeclaration(statements[1], "result")
    const serviceCall = result?.initializer
      ? namedCall(result.initializer, "respondToMissingCloseEvidence")
      : null
    const revalidate = statements[2]
    const resultReturn = statements[3]
    const control = serviceCall?.arguments[2]
    const actorId = uniqueObjectProperty(control, "actorId")
    const actorPermissions = uniqueObjectProperty(control, "actorPermissions")
    return Boolean(
      statements.length === 4 &&
      parsed?.initializer &&
      compactNodeText(sourceFile, parsed.initializer) ===
        "respondToMissingCloseEvidenceInputSchema.parse(input)" &&
      serviceCall &&
      serviceCall.arguments.length === 3 &&
      compactNodeText(sourceFile, serviceCall.arguments[0]) === "ctx.orgId" &&
      compactNodeText(sourceFile, serviceCall.arguments[1]) === "parsed" &&
      ts.isObjectLiteralExpression(control) &&
      control.properties.length === 2 &&
      actorId &&
      ts.isPropertyAssignment(actorId) &&
      compactNodeText(sourceFile, actorId.initializer) === "ctx.userId" &&
      actorPermissions &&
      ts.isPropertyAssignment(actorPermissions) &&
      compactNodeText(sourceFile, actorPermissions.initializer) ===
        "ctx.permissions" &&
      ts.isExpressionStatement(revalidate) &&
      compactNodeText(sourceFile, revalidate.expression) ===
        "revalidateClosePaths(result.periodId)" &&
      ts.isReturnStatement(resultReturn) &&
      resultReturn.expression &&
      compactNodeText(sourceFile, resultReturn.expression) === "result",
    )
  } catch {
    return false
  }
}

function hasServiceOwnedMissingProofResponseEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const service = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "respondToMissingCloseEvidence",
    )
    const helper = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "runMissingCloseEvidenceTransaction",
    )
    const modifiers = new Set(
      service?.modifiers?.map((modifier) => modifier.kind) ?? [],
    )
    if (
      !service?.body ||
      service.body.statements.length !== 4 ||
      !modifiers.has(ts.SyntaxKind.ExportKeyword) ||
      !modifiers.has(ts.SyntaxKind.AsyncKeyword) ||
      !helper?.body
    ) {
      return false
    }

    const transactionReturn = service.body.statements[3]
    const transactionCall =
      ts.isReturnStatement(transactionReturn) && transactionReturn.expression
        ? namedCall(
            transactionReturn.expression,
            "runMissingCloseEvidenceTransaction",
          )
        : null
    const operation = transactionCall?.arguments[0]
    if (
      !transactionCall ||
      transactionCall.arguments.length !== 1 ||
      !(ts.isArrowFunction(operation) || ts.isFunctionExpression(operation)) ||
      !ts.isBlock(operation.body)
    ) {
      return false
    }

    const auditCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "auditCloseWorkflow",
    )
    const eventCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "recordCloseWorkflowEventInTx",
    )
    const responseCreateCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        callPath(node.expression).join(".") === "tx.accountantComment.create",
    )
    const serviceText = compactNodeText(sourceFile, service.body)
    const helperText = compactNodeText(sourceFile, helper.body)
    const operationText = compactNodeText(sourceFile, operation.body)
    const auditText =
      auditCall?.arguments[1] &&
      compactNodeText(sourceFile, auditCall.arguments[1])
    const eventText =
      eventCall?.arguments[1] &&
      compactNodeText(sourceFile, eventCall.arguments[1])
    const responseCreateText = responseCreateCall
      ? compactNodeText(sourceFile, responseCreateCall)
      : ""
    const preflightMarkers = [
      "constactorId=control.actorId?.trim()",
      "if(!actorId){thrownewBusinessRuleError(",
      "constcorrelationId=input.correlationId??randomUUID()",
    ]
    const operationMarkers = [
      "where:{id:actorId,organizationId,isActive:true",
      'where:{id:input.requestId,organizationId,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY,metadata:{path:["requestType"],equals:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE',
      "constrequest=mapMissingCloseEvidenceRequest(storedRequest)",
      "request.requestedFromId!==actorId",
      "where:{organizationId,correlationId,visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
      "returnassertMatchingMissingCloseEvidenceResponseReplay(",
      "where:{id:request.findingId,organizationId}",
      "finding.periodId!==request.periodId||finding.closeRunId!==request.closeRunId",
      "!missingCloseEvidenceResponseStatuses.has(finding.status)",
      "finding.ownerId!==actorId",
      "status:CloseFindingStatus.IN_REVIEW,correlationId",
      "body:input.responseText,visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
      "responseType:MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE",
      "requestId:request.id",
      "requestCorrelationId:request.correlationId",
      "respondedById:actorId",
      'action:"CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED"',
      'eventType:"close.assurance.missing_evidence.response_submitted"',
      "ownerId:request.requestedById",
      "returnmapMissingCloseEvidenceResponse(response)",
    ]
    return (
      preflightMarkers.every((marker) => serviceText.includes(marker)) &&
      operationMarkers.every((marker) => operationText.includes(marker)) &&
      helperText.includes("for(letattempt=0;attempt<3;attempt+=1)") &&
      helperText.includes(
        "db.$transaction(operation,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
      ) &&
      helperText.includes('code!=="P2034"&&code!=="P2002"') &&
      responseCreateText.includes("body:input.responseText") &&
      Boolean(auditText) &&
      Boolean(eventText) &&
      !auditText.includes("input.responseText") &&
      !eventText.includes("input.responseText") &&
      !auditText.includes("storedRequest.metadata") &&
      !eventText.includes("storedRequest.metadata") &&
      !serviceText.includes("input.organizationId") &&
      !serviceText.includes("control.organizationId") &&
      !serviceText.includes("input.actorId") &&
      !serviceText.includes("input.findingId") &&
      !serviceText.includes("input.requestedFromId") &&
      !serviceText.includes("input.requestedById") &&
      !operationText.includes("resolvedAt") &&
      !operationText.includes("resolvedById") &&
      !operationText.includes("resolutionNotes") &&
      !operationText.includes("waiverApproved")
    )
  } catch {
    return false
  }
}

function hasMissingProofResponseCommandEvidence(actionSource, serviceSource) {
  return (
    hasProtectedMissingProofResponseActionEvidence(actionSource) &&
    hasServiceOwnedMissingProofResponseEvidence(serviceSource)
  )
}

function hasProtectedMissingProofResponseAcceptanceActionEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const binding = constVariableDeclaration(
      sourceFile,
      "acceptMissingEvidenceResponse",
    )
    const protectedCall = binding?.initializer
      ? namedCall(binding.initializer, "protect")
      : null
    const options = protectedCall?.arguments[0]
    const handler = protectedCall?.arguments[1]
    if (
      !protectedCall ||
      protectedCall.arguments.length !== 2 ||
      !options ||
      !ts.isObjectLiteralExpression(options) ||
      options.properties.length !== 4 ||
      !handler ||
      !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) ||
      !ts.isBlock(handler.body) ||
      !hasExactActionWrapper(
        sourceFile,
        "acceptMissingCloseEvidenceResponseAction",
        "acceptMissingEvidenceResponse",
      )
    ) {
      return false
    }

    const optionText = (name) => {
      const property = uniqueObjectProperty(options, name)
      return property && ts.isPropertyAssignment(property)
        ? compactNodeText(sourceFile, property.initializer)
        : ""
    }
    const freshAuthProperty = uniqueObjectProperty(options, "freshAuth")
    const freshAuthOption =
      freshAuthProperty && ts.isPropertyAssignment(freshAuthProperty)
        ? freshAuthProperty.initializer
        : null
    const maxAgeProperty = uniqueObjectProperty(
      freshAuthOption,
      "maxAgeSeconds",
    )
    if (
      optionText("permission") !== '"accounting.close.accountant.review"' ||
      optionText("auditResource") !== '"CloseAssuranceFinding"' ||
      optionText("auditAllowed") !== "true" ||
      !freshAuthOption ||
      !ts.isObjectLiteralExpression(freshAuthOption) ||
      freshAuthOption.properties.length !== 1 ||
      !maxAgeProperty ||
      !ts.isPropertyAssignment(maxAgeProperty) ||
      compactNodeText(sourceFile, maxAgeProperty.initializer) !== "300"
    ) {
      return false
    }

    const statements = [...handler.body.statements]
    const lastAuthAt = variableDeclaration(statements[0], "lastAuthAt")
    const parsed = variableDeclaration(statements[1], "parsed")
    const result = variableDeclaration(statements[2], "result")
    const serviceCall = result?.initializer
      ? namedCall(result.initializer, "acceptMissingCloseEvidenceResponse")
      : null
    const revalidate = statements[3]
    const resultReturn = statements[4]
    const control = serviceCall?.arguments[2]
    const actorId = uniqueObjectProperty(control, "actorId")
    const actorPermissions = uniqueObjectProperty(control, "actorPermissions")
    const freshAuthControlProperty = uniqueObjectProperty(control, "freshAuth")
    const freshAuthControl =
      freshAuthControlProperty &&
      ts.isPropertyAssignment(freshAuthControlProperty)
        ? freshAuthControlProperty.initializer
        : null
    const freshActorId = uniqueObjectProperty(freshAuthControl, "actorId")
    const freshOrganizationId = uniqueObjectProperty(
      freshAuthControl,
      "organizationId",
    )
    const freshLastAuthAt = uniqueObjectProperty(freshAuthControl, "lastAuthAt")
    const isConstStatement = (statement) =>
      ts.isVariableStatement(statement) &&
      (statement.declarationList.flags & ts.NodeFlags.Const) !== 0

    return Boolean(
      statements.length === 5 &&
      isConstStatement(statements[0]) &&
      isConstStatement(statements[1]) &&
      isConstStatement(statements[2]) &&
      lastAuthAt?.initializer &&
      compactNodeText(sourceFile, lastAuthAt.initializer) ===
        "verifiedCloseFreshAuthTime(ctx)" &&
      parsed?.initializer &&
      compactNodeText(sourceFile, parsed.initializer) ===
        "acceptMissingCloseEvidenceResponseInputSchema.parse(input)" &&
      serviceCall &&
      serviceCall.arguments.length === 3 &&
      compactNodeText(sourceFile, serviceCall.arguments[0]) === "ctx.orgId" &&
      compactNodeText(sourceFile, serviceCall.arguments[1]) === "parsed" &&
      ts.isObjectLiteralExpression(control) &&
      control.properties.length === 3 &&
      actorId &&
      ts.isPropertyAssignment(actorId) &&
      compactNodeText(sourceFile, actorId.initializer) === "ctx.userId" &&
      actorPermissions &&
      ts.isPropertyAssignment(actorPermissions) &&
      compactNodeText(sourceFile, actorPermissions.initializer) ===
        "ctx.permissions" &&
      ts.isObjectLiteralExpression(freshAuthControl) &&
      freshAuthControl.properties.length === 3 &&
      freshActorId &&
      ts.isPropertyAssignment(freshActorId) &&
      compactNodeText(sourceFile, freshActorId.initializer) === "ctx.userId" &&
      freshOrganizationId &&
      ts.isPropertyAssignment(freshOrganizationId) &&
      compactNodeText(sourceFile, freshOrganizationId.initializer) ===
        "ctx.orgId" &&
      freshLastAuthAt &&
      compactNodeText(sourceFile, freshLastAuthAt) === "lastAuthAt" &&
      ts.isExpressionStatement(revalidate) &&
      compactNodeText(sourceFile, revalidate.expression) ===
        "revalidateClosePaths(result.periodId)" &&
      ts.isReturnStatement(resultReturn) &&
      resultReturn.expression &&
      compactNodeText(sourceFile, resultReturn.expression) === "result"
    )
  } catch {
    return false
  }
}

function hasMissingProofResponseAcceptanceContractEvidence(source) {
  const contract = source.replace(/[;\s]+/g, "")
  const markers = [
    'MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE="MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"',
    'MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY="ACCOUNTANT_RESPONSE_ACCEPTED"',
    'kind:"ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"',
    "version:1",
    'permission:"accounting.close.accountant.review"',
    'decision:"ACCEPTED"',
    'findingStatus:"RESOLVED"',
    "freshAuthMaxAgeSeconds:300",
    'auditAction:"CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED"',
    'eventType:"close.assurance.missing_evidence.response_accepted"',
    'redaction:"NO_REQUEST_RESPONSE_OR_RESOLUTION_TEXT_IN_AUDIT_EVENT"',
    "rawMetadataExposed:false",
    "closeCertificationAuthorized:false",
    "serviceClockOwned:true",
    "freshAuthRequired:true",
    "delegatedReviewRequired:true",
    "segregationOfDutiesRequired:true",
    "compareAndSetResolution:true",
  ]
  return markers.every((marker) => contract.includes(marker))
}

function hasServiceOwnedMissingProofResponseAcceptanceEvidence(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "close-assurance.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const findFunction = (name) =>
      sourceFile.statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) && statement.name?.text === name,
      )
    const service = findFunction("acceptMissingCloseEvidenceResponse")
    const authHelper = findFunction(
      "requireFreshMissingEvidenceAcceptanceControl",
    )
    const transactionHelper = findFunction(
      "runMissingCloseEvidenceTransaction",
    )
    const replayHelper = findFunction(
      "assertMatchingMissingCloseEvidenceAcceptanceReplay",
    )
    const mapper = findFunction("mapMissingCloseEvidenceResponseAcceptance")
    const modifiers = new Set(
      service?.modifiers?.map((modifier) => modifier.kind) ?? [],
    )
    const transactionReturn = service?.body?.statements.at(-1)
    const transactionCall =
      transactionReturn &&
      ts.isReturnStatement(transactionReturn) &&
      transactionReturn.expression
        ? namedCall(
            transactionReturn.expression,
            "runMissingCloseEvidenceTransaction",
          )
        : null
    const operation = transactionCall?.arguments[0]
    if (
      !service?.body ||
      !authHelper?.body ||
      !transactionHelper?.body ||
      !replayHelper?.body ||
      !mapper?.body ||
      !modifiers.has(ts.SyntaxKind.ExportKeyword) ||
      !modifiers.has(ts.SyntaxKind.AsyncKeyword) ||
      !transactionCall ||
      transactionCall.arguments.length !== 1 ||
      !(ts.isArrowFunction(operation) || ts.isFunctionExpression(operation)) ||
      !ts.isBlock(operation.body)
    ) {
      return false
    }

    const auditCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "auditCloseWorkflow",
    )
    const eventCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "recordCloseWorkflowEventInTx",
    )
    const transitionCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        callPath(node.expression).join(".") ===
          "tx.closeAssuranceFinding.updateMany",
    )
    const acceptanceCreateCall = findFirstDescendant(
      operation.body,
      (node) =>
        ts.isCallExpression(node) &&
        callPath(node.expression).join(".") === "tx.accountantComment.create",
    )
    const serviceText = compactNodeText(sourceFile, service.body)
    const authText = compactNodeText(sourceFile, authHelper.body)
    const transactionText = compactNodeText(sourceFile, transactionHelper.body)
    const replayText = compactNodeText(sourceFile, replayHelper.body)
    const mapperText = compactNodeText(sourceFile, mapper.body)
    const operationText = compactNodeText(sourceFile, operation.body)
    const auditText =
      auditCall?.arguments[1] &&
      compactNodeText(sourceFile, auditCall.arguments[1])
    const eventText =
      eventCall?.arguments[1] &&
      compactNodeText(sourceFile, eventCall.arguments[1])
    const transitionText = transitionCall
      ? compactNodeText(sourceFile, transitionCall)
      : ""
    const acceptanceCreateText = acceptanceCreateCall
      ? compactNodeText(sourceFile, acceptanceCreateCall)
      : ""

    const preflightMarkers = [
      "consthomeOrganizationId=homeOrganizationIdInput.trim()",
      "if(!homeOrganizationId){thrownewBusinessRuleError(",
      "hasRbacPermission(control.actorPermissions??[],ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.permission",
      "constnow=newDate()",
      "constactorId=requireFreshMissingEvidenceAcceptanceControl(homeOrganizationId,control,now",
      "constclientOrganizationId=input.clientOrganizationId?.trim()||null",
      "constrequestId=input.requestId.trim()",
      "constresponseId=input.responseId.trim()",
      "constresolutionNotes=input.resolutionNotes.trim()",
      "constcorrelationId=suppliedCorrelationId??randomUUID()",
    ]
    const authMarkers = [
      "constactorId=control.actorId?.trim()",
      "freshAuth.actorId!==actorId",
      "freshAuth.organizationId!==homeOrganizationId",
      "!Number.isFinite(nowTime)",
      "!Number.isFinite(lastAuthAt)",
      "lastAuthAt<=0",
      "lastAuthAt>nowTime",
      "nowTime-lastAuthAt>MISSING_CLOSE_EVIDENCE_ACCEPTANCE_FRESH_AUTH_MAX_AGE_MS",
      '"FRESH_AUTH_REQUIRED"',
      "returnactorId",
    ]
    const operationMarkers = [
      "constactiveActor=awaittx.user.findFirst({where:{id:actorId,organizationId:homeOrganizationId,isActive:true",
      'constaccess=awaitresolveAccountantClientAccess({homeOrganizationId,clientOrganizationId,accountantUserId:actorId,capability:"REVIEW",now,client:tx',
      "constorganizationId=access.organizationId",
      'visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY,metadata:{path:["acceptanceType"],equals:MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE',
      "returnassertMatchingMissingCloseEvidenceAcceptanceReplay(existingAcceptance,input,organizationId,actorId",
      'id:requestId,organizationId,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY,metadata:{path:["requestType"],equals:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE',
      "constrequest=mapMissingCloseEvidenceRequest(storedRequest)",
      'id:responseId,organizationId,visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,metadata:{path:["responseType"],equals:MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE',
      "constresponse=mapMissingCloseEvidenceResponse(storedResponse)",
      "response.requestId!==request.id",
      "response.organizationId!==request.organizationId",
      "response.periodId!==request.periodId",
      "response.closeRunId!==request.closeRunId",
      "response.findingId!==request.findingId",
      "response.requestedById!==request.requestedById",
      "response.requestedFromId!==request.requestedFromId",
      "response.respondedById!==request.requestedFromId",
      "response.requestCorrelationId!==request.correlationId",
      "if(actorId===response.respondedById){thrownewForbiddenError(",
      "where:{id:request.findingId,organizationId}",
      "finding.periodId!==request.periodId||finding.closeRunId!==request.closeRunId",
      "finding.status!==CloseFindingStatus.IN_REVIEW",
      "finding.ownerId!==response.respondedById",
      "if(transition.count!==1){thrownewConflictError(",
      "returnmapMissingCloseEvidenceResponseAcceptance(acceptance)",
    ]
    const replayMarkers = [
      "constacceptance=mapMissingCloseEvidenceResponseAcceptance(existing)",
      "acceptance.organizationId!==organizationId",
      "acceptance.requestId!==input.requestId.trim()",
      "acceptance.responseId!==input.responseId.trim()",
      "acceptance.acceptedById!==actorId",
      "acceptance.resolutionNotes!==input.resolutionNotes.trim()",
      "thrownewConflictError(",
    ]
    const mapperMarkers = [
      "acceptedById===respondedById",
      "serviceClockOwned:true",
      "freshAuthRequired:true",
      "delegatedReviewRequired:true",
      "segregationOfDutiesRequired:true",
      "compareAndSetResolution:true",
      "rawMetadataExposed:false",
      "closeCertificationAuthorized:false",
    ]
    const orderedMarkers = [
      "constactiveActor=awaittx.user.findFirst({",
      "constaccess=awaitresolveAccountantClientAccess({",
      "constexistingAcceptance=awaittx.accountantComment.findFirst({",
      "conststoredRequest=awaittx.accountantComment.findFirst({",
      "conststoredResponse=awaittx.accountantComment.findFirst({",
      "constfinding=awaittx.closeAssuranceFinding.findFirst({",
      "consttransition=awaittx.closeAssuranceFinding.updateMany({",
      "constacceptance=awaittx.accountantComment.create({",
      "awaitauditCloseWorkflow(tx,{",
      "awaitrecordCloseWorkflowEventInTx(tx,{",
    ]
    const orderedIndexes = orderedMarkers.map((marker) =>
      operationText.indexOf(marker),
    )
    const evidenceLeaks = [
      "input.resolutionNotes",
      "resolutionNotes",
      "request.body",
      "response.body",
      "storedRequest.metadata",
      "storedResponse.metadata",
      "acceptance.body",
    ]

    return (
      preflightMarkers.every((marker) => serviceText.includes(marker)) &&
      authMarkers.every((marker) => authText.includes(marker)) &&
      operationMarkers.every((marker) => operationText.includes(marker)) &&
      replayMarkers.every((marker) => replayText.includes(marker)) &&
      mapperMarkers.every((marker) => mapperText.includes(marker)) &&
      orderedIndexes.every(
        (index, position) =>
          index >= 0 && (position === 0 || index > orderedIndexes[position - 1]),
      ) &&
      source.includes(
        "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.freshAuthMaxAgeSeconds *\n  1000",
      ) &&
      transactionText.includes("for(letattempt=0;attempt<3;attempt+=1)") &&
      transactionText.includes(
        "db.$transaction(operation,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
      ) &&
      transactionText.includes('code!=="P2034"&&code!=="P2002"') &&
      transitionText.includes(
        "where:{id:finding.id,organizationId,status:CloseFindingStatus.IN_REVIEW,ownerId:response.respondedById",
      ) &&
      transitionText.includes(
        "data:{status:CloseFindingStatus.RESOLVED,resolutionNotes,resolvedAt:now,resolvedById:actorId,correlationId",
      ) &&
      acceptanceCreateText.includes("body:resolutionNotes") &&
      acceptanceCreateText.includes(
        "visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY",
      ) &&
      acceptanceCreateText.includes(
        "acceptanceType:MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE",
      ) &&
      Boolean(auditText) &&
      Boolean(eventText) &&
      auditText.includes(
        "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.auditAction",
      ) &&
      eventText.includes(
        "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.eventType",
      ) &&
      evidenceLeaks.every(
        (marker) => !auditText.includes(marker) && !eventText.includes(marker),
      ) &&
      !serviceText.includes("input.organizationId") &&
      !serviceText.includes("input.actorId") &&
      !serviceText.includes("control.organizationId") &&
      !serviceText.includes("control.now") &&
      !operationText.includes("tx.closeRun.") &&
      !operationText.includes("CloseRunStatus") &&
      !operationText.includes("APPROVED_FOR_CLOSE")
    )
  } catch {
    return false
  }
}

function hasMissingProofResponseAcceptanceEvidence(
  actionSource,
  serviceSource,
  contractSource,
  accessSource,
) {
  return (
    hasProtectedMissingProofResponseAcceptanceActionEvidence(actionSource) &&
    hasServiceOwnedMissingProofResponseAcceptanceEvidence(serviceSource) &&
    hasMissingProofResponseAcceptanceContractEvidence(contractSource) &&
    hasDelegatedMissingProofReviewEvidence(accessSource)
  )
}

function protectedAccountantCommandBinding(
  sourceFile,
  bindingName,
  commandName,
) {
  const declaration = sourceFile.statements
    .map((statement) => variableDeclaration(statement, bindingName))
    .find(Boolean)
  const protectedCall = declaration?.initializer
    ? namedCall(declaration.initializer, "protect")
    : null
  const options = protectedCall?.arguments[0]
  const handler = protectedCall?.arguments[1]
  if (
    !options ||
    !handler ||
    !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))
  ) {
    return false
  }

  const permission = propertyInitializer(options, "permission")
  const freshAuth = propertyInitializer(options, "freshAuth")
  const maxAge = propertyInitializer(freshAuth, "maxAgeSeconds")
  const commandCall = findFirstDescendant(
    handler.body,
    (node) =>
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === commandName,
  )

  return Boolean(
    permission &&
    ts.isStringLiteral(permission) &&
    permission.text === "accounting.close.accountant.invite" &&
    maxAge &&
    ts.isNumericLiteral(maxAge) &&
    maxAge.text === "300" &&
    commandCall &&
    commandCall.arguments.length >= 2 &&
    compactNodeText(sourceFile, commandCall.arguments[0]) === "ctx.orgId" &&
    compactNodeText(sourceFile, commandCall.arguments[1]) === "ctx.userId",
  )
}

function hasProtectedAccountantAccessCommandBoundary(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "accountant-access.actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    return (
      protectedAccountantCommandBinding(
        sourceFile,
        "grantAccess",
        "grantAccountantAccess",
      ) &&
      protectedAccountantCommandBinding(
        sourceFile,
        "revokeAccess",
        "revokeAccountantAccess",
      )
    )
  } catch {
    return false
  }
}
function hasTenantTimeScopedAccountantQuery(sourceFile, resolver) {
  const accessQuery = findFirstDescendant(
    resolver.body,
    (node) =>
      ts.isCallExpression(node) &&
      callPath(node.expression).slice(-2).join(".") ===
        "accountantAccessGrant.findFirst",
  )
  const query = accessQuery?.arguments[0]
  const where = propertyInitializer(query, "where")
  if (!where || !ts.isObjectLiteralExpression(where)) return false

  const effectiveFrom = propertyInitializer(where, "effectiveFrom")
  const expiresAt = propertyInitializer(where, "expiresAt")
  const organization = propertyInitializer(where, "organization")
  const organizationIs = propertyInitializer(organization, "is")

  const activeScopeKey = compactNodeText(
    sourceFile,
    propertyInitializer(where, "activeScopeKey"),
  )

  return (
    compactNodeText(
      sourceFile,
      propertyInitializer(where, "organizationId"),
    ) === "targetOrganizationId" &&
    compactNodeText(
      sourceFile,
      propertyInitializer(where, "accountantUserId"),
    ) === "input.accountantUserId" &&
    compactNodeText(sourceFile, propertyInitializer(where, "status")) ===
      "AccountantAccessStatus.ACTIVE" &&
    compactNodeText(sourceFile, propertyInitializer(effectiveFrom, "lte")) ===
      "now" &&
    compactNodeText(sourceFile, propertyInitializer(expiresAt, "gt")) ===
      "now" &&
    [
      "`${targetOrganizationId}:${input.accountantUserId}`",
      'targetOrganizationId+":"+input.accountantUserId',
    ].includes(activeScopeKey) &&
    propertyInitializer(organizationIs, "isActive")?.kind ===
      ts.SyntaxKind.TrueKeyword &&
    propertyInitializer(organizationIs, "deletedAt")?.kind ===
      ts.SyntaxKind.NullKeyword
  )
}
function hasServerResolvedAccountantAccessBoundary(source) {
  try {
    const sourceFile = ts.createSourceFile(
      "accountant-access.service.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const resolver = sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "resolveAccountantClientAccess",
    )
    if (!resolver?.body) return false

    const target = resolver.body.statements
      .map((statement) =>
        variableDeclaration(statement, "targetOrganizationId"),
      )
      .find(Boolean)
    if (
      !target?.initializer ||
      compactNodeText(sourceFile, target.initializer) !==
        "input.clientOrganizationId||input.homeOrganizationId"
    ) {
      return false
    }

    const homeBranch = resolver.body.statements.find(
      (statement) =>
        ts.isIfStatement(statement) &&
        compactNodeText(sourceFile, statement.expression) ===
          "targetOrganizationId===input.homeOrganizationId",
    )
    const homeReturn = homeBranch
      ? findFirstDescendant(homeBranch.thenStatement, (node) =>
          ts.isReturnStatement(node),
        )
      : null
    const homeOutput = homeReturn?.expression
    if (!homeOutput || !ts.isObjectLiteralExpression(homeOutput)) return false

    const homeOrganizationId = propertyInitializer(homeOutput, "organizationId")
    const homeMode = propertyInitializer(homeOutput, "mode")
    if (
      !homeOrganizationId ||
      !homeMode ||
      compactNodeText(sourceFile, homeOrganizationId) !==
        "targetOrganizationId" ||
      !compactNodeText(sourceFile, homeMode).startsWith('"TENANT_MEMBER"')
    ) {
      return false
    }

    if (!hasTenantTimeScopedAccountantQuery(sourceFile, resolver)) return false

    const noGrantBranch = resolver.body.statements.find(
      (statement) =>
        ts.isIfStatement(statement) &&
        compactNodeText(sourceFile, statement.expression) === "!grant",
    )
    const roleBranch = resolver.body.statements.find((statement) => {
      if (!ts.isIfStatement(statement)) return false
      const condition = compactNodeText(sourceFile, statement.expression)
      return (
        condition.includes('input.capability==="EXPORT"') &&
        condition.includes("grant.role===AccountantAccessRole.READ_ONLY")
      )
    })

    return Boolean(
      noGrantBranch &&
      statementThrowsNamedError(
        noGrantBranch.thenStatement,
        "ForbiddenError",
      ) &&
      roleBranch &&
      statementThrowsNamedError(roleBranch.thenStatement, "ForbiddenError"),
    )
  } catch {
    return false
  }
}
function hasClientMissingProofRequestQueueEvidence(
  contractSource,
  queueSource,
  writerSource,
) {
  const contract = contractSource.replace(/[;\s]+/g, "")
  const queue = queueSource.replace(/[;\s]+/g, "")
  const writer = writerSource.replace(/[;\s]+/g, "")
  const contractMarkers = [
    'MISSING_CLOSE_EVIDENCE_REQUEST_TYPE="MISSING_CLOSE_EVIDENCE"asconst',
    'MISSING_CLOSE_EVIDENCE_VISIBILITY="CLIENT_ACTION_REQUIRED"asconst',
    'kind:"CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE"',
    'readPermission:"accounting.close.read"',
    "maxItems:100",
    'redaction:"CLIENT_RECIPIENT_ONLY_NO_RAW_METADATA"',
    'reason:"INVALID_REQUEST_EVIDENCE"',
    "rawMetadataExposed:false",
  ]
  const queueMarkers = [
    "exporttypeGetClientMissingCloseEvidenceRequestQueueInput=Readonly<{organizationId:stringactorId:stringactorPermissions:readonlystring[]}>",
    "CloseFindingStatus.OPEN,CloseFindingStatus.ASSIGNED,CloseFindingStatus.IN_REVIEW,CloseFindingStatus.REOPENED",
    "hasRbacPermission(input.actorPermissions,CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission",
    "db.user.findFirst({where:{id:actorId,organizationId,isActive:true}",
    "constgeneratedAt=newDate()",
    "constmatchingComment:Prisma.AccountantCommentWhereInput={organizationId,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY",
    'path:["requestType"],equals:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE',
    'path:["requestedFromId"],equals:actorId',
    "organizationId,ownerId:actorId,status:{in:[...OPEN_FINDING_STATUSES]},comments:{some:matchingComment}",
    'where:matchingComment,orderBy:[{createdAt:"desc"},{id:"desc"}],take:1',
    "take:CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems+1",
    "findings.slice(0,CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems",
    "requestedById!==comment.authorId",
    "requestedFromId!==actorId",
    "correlationId!==comment.correlationId",
    "blockers.push(invalidEvidenceBlocker(finding.id,requestId))",
    "rawMetadataExposed:false",
    "findings.length>CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems",
    "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.actionPathPrefix",
  ]
  return (
    contractMarkers.every((marker) => contract.includes(marker)) &&
    queueMarkers.every((marker) => queue.includes(marker)) &&
    writer.includes('from"./missing-close-evidence-request-queue-contracts"') &&
    writer.includes("visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY") &&
    writer.includes("requestType:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE") &&
    !writer.includes(
      'constMISSING_CLOSE_EVIDENCE_REQUEST_TYPE="MISSING_CLOSE_EVIDENCE"',
    ) &&
    !queue.includes("input.now") &&
    !queue.includes("input.requestedFromId") &&
    !queue.includes("metadata:comment.metadata")
  )
}

function hasClientMissingProofManagerActionCenterEvidence(
  contractSource,
  serviceSource,
) {
  const contract = contractSource.replace(/[;\s]+/g, "")
  const service = serviceSource.replace(/[;\s]+/g, "")
  const helperStart = service.indexOf(
    "asyncfunctiongetClientMissingProofActionCenterSource(",
  )
  if (helperStart < 0) return false

  const helper = service.slice(helperStart)
  const rbacIndex = helper.indexOf(
    "hasRbacPermission(input.actorPermissions,CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission",
  )
  const entitlementIndex = helper.indexOf(
    "constaccess=awaitobserveModuleAccess({",
  )
  const queueIndex = helper.indexOf(
    "constqueue=awaitgetClientMissingCloseEvidenceRequestQueue({",
  )
  const exactQueueCall =
    "constqueue=awaitgetClientMissingCloseEvidenceRequestQueue({organizationId:input.organizationId,actorId:input.actorId,actorPermissions:input.actorPermissions,})"

  const contractMarkers = [
    'state:"AVAILABLE"queue:ClientMissingCloseEvidenceRequestQueuereason:null',
    'state:"HIDDEN"queue:nullreason:"RBAC_REQUIRED"|"MODULE_UNAVAILABLE"',
    'state:"UNAVAILABLE"queue:nullreason:"SOURCE_READ_FAILED"',
    'origin:"SIGNAL"|"ASSURANCE"|"ACCOUNTANT_REQUEST"',
    "clientMissingProofSource:ClientMissingProofActionCenterSource|null",
    "clientMissingProofSource?:ClientMissingProofActionCenterSource|null",
  ]
  const serviceMarkers = [
    'from"@/services/accounting/missing-close-evidence-request-queue-contracts"',
    'from"@/services/accounting/missing-close-evidence-request-queue.service"',
    'moduleSlug:"close_assurance"',
    'surface:"manager-action-center.client-missing-proof"',
    'mode:"enforce"',
    "audit:true",
    'return{state:"HIDDEN",queue:null,reason:"RBAC_REQUIRED"}',
    'return{state:"HIDDEN",queue:null,reason:"MODULE_UNAVAILABLE"}',
    'return{state:"AVAILABLE",queue,reason:null}',
    'return{state:"UNAVAILABLE",queue:null,reason:"SOURCE_READ_FAILED"}',
    "clientMissingProofSource,",
    "input.clientMissingProofSource??null",
    "...clientMissingProofActions",
    'origin:"ACCOUNTANT_REQUEST"',
    'source.state==="HIDDEN"',
    'source.state==="UNAVAILABLE"',
    "source.queue.requests.map",
    "source.queue.blockers.map",
    'field:"accountantComment.metadata"',
    "policy:CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction",
    'detail:"Thesource-ownedmissing-proofqueuecouldnotberead."',
  ]

  return (
    contractMarkers.every((marker) => contract.includes(marker)) &&
    serviceMarkers.every((marker) => service.includes(marker)) &&
    rbacIndex >= 0 &&
    entitlementIndex > rbacIndex &&
    queueIndex > entitlementIndex &&
    helper.includes(exactQueueCall) &&
    !helper.includes("input.requestedFromId") &&
    !helper.includes("catch(error") &&
    !helper.includes("catch(err")
  )
}

function hasClientMissingProofResponseStateProjectionEvidence(
  contractSource,
  queueSource,
  writerSource,
  managerContractSource,
  managerServiceSource,
) {
  const contract = contractSource.replace(/[;\s]+/g, "")
  const queue = queueSource.replace(/[;\s]+/g, "")
  const writer = writerSource.replace(/[;\s]+/g, "")
  const managerContract = managerContractSource.replace(/[;\s]+/g, "")
  const managerService = managerServiceSource.replace(/[;\s]+/g, "")
  const requestHelperStart = managerService.indexOf(
    "functionmanagerActionFromClientMissingProofRequest(",
  )
  const blockerHelperStart = managerService.indexOf(
    "functionmanagerActionFromClientMissingProofBlocker(",
  )
  const runSheetStart = managerService.indexOf("functionrunSheetGroupForAction(")
  const runSheetEnd = managerService.indexOf(
    "functionrunSheetGroupState(",
    runSheetStart,
  )
  if (
    requestHelperStart < 0 ||
    blockerHelperStart <= requestHelperStart ||
    runSheetStart < 0 ||
    runSheetEnd <= runSheetStart
  ) {
    return false
  }
  const requestHelper = managerService.slice(
    requestHelperStart,
    blockerHelperStart,
  )
  const blockerHelper = managerService.slice(blockerHelperStart)
  const runSheetHelper = managerService.slice(runSheetStart, runSheetEnd)
  const waitingIndex = runSheetHelper.indexOf(
    'item.waitingOn==="ACCOUNTANT_REVIEW"',
  )
  const overdueIndex = runSheetHelper.indexOf('item.dueState==="overdue"')

  const contractMarkers = [
    "version:2",
    'MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE="MISSING_CLOSE_EVIDENCE_RESPONSE"asconst',
    'MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY="CLIENT_RESPONSE_SUBMITTED"asconst',
    '"AWAITING_RECIPIENT_RESPONSE"|"RESPONSE_SUBMITTED"',
    "exporttypeClientMissingCloseEvidenceResponse=Readonly<{responseId:stringcorrelationId:stringrespondedById:stringsubmittedAt:stringstatus:\"SUBMITTED\"}>",
    'reason:"INVALID_RESPONSE_EVIDENCE"',
    "responseBodyExposed:false",
    "responseStateServiceOwned:true",
    "awaitingResponse:number",
    "responseSubmitted:number",
    "invalidRequestEvidence:number",
    "invalidResponseEvidence:number",
  ]
  const queueMarkers = [
    "constAWAITING_RESPONSE_FINDING_STATUSES=newSet<CloseFindingStatus>",
    "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems*2",
    "constresponseCandidates:MissingCloseEvidenceResponseRecord[]",
    "organizationId,findingId:{in:visibleFindings.map((finding)=>finding.id)}",
    "visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
    'path:["responseType"],equals:MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE',
    "take:MAX_RESPONSE_CANDIDATES+1",
    "responseCandidates.length>MAX_RESPONSE_CANDIDATES",
    "responseCandidatesForFinding.length>1",
    "finding.status===CloseFindingStatus.IN_REVIEW&&responseCandidatesForFinding.length!==1",
    "awaitingResponse&&responseCandidatesForFinding.length!==0",
    "storedResponse.organizationId!==organizationId",
    "storedResponse.periodId!==finding.period.id",
    "storedResponse.closeRunId!==finding.closeRunId",
    "storedResponse.findingId!==finding.id",
    "responseRequestId!==comment.id",
    "requestCorrelationId!==correlationId",
    "responseRequestedById!==requestedById",
    "responseRequestedFromId!==actorId",
    "storedResponse.authorId!==actorId",
    "respondedById!==storedResponse.authorId",
    "responseCorrelationId!==storedResponse.correlationId",
    "responseId:storedResponse.id",
    'status:"SUBMITTED"',
    'workflowState:response?"RESPONSE_SUBMITTED":"AWAITING_RECIPIENT_RESPONSE"',
    'request.workflowState==="AWAITING_RECIPIENT_RESPONSE"',
    "responseBodyExposed:false",
    "responseStateServiceOwned:true",
    "invalidRequestEvidence,invalidResponseEvidence",
  ]
  const requestHelperMarkers = [
    'request.workflowState==="RESPONSE_SUBMITTED"&&request.response',
    'nextStep:"Responsesubmittedawaitingaccountantreview."',
    'assignedRole:"accountant"',
    'waitingOn:"ACCOUNTANT_REVIEW"',
    'dueState:"scheduled"',
    'state:"partial"',
  ]

  return (
    contractMarkers.every((marker) => contract.includes(marker)) &&
    queueMarkers.every((marker) => queue.includes(marker)) &&
    writer.includes('from"./missing-close-evidence-request-queue-contracts"') &&
    writer.includes("visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY") &&
    writer.includes("responseType:MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE") &&
    managerContract.includes('waitingOn?:"ACCOUNTANT_REVIEW"') &&
    requestHelperMarkers.every((marker) => requestHelper.includes(marker)) &&
    blockerHelper.includes('blocker.reason==="INVALID_RESPONSE_EVIDENCE"') &&
    blockerHelper.includes('"client_missing_proof_response"') &&
    runSheetHelper.includes(
      'if(item.waitingOn==="ACCOUNTANT_REVIEW")return"waiting"',
    ) &&
    waitingIndex >= 0 &&
    overdueIndex > waitingIndex &&
    !contract.includes("body:string") &&
    !queue.includes("body:storedResponse.body") &&
    !requestHelper.includes("request.response.body") &&
    !requestHelper.includes("responseText")
  )
}

function hasAccountantMissingProofReviewQueueEvidence(
  contractSource,
  serviceSource,
  accessSource,
) {
  const contract = contractSource.replace(/[;\s]+/g, "")
  const service = serviceSource.replace(/[;\s]+/g, "")
  const access = accessSource.replace(/[;\s]+/g, "")
  const actorIndex = service.indexOf("constactor=awaittx.user.findFirst({")
  const accessIndex = service.indexOf(
    "constaccess=awaitresolveAccountantClientAccess({",
  )
  const findingIndex = service.indexOf(
    "constfindings=awaittx.closeAssuranceFinding.findMany({",
  )
  const boundedCommentQueryCount =
    service.split("take:MAX_COMMENT_CANDIDATES+1").length - 1
  const failClosedTruncationCount =
    service.split(
      "items:[],blockers:[truncatedEvidenceBlocker()],truncated:true",
    ).length - 1
  if (
    actorIndex < 0 ||
    accessIndex <= actorIndex ||
    findingIndex <= accessIndex
  ) {
    return false
  }

  const contractMarkers = [
    'kind:"ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE"',
    "version:1",
    'readPermission:"accounting.close.accountant.review"',
    "maxItems:100",
    "candidateMultiplier:2",
    'redaction:"ACCOUNTANT_REVIEW_NO_RAW_METADATA"',
    'responseTextExposure:"AUTHORIZED_ACCOUNTANT_REVIEW_ONLY"',
    'workflowState:"AWAITING_ACCOUNTANT_REVIEW"',
    "requestText:string",
    "responseText:string",
    '"INVALID_REQUEST_EVIDENCE"',
    '"INVALID_RESPONSE_EVIDENCE"',
    '"TRUNCATED_EVIDENCE"',
    'accessMode:"TENANT_MEMBER"|"DELEGATED_ACCOUNTANT"',
    "activeHomeTenantActorRequired:true",
    "targetOrganizationServiceResolved:true",
    "delegatedReviewGrantRequired:true",
    "serviceClockOwned:true",
    "rawMetadataExposed:false",
    "failClosedOnTruncation:true",
  ]
  const serviceMarkers = [
    "exporttypeGetAccountantMissingCloseEvidenceReviewQueueInput=Readonly<{homeOrganizationId:stringclientOrganizationId?:string|nullactorId:stringactorPermissions:readonlystring[]}>",
    "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems*ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.candidateMultiplier",
    "hasRbacPermission(input.actorPermissions,ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.readPermission",
    "input.clientOrganizationId?.trim()||null",
    "input.clientOrganizationId!=null&&!clientOrganizationId",
    "constgeneratedAt=newDate()",
    "id:actorId,organizationId:homeOrganizationId,isActive:true",
    "homeOrganizationId,clientOrganizationId,accountantUserId:actorId,capability:\"REVIEW\",now:generatedAt,client:tx",
    "constorganizationId=access.organizationId",
    "organizationId,visibility:MISSING_CLOSE_EVIDENCE_VISIBILITY,metadata:{path:[\"requestType\"],equals:MISSING_CLOSE_EVIDENCE_REQUEST_TYPE",
    "organizationId,visibility:MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,metadata:{path:[\"responseType\"],equals:MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE",
    "organizationId,status:CloseFindingStatus.IN_REVIEW,comments:{some:requestMatcher}",
    "take:ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems+1",
    "constfindingsTruncated=findings.length>ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems",
    "constvisibleFindings=findings.slice(0,ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems",
    "constfindingIds=visibleFindings.map((finding)=>finding.id)",
    "findingId:{in:findingIds}",
    "take:MAX_COMMENT_CANDIDATES+1",
    "requestCandidates.length>MAX_COMMENT_CANDIDATES",
    "responseCandidates.length>MAX_COMMENT_CANDIDATES",
    "items:[],blockers:[truncatedEvidenceBlocker()],truncated:true",
    "requests.length!==1||!request",
    "responses.length!==1||!response",
    "request.organizationId!==organizationId",
    "request.periodId!==finding.period.id",
    "request.closeRunId!==finding.closeRunId",
    "request.findingId!==finding.id",
    "requestedById!==request.authorId",
    "finding.ownerId!==requestedFromId",
    "requestCorrelationId!==request.correlationId",
    "response.organizationId!==organizationId",
    "response.periodId!==finding.period.id",
    "response.closeRunId!==finding.closeRunId",
    "response.findingId!==finding.id",
    "responseRequestId!==request.id",
    "responseRequestCorrelationId!==request.correlationId",
    "responseRequestedById!==requestedById",
    "responseRequestedFromId!==requestedFromId",
    "response.authorId!==requestedFromId",
    "respondedById!==response.authorId",
    "responseCorrelationId!==response.correlationId",
    'workflowState:"AWAITING_ACCOUNTANT_REVIEW"',
    "requestText:request.body",
    "responseText:response.body",
    "Date.parse(left.response.submittedAt)-Date.parse(right.response.submittedAt)||left.request.requestId.localeCompare(right.request.requestId)",
    "isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead",
    "rawMetadataExposed:false",
    'responseTextExposure:ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.responseTextExposure',
  ]

  return (
    contractMarkers.every((marker) => contract.includes(marker)) &&
    serviceMarkers.every((marker) => service.includes(marker)) &&
    access.includes(
      'input.capability==="REVIEW"&&grant.role===AccountantAccessRole.READ_ONLY',
    ) &&
    actorIndex < accessIndex &&
    accessIndex < findingIndex &&
    boundedCommentQueryCount === 2 &&
    failClosedTruncationCount === 2 &&
    !service.includes("input.now") &&
    !service.includes("constorganizationId=input.organizationId") &&
    !service.includes("getCloseAssuranceDashboard") &&
    !service.includes("metadata:request.metadata") &&
    !service.includes("metadata:response.metadata")
  )
}

function hasCustomerLedgerServiceOwnedBalanceKernel(
  customerLedgerSource,
  posSource,
) {
  const service = customerLedgerSource.replace(/\s+/g, "")
  const pos = posSource.replace(/\s+/g, "")
  const requiredServiceEvidence = [
    "enforceCreditLimit?:boolean",
    'constorganizationId=requiredText(input.organizationId,"Organization")',
    'constcustomerId=requiredText(input.customerId,"Customer")',
    "validateTypePolarity(input.type,debit,credit)",
    "if(type===LedgerEntryType.PURCHASE)",
    "if(type===LedgerEntryType.ADJUSTMENT)return",
    "constcustomer=awaittx.customer.findFirst({where:{id:customerId,organizationId,deletedAt:null",
    "select:{id:true,currentBalance:true,creditLimit:true",
    "constbalanceAfter=currentBalance.plus(debit).minus(credit).toDecimalPlaces(2)",
    "if(balanceAfter.lt(0))",
    "input.enforceCreditLimit&&customer.creditLimit!=null&&balanceAfter.gt(toMoney(customer.creditLimit))",
    "constbalanceClaim=awaittx.customer.updateMany({where:{id:customerId,organizationId,deletedAt:null,currentBalance",
    "data:{currentBalance:balanceAfter}",
    "if(balanceClaim.count!==1)",
    "thrownewConflictError(",
    "returntx.customerLedgerEntry.create({data:{customerId,organizationId,entryDate,type:input.type,debit,credit,balanceAfter,description",
  ]
  const claimIndex = service.indexOf(
    "constbalanceClaim=awaittx.customer.updateMany(",
  )
  const appendIndex = service.indexOf("returntx.customerLedgerEntry.create(")
  const customerLedgerCalls =
    pos.match(/createCustomerLedgerEntry\(tx,\{/g) ?? []

  return (
    requiredServiceEvidence.every((evidence) => service.includes(evidence)) &&
    !service.includes("balanceAfter:CustomerLedgerAmount") &&
    claimIndex >= 0 &&
    appendIndex > claimIndex &&
    customerLedgerCalls.length === 2 &&
    pos.includes(
      "type:LedgerEntryType.SALE,debit:onAccountAmount,enforceCreditLimit:true,description:",
    ) &&
    pos.includes(
      "type:LedgerEntryType.CREDIT_NOTE,credit:creditAmount,description:",
    ) &&
    !pos.includes("sale.customer.currentBalance") &&
    !pos.includes(
      "where:{id:customer.id},data:{currentBalance:nextBalance}",
    ) &&
    !pos.includes(
      "where:{id:sale.customer.id},data:{currentBalance:nextBalance}",
    )
  )
}

function hasCustomerSettlementSourceFoundation(
  schemaSource,
  migrationSource,
  commandSchemaSource,
  serviceSource,
  postingRulesSource,
  rbacSource,
  sensitiveActionSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const commandSchema = commandSchemaSource.replace(/\s+/g, "")
  const service = serviceSource.replace(/\s+/g, "")
  const postingRules = postingRulesSource.replace(/\s+/g, "")
  const rbac = rbacSource.replace(/\s+/g, "")
  const sensitiveAction = sensitiveActionSource.replace(/\s+/g, "")
  const settlementModelStart = schema.indexOf("modelCustomerSettlement{")
  const settlementAllocationModelStart = schema.indexOf(
    "modelCustomerSettlementAllocation{",
    settlementModelStart,
  )
  const settlementModel =
    settlementModelStart >= 0 && settlementAllocationModelStart > settlementModelStart
      ? schema.slice(
          settlementModelStart,
          settlementAllocationModelStart,
        )
      : ""
  const collectionPolicyStart = sensitiveAction.indexOf(
    '"customer.settlement.collect":{',
  )
  const collectionPolicyEnd = sensitiveAction.indexOf(
    "}",
    collectionPolicyStart,
  )
  const collectionPolicy = collectionPolicyStart >= 0
    ? sensitiveAction.slice(collectionPolicyStart, collectionPolicyEnd + 1)
    : ""

  const schemaMarkers = [
    "enumCustomerSettlementStatus{POSTEDREVERSED}",
    "modelCustomerSettlement{",
    "organizationOrganization@relation(fields:[organizationId],references:[id],onDelete:Cascade)",
    "customerCustomer@relation(fields:[customerId],references:[id],onDelete:Restrict)",
    "idempotencyPayloadHashString",
    "ledgerPostingBatchIdString?",
    "postedBusinessEventIdString?",
    "reversalIdempotencyKeyString?",
    "@@unique([organizationId,correlationId])",
    "customerLedgerEntryIdString@unique",
    'customerLedgerEntryCustomerLedgerEntry@relation("CustomerSettlementAllocationLedgerEntry",fields:[customerLedgerEntryId],references:[id],onDelete:Restrict)',
    "modelCustomerSettlementAllocation{",
    "@@unique([customerSettlementId,salesOrderId])",
    "@@index([organizationId,salesOrderId])",
    "customerReceivableDocumentIdString?",
  ]
  const commandSchemaMarkers = [
    "customerSettlementMethodSchema=z.enum([",
    '"CASH"',
    '"CARD"',
    '"MOBILE_MONEY"',
    '"BANK_TRANSFER"',
    '"CHEQUE"',
    "idempotencyKey:z.string().trim().min(8).max(160)",
    "correlationId:z.string().trim().min(8).max(160)",
    "documentHash:hashSchema",
    "evidenceHash:hashSchema",
    "allocations:z.array(customerSettlementAllocationInputSchema).min(1).max(50)",
  ]
  const serviceMarkers = [
    'action:"customer.settlement.collect"',
    "isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
    'isPrismaCode(error,"P2034")',
    'isPrismaCode(error,"P2002")',
    "id:actorId,organizationId,isActive:true",
    "organizationId,idempotencyKey:command.parsed.idempotencyKey",
    "if(allocations.some((allocation)=>allocation.amount.lte(0)))",
    "if(allocationIds.length!==newSet(allocationIds).size)",
    "if(!allocatedTotal.eq(amount))",
    "organizationId,customerId:customer.id,deletedAt:null",
    "ensurePostedCustomerReceivableDocumentInTx(tx,{",
    "constreceivableBySalesOrder=newMap<",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "if(allocation.amount.gt(openAmount))",
    "constsettlement=awaittx.customerSettlement.create({",
    "constledgerEntry=awaitcreateCustomerLedgerEntry(tx,{",
    "type:LedgerEntryType.PAYMENT,credit:allocation.amount",
    "customerReceivableDocumentId:receivable.document.id",
    "constsettlementAllocation=awaittx.customerSettlementAllocation.create({",
    "customerLedgerEntryId:ledgerEntry.id",
    "id:{in:ledgerEntryIds}",
    "entry.referenceId!==allocation.customerReceivableDocumentId",
    "!entry.credit.eq(allocation.amount)",
    "recordCustomerReceivableSettlementAppliedInTx(tx,{",
    "sourceType:AccountingSourceType.CUSTOMER_SETTLEMENT",
    "postingPurpose:AccountingPostingPurpose.CUSTOMER_SETTLEMENT",
    'line.mappingKey==="ACCOUNTS_RECEIVABLE"',
    "createAccountingSourceLink(",
    'action:"CUSTOMER_SETTLEMENT_LEDGER_POSTED"',
    "recordPostedJournalCloseInvalidationInTx(",
    'eventType:"customer.settlement.posted"',
    "markBusinessEventAppliedInTx(tx,organizationId,eventResult.event.id)",
    'action:"CUSTOMER_SETTLEMENT_POSTED"',
  ]
  const postingRuleMarkers = [
    'code:"AR-CUSTOMER-SETTLEMENT"',
    "sourceType:AccountingSourceType.CUSTOMER_SETTLEMENT",
    "postingPurpose:AccountingPostingPurpose.CUSTOMER_SETTLEMENT",
    'mappingKey:"ACCOUNTS_RECEIVABLE"',
    "...DEFAULT_CUSTOMER_SETTLEMENT_POSTING_RULES",
  ]
  const rbacMarkers = [
    '"finance.receivables.collect":"crit"',
    '"finance.receivables.collect":["CUSTOMER_PAYMENTS_PROCESS"]',
  ]
  const sensitiveActionMarkers = [
    'permission:"finance.receivables.collect"',
    'riskTier:"critical"',
    'requiredAssurance:"L1"',
    "freshAuthMaxAgeSeconds:300",
  ]
  const settlementCreateIndex = service.indexOf(
    "constsettlement=awaittx.customerSettlement.create(",
  )
  const customerLedgerIndex = service.indexOf(
    "constledgerEntry=awaitcreateCustomerLedgerEntry(",
  )
  const settlementAllocationIndex = service.indexOf(
    "constsettlementAllocation=awaittx.customerSettlementAllocation.create(",
  )
  const postingIndex = service.indexOf(
    "constposting=awaitpostCustomerSettlementInTx(",
  )
  const eventIndex = service.indexOf(
    "consteventResult=awaitrecordBusinessEventInTx(",
  )
  const completionIndex = service.indexOf(
    "constcompleted=awaittx.customerSettlement.update(",
  )

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    settlementModel.includes(
      "@@unique([organizationId,idempotencyKey])",
    ) &&
    migrationSource.includes('CREATE TYPE "CustomerSettlementStatus"') &&
    migrationSource.includes('CREATE TABLE "customer_settlements"') &&
    migrationSource.includes('CREATE TABLE "customer_settlement_allocations"') &&
    migrationSource.includes("customer_settlements_organizationId_idempotencyKey_key") &&
    migrationSource.includes("customer_settlement_allocations_customerSettlementId_salesOrderId_key") &&
    migrationSource.includes('"customerLedgerEntryId" TEXT NOT NULL') &&
    migrationSource.includes("customer_settlement_allocations_customerLedgerEntryId_key") &&
    migrationSource.includes("customer_settlement_allocations_customerLedgerEntryId_fkey") &&
    commandSchemaMarkers.every((marker) => commandSchema.includes(marker)) &&
    serviceMarkers.every((marker) => service.includes(marker)) &&
    postingRuleMarkers.every((marker) => postingRules.includes(marker)) &&
    rbacMarkers.every((marker) => rbac.includes(marker)) &&
    sensitiveAction.includes('|"customer.settlement.collect"') &&
    sensitiveActionMarkers.every((marker) =>
      collectionPolicy.includes(marker)) &&
    settlementCreateIndex >= 0 &&
    customerLedgerIndex > settlementCreateIndex &&
    settlementAllocationIndex > customerLedgerIndex &&
    postingIndex > settlementAllocationIndex &&
    eventIndex > postingIndex &&
    completionIndex > eventIndex &&
    !service.includes("salesOrder.paymentStatus") &&
    !service.includes("tx.payment.create(")
  )
}

function hasCustomerSettlementCompensatingReversalFoundation(
  schemaSource,
  migrationSource,
  commandSchemaSource,
  reversalServiceSource,
  customerLedgerSource,
  arOpenItemSource,
  postingServiceSource,
  permissionsSource,
  rbacSource,
  sensitiveActionSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const commandSchema = commandSchemaSource.replace(/\s+/g, "")
  const reversalService = reversalServiceSource.replace(/\s+/g, "")
  const customerLedger = customerLedgerSource.replace(/\s+/g, "")
  const arOpenItem = arOpenItemSource.replace(/\s+/g, "")
  const postingService = postingServiceSource.replace(/\s+/g, "")
  const permissions = permissionsSource.replace(/\s+/g, "")
  const rbac = rbacSource.replace(/\s+/g, "")
  const sensitiveAction = sensitiveActionSource.replace(/\s+/g, "")
  const reversalPolicyStart = sensitiveAction.indexOf(
    '"customer.settlement.reverse":{',
  )
  const reversalPolicyEnd = sensitiveAction.indexOf(
    "}",
    reversalPolicyStart,
  )
  const reversalPolicy = reversalPolicyStart >= 0
    ? sensitiveAction.slice(reversalPolicyStart, reversalPolicyEnd + 1)
    : ""

  const schemaMarkers = [
    "PAYMENT_REVERSAL",
    "reversalDateDateTime?",
    "reversalIdempotencyPayloadHashString?",
    "reversalCorrelationIdString?",
    "reversalDocumentHashString?",
    "reversalAccountingSourceLinkIdString?",
    'settlementAllocationCustomerSettlementAllocation?@relation("CustomerSettlementAllocationLedgerEntry")',
    'settlementReversalAllocationCustomerSettlementAllocation?@relation("CustomerSettlementAllocationReversalLedgerEntry")',
    "reversalCustomerLedgerEntryIdString?@unique",
    'reversalCustomerLedgerEntryCustomerLedgerEntry?@relation("CustomerSettlementAllocationReversalLedgerEntry",fields:[reversalCustomerLedgerEntryId],references:[id],onDelete:Restrict)',
    '@@unique([organizationId,reversalCorrelationId],map:"customer_settlements_reversal_correlation_key")',
  ]
  const migrationMarkers = [
    "ALTER TYPE \"LedgerEntryType\" ADD VALUE 'PAYMENT_REVERSAL'",
    'ADD COLUMN "reversalIdempotencyPayloadHash" TEXT',
    'ADD COLUMN "reversalCorrelationId" TEXT',
    'ADD COLUMN "reversalAccountingSourceLinkId" TEXT',
    "customer_settlements_reversal_correlation_key",
    "customer_settlement_allocations_reversalCustomerLedgerEntryId_key",
    "customer_settlement_allocations_reversalCustomerLedgerEntryId_fkey",
    '"status" = \'POSTED\'',
    '"reversalIdempotencyPayloadHash" IS NULL',
    '"status" = \'REVERSED\'',
    '"reversedById" <> "receivedById"',
    'char_length(btrim("reversalReason")) BETWEEN 3 AND 500',
    '"reversalDate" >= "settlementDate"',
  ]
  const commandMarkers = [
    "reverseCustomerSettlementInputSchema=z.object({",
    "customerSettlementId:idSchema",
    "reversalDate:z.union([z.date(),z.string().trim().min(1)])",
    "reason:z.string().trim().min(3).max(500)",
    "idempotencyKey:z.string().trim().min(8).max(160)",
    "correlationId:z.string().trim().min(8).max(160)",
    "documentHash:hashSchema",
    "evidenceHash:hashSchema",
  ]
  const serviceMarkers = [
    "typeCustomerSettlementReversalControlContext=",
    "freshAuth.claims.userId!==actorId",
    "freshAuth.claims.tenantId!==organizationId",
    "freshAuth.claims.assuranceOrganizationId!==organizationId",
    "freshAuth.claims.assuranceLevel<SESSION_ASSURANCE_LEVEL.PASSWORD",
    "freshAuth.claims.lastAuthAt!==lastAuthAtMs",
    "organizationId,actorId,customerSettlementId:parsed.customerSettlementId",
    'action:"customer.settlement.reverse"',
    "subjectActorId:settlement.receivedById",
    "assertReplayMatches(settlement,command,actorId)",
    "constnow=newDate()",
    "isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
    'isPrismaCode(error,"P2034")',
    'isPrismaCode(error,"P2002")',
    "type:LedgerEntryType.PAYMENT_REVERSAL,debit:allocation.amount",
    "reversalCustomerLedgerEntryId:ledgerEntry.id",
    "if(allocationClaim.count!==1)",
    "constposting=awaitpostReversalInTx(",
    'eventType:"customer.settlement.reversed"',
    "markBusinessEventAppliedInTx(tx,organizationId,eventResult.event.id)",
    "tx.businessEvent.findFirst({",
    'status:"APPLIED"',
    "reversalEvent.payloadHash!==expectedEventPayloadHash",
    "constcompletedClaim=awaittx.customerSettlement.updateMany({",
    "status:CustomerSettlementStatus.POSTED",
    "reversalIdempotencyPayloadHash:null",
    "reversalBusinessEventId:null",
    "status:CustomerSettlementStatus.REVERSED",
    "reversalAccountingSourceLinkId:posting.sourceLinkId",
    "if(completedClaim.count!==1)",
    "return{settlementId:settlement.id",
  ]
  const ledgerMarkers = [
    "CUSTOMER_DEBIT_TYPES=newSet<LedgerEntryType>([",
    "LedgerEntryType.PAYMENT_REVERSAL",
  ]
  const arMarkers = [
    "client.customerReceivableDocument.findMany({",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "lifecycleStates:{",
    "stateHash:state.stateHash",
    "RECEIVABLE_ALLOCATION_REVERSAL_TYPES=newSet<LedgerEntryType>([LedgerEntryType.PAYMENT_REVERSAL,])",
    "?moneyText(money(entry.debit).negated())",
  ]
  const postingMarkers = [
    "original.sourceType===AccountingSourceType.CUSTOMER_SETTLEMENT",
    'action:"JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED"',
    "return{sourceOwnedBlocked:trueasconst}",
    "if(\"sourceOwnedBlocked\"inresult&&result.sourceOwnedBlocked)",
  ]
  const sensitiveActionMarkers = [
    'permission:\"finance.receivables.reverse\"',
    'riskTier:\"critical\"',
    'requiredAssurance:\"L1\"',
    "freshAuthMaxAgeSeconds:300",
    "blockSelfApproval:true",
  ]
  const ledgerIndex = reversalService.indexOf(
    "constledgerEntry=awaitcreateCustomerLedgerEntry(tx,{",
  )
  const allocationLinkIndex = reversalService.indexOf(
    "constallocationClaim=awaittx.customerSettlementAllocation.updateMany({",
  )
  const postingIndex = reversalService.indexOf(
    "constposting=awaitpostReversalInTx(",
  )
  const eventIndex = reversalService.indexOf(
    "consteventResult=awaitrecordBusinessEventInTx(",
  )
  const completionIndex = reversalService.indexOf(
    "constcompletedClaim=awaittx.customerSettlement.updateMany({",
  )

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    migrationMarkers.every((marker) => migrationSource.includes(marker)) &&
    commandMarkers.every((marker) => commandSchema.includes(marker)) &&
    serviceMarkers.every((marker) => reversalService.includes(marker)) &&
    ledgerMarkers.every((marker) => customerLedger.includes(marker)) &&
    arMarkers.every((marker) => arOpenItem.includes(marker)) &&
    postingMarkers.every((marker) => postingService.includes(marker)) &&
    permissions.includes('\"finance.receivables.reverse\"') &&
    rbac.includes('\"finance.receivables.reverse\":\"crit\"') &&
    !rbac.includes(
      '\"finance.receivables.reverse\":[\"CUSTOMER_PAYMENTS_PROCESS\"]',
    ) &&
    sensitiveAction.includes('|"customer.settlement.reverse"') &&
    sensitiveActionMarkers.every((marker) =>
      reversalPolicy.includes(marker),
    ) &&
    ledgerIndex >= 0 &&
    allocationLinkIndex > ledgerIndex &&
    postingIndex > allocationLinkIndex &&
    eventIndex > postingIndex &&
    completionIndex > eventIndex &&
    !reversalService.includes("tx.customerSettlement.update({") &&
    !reversalService.includes("now:control.now") &&
    !reversalService.includes("return{settlement,")
  )
}

function hasPostedCustomerReceivableFoundation(
  schemaSource,
  migrationSource,
  documentServiceSource,
  lifecycleServiceSource,
  backfillServiceSource,
  settlementServiceSource,
  reversalServiceSource,
  posServiceSource,
  arOpenItemSource,
  testSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const documentService = documentServiceSource.replace(/\s+/g, "")
  const lifecycleService = lifecycleServiceSource.replace(/\s+/g, "")
  const backfillService = backfillServiceSource.replace(/\s+/g, "")
  const settlementService = settlementServiceSource.replace(/\s+/g, "")
  const reversalService = reversalServiceSource.replace(/\s+/g, "")
  const posService = posServiceSource.replace(/\s+/g, "")
  const arOpenItem = arOpenItemSource.replace(/\s+/g, "")

  const schemaMarkers = [
    "enumCustomerReceivableDocumentStatus{",
    "modelCustomerReceivableDocument{",
    "sourceSalesOrderSalesOrder@relation(fields:[sourceSalesOrderId],references:[id],onDelete:Restrict)",
    "organizationSnapshotJson",
    "customerSnapshotJson",
    "sourceSnapshotJson",
    "documentHashString",
    "sourceEvidenceHashString",
    "metadataHashString",
    "supersedesDocumentIdString?",
    "modelCustomerReceivableDocumentState{",
    "previousStateHashString?",
    "stateHashString",
    "businessEventIdString?",
    "@@unique([organizationId,documentId,version])",
    "customerReceivableDocumentIdString?",
  ]
  const migrationMarkers = [
    'CREATE TYPE "CustomerReceivableDocumentStatus" AS ENUM',
    'CREATE TABLE "customer_receivable_documents"',
    'CREATE TABLE "customer_receivable_document_states"',
    "customer_receivable_documents_money_check",
    "customer_receivable_documents_hash_check",
    "customer_receivable_documents_correction_check",
    "customer_receivable_document_states_lineage_check",
    "customer_receivable_document_states_reason_check",
    "customer_receivable_documents_prevent_mutation_trigger",
    "customer_receivable_document_states_prevent_mutation_trigger",
    "customer_settlement_allocations_prevent_receivable_relink_trigger",
    "Cannot relink customer settlement allocation",
  ]
  const documentMarkers = [
    'CUSTOMER_RECEIVABLE_REFERENCE_TYPE="CUSTOMER_RECEIVABLE_DOCUMENT"asconst',
    "sourceSalesOrderId:salesOrderId,version:1",
    '_sum:{debit:true,credit:true}',
    "initialUnpaidAmount.lt(0)",
    "CustomerReceivableDocumentStatus.PARTIALLY_PAID",
    "CustomerReceivableDocumentStatus.PAID",
    "organizationSnapshot:receivableJson(organizationSnapshot)",
    "customerSnapshot:receivableJson(customerSnapshot)",
    "sourceSnapshot:receivableJson(sourceSnapshot)",
    "constsourceEvidenceHash=hashBusinessPayload(sourceSnapshot)",
    "constdocumentHash=hashBusinessPayload({",
    'eventType:"customer.receivable.posted"',
    "conststate=awaittx.customerReceivableDocumentState.create({",
    'action:"CUSTOMER_RECEIVABLE_DOCUMENT_POSTED"',
  ]
  const lifecycleMarkers = [
    "appendCustomerReceivableLifecycleStateInTx",
    "assertTransition(latestState.status,input.status)",
    "previousStateHash:latestState.stateHash",
    'eventType:"customer.receivable.lifecycle.changed"',
    "recordCustomerReceivableSettlementAppliedInTx",
    "recordCustomerReceivableSettlementReversedInTx",
    "voidCustomerReceivableDocumentInTx",
    'action:"CUSTOMER_RECEIVABLE_LIFECYCLE_APPENDED"',
  ]
  const backfillMarkers = [
    "assessCustomerReceivableBackfillReadiness",
    "legacy_sales_order_ledger_references",
    "unlinked_settlement_allocations",
    "documents_missing_initial_state",
    "malformed_document_hashes",
    "isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "customerReceivableDocumentId:ensured.document.id",
    'action:"CUSTOMER_RECEIVABLE_LEGACY_SOURCE_LINKED"',
  ]
  const settlementMarkers = [
    "ensurePostedCustomerReceivableDocumentInTx(tx,{",
    "constreceivableBySalesOrder=newMap<",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "customerReceivableDocumentId:receivable.document.id",
    "recordCustomerReceivableSettlementAppliedInTx(tx,{",
  ]
  const reversalMarkers = [
    "!allocation.customerReceivableDocumentId",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "referenceId:allocation.customerReceivableDocumentId",
    "recordCustomerReceivableSettlementReversedInTx(tx,{",
  ]
  const posMarkers = [
    "ensurePostedCustomerReceivableDocumentInTx(tx,{",
    "initialUnpaidAmount:onAccountAmount",
    "referenceType:CUSTOMER_RECEIVABLE_REFERENCE_TYPE",
    "voidCustomerReceivableDocumentInTx(tx,{",
  ]
  const arMarkers = [
    "client.customerReceivableDocument.findMany({",
    "lifecycleStates:{",
    "effectiveAt:{lte:asOf}",
    "createdAt:{lte:recordedThrough}",
    'evidenceGrade:"posted"',
    "documentHash:document.documentHash",
    "stateHash:state.stateHash",
    "assertReceivableStateConservation(",
  ]
  const documentCreateIndex = documentService.indexOf(
    "constdocument=awaittx.customerReceivableDocument.create(",
  )
  const documentEventIndex = documentService.indexOf(
    "constevent=awaitrecordBusinessEventInTx(",
  )
  const documentStateIndex = documentService.indexOf(
    "conststate=awaittx.customerReceivableDocumentState.create(",
  )
  const lifecycleEventIndex = lifecycleService.indexOf(
    "constevent=awaitrecordBusinessEventInTx(",
  )
  const lifecycleStateIndex = lifecycleService.indexOf(
    "conststate=awaittx.customerReceivableDocumentState.create(",
  )

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    migrationMarkers.every((marker) => migrationSource.includes(marker)) &&
    documentMarkers.every((marker) => documentService.includes(marker)) &&
    lifecycleMarkers.every((marker) => lifecycleService.includes(marker)) &&
    backfillMarkers.every((marker) => backfillService.includes(marker)) &&
    settlementMarkers.every((marker) => settlementService.includes(marker)) &&
    reversalMarkers.every((marker) => reversalService.includes(marker)) &&
    posMarkers.every((marker) => posService.includes(marker)) &&
    arMarkers.every((marker) => arOpenItem.includes(marker)) &&
    testSource.includes("freezes tenant, customer, source, monetary, hash") &&
    testSource.includes("appends a conserved hash-chained state") &&
    testSource.includes("classifies every unresolved release blocker") &&
    testSource.includes("fails closed when no lifecycle state exists") &&
    documentCreateIndex >= 0 &&
    documentEventIndex > documentCreateIndex &&
    documentStateIndex > documentEventIndex &&
    lifecycleEventIndex >= 0 &&
    lifecycleStateIndex > lifecycleEventIndex &&
    !arOpenItem.includes('referenceType==="SALES_ORDER"')
  )
}

function hasImmutableCustomerStatementSnapshotFoundation(
  schemaSource,
  migrationSource,
  statementServiceSource,
  arOpenItemSource,
  testSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const statementService = statementServiceSource.replace(/\s+/g, "")
  const arOpenItem = arOpenItemSource.replace(/\s+/g, "")
  const schemaMarkers = [
    "modelCustomerStatementSnapshot{",
    "organizationOrganization@relation(fields:[organizationId],references:[id],onDelete:Restrict)",
    "customerCustomer@relation(fields:[customerId],references:[id],onDelete:Restrict)",
    "statementPayloadJson",
    "sourceTablesJson",
    "sourceDocumentHashesJson",
    "sourceStateHashesJson",
    "sourceLedgerEntryIdsJson",
    "contentHashString",
    "idempotencyPayloadHashString",
    "supersedesStatementIdString?",
    '@@unique([organizationId,customerId,periodStart,periodEnd,currency,version],map:"customer_statement_scope_version_key")',
    "@@unique([organizationId,idempotencyKey])",
    "@@unique([organizationId,contentHash])",
  ]
  const migrationMarkers = [
    'CREATE TABLE "customer_statement_snapshots"',
    "customer_statement_scope_check",
    "customer_statement_money_check",
    '"openingBalance" + "periodDebits" - "periodCredits" = "closingBalance"',
    "customer_statement_count_check",
    '"sourceItemCount" = "includedItemCount"',
    '"truncated" = false',
    "customer_statement_json_shape_check",
    "customer_statement_hash_check",
    "customer_statement_snapshots_supersedesStatementId_fkey",
    "customer_statement_snapshots_prevent_mutation_trigger",
    "Customer statement snapshots are immutable and append-only",
  ]
  const serviceMarkers = [
    "CUSTOMER_STATEMENT_ITEM_LIMIT=500",
    '"customer_receivable_documents"',
    '"customer_receivable_document_states"',
    '"customer_ledger_entries"',
    "constopeningAsOf=newDate(command.periodStart.getTime()-1)",
    "constopening=awaitgetCustomerAROpenItems({",
    "constclosing=awaitgetCustomerAROpenItems({",
    "recordedThrough:command.generatedAt",
    "client:tx",
    "constlines=buildStatementLines(openingItems,closingItems,command)",
    "lines.length>CUSTOMER_STATEMENT_ITEM_LIMIT",
    "openingBalance.plus(periodDebits).minus(periodCredits).eq(closingBalance)",
    'schemaVersion:"customer-statement.v1"',
    'profile:"CUSTOMER_STATEMENT_EXTERNAL_SAFE_V1"',
    "contactAndAuthenticationFieldsIncluded:false",
    "documentHashes:sourceDocumentHashes",
    "stateHashes:sourceStateHashes",
    "ledgerEntryIds:sourceLedgerEntryIds",
    "constcontentHash=hashBusinessPayload(payload)",
    'eventType:"customer.statement.snapshot.created"',
    "constsnapshot=awaittx.customerStatementSnapshot.create({",
    "supersedesStatementId:latest?.id??null",
    "markBusinessEventAppliedInTx(tx,command.organizationId,event.event.id)",
    'action:"CUSTOMER_STATEMENT_SNAPSHOT_CREATED"',
    "isolationLevel:Prisma.TransactionIsolationLevel.Serializable",
    'isPrismaCode(error,"P2034")',
    'isPrismaCode(error,"P2002")',
    "outboxMessages:[]",
  ]
  const arMarkers = [
    "initialPaidAmount:string",
    "initialUnpaidAmount:string",
    "initialPaidAmount:moneyText(document.initialPaidAmount)",
    "initialUnpaidAmount:moneyText(document.initialUnpaidAmount)",
    'evidenceGrade:"posted"',
  ]
  const eventIndex = statementService.indexOf(
    "constevent=awaitrecordBusinessEventInTx(",
  )
  const snapshotIndex = statementService.indexOf(
    "constsnapshot=awaittx.customerStatementSnapshot.create(",
  )
  const appliedIndex = statementService.indexOf(
    "awaitmarkBusinessEventAppliedInTx(",
  )
  const openItemCalls =
    statementService.match(/getCustomerAROpenItems\(\{/g)?.length ?? 0

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    migrationMarkers.every((marker) => migrationSource.includes(marker)) &&
    serviceMarkers.every((marker) => statementService.includes(marker)) &&
    arMarkers.every((marker) => arOpenItem.includes(marker)) &&
    testSource.includes("freezes a complete redacted statement") &&
    testSource.includes("immutable initial paid evidence") &&
    testSource.includes("fails closed when movement evidence") &&
    testSource.includes("fails closed instead of persisting a truncated statement") &&
    testSource.includes("replays the exact idempotent snapshot") &&
    testSource.includes("supersedes the prior scope snapshot") &&
    openItemCalls === 2 &&
    eventIndex >= 0 &&
    snapshotIndex > eventIndex &&
    appliedIndex > snapshotIndex &&
    !statementService.includes("PublicReceiptAccessToken") &&
    !statementService.includes("WHATSAPP") &&
    !statementService.includes("EMAIL")
  )
}

function hasSignedCustomerStatementExternalAccessFoundation(
  schemaSource,
  migrationSource,
  tokenServiceSource,
  sharedTokenHelperSource,
  accessServiceSource,
  recipientActionServiceSource,
  viewRouteSource,
  actionRouteSource,
  testSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const tokenService = tokenServiceSource.replace(/\s+/g, "")
  const sharedTokenHelper = sharedTokenHelperSource.replace(/\s+/g, "")
  const accessService = accessServiceSource.replace(/\s+/g, "")
  const recipientActionService = recipientActionServiceSource.replace(/\s+/g, "")
  const viewRoute = viewRouteSource.replace(/\s+/g, "")
  const actionRoute = actionRouteSource.replace(/\s+/g, "")
  const schemaMarkers = [
    "modelCustomerStatementAccessToken{",
    "tokenHashString",
    "jtiHashString",
    "statementContentHashString",
    "allowViewBoolean@default(true)",
    "allowDisputeBoolean@default(false)",
    "allowPromiseToPayBoolean@default(false)",
    "modelCustomerStatementAccessLog{",
    "tokenHashPrefixString",
    "ipHashString?",
    "userAgentHashString?",
    "responseHashString?",
    "modelCustomerStatementRecipientAction{",
    "recipientNoteString",
    "noteHashString",
    "payloadHashString",
    "modelCustomerStatementRecipientActionState{",
    "previousStateHashString?",
    "stateHashString",
  ]
  const migrationMarkers = [
    'CREATE TABLE "customer_statement_access_tokens"',
    'CREATE TABLE "customer_statement_access_logs"',
    'CREATE TABLE "customer_statement_recipient_actions"',
    'CREATE TABLE "customer_statement_recipient_action_states"',
    "customer_statement_access_tokens_hash_check",
    "customer_statement_access_tokens_scope_check",
    "customer_statement_access_tokens_guard_mutation_trigger",
    "customer_statement_access_logs_prevent_mutation_trigger",
    "customer_statement_recipient_actions_prevent_mutation_trigger",
    "customer_statement_recipient_action_states_prevent_mutation_trigger",
  ]
  const tokenMarkers = [
    'TOKEN_SCOPE="customer_statement"',
    'configuredExternalAccessSecret(["AQSTOQFLOW_STATEMENT_TOKEN_SECRET","STATEMENT_TOKEN_SECRET",])',
    "signExternalAccessPayload(payload,secret)",
    "verifyExternalAccessSignature({token:input.token,secret,})",
    "statementContentHash:input.statementContentHash",
    "payload.statementSnapshotId!==input.statementSnapshotId",
    "payload.exp<=nowSeconds",
  ]
  const sharedTokenHelperMarkers = [
    'import{createHmac,timingSafeEqual}from"node:crypto"',
    "secret.length>=32",
    'createHmac("sha256",secret)',
    "leftBuffer.length===rightBuffer.length",
    "timingSafeEqual(leftBuffer,rightBuffer)",
  ]
  const accessMarkers = [
    "hashCustomerStatementAccessValue(token)",
    "hashCustomerStatementAccessValue(jti)",
    "tokenHash,jtiHash,statementContentHash:snapshot.contentHash",
    "organizationId:payload.organizationId",
    "statementSnapshotId,tokenHash,jtiHash,statementContentHash:payload.statementContentHash",
    "hashBusinessPayload(snapshot.statementPayload)!==snapshot.contentHash",
    "row.status!==CustomerStatementAccessTokenStatus.ACTIVE",
    "!permissionAllowed(input.action,row,payload.permissions)",
    "FORBIDDEN_EXTERNAL_KEYS.has(key)",
    "ipHash:optionalHash(input.ipAddress)",
    "userAgentHash:optionalHash(input.userAgent)",
    "tx.customerStatementAccessToken.updateMany({",
    "status:CustomerStatementAccessTokenStatus.REVOKED",
    'action:"CUSTOMER_STATEMENT_ACCESS_TOKEN_REVOKED"',
  ]
  const actionMarkers = [
    "requestedAmount.gt(opening.plus(debit))",
    "requestedAmount.gt(access.snapshot.closingBalance)",
    'eventType:"customer.statement.recipient_action.created"',
    "constaction=awaittx.customerStatementRecipientAction.create({",
    "conststate=awaittx.customerStatementRecipientActionState.create({",
    "previousStateHash:null",
    "noteHash",
    "payloadHash",
    "markBusinessEventAppliedInTx(",
    "recordCustomerStatementAccessInTx(tx,{",
  ]

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    migrationMarkers.every((marker) => migrationSource.includes(marker)) &&
    tokenMarkers.every((marker) => tokenService.includes(marker)) &&
    sharedTokenHelperMarkers.every((marker) =>
      sharedTokenHelper.includes(marker),
    ) &&
    accessMarkers.every((marker) => accessService.includes(marker)) &&
    actionMarkers.every((marker) => recipientActionService.includes(marker)) &&
    viewRoute.includes('if(!token)thrownewNotFoundError("Statementnotfound")') &&
    viewRoute.includes('"Cache-Control","private,no-store,max-age=0"') &&
    actionRoute.includes('if(!token)thrownewNotFoundError("Statementnotfound")') &&
    actionRoute.includes('actionType!=="DISPUTE"&&actionType!=="PROMISE_TO_PAY"') &&
    actionRoute.includes('status:result.replayed?200:201') &&
    actionRoute.includes('"Cache-Control","private,no-store,max-age=0"') &&
    testSource.includes("rejects expired tokens and unsafe secret") &&
    testSource.includes("returns a redacted view and appends only hashed request/access evidence") &&
    testSource.includes("rejects revoked access before counters or view logs are written") &&
    testSource.includes("creates an immutable dispute with an OPEN hash-chained state") &&
    testSource.includes("creates a bounded promise-to-pay") &&
    testSource.includes("rejects missing tokens without looking up a statement") &&
    testSource.includes("rejects missing tokens before parsing recipient evidence")
  )
}

function hasConsentedCustomerReferralLaunchFoundation(
  schemaSource,
  deliveryMigrationSource,
  inviteMigrationSource,
  statementEnvelopeSource,
  statementDeliverySource,
  statementWorkerSource,
  inviteEnvelopeSource,
  inviteServiceSource,
  inviteWorkerSource,
  referralSource,
  referralRouteSource,
  registrationServiceSource,
  registrationSurfacesSource,
  statementActionsSource,
  accountantActionsSource,
  internalWorkflowSource,
  publicPortalSource,
  workerRunnerSource,
  packageSource,
  testSource,
) {
  const schema = schemaSource.replace(/\s+/g, "")
  const statementEnvelope = statementEnvelopeSource.replace(/\s+/g, "")
  const statementDelivery = statementDeliverySource.replace(/\s+/g, "")
  const statementWorker = statementWorkerSource.replace(/\s+/g, "")
  const inviteEnvelope = inviteEnvelopeSource.replace(/\s+/g, "")
  const inviteService = inviteServiceSource.replace(/\s+/g, "")
  const inviteWorker = inviteWorkerSource.replace(/\s+/g, "")
  const referral = referralSource.replace(/\s+/g, "")
  const referralRoute = referralRouteSource.replace(/\s+/g, "")
  const registrationService = registrationServiceSource.replace(/\s+/g, "")
  const registrationSurfaces = registrationSurfacesSource.replace(/\s+/g, "")
  const statementActions = statementActionsSource.replace(/\s+/g, "")
  const accountantActions = accountantActionsSource.replace(/\s+/g, "")
  const internalWorkflow = internalWorkflowSource.replace(/\s+/g, "")
  const publicPortal = publicPortalSource.replace(/\s+/g, "")
  const workerRunner = workerRunnerSource.replace(/\s+/g, "")
  const packageJson = packageSource.replace(/\s+/g, "")

  const schemaMarkers = [
    "modelReferralAttribution{",
    "modelReferralAttributionEvent{",
    "modelCustomerStatementDelivery{",
    "modelCustomerStatementDeliveryState{",
    "modelAccountantClientInvite{",
    "inviteTokenHashString@unique",
    "consentEvidenceHashString",
    "modelAccountantClientInviteState{",
  ]
  const deliveryMigrationMarkers = [
    'CREATETABLE"referral_attributions"',
    'CREATETABLE"referral_attribution_events"',
    'CREATETABLE"customer_statement_deliveries"',
    'CREATETABLE"customer_statement_delivery_states"',
    "referral_attributions_prevent_mutation_trigger",
    "referral_attribution_events_prevent_mutation_trigger",
    "customer_statement_deliveries_prevent_mutation_trigger",
    "customer_statement_delivery_states_prevent_mutation_trigger",
  ]
  const inviteMigrationMarkers = [
    'CREATETABLE"accountant_client_invites"',
    'CREATETABLE"accountant_client_invite_states"',
    "accountant_client_invites_token_hash_check",
    "accountant_client_invites_email_check",
    "accountant_client_invites_consent_check",
    "accountant_client_invites_prevent_mutation_trigger",
    "accountant_client_invite_states_prevent_mutation_trigger",
  ]
  const statementEnvelopeMarkers = [
    'Buffer.from("customer_statement_delivery.v1","utf8")',
    "environment.AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY",
    'createCipheriv("aes-256-gcm",key,iv)',
    "cipher.setAAD(ENVELOPE_AAD)",
    'createDecipheriv("aes-256-gcm",key,iv)',
    "decipher.setAuthTag(tag)",
  ]
  const statementDeliveryMarkers = [
    "!SHA256_EVIDENCE_PATTERN.test(input.consentEvidenceHash)",
    "tx.referralAttribution.create({",
    "issueCustomerStatementAccessTokenInTx(tx,{",
    "sealCustomerStatementDeliveryEnvelope({",
    'schemaVersion:"customer-statement-delivery.v1"',
    "rawDestinationStored:false",
    "rawTokenStored:false",
    'providerEnvelope:"AES_256_GCM"',
    "tx.customerStatementDelivery.create({",
    "tx.customerStatementDeliveryState.create({",
  ]
  const statementWorkerMarkers = [
    "sha256(payload.sealedEnvelope)!==payload.sealedEnvelopeHash",
    "delivery.statementContentHash!==payload.statementContentHash",
    "destinationHash(delivery.channel,envelope.destination)!==payload.destinationHash",
    'delivery.token.status!=="ACTIVE"',
    "delivery.token.expiresAt.getTime()<=now.getTime()",
    "dependencies.sendCustomerStatementDelivery({",
  ]
  const inviteEnvelopeMarkers = [
    'Buffer.from("accountant_client_invite_delivery.v1","utf8")',
    "environment.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY",
    'createCipheriv("aes-256-gcm",key,iv)',
    "cipher.setAAD(ENVELOPE_AAD)",
    'createDecipheriv("aes-256-gcm",key,iv)',
    "decipher.setAuthTag(tag)",
  ]
  const inviteServiceMarkers = [
    'constinviteToken=randomBytes(32).toString("base64url")',
    "inviteTokenHash=hashBusinessPayload(inviteToken)",
    '"?invite="+encodeURIComponent(inviteToken)',
    "sealAccountantClientInviteEnvelope({",
    "rawEmailStored:false",
    "rawInviteTokenStored:false",
    'providerEnvelope:"AES_256_GCM"',
    "tx.accountantClientInvite.create({",
    "tx.accountantClientInviteState.create({",
    "inviteTokenMatches(input.inviteToken,invite.inviteTokenHash)",
    "timingSafeEqual(actual,expected)",
    "tx.accountantAccessGrant.create({",
    'consentContract:"explicit-client-and-recipient-consent.v1"',
    "previousStateHash:current.stateHash",
  ]
  const inviteWorkerMarkers = [
    "hashBusinessPayload(payload.sealedEnvelope)!==payload.sealedEnvelopeHash",
    'constinviteToken=inviteUrl.searchParams.get("invite")??""',
    "hashBusinessPayload(inviteToken)!==invite.inviteTokenHash",
    "dependencies.sendAccountantClientInvite({",
  ]
  const referralMarkers = [
    "accountantClientInvite:{",
    "select:{inviteTokenHash:true}",
    "inviteTokenMatches(",
    "attribution.accountantClientInvite.inviteTokenHash",
    'params.set("invite",inviteToken)',
    "acceptAccountantClientInviteInTx(tx,{",
    "inviteToken:input.accountantInviteToken??",
    "recipientAccepted:input.accountantInviteAccepted===true",
  ]
  const statementWorkerIntegrityIndex = statementWorker.indexOf(
    "delivery.statementContentHash!==payload.statementContentHash",
  )
  const statementProviderIndex = statementWorker.indexOf(
    "dependencies.sendCustomerStatementDelivery({",
  )
  const inviteWorkerIntegrityIndex = inviteWorker.indexOf(
    "hashBusinessPayload(inviteToken)!==invite.inviteTokenHash",
  )
  const inviteProviderIndex = inviteWorker.indexOf(
    "dependencies.sendAccountantClientInvite({",
  )
  const registrationInviteSurfaceCount =
    registrationSurfaces.match(/Boolean\(params\.get\("invite"\)\)/g)?.length ??
    0
  const registrationTokenFieldCount =
    registrationSurfaces.match(
      /accountantInviteToken:params\.get\("invite"\)\|\|undefined/g,
    )?.length ?? 0

  return (
    schemaMarkers.every((marker) => schema.includes(marker)) &&
    deliveryMigrationMarkers.every((marker) =>
      deliveryMigrationSource.replace(/\s+/g, "").includes(marker)
    ) &&
    inviteMigrationMarkers.every((marker) =>
      inviteMigrationSource.replace(/\s+/g, "").includes(marker)
    ) &&
    statementEnvelopeMarkers.every((marker) =>
      statementEnvelope.includes(marker)
    ) &&
    statementDeliveryMarkers.every((marker) =>
      statementDelivery.includes(marker)
    ) &&
    statementWorkerMarkers.every((marker) => statementWorker.includes(marker)) &&
    inviteEnvelopeMarkers.every((marker) => inviteEnvelope.includes(marker)) &&
    inviteServiceMarkers.every((marker) => inviteService.includes(marker)) &&
    inviteWorkerMarkers.every((marker) => inviteWorker.includes(marker)) &&
    referralMarkers.every((marker) => referral.includes(marker)) &&
    referralRoute.includes('requestUrl.searchParams.get("invite")') &&
    registrationService.includes(
      "accountantInviteToken:data.accountantInviteToken",
    ) &&
    registrationService.includes(
      "accountantInviteAccepted:data.accountantInviteAccepted===true",
    ) &&
    registrationInviteSurfaceCount >= 2 &&
    registrationTokenFieldCount >= 2 &&
    registrationSurfaces.includes(
      "Youmustaccepttheclientmandate.",
    ) &&
    statementActions.includes(
      'permission:"accounting.exports.create"',
    ) &&
    (statementActions.match(/moduleSlug:"accounting"/g)?.length ?? 0) >= 3 &&
    (statementActions.match(/mode:"enforce"/g)?.length ?? 0) >= 3 &&
    (statementActions.match(/audit:true/g)?.length ?? 0) >= 3 &&
    statementActions.includes('surface:"actions/accounting/customer-statement.actions.ts:create"') &&
    statementActions.includes('surface:"actions/accounting/customer-statement.actions.ts:deliver"') &&
    statementActions.includes('surface:"actions/accounting/customer-statement.actions.ts:revoke"') &&
    testSource.includes("registers every statement mutation behind the enforced accounting entitlement") &&
    testSource.includes("does not enumerate customer data when Accounting is not entitled") &&
    statementActions.includes("organizationId:ctx.orgId") &&
    statementActions.includes("issuedById:ctx.userId") &&
    accountantActions.includes(
      'permission:"accounting.close.accountant.invite"',
    ) &&
    accountantActions.includes(
      "inviteOrGrantAccountantAccess(ctx.orgId,ctx.userId,",
    ) &&
    internalWorkflow.includes('globalThis.crypto.subtle.digest("SHA-256"') &&
    internalWorkflow.includes('consentBasis:"EXPLICIT"') &&
    internalWorkflow.includes("queueCustomerStatementDeliveryAction({") &&
    publicPortal.includes('cache:"no-store"') &&
    publicPortal.includes('credentials:"omit"') &&
    publicPortal.includes('referrerPolicy:"no-referrer"') &&
    publicPortal.includes('method:"POST"') &&
    publicPortal.includes("statement.branding.referralUrl") &&
    workerRunner.includes("service.runCustomerStatementDeliveryWorker(common)") &&
    workerRunner.includes("service.runAccountantClientInviteWorker(common)") &&
    packageJson.includes('"worker:referrals"') &&
    testSource.includes(
      "queues consented email delivery without persisting the raw recipient or token",
    ) &&
    testSource.includes(
      "fails the lease closed before provider access when envelope integrity drifts",
    ) &&
    testSource.includes(
      "queues an immutable, consent-bound invite without persisting raw email",
    ) &&
    testSource.includes(
      "rejects a matching email and referral when the invite secret is wrong",
    ) &&
    testSource.includes(
      "fails closed before provider delivery when the invite secret drifts",
    ) &&
    testSource.includes(
      "rejects an accountant referral click without its secret token",
    ) &&
    testSource.includes(
      "creates an immutable snapshot and queues a consent-hashed delivery",
    ) &&
    testSource.includes(
      "renders the verified snapshot, receivable lines, and branded referral CTA",
    ) &&
    testSource.includes(
      "runs both referral delivery queues with the same bounded scope",
    ) &&
    statementWorkerIntegrityIndex >= 0 &&
    statementProviderIndex > statementWorkerIntegrityIndex &&
    inviteWorkerIntegrityIndex >= 0 &&
    inviteProviderIndex > inviteWorkerIntegrityIndex
  )
}

function stripExecutableComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
}

function extractFunctionBlock(source, startMarker) {
  const start = source.indexOf(startMarker)
  if (start < 0) return ""
  const bodyStart = source.indexOf("{", start + startMarker.length)
  if (bodyStart < 0) return ""

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1
    if (source[index] !== "}") continue
    depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }

  return ""
}

function hasProtectedCustomerSettlementReversalActionBoundary(
  actionSource,
  commandSchemaSource,
) {
  const executableActionSource = stripExecutableComments(actionSource)
  const action = executableActionSource.replace(/\s+/g, "")
  const protectedActionStart = executableActionSource.indexOf(
    "const reverseSettlement = protect",
  )
  const protectedActionEnd = executableActionSource.indexOf(
    "export async function reverseCustomerSettlementAction",
    protectedActionStart,
  )
  const protectedAction = protectedActionStart >= 0 && protectedActionEnd >= 0
    ? executableActionSource
        .slice(protectedActionStart, protectedActionEnd)
        .replace(/\s+/g, "")
    : ""
  const freshAuthVerifier = extractFunctionBlock(
    executableActionSource,
    "function verifiedFreshAuthEvidence",
  ).replace(/\s+/g, "")
  const securityBoundary = `${protectedAction}${freshAuthVerifier}`
  const commandSchema = stripExecutableComments(commandSchemaSource).replace(
    /\s+/g,
    "",
  )
  const reversalSchemaStart = commandSchema.indexOf(
    "reverseCustomerSettlementInputSchema=z.object({",
  )
  const reversalSchemaEnd = commandSchema.indexOf(
    "exporttypeReverseCustomerSettlementInput",
    reversalSchemaStart,
  )
  const reversalSchema = reversalSchemaStart >= 0
    ? commandSchema.slice(
        reversalSchemaStart,
        reversalSchemaEnd >= 0 ? reversalSchemaEnd : undefined,
      )
    : ""
  const wholeActionMarkers = [
    '"useserver"',
    "exportasyncfunctionreverseCustomerSettlementAction(input:unknown){returnreverseSettlement(input)}",
  ]
  const boundaryMarkers = [
    "constreverseSettlement=protect<unknown,CustomerSettlementReversalResult>(",
    'permission:"finance.receivables.reverse"',
    'auditResource:"CustomerSettlement"',
    "auditAllowed:true",
    "freshAuth:{maxAgeSeconds:300}",
    'moduleSlug:"finance"',
    'surface:"actions/finance/customer-settlement.actions.ts:reverseCustomerSettlementAction"',
    'surfaceType:"action"',
    'accessIntent:"write"',
    'mode:"enforce"',
    "audit:true",
    "constfreshAuth=verifiedFreshAuthEvidence(ctx)",
    "constparsed=reverseCustomerSettlementInputSchema.parse(input)",
    "constresult=awaitreverseCustomerSettlementWithControls(parsed,{",
    "organizationId:ctx.orgId",
    "actorId:ctx.userId",
    "actorPermissions:ctx.permissions",
    "actorPermissions:ctx.permissions,freshAuth,})",
    "freshAuth?.lastAuthAtinstanceofDate",
    "freshAuth.claims.userId!==ctx.userId",
    "freshAuth.claims.tenantId!==ctx.orgId",
    "freshAuth.claims.assuranceOrganizationId!==ctx.orgId",
    "!Number.isFinite(freshAuth.claims.assuranceLevel)",
    "freshAuth.claims.assuranceLevel<SESSION_ASSURANCE_LEVEL.PASSWORD",
    "freshAuth.claims.lastAuthAt!==lastAuthAtMs",
    "lastAuthAt:newDate(lastAuthAtMs)",
    "userId:freshAuth.claims.userId",
    "tenantId:freshAuth.claims.tenantId",
    "assuranceOrganizationId:freshAuth.claims.assuranceOrganizationId",
    "assuranceLevel:freshAuth.claims.assuranceLevel",
    "lastAuthAt:freshAuth.claims.lastAuthAt",
    'revalidatePath("/dashboard/finance/receivables","page")',
    'revalidatePath("/dashboard/accounting","page")',
  ]
  const freshAuthDenialGuard = [
    "if(!freshAuth",
    "!Number.isFinite(lastAuthAtMs)",
    "freshAuth.claims.userId!==ctx.userId",
    "freshAuth.claims.tenantId!==ctx.orgId",
    "freshAuth.claims.assuranceOrganizationId!==ctx.orgId",
    "!Number.isFinite(freshAuth.claims.assuranceLevel)",
    "freshAuth.claims.assuranceLevel<SESSION_ASSURANCE_LEVEL.PASSWORD",
    "freshAuth.claims.lastAuthAt!==lastAuthAtMs)",
  ].join("||") + "{thrownewFreshAuthRequiredError()}"
  const freshAuthGuardIndex = freshAuthVerifier.indexOf(freshAuthDenialGuard)
  const freshAuthVerifierBodyStart = freshAuthVerifier.indexOf("{")
  const freshAuthVerifierPrelude =
    freshAuthVerifierBodyStart >= 0 && freshAuthGuardIndex >= 0
      ? freshAuthVerifier.slice(
          freshAuthVerifierBodyStart + 1,
          freshAuthGuardIndex,
        )
      : ""
  const expectedFreshAuthVerifierPrelude = [
    "constfreshAuth=ctx.freshAuth",
    "constlastAuthAtMs=",
    "freshAuth?.lastAuthAtinstanceofDate",
    "?freshAuth.lastAuthAt.getTime()",
    ":Number.NaN",
  ].join("")
  const freshAuthEvidenceReturnIndex = freshAuthVerifier.indexOf(
    "return{lastAuthAt:newDate(lastAuthAtMs)",
  )
  const forbiddenActionMarkers = [
    "Date.now()",
    "...ctx",
    "...input",
    "...freshAuth.claims",
    "organizationId:input.",
    "actorId:input.",
    "actorPermissions:input.",
    "freshAuth:ctx.freshAuth",
  ]
  const forbiddenSchemaMarkers = [
    "organizationId:",
    "orgId:",
    "actorId:",
    "actorPermissions:",
    "freshAuth:",
    "lastAuthAt:",
    "now:",
  ]
  const authIndex = protectedAction.indexOf(
    "constfreshAuth=verifiedFreshAuthEvidence(ctx)",
  )
  const parseIndex = protectedAction.indexOf(
    "constparsed=reverseCustomerSettlementInputSchema.parse(input)",
  )
  const serviceIndex = protectedAction.indexOf(
    "constresult=awaitreverseCustomerSettlementWithControls(parsed,{",
  )
  const financeRevalidationIndex = protectedAction.indexOf(
    'revalidatePath("/dashboard/finance/receivables","page")',
  )
  const accountingRevalidationIndex = protectedAction.indexOf(
    'revalidatePath("/dashboard/accounting","page")',
  )

  return (
    protectedActionStart >= 0 &&
    protectedActionEnd > protectedActionStart &&
    wholeActionMarkers.every((marker) => action.includes(marker)) &&
    boundaryMarkers.every((marker) => securityBoundary.includes(marker)) &&
    freshAuthGuardIndex >= 0 &&
    freshAuthVerifierPrelude === expectedFreshAuthVerifierPrelude &&
    freshAuthEvidenceReturnIndex > freshAuthGuardIndex &&
    reversalSchemaStart >= 0 &&
    forbiddenSchemaMarkers.every(
      (marker) => !reversalSchema.includes(marker),
    ) &&
    forbiddenActionMarkers.every(
      (marker) => !securityBoundary.includes(marker),
    ) &&
    authIndex >= 0 &&
    parseIndex > authIndex &&
    serviceIndex > parseIndex &&
    financeRevalidationIndex > serviceIndex &&
    accountingRevalidationIndex > financeRevalidationIndex
  )
}

function buildReportTrustExportReadiness(root = process.cwd(), options = {}) {
  const accountingService = read(root, "services/accounting/reports.service.ts")
  const accountingAction = read(root, "actions/accounting/reports.actions.ts")
  const analyticsService = read(
    root,
    "services/analytics/financial-reports.service.ts",
  )
  const trustBanner = read(root, "components/reports/report-trust-banner.tsx")
  const reportComponents = [
    "components/reports/financial-summary-report.tsx",
    "components/reports/cash-flow-report.tsx",
    "components/reports/cashier-performance-report.tsx",
    "components/reports/item-performance-report.tsx",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const packageJson = read(root, "package.json")
  const dataTrustService = read(
    root,
    "services/accounting/data-trust.service.ts",
  )
  const dataTrustActions = read(
    root,
    "actions/accounting/data-trust.actions.ts",
  )
  const accountantAccessService = read(
    root,
    "services/accounting/accountant-access.service.ts",
  )
  const accountantAccessActions = read(
    root,
    "actions/accounting/accountant-access.actions.ts",
  )
  const accountantAccessSchema = read(root, "prisma/schema.prisma")
  const accountantAccessManager = read(
    root,
    "components/accounting/AccountantAccessManager.tsx",
  )
  const closePackService = read(
    root,
    "services/accounting/close-assurance-pack.service.ts",
  )
  const closePackActions = read(
    root,
    "actions/accounting/close-assurance.actions.ts",
  )
  const closeAssuranceService = read(
    root,
    "services/accounting/close-assurance.service.ts",
  )
  const missingProofQueueContracts = read(
    root,
    "services/accounting/missing-close-evidence-request-queue-contracts.ts",
  )
  const missingProofQueueService = read(
    root,
    "services/accounting/missing-close-evidence-request-queue.service.ts",
  )
  const accountantMissingProofReviewContracts = read(
    root,
    "services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts",
  )
  const accountantMissingProofReviewService = read(
    root,
    "services/accounting/missing-close-evidence-accountant-review-queue.service.ts",
  )
  const missingProofResponseAcceptanceContracts = read(
    root,
    "services/accounting/missing-close-evidence-response-acceptance-contracts.ts",
  )
  const managerActionCenterContracts = read(
    root,
    "services/manager-action-center/manager-action-center-contracts.ts",
  )
  const managerActionCenterService = read(
    root,
    "services/manager-action-center/manager-action-center.service.ts",
  )
  const accountantPortfolioSurface = [
    "components/accounting/AccountantPortfolio.tsx",
    "components/accounting/AccountantAccessManager.tsx",
    "app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx",
    "app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const customerLedgerService = read(
    root,
    "services/accounting/customer-ledger.service.ts",
  )
  const posService = read(root, "services/pos/pos.service.ts")
  const customerSettlementCommandSchema = read(
    root,
    "services/accounting/customer-settlement.schemas.ts",
  )
  const customerSettlementReversalMigration = read(
    root,
    "prisma/migrations/20260808133000_customer_settlement_compensating_reversal_foundation/migration.sql",
  )
  const customerSettlementReversalService = read(
    root,
    "services/accounting/customer-settlement-reversal.service.ts",
  )
  const customerSettlementReversalActions = read(
    root,
    "actions/finance/customer-settlement.actions.ts",
  )
  const arOpenItemService = read(
    root,
    "services/accounting/ar-open-item.service.ts",
  )
  const postingService = read(
    root,
    "services/accounting/posting.service.ts",
  )
  const permissionsConfig = read(root, "config/permissions.ts")
  const customerSettlementService = read(
    root,
    "services/accounting/customer-settlement.service.ts",
  )
  const customerSettlementMigration = read(
    root,
    "prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql",
  )
  const defaultPostingRules = read(
    root,
    "services/accounting/default-posting-rules.ts",
  )
  const rbacPermissions = read(root, "lib/security/rbac-permissions.ts")
  const sensitiveActionService = read(
    root,
    "services/controls/sensitive-action.service.ts",
  )
  const customerReceivableMigration = read(
    root,
    "prisma/migrations/20260809100000_customer_receivable_document_foundation/migration.sql",
  )
  const customerReceivableDocumentService = read(
    root,
    "services/accounting/customer-receivable-document.service.ts",
  )
  const customerReceivableLifecycleService = read(
    root,
    "services/accounting/customer-receivable-lifecycle.service.ts",
  )
  const customerReceivableBackfillService = read(
    root,
    "services/accounting/customer-receivable-backfill.service.ts",
  )
  const customerReceivableTests = [
    "services/accounting/__tests__/customer-receivable-document.service.test.ts",
    "services/accounting/__tests__/customer-receivable-lifecycle.service.test.ts",
    "services/accounting/__tests__/customer-receivable-backfill.service.test.ts",
    "services/accounting/__tests__/ar-open-item.service.test.ts",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const customerStatementMigration = read(
    root,
    "prisma/migrations/20260809113000_customer_statement_snapshot_foundation/migration.sql",
  )
  const customerStatementService = read(
    root,
    "services/accounting/customer-statement.service.ts",
  )
  const customerStatementTests = read(
    root,
    "services/accounting/__tests__/customer-statement.service.test.ts",
  )
  const customerStatementExternalAccessMigration = read(
    root,
    "prisma/migrations/20260809130000_customer_statement_external_access/migration.sql",
  )
  const customerStatementTokenService = read(
    root,
    "services/accounting/customer-statement-token.ts",
  )
  const sharedSignedExternalAccessTokenHelper = read(
    root,
    "services/_shared/signed-external-access-token.ts",
  )
  const customerStatementAccessService = read(
    root,
    "services/accounting/customer-statement-access.service.ts",
  )
  const customerStatementRecipientActionService = read(
    root,
    "services/accounting/customer-statement-recipient-action.service.ts",
  )
  const customerStatementViewRoute = read(
    root,
    "app/api/customer-statements/[statementId]/route.ts",
  )
  const customerStatementActionRoute = read(
    root,
    "app/api/customer-statements/[statementId]/actions/route.ts",
  )
  const customerStatementExternalAccessTests = [
    "services/accounting/__tests__/customer-statement-token.test.ts",
    "services/accounting/__tests__/customer-statement-access.service.test.ts",
    "services/accounting/__tests__/customer-statement-recipient-action.service.test.ts",
    "app/api/customer-statements/[statementId]/__tests__/route.test.ts",
    "app/api/customer-statements/[statementId]/actions/__tests__/route.test.ts",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const customerStatementDeliveryMigration = read(
    root,
    "prisma/migrations/20260809143000_customer_statement_delivery_referral/migration.sql",
  )
  const accountantClientInviteMigration = read(
    root,
    "prisma/migrations/20260809160000_accountant_client_invite_onboarding/migration.sql",
  )
  const customerStatementDeliveryEnvelope = read(
    root,
    "services/accounting/customer-statement-delivery-envelope.ts",
  )
  const customerStatementDeliveryService = read(
    root,
    "services/accounting/customer-statement-delivery.service.ts",
  )
  const customerStatementDeliveryWorker = read(
    root,
    "services/communication/customer-statement-delivery-worker.service.ts",
  )
  const accountantClientInviteEnvelope = read(
    root,
    "services/accounting/accountant-client-invite-envelope.ts",
  )
  const accountantClientInviteService = read(
    root,
    "services/accounting/accountant-client-invite.service.ts",
  )
  const accountantClientInviteWorker = read(
    root,
    "services/communication/accountant-client-invite-worker.service.ts",
  )
  const referralAttributionService = read(
    root,
    "services/referrals/referral-attribution.service.ts",
  )
  const referralRoute = read(
    root,
    "app/api/referrals/[referralCode]/route.ts",
  )
  const registrationService = read(
    root,
    "services/users/user-identity.service.ts",
  )
  const registrationSurfaces = [
    "components/auth/BeautifulRegisterForm.tsx",
    "components/auth/v2/RegisterV2Form.tsx",
    "types/types.ts",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const customerStatementActions = read(
    root,
    "actions/accounting/customer-statement.actions.ts",
  )
  const customerStatementInternalWorkflow = [
    "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx",
    "components/customers/CustomerStatementWorkflow.tsx",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const customerStatementPublicPortal = [
    "app/customer-statement/[statementId]/page.tsx",
    "app/customer-statement/[statementId]/CustomerStatementPortal.tsx",
  ]
    .map((file) => read(root, file))
    .join("\n")
  const referralDeliveryWorker = read(
    root,
    "scripts/referral-delivery-worker.ts",
  )
  const referralLaunchTests = [
    "services/accounting/__tests__/customer-statement-delivery.service.test.ts",
    "services/communication/__tests__/customer-statement-delivery-worker.service.test.ts",
    "services/accounting/__tests__/accountant-client-invite.service.test.ts",
    "services/communication/__tests__/accountant-client-invite-worker.service.test.ts",
    "services/referrals/__tests__/referral-attribution.service.test.ts",
    "components/customers/__tests__/CustomerStatementWorkflow.test.tsx",
    "actions/accounting/__tests__/customer-statement.actions.test.ts",
    "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx",
    "app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx",
    "scripts/__tests__/referral-delivery-worker.test.ts",
  ]
    .map((file) => read(root, file))
    .join("\n")

  const checks = [
    {
      id: "service_owned_accounting_export_data",
      ready:
        accountingService.includes("await Promise.all") &&
        accountingService.includes("getTrialBalance({") &&
        accountingService.includes("getGeneralLedger({") &&
        accountingService.includes("data: report"),
    },
    {
      id: "versioned_self_describing_export_manifest",
      ready:
        accountingService.includes(
          'schemaVersion: "accounting-report-export.v1"',
        ) &&
        accountingService.includes("sourceTables:") &&
        accountingService.includes("rowCount,") &&
        accountingService.includes("filtersHash,") &&
        accountingService.includes("currency,"),
    },
    {
      id: "tenant_scoped_period_status",
      ready:
        accountingService.includes("db.accountingPeriod.findFirst") &&
        accountingService.includes(
          "id: input.periodId, organizationId: input.organizationId",
        ) &&
        accountingService.includes("periodStatus: period?.status"),
    },
    {
      id: "balance_redaction_and_certification_disclosed",
      ready:
        accountingService.includes("balanceStatus") &&
        accountingService.includes(
          'redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED"',
        ) &&
        accountingService.includes(
          'status: "INTERNAL_ACCOUNTING_REPORT_ONLY"',
        ) &&
        accountingService.includes("Not a certified OHADA statutory filing"),
    },
    {
      id: "tamper_evident_content_and_audit",
      ready:
        accountingService.includes("function hashContent") &&
        accountingService.includes(
          "const contentHash = hashContent(payload)",
        ) &&
        accountingService.includes("contentHash,") &&
        accountingService.includes(
          "certificationStatus: provenance.certification.status",
        ),
    },
    {
      id: "permission_and_fresh_auth_boundary",
      ready:
        accountingAction.includes('permission: "accounting.exports.create"') &&
        accountingAction.includes("freshAuth: { maxAgeSeconds: 300 }") &&
        accountingAction.includes("organizationId: ctx.orgId"),
    },
    {
      id: "analytics_currency_is_service_owned",
      ready:
        analyticsService.includes("currency: string") &&
        analyticsService.includes("getReportCurrency") &&
        analyticsService.includes("currency: input.currency") &&
        analyticsService.includes("select: { currency: true }"),
    },
    {
      id: "report_ui_has_no_hardcoded_usd",
      ready:
        !/currency\s*:\s*["']USD["']/.test(reportComponents) &&
        reportComponents.includes("report.provenance.currency") &&
        reportComponents.includes("provenance!.currency"),
    },
    {
      id: "trust_banner_and_policy_wiring",
      ready:
        trustBanner.includes("Currency: {provenance.currency}") &&
        trustBanner.includes("provenance.sourceTables") &&
        trustBanner.includes("provenance.knownBlockers") &&
        packageJson.includes('"report:trust:export:gate"') &&
        packageJson.includes("npm run report:trust:export:gate"),
    },
    {
      id: "ledger_backed_accountant_data_trust",
      ready:
        dataTrustService.includes('mode: "LEDGER_BACKED_DATA_TRUST"') &&
        dataTrustService.includes("JournalEntryStatus.POSTED") &&
        dataTrustService.includes("JournalEntryStatus.REVERSED") &&
        dataTrustService.includes('provenance: "POSTED"'),
    },
    {
      id: "explicit_accountant_consent_role_and_expiry",
      ready:
        accountantAccessSchema.includes("model AccountantAccessGrant") &&
        accountantAccessSchema.includes("consentEvidenceHash") &&
        accountantAccessSchema.includes("effectiveFrom") &&
        accountantAccessSchema.includes("expiresAt") &&
        accountantAccessSchema.includes("AccountantAccessRole") &&
        accountantAccessService.includes(
          'consentContract: "explicit-client-consent.v1"',
        ) &&
        hasHonestAccountantAccessTemporalSemantics(
          accountantAccessService,
          accountantAccessManager,
        ) &&
        hasProtectedAccountantAccessCommandBoundary(accountantAccessActions),
    },
    {
      id: "cross_client_access_is_server_resolved",
      ready: hasServerResolvedAccountantAccessBoundary(accountantAccessService),
    },
    {
      id: "delegated_export_honors_grant_role",
      ready:
        hasServerResolvedAccountantAccessBoundary(accountantAccessService) &&
        dataTrustActions.includes('permission: "accounting.exports.create"') &&
        dataTrustActions.includes('capability: "EXPORT"') &&
        hasProtectedAccountantAccessCommandBoundary(accountantAccessActions),
    },
    {
      id: "accountant_trust_pack_verified_fresh_auth_evidence",
      ready: hasVerifiedAccountantTrustPackFreshAuthEvidence(dataTrustActions),
    },
    {
      id: "certified_close_pack_verified_fresh_auth_evidence",
      ready: hasVerifiedCertifiedClosePackFreshAuthEvidence(closePackActions),
    },
    {
      id: "close_waiver_service_owned_verified_fresh_auth_evidence",
      ready: hasServiceOwnedVerifiedCloseWaiverFreshAuthEvidence(
        closePackActions,
        closeAssuranceService,
      ),
    },
    {
      id: "missing_proof_request_service_owned_command_evidence",
      ready: hasMissingProofRequestCommandEvidence(
        closePackActions,
        closeAssuranceService,
        accountantAccessService,
      ),
    },
    {
      id: "missing_proof_response_service_owned_command_evidence",
      ready: hasMissingProofResponseCommandEvidence(
        closePackActions,
        closeAssuranceService,
      ),
    },
    {
      id: "client_missing_proof_request_queue_service_owned_evidence",
      ready: hasClientMissingProofRequestQueueEvidence(
        missingProofQueueContracts,
        missingProofQueueService,
        closeAssuranceService,
      ),
    },
    {
      id: "client_missing_proof_manager_action_center_composition",
      ready: hasClientMissingProofManagerActionCenterEvidence(
        managerActionCenterContracts,
        managerActionCenterService,
      ),
    },
    {
      id: "client_missing_proof_response_state_projection",
      ready: hasClientMissingProofResponseStateProjectionEvidence(
        missingProofQueueContracts,
        missingProofQueueService,
        closeAssuranceService,
        managerActionCenterContracts,
        managerActionCenterService,
      ),
    },
    {
      id: "accountant_missing_proof_response_review_queue",
      ready: hasAccountantMissingProofReviewQueueEvidence(
        accountantMissingProofReviewContracts,
        accountantMissingProofReviewService,
        accountantAccessService,
      ),
    },
    {
      id: "accountant_missing_proof_response_acceptance_resolution",
      ready: hasMissingProofResponseAcceptanceEvidence(
        closePackActions,
        closeAssuranceService,
        missingProofResponseAcceptanceContracts,
        accountantAccessService,
      ),
    },
    {
      id: "accountant_portfolio_and_client_register_surfaces",
      ready:
        accountantAccessService.includes("getAccountantPortfolio") &&
        accountantPortfolioSurface.includes("Accountant Client Portfolio") &&
        accountantPortfolioSurface.includes("Signed consent evidence hash") &&
        accountantPortfolioSurface.includes("clientOrganizationId="),
    },
    {
      id: "accountant_access_grant_revoke_events",
      ready:
        accountantAccessService.includes(
          'eventType: "ACCOUNTANT_ACCESS_GRANTED"',
        ) &&
        accountantAccessService.includes(
          'eventType: "ACCOUNTANT_ACCESS_REVOKED"',
        ) &&
        accountantAccessService.includes('channel: "NOTIFICATION"'),
    },
    {
      id: "trust_pack_export_event_and_hash_contract",
      ready:
        dataTrustService.includes('packVersion: "accountant-trust-pack.v1"') &&
        dataTrustService.includes('eventType: "REPORT_EXPORT_CREATED"') &&
        dataTrustService.includes("filtersHash: portal.source.scopeHash") &&
        dataTrustService.includes("sourceTables: portal.source.sourceTables") &&
        dataTrustService.includes("documentHash: contentHash"),
    },
    {
      id: "customer_ledger_service_owned_balance_integrity_kernel",
      ready: hasCustomerLedgerServiceOwnedBalanceKernel(
        customerLedgerService,
        posService,
      ),
    },
    {
      id: "customer_settlement_allocation_source_foundation",
      ready: hasCustomerSettlementSourceFoundation(
        accountantAccessSchema,
        customerSettlementMigration,
        customerSettlementCommandSchema,
        customerSettlementService,
        defaultPostingRules,
        rbacPermissions,
        sensitiveActionService,
      ),
    },
    {
      id: "customer_settlement_compensating_reversal_foundation",
      ready: hasCustomerSettlementCompensatingReversalFoundation(
        accountantAccessSchema,
        customerSettlementReversalMigration,
        customerSettlementCommandSchema,
        customerSettlementReversalService,
        customerLedgerService,
        arOpenItemService,
        postingService,
        permissionsConfig,
        rbacPermissions,
        sensitiveActionService,
      ),
    },
    {
      id: "posted_customer_receivable_document_foundation",
      ready: hasPostedCustomerReceivableFoundation(
        accountantAccessSchema,
        customerReceivableMigration,
        customerReceivableDocumentService,
        customerReceivableLifecycleService,
        customerReceivableBackfillService,
        customerSettlementService,
        customerSettlementReversalService,
        posService,
        arOpenItemService,
        customerReceivableTests,
      ),
    },
    {
      id: "immutable_customer_statement_snapshot_foundation",
      ready: hasImmutableCustomerStatementSnapshotFoundation(
        accountantAccessSchema,
        customerStatementMigration,
        customerStatementService,
        arOpenItemService,
        customerStatementTests,
      ),
    },
    {
      id: "signed_customer_statement_external_access_foundation",
      ready: hasSignedCustomerStatementExternalAccessFoundation(
        accountantAccessSchema,
        customerStatementExternalAccessMigration,
        customerStatementTokenService,
        sharedSignedExternalAccessTokenHelper,
        customerStatementAccessService,
        customerStatementRecipientActionService,
        customerStatementViewRoute,
        customerStatementActionRoute,
        customerStatementExternalAccessTests,
      ),
    },
    {
      id: "consented_customer_referral_launch_foundation",
      ready: hasConsentedCustomerReferralLaunchFoundation(
        accountantAccessSchema,
        customerStatementDeliveryMigration,
        accountantClientInviteMigration,
        customerStatementDeliveryEnvelope,
        customerStatementDeliveryService,
        customerStatementDeliveryWorker,
        accountantClientInviteEnvelope,
        accountantClientInviteService,
        accountantClientInviteWorker,
        referralAttributionService,
        referralRoute,
        registrationService,
        registrationSurfaces,
        customerStatementActions,
        accountantAccessActions,
        customerStatementInternalWorkflow,
        customerStatementPublicPortal,
        referralDeliveryWorker,
        packageJson,
        referralLaunchTests,
      ),
    },
    {
      id: "customer_settlement_reversal_protected_action_boundary",
      ready: hasProtectedCustomerSettlementReversalActionBoundary(
        customerSettlementReversalActions,
        customerSettlementCommandSchema,
      ),
    },
    {
      id: "statutory_payroll_and_inventory_evidence_coverage",
      ready:
        dataTrustService.includes('"payroll_runs"') &&
        dataTrustService.includes('"payroll_declarations"') &&
        dataTrustService.includes('"fiscal_documents"') &&
        dataTrustService.includes('"supplier_invoices"') &&
        closePackService.includes("INVENTORY_VALUATION_ANNEX") &&
        closePackService.includes('"Tax/VAT"'),
    },
  ]

  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Report Trust and Export Certification Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Summary",
    "",
    "- Checks ready: " +
      report.summary.readyCount +
      "/" +
      report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id,
    ),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => "- " + blocker)
      : ["- None"]),
    "",
    "## Certification Boundary",
    "",
    "- Readiness means report provenance, currency, period status, access controls, and integrity evidence are explicit.",
    "- This gate does not certify an export as an OHADA statutory filing or replace Close & Assurance certification.",
  ]
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(
    jsonTarget,
    JSON.stringify(report, null, 2) + String.fromCharCode(10),
    "utf8",
  )
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildReportTrustExportReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildReportTrustExportReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
}

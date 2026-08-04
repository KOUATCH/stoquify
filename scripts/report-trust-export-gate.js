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

export const workflowAtlasRoleKeys = [
  "owner",
  "cashier",
  "stock",
  "purchasing",
  "hrPayroll",
  "accountant",
  "compliance",
  "admin",
] as const

export type WorkflowAtlasRole = (typeof workflowAtlasRoleKeys)[number]

export const workflowAtlasOutcomeKeys = [
  "sell",
  "stock",
  "buy",
  "collect",
  "payPeople",
  "declare",
  "reconcile",
  "close",
  "comply",
  "decide",
  "administer",
  "release",
] as const

export type WorkflowAtlasOutcome = (typeof workflowAtlasOutcomeKeys)[number]

export type WorkflowAtlasIconKey =
  | "Activity"
  | "BadgeCheck"
  | "BriefcaseBusiness"
  | "ClipboardCheck"
  | "FileCheck2"
  | "Landmark"
  | "PackageSearch"
  | "Settings2"
  | "ShieldCheck"
  | "ShoppingCart"
  | "Store"
  | "Users"

export const workflowAtlasRoles: readonly {
  key: WorkflowAtlasRole
  icon: WorkflowAtlasIconKey
}[] = [
  { key: "owner", icon: "Activity" },
  { key: "cashier", icon: "Store" },
  { key: "stock", icon: "PackageSearch" },
  { key: "purchasing", icon: "ShoppingCart" },
  { key: "hrPayroll", icon: "BriefcaseBusiness" },
  { key: "accountant", icon: "Landmark" },
  { key: "compliance", icon: "ClipboardCheck" },
  { key: "admin", icon: "Settings2" },
]

export const workflowAtlasOutcomes: readonly {
  key: WorkflowAtlasOutcome
  icon: WorkflowAtlasIconKey
}[] = [
  { key: "sell", icon: "Store" },
  { key: "stock", icon: "PackageSearch" },
  { key: "buy", icon: "ShoppingCart" },
  { key: "collect", icon: "Users" },
  { key: "payPeople", icon: "BriefcaseBusiness" },
  { key: "declare", icon: "FileCheck2" },
  { key: "reconcile", icon: "BadgeCheck" },
  { key: "close", icon: "Landmark" },
  { key: "comply", icon: "ClipboardCheck" },
  { key: "decide", icon: "Activity" },
  { key: "administer", icon: "Settings2" },
  { key: "release", icon: "ShieldCheck" },
]

export type WorkflowAtlasRoute = {
  href: string
  labelKey: string
}

export type WorkflowAtlasWorkflow = {
  key: string
  icon: WorkflowAtlasIconKey
  outcome: WorkflowAtlasOutcome
  roles: readonly WorkflowAtlasRole[]
  routes: readonly WorkflowAtlasRoute[]
  dailyRoute: WorkflowAtlasRoute
  stepKeys: readonly string[]
  controlKeys: readonly string[]
  evidenceKeys: readonly string[]
}

export type WorkflowAtlasRoleSelection = WorkflowAtlasRole | "all"
export type WorkflowAtlasOutcomeSelection = WorkflowAtlasOutcome | "all"

export const workflowAtlasWorkflows: readonly WorkflowAtlasWorkflow[] = [
  {
    key: "sellToCash",
    icon: "Store",
    outcome: "sell",
    roles: ["cashier", "owner", "accountant"],
    dailyRoute: { href: "/dashboard/pos", labelKey: "pos" },
    routes: [
      { href: "/dashboard/pos", labelKey: "pos" },
      { href: "/dashboard/sales", labelKey: "sales" },
      { href: "/dashboard/finance/cash-drawer", labelKey: "cashDrawer" },
      { href: "/dashboard/finance/reconciliation", labelKey: "reconciliation" },
    ],
    stepKeys: ["openSession", "captureSale", "collectPayment", "closeDrawer", "reviewSettlement"],
    controlKeys: ["sessionOwner", "receiptState", "paymentMethod", "drawerVariance"],
    evidenceKeys: ["sale", "receipt", "drawerMovement", "paymentProof"],
  },
  {
    key: "stockToSale",
    icon: "PackageSearch",
    outcome: "stock",
    roles: ["stock", "cashier", "owner"],
    dailyRoute: { href: "/dashboard/inventory", labelKey: "inventory" },
    routes: [
      { href: "/dashboard/inventory", labelKey: "inventory" },
      { href: "/dashboard/inventory/items", labelKey: "items" },
      { href: "/dashboard/inventory/movements", labelKey: "movements" },
      { href: "/dashboard/inventory/transfers", labelKey: "transfers" },
      { href: "/dashboard/finance/stock-to-cash", labelKey: "stockToCash" },
    ],
    stepKeys: ["defineItem", "receiveStock", "moveOrCount", "sellItem", "reviewValue"],
    controlKeys: ["locationScope", "movementReason", "transferAcceptance", "valuationSignal"],
    evidenceKeys: ["itemRecord", "movementSource", "locationActor", "variance"],
  },
  {
    key: "procureToPay",
    icon: "ShoppingCart",
    outcome: "buy",
    roles: ["purchasing", "owner", "accountant"],
    dailyRoute: { href: "/dashboard/purchase-orders", labelKey: "purchaseOrders" },
    routes: [
      { href: "/dashboard/purchases", labelKey: "purchases" },
      { href: "/dashboard/purchase-orders", labelKey: "purchaseOrders" },
      { href: "/dashboard/purchases/payables", labelKey: "payables" },
      { href: "/dashboard/purchases/suppliers", labelKey: "suppliers" },
    ],
    stepKeys: ["qualifySupplier", "raiseOrder", "receiveGoods", "confirmPayable", "prepareRelease"],
    controlKeys: ["supplierIdentity", "orderApproval", "receivingState", "payableReadiness"],
    evidenceKeys: ["order", "receipt", "supplierBalance", "payableProof"],
  },
  {
    key: "customerToCollection",
    icon: "Users",
    outcome: "collect",
    roles: ["owner", "accountant"],
    dailyRoute: { href: "/dashboard/finance/receivables", labelKey: "receivables" },
    routes: [
      { href: "/dashboard/customers", labelKey: "customers" },
      { href: "/dashboard/sales", labelKey: "sales" },
      { href: "/dashboard/finance/receivables", labelKey: "receivables" },
      { href: "/dashboard/finance/reconciliation", labelKey: "reconciliation" },
    ],
    stepKeys: ["openCustomer", "recordSale", "trackExposure", "collectMoney", "resolveDifference"],
    controlKeys: ["customerScope", "duePosition", "collectionProof", "reconciliationState"],
    evidenceKeys: ["customerTrail", "openItem", "receipt", "ledgerReference"],
  },
  {
    key: "peopleToPay",
    icon: "BriefcaseBusiness",
    outcome: "payPeople",
    roles: ["hrPayroll", "owner", "accountant"],
    dailyRoute: { href: "/dashboard/people", labelKey: "people" },
    routes: [
      { href: "/dashboard/people", labelKey: "people" },
      { href: "/dashboard/people/team", labelKey: "team" },
      { href: "/dashboard/people/me", labelKey: "me" },
      { href: "/dashboard/payroll", labelKey: "payroll" },
      { href: "/dashboard/payroll/runs", labelKey: "payrollRuns" },
      { href: "/dashboard/payroll/payslips", labelKey: "payslips" },
    ],
    stepKeys: ["confirmIdentity", "approveContract", "captureTime", "approveInputs", "runPayroll", "publishPayslip"],
    controlKeys: ["identity", "contract", "attendance", "inputReadiness", "runApproval"],
    evidenceKeys: ["hrFact", "runResult", "payslip", "paymentProof"],
  },
  {
    key: "payrollStatutoryProof",
    icon: "FileCheck2",
    outcome: "declare",
    roles: ["hrPayroll", "compliance", "accountant"],
    dailyRoute: { href: "/dashboard/payroll/declarations", labelKey: "declarations" },
    routes: [
      { href: "/dashboard/payroll/declarations", labelKey: "declarations" },
      { href: "/dashboard/payroll/payments", labelKey: "payrollPayments" },
      { href: "/dashboard/payroll/register", labelKey: "payrollRegister" },
      { href: "/dashboard/compliance", labelKey: "compliance" },
    ],
    stepKeys: ["lockRun", "prepareDeclaration", "attachAuthorityProof", "releasePayment", "postReference"],
    controlKeys: ["declarationReadiness", "authorityEvidence", "paymentTrace", "correctionState"],
    evidenceKeys: ["declarationPacket", "paymentTrace", "register", "ledgerReference"],
  },
  {
    key: "paymentReconciliation",
    icon: "BadgeCheck",
    outcome: "reconcile",
    roles: ["accountant", "owner"],
    dailyRoute: { href: "/dashboard/finance/reconciliation", labelKey: "reconciliation" },
    routes: [
      { href: "/dashboard/finance/payments", labelKey: "financePayments" },
      { href: "/dashboard/finance/reconciliation", labelKey: "reconciliation" },
      { href: "/dashboard/payroll/payments", labelKey: "payrollPayments" },
    ],
    stepKeys: ["importEvidence", "compareRecords", "assignSuspense", "approveResolution", "retainProof"],
    controlKeys: ["providerEvidence", "statementImport", "matchDecision", "reviewerSignoff"],
    evidenceKeys: ["matchDecision", "suspenseItem", "providerProof", "resolutionHistory"],
  },
  {
    key: "accountingCloseAssurance",
    icon: "Landmark",
    outcome: "close",
    roles: ["accountant", "owner"],
    dailyRoute: { href: "/dashboard/accounting/close", labelKey: "accountingClose" },
    routes: [
      { href: "/dashboard/accounting", labelKey: "accounting" },
      { href: "/dashboard/accounting/journals", labelKey: "journals" },
      { href: "/dashboard/accounting/close", labelKey: "accountingClose" },
      { href: "/dashboard/accounting/control-center", labelKey: "accountingControl" },
      { href: "/dashboard/assurance/control-tower", labelKey: "assuranceControl" },
    ],
    stepKeys: ["linkSources", "postJournals", "reconcileAccounts", "clearBlockers", "certifyClose"],
    controlKeys: ["sourceLink", "postingRule", "blockerReview", "certificationState"],
    evidenceKeys: ["journalSource", "closeBlocker", "reviewHistory", "closePack"],
  },
  {
    key: "complianceCountryEvidence",
    icon: "ClipboardCheck",
    outcome: "comply",
    roles: ["compliance", "accountant", "owner"],
    dailyRoute: { href: "/dashboard/compliance", labelKey: "compliance" },
    routes: [
      { href: "/dashboard/compliance", labelKey: "compliance" },
      { href: "/dashboard/payroll/setup", labelKey: "payrollSetup" },
      { href: "/dashboard/settings/tax-rates", labelKey: "taxRates" },
    ],
    stepKeys: ["scopeCountry", "applyRule", "collectDocument", "reviewAdapter", "surfaceUncertainty"],
    controlKeys: ["ruleProvenance", "adapterState", "documentStatus", "openObligation"],
    evidenceKeys: ["complianceEvidence", "countryPackStatus", "authorityProof", "limitation"],
  },
  {
    key: "ownerDailyControl",
    icon: "Activity",
    outcome: "decide",
    roles: ["owner", "stock", "hrPayroll", "accountant"],
    dailyRoute: { href: "/dashboard/daily-digest", labelKey: "dailyDigest" },
    routes: [
      { href: "/dashboard/daily-digest", labelKey: "dailyDigest" },
      { href: "/dashboard/manager-action-center", labelKey: "managerAction" },
      { href: "/dashboard/owner-war-room", labelKey: "ownerWarRoom" },
      { href: "/dashboard/assurance/control-tower", labelKey: "assuranceControl" },
    ],
    stepKeys: ["scanSignals", "openException", "assignOwner", "decideToday", "returnToSource"],
    controlKeys: ["exceptionQueue", "branchSignal", "approvalQueue", "staleEvidence"],
    evidenceKeys: ["decisionQueue", "sourceLink", "assuranceState", "dailyClose"],
  },
  {
    key: "adminAccessControl",
    icon: "Settings2",
    outcome: "administer",
    roles: ["admin", "owner"],
    dailyRoute: { href: "/dashboard/settings/users", labelKey: "settingsUsers" },
    routes: [
      { href: "/dashboard/settings/users", labelKey: "settingsUsers" },
      { href: "/dashboard/settings/roles", labelKey: "settingsRoles" },
      { href: "/dashboard/settings/modules", labelKey: "settingsModules" },
      { href: "/dashboard/settings/locations", labelKey: "settingsLocations" },
      { href: "/dashboard/settings/security", labelKey: "settingsSecurity" },
    ],
    stepKeys: ["inviteUser", "setRole", "scopeModule", "bindLocation", "reviewSecurity"],
    controlKeys: ["invitationState", "roleBoundary", "moduleAccess", "locationScope"],
    evidenceKeys: ["actorScope", "effectiveAccess", "auditTrail", "securityPolicy"],
  },
  {
    key: "workflowAssuranceGates",
    icon: "ShieldCheck",
    outcome: "release",
    roles: ["owner", "admin", "accountant"],
    dailyRoute: { href: "/dashboard/assurance/control-tower", labelKey: "assuranceControl" },
    routes: [
      { href: "/dashboard/assurance/control-tower", labelKey: "assuranceControl" },
      { href: "/dashboard/accounting/control-center", labelKey: "accountingControl" },
      { href: "/dashboard/settings/modules", labelKey: "settingsModules" },
    ],
    stepKeys: ["detectIncident", "nameImpact", "routeOwner", "holdRelease", "recordDecision"],
    controlKeys: ["incidentRouting", "moduleEnforcement", "releaseGate", "rollbackReadiness"],
    evidenceKeys: ["incidentRecord", "gateDecision", "affectedWorkflow", "releaseHistory"],
  },
]

export function getWorkflowAtlasOutcomesForRole(
  role: WorkflowAtlasRoleSelection,
): readonly (typeof workflowAtlasOutcomes)[number][] {
  if (role === "all") return workflowAtlasOutcomes

  const supportedOutcomes = new Set(
    workflowAtlasWorkflows
      .filter((workflow) => workflow.roles.includes(role))
      .map((workflow) => workflow.outcome),
  )

  return workflowAtlasOutcomes.filter((outcome) => supportedOutcomes.has(outcome.key))
}

export function getWorkflowAtlasWorkflowsForSelection(
  role: WorkflowAtlasRoleSelection,
  outcome: WorkflowAtlasOutcomeSelection,
): readonly WorkflowAtlasWorkflow[] {
  return workflowAtlasWorkflows.filter((workflow) => {
    const roleMatches = role === "all" || workflow.roles.includes(role)
    const outcomeMatches = outcome === "all" || workflow.outcome === outcome
    return roleMatches && outcomeMatches
  })
}

export const workflowAtlasRouteReferences = Array.from(
  new Set(
    workflowAtlasWorkflows.flatMap((workflow) => [
      workflow.dailyRoute.href,
      ...workflow.routes.map((route) => route.href),
    ]),
  ),
)

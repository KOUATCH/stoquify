import { createHash, randomBytes } from "node:crypto";
import { PayrollEmployeeStatus, Prisma, PrismaClient, TaxType, UnitType } from "@prisma/client";

import { adminPermissions, rolePermissionMap } from "../config/permissions";
import { hashPassword } from "../lib/password";
import { PERMISSIONS, ROLE_TEMPLATES } from "../lib/permissions";
import { hasRbacPermission, isKnownPermission } from "../lib/security/rbac-permissions";
import { resolveCameroonStandardVatRateBps } from "../services/regulatory/country-packs/resolve";
import { COMPLIANCE_HRIS_ROLE_CODES } from "./compliance-hris-role-seed";

const unique = (values: readonly string[]) => [...new Set(values)];
const stableId = (kind: string, organizationId: string, key: string) =>
  `sysseed_${kind}_${createHash("sha256").update(`${organizationId}:${key}`).digest("hex").slice(0, 24)}`;

export type SystematicRoleDefinition = {
  code: string;
  nameEn: string;
  permissions: string[];
  source: string;
};

const financeRead = ["finance.read", "finance.reports.read", "accounting.accounts.read", "accounting.journal.read", "accounting.period.read", "accounting.reports.read", "accounting.audit.read", "accounting.close.read"];
const auditRead = ["dashboard.read", "controls.audit.read", "compliance.metadata.read", "accounting.audit.read"];
const stockRead = ["dashboard.read", "inventory.read", "inventory.items.read", "inventory.levels.read", "inventory.categories.read", "inventory.brands.read", "inventory.units.read", "locations.read"];
const peopleRead = ["hris.people.read", "payroll.read", "payroll.employees.read", "payroll.contracts.read", "payroll.compensation.read", "payroll.attendance.readiness.read", "payroll.command.read"];
const selfService = ["dashboard.read", "profile.read", "profile.update", "profile.password.update", "hris.self_service.read", "hris.self_service.request", "payroll.payslips.self.read", "payroll.payslips.self.export", PERMISSIONS.VIEW_OWN_PRESENCE, PERMISSIONS.CLOCK_IN_OUT, PERMISSIONS.VIEW_OWN_SCHEDULE];
const paymentRead = ["finance.read", "finance.payments.read", "payments.provider-account.read", "payments.reconciliation.read"];
const purchaser = [...stockRead, "purchases.read", "purchases.orders.read", "purchases.orders.create", "purchases.orders.update", "purchases.suppliers.read", "purchases.suppliers.create", "purchases.suppliers.update", "purchasing.ap.invoice.view", "purchasing.ap.payment.request", "purchasing.supplier.bank.request"];
const approvalRead = [...auditRead, "purchases.orders.read", "purchasing.ap.invoice.view", "payroll.runs.review", "payroll.read"];

// These codes already exist in the repository's compliance role registry. Each
// assignment names real guards; token matching would miss dotted capabilities
// and accidentally combine preparation and approval permissions.
const compliancePermissions: Record<string, readonly string[]> = {
  owner: ["*", ...adminPermissions, ...Object.values(PERMISSIONS)],
  super_admin: ["*", ...adminPermissions, ...Object.values(PERMISSIONS)],
  admin: adminPermissions,
  branch_manager: [...stockRead, "sales.read", "sales.orders.read", "purchases.orders.read", "purchases.orders.receive", "branch.daily-close.review", "branch.daily-close.sign"],
  inventory_manager: [...stockRead, "inventory.items.create", "inventory.items.update", "inventory.categories.create", "inventory.categories.update", "inventory.brands.create", "inventory.brands.update", "inventory.units.create", "inventory.units.update", "inventory.stock.adjust", "inventory.stock.transfer", "purchases.orders.receive"],
  sales_manager: ["dashboard.read", "sales.read", "sales.create", "sales.orders.read", "sales.orders.create", "sales.orders.update", "sales.orders.cancel", "sales.orders.refund", "customers.read", "customers.create", "customers.update", "sales.reports.read"],
  cashier_pos_user: rolePermissionMap.cashier,
  purchaser,
  accountant: [...financeRead, "accounting.journal.post", "accounting.journal.reverse", "accounting.close.run", "accounting.close.finding.comment", "finance.payables.read", "finance.receivables.read"],
  external_accountant: [...financeRead, "finance.payables.read", "finance.receivables.read"],
  hr_manager: [...peopleRead, "hris.people.manage", "payroll.employees.manage", "payroll.contracts.manage", "payroll.salary_changes.read", "payroll.salary_changes.request", "payroll.payment_destination.read", "payroll.payment_destination.request"],
  hris_user: ["dashboard.read", "hris.self_service.read", "hris.people.read", "payroll.payslips.self.read"],
  support: ["dashboard.read", "users.read", "locations.read", "inventory.items.read"],
  pos_user: ["dashboard.read", "inventory.items.read", "customers.read", PERMISSIONS.OPERATE_POS, PERMISSIONS.PROCESS_PAYMENTS, PERMISSIONS.CASH_DRAWER_READ, PERMISSIONS.NEW_POS_SESSION_READ, PERMISSIONS.POS_STATION_READ],
  auditor: [...auditRead, ...financeRead, "compliance.documents.read"],
  read_only: ["dashboard.read", "inventory.read", "inventory.items.read", "inventory.levels.read", "sales.read", "sales.orders.read", "purchases.read", "purchases.orders.read"],
  user: selfService,
  database_migration_operator: ["dashboard.read", "data.migrate", "data.backup", "controls.audit.read"],
  independent_migration_checker: auditRead,
  maker: [...purchaser, "sales.orders.create", "payroll.salary_changes.request"],
  checker: [...approvalRead, "purchases.orders.approve", "purchasing.ap.match.review", "purchasing.ap.payment.approve"],
  product_owner: ["dashboard.read", "dashboard.analytics.read", "analytics.read"],
  product_approver: ["dashboard.read", "agent.release.product.approve"],
  financial_controller: [...financeRead, "accounting.close.run", "accounting.close.finding.assign", "accounting.close.finding.comment", "purchasing.ap.match.review", "payroll.runs.review"],
  controller_approver: [...financeRead, "purchasing.ap.payment.approve", "payroll.runs.approve"],
  payments_owner: [...paymentRead, "payments.reconciliation.run", "payments.reconciliation.import", "payments.reconciliation.match", "payments.reconciliation.exception.assign", "payments.reconciliation.exception.resolve", "payments.reconciliation.suspense.propose"],
  retail_operations_owner: [...stockRead, "sales.read", "sales.orders.read", "sales.reports.read", "branch.daily-close.review"],
  pos_architect: ["dashboard.read", "pos.read", "pos.transactions.read", "inventory.items.read", PERMISSIONS.VIEW_POS_REPORTS],
  security_owner: [...auditRead, "users.read", "roles.read", "agent.release.security.approve"],
  treasury_owner: [...paymentRead, "payments.reconciliation.sign", "purchasing.ap.payment.release", "payroll.payments.release", "payroll.payments.reconcile"],
  risk_owner: [...auditRead, "analytics.read"],
  qa_owner: auditRead,
  support_owner: ["dashboard.read", "users.read", "locations.read"],
  sre_owner: auditRead,
  order_to_cash_product_owner: ["dashboard.read", "sales.read", "sales.orders.read", "sales.reports.read", "finance.receivables.read", "finance.payments.read"],
  qualified_accounting_reviewer: [...financeRead, "compliance.metadata.read"],
  qualified_cameroon_country_pack_reviewer: ["dashboard.read", "compliance.metadata.read", "compliance.documents.read", "finance.taxes.read", "payroll.reports.read"],
  inventory_controller: [...stockRead, "inventory.adjust.approve", "inventory.transfer.approve", "controls.audit.read"],
  fulfillment_owner: [...stockRead, "sales.orders.read", "purchases.orders.read", "purchases.orders.receive"],
  accounting_owner: [...financeRead, "accounting.setup.manage", "accounting.accounts.manage", "accounting.posting-rules.manage"],
  payroll_administrator: [...peopleRead, "hris.people.manage", "payroll.employees.manage", "payroll.contracts.manage", "payroll.salary_changes.read", "payroll.salary_changes.request", "payroll.salary_changes.apply", "payroll.payment_destination.read", "payroll.payment_destination.request", "payroll.payment_destination.apply"],
  payroll_processor: [...peopleRead, "payroll.attendance.freeze", "payroll.runs.calculate", "payroll.runs.review", "payroll.payslips.read", "payroll.payslips.emit", "payroll.payments.request", "payroll.declarations.prepare"],
  payroll_approver: [...peopleRead, "payroll.runs.review", "payroll.runs.approve", "payroll.payments.approve", "payroll.reports.read"],
  compensation_approver: [...peopleRead, "payroll.salary_changes.read", "payroll.salary_changes.approve"],
  attendance_time_administrator: ["dashboard.read", "hris.people.read", "payroll.attendance.freeze", "payroll.attendance.readiness.read", PERMISSIONS.VIEW_SCHEDULES, PERMISSIONS.CREATE_SCHEDULES, PERMISSIONS.UPDATE_SCHEDULES, PERMISSIONS.VIEW_ORG_ATTENDANCE_REPORTS, PERMISSIONS.EDIT_PRESENCE_SESSIONS],
  manager: rolePermissionMap.manager,
  employee_self_service: selfService,
};

export function systematicRoleDefinitions(): SystematicRoleDefinition[] {
  const definitions = new Map<string, SystematicRoleDefinition>();
  for (const template of Object.values(ROLE_TEMPLATES)) {
    definitions.set(template.code, { code: template.code, nameEn: template.name, permissions: unique(template.permissions), source: "lib/permissions.ts:ROLE_TEMPLATES" });
  }
  for (const [code, permissions] of Object.entries(rolePermissionMap)) {
    const existing = definitions.get(code);
    definitions.set(code, { code, nameEn: existing?.nameEn ?? title(code), permissions: unique([...(existing?.permissions ?? []), ...permissions]), source: "config/permissions.ts:rolePermissionMap + lib/permissions.ts:ROLE_TEMPLATES" });
  }
  for (const code of COMPLIANCE_HRIS_ROLE_CODES) {
    if (definitions.has(code)) continue;
    if (!compliancePermissions[code]) throw new Error(`Missing reviewed permission mapping for repository role ${code}.`);
    definitions.set(code, { code, nameEn: title(code), permissions: unique(compliancePermissions[code]), source: "prisma/compliance-hris-role-seed.ts:COMPLIANCE_HRIS_ROLE_CODES; explicit runtime guard mapping" });
  }
  const purchasingRoles = {
    buyer: purchaser,
    approver: [...stockRead, "purchases.orders.read", "purchases.orders.approve", "purchases.orders.cancel", "purchasing.ap.match.review"],
    receiver: [...stockRead, "purchases.orders.read", "purchases.orders.receive"],
  };
  for (const [code, permissions] of Object.entries(purchasingRoles)) {
    definitions.set(code, { code, nameEn: title(code), permissions: unique(permissions), source: "lib/permissions.ts:roleMatrix; explicit purchase guard mapping" });
  }
  // Separate new synthetic operators exercise the implemented maker/checker
  // workflow without granting capabilities to any preserved human identity.
  definitions.set("inventory_adjustment_maker", { code: "inventory_adjustment_maker", nameEn: "Inventory Adjustment Maker", permissions: [...stockRead, "inventory.stock.adjust", "accounting.journal.create"], source: "actions/inventory/inventoryLossControlActions.ts + actions/accounting/journals.actions.ts; prepare stock and its opening journal" });
  definitions.set("inventory_adjustment_checker", { code: "inventory_adjustment_checker", nameEn: "Inventory Adjustment Checker", permissions: [...stockRead, "inventory.stock.adjust", "inventory.adjust.approve", "accounting.journal.post"], source: "actions/inventory/inventoryLossControlActions.ts + actions/accounting/journals.actions.ts; distinct actor posts the stock and journal" });
  return [...definitions.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function title(code: string) {
  const label = code.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return code.startsWith("qualified_") ? `${label} (verification pending)` : label;
}

export type SystematicCredential = { organizationId: string; roleCode: string; userId: string; name: string; email: string; password: string; sourceClassification: "SYNTHETIC_LOCAL_DEVELOPMENT" };
export type ReferenceSeedReport = {
  referenceDate: string;
  roles: Array<{ organizationId: string; code: string; roleId: string; status: "preserved" | "added"; source: string; missingTemplatePermissions: string[] }>;
  personas: Array<{ organizationId: string; code: string; userId: string; status: "existing" | "added" }>;
  employeeLinks: Array<{ organizationId: string; userId: string; employeeId: string; status: "DRAFT"; purpose: string }>;
  referenceChanges: Array<{ organizationId: string; model: string; id: string; reason: string; before: unknown; after: unknown }>;
  taxProvenance: Array<{ organizationId: string; resolution: ReturnType<typeof resolveCameroonStandardVatRateBps> }>;
  referenceInventory: Array<{ organizationId: string; model: "Unit" | "TaxRate"; id: string; name: string; itemCount: number; purpose: string }>;
  issues: Array<{ organizationId?: string; code: string; ids?: string[]; detail: string }>;
};

const firstNames = ["Leonie", "Mathis", "Esther", "Cedric", "Noelle", "Fabien", "Odile", "Bastien"];
const lastNames = ["Tchoumi", "Nangue", "Mendomo", "Bikoko", "Ndjomo", "Tchinda", "Mboua", "Ebang"];

/** Additive only. The caller selects and restores the local database first. */
export async function seedSystematicReferenceData(input: {
  prisma: PrismaClient;
  referenceDate: string;
  syntheticOrganizationIds: string[];
  onCredential: (credential: SystematicCredential) => Promise<void>;
  /** Opt-in login handoff: these roles need a persona with a verified secret. */
  ensurePersonaCredentialsForRoleCodes?: string[];
  /** IDs whose protected credentials the caller has already verified normally. */
  knownCredentialUserIds?: string[];
}): Promise<ReferenceSeedReport> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.referenceDate)) throw new Error("An ISO reference date is required.");
  const report: ReferenceSeedReport = { referenceDate: input.referenceDate, roles: [], personas: [], employeeLinks: [], referenceChanges: [], taxProvenance: [], referenceInventory: [], issues: [] };
  report.issues.push({ code: "STOCK_APPROVAL_PERMISSION_SHARED_BY_ACTIONS", detail: "Current stock actions require inventory.stock.adjust for both preparation and posting. New maker/checker identities are distinct; the stock service enforces actor separation. Journal create/post capabilities are separated. No stronger RBAC separation is claimed." });
  const definitions = systematicRoleDefinitions();
  // Existing templates include legacy values; report unknown ones rather than
  // silently deleting or expanding permissions held by preserved accounts.
  for (const definition of definitions) {
    const unknown = definition.permissions.filter((permission) => !isKnownPermission(permission));
    if (unknown.length) report.issues.push({ code: "LEGACY_TEMPLATE_PERMISSION_REVIEW", ids: [definition.code], detail: unknown.join(", ") });
  }
  const organizations = await input.prisma.organization.findMany({ orderBy: { id: "asc" } });
  for (const organization of organizations) {
    if (!organization.isActive || organization.deletedAt) {
      report.issues.push({ organizationId: organization.id, code: "INACTIVE_ORGANIZATION_PRESERVED", detail: "No new active personas or configuration were introduced into this inactive organization." });
      continue;
    }
    for (const [index, definition] of definitions.entries()) {
      let role = await input.prisma.role.findUnique({ where: { organizationId_code: { organizationId: organization.id, code: definition.code } } });
      const existed = Boolean(role);
      if (!role) role = await input.prisma.role.create({ data: { id: stableId("role", organization.id, definition.code), organizationId: organization.id, code: definition.code, nameEn: definition.nameEn, permissions: definition.permissions, description: `Synthetic local workflow role. Source: ${definition.source}. Role membership is not external qualification, appointment, signature, or production authorization.` } });
      report.roles.push({ organizationId: organization.id, code: definition.code, roleId: role.id, status: existed ? "preserved" : "added", source: definition.source, missingTemplatePermissions: definition.permissions.filter((permission) => !hasRbacPermission(role.permissions, permission)) });
      const needsKnownCredential = input.ensurePersonaCredentialsForRoleCodes?.includes(definition.code) ?? false;
      const existingPersona = await input.prisma.user.findFirst({ where: { organizationId: organization.id, ...(needsKnownCredential ? { id: { in: input.knownCredentialUserIds ?? [] } } : {}), isActive: true, isLocked: false, OR: [{ emailVerified: true }, { isVerified: true }], roles: { some: { id: role.id } } }, orderBy: { id: "asc" }, select: { id: true } });
      if (existingPersona) {
        report.personas.push({ organizationId: organization.id, code: definition.code, userId: existingPersona.id, status: "existing" });
        continue;
      }
      const userId = stableId("user", organization.id, definition.code);
      const suffix = createHash("sha256").update(organization.id).digest("hex").slice(0, 10);
      const email = `${definition.code.replaceAll("_", ".")}.${suffix}@reseed.stoquify.test`;
      // Never overwrite a preexisting identity merely because its email matches.
      if (await input.prisma.user.findFirst({ where: { OR: [{ id: userId }, { email }] }, select: { id: true } })) {
        report.issues.push({ organizationId: organization.id, code: "PERSONA_IDENTITY_COLLISION", ids: [userId], detail: "Existing identity retained; no password, membership, or account status changed." });
        continue;
      }
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
      const password = `Ss!${randomBytes(24).toString("base64url")}9a`;
      const credential: SystematicCredential = { organizationId: organization.id, roleCode: definition.code, userId, name: `${firstName} ${lastName}`, email, password, sourceClassification: "SYNTHETIC_LOCAL_DEVELOPMENT" };
      const hashed = await hashPassword(password);
      const resolvedRole = role;
      // Persist the recovery credential before commit; a failed transaction may
      // leave an unused credential record, but never an unrecoverable account.
      await input.onCredential(credential);
      await input.prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: userId, organizationId: organization.id, email, name: credential.name, firstName, lastName, jobTitle: resolvedRole.nameEn, password: hashed, emailVerified: true, isVerified: true, preferredLocale: organization.defaultLocale, roles: { connect: { id: resolvedRole.id } } } });
        await tx.account.create({ data: { id: stableId("account", organization.id, definition.code), providerId: "credential", accountId: userId, userId, password: hashed } });
        if (hasRbacPermission(resolvedRole.permissions, "hris.self_service.read")) {
          // A truthful onboarding record supports own-profile reads without
          // pretending a contract, statutory evidence, or payroll was approved.
          const employeeId = stableId("employee", organization.id, definition.code);
          const location = await tx.location.findFirst({ where: { organizationId: organization.id, isActive: true, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { id: "asc" }], select: { id: true } });
          await tx.payrollEmployee.create({ data: { id: employeeId, organizationId: organization.id, userId, employeeNumber: `SYS-${definition.code.toUpperCase()}`, displayName: credential.name, legalName: credential.name, status: PayrollEmployeeStatus.DRAFT, hireDate: new Date(`${input.referenceDate}T00:00:00.000Z`), countryCode: organization.countryCode ?? (/^(Cameroon|Cameroun)$/i.test(organization.country ?? "") ? "CM" : null), locationId: location?.id, jobTitle: resolvedRole.nameEn, metadata: { sourceClassification: "SYNTHETIC_LOCAL_DEVELOPMENT", source: "systematic-reseed-reference-data", readiness: "ONBOARDING_PENDING_CONTRACT_AND_EVIDENCE", signaturesOrAppointmentsClaimed: false } } });
          report.employeeLinks.push({ organizationId: organization.id, userId, employeeId, status: "DRAFT", purpose: "Linked synthetic onboarding profile; contracts, payslips and payment evidence remain unapproved." });
        }
      });
      report.personas.push({ organizationId: organization.id, code: definition.code, userId, status: "added" });
    }
    await reconcileReferenceData(input.prisma, organization, input, report);
  }
  return report;
}

const packagingDefinitions = [
  { name: "A4 printer paper, 500 sheets", symbol: "ream500", nameEn: "Ream of 500 sheets", nameFr: "Rame de 500 feuilles", baseUnit: "sheet", conversionRate: 500 },
  { name: "Mineral water, 6-bottle pack", symbol: "pack6btl", nameEn: "Pack of 6 bottles", nameFr: "Pack de 6 bouteilles", baseUnit: "btl", conversionRate: 6 },
  { name: "Laundry detergent 1 kg", symbol: "bag1kg", nameEn: "Detergent bag of 1 kg", nameFr: "Sachet de lessive de 1 kg", baseUnit: "bag1kg", conversionRate: 1 },
] as const;

async function reconcileReferenceData(
  prisma: PrismaClient,
  organization: { id: string; country: string | null; countryCode: string | null },
  input: { referenceDate: string; syntheticOrganizationIds: string[] },
  report: ReferenceSeedReport,
) {
  const syntheticScope = input.syntheticOrganizationIds.includes(organization.id);
  // The inspected legacy fixture used one Pack->piece multiplier for unrelated
  // paper, water and detergent packaging. Preserve package counts and history;
  // map each known fixture to a package whose contents are explicit.
  if (syntheticScope) {
    for (const definition of packagingDefinitions) {
      const items = await prisma.item.findMany({ where: { organizationId: organization.id, id: { startsWith: `${organization.id}_item_` }, nameEn: definition.name }, include: { unit: true } });
      for (const item of items) {
        if (item.unit?.symbol !== "pack" && item.unit?.symbol !== definition.symbol) continue;
        let unit = await prisma.unit.findUnique({ where: { organizationId_symbol: { organizationId: organization.id, symbol: definition.symbol } } });
        if (unit && (unit.type !== UnitType.QUANTITY || unit.baseUnit !== definition.baseUnit || !unit.conversionRate?.equals(definition.conversionRate))) {
          report.issues.push({ organizationId: organization.id, code: "PACKAGING_UNIT_COLLISION", ids: [unit.id, item.id], detail: "Existing unit with this symbol has different conversion semantics and was preserved." });
          continue;
        }
        if (!unit) {
          unit = await prisma.unit.create({ data: { id: stableId("unit", organization.id, definition.symbol), organizationId: organization.id, symbol: definition.symbol, nameEn: definition.nameEn, nameFr: definition.nameFr, type: UnitType.QUANTITY, baseUnit: definition.baseUnit, conversionRate: definition.conversionRate } });
          report.referenceChanges.push({ organizationId: organization.id, model: "Unit", id: unit.id, reason: `Explicit packaging for ${item.nameEn}; transaction quantities continue to count packages.`, before: null, after: { symbol: unit.symbol, baseUnit: unit.baseUnit, conversionRate: unit.conversionRate?.toString() } });
        }
        if (item.unitId !== unit.id) {
          await prisma.item.update({ where: { id: item.id }, data: { unitId: unit.id } });
          report.referenceChanges.push({ organizationId: organization.id, model: "Item.unitId", id: item.id, reason: "Replace ambiguous generic package with the same count of explicitly defined packages. Names, stock quantities, costs, and historical lines are unchanged.", before: item.unitId, after: unit.id });
        }
      }
    }
    const oldPack = await prisma.unit.findUnique({ where: { organizationId_symbol: { organizationId: organization.id, symbol: "pack" } }, include: { _count: { select: { items: true } } } });
    if (oldPack?.id === `${organization.id}_unit_002` && oldPack.baseUnit === "piece" && oldPack.conversionRate?.equals(1)) {
      await prisma.unit.update({ where: { id: oldPack.id }, data: { baseUnit: "pack", conversionRate: 1, isActive: oldPack._count.items > 0 } });
      report.referenceChanges.push({ organizationId: organization.id, model: "Unit", id: oldPack.id, reason: "Retain original reference ID as a legacy package count; remove false universal package-to-piece conversion and retire when unused.", before: { baseUnit: oldPack.baseUnit, active: oldPack.isActive }, after: { baseUnit: "pack", active: oldPack._count.items > 0 } });
    }
    const ream = await prisma.unit.findUnique({ where: { organizationId_symbol: { organizationId: organization.id, symbol: "ream500" } } });
    if (ream && !(await prisma.unit.findUnique({ where: { organizationId_symbol: { organizationId: organization.id, symbol: "sheet" } } }))) {
      const sheet = await prisma.unit.create({ data: { id: stableId("unit", organization.id, "sheet"), organizationId: organization.id, symbol: "sheet", type: UnitType.QUANTITY, nameEn: "Sheet", nameFr: "Feuille", baseUnit: "sheet", conversionRate: 1 } });
      report.referenceChanges.push({ organizationId: organization.id, model: "Unit", id: sheet.id, reason: "Conversion base for the 500-sheet A4 ream; valid reference configuration even when no loose-sheet SKU is sold.", before: null, after: { symbol: "sheet", conversionRate: 1 } });
    }
  }

  const [units, taxes, items] = await Promise.all([
    prisma.unit.findMany({ where: { organizationId: organization.id }, include: { _count: { select: { items: true } } } }),
    prisma.taxRate.findMany({ where: { organizationId: organization.id }, include: { _count: { select: { items: true } } } }),
    prisma.item.findMany({ where: { organizationId: organization.id }, include: { unit: true, taxRate: true } }),
  ]);
  for (const item of items) {
    if (!item.unitId || item.unit?.organizationId !== organization.id) report.issues.push({ organizationId: organization.id, code: "ITEM_UNIT_MISSING_OR_CROSS_TENANT", ids: [item.id], detail: "Requires an explicit product-specific unit mapping." });
    if (!item.taxRateId || item.taxRate?.organizationId !== organization.id) report.issues.push({ organizationId: organization.id, code: "ITEM_TAX_MISSING_OR_CROSS_TENANT", ids: [item.id], detail: "Tax treatment requires a supported jurisdiction and product classification." });
  }
  const countryCode = organization.countryCode?.toUpperCase() ?? (/^(Cameroon|Cameroun)$/i.test(organization.country ?? "") ? "CM" : undefined);
  if (countryCode === "CM") {
    try {
      const resolution = resolveCameroonStandardVatRateBps(input.referenceDate);
      report.taxProvenance.push({ organizationId: organization.id, resolution });
      for (const tax of taxes) {
        if (/standard|normale/i.test(tax.nameEn) && (tax.type !== TaxType.VAT || !tax.rate.equals(new Prisma.Decimal(resolution.value).div(100)))) report.issues.push({ organizationId: organization.id, code: "STANDARD_VAT_RATE_MISMATCH", ids: [tax.id], detail: "Current reference rate differs from the dated country pack; no historical tax rates were rewritten." });
        if (tax.rate.equals(0) && tax._count.items > 0) report.issues.push({ organizationId: organization.id, code: "ZERO_TAX_ELIGIBILITY_REVIEW", ids: [tax.id], detail: "The TaxRate model cannot distinguish zero-rating, exemption, and outside-scope treatment; product-specific source evidence is required." });
      }
      if (items.length) report.issues.push({ organizationId: organization.id, code: "PRODUCT_TAX_CLASSIFICATION_REVIEW", ids: items.map((item) => item.id), detail: "Existing item tax assignments are retained. The pack resolves the standard VAT rate but provides no product exemption schedule; blanket assignments cannot be certified by this reseed." });
    } catch (error) {
      report.issues.push({ organizationId: organization.id, code: "COUNTRY_PACK_UNRESOLVED", detail: error instanceof Error ? error.message : "Country-pack resolution failed." });
    }
  } else if (taxes.length || items.length) report.issues.push({ organizationId: organization.id, code: "TAX_COUNTRY_UNRESOLVED", detail: "No supported, unambiguous country configuration. Existing taxes and item treatments preserved." });
  for (const unit of units) {
    report.referenceInventory.push({ organizationId: organization.id, model: "Unit", id: unit.id, name: unit.nameEn, itemCount: unit._count.items, purpose: unit._count.items ? "Used by catalog products" : unit.symbol === "sheet" ? "Conversion base for A4 reams" : !unit.isActive ? "Preserved inactive legacy reference" : "Existing reference configuration retained; no arbitrary filler added" });
    if (/(?:^Unit\s*\d+$|placeholder|lorem)/i.test(unit.nameEn)) report.issues.push({ organizationId: organization.id, code: "MEANINGLESS_UNIT_REQUIRES_MAPPING", ids: [unit.id], detail: "No product meaning can safely be inferred from this name." });
    if (unit.conversionRate && unit.conversionRate.lte(0)) report.issues.push({ organizationId: organization.id, code: "INVALID_UNIT_CONVERSION", ids: [unit.id], detail: "Conversion factor must be positive." });
  }
  for (const tax of taxes) {
    report.referenceInventory.push({ organizationId: organization.id, model: "TaxRate", id: tax.id, name: tax.nameEn, itemCount: tax._count.items, purpose: tax._count.items ? "Existing catalog tax assignment; product eligibility review recorded separately" : "Existing unused tax configuration retained; no eligibility or certification claimed" });
    if (/(?:^Tax\s*\d+$|placeholder|lorem)/i.test(tax.nameEn)) report.issues.push({ organizationId: organization.id, code: "MEANINGLESS_TAX_REQUIRES_MAPPING", ids: [tax.id], detail: "No tax classification inferred from a placeholder label." });
  }
}

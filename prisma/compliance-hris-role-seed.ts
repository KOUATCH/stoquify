import argon2 from "argon2";
import { createHash } from "crypto";
import {
  HrisEmploymentAssignmentStatus,
  HrisEmploymentAssignmentType,
  HrisOperationalStatus,
  HrisOrgUnitStatus,
  HrisOrgUnitType,
  HrisPositionStatus,
  InventoryTransactionTimeProvenance,
  Locale,
  LocationType,
  PayrollContractStatus,
  PayrollContractType,
  PayrollEmployeeStatus,
  PrismaClient,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client";

import { PERMISSIONS } from "../lib/permissions";

type ComplianceRolePersona = {
  code: string;
  nameEn: string;
  nameFr: string;
  description: string;
  emailLocalPart: string;
  firstName: string;
  lastName: string;
  primarySourceName?: { firstName: string; lastName: string };
  department: "EXECUTIVE" | "GOVERNANCE" | "OPERATIONS" | "FINANCE" | "PEOPLE" | "TECHNOLOGY" | "ASSURANCE";
  permissionTerms: string[];
  readOnly?: boolean;
  allPermissions?: boolean;
  sourceClassification?: "SUPPLIED_CANDIDATE" | "SYNTHETIC_DEVELOPMENT_PERSONA" | "SYNTHETIC_QUALIFICATION_PENDING";
};


export const DOCUMENT_G1_CANDIDATE_ROLES = [
  { roleCode: "product_owner", sourceName: { firstName: "Arielle", lastName: "Yongwa" } },
  { roleCode: "financial_controller", sourceName: { firstName: "Tchami", lastName: "Jennifer" } },
  { roleCode: "payments_owner", sourceName: { firstName: "Yonga", lastName: "Junie" } },
  { roleCode: "retail_operations_owner", sourceName: { firstName: "Tamen", lastName: "Max" } },
  { roleCode: "pos_architect", sourceName: { firstName: "tchakoumiLorrain", lastName: "" } },
  { roleCode: "security_owner", sourceName: { firstName: "Yonga", lastName: "Springfield" } },
  { roleCode: "treasury_owner", sourceName: { firstName: "Tamen", lastName: "Stanick" } },
  { roleCode: "risk_owner", sourceName: { firstName: "Tamen", lastName: "Martial" } },
  { roleCode: "qa_owner", sourceName: { firstName: "Sonkeng", lastName: "Steve" } },
  { roleCode: "support_owner", sourceName: { firstName: "Etoo", lastName: "Naomie" } },
  { roleCode: "qualified_cameroon_country_pack_reviewer", sourceName: { firstName: "Kouatchoua", lastName: "mMark" } },
  { roleCode: "sre_owner", sourceName: { firstName: "Ronald", lastName: "Djakou" } },
  { roleCode: "order_to_cash_product_owner", sourceName: { firstName: "Tamen", lastName: "Marceline" } },
  { roleCode: "qualified_accounting_reviewer", sourceName: { firstName: "Tchana", lastName: "Nikita" } },
  { roleCode: "inventory_controller", sourceName: { firstName: "Tchana", lastName: "Rose" } },
  { roleCode: "fulfillment_owner", sourceName: { firstName: "Yonga", lastName: "Lysette" } },
  { roleCode: "accounting_owner", sourceName: { firstName: "Yongwa", lastName: "Eli" } },
] as const;

const BASE_ROLE_PERSONAS: ComplianceRolePersona[] = [
  { code: "super_admin", nameEn: "Super Admin", nameFr: "Super administrateur", description: "Full local development tenant administration.", emailLocalPart: "super.admin", firstName: "Amina", lastName: "Ngono", department: "EXECUTIVE", permissionTerms: [], allPermissions: true },
  { code: "admin", nameEn: "Admin", nameFr: "Administrateur", description: "Local development organization administration.", emailLocalPart: "admin", firstName: "Marc", lastName: "Dubois", department: "EXECUTIVE", permissionTerms: [], allPermissions: true },
  { code: "branch_manager", nameEn: "Branch Manager", nameFr: "Responsable agence", description: "Branch operations and local control oversight.", emailLocalPart: "branch.manager", firstName: "Claire", lastName: "Mballa", department: "OPERATIONS", permissionTerms: ["LOCATION", "INVENTORY", "PURCHASE", "SALES", "POS", "CASH", "REPORT", "ANALYTICS", "APPROVE"] },
  { code: "inventory_manager", nameEn: "Inventory Manager", nameFr: "Responsable inventaire", description: "Inventory catalog, stock and movement management.", emailLocalPart: "inventory.manager", firstName: "Jean", lastName: "Talla", department: "OPERATIONS", permissionTerms: ["INVENTORY", "ITEM", "CATEGORY", "BRAND", "UNIT", "STOCK", "TRANSFER", "ADJUST", "SERIAL", "GOODS"] },
  { code: "sales_manager", nameEn: "Sales Manager", nameFr: "Responsable ventes", description: "Sales, POS and revenue oversight.", emailLocalPart: "sales.manager", firstName: "Sophie", lastName: "Kamdem", department: "OPERATIONS", permissionTerms: ["SALES", "CUSTOMER", "POS", "PAYMENT", "REFUND", "CASH", "REVENUE", "ANALYTICS"] },
  { code: "cashier_pos_user", nameEn: "Cashier/POS User", nameFr: "Caissier POS", description: "Daily POS, receipt, payment and cash-drawer operation.", emailLocalPart: "cashier", firstName: "Grace", lastName: "Etame", department: "OPERATIONS", permissionTerms: ["POS", "CASH", "PAYMENT", "RECEIPT", "READ_ITEMS", "READ_CUSTOMERS"] },
  { code: "purchaser", nameEn: "Purchaser", nameFr: "Acheteur", description: "Supplier, purchase-order and goods-receipt operation.", emailLocalPart: "purchaser", firstName: "Patrick", lastName: "Fouda", department: "OPERATIONS", permissionTerms: ["PURCHASE", "SUPPLIER", "GOODS", "RECEIVE", "INVENTORY_COST"] },
  { code: "accountant", nameEn: "Accountant", nameFr: "Comptable", description: "Ledger, finance, reconciliation, tax and close operation.", emailLocalPart: "accountant", firstName: "Nadia", lastName: "Essomba", department: "FINANCE", permissionTerms: ["FINANCE", "FINANCIAL", "PAYABLE", "RECEIVABLE", "PAYMENT", "TAX", "CASH", "LEDGER", "JOURNAL", "BUDGET", "PROFIT"] },
  { code: "hr_manager", nameEn: "HR Manager", nameFr: "Responsable RH", description: "HRIS, employee, attendance and payroll administration.", emailLocalPart: "hr.manager", firstName: "Luc", lastName: "Biya", department: "PEOPLE", permissionTerms: ["USER", "PRESENCE", "PAYROLL", "SCHEDULE", "ATTENDANCE", "EMPLOYEE", "APPROVE"] },
  { code: "auditor", nameEn: "Auditor", nameFr: "Auditeur", description: "Read-only audit, evidence and compliance review.", emailLocalPart: "auditor", firstName: "Helene", lastName: "Mbarga", department: "ASSURANCE", permissionTerms: ["AUDIT", "COMPLIANCE", "REPORT"], readOnly: true },
  { code: "read_only", nameEn: "Read-only/User", nameFr: "Utilisateur lecture seule", description: "Read-only authenticated development persona.", emailLocalPart: "readonly", firstName: "Yann", lastName: "Njock", department: "ASSURANCE", permissionTerms: [], readOnly: true },
  { code: "user", nameEn: "User", nameFr: "Utilisateur", description: "Basic authenticated employee self-service persona.", emailLocalPart: "user", firstName: "Emma", lastName: "Fotso", department: "PEOPLE", permissionTerms: ["PROFILE", "OWN", "CLOCK"] },
];

const COMPLIANCE_ROLE_PERSONAS: ComplianceRolePersona[] = [
  ...BASE_ROLE_PERSONAS,
  { code: "database_migration_operator", nameEn: "Database Migration Operator", nameFr: "Operateur de migration de base de donnees", description: "Development migration execution role; not production authorization.", emailLocalPart: "migration.operator", firstName: "Bertrand", lastName: "Ewane", primarySourceName: { firstName: "Sango", lastName: "Malo" }, department: "TECHNOLOGY", permissionTerms: ["ORGANIZATION", "SETTINGS", "AUDIT"], sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "independent_migration_checker", nameEn: "Independent Migration Checker", nameFr: "Verificateur independant de migration", description: "Independent development migration verification role; not production authorization.", emailLocalPart: "migration.checker", firstName: "Clarisse", lastName: "Njoya", primarySourceName: { firstName: "Maximilliano", lastName: "Bonga" }, department: "ASSURANCE", permissionTerms: ["AUDIT", "COMPLIANCE", "SETTINGS"], readOnly: true, sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "maker", nameEn: "Maker", nameFr: "Preparateur", description: "Development transaction preparer kept separate from checker authority.", emailLocalPart: "maker", firstName: "Armand", lastName: "Fopa", primarySourceName: { firstName: "Tamen", lastName: "Marceline" }, department: "OPERATIONS", permissionTerms: ["CREATE", "PROCESS", "REQUEST", "PREPARE"], sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "checker", nameEn: "Checker", nameFr: "Verificateur", description: "Development verification persona kept separate from maker authority.", emailLocalPart: "checker", firstName: "Diane", lastName: "Mvondo", primarySourceName: { firstName: "Yonga", lastName: "Springfield" }, department: "ASSURANCE", permissionTerms: ["APPROVE", "AUDIT", "COMPLIANCE", "REPORT"], sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "product_owner", nameEn: "Product Owner", nameFr: "Responsable produit", description: "Internal product ownership persona; formal appointment remains external evidence.", emailLocalPart: "product.owner", firstName: "Estelle", lastName: "Nkom", department: "EXECUTIVE", permissionTerms: ["DASHBOARD", "REPORT", "ANALYTICS"], readOnly: true },
  { code: "product_approver", nameEn: "Product Approver", nameFr: "Approbateur produit", description: "Development product approval persona; no signature or production approval is implied.", emailLocalPart: "product.approver", firstName: "Samuel", lastName: "Ebongue", primarySourceName: { firstName: "Kouatchoua", lastName: "Mark" }, department: "EXECUTIVE", permissionTerms: ["APPROVE", "REPORT", "ANALYTICS"], sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "financial_controller", nameEn: "Financial Controller", nameFr: "Controleur financier", description: "Financial control and review persona.", emailLocalPart: "financial.controller", firstName: "Rodrigue", lastName: "Etoa", department: "FINANCE", permissionTerms: ["FINANCIAL", "LEDGER", "JOURNAL", "BUDGET", "AUDIT", "APPROVE"] },
  { code: "controller_approver", nameEn: "Controller Approver", nameFr: "Approbateur controleur", description: "Development controller approval persona; no external signature is implied.", emailLocalPart: "controller.approver", firstName: "Mireille", lastName: "Nanga", primarySourceName: { firstName: "Kouatchoua", lastName: "Marceline" }, department: "FINANCE", permissionTerms: ["FINANCIAL", "LEDGER", "AUDIT", "APPROVE"], sourceClassification: "SUPPLIED_CANDIDATE" },
  { code: "payments_owner", nameEn: "Payments Owner", nameFr: "Responsable paiements", description: "Payment operations and reconciliation ownership persona.", emailLocalPart: "payments.owner", firstName: "Carine", lastName: "Mbappe", department: "FINANCE", permissionTerms: ["PAYMENT", "CASH", "RECONCILIATION", "SETTLEMENT", "APPROVE"] },
  { code: "retail_operations_owner", nameEn: "Retail Operations Owner", nameFr: "Responsable operations retail", description: "Retail operating-policy ownership persona.", emailLocalPart: "retail.operations.owner", firstName: "Boris", lastName: "Moukouri", department: "OPERATIONS", permissionTerms: ["POS", "SALES", "INVENTORY", "LOCATION", "REPORT", "APPROVE"] },
  { code: "pos_architect", nameEn: "POS Architect", nameFr: "Architecte POS", description: "POS architecture and operational design persona.", emailLocalPart: "pos.architect", firstName: "Kevin", lastName: "Abanda", department: "TECHNOLOGY", permissionTerms: ["POS", "SETTINGS", "REPORT"], readOnly: true },
  { code: "security_owner", nameEn: "Security Owner", nameFr: "Responsable securite", description: "Security governance persona; administrator access alone does not establish authority.", emailLocalPart: "security.owner", firstName: "Solange", lastName: "Mekongo", department: "GOVERNANCE", permissionTerms: ["USER", "ROLE", "AUDIT", "SECURITY", "COMPLIANCE"], readOnly: true },
  { code: "treasury_owner", nameEn: "Treasury Owner", nameFr: "Responsable tresorerie", description: "Treasury, settlement and cash-governance persona.", emailLocalPart: "treasury.owner", firstName: "Mireille", lastName: "Ekani", department: "FINANCE", permissionTerms: ["CASH", "PAYMENT", "SETTLEMENT", "RECONCILIATION", "FINANCIAL", "APPROVE"] },
  { code: "risk_owner", nameEn: "Risk Owner", nameFr: "Responsable risques", description: "Risk-review persona; formal risk-acceptance authority remains evidence-bound.", emailLocalPart: "risk.owner", firstName: "Alain", lastName: "Fokou", department: "GOVERNANCE", permissionTerms: ["AUDIT", "COMPLIANCE", "REPORT", "ANALYTICS"], readOnly: true },
  { code: "qa_owner", nameEn: "QA Owner", nameFr: "Responsable qualite", description: "Quality and support-matrix evidence persona.", emailLocalPart: "qa.owner", firstName: "Audrey", lastName: "Ndam", department: "ASSURANCE", permissionTerms: ["AUDIT", "REPORT", "ANALYTICS"], readOnly: true },
  { code: "support_owner", nameEn: "Support Owner", nameFr: "Responsable support", description: "Supportability and escalation ownership persona.", emailLocalPart: "support.owner", firstName: "Pascal", lastName: "Ekotto", department: "OPERATIONS", permissionTerms: ["USER", "LOCATION", "REPORT", "READ"], readOnly: true },
  { code: "sre_owner", nameEn: "SRE Owner", nameFr: "Responsable fiabilite", description: "Reliability, SLO and error-budget ownership persona.", emailLocalPart: "sre.owner", firstName: "Christian", lastName: "Nlend", department: "TECHNOLOGY", permissionTerms: ["AUDIT", "REPORT", "SETTINGS"], readOnly: true },
  { code: "order_to_cash_product_owner", nameEn: "Order-to-Cash Product Owner", nameFr: "Responsable produit commande-encaissement", description: "End-to-end order-to-cash ownership persona.", emailLocalPart: "order.to.cash.owner", firstName: "Sandrine", lastName: "Ngassa", department: "OPERATIONS", permissionTerms: ["SALES", "CUSTOMER", "PAYMENT", "RECEIVABLE", "REPORT", "ANALYTICS"], readOnly: true },
  { code: "qualified_accounting_reviewer", nameEn: "Qualified Accounting Reviewer (verification pending)", nameFr: "Reviseur comptable qualifie (verification requise)", description: "Candidate review persona only; qualification evidence and appointment remain unresolved.", emailLocalPart: "accounting.reviewer", firstName: "Blandine", lastName: "Menye", department: "ASSURANCE", permissionTerms: ["FINANCIAL", "LEDGER", "JOURNAL", "AUDIT", "COMPLIANCE"], readOnly: true, sourceClassification: "SYNTHETIC_QUALIFICATION_PENDING" },
  { code: "qualified_cameroon_country_pack_reviewer", nameEn: "Qualified Cameroon Country-Pack Reviewer (verification pending)", nameFr: "Reviseur qualifie du pack pays Cameroun (verification requise)", description: "Candidate review persona only; Cameroon qualification and independence evidence remain unresolved.", emailLocalPart: "cameroon.country.pack.reviewer", firstName: "Josephine", lastName: "Ebogo", department: "ASSURANCE", permissionTerms: ["COMPLIANCE", "TAX", "PAYROLL", "AUDIT"], readOnly: true, sourceClassification: "SYNTHETIC_QUALIFICATION_PENDING" },
  { code: "inventory_controller", nameEn: "Inventory Controller", nameFr: "Controleur inventaire", description: "Inventory-control and variance-review persona.", emailLocalPart: "inventory.controller", firstName: "Didier", lastName: "Belinga", department: "FINANCE", permissionTerms: ["INVENTORY", "STOCK", "ADJUST", "TRANSFER", "AUDIT", "APPROVE"] },
  { code: "fulfillment_owner", nameEn: "Fulfillment Owner", nameFr: "Responsable execution commandes", description: "Fulfillment-process ownership persona.", emailLocalPart: "fulfillment.owner", firstName: "Agnes", lastName: "Metou", department: "OPERATIONS", permissionTerms: ["ORDER", "GOODS", "INVENTORY", "DELIVERY", "REPORT"] },
  { code: "accounting_owner", nameEn: "Accounting Owner", nameFr: "Responsable comptabilite", description: "Accounting-policy and stock/COGS ownership persona.", emailLocalPart: "accounting.owner", firstName: "Francis", lastName: "Mbe", department: "FINANCE", permissionTerms: ["FINANCIAL", "LEDGER", "JOURNAL", "ACCOUNT", "AUDIT", "APPROVE"] },
  { code: "payroll_administrator", nameEn: "Payroll Administrator", nameFr: "Administrateur paie", description: "Payroll master-data and configuration administration.", emailLocalPart: "payroll.administrator", firstName: "Irene", lastName: "Ndongo", department: "PEOPLE", permissionTerms: ["PAYROLL", "EMPLOYEE", "USER", "SCHEDULE"] },
  { code: "payroll_processor", nameEn: "Payroll Processor", nameFr: "Gestionnaire de paie", description: "Payroll calculation and preparation persona, separate from approval.", emailLocalPart: "payroll.processor", firstName: "Lionel", lastName: "Atangana", department: "PEOPLE", permissionTerms: ["PAYROLL_READ", "PAYROLL_CREATE", "PAYROLL_UPDATE", "PAYROLL_PROCESS", "PAYROLL_REPORT"] },
  { code: "payroll_approver", nameEn: "Payroll Approver", nameFr: "Approbateur paie", description: "Payroll review and approval persona, separate from processing.", emailLocalPart: "payroll.approver", firstName: "Chantal", lastName: "Owona", department: "FINANCE", permissionTerms: ["PAYROLL_READ", "PAYROLL_APPROVE", "PAYROLL_REPORT", "AUDIT"] },
  { code: "compensation_approver", nameEn: "Compensation Approver", nameFr: "Approbateur remuneration", description: "Compensation-change review and approval persona.", emailLocalPart: "compensation.approver", firstName: "Cecile", lastName: "Kengne", department: "PEOPLE", permissionTerms: ["PAYROLL", "EMPLOYEE", "APPROVE", "AUDIT"] },
  { code: "attendance_time_administrator", nameEn: "Attendance/Time Administrator", nameFr: "Administrateur temps et presence", description: "Work calendar, attendance, time-import and anomaly administration.", emailLocalPart: "attendance.time.administrator", firstName: "Raissa", lastName: "Biloa", department: "PEOPLE", permissionTerms: ["ATTENDANCE", "PRESENCE", "SCHEDULE", "REPORT"] },
  { code: "manager", nameEn: "Manager", nameFr: "Gestionnaire", description: "People-management and scoped operational approval persona.", emailLocalPart: "manager", firstName: "Eric", lastName: "Nguema", department: "OPERATIONS", permissionTerms: ["TEAM", "PRESENCE", "ATTENDANCE", "REPORT", "APPROVE"] },
  { code: "employee_self_service", nameEn: "Employee/Self-Service User", nameFr: "Employe libre-service", description: "Employee payslip, presence, schedule and profile self-service.", emailLocalPart: "employee.self.service", firstName: "Anita", lastName: "Nsame", department: "PEOPLE", permissionTerms: ["OWN", "PROFILE", "CLOCK", "PAYROLL_READ"] },
];

export const COMPLIANCE_HRIS_ROLE_CODES = COMPLIANCE_ROLE_PERSONAS.map((persona) => persona.code);
export const COMPLIANCE_HRIS_ROLE_COUNT = COMPLIANCE_ROLE_PERSONAS.length;

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const READ_ONLY_PERMISSIONS = ALL_PERMISSIONS.filter((permission) =>
  /(^READ_|_READ$|^VIEW_|_VIEW$|^EXPORT_|_REPORT|REPORTS_READ|ANALYTICS_READ)/.test(permission),
);

function selectedPermissions(persona: ComplianceRolePersona) {
  if (persona.allPermissions) return ["*", ...ALL_PERMISSIONS];
  const selected = ALL_PERMISSIONS.filter((permission) =>
    persona.permissionTerms.some((term) => permission.includes(term)),
  );
  if (!persona.readOnly) return [...new Set(selected)];
  const matchedReadOnly = READ_ONLY_PERMISSIONS.filter((permission) =>
    persona.permissionTerms.some((term) => permission.includes(term)),
  );
  return [...new Set(matchedReadOnly.length > 0 ? matchedReadOnly : READ_ONLY_PERMISSIONS)];
}

const evidenceHash = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const effectiveFrom = new Date("2026-01-01T00:00:00.000Z");
const approvalAt = new Date("2026-01-05T09:00:00.000Z");
const sourceDocument = "docs/blockers-and-gates/hris-payroll-compliance-prefill/COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_RECONCILED_WORKING_COPY_2026-08-19.docx";

const displayName = (identity: { firstName: string; lastName: string }) =>
  [identity.firstName, identity.lastName].filter(Boolean).join(" ");

function identityFor(persona: ComplianceRolePersona, organizationIndex: number) {
  const documentIdentity = DOCUMENT_G1_CANDIDATE_ROLES.find((entry) => entry.roleCode === persona.code)?.sourceName;
  const sourceIdentity = organizationIndex === 1
    ? documentIdentity ?? persona.primarySourceName
    : undefined;
  return {
    firstName: sourceIdentity?.firstName ?? persona.firstName,
    lastName: sourceIdentity?.lastName ?? persona.lastName,
    classification: sourceIdentity
      ? "SUPPLIED_CANDIDATE"
      : persona.sourceClassification ?? "SYNTHETIC_DEVELOPMENT_PERSONA",
  };
}

function orgUnitDefinition(department: ComplianceRolePersona["department"]) {
  const definitions = {
    EXECUTIVE: ["Executive and Product", HrisOrgUnitType.DIVISION],
    GOVERNANCE: ["Governance and Security", HrisOrgUnitType.DEPARTMENT],
    OPERATIONS: ["Retail Operations", HrisOrgUnitType.DIVISION],
    FINANCE: ["Finance and Accounting", HrisOrgUnitType.DEPARTMENT],
    PEOPLE: ["People and Payroll", HrisOrgUnitType.DEPARTMENT],
    TECHNOLOGY: ["Platform Engineering", HrisOrgUnitType.DEPARTMENT],
    ASSURANCE: ["Audit and Assurance", HrisOrgUnitType.DEPARTMENT],
  } as const;
  return definitions[department];
}

function roleEmail(persona: ComplianceRolePersona, organizationIndex: number) {
  return `${persona.emailLocalPart}.rds-org${String(organizationIndex).padStart(3, "0")}@stockflow.test`;
}

export type ComplianceRoleCredential = {
  organizationId: string;
  name: string;
  email: string;
  password: string;
  role: string;
  userId: string;
  note: string;
};

export async function ensureComplianceHrisRoleCoverage(input: {
  prisma: PrismaClient;
  password: string;
}) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const organizations = await input.prisma.organization.findMany({
    where: { id: { startsWith: "rds_org_" }, isActive: true, deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, defaultLocale: true, timezone: true, currency: true, locations: { where: { isActive: true, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { id: "asc" }], select: { id: true } } },
  });
  if (organizations.length !== 2) {
    throw new Error(`Compliance HRIS role coverage requires exactly two complete rds_ organizations; found ${organizations.length}.`);
  }

  const credentials: ComplianceRoleCredential[] = [];
  const organizationSummaries = [];

  for (const [organizationOffset, organization] of organizations.entries()) {
    const organizationIndex = organizationOffset + 1;
    const defaultLocationId = organization.locations[0]?.id;
    if (!defaultLocationId) throw new Error(`No active location exists for ${organization.id}.`);

    if (organizationIndex === 1) {
      await input.prisma.organization.update({
        where: { id: organization.id },
        data: { tradeName: "Stoquify" },
      });
    }

    const orgUnits = new Map<string, string>();
    for (const department of [...new Set(COMPLIANCE_ROLE_PERSONAS.map((persona) => persona.department))]) {
      const [name, type] = orgUnitDefinition(department);
      const unit = await input.prisma.hrisOrgUnit.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: `CMP-${department}` } },
        create: {
          id: `${organization.id}_compliance_org_unit_${department.toLowerCase()}`,
          organizationId: organization.id,
          code: `CMP-${department}`,
          name,
          type,
          status: HrisOrgUnitStatus.ACTIVE,
          effectiveFrom,
        },
        update: { name, type, status: HrisOrgUnitStatus.ACTIVE, effectiveTo: null },
      });
      orgUnits.set(department, unit.id);
    }

    const hrManagerEmail = roleEmail(COMPLIANCE_ROLE_PERSONAS.find((persona) => persona.code === "hr_manager")!, organizationIndex);
    const payrollApproverEmail = roleEmail(COMPLIANCE_ROLE_PERSONAS.find((persona) => persona.code === "payroll_approver")!, organizationIndex);
    const checkerEmail = roleEmail(COMPLIANCE_ROLE_PERSONAS.find((persona) => persona.code === "checker")!, organizationIndex);

    const calendar = await input.prisma.hrisWorkCalendar.upsert({
      where: { organizationId_code_version: { organizationId: organization.id, code: "CM-STANDARD-WEEK", version: 1 } },
      create: {
        id: `${organization.id}_compliance_work_calendar`,
        organizationId: organization.id,
        code: "CM-STANDARD-WEEK",
        name: "Cameroon standard development work calendar",
        countryCode: "CM",
        timezone: organization.timezone,
        version: 1,
        status: HrisOperationalStatus.ACTIVE,
        effectiveFrom,
        sourceHash: evidenceHash(`${organization.id}:calendar:synthetic-development`),
        metadata: { sourceClassification: "SYNTHETIC_DEVELOPMENT_CONFIGURATION", legalReviewStatus: "REQUIRES_QUALIFIED_HUMAN_REVIEW" },
      },
      update: { status: HrisOperationalStatus.ACTIVE, effectiveTo: null },
    });

    const seededPeople = new Map<string, { userId: string; employeeId: string; assignmentId: string; name: string }>();

    for (const [personaOffset, persona] of COMPLIANCE_ROLE_PERSONAS.entries()) {
      const identity = identityFor(persona, organizationIndex);
      const email = roleEmail(persona, organizationIndex);
      let role = await input.prisma.role.findUnique({
        where: { organizationId_code: { organizationId: organization.id, code: persona.code } },
      });
      if (!role) {
        role = await input.prisma.role.create({
          data: {
            id: `${organization.id}_compliance_role_${persona.code}`,
            organizationId: organization.id,
            code: persona.code,
            nameEn: persona.nameEn,
            nameFr: persona.nameFr,
            description: `${persona.description} Synthetic development RBAC coverage only; this row is not a statutory appointment, signature, qualification, or production authorization.`,
            permissions: selectedPermissions(persona),
          },
        });
      } else if (role.id.startsWith(`${organization.id}_compliance_role_`)) {
        role = await input.prisma.role.update({
          where: { id: role.id },
          data: {
            nameEn: persona.nameEn,
            nameFr: persona.nameFr,
            description: `${persona.description} Synthetic development RBAC coverage only; this row is not a statutory appointment, signature, qualification, or production authorization.`,
            permissions: selectedPermissions(persona),
          },
        });
      }

      const userId = `${organization.id}_compliance_user_${persona.code}`;
      const existingUser = await input.prisma.user.findUnique({ where: { email } });
      const user = existingUser
        ? await input.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: displayName(identity),
              firstName: identity.firstName,
              lastName: identity.lastName,
              jobTitle: persona.nameEn,
              password: passwordHash,
              isActive: true,
              isVerified: true,
              emailVerified: true,
              preferredLocale: organization.defaultLocale,
              roles: { connect: { id: role.id } },
            },
          })
        : await input.prisma.user.create({
            data: {
              id: userId,
              organizationId: organization.id,
              name: displayName(identity),
              email,
              emailVerified: true,
              firstName: identity.firstName,
              lastName: identity.lastName,
              jobTitle: persona.nameEn,
              password: passwordHash,
              isActive: true,
              isVerified: true,
              preferredLocale: organization.defaultLocale,
              roles: { connect: { id: role.id } },
            },
          });

      const orgUnitId = orgUnits.get(persona.department)!;
      const positionCode = `CMP-${persona.code.toUpperCase()}`;
      const position = await input.prisma.hrisPosition.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: positionCode } },
        create: {
          id: `${organization.id}_compliance_position_${persona.code}`,
          organizationId: organization.id,
          orgUnitId,
          locationId: defaultLocationId,
          code: positionCode,
          title: persona.nameEn,
          status: HrisPositionStatus.ACTIVE,
          effectiveFrom,
        },
        update: { orgUnitId, locationId: defaultLocationId, title: persona.nameEn, status: HrisPositionStatus.ACTIVE, effectiveTo: null },
      });

      const existingEmployee = await input.prisma.payrollEmployee.findFirst({
        where: { organizationId: organization.id, userId: user.id },
      });
      const employeeMetadata = {
        seedSource: "compliance-hris-role-seed",
        sourceDocument,
        sourceClassification: identity.classification,
        roleCode: persona.code,
        appointmentStatus: "RBAC_AND_HRIS_CONTEXT_ONLY",
        externalQualificationStatus: persona.sourceClassification === "SYNTHETIC_QUALIFICATION_PENDING" ? "REQUIRES_QUALIFIED_HUMAN_REVIEW" : "NOT_CLAIMED",
        signatureStatus: "NOT_STORED_NOT_CLAIMED",
      };
      const employee = existingEmployee
        ? await input.prisma.payrollEmployee.update({
            where: { id: existingEmployee.id },
            data: {
              displayName: displayName(identity),
              legalName: displayName(identity),
              status: PayrollEmployeeStatus.ACTIVE,
              locationId: defaultLocationId,
              department: persona.department,
              jobTitle: persona.nameEn,
              costCenter: `CMP-${persona.department}`,
              metadata: employeeMetadata,
              deletedAt: null,
            },
          })
        : await input.prisma.payrollEmployee.create({
            data: {
              id: `${organization.id}_compliance_employee_${persona.code}`,
              organizationId: organization.id,
              userId: user.id,
              employeeNumber: `CMP-${String(personaOffset + 1).padStart(3, "0")}`,
              displayName: displayName(identity),
              legalName: displayName(identity),
              status: PayrollEmployeeStatus.ACTIVE,
              hireDate: effectiveFrom,
              countryCode: "CM",
              locationId: defaultLocationId,
              department: persona.department,
              jobTitle: persona.nameEn,
              costCenter: `CMP-${persona.department}`,
              metadata: employeeMetadata,
            },
          });

      const assignmentId = `${organization.id}_compliance_assignment_${persona.code}`;
      const existingAssignment = await input.prisma.hrisEmploymentAssignment.findFirst({
        where: { organizationId: organization.id, employeeId: employee.id, type: HrisEmploymentAssignmentType.PRIMARY, status: HrisEmploymentAssignmentStatus.ACTIVE },
      });
      const assignment = existingAssignment
        ? await input.prisma.hrisEmploymentAssignment.update({
            where: { id: existingAssignment.id },
            data: { positionId: position.id, orgUnitId, status: HrisEmploymentAssignmentStatus.ACTIVE, effectiveTo: null },
          })
        : await input.prisma.hrisEmploymentAssignment.create({
            data: {
              id: assignmentId,
              organizationId: organization.id,
              employeeId: employee.id,
              positionId: position.id,
              orgUnitId,
              type: HrisEmploymentAssignmentType.PRIMARY,
              status: HrisEmploymentAssignmentStatus.ACTIVE,
              effectiveFrom,
            },
          });

      const activeContract = await input.prisma.payrollContract.findFirst({
        where: { organizationId: organization.id, employeeId: employee.id, status: PayrollContractStatus.ACTIVE, deletedAt: null },
      });
      if (!activeContract) {
        await input.prisma.payrollContract.create({
          data: {
            id: `${organization.id}_compliance_contract_${persona.code}`,
            organizationId: organization.id,
            employeeId: employee.id,
            contractNumber: `CMP-${organizationIndex}-${String(personaOffset + 1).padStart(3, "0")}`,
            type: PayrollContractType.CDI,
            status: PayrollContractStatus.ACTIVE,
            effectiveFrom,
            baseSalary: 225_000 + personaOffset * 12_500,
            currency: organization.currency,
            workingHoursPerMonth: 173.33,
            classification: `DEVELOPMENT-${persona.department}`,
            convention: "SYNTHETIC_DEVELOPMENT_ONLY",
            signedDocumentHash: null,
            metadata: { sourceClassification: "SYNTHETIC_DEVELOPMENT_CONTRACT", signatureStatus: "UNRESOLVED_NO_AUTHENTIC_SIGNATURE", sourceDocument },
          },
        });
      }

      const scheduleWhere = { organizationId_employeeId_effectiveFrom: { organizationId: organization.id, employeeId: employee.id, effectiveFrom } };
      await input.prisma.hrisWorkSchedule.upsert({
        where: scheduleWhere,
        create: {
          id: `${organization.id}_compliance_schedule_${persona.code}`,
          organizationId: organization.id,
          employeeId: employee.id,
          calendarId: calendar.id,
          name: "Standard development work schedule",
          timezone: organization.timezone,
          weeklyPattern: { monday: 480, tuesday: 480, wednesday: 480, thursday: 480, friday: 480, saturday: 0, sunday: 0 },
          standardWeeklyMinutes: 2400,
          effectiveFrom,
          status: HrisOperationalStatus.ACTIVE,
          preparedById: user.id,
          sourceHash: evidenceHash(`${organization.id}:${persona.code}:schedule`),
        },
        update: { calendarId: calendar.id, timezone: organization.timezone, status: HrisOperationalStatus.ACTIVE, effectiveTo: null },
      });

      seededPeople.set(persona.code, { userId: user.id, employeeId: employee.id, assignmentId: assignment.id, name: displayName(identity) });
      credentials.push({
        organizationId: organization.id,
        name: displayName(identity),
        email,
        password: input.password,
        role: persona.nameEn,
        userId: user.id,
        note: `${identity.classification}; development-only login. RBAC/HRIS coverage is not an external appointment, signature, qualification, or production authorization.`,
      });
    }

    const hrManager = seededPeople.get("hr_manager")!;
    const payrollApprover = seededPeople.get("payroll_approver")!;
    const checker = seededPeople.get("checker")!;
    await input.prisma.hrisWorkCalendar.update({ where: { id: calendar.id }, data: { reviewedById: hrManager.userId, reviewedAt: approvalAt } });

    const schedules = await input.prisma.hrisWorkSchedule.findMany({
      where: { organizationId: organization.id, employeeId: { in: [...seededPeople.values()].map((person) => person.employeeId) }, effectiveFrom },
      select: { id: true },
    });
    await input.prisma.hrisWorkSchedule.updateMany({
      where: { id: { in: schedules.map((schedule) => schedule.id) } },
      data: { approvedById: payrollApprover.userId, approvedAt: approvalAt, approvalEvidenceHash: evidenceHash(`${organization.id}:schedule-approval:synthetic-development`) },
    });

    const rootManager = seededPeople.get("super_admin")!;
    for (const [roleCode, report] of seededPeople.entries()) {
      if (roleCode === "super_admin") continue;
      await input.prisma.hrisReportingRelationship.upsert({
        where: { id: `${organization.id}_compliance_reporting_${roleCode}` },
        create: {
          id: `${organization.id}_compliance_reporting_${roleCode}`,
          organizationId: organization.id,
          managerEmployeeId: rootManager.employeeId,
          managerAssignmentId: rootManager.assignmentId,
          reportEmployeeId: report.employeeId,
          reportAssignmentId: report.assignmentId,
          type: "DIRECT",
          status: "ACTIVE",
          effectiveFrom,
          approvalEvidenceHash: evidenceHash(`${organization.id}:${roleCode}:reporting-approval:synthetic-development`),
          approvedById: checker.userId,
          reasonHash: evidenceHash(`${organization.id}:${roleCode}:reporting-reason:seed-coverage`),
        },
        update: {
          managerEmployeeId: rootManager.employeeId,
          managerAssignmentId: rootManager.assignmentId,
          reportEmployeeId: report.employeeId,
          reportAssignmentId: report.assignmentId,
          status: "ACTIVE",
          effectiveTo: null,
          approvedById: checker.userId,
        },
      });
    }

    if (organizationIndex === 1) {
      const branchManager = seededPeople.get("branch_manager")!;
      await input.prisma.location.upsert({
        where: { id: "loc_cm_dla_akwa_cert_001" },
        create: {
          id: "loc_cm_dla_akwa_cert_001",
          organizationId: organization.id,
          name: "Douala Akwa Development Certification Store",
          code: "DLA-CERT-001",
          type: LocationType.STORE,
          address: "Akwa, Douala, Cameroon — synthetic development location",
          isActive: true,
          isDefault: false,
          managerId: branchManager.userId,
          requiresApproval: true,
        },
        update: { organizationId: organization.id, name: "Douala Akwa Development Certification Store", isActive: true, deletedAt: null, managerId: branchManager.userId, requiresApproval: true },
      });
      await input.prisma.pOSStation.upsert({
        where: { id: "term_cm_dla_akwa_cert_001" },
        create: {
          id: "term_cm_dla_akwa_cert_001",
          organizationId: organization.id,
          locationId: "loc_cm_dla_akwa_cert_001",
          terminalNumber: "TERM-CERT-001",
          name: "Douala Akwa Certification Terminal 01",
          isActive: true,
          hasCashDrawer: true,
        },
        update: { organizationId: organization.id, locationId: "loc_cm_dla_akwa_cert_001", terminalNumber: "TERM-CERT-001", name: "Douala Akwa Certification Terminal 01", isActive: true, hasCashDrawer: true },
      });
      await input.prisma.cashDrawer.upsert({
        where: { id: "drawer_cm_dla_akwa_cert_001" },
        create: {
          id: "drawer_cm_dla_akwa_cert_001",
          name: "Douala Akwa Certification Cash Drawer 01",
          drawerNumber: "DRAWER-CERT-001",
          locationId: "loc_cm_dla_akwa_cert_001",
          terminalId: "term_cm_dla_akwa_cert_001",
          currentBalance: 0,
          expectedBalance: 0,
          isOpen: false,
        },
        update: { name: "Douala Akwa Certification Cash Drawer 01", drawerNumber: "DRAWER-CERT-001", locationId: "loc_cm_dla_akwa_cert_001", terminalId: "term_cm_dla_akwa_cert_001", isOpen: false },
      });

      const pilotItems = await input.prisma.item.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          inventoryLevels: {
            where: { locationId: defaultLocationId },
            take: 1,
            select: { averageCost: true, reorderPoint: true },
          },
        },
      });
      for (const item of pilotItems) {
        const sourceLevel = item.inventoryLevels[0];
        const averageCost = sourceLevel?.averageCost ?? 0;
        await input.prisma.inventoryLevel.upsert({
          where: {
            itemId_locationId: {
              itemId: item.id,
              locationId: "loc_cm_dla_akwa_cert_001",
            },
          },
          create: {
            id: `loc_cm_dla_akwa_cert_001_${item.id}`,
            itemId: item.id,
            locationId: "loc_cm_dla_akwa_cert_001",
            quantityOnHand: 50,
            quantityReserved: 0,
            quantityAvailable: 50,
            quantityInTransit: 0,
            quantityOnOrder: 0,
            reorderPoint: sourceLevel?.reorderPoint ?? 10,
            averageCost,
            totalValue: Number(averageCost) * 50,
            lastCountDate: effectiveFrom,
            lastTransactionAt: effectiveFrom,
          },
          update: {
            quantityOnHand: 50,
            quantityReserved: 0,
            quantityAvailable: 50,
            quantityInTransit: 0,
            quantityOnOrder: 0,
            averageCost,
            totalValue: Number(averageCost) * 50,
            lastCountDate: effectiveFrom,
            lastTransactionAt: effectiveFrom,
          },
        });
        await input.prisma.inventoryTransaction.upsert({
          where: { id: `loc_cm_dla_akwa_cert_001_initial_${item.id}` },
          create: {
            id: `loc_cm_dla_akwa_cert_001_initial_${item.id}`,
            organizationId: organization.id,
            itemId: item.id,
            locationId: "loc_cm_dla_akwa_cert_001",
            type: TransactionType.INITIAL_STOCK,
            quantity: 50,
            unitCost: averageCost,
            totalCost: Number(averageCost) * 50,
            notes: "Synthetic development certification-store opening stock",
            effectiveAt: effectiveFrom,
            recordedAt: effectiveFrom,
            timeProvenance: InventoryTransactionTimeProvenance.EXPLICIT_SOURCE_TIME,
            createdById: seededPeople.get("inventory_controller")!.userId,
            referenceType: TransactionReferenceType.MANUAL,
            referenceNumber: "DLA-CERT-INITIAL-STOCK",
            serialNumbers: [],
            balanceAfter: 50,
          },
          update: {},
        });
      }
    }

    organizationSummaries.push({
      organizationId: organization.id,
      roleCount: COMPLIANCE_HRIS_ROLE_COUNT,
      personaCount: seededPeople.size,
      orgUnitCount: orgUnits.size,
      reportingRelationshipCount: seededPeople.size - 1,
      makerUserId: seededPeople.get("maker")!.userId,
      checkerUserId: seededPeople.get("checker")!.userId,
      payrollProcessorUserId: seededPeople.get("payroll_processor")!.userId,
      payrollApproverUserId: seededPeople.get("payroll_approver")!.userId,
      segregationOfDuties: "PASS_DISTINCT_SUBJECTS",
      unusedResolvedEmails: { hrManagerEmail, payrollApproverEmail, checkerEmail },
    });
  }

  return { credentials, organizations: organizationSummaries, roleCountPerOrganization: COMPLIANCE_HRIS_ROLE_COUNT };
}

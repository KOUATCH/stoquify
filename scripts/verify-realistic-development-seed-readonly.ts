import "dotenv/config";

import { readFile } from "fs/promises";
import path from "path";

import { Prisma, PrismaClient } from "@prisma/client";

import { verifyPassword } from "@/lib/password";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = new PrismaClient();
const credentialPath = path.join(
  process.cwd(),
  ".seed-artifacts",
  "seed-login-credentials.json",
);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

type Credential = {
  organizationId: string;
  email: string;
  password: string;
  roleCodes: string[];
};

type CredentialArtifact = {
  credentials: Credential[];
};

const REQUIRED_PERSONAS = [
  { label: "Owner", roleCode: "owner" },
  { label: "Accountant", roleCode: "accountant" },
  { label: "External accountant", roleCode: "external_accountant" },
  { label: "Support", roleCode: "support" },
  { label: "Auditor", roleCode: "auditor" },
  { label: "Payroll administrator", roleCode: "payroll_administrator" },
  { label: "HRIS user", roleCode: "hris_user" },
  { label: "Manager", roleCode: "manager" },
  { label: "Inventory controller", roleCode: "inventory_controller" },
  { label: "POS user", roleCode: "pos_user" },
] as const;

const EXTERNAL_ACCOUNTANT_ALLOWED_PERMISSIONS = [
  PERMISSIONS.FINANCIAL_READ,
  PERMISSIONS.FINANCIAL_DASHBOARD_ACCESS,
  PERMISSIONS.CUSTOMER_RECEIVABLES_READ,
  PERMISSIONS.CUSTOMER_AGING_REPORT,
  PERMISSIONS.SUPPLIER_PAYABLES_READ,
  PERMISSIONS.CASH_FLOW_READ,
  PERMISSIONS.CASH_POSITION_READ,
  PERMISSIONS.CASH_PROJECTIONS_READ,
  PERMISSIONS.FINANCIAL_REPORTS_READ,
  PERMISSIONS.FINANCIAL_REPORTS_EXPORT,
  PERMISSIONS.FINANCIAL_ALERTS_READ,
  PERMISSIONS.FINANCIAL_KPI_READ,
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.VIEW_FINANCIAL_REPORTS,
  PERMISSIONS.VIEW_CASH_FLOW_STATEMENT,
  PERMISSIONS.VIEW_GENERAL_LEDGER,
  PERMISSIONS.VIEW_CHART_OF_ACCOUNTS,
  PERMISSIONS.VIEW_JOURNAL_ENTRIES,
  PERMISSIONS.VIEW_FINANCIAL_RATIOS,
  PERMISSIONS.VIEW_FINANCIAL_TRENDS,
  PERMISSIONS.VIEW_FINANCIAL_FORECASTS,
  PERMISSIONS.VIEW_FINANCIAL_AUDIT_TRAIL,
  PERMISSIONS.VIEW_COMPLIANCE_STATUS,
  PERMISSIONS.VIEW_CASH_MANAGEMENT,
] as const;

const EXTERNAL_ACCOUNTANT_FORBIDDEN_PERMISSIONS = [
  PERMISSIONS.GENERATE_FINANCIAL_STATEMENTS,
  PERMISSIONS.APPROVE_FINANCIAL_STATEMENTS,
  PERMISSIONS.PUBLISH_FINANCIAL_STATEMENTS,
  PERMISSIONS.CREATE_JOURNAL_ENTRIES,
  PERMISSIONS.APPROVE_JOURNAL_ENTRIES,
  PERMISSIONS.POST_JOURNAL_ENTRIES,
  PERMISSIONS.REVERSE_JOURNAL_ENTRIES,
  PERMISSIONS.MANAGE_FINANCIAL_CONTROLS,
  PERMISSIONS.CONFIGURE_FINANCIAL_SYSTEM,
  PERMISSIONS.MANAGE_FINANCIAL_PERMISSIONS,
  PERMISSIONS.MANAGE_FINANCIAL_PERIODS,
  PERMISSIONS.CLOSE_FINANCIAL_PERIODS,
  PERMISSIONS.MANAGE_CASH_TRANSACTIONS,
] as const;

function expandEnvValue(value: string) {
  return value.replace(/\$\{([^}]+)\}/g, (_match, key: string) => process.env[key] ?? "");
}

function assertDisposableTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Read-only seed verification refuses NODE_ENV=production.");
  }
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) throw new Error("DATABASE_URL is required.");
  const expanded = expandEnvValue(configured);
  const target = new URL(expanded);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    !LOCAL_HOSTS.has(target.hostname.toLowerCase()) ||
    !/(?:dev|test|local|reconcile|referral|replay|disposable)/i.test(databaseName)
  ) {
    throw new Error(
      "Read-only realistic seed verification requires an explicitly named local disposable database.",
    );
  }
  process.env.DATABASE_URL = expanded;
  return databaseName;
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function verifyCredential(
  tx: Prisma.TransactionClient,
  credential: Credential,
  userId: string,
) {
  const [credentialAccount, user] = await Promise.all([
    tx.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { password: true },
    }),
    tx.user.findUnique({ where: { id: userId }, select: { password: true } }),
  ]);
  const storedHash = credentialAccount?.password ?? user?.password;
  assertCondition(storedHash, `No credential hash exists for ${credential.email}.`);
  assertCondition(
    await verifyPassword(credential.password, storedHash),
    `Credential verification failed for ${credential.email}.`,
  );
}

async function verifyPersonas(
  tx: Prisma.TransactionClient,
  credentials: Credential[],
  organizationIds: string[],
) {
  const verified = [];
  for (const organizationId of organizationIds) {
    for (const persona of REQUIRED_PERSONAS) {
      const role = await tx.role.findUnique({
        where: { organizationId_code: { organizationId, code: persona.roleCode } },
        select: { id: true, code: true, nameEn: true, nameFr: true, permissions: true },
      });
      assertCondition(role, `${persona.label} role is missing from ${organizationId}.`);
      const user = await tx.user.findFirst({
        where: {
          organizationId,
          isActive: true,
          isVerified: true,
          emailVerified: true,
          roles: { some: { id: role.id } },
        },
        select: { id: true, email: true },
      });
      assertCondition(user, `${persona.label} active user is missing from ${organizationId}.`);
      const credential = credentials.find(
        (candidate) =>
          candidate.organizationId === organizationId &&
          candidate.email === user.email &&
          candidate.roleCodes.includes(persona.roleCode),
      );
      assertCondition(credential, `${persona.label} credential reference is missing from ${organizationId}.`);
      await verifyCredential(tx, credential, user.id);

      if (persona.roleCode === "external_accountant") {
        const allowed = new Set<string>(EXTERNAL_ACCOUNTANT_ALLOWED_PERMISSIONS);
        const unexpected = role.permissions.filter((permission) => !allowed.has(permission));
        const missing = EXTERNAL_ACCOUNTANT_ALLOWED_PERMISSIONS.filter(
          (permission) => !role.permissions.includes(permission),
        );
        const forbidden = EXTERNAL_ACCOUNTANT_FORBIDDEN_PERMISSIONS.filter((permission) =>
          role.permissions.includes(permission),
        );
        assertCondition(unexpected.length === 0, `External accountant has unexpected permissions: ${unexpected.join(", ")}.`);
        assertCondition(missing.length === 0, `External accountant is missing permissions: ${missing.join(", ")}.`);
        assertCondition(forbidden.length === 0, `External accountant has forbidden permissions: ${forbidden.join(", ")}.`);
      }

      verified.push({
        organizationId,
        persona: persona.label,
        roleCode: role.code,
        userId: user.id,
        accountIdentifier: user.email,
        secretReference: ".seed-artifacts/seed-login-credentials.json",
      });
    }
  }
  return verified;
}

async function verifyInventory(tx: Prisma.TransactionClient, organizationIds: string[]) {
  const results = [];
  for (const organizationId of organizationIds) {
    const locations = await tx.location.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { id: "asc" },
      select: { id: true, code: true },
    });
    assertCondition(locations.length > 0, `No active locations exist for ${organizationId}.`);
    for (const location of locations) {
      const levels = await tx.inventoryLevel.findMany({
        where: {
          locationId: location.id,
          item: { organizationId, isActive: true, isDiscontinued: false, deletedAt: null },
        },
        select: {
          itemId: true,
          quantityOnHand: true,
          quantityReserved: true,
          quantityAvailable: true,
          averageCost: true,
          item: { select: { sellingPrice: true, categoryId: true, taxRateId: true, unitId: true } },
        },
      });
      const distinctItems = new Set(levels.map((level) => level.itemId)).size;
      assertCondition(distinctItems >= 20, `${organizationId}/${location.id} has ${distinctItems}/20 active stocked items.`);
      for (const level of levels) {
        const onHand = Number(level.quantityOnHand);
        const reserved = Number(level.quantityReserved);
        const available = Number(level.quantityAvailable);
        assertCondition(onHand >= 0 && reserved >= 0 && available >= 0, `Negative stock exists for ${level.itemId}/${location.id}.`);
        assertCondition(Math.abs(available - (onHand - reserved)) < 0.001, `Unexplained available stock exists for ${level.itemId}/${location.id}.`);
        assertCondition(Number(level.averageCost) >= 0 && Number(level.item.sellingPrice) > 0, `Invalid price or cost exists for ${level.itemId}.`);
        assertCondition(level.item.categoryId && level.item.taxRateId && level.item.unitId, `Incomplete catalog references exist for ${level.itemId}.`);
      }
      results.push({ organizationId, locationId: location.id, locationCode: location.code, activeStockedItems: distinctItems });
    }
  }
  return results;
}

async function verifyFinance(tx: Prisma.TransactionClient, organizationIds: string[]) {
  const results = [];
  for (const organizationId of organizationIds) {
    const [entries, periods, accountTypes, counts] = await Promise.all([
      tx.journalEntry.findMany({
        where: { organizationId },
        select: {
          entryNumber: true,
          status: true,
          currency: true,
          reversalOfEntryId: true,
          lines: { select: { debit: true, credit: true, baseDebit: true, baseCredit: true } },
        },
      }),
      tx.accountingPeriod.findMany({ where: { organizationId }, select: { status: true } }),
      tx.chartOfAccount.findMany({ where: { organizationId, isActive: true }, select: { type: true } }),
      Promise.all([
        tx.customerReceivableDocument.count({ where: { organizationId } }),
        tx.supplierInvoice.count({ where: { organizationId } }),
        tx.payment.count({ where: { organizationId } }),
        tx.paymentRefund.count({ where: { organizationId } }),
        tx.matchRecord.count({ where: { organizationId } }),
        tx.suspenseItem.count({ where: { organizationId } }),
        tx.cashDrawerTransaction.count({ where: { cashDrawer: { location: { organizationId } } } }),
        tx.closeEvidenceItem.count({ where: { organizationId } }),
        tx.accountingSourceLink.count({ where: { organizationId } }),
      ]),
    ]);

    const statuses = new Set(entries.map((entry) => entry.status));
    const currencies = new Set(entries.map((entry) => entry.currency));
    const periodStatuses = new Set(periods.map((period) => period.status));
    const chartTypes = new Set(accountTypes.map((account) => account.type));
    assertCondition(statuses.has("DRAFT") && statuses.has("POSTED"), `${organizationId} lacks draft or posted journals.`);
    assertCondition(statuses.has("REVERSED") || statuses.has("VOIDED"), `${organizationId} lacks reversed or voided journals.`);
    assertCondition(currencies.size >= 2, `${organizationId} lacks multi-currency journal coverage.`);
    assertCondition(periodStatuses.has("OPEN") && periodStatuses.has("CLOSED"), `${organizationId} lacks open or closed accounting periods.`);
    for (const requiredType of ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]) {
      assertCondition(chartTypes.has(requiredType as never), `${organizationId} chart of accounts lacks ${requiredType}.`);
    }
    for (const entry of entries.filter((candidate) => candidate.status !== "VOIDED")) {
      assertCondition(entry.lines.length > 0, `${organizationId}/${entry.entryNumber} has no accounting lines.`);
      const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
      assertCondition(Math.round(debit * 100) === Math.round(credit * 100), `${organizationId}/${entry.entryNumber} is unbalanced.`);
    }
    const [receivables, payables, payments, refunds, reconciled, unreconciled, cashHistory, closeEvidence, sourceLinks] = counts;
    for (const [label, count] of Object.entries({ receivables, payables, payments, refunds, reconciled, unreconciled, cashHistory, closeEvidence, sourceLinks })) {
      assertCondition(count > 0, `${organizationId} lacks ${label} fixture coverage.`);
    }
    results.push({
      organizationId,
      journalStatuses: [...statuses].sort(),
      currencies: [...currencies].sort(),
      periodStatuses: [...periodStatuses].sort(),
      receivables,
      payables,
      payments,
      refunds,
      reconciled,
      unreconciled,
      cashHistory,
      closeEvidence,
      drillToEvidenceLinks: sourceLinks,
      derivedStatementsReady: true,
    });
  }
  return results;
}

async function main() {
  const databaseName = assertDisposableTarget();
  const artifact = JSON.parse(await readFile(credentialPath, "utf8")) as CredentialArtifact;
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const readOnlyState = await tx.$queryRaw<Array<{ transaction_read_only: string }>>`
        SHOW transaction_read_only
      `;
      assertCondition(readOnlyState[0]?.transaction_read_only === "on", "Verifier transaction is not read-only.");
      const organizations = await tx.organization.findMany({
        where: { id: { startsWith: "rds_org_" } },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      assertCondition(organizations.length === 2, `Expected two isolated fixture tenants, found ${organizations.length}.`);
      const organizationIds = organizations.map((organization) => organization.id);
      return {
        personas: await verifyPersonas(tx, artifact.credentials, organizationIds),
        inventory: await verifyInventory(tx, organizationIds),
        finance: await verifyFinance(tx, organizationIds),
      };
    },
    { timeout: 120_000 },
  );

  console.log(JSON.stringify({ status: "PASS", mode: "READ_ONLY", databaseName, ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error("Read-only realistic seed verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

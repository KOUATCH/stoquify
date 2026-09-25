import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { PrismaClient, AccountingPostingPurpose, AccountingSourceType, PostingRuleAmountSource, PostingRuleLineSide } from "@prisma/client"
import { REQUIRED_ACCOUNTING_MAPPINGS, REQUIRED_DEFAULT_JOURNAL_TYPES, collectAccountingSetupReadinessIssues } from "../services/accounting/accounting-settings.service"
import { DEFAULT_POSTING_RULES } from "../services/accounting/default-posting-rules"
import { assertDisposableDatabaseTarget } from "./disposable-fixture-guard"

const TARGETS = {
  stoquify_local_modern_modules_20260905_01: { source: "local-modern-modules-verification", prefix: "org_modules_" },
  stoquify_local_modern_modules_controls_20260905_01: { source: "local-modern-modules-postgres-controls", prefix: "org_modules_service_smoke_" },
} as const
export type LifecycleFixtureStage = "waiting" | "accounting" | "provider" | "pos" | "inventory-denial"

/** Synthetic domain setup only. No sessions, auth assurance, provider network calls,
 * live approvals, or financial postings are created. Never import into the app. */
export async function prepareModernModulesLifecycleFixture(prisma: PrismaClient, organizationId: string, stage: LifecycleFixtureStage) {
  assert.ok(["waiting", "accounting", "provider", "pos", "inventory-denial"].includes(stage))
  assertDisposableDatabaseTarget(process.env.DATABASE_URL, Object.keys(TARGETS))
  const url = new URL(process.env.DATABASE_URL ?? "")
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname.toLowerCase()))
  assert.equal(process.env.DIRECT_URL, url.toString())
  assert.ok(![process.env.NODE_ENV, process.env.AQSTOQFLOW_ENV, process.env.VERCEL_ENV].some(value => value?.toLowerCase() === "production"))
  const databaseName = decodeURIComponent(url.pathname.slice(1)) as keyof typeof TARGETS
  const owner = TARGETS[databaseName]
  assert.ok(owner, "Fixture writes require an exact owned isolated database")
  assert.ok(organizationId.startsWith(owner.prefix))
  return prisma.$transaction(async tx => {
    const identity = await tx.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    assert.equal(identity[0]?.name, databaseName)
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { onboardingSource: true } })
    assert.equal(organization.onboardingSource, owner.source)
    const metadata = { synthetic: true, source: owner.source, fixture: "module-lifecycle", productionApproval: false, accountingCertification: false }
    if (stage === "waiting") {
      // Only this helper's provider is suspended; no existing business records reset.
      await tx.providerAccount.updateMany({ where: { organizationId, providerCode: "MODULE_LIFECYCLE_SYNTHETIC" }, data: { status: "SUSPENDED" } })
      return { stage, synthetic: true }
    }
    if (stage === "accounting") {
      for (const [index, mapping] of REQUIRED_ACCOUNTING_MAPPINGS.entries()) {
        const code = `${mapping.syscohadaClass}99${String(index).padStart(3, "0")}`
        await tx.chartOfAccount.upsert({ where: { organizationId_mappingKey: { organizationId, mappingKey: mapping.key } }, update: {}, create: { organizationId, code, nameEn: `Synthetic ${mapping.label}`, nameFr: `Compte de test ${mapping.key}`, type: mapping.type, normalBalance: mapping.normalBalance, mappingKey: mapping.key, syscohadaClass: mapping.syscohadaClass, syscohadaReference: `SYNTHETIC-TEST-${code}`, isActive: true } })
      }
      for (const type of REQUIRED_DEFAULT_JOURNAL_TYPES) await tx.journal.upsert({ where: { organizationId_code: { organizationId, code: `TEST_${type}` } }, update: {}, create: { organizationId, code: `TEST_${type}`, nameEn: `Synthetic ${type}`, nameFr: `Journal de test ${type}`, type, isActive: true, isDefault: true } })
      const year = new Date().getUTCFullYear()
      const startDate = new Date(Date.UTC(year, 0, 1)), endDate = new Date(Date.UTC(year + 1, 0, 1) - 1)
      const fiscalYear = await tx.fiscalYear.upsert({ where: { organizationId_name: { organizationId, name: `Synthetic ${year}` } }, update: {}, create: { organizationId, name: `Synthetic ${year}`, startDate, endDate } })
      await tx.accountingPeriod.upsert({ where: { organizationId_fiscalYearId_periodNumber: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1 } }, update: {}, create: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: "Synthetic current open period", startDate, endDate } })
      const templates = DEFAULT_POSTING_RULES.filter(template => !template.code.includes("PAYROLL"))
      for (const template of templates) await tx.postingRule.upsert({ where: { organizationId_code: { organizationId, code: template.code } }, update: {}, create: { organizationId, code: template.code, nameEn: template.nameEn, nameFr: template.nameFr, sourceType: template.sourceType, postingPurpose: template.postingPurpose, priority: template.priority, isActive: true, lines: { create: template.lines.map(line => ({ organizationId, lineNumber: line.lineNumber, side: line.side, mappingKey: line.mappingKey, amountSource: line.amountSource, condition: line.condition ?? undefined, description: line.description })) } } })
      // These readiness scaffolds have no canonical installer template yet.
      // They are test data, never a recommended or certified posting policy.
      for (const postingPurpose of [AccountingPostingPurpose.EXPENSE_APPROVAL, AccountingPostingPurpose.INVENTORY_ADJUSTMENT, AccountingPostingPurpose.CASH_DRAWER_CLOSE, AccountingPostingPurpose.GOODS_RECEIPT]) await tx.postingRule.upsert({ where: { organizationId_code: { organizationId, code: `SYNTHETIC_${postingPurpose}` } }, update: {}, create: { organizationId, code: `SYNTHETIC_${postingPurpose}`, nameEn: "Synthetic readiness scaffold only", sourceType: AccountingSourceType.MANUAL, postingPurpose, isActive: true, lines: { create: [
        { organizationId, lineNumber: 1, side: PostingRuleLineSide.DEBIT, mappingKey: "INVENTORY_VARIANCE", amountSource: PostingRuleAmountSource.SOURCE_AMOUNT },
        { organizationId, lineNumber: 2, side: PostingRuleLineSide.CREDIT, mappingKey: "CASH_ON_HAND", amountSource: PostingRuleAmountSource.SOURCE_AMOUNT },
      ] } } })
      assert.deepEqual(await collectAccountingSetupReadinessIssues(organizationId, tx), [], "Real accounting readiness must accept the seeded domain rows")
      await tx.organizationAccountingSettings.upsert({ where: { organizationId }, update: { accountingEnabled: true, setupStatus: "READY" }, create: { organizationId, accountingEnabled: true, setupStatus: "READY" } })
      await tx.ledgerAuditEvent.create({ data: { organizationId, action: "SYNTHETIC_MODULE_LIFECYCLE_SETUP", resourceType: "OrganizationAccountingSettings", message: "Isolated lifecycle fixture; no production setup approval or accounting certification", metadata } })
    }
    if (stage === "provider") {
      const bank = await tx.chartOfAccount.findUniqueOrThrow({ where: { organizationId_mappingKey: { organizationId, mappingKey: "BANK" } } })
      const suspense = await tx.chartOfAccount.findUniqueOrThrow({ where: { organizationId_mappingKey: { organizationId, mappingKey: "CARD_CLEARING" } } })
      const rail = await tx.paymentRail.upsert({ where: { organizationId_code: { organizationId, code: "MODULE_LIFECYCLE_SYNTHETIC" } }, update: {}, create: { organizationId, code: "MODULE_LIFECYCLE_SYNTHETIC", name: "Synthetic offline test rail", type: "CARD", metadata } })
      const provider = await tx.providerAccount.upsert({ where: { organizationId_providerCode: { organizationId, providerCode: "MODULE_LIFECYCLE_SYNTHETIC" } }, update: { status: "ACTIVE" }, create: { organizationId, paymentRailId: rail.id, providerCode: "MODULE_LIFECYCLE_SYNTHETIC", displayName: "Synthetic lifecycle provider; no live connection", status: "ACTIVE", externalAccountHash: createHash("sha256").update(organizationId).digest("hex"), settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id, metadata } })
      if (!await tx.settlementAccount.count({ where: { organizationId, providerAccountId: provider.id } })) await tx.settlementAccount.create({ data: { organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: "APPROVED", effectiveFrom: new Date(0), metadata } })
    }
    if (stage === "pos") {
      const location = await tx.location.upsert({ where: { organizationId_code: { organizationId, code: "MODULE_LIFECYCLE_SYNTHETIC" } }, update: {}, create: { organizationId, code: "MODULE_LIFECYCLE_SYNTHETIC", name: "Synthetic lifecycle terminal location" } })
      await tx.pOSStation.upsert({ where: { organizationId_terminalNumber: { organizationId, terminalNumber: "MODULE_LIFECYCLE_SYNTHETIC" } }, update: {}, create: { organizationId, locationId: location.id, terminalNumber: "MODULE_LIFECYCLE_SYNTHETIC", name: "Synthetic cashless test terminal", hasCashDrawer: false } })
    }
    if (stage === "inventory-denial") {
      assert.equal(databaseName, "stoquify_local_modern_modules_20260905_01")
      assert.equal(organizationId, "org_modules_retailer_fr_mobile")
      const configuration = await tx.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId } })
      assert.ok(configuration.newWorkStoppedModules.includes("inventory"), "A real reviewed Inventory stop must already exist")
      const locations = []
      for (const suffix of ["SOURCE", "DESTINATION"]) locations.push(await tx.location.upsert({ where: { organizationId_code: { organizationId, code: `MODULE_DENIAL_${suffix}` } }, update: {}, create: { organizationId, code: `MODULE_DENIAL_${suffix}`, name: `Synthetic denial ${suffix.toLowerCase()}` } }))
      const item = await tx.item.upsert({ where: { organizationId_sku: { organizationId, sku: "MODULE-DENIAL-ITEM" } }, update: {}, create: { organizationId, sku: "MODULE-DENIAL-ITEM", slug: "module-denial-item", nameEn: "Synthetic denial item", nameFr: "Article de test du refus", imageUrls: [], costPrice: 0, sellingPrice: 0 } })
      await tx.inventoryLevel.upsert({ where: { itemId_locationId: { itemId: item.id, locationId: locations[0].id } }, update: {}, create: { itemId: item.id, locationId: locations[0].id, quantityOnHand: 10, quantityAvailable: 10 } })
      const role = await tx.role.findFirstOrThrow({ where: { organizationId, code: "MODULES_LOCAL_ADMIN" } })
      await tx.role.update({ where: { id: role.id }, data: { permissions: [...new Set([...role.permissions, "TRANSFERS_READ", "inventory.stock.transfer", "inventory.levels.read", "locations.read"])] } })
    }
    return { stage, synthetic: true }
  }, { timeout: 30000 })
}

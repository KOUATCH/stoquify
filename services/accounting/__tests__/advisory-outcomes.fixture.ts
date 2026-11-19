import { db } from "@/prisma/db"
import { getReviewWorkpaperBinder, recordWorkpaperDecision, rollForwardWorkpaperStructure, exportReviewWorkpapers, type WorkpaperActor } from "../review-workpaper.service"
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence } from "../balance-sheet-evidence.service"
import { executeFirmEngagementCommand } from "../firm-engagement.service"
import { WORKPAPER_KINDS } from "../review-workpaper.contract"
import { balanceSheetHash } from "../balance-sheet-contract"
const prefix = `af12-${Date.now()}`
const permissions = ["accounting.close.evidence.request", "accounting.close.finding.assign", "accounting.audit.read", "accounting.close.read", "accounting.close.run", "accounting.close.certify",
  "accounting.close.accountant.invite", "accounting.close.accountant.review", "accounting.close.finding.comment", "accounting.exports.create"]
export async function advisoryFixture(name: string, missing = false) {
  const client = `${prefix}-${name}-client`, firm = `${prefix}-${name}-firm`
  for (const id of [client, firm]) await db.organization.create({ data: { id, slug: id, name: "Synthetic " + name, currency: "XAF", requestedModules: ["accounting", "close_assurance"], countryCode: "CM" } })
  const actors: Record<string, WorkpaperActor> = {}
  for (const who of ["preparer", "reviewer", "owner"]) {
    const home = who === "owner" ? client : firm, id = `${prefix}-${name}-${who}`
    await db.role.create({ data: { id: id + "-role", organizationId: home, code: who, nameEn: who, permissions } })
    await db.user.create({ data: { id, organizationId: home, email: id + "@example.invalid", name: who, emailVerified: true, roles: { connect: { id: id + "-role" } } } })
    const session = await db.session.create({ data: { userId: id, token: id + "-private-token", expiresAt: new Date("2099-01-01"), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: home, assuranceLevel: 1 } })
    actors[who] = { homeOrganizationId: home, actorId: id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  }
  for (const who of ["preparer", "reviewer"]) await db.accountantAccessGrant.create({ data: { id: actors[who].actorId + "-grant", organizationId: client,
    accountantUserId: actors[who].actorId, accountantFirmName: "Synthetic", role: "REVIEWER", activeScopeKey: `${client}:${actors[who].actorId}`,
    consentGrantedById: actors.owner.actorId, consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(actors.preparer, { ...input, idempotencyKey: `${name}-${Math.random()}` })
  const e = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  for (const who of ["preparer", "reviewer"]) {
    await command({ command: "ASSIGN", engagementId: e.engagementId, expectedVersion: 0, accountantUserId: actors[who].actorId, expectedAssignmentVersion: 0,
      scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
    await command({ command: "ENROLL", engagementId: e.engagementId, expectedVersion: 0, grantId: actors[who].actorId + "-grant" })
  }
  await command({ command: "TRANSITION", engagementId: e.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic AF12 activation" })
  const year = await db.fiscalYear.create({ data: { organizationId: client, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: client, fiscalYearId: year.id, periodNumber: 9, name: "AF12 September", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") } })
  const journal = await db.journal.create({ data: { organizationId: client, code: "GEN", nameEn: "Synthetic", type: "GENERAL" } })
  const amounts = ["100.20", "200.10", "80.00", "50.05"]
  const accounts = []
  for (let i = 0; i < 4; i++) accounts.push(await db.chartOfAccount.create({ data: { organizationId: client, code: ["571", "411", "401", "311"][i],
    nameEn: "Synthetic " + WORKPAPER_KINDS[i], type: i === 2 ? "LIABILITY" : "ASSET", normalBalance: i === 2 ? "CREDIT" : "DEBIT", currency: "XAF" } }))
  const counter = await db.chartOfAccount.create({ data: { organizationId: client, code: "701", nameEn: "Synthetic counterpart", type: "REVENUE", normalBalance: "CREDIT" } })
  // Synthetic historical ledger fixture only. Production workpapers never write journals.
  await db.journalEntry.create({ data: { organizationId: client, journalId: journal.id, periodId: period.id, entryNumber: "SYNTHETIC-1",
    entryDate: new Date("2026-09-15"), status: "POSTED", postedAt: new Date(), currency: "XAF", lines: { create: [
      ...accounts.map((account, i) => ({ organizationId: client, accountId: account.id, lineNumber: i + 1, currency: "XAF",
        debit: i === 2 ? "0.00" : amounts[i], credit: i === 2 ? amounts[i] : "0.00", baseDebit: i === 2 ? "0.00" : amounts[i], baseCredit: i === 2 ? amounts[i] : "0.00" })),
      { organizationId: client, accountId: counter.id, lineNumber: 5, currency: "XAF", debit: "0.00", credit: "270.35", baseDebit: "0.00", baseCredit: "270.35" },
    ] } } })
  await db.closeRun.create({ data: { organizationId: client, periodId: period.id, status: "BLOCKED", runById: actors.owner.actorId, completedAt: new Date() } })
  const sourceControl = (who: string) => ({ organizationId: client, actorId: actors[who].actorId, actorPermissions: permissions, lastAuthAt: new Date() })
  const evidence = []
  for (let i = 0; i < (missing ? 3 : 4); i++) {
    const row = await proposeBalanceSheetEvidence({ ledgerAccountId: accounts[i].id, periodId: period.id, currency: "XAF", idempotencyKey: "source-" + i,
      scheduleKind: WORKPAPER_KINDS[i], basis: "SUPPORTING_SCHEDULE", explanation: "Synthetic supporting schedule",
      sourceReference: "private://synthetic-document", sourceDocumentHash: "sha256:" + "b".repeat(64), items: [{
        reference: `item-${i}`, description: "=HYPERLINK(\"private-personal-data\")", openingBalance: "0.00", additions: amounts[i], reductions: "0.00", closingBalance: amounts[i],
        sourceReference: "private://synthetic-document", sourceDocumentHash: "sha256:" + "b".repeat(64),
      }] }, sourceControl("owner"))
    evidence.push(await decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "APPROVE" }, sourceControl("reviewer")))
  }
  return { client, firm, actors, period, accounts, evidence, engagementId: e.engagementId, scope: { clientOrganizationId: client, periodId: period.id }, sourceControl }
}

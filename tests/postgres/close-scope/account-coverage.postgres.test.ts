import { PrismaClient } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { getPaymentCloseEvidence } from "@/services/reconciliation/payment-close-evidence.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
import { proposeNoActivityEvidence, decideNoActivityEvidence, readNoActivityEvidence } from "@/services/reconciliation/no-activity-evidence.service"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: closeScopeTestTarget().url.toString() } } }) }
})
const client = db as PrismaClient
const org = "coverage-org", foreign = "coverage-foreign"
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z")
const actor = (id: string, organizationId = org) => ({ organizationId, actorId: id, actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.run", "payments.reconciliation.sign"], lastAuthAt: new Date() })
const request = { providerAccountId: "coverage-empty", periodId: "coverage-sep", idempotencyKey: "empty-v1", sourceReference: "retained-document:bank-zero-statement", sourceDocumentHash: "sha256:" + "a".repeat(64), reason: "Reviewed external statement shows no account activity" }
const scope = () => createCloseControlScope(org, { id: "coverage-sep", startDate: start, endDate: end }, new Date())
let proof: Awaited<ReturnType<typeof proposeNoActivityEvidence>>
beforeAll(async () => {
  const identity = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity[0].name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  for (const organizationId of [org, foreign]) {
    await client.organization.create({ data: { id: organizationId, name: "Synthetic coverage", slug: organizationId } })
    await client.fiscalYear.create({ data: { id: `fy-${organizationId}`, organizationId, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
    await client.accountingPeriod.create({ data: { id: organizationId === org ? "coverage-sep" : "coverage-foreign-sep", organizationId, fiscalYearId: `fy-${organizationId}`, name: "September", periodNumber: 9, startDate: start, endDate: end } })
  }
  for (const id of ["coverage-maker", "coverage-reviewer"]) await client.user.create({ data: { id, organizationId: org, email: `${id}@example.invalid` } })
  await client.paymentRail.create({ data: { id: "coverage-rail", organizationId: org, code: "COV", name: "Coverage rail", type: "BANK_TRANSFER" } })
  for (const id of ["coverage-active", "coverage-empty"]) await client.providerAccount.create({ data: { id, organizationId: org, paymentRailId: "coverage-rail", providerCode: id, displayName: id, externalAccountHash: id, status: "ARCHIVED", createdAt: new Date("2026-08-01") } })
  await client.statementFile.create({ data: { id: "coverage-file", organizationId: org, providerAccountId: "coverage-active", sourceType: "TEST", fileHash: "coverage-file-hash", periodStart: start, periodEnd: end } })
  await client.statementLine.create({ data: { organizationId: org, providerAccountId: "coverage-active", statementFileId: "coverage-file", fingerprint: "coverage-activity", amount: 10, currencyCode: "XAF", occurredAt: start } })
  await client.reconciliationRun.create({ data: { id: "coverage-run", organizationId: org, providerAccountId: "coverage-active", paymentRailId: "coverage-rail", accountingPeriodId: "coverage-sep", businessDate: start, periodStart: start, periodEnd: new Date(+end + 1), status: "SIGNED", signedAt: new Date(), certificateHash: "synthetic-certificate" } })
})
afterAll(async () => { await client.$disconnect() })

it("blocks an uncovered account despite another account's complete evidence, consistently in close and portal", async () => {
  const assessment = await getPaymentCloseEvidence(scope())
  expect(assessment.accountCoverage).toMatchObject({ requiredAccountCount: 2, coveredAccountCount: 1, blockedAccountCount: 1 })
  expect(assessment.accountCoverage.accounts.find(row => row.providerAccountId === "coverage-empty")?.reasons).toContain("NO_ACTIVITY_EVIDENCE_REQUIRED")
  const portal = await getAccountantPortalData({ organizationId: org, periodId: "coverage-sep" }, client)
  expect(portal.blockers.some(row => row.id === "provider-account-coverage:coverage-empty")).toBe(true)
})
it("retains proposals, enforces replay identity, and denies self-approval and cross-tenant evidence", async () => {
  proof = await proposeNoActivityEvidence(request, actor("coverage-maker"))
  expect((await readNoActivityEvidence({ evidenceId: proof.id }, actor("coverage-reviewer"))).sourceDocumentHash).toBe(request.sourceDocumentHash)
  await expect(readNoActivityEvidence({ evidenceId: proof.id }, actor("coverage-reviewer", foreign))).rejects.toThrow("not found")
  expect((await proposeNoActivityEvidence(request, actor("coverage-maker"))).id).toBe(proof.id)
  await expect(proposeNoActivityEvidence({ ...request, reason: "Changed claim reusing the same identity" }, actor("coverage-maker"))).rejects.toThrow("idempotency")
  const decision = { evidenceId: proof.id, expectedEvidenceHash: proof.evidenceHash, decision: "APPROVE" as const }
  await expect(decideNoActivityEvidence(decision, actor("coverage-maker"))).rejects.toThrow("independent")
  await expect(decideNoActivityEvidence(decision, actor("coverage-reviewer", foreign))).rejects.toThrow("not found")
  await expect(decideNoActivityEvidence(decision, { ...actor("coverage-reviewer"), actorPermissions: [] })).rejects.toThrow("permission")
  await expect(decideNoActivityEvidence(decision, { ...actor("coverage-reviewer"), lastAuthAt: new Date(0) })).rejects.toThrow("Fresh")
  expect((await getPaymentCloseEvidence(scope())).accountCoverage.blockedAccountCount).toBe(1)
})
it("accepts independent approval with retained source proof and rejects direct SQL tampering", async () => {
  await client.closeRun.create({ data: { id: "coverage-close", organizationId: org, periodId: "coverage-sep", status: "READY" } })
  const decision = { evidenceId: proof.id, expectedEvidenceHash: proof.evidenceHash, decision: "APPROVE" as const }
  const approved = await decideNoActivityEvidence(decision, actor("coverage-reviewer"))
  expect(approved.status).toBe("APPROVED")
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: "coverage-close" } })).status).toBe("BLOCKED")
  expect((await decideNoActivityEvidence(decision, actor("coverage-reviewer"))).id).toBe(proof.id)
  const assessment = await getPaymentCloseEvidence(scope())
  expect(assessment.accountCoverage.blockedAccountCount).toBe(0)
  expect(assessment.accountCoverage.accounts.find(row => row.providerAccountId === "coverage-empty")?.noActivityEvidence).toMatchObject({ id: proof.id, hash: proof.evidenceHash, approvedById: "coverage-reviewer" })
  await expect(client.reconciliationNoActivityEvidence.update({ where: { id: proof.id }, data: { reason: "Tampered source description" } })).rejects.toThrow()
  await expect(client.reconciliationNoActivityEvidence.delete({ where: { id: proof.id } })).rejects.toThrow()
  await expect(client.reconciliationNoActivityEvidence.create({ data: { ...proof, id: "cross-tenant-proof", organizationId: foreign, idempotencyKey: "cross" } })).rejects.toThrow()
  await expect(client.reconciliationNoActivityEvidence.create({ data: { ...proof, id: "self-proof", idempotencyKey: "self", status: "APPROVED", approvedById: proof.proposedById, approvedAt: new Date() } })).rejects.toThrow()
})
it("late activity invalidates eligibility; revocation retains history and cannot be undone", async () => {
  await client.statementFile.create({ data: { id: "late-activity-file", organizationId: org, providerAccountId: "coverage-empty", sourceType: "TEST", fileHash: "late-activity-hash", periodStart: start, periodEnd: end } })
  await client.statementLine.create({ data: { organizationId: org, providerAccountId: "coverage-empty", statementFileId: "late-activity-file", fingerprint: "late-activity", amount: 1, currencyCode: "XAF", occurredAt: start } })
  const row = (await getPaymentCloseEvidence(scope())).accountCoverage.accounts.find(row => row.providerAccountId === "coverage-empty")!
  expect(row.status).toBe("BLOCKED"); expect(row.noActivityEvidence).toBeNull()
  const revoked = await decideNoActivityEvidence({ evidenceId: proof.id, expectedEvidenceHash: proof.evidenceHash, decision: "REVOKE", reason: "Late bank activity contradicts the original claim" }, actor("coverage-reviewer"))
  expect(revoked).toMatchObject({ status: "REVOKED", approvedById: "coverage-reviewer", revokedById: "coverage-reviewer" })
  await expect(decideNoActivityEvidence({ evidenceId: proof.id, expectedEvidenceHash: proof.evidenceHash, decision: "APPROVE" }, actor("coverage-reviewer"))).rejects.toThrow("transition")
})

it("rechecks source activity at approval and leaves a rejected proposal unchanged", async () => {
  await client.providerAccount.create({ data: { id: "coverage-review", organizationId: org, paymentRailId: "coverage-rail", providerCode: "REVIEW", displayName: "Review race", externalAccountHash: "review-account", status: "ACTIVE", createdAt: new Date("2026-08-01") } })
  const proposal = await proposeNoActivityEvidence({ ...request, providerAccountId: "coverage-review", idempotencyKey: "review-v1" }, actor("coverage-maker"))
  await client.statementFile.create({ data: { id: "review-file", organizationId: org, providerAccountId: "coverage-review", sourceType: "TEST", fileHash: "review-source", periodStart: start, periodEnd: end } })
  await client.statementLine.create({ data: { organizationId: org, providerAccountId: "coverage-review", statementFileId: "review-file", fingerprint: "review-line", amount: 1, currencyCode: "XAF", occurredAt: start } })
  await expect(decideNoActivityEvidence({ evidenceId: proposal.id, expectedEvidenceHash: proposal.evidenceHash, decision: "APPROVE" }, actor("coverage-reviewer"))).rejects.toThrow("contradict")
  expect(await client.reconciliationNoActivityEvidence.findUnique({ where: { id: proposal.id } })).toMatchObject({ status: "PROPOSED", approvedAt: null, approvedById: null })
})

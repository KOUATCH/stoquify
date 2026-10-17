import type { Prisma } from "@prisma/client"
import { retainedReconciliationSignatureInTx } from "../reconciliation-retained-signature"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"

const now = new Date("2026-09-27T12:00:00.000Z")
const audit = jest.fn()
const tx = { ledgerAuditEvent: { findFirst: audit } } as unknown as Prisma.TransactionClient
function fixture() {
  const payload: Record<string, unknown> = {
    version: 2, mode: "DURABLE_EVIDENCE_KERNEL", organizationId: "org", runId: "run",
    providerAccountId: "provider", paymentRailId: "rail", accountingPeriodId: "period",
    businessDate: "2026-09-27T00:00:00.000Z", periodStart: "2026-09-27T00:00:00.000Z", periodEnd: "2026-09-28T00:00:00.000Z",
    signedById: "signer", signedAt: "2026-09-27T11:00:00.000Z", sourceVersionHash: "sha256:" + "a".repeat(64),
  }
  return { ...payload, id: "run", status: "SIGNED", runById: "maker", certificatePayload: payload,
    certificateHash: suspenseEvidenceHash(payload).slice(7), metadata: { signedSourceVersionHash: payload.sourceVersionHash, immutableAfterSignoff: true } }
}
beforeEach(() => { audit.mockReset().mockResolvedValue({ id: "sign-audit" }) })
it("verifies a retained serialized envelope against its exact tenant, actor and certificate audit", async () => {
  const run = fixture()
  expect(await retainedReconciliationSignatureInTx(tx, "org", run, now)).toEqual({ hash: run.certificateHash, signedById: "signer", signedAt: run.signedAt })
  expect(audit).toHaveBeenCalledWith({ where: { organizationId: "org", resourceType: "ReconciliationRun", resourceId: "run", actorId: "signer", action: "PAYMENT_RECONCILIATION_RUN_SIGN", metadata: { path: ["certificateHash"], equals: run.certificateHash } }, select: { id: true } })
})
it.each(["organizationId", "runId", "providerAccountId", "paymentRailId", "accountingPeriodId", "businessDate", "periodStart", "periodEnd", "signedById", "signedAt", "sourceVersionHash", "version", "mode"])("rejects a rehashed envelope with mismatched %s", async key => {
  const run = fixture()
  run.certificatePayload[key] = "changed"
  run.certificateHash = suspenseEvidenceHash(run.certificatePayload).slice(7)
  await expect(retainedReconciliationSignatureInTx(tx, "org", run, now)).rejects.toThrow(/retained reconciliation signature/)
  expect(audit).not.toHaveBeenCalled()
})
it.each([
  { organizationId: "foreign" }, { status: "NEEDS_REVIEW" }, { runById: "signer" },
  { signedAt: null }, { signedAt: "invalid" }, { voidedAt: "2026-09-27T11:30:00Z" },
  { certificateHash: "b".repeat(64) }, { certificatePayload: null }, { metadata: {} },
  { metadata: { immutableAfterSignoff: false, signedSourceVersionHash: "sha256:" + "a".repeat(64) } },
])("rejects invalid run state %j", async change => {
  await expect(retainedReconciliationSignatureInTx(tx, "org", { ...fixture(), ...change }, now)).rejects.toThrow(/retained reconciliation signature/)
})
it("rejects future-dated signing even with a consistent envelope", async () => {
  const run = fixture()
  await expect(retainedReconciliationSignatureInTx(tx, "org", run, new Date("2026-09-27T10:00:00Z"))).rejects.toThrow(/retained reconciliation signature/)
})
it("requires the independently retained signing audit", async () => {
  audit.mockResolvedValue(null)
  await expect(retainedReconciliationSignatureInTx(tx, "org", fixture(), now)).rejects.toThrow(/retained reconciliation signature/)
})

it("retains a verified v3 certificate without rewriting historical payloads", async () => {
  const run = fixture(); run.certificatePayload.version = 3
  run.certificateHash = suspenseEvidenceHash(run.certificatePayload).slice(7)
  const before = JSON.stringify(run)
  await expect(retainedReconciliationSignatureInTx(tx, "org", run, now)).resolves.toMatchObject({ hash: run.certificateHash })
  expect(JSON.stringify(run)).toBe(before)
})

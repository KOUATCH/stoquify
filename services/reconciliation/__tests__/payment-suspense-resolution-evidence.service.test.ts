import { db } from "@/prisma/db"
import { previewSuspenseResolution, suspenseResolutionManifestEvidenceInTx } from "../payment-suspense-resolution-evidence.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../payment-suspense-correction.service", () => ({ loadVerifiedPostedSuspenseInTx: jest.fn() }))
const control = { organizationId: "org-1", actorId: "actor-1", actorPermissions: ["payments.reconciliation.read", "accounting.journal.read"] }
const draft = { suspenseItemId: "suspense-1", clearingJournalId: "journal-1", outcome: "RESOLVED" as const, reason: "Reviewed source evidence" }

beforeEach(() => jest.clearAllMocks())
it.each([[], ["payments.reconciliation.read"], ["accounting.journal.read"]])("requires both read authorities before loading evidence: %j", async (...permissions) => {
  await expect(previewSuspenseResolution(draft, { ...control, actorPermissions: permissions as string[] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(db.$transaction).not.toHaveBeenCalled()
})
it("requires an active actor in the selected organization", async () => {
  const tx = { user: { findFirst: jest.fn().mockResolvedValue(null) } }
  jest.mocked(db.$transaction).mockImplementationOnce((async (work: (value: typeof tx) => Promise<unknown>) => work(tx)) as never)
  await expect(previewSuspenseResolution(draft, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.user.findFirst).toHaveBeenCalledWith({ where: { id: "actor-1", organizationId: "org-1", isActive: true }, select: { id: true } })
})
it("does not label a legacy final status as verified evidence", async () => {
  await expect(suspenseResolutionManifestEvidenceInTx({} as never, "org-1", { id: "suspense-1", status: "RESOLVED", metadata: null }))
    .rejects.toMatchObject({ code: "CONFLICT" })
})
it("preserves the existing manifest shape for non-final suspense", async () => {
  expect(await suspenseResolutionManifestEvidenceInTx({} as never, "org-1", { id: "suspense-1", status: "POSTED_TO_SUSPENSE", metadata: null })).toBeNull()
})

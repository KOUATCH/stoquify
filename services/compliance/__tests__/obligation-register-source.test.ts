import { obligationSource, obligationState } from "../obligation-register-source"
import { obligationCommandSchema } from "../obligation-register.contract"
import * as registry from "@/services/regulatory/country-packs/registry"
jest.mock("@/services/regulatory/country-packs/registry", () => {
  const actual = jest.requireActual("@/services/regulatory/country-packs/registry")
  return { ...actual, getCountryPacks: jest.fn(actual.getCountryPacks) }
})
const now = new Date("2026-10-20T12:00:00Z")
const source = obligationSource("CLOSE_EVIDENCE_COLLECTION", "CM", now)
const base = { applicability: "APPLICABLE", dueAt: new Date("2026-10-19"), decision: "PREPARED", sourceChanged: false, evidenceChanged: false, evidencePresent: false, source }
it("does not infer statutory review from the published Cameroon pack", () => {
  const statutory = obligationSource("CM_VAT_MONTHLY", "CM", now)
  expect(statutory).toMatchObject({ coverage: "EXPIRED", statutoryVerified: false, qualifiedReview: null })
  expect(statutory.officialSources.every(ref => ref.url.startsWith("https://www.impots.cm/"))).toBe(true)
  expect(statutory.sourceCheckedOn).toBe("2026-06-11")
})
it("keeps missing countries unknown without a Cameroon fallback", () => {
  expect(obligationSource("CM_CNPS_EVIDENCE", "XX", now)).toMatchObject({ coverage: "UNSUPPORTED", officialSources: [] })
})
it("expiry is checked on every read without changing retained identity", () => {
  const before = obligationSource("CM_VAT_MONTHLY", "CM", new Date("2026-06-12"))
  const after = obligationSource("CM_VAT_MONTHLY", "CM", now)
  expect(before.coverage).toBe("UNREVIEWED"); expect(after.coverage).toBe("EXPIRED"); expect(before.sourceHash).toBe(after.sourceHash)
})
it("a country-pack version or source digest change invalidates the bound source", () => {
  const before = obligationSource("CM_VAT_MONTHLY", "CM", now)
  const changed = JSON.parse(JSON.stringify(registry.getCountryPacks("CM")[0]))
  changed.header.packVersion = "CM-SYNTHETIC-REVISION"
  changed.header.hash = "sha256:" + "f".repeat(64)
  jest.mocked(registry.getCountryPacks).mockReturnValueOnce([changed])
  expect(obligationSource("CM_VAT_MONTHLY", "CM", now).sourceHash).not.toBe(before.sourceHash)
})
it.each([
  [{}, "OVERDUE"], [{ applicability: "UNKNOWN" }, "UNKNOWN"], [{ applicability: "NOT_APPLICABLE" }, "NOT_APPLICABLE"],
  [{ dueAt: new Date("2026-11-01") }, "OPEN"], [{ decision: "REVIEWED", evidencePresent: true }, "FULFILLED_WITH_EVIDENCE"],
  [{ decision: "REVIEWED", evidencePresent: true, evidenceChanged: true }, "OVERDUE"],
  [{ decision: "REVIEWED", evidencePresent: true, sourceChanged: true }, "UNKNOWN"],
  [{ decision: "REVIEWED", evidencePresent: true, source: obligationSource("CM_CNPS_EVIDENCE", "CM", now) }, "UNKNOWN"],
])("distinguishes operational and unresolved evidence states %#", (patch, status) => {
  expect(obligationState({ ...base, ...patch }, now).status).toBe(status)
})
it("an unknown rule can still have an overdue operational target", () => {
  expect(obligationState({ ...base, source: obligationSource("CM_VAT_MONTHLY", "CM", now) }, now)).toEqual({ status: "UNKNOWN", deadlineState: "OVERDUE" })
})
it("rejects caller assertions of legal review, live acceptance and non-UTC dates", () => {
  const input = { command: "SAVE", expectedVersion: 0, code: "CM_VAT_MONTHLY", periodId: "p", applicability: "UNKNOWN", dueAt: null,
    evidenceId: null, reason: "Synthetic operational reminder", expectedSourceHash: source.sourceHash, idempotencyKey: "synthetic-command" }
  expect(obligationCommandSchema.safeParse(input).success).toBe(true)
  for (const patch of [{ statutoryVerified: true }, { liveFilingAccepted: true }, { qualifiedReview: "self" }, { dueAt: "2026-10-20" }, { reason: "short" }]) {
    expect(obligationCommandSchema.safeParse({ ...input, ...patch }).success).toBe(false)
  }
})

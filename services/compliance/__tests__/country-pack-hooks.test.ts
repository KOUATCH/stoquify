import {
  assertEInvoicingMetadataIsLedgerFirst,
  resolveEInvoicingMetadata,
} from "../country-pack-hooks"
import { getComplianceAdapter } from "../adapters/registry"
import { CAMEROON_DGI_SANDBOX_ADAPTER_CODE } from "@/services/regulatory/country-packs/cameroon.constants"

describe("compliance country-pack hooks", () => {
  it("resolves Cameroon e-invoicing metadata with versioned provenance", () => {
    const metadata = resolveEInvoicingMetadata({
      countryCode: "CM",
      date: "2026-06-13",
      pinnedPackVersion: "CM-2026.1",
    })

    expect(metadata).toMatchObject({
      countryCode: "CM",
      packVersion: "CM-2026.1",
      schemaVersion: "country-pack.v1",
      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    })
    expect(metadata.combinedResolutionHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(metadata.capability.value).toMatchObject({
      productionAutomationAllowed: false,
      requiresPostedLedgerSource: true,
    })
    expect(metadata.certificationPolicy.value).toMatchObject({
      authorityCallInsideSaleTransactionAllowed: false,
      legalDeliveryWhenUncertified: "BLOCK",
    })
    expect(() => assertEInvoicingMetadataIsLedgerFirst(metadata)).not.toThrow()
  })

  it("registers the fake adapter and the Cameroon sandbox pilot adapter only", () => {
    expect(getComplianceAdapter().code).toBe("FAKE_SANDBOX")
    expect(getComplianceAdapter(CAMEROON_DGI_SANDBOX_ADAPTER_CODE).code).toBe(
      CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
    )
    expect(() => getComplianceAdapter("CM_DGI_PRODUCTION")).toThrow(
      /not wired/i,
    )
  })
})

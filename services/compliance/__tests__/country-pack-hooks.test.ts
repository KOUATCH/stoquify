import {
  assertEInvoicingMetadataIsLedgerFirst,
  resolveEInvoicingMetadata,
} from "../country-pack-hooks"
import { getComplianceAdapter } from "../adapters/registry"
import { fakeSandboxComplianceAdapter } from "../adapters/fake-sandbox"
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
  it("blocks fake sandbox submission and polling in production contexts", async () => {
    const payload = {
      adapterCode: "FAKE_SANDBOX",
      payload: { fixture: true },
      payloadHash: "sha256:fake-sandbox-payload",
    }
    const context = {
      organizationId: "org-1",
      authorityChannel: "CM_DGI_PRODUCTION",
      environment: "PRODUCTION" as const,
    }

    const submitted = await fakeSandboxComplianceAdapter.submit(payload, context)
    const polled = await fakeSandboxComplianceAdapter.pollStatus(
      { authorityReference: "FAKE-REF", fiscalDocumentId: "fiscal-doc-1" },
      context,
    )

    expect(submitted).toMatchObject({
      ok: false,
      status: "CREDENTIAL_CONFIGURATION_ERROR",
      responsePayload: {
        statutoryEffect: "NONE_FAKE_SANDBOX_ONLY",
        productionCertification: false,
      },
    })
    expect(polled).toMatchObject({
      ok: false,
      status: "CREDENTIAL_CONFIGURATION_ERROR",
    })
  })
})

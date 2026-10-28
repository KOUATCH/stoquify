import { resolveEInvoicingMetadata } from "../country-pack-hooks"
import {
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
  cameroonDgiSandboxComplianceAdapter,
} from "../adapters/cameroon-dgi-sandbox"
import type { CanonicalFiscalPayload } from "../adapter-contract"

function canonicalPayload(overrides: Partial<CanonicalFiscalPayload> = {}): CanonicalFiscalPayload {
  const metadata = resolveEInvoicingMetadata({
    countryCode: "CM",
    date: "2026-06-14",
    pinnedPackVersion: "CM-2026.1",
  })

  return {
    fiscalDocumentId: "fiscal-doc-1",
    organizationId: "org-1",
    documentType: "POS_RECEIPT",
    countryCode: "CM",
    currency: "XAF",
    issueDate: "2026-06-14T09:31:00.000Z",
    source: {
      sourceType: "POS_SALE",
      sourceId: "sale-1",
      postingBatchId: "batch-1",
      journalEntryId: "journal-1",
    },
    totals: {
      subtotal: "1000.00",
      taxAmount: "192.50",
      discountAmount: "0.00",
      totalAmount: "1192.50",
    },
    lines: [
      {
        lineNumber: 1,
        description: "Retail sale",
        quantity: "1.000",
        unitPrice: "1000.00",
        taxRateBps: 1925,
        taxAmount: "192.50",
        lineTotal: "1192.50",
      },
    ],
    pack: {
      version: metadata.packVersion,
      schemaVersion: metadata.schemaVersion,
      resolutionHash: metadata.combinedResolutionHash,
    },
    ...overrides,
  }
}

describe("Cameroon DGI sandbox compliance adapter", () => {
  async function submitWithSandboxMode(mode: "ACCEPT" | "OUTAGE" | "RATE_LIMITED" | "REJECT") {
    const authorityPayload = await cameroonDgiSandboxComplianceAdapter.buildAuthorityPayload(
      canonicalPayload(),
    )

    return cameroonDgiSandboxComplianceAdapter.submit(authorityPayload, {
      organizationId: "org-1",
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      environment: "SANDBOX",
      adapterConfig: {
        id: "adapter-config-1",
        status: "ACTIVE",
        credentialReference: "vault://org-1/cm-dgi-sandbox",
        publicMetadata: { sandboxMode: mode },
      },
    })
  }

  it("validates canonical Cameroon fiscal payloads against country-pack provenance", async () => {
    await expect(
      cameroonDgiSandboxComplianceAdapter.validatePayload(canonicalPayload()),
    ).resolves.toEqual({ ok: true })

    await expect(
      cameroonDgiSandboxComplianceAdapter.validatePayload(
        canonicalPayload({
          pack: {
            version: "CM-2026.1",
            schemaVersion: "country-pack.v1",
            resolutionHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
          },
        }),
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "PAYLOAD_VALIDATION_ERROR",
      message: expect.stringMatching(/resolution hash/i),
    })
  })

  it("builds deterministic sandbox authority payloads without production certification claims", async () => {
    const authorityPayload = await cameroonDgiSandboxComplianceAdapter.buildAuthorityPayload(
      canonicalPayload(),
    )

    expect(authorityPayload).toMatchObject({
      adapterCode: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
      payloadHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      payload: expect.objectContaining({
        adapter: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
        sandbox: true,
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      }),
    })
  })

  it("accepts active sandbox configs with credential references and marks legal effect as sandbox-only", async () => {
    const authorityPayload = await cameroonDgiSandboxComplianceAdapter.buildAuthorityPayload(
      canonicalPayload(),
    )
    const result = await cameroonDgiSandboxComplianceAdapter.submit(authorityPayload, {
      organizationId: "org-1",
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      environment: "SANDBOX",
      adapterConfig: {
        id: "adapter-config-1",
        status: "ACTIVE",
        credentialReference: "vault://org-1/cm-dgi-sandbox",
        publicMetadata: { sandboxMode: "ACCEPT" },
      },
    })

    expect(result).toMatchObject({
      ok: true,
      status: "ACCEPTED",
      authorityReference: expect.stringMatching(/^CM-SBX-/),
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      responsePayload: expect.objectContaining({
        productionCertification: false,
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      }),
    })
    expect(JSON.stringify(result)).not.toContain("vault://")
    expect(JSON.stringify(result)).not.toContain("credentialReference")
  })

  it("blocks non-sandbox environments without production certification claims", async () => {
    const authorityPayload = await cameroonDgiSandboxComplianceAdapter.buildAuthorityPayload(
      canonicalPayload(),
    )

    await expect(
      cameroonDgiSandboxComplianceAdapter.submit(authorityPayload, {
        organizationId: "org-1",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        environment: "PRODUCTION",
        adapterConfig: {
          id: "adapter-config-1",
          status: "ACTIVE",
          credentialReference: "vault://org-1/cm-dgi-sandbox",
          publicMetadata: { sandboxMode: "ACCEPT" },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: "CREDENTIAL_CONFIGURATION_ERROR",
      responsePayload: expect.objectContaining({
        environment: "PRODUCTION",
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      }),
    })
  })

  it("returns safe configuration and retryable outage failures from sandbox fixtures", async () => {
    const authorityPayload = await cameroonDgiSandboxComplianceAdapter.buildAuthorityPayload(
      canonicalPayload(),
    )

    await expect(
      cameroonDgiSandboxComplianceAdapter.submit(authorityPayload, {
        organizationId: "org-1",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        environment: "SANDBOX",
        adapterConfig: {
          id: "adapter-config-1",
          status: "ACTIVE",
          publicMetadata: { sandboxMode: "ACCEPT" },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: "CREDENTIAL_CONFIGURATION_ERROR",
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    })

    await expect(
      cameroonDgiSandboxComplianceAdapter.submit(authorityPayload, {
        organizationId: "org-1",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        environment: "SANDBOX",
        adapterConfig: {
          id: "adapter-config-1",
          status: "ACTIVE",
          credentialReference: "vault://org-1/cm-dgi-sandbox",
          publicMetadata: { sandboxMode: "OUTAGE" },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: "RETRYABLE_AUTHORITY_OUTAGE",
      retryAfterSeconds: 300,
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    })
  })

  it("covers rate-limit and terminal rejection sandbox fixtures", async () => {
    await expect(submitWithSandboxMode("RATE_LIMITED")).resolves.toMatchObject({
      ok: false,
      status: "RATE_LIMITED",
      retryAfterSeconds: 300,
      responsePayload: expect.objectContaining({
        status: "RATE_LIMITED",
        retryable: true,
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      }),
    })

    await expect(submitWithSandboxMode("REJECT")).resolves.toMatchObject({
      ok: false,
      status: "TERMINAL_REJECTION",
      rejectionReason: "SANDBOX_FIXTURE_REJECTION",
      responsePayload: expect.objectContaining({
        status: "REJECTED",
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      }),
    })
  })
})

import type { RegulatoryCapabilityPort } from "../ports/regulatory-capability.port";
import { resolveRegulatoryDecision } from "../regulatory-capability.service";

const verifiedResult = {
  countryCode: "CM",
  parameterPath: "taxes.vat.standardRateBps",
  value: 1925,
  packVersion: "2026.1",
  schemaVersion: "1",
  legalRef: "CM-TAX-001",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-01-01",
  verifiedBy: "regulatory-team",
  verificationStatus: "EXPERT_REVIEWED",
  layer: "country" as const,
  capabilityStatus: "SUPPORTED_CERTIFIED" as const,
  resolutionHash: "resolution-hash",
};

describe("regulatory capability boundary", () => {
  it("returns a watermarked non-authoritative value in sandbox mode", () => {
    const port: RegulatoryCapabilityPort = {
      resolve: jest.fn(() => verifiedResult),
    };

    expect(
      resolveRegulatoryDecision(
        "taxes.vat.standardRateBps",
        {
          countryCode: "CM",
          date: "2026-07-26",
          executionMode: "SANDBOX",
        },
        port,
      ),
    ).toMatchObject({
      kind: "NON_AUTHORITATIVE",
      watermark: "NOT FOR STATUTORY USE",
      value: 1925,
    });
  });

  it("returns an authoritative value only for a verified production capability", () => {
    const port: RegulatoryCapabilityPort = {
      resolve: jest.fn(() => verifiedResult),
    };

    expect(
      resolveRegulatoryDecision(
        "taxes.vat.standardRateBps",
        {
          countryCode: "CM",
          date: "2026-07-26",
          executionMode: "PRODUCTION",
        },
        port,
      ),
    ).toMatchObject({
      kind: "AUTHORITATIVE",
      value: 1925,
    });
  });

  it("fails closed when production evidence is not expert reviewed", () => {
    const port: RegulatoryCapabilityPort = {
      resolve: jest.fn(() => ({
        ...verifiedResult,
        verificationStatus: "REQUIRES_EXPERT_REVIEW",
      })),
    };

    expect(
      resolveRegulatoryDecision(
        "taxes.vat.standardRateBps",
        {
          countryCode: "CM",
          date: "2026-07-26",
          executionMode: "PRODUCTION",
        },
        port,
      ),
    ).toMatchObject({
      kind: "PENDING_COUNTRY_PACK",
      mode: "PRODUCTION",
      retryable: true,
    });
  });

  it("keeps the source-checked Cameroon CNPS pack non-authoritative in production", () => {
    expect(
      resolveRegulatoryDecision("payroll.cnps.familyAllowanceRatesBps", {
        countryCode: "CM",
        date: "2026-07-27",
        pinnedPackVersion: "CM-2026.1",
        executionMode: "PRODUCTION",
      }),
    ).toMatchObject({
      kind: "PENDING_COUNTRY_PACK",
      mode: "PRODUCTION",
      retryable: true,
    });
  });
});

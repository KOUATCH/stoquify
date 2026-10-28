jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    reconciliationRun: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}))

import { readFileSync } from "fs"
import { join } from "path"

import {
  Prisma,
  ProviderAccountStatus,
  ReconciliationRunStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import type { ModuleAccessIntent } from "@/services/modules/module-control-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import type { PaymentReconciliationSignOffCommandStateInput } from "../payment-reconciliation-sign-off-command-state-contracts"
import { getPaymentReconciliationSignOffCommandState } from "../payment-reconciliation-sign-off-command-state.service"

const mockDb = db as unknown as {
  reconciliationRun: { findFirst: jest.Mock }
}
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockResolveAccess = resolveOperatingAccessScope as jest.Mock

const now = new Date("2026-07-19T12:00:00.000Z")
const businessDate = new Date("2026-07-18T00:00:00.000Z")
const periodStart = new Date("2026-07-18T00:00:00.000Z")
const periodEnd = new Date("2026-07-19T00:00:00.000Z")
const createdAt = new Date("2026-07-18T23:00:00.000Z")
const updatedAt = new Date("2026-07-18T23:30:00.000Z")

describe("payment reconciliation sign-off command state service", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockResolveAccess.mockResolvedValue(tenantAccess())
    mockObserveModuleAccess.mockImplementation(
      async ({ accessIntent }: { accessIntent: ModuleAccessIntent }) =>
        moduleDecision(accessIntent),
    )
    mockDb.reconciliationRun.findFirst.mockResolvedValue(readyRun())
  })

  it("returns one deterministic source-owned READY_FOR_SIGNOFF command candidate", async () => {
    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      kind: "PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE",
      version: 1,
      organizationId: "org-1",
      actorId: "checker-1",
      generatedAt: now.toISOString(),
      authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
      scope: { kind: "TENANT" },
      state: "AVAILABLE",
      reason: null,
      commandAllowed: true,
      candidate: {
        commandId: "payment-reconciliation-sign:run-1",
        actionPath: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.sign",
        source: {
          type: "ReconciliationRun",
          id: "run-1",
          status: "READY_FOR_SIGNOFF",
          updatedAt: updatedAt.toISOString(),
        },
        provider: {
          id: "provider-1",
          displayName: "Mobile Money Clearing",
          currencyCode: "XAF",
        },
        businessDate: businessDate.toISOString(),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        makerActorId: "maker-1",
        totals: {
          internalAmount: "1200.50",
          externalAmount: "1200.50",
          matchedAmount: "1100.00",
          suspenseAmount: "100.50",
        },
        matchCount: 8,
        exceptionCount: 2,
      },
      controls: {
        projectionPurpose: "SOURCE_OWNED_SIGN_OFF_COMMAND_STATE_ONLY",
        sourceOfTruth: "ReconciliationRun",
        tenantWideOnly: true,
        moduleEntitlementEnforced: true,
        makerCheckerRequired: true,
        freshAuthRequired: true,
        minimumAssurance: "L1",
        sourceRevalidatedAtWrite: true,
        clientResolutionAccepted: false,
      },
    })
    expect(result.projectionHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.candidate?.source.versionHash).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    )
    expect(forbiddenResultKeys(result)).toEqual([])

    const query = mockDb.reconciliationRun.findFirst.mock.calls[0][0]
    expect(query.where).toEqual({
      organizationId: "org-1",
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
    })
    expect(query.orderBy).toEqual([
      { businessDate: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ])
    expect(query.select).not.toHaveProperty("rawPayload")
    expect(query.select).not.toHaveProperty("certificate")
    expect(query.select.providerAccount.select).not.toHaveProperty(
      "externalAccountId",
    )
  })

  it("establishes authority and read/write entitlement before source access", async () => {
    await getPaymentReconciliationSignOffCommandState(defaultInput())

    expect(mockResolveAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockObserveModuleAccess.mock.invocationCallOrder[0],
    )
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockObserveModuleAccess.mock.invocationCallOrder[1],
    )
    expect(mockObserveModuleAccess.mock.invocationCallOrder[1]).toBeLessThan(
      mockDb.reconciliationRun.findFirst.mock.invocationCallOrder[0],
    )
    expect(mockObserveModuleAccess).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        organizationId: "org-1",
        userId: "checker-1",
        moduleSlug: "payment_reconciliation",
        surfaceType: "action",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockObserveModuleAccess).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      }),
    )
  })

  it("returns READ_ONLY when the actor can inspect but cannot sign", async () => {
    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput({
        accessContext: accessContext([
          "dashboard.read",
          "payments.reconciliation.read",
        ]),
      }),
    )

    expect(result).toMatchObject({
      state: "READ_ONLY",
      reason: "SIGN_PERMISSION_REQUIRED",
      commandAllowed: false,
      candidate: { source: { id: "run-1" } },
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)
  })

  it("returns READ_ONLY when write entitlement is unavailable", async () => {
    mockObserveModuleAccess.mockImplementation(
      async ({ accessIntent }: { accessIntent: ModuleAccessIntent }) =>
        accessIntent === "write"
          ? moduleDecision("write", {
              result: "deny",
              allowed: false,
              wouldBlock: true,
              reason: "Tenant module is read-only.",
            })
          : moduleDecision("read"),
    )

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "READ_ONLY",
      reason: "MODULE_WRITE_UNAVAILABLE",
      commandAllowed: false,
      candidate: { source: { id: "run-1" } },
    })
  })

  it("does not expose the command as available to its maker", async () => {
    mockDb.reconciliationRun.findFirst.mockResolvedValue(
      readyRun({
        runById: "checker-1",
        runBy: { id: "checker-1", organizationId: "org-1" },
      }),
    )

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "READ_ONLY",
      reason: "MAKER_CHECKER_REQUIRED",
      commandAllowed: false,
      candidate: { makerActorId: "checker-1" },
    })
  })

  it("returns an explicit EMPTY state without inventing a command", async () => {
    mockDb.reconciliationRun.findFirst.mockResolvedValue(null)

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "EMPTY",
      reason: "NO_READY_RUN",
      commandAllowed: false,
      candidate: null,
    })
  })

  it("hides tenant-wide reconciliation state from location responsibility", async () => {
    mockResolveAccess.mockResolvedValue(locationAccess())

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "HIDDEN",
      reason: "TENANT_WIDE_REQUIRED",
      commandAllowed: false,
      candidate: null,
      scope: { kind: "NONE" },
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it("hides state when operating access is denied", async () => {
    mockResolveAccess.mockResolvedValue(deniedAccess())

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "HIDDEN",
      reason: "OPERATING_ACCESS_DENIED",
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      candidate: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it("hides state before entitlement and source reads without read permission", async () => {
    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput({
        accessContext: accessContext(["dashboard.read"]),
      }),
    )

    expect(result).toMatchObject({
      state: "HIDDEN",
      reason: "READ_PERMISSION_REQUIRED",
      candidate: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it("hides state before source reads when read entitlement is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue(
      moduleDecision("read", {
        result: "deny",
        allowed: false,
        wouldBlock: true,
        reason: "Tenant module is unavailable.",
      }),
    )

    const result = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(result).toMatchObject({
      state: "HIDDEN",
      reason: "MODULE_READ_UNAVAILABLE",
      candidate: null,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["access organization", { organizationId: "org-other" }],
    ["access actor", { actorId: "actor-other" }],
  ])("fails closed for inconsistent %s identity", async (_name, override) => {
    mockResolveAccess.mockResolvedValue({ ...tenantAccess(), ...override })

    await expect(
      getPaymentReconciliationSignOffCommandState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it("fails closed for an inconsistent entitlement decision", async () => {
    mockObserveModuleAccess.mockResolvedValue(
      moduleDecision("read", { organizationId: "org-other" }),
    )

    await expect(
      getPaymentReconciliationSignOffCommandState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["cross-tenant run", { organizationId: "org-other" }],
    [
      "cross-tenant provider",
      {
        providerAccount: {
          ...providerAccount(),
          organizationId: "org-other",
        },
      },
    ],
    [
      "inactive provider",
      {
        providerAccount: providerAccount({
          status: ProviderAccountStatus.SUSPENDED,
        }),
      },
    ],
    ["missing maker", { runById: null, runBy: null }],
    [
      "cross-tenant maker",
      { runBy: { id: "maker-1", organizationId: "org-other" } },
    ],
    ["stale status", { status: ReconciliationRunStatus.SIGNED }],
    ["future update", { updatedAt: new Date("2026-07-19T12:01:00.000Z") }],
    ["invalid period", { periodEnd: periodStart }],
    ["negative count", { exceptionCount: -1 }],
    ["negative amount", { suspenseAmount: decimal("-0.01") }],
  ])("fails closed for %s evidence", async (_name, override) => {
    mockDb.reconciliationRun.findFirst.mockResolvedValue(readyRun(override))

    await expect(
      getPaymentReconciliationSignOffCommandState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("keeps hashes stable across observation time and changes them with source facts", async () => {
    const first = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )
    const second = await getPaymentReconciliationSignOffCommandState(
      defaultInput({ now: new Date("2026-07-19T13:00:00.000Z") }),
    )
    mockDb.reconciliationRun.findFirst.mockResolvedValue(
      readyRun({
        providerAccount: providerAccount({ displayName: "Bank Clearing" }),
      }),
    )
    const changed = await getPaymentReconciliationSignOffCommandState(
      defaultInput(),
    )

    expect(second.generatedAt).not.toBe(first.generatedAt)
    expect(second.projectionHash).toBe(first.projectionHash)
    expect(second.candidate?.source.versionHash).toBe(
      first.candidate?.source.versionHash,
    )
    expect(changed.projectionHash).not.toBe(first.projectionHash)
    expect(changed.candidate?.source.versionHash).not.toBe(
      first.candidate?.source.versionHash,
    )
  })

  it.each([
    [{ accessContext: { ...accessContext(), orgId: "" } }, BusinessRuleError],
    [{ accessContext: { ...accessContext(), userId: "" } }, BusinessRuleError],
    [{ now: "invalid" }, BusinessRuleError],
  ])("rejects malformed bounded input before access", async (override, error) => {
    await expect(
      getPaymentReconciliationSignOffCommandState(defaultInput(override)),
    ).rejects.toBeInstanceOf(error)
    expect(mockResolveAccess).not.toHaveBeenCalled()
  })

  it("has no command mutation, UI, route, generic task, AI, or WhatsApp dependency", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/@\/actions|app\/|components\//)
    expect(source).not.toMatch(/ActionItem|whatsapp|copilot|notification/i)
    expect(source).not.toMatch(/reconciliationRun\.(create|update|upsert|delete)/)
    expect(source).not.toMatch(/\$transaction/)
  })
})

function defaultInput(
  overrides: Partial<PaymentReconciliationSignOffCommandStateInput> = {},
): PaymentReconciliationSignOffCommandStateInput {
  return {
    accessContext: accessContext(),
    now,
    ...overrides,
  }
}

function accessContext(
  permissions = [
    "dashboard.read",
    "payments.reconciliation.read",
    "payments.reconciliation.sign",
  ],
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "checker-1",
    roles: [
      {
        id: "role-admin",
        name: "Administrator",
        code: "admin",
        permissions,
      },
    ],
    permissions,
    isSuperUser: false,
  }
}

function tenantAccess() {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "checker-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "admin",
    },
    scope: { kind: "TENANT", locationIds: null },
  }
}

function locationAccess() {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "checker-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations: [
        { id: "location-1", name: "Main Branch", code: "MAIN" },
      ],
    },
    scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
  }
}

function deniedAccess() {
  return {
    allowed: false,
    organizationId: "org-1",
    actorId: "checker-1",
    requiredPermission: "dashboard.read",
    authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
    reason: "MISSING_DAILY_TRUTH_PERMISSION",
    scope: null,
  }
}

function moduleDecision(
  accessIntent: ModuleAccessIntent,
  overrides: Record<string, unknown> = {},
) {
  return {
    organizationId: "org-1",
    userId: "checker-1",
    moduleSlug: "payment_reconciliation",
    surfaceType: "action",
    surface:
      "services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts",
    accessIntent,
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: {
      moduleSlug: "payment_reconciliation",
      status: "active",
      source: "requested_modules",
      startsAt: null,
      endsAt: null,
      readOnly: false,
      trial: false,
    },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: now.toISOString(),
    ...overrides,
  }
}

function readyRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    organizationId: "org-1",
    providerAccountId: "provider-1",
    businessDate,
    periodStart,
    periodEnd,
    status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
    totalInternalAmount: decimal("1200.50"),
    totalExternalAmount: decimal("1200.50"),
    matchedAmount: decimal("1100.00"),
    suspenseAmount: decimal("100.50"),
    exceptionCount: 2,
    matchCount: 8,
    runById: "maker-1",
    createdAt,
    updatedAt,
    providerAccount: providerAccount(),
    runBy: { id: "maker-1", organizationId: "org-1" },
    ...overrides,
  }
}

function providerAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "provider-1",
    organizationId: "org-1",
    displayName: "Mobile Money Clearing",
    status: ProviderAccountStatus.ACTIVE,
    currencyCode: "XAF",
    archivedAt: null,
    ...overrides,
  }
}

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function forbiddenResultKeys(value: unknown, path: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenResultKeys(item, [...path, String(index)]),
    )
  }
  if (!value || typeof value !== "object") return []

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const nextPath = [...path, key]
      const matches =
        /token|password|secret|cookie|session|requestHash|correlationId|externalAccount|rawPayload|certificate/i.test(
          key,
        )
          ? [nextPath.join(".")]
          : []
      return [...matches, ...forbiddenResultKeys(child, nextPath)]
    },
  )
}

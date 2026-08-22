import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MasterDataOnboardingWorkbench } from "@/components/onboarding/MasterDataOnboardingWorkbench"
import type { MasterDataImportSummary, MasterDataOnboardingDashboard } from "@/services/onboarding/master-data-import.service"

const mockRefresh = jest.fn()
const mockApprove = jest.fn()
let mockLocale: "en" | "fr" = "en"

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
    return Icon
  }
  return new Proxy({ __esModule: true }, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target]
      return createIcon(prop)
    },
  })
})

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (namespace: string) => {
    const allMessages = mockLocale === "fr"
      ? require("@/messages/fr.json")
      : require("@/messages/en.json")
    const messages = namespace.split(".").reduce(
      (value: Record<string, unknown>, key: string) => value[key] as Record<string, unknown>,
      allMessages,
    )
    const lookup = (key: string) => key.split(".").reduce(
      (value: unknown, part: string) => (value as Record<string, unknown>)[part],
      messages,
    )
    const translate = (key: string, values?: Record<string, string | number>) => {
      const raw = String(lookup(key) ?? key)
      return Object.entries(values ?? {}).reduce(
        (message, [name, value]) => message.replace(`{${name}}`, String(value)),
        raw,
      )
    }
    translate.raw = (key: string) => lookup(key)
    return translate
  },
}))
jest.mock("@/actions/onboarding/master-data-onboarding.actions", () => ({
  approveMasterDataImportAction: (...args: unknown[]) => mockApprove(...args),
  commitMasterDataImportAction: jest.fn(),
  getMasterDataCsvTemplateAction: jest.fn(),
  getMasterDataImportEvidenceAction: jest.fn(),
  stageMasterDataImportAction: jest.fn(),
}))

const controlBoundary = {
  included: [
    "customer identity and contact master data",
    "supplier identity and contact master data",
    "item catalogue identity, description, and prices",
    "tenant-scoped staging, mappings, validation, approvals, controls, evidence, and readiness",
  ],
  domainWriteOwners: [],
  excluded: [
    "customer or supplier current balances",
    "opening accounting balances",
    "inventory opening quantities or stock movements",
    "journal or ledger postings",
    "historical transaction or statutory-document migration",
    "updates, merges, hard deletes, destructive resets, or automatic rollback",
  ],
  compensation: "Separate correction only.",
} as const

function batch(canCurrentActorApprove: boolean): MasterDataImportSummary {
  return {
    batchId: "batch-risk-1", organizationId: "org-1", target: "SUPPLIER", status: "VALIDATED",
    sourceFilename: "suppliers.csv", contentHash: `sha256:${"a".repeat(64)}`, mappingVersion: 1,
    schemaVersion: "1", replayed: false, replayCount: 0,
    risk: { level: "HIGH", reasons: ["SUPPLIER_CREATION"], separateApproverRequired: true },
    controls: {
      sourceRecordCount: 1, validRecordCount: 1, errorRecordCount: 0, duplicateRecordCount: 0,
      requiredFieldTotals: { code: 1, name: 1 }, preCommitRecordCount: null, postCommitRecordCount: null,
      destinationRequiredTotals: null, committedRecordCount: 0,
    },
    issues: [],
    approval: {
      required: true, digest: `sha256:${"b".repeat(64)}`, approvedById: null, approvedAt: null,
      canCurrentActorApprove,
    },
    evidenceHash: null, committedRecordIds: [],
  }
}

function dashboard(recentBatches: MasterDataImportSummary[] = []): MasterDataOnboardingDashboard {
  return {
    organizationId: "org-1", overallState: recentBatches.length ? "IMPORTED" : "NOT_STARTED",
    generatedAt: "2026-08-16T10:00:00.000Z",
    milestones: (["CUSTOMER", "SUPPLIER", "ITEM"] as const).map((target) => ({
      target, state: "NOT_STARTED" as const, evidenceBatchId: null, sourceRecordCount: 0,
      committedCount: 0, blockerCount: 0, waivedAt: null, waiverReason: null,
    })),
    recentBatches,
    adoption: {
      evidenceWindow: "RECENT_12_BATCHES", batchCount: recentBatches.length, committedBatchCount: 0,
      blockedBatchCount: 0, highRiskBatchCount: recentBatches.length, separatelyApprovedHighRiskBatchCount: 0,
      stagedRecordCount: recentBatches.length, committedRecordCount: 0, rejectedRecordCount: 0, duplicateRecordCount: 0,
    },
    controlBoundary,
  }
}

function renderWorkbench(locale: "en" | "fr", data = dashboard(), writableTargets = ["CUSTOMER", "SUPPLIER", "ITEM"] as const) {
  mockLocale = locale
  return render(<MasterDataOnboardingWorkbench initialData={data} writableTargets={writableTargets} />)
}

describe("governed master-data onboarding workbench", () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders explicit English empty and partial states with labelled controls", () => {
    renderWorkbench("en", dashboard(), ["CUSTOMER"])
    expect(screen.getByRole("heading", { name: "Master-data import readiness" })).toBeVisible()
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "partial")
    expect(screen.getByLabelText("Target")).toBeVisible()
    expect(screen.getByLabelText(/CSV file/)).toHaveAccessibleDescription(/5 MB/i)
    expect(screen.getByRole("heading", { name: "No batch selected" })).toBeVisible()
    expect(screen.getByText("Opening accounting balances")).toBeVisible()
  })

  it("renders French high-risk maker-checker state and disables uploader approval", async () => {
    renderWorkbench("fr", dashboard([batch(false)]))
    await userEvent.selectOptions(screen.getByLabelText("Cible"), "SUPPLIER")
    expect(screen.getByText("Risque élevé")).toBeVisible()
    expect(screen.getByText("Approbateur distinct requis")).toBeVisible()
    expect(screen.getByText(/L’auteur du téléversement ne peut pas approuver/)).toBeVisible()
    expect(screen.getByRole("checkbox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Enregistrer l’approbation" })).toBeDisabled()
    expect(screen.getByText("Soldes comptables d’ouverture")).toBeVisible()
    expect(screen.getByText("Quantités de stock initiales ou mouvements de stock")).toBeVisible()
  })

  it("lets a different authorized user approve the exact high-risk batch", async () => {
    mockApprove.mockResolvedValue({ ...batch(true), status: "APPROVED" })
    renderWorkbench("en", dashboard([batch(true)]))
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "SUPPLIER" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Record explicit approval" }))
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(expect.objectContaining({
      target: "SUPPLIER",
      batchId: "batch-risk-1",
    })))
  })
})

import { render, screen } from "@testing-library/react"

import type { APWorkbenchData } from "@/actions/purchasing/ap-control.actions"
import APControlWorkbench, {
  apStatusTone,
  formatAPStatus,
  isAPSnapshotStale,
} from "@/components/purchasing/APControlWorkbench"

jest.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />
  return {
    AlertTriangle: Icon,
    ArrowUpRight: Icon,
    Banknote: Icon,
    Building2: Icon,
    CalendarClock: Icon,
    CheckCircle2: Icon,
    CircleDot: Icon,
    Clock3: Icon,
    Database: Icon,
    FileClock: Icon,
    FileText: Icon,
    Filter: Icon,
    GitBranch: Icon,
    History: Icon,
    Landmark: Icon,
    LockKeyhole: Icon,
    ReceiptText: Icon,
    Scale: Icon,
    Search: Icon,
    ShieldAlert: Icon,
    ShieldCheck: Icon,
    Truck: Icon,
    WalletCards: Icon,
  }
})

const asOf = "2026-08-10T10:00:00.000Z"

const data = {
  organizationId: "org-internal-1",
  asOf,
  counts: {
    postedInvoices: 2,
    paymentPendingInvoices: 1,
    matchExceptions: 1,
    pendingBankChanges: 1,
    releasedPayments: 1,
    ledgerBlockers: 1,
    reconciliationBlockers: 1,
  },
  queues: {
    recentInvoices: [{
      id: "invoice-1",
      invoiceNumber: "INV-001",
      supplierName: "Atlas Supply",
      status: "PAYMENT_PENDING",
      total: "120000",
      amountPaid: "0",
      currency: "XAF",
      invoiceDate: asOf,
      ledgerPostingBatchId: "batch-secret",
      ledgerStatus: "BLOCKED_PENDING_RULES",
      ledgerBlockerCode: "AP_POSTING_RULE_REVIEW",
      ledgerBlockerMessage: "raw ledger provider detail",
      countryPackStatus: "RESOLVED",
      countryPackVersion: "cm-2026.1",
      countryPackResolutionHash: "hash-secret",
      taxTreatmentStatus: "INPUT_VAT_PACK_RESOLVED",
      withholdingTreatmentStatus: "NO_INPUT_VAT_AMOUNT",
      operatorActionRequired: true,
    }],
    pendingBankChanges: [{
      id: "bank-1",
      supplierId: "supplier-1",
      supplierName: "Atlas Supply",
      requestedById: "requester-secret-id",
      requestedAt: asOf,
      reason: "Controlled destination update",
      bankAccountId: "bank-secret-id",
    }],
    releasedPayments: [{
      id: "payment-1",
      paymentNumber: "PAY-001",
      supplierName: "Atlas Supply",
      amount: "60000",
      currency: "XAF",
      method: "BANK_TRANSFER",
      paymentDate: asOf,
      ledgerPostingBatchId: "payment-batch-secret",
      postedBusinessEventId: "event-secret",
      ledgerStatus: "POSTED",
      ledgerBlockerCode: null,
      ledgerBlockerMessage: null,
      reconciliationStatus: "AWAITING_STATEMENT_MATCH",
      paymentTransactionId: "transaction-secret-id",
      paymentExceptionId: "exception-secret-id",
      countryPackStatus: "RESOLVED",
      withholdingTreatmentStatus: "NO_INPUT_VAT_AMOUNT",
      operatorActionRequired: false,
    }],
    ledgerBlockers: [{
      id: "blocker-1",
      sourceType: "SUPPLIER_INVOICE",
      sourceId: "source-secret-id",
      postingPurpose: "SUPPLIER_INVOICE",
      status: "BLOCKED",
      errorMessage: "database connection and stack trace secret",
      createdAt: asOf,
    }],
  },
} as APWorkbenchData

describe("APControlWorkbench presentation", () => {
  it("maps AP states to the canonical semantic vocabulary", () => {
    expect(apStatusTone("POSTED")).toBe("brand")
    expect(apStatusTone("PAYMENT_PENDING")).toBe("gold")
    expect(apStatusTone("BLOCKED_PENDING_RULES")).toBe("danger")
    expect(apStatusTone("RELEASED")).toBe("spruce")
    expect(apStatusTone("CANCELLED")).toBe("muted")
    expect(formatAPStatus("AWAITING_STATEMENT_MATCH", "fr")).toBe("Rapprochement relevé en attente")
    expect(isAPSnapshotStale(asOf, "2026-08-10T10:16:00.000Z")).toBe(true)
  })

  it("renders workflow context, localized statuses, and privacy-safe proof", () => {
    render(<APControlWorkbench data={data} locale="en" evaluatedAt={asOf} />)

    expect(screen.getByRole("heading", { name: "Accounts payable workbench" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open AP history" })).toHaveAttribute("href", "/en/dashboard/purchases/payables/history")
    expect(screen.getAllByRole("link", { name: "Open suppliers" }).some((link) => link.getAttribute("href") === "/en/dashboard/purchases/suppliers")).toBe(true)
    expect(screen.getAllByText("Blocked pending rules").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Payment pending").length).toBeGreaterThan(0)
    expect(screen.getByText("Transaction recorded")).toBeInTheDocument()
    expect(screen.getByText("Exception recorded")).toBeInTheDocument()
    expect(screen.queryByText("requester-secret-id")).not.toBeInTheDocument()
    expect(screen.queryByText("transaction-secret-id")).not.toBeInTheDocument()
    expect(screen.queryByText("source-secret-id")).not.toBeInTheDocument()
    expect(screen.queryByText(/database connection and stack trace secret/)).not.toBeInTheDocument()
  })

  it("renders localized stale and empty states in French", () => {
    const emptyData = {
      ...data,
      counts: {
        postedInvoices: 0,
        paymentPendingInvoices: 0,
        matchExceptions: 0,
        pendingBankChanges: 0,
        releasedPayments: 0,
        ledgerBlockers: 0,
        reconciliationBlockers: 0,
      },
      queues: { recentInvoices: [], pendingBankChanges: [], releasedPayments: [], ledgerBlockers: [] },
    } as APWorkbenchData

    render(<APControlWorkbench data={emptyData} locale="fr" evaluatedAt="2026-08-10T10:16:00.000Z" />)

    expect(screen.getByRole("heading", { name: "Atelier des dettes fournisseurs" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "L'instantané AP est périmé" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Aucune activité AP dans ce périmètre" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ouvrir l'historique AP" })).toHaveAttribute("href", "/fr/dashboard/purchases/payables/history")
  })

  it("surfaces partial statutory and reconciliation proof", () => {
    const partialData = {
      ...data,
      counts: { ...data.counts, ledgerBlockers: 0, reconciliationBlockers: 0, matchExceptions: 0 },
      queues: {
        ...data.queues,
        recentInvoices: [{ ...data.queues.recentInvoices[0], countryPackStatus: null }],
        ledgerBlockers: [],
      },
    } as APWorkbenchData

    render(<APControlWorkbench data={partialData} locale="en" evaluatedAt={asOf} />)

    expect(screen.getByRole("heading", { name: "AP proof is partial" })).toBeInTheDocument()
  })
})

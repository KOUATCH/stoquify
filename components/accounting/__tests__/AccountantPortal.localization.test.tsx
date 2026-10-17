import { fireEvent, render, screen, within } from "@testing-library/react"
import type { AccountantPortalData } from "@/actions/accounting/data-trust.actions"
import { AccountantPortal } from "../AccountantPortal"
import { portalEvidenceText } from "../accountantPortalCopy"

const mockQuery = jest.fn()
const mockExport = jest.fn()
const mockRefresh = jest.fn()
jest.mock("@/hooks/useAccountantPortal", () => ({
  useAccountantPortal: (options: unknown) => mockQuery(options),
  useExportAccountantTrustPack: () => ({ mutateAsync: mockExport, isPending: false }),
}))

function fixture(): AccountantPortalData {
  const figure = { available: false as const, amount: null, currency: "XAF", provenance: "UNAVAILABLE" as const, reason: "Critical data-trust blockers must be resolved before this financial figure is rendered.", asOf: "2026-10-15T10:00:00Z", periodStatus: "OPEN" as const, sourceTables: ["journal_entries"], sourceQueryId: "test-query" }
  return {
    source: { mode: "LEDGER_BACKED_DATA_TRUST", asOf: "2026-10-15T10:00:00Z", organizationScoped: true, trustLevel: "T0", certificationStatus: "NON_COMPLIANT", scopeHash: "scope-test", sourceTables: ["journal_entries"] },
    scope: { organizationId: "org-test", periodId: "period-test", periodName: "October", periodStatus: "OPEN", startDate: null, endDate: null },
    certificate: { surface: "dashboard/accounting/accountant-portal", level: "T0", verdict: "NON_COMPLIANT", generatedAt: "2026-10-15T10:00:00Z", evidence: [], requiredForNextLevel: [] },
    summary: { postedJournalEntries: 3, journalLines: 6, sourceLinks: 0, linkedPostedEntries: 0, sourceLinkCoveragePct: 0, ledgerBalanced: true, blockerCount: 1, criticalBlockers: 1, highBlockers: 0 },
    figures: { activityDebit: figure, activityCredit: figure },
    moduleEvidence: [{ module: "ledger", status: "blocked", label: "Ledger source of truth", detail: "Posted journal entries, journal lines, posting batches, and source links.", facts: [{ label: "Journal lines", value: 6 }] }],
    blockers: [{ id: "missing-link", severity: "critical", gate: "ledger.source-link", title: "Posted journals lack source links", detail: "3 posted journal entry or reversal has no accounting source link.", sourceTables: ["journal_entries", "accounting_source_links"] }],
    latestSourceLinks: [], latestAuditEvents: [],
    exportReadiness: { canExportCertifiedPack: false, disabledReason: "Certified accountant trust-pack export requires T4: balanced ledger, source-link coverage, no failed events, no open high-risk exceptions, and no unresolved statutory blockers.", requiredPermission: "accounting.exports.create", sensitivity: "statutory" },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockQuery.mockReturnValue({ data: fixture(), isError: false, isLoading: false, isFetching: false, refetch: mockRefresh })
})

it.each(["en", "fr"] as const)("keeps certification and financial withholding intact in %s", locale => {
  render(<AccountantPortal locale={locale} />)
  const button = screen.getByRole("button", { name: locale === "fr" ? "Exporter le dossier certifié" : "Export trust pack" })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(mockExport).not.toHaveBeenCalled()
  expect(screen.getByText("T0 " + (locale === "fr" ? "Non conforme" : "Non-compliant"))).toBeInTheDocument()
  expect(screen.getAllByText(locale === "fr" ? "Indisponible" : "Unavailable", { exact: true })).toHaveLength(2)
  expect(screen.getByText("ledger.source-link")).toBeInTheDocument()
  expect(screen.getByText("journal_entries, accounting_source_links")).toBeInTheDocument()
})

it("translates evidence counts and searches by the French blocker title", () => {
  render(<AccountantPortal locale="fr" />)
  expect(screen.getByText("6 lignes du grand livre issues d’écritures comptabilisées ou extournées")).toBeInTheDocument()
  expect(screen.getByText("Grand livre de référence")).toBeInTheDocument()
  expect(screen.getByText("3 écriture(s) comptabilisée(s) ou extournée(s) sans lien source comptable.")).toBeInTheDocument()
  const section = document.getElementById("portal-blockers")!
  fireEvent.change(within(section).getByRole("textbox", { name: "Rechercher les blocages de clôture..." }), { target: { value: "Écritures comptabilisées" } })
  expect(within(section).getByText("Écritures comptabilisées sans lien source")).toBeVisible()
})

it("hides stale results after a failed read and offers French recovery", () => {
  mockQuery.mockReturnValue({ data: fixture(), isError: true, isLoading: false, error: new Error("Accountant portal evidence is unavailable."), refetch: mockRefresh })
  render(<AccountantPortal locale="fr" />)
  expect(screen.queryByText("T0 Non conforme")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Exporter le dossier certifié" })).not.toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Portail comptable indisponible" })).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Actualiser" }))
  expect(mockRefresh).toHaveBeenCalledTimes(1)
})

it("keeps loading separate from financial results", () => {
  mockQuery.mockReturnValue({ data: undefined, isError: false, isLoading: true })
  render(<AccountantPortal locale="fr" />)
  expect(screen.getByRole("heading", { name: "Chargement des preuves comptables" })).toBeInTheDocument()
  expect(screen.queryByRole("table")).not.toBeInTheDocument()
  expect(mockExport).not.toHaveBeenCalled()
})

it("preserves unfamiliar diagnostics and counts without inventing readiness", () => {
  for (const value of ["NEW_UNKNOWN_STATE", "7 changed server diagnostic.", "constructor"]) expect(portalEvidenceText(value, "fr")).toBe(value)
  expect(portalEvidenceText("needs_review", "fr")).toBe("À vérifier")
  expect(portalEvidenceText("recorded", "fr")).toBe("Enregistré")
  expect(portalEvidenceText("97.5%", "fr")).toBe("97,5\u00a0%")
  expect(portalEvidenceText("97.5%", "en")).toBe("97.5%")
  expect(portalEvidenceText("003 posted journal entry or reversal has no accounting source link.", "fr")).toMatch(/^003 /)
  expect(portalEvidenceText("blocked", "en")).toBe("blocked")
})

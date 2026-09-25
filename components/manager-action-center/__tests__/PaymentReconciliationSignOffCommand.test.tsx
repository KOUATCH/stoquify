import { render, screen } from "@testing-library/react"
import { PaymentReconciliationSignOffCommand } from "../PaymentReconciliationSignOffCommand"
import type { PaymentReconciliationSignOffCommandCandidate } from "@/services/reconciliation/payment-reconciliation-sign-off-command-state-contracts"
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("lucide-react", () => ({ ShieldCheck: () => <svg aria-hidden="true" /> }))
const command: PaymentReconciliationSignOffCommandCandidate = {
  commandId: "sign-run", actionPath: "/dashboard/finance/reconciliation", requiredPermission: "payments.reconciliation.sign",
  source: { id: "run one&two", type: "ReconciliationRun", status: "READY_FOR_SIGNOFF", updatedAt: "2026-09-13T10:00:00Z", versionHash: "sha256:" + "a".repeat(64) },
  provider: { id: "provider", displayName: "Provider", currencyCode: "XAF" }, businessDate: "2026-09-13T00:00:00Z", periodStart: "2026-09-13T00:00:00Z", periodEnd: "2026-09-14T00:00:00Z",
  makerActorId: "maker", totals: { internalAmount: "100.25", externalAmount: "100.25", matchedAmount: "100.25", suspenseAmount: "0.00" }, matchCount: 1, exceptionCount: 0,
}
it.each(["en", "fr"] as const)("hands %s users to the scoped run review without signing from a snapshot", locale => {
  render(<PaymentReconciliationSignOffCommand locale={locale} command={command} />)
  expect(screen.getByRole("link", { name: "open" })).toHaveAttribute("href", `/${locale}/dashboard/finance/reconciliation?reviewRun=run%20one%26two`)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  expect(screen.getByText("managerHandoff")).toBeVisible()
})
it("preserves cent precision in large retained run totals", () => {
  render(<PaymentReconciliationSignOffCommand locale="en" command={{ ...command, totals: { ...command.totals, matchedAmount: "9007199254740993.01" } }} />)
  expect(screen.getByText("totals.matched: 9,007,199,254,740,993.01 XAF")).toBeVisible()
})

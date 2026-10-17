import { render, screen } from "@testing-library/react"
import PayrollRegisterTieOut from "../PayrollRegisterTieOut"
import PayrollCommandCenter from "../PayrollCommandCenter"
import PayrollDeclarationWorkbench from "../PayrollDeclarationWorkbench"
import PayrollPaymentReconciliationWorkbench from "../PayrollPaymentReconciliationWorkbench"
import PayrollEmployeeBalanceWorkbench from "../PayrollEmployeeBalanceWorkbench"
import { payrollUiText, payrollStatusText } from "../payroll-ui-copy"
import { inventoryItemsText } from "@/components/inventory/inventory-items-copy"
import { inventoryLossWorkbenchCopy } from "@/components/inventory/loss/inventoryLossWorkbenchCopy"
import PurchaseOrdersLoading from "@/app/[locale]/(dashboard)/dashboard/purchase-orders/loading"

jest.mock("next-intl", () => ({ useLocale: () => "fr" }))
jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy({ __esModule: true }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => React.createElement("svg", { "aria-hidden": true }) })
})
jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}` }))
jest.mock("@/actions/payroll/payroll-pilot-certification.actions", () => ({ certifyPayrollPilotCycleAction: jest.fn() }))
jest.mock("@/actions/payroll/payroll-country-pack-review-intake.actions", () => ({
  evaluatePayrollCountryPackReviewIntakeAction: jest.fn(), recordPayrollCountryPackReviewIntakeAction: jest.fn(), approvePayrollCountryPackReviewIntakeAction: jest.fn(),
}))
jest.mock("@/actions/payroll/payroll-control.actions", () => ({ settlePayrollEmployeeBalanceCaseAction: jest.fn(), enqueuePayrollAuthorityAdapterExecutionAction: jest.fn() }))
jest.mock("@/actions/payroll/payroll-payment-reconciliation.actions", () => ({ recordPayrollPaymentSettlementEvidenceAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))

it.each([
  [PayrollRegisterTieOut, "Registre de paie", "Registre de paie indisponible"],
  [PayrollCommandCenter, "Pilotage de la paie", "Pilotage de la paie indisponible"],
  [PayrollDeclarationWorkbench, "Déclarations de paie", "Déclarations de paie indisponibles"],
  [PayrollPaymentReconciliationWorkbench, "Rapprochement des paiements de paie", "Rapprochement des paiements de paie indisponible"],
  [PayrollEmployeeBalanceWorkbench, "Suivi des soldes salariés", "Suivi des soldes salariés indisponible"],
] as const)("localizes empty and error states for %s", (Component, empty, failed) => {
  const view = render(<Component data={null} locale="fr" />)
  expect(screen.getByRole("heading", { name: empty })).toBeInTheDocument()
  view.rerender(<Component data={null} locale="fr" error="Protected source message" />)
  expect(screen.getByRole("heading", { name: failed })).toBeInTheDocument()
  expect(screen.getByText("Protected source message")).toBeInTheDocument()
})

it("announces the destination during purchase-order navigation", () => {
  render(<PurchaseOrdersLoading />)
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
  expect(screen.getByRole("heading", { name: "Chargement des bons de commande" })).toBeInTheDocument()
  expect(screen.queryByText("Loading")).not.toBeInTheDocument()
})

it("preserves English, unknown source values and prototype-like text", () => {
  for (const text of ["custom evidence", "sha256:proof", "constructor", "PAYROLL_PAYMENT_RECONCILED"]) {
    expect(payrollUiText(text, "fr")).toBe(text)
  }
  expect(payrollUiText("Payment reconciliation", "en")).toBe("Payment reconciliation")
  expect(payrollStatusText("RELEASED", "fr")).toBe("Transmis")
  expect(payrollStatusText("SETTLED", "fr")).toBe("Réglé")
  expect(payrollStatusText("RELEASED", "en")).toBe("RELEASED")
  expect(payrollStatusText("custom status", "fr")).toBe("custom status")
  expect(payrollStatusText("MANUAL_EVIDENCE", "fr")).toBe("Preuves manuelles")
  expect(payrollStatusText("MISMATCH", "fr")).toBe("Écart constaté")
  expect(payrollUiText("No evidence hash", "fr")).toBe("Aucune empreinte de preuve")
  expect(payrollUiText("No payload hash", "fr")).toBe("Aucune empreinte du contenu")
  expect(payrollStatusText("ADAPTER_SUPPORTED", "fr")).toBe("Adaptateur pris en charge")
  expect(payrollStatusText("MANUAL_EVIDENCE", "en")).toBe("Manual evidence")
  expect(payrollStatusText("ADAPTER_SUPPORTED", "en")).toBe("Adapter supported")
  expect(inventoryItemsText("Inventory Items", "fr")).toBe("Articles en stock")
  expect(inventoryItemsText("Inventory Items", "en")).toBe("Inventory Items")
  expect(inventoryItemsText("constructor", "fr")).toBe("constructor")
  expect(inventoryLossWorkbenchCopy.fr.title).toBe("Contrôle des pertes de stock")
})

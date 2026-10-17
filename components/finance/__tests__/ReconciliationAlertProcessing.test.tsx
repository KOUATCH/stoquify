import { render, screen } from "@testing-library/react"
import { ReconciliationAlertProcessing } from "../ReconciliationAlertProcessing"
const processing = { state: "FAILED" as const, attempts: 2, nextAttemptAt: "2026-10-04T10:00:00Z", processedAt: null, ageMinutes: 30, lastErrorCode: null, nextAction: "SCHEDULED_RETRY" as const }
it("shows scheduled processing separately from payment settlement", () => {
  render(<ReconciliationAlertProcessing processing={processing} locale="en" formatDateTime={value => value || ""} />)
  expect(screen.getByText("Another attempt is scheduled.")).toBeInTheDocument()
  expect(screen.getByText(/not payment settlement/)).toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})
it("localizes escalation and lease timing in French", () => {
  render(<ReconciliationAlertProcessing processing={{ ...processing, state: "PROCESSING", nextAction: "ESCALATE" }} locale="fr" formatDateTime={value => value || ""} />)
  expect(screen.getByText(/Bail jusqu’au/)).toBeInTheDocument()
  expect(screen.getByText(/Transmettez cette alerte au support/)).toBeInTheDocument()
})

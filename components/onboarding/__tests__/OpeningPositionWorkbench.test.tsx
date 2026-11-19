/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OpeningPositionWorkbench } from "../OpeningPositionWorkbench"
import * as actions from "@/actions/onboarding/opening-position.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import source from "@/services/onboarding/__tests__/fixtures/af09-source.json"
import controls from "@/services/onboarding/__tests__/fixtures/af09-controls.json"
jest.mock("@/actions/onboarding/opening-position.actions", () => ({
  getOpeningPositionWorkspaceAction: jest.fn(), stageOpeningPositionAction: jest.fn(), reviewOpeningPositionAction: jest.fn(),
}))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const hash = "sha256:" + "a".repeat(64)
function workspace() {
  return { organizationId: "client-a", latestRevision: 1, catalog: { accounts: [], customers: [], suppliers: [], items: [], locations: [] }, history: [],
    current: { id: "revision-a", revision: 1, sourceFilename: "source.json", controlsFilename: "controls.json", source, controls,
      mappings: { accounts: [], customers: [], suppliers: [], items: [], locations: [] }, reviewState: "STAGED", reviewedById: null,
      preview: { digest: hash, sourceHash: hash, controlsHash: hash, canReview: true, issues: [], details: [],
        comparisons: [{ key: "ar", proposed: "100.00", control: "99.00", difference: "1.00" }] } } }
}
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(crypto, "randomUUID", { value: jest.fn(() => "synthetic-command"), configurable: true })
  Object.defineProperty(document, "hidden", { value: false, configurable: true })
  ;(actions.getOpeningPositionWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace() })
})
async function load(locale: "en" | "fr" = "en") {
  render(<OpeningPositionWorkbench locale={locale} clientOrganizationId="client-a" />)
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Load / refresh preview" : "Charger / actualiser l’aperçu" }))
  await screen.findByText("99.00")
}
function file(name: string, data: unknown) {
  const content = JSON.stringify(data), f = new File([content], name, { type: "application/json" })
  Object.defineProperty(f, "text", { value: async () => content })
  return f
}
it.each(["en", "fr"] as const)("shows independent differences, no apply action and labelled inputs in %s", async locale => {
  await load(locale)
  expect(screen.getByText("1.00")).toBeInTheDocument()
  expect(screen.getByLabelText(locale === "en" ? "Source position JSON" : "Situation source JSON")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: locale === "en" ? "Record independent preview review" : "Consigner la revue indépendante" })).toBeDisabled()
  expect(screen.queryByRole("button", { name: /^apply$|^appliquer$/i })).not.toBeInTheDocument()
})
it("stages the separately uploaded documents and displayed client/revision without deriving controls", async () => {
  ;(actions.stageOpeningPositionAction as jest.Mock).mockResolvedValue({ success: true, data: { id: "next", duplicate: false } })
  await load()
  fireEvent.change(screen.getByLabelText("Source position JSON"), { target: { files: [file("source.json", source)] } })
  fireEvent.change(screen.getByLabelText("Independent control totals JSON"), { target: { files: [file("controls.json", controls)] } })
  await waitFor(() => expect(screen.getByRole("button", { name: "Stage a new preview" })).toBeEnabled())
  fireEvent.click(screen.getByRole("button", { name: "Stage a new preview" }))
  await waitFor(() => expect(actions.stageOpeningPositionAction).toHaveBeenCalledWith(expect.objectContaining({
    clientOrganizationId: "client-a", expectedRevision: 1, sourceContent: JSON.stringify(source), controlsContent: JSON.stringify(controls),
  })))
})
it("requires a separate explicit retry after password step-up and preserves the exact review key", async () => {
  ;(actions.reviewOpeningPositionAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }).mockResolvedValue({ success: true, data: { id: "revision-a" } })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  await load()
  fireEvent.change(screen.getByLabelText("Review conclusion"), { target: { value: "Independent controls have been reconciled" } })
  fireEvent.click(screen.getByRole("button", { name: "Record independent preview review" }))
  fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "synthetic-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Verify identity" }))
  await screen.findByText("Identity verified. Retry when ready.")
  expect(actions.reviewOpeningPositionAction).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Retry saved submission" }))
  await waitFor(() => expect(actions.reviewOpeningPositionAction).toHaveBeenCalledTimes(2))
  expect((actions.reviewOpeningPositionAction as jest.Mock).mock.calls[1]).toEqual((actions.reviewOpeningPositionAction as jest.Mock).mock.calls[0])
})
it("retains an uncertain review for retry and clears amounts after a denied outcome", async () => {
  ;(actions.reviewOpeningPositionAction as jest.Mock).mockRejectedValueOnce(Error("response lost")).mockResolvedValue({ success: false, code: "FORBIDDEN" })
  await load()
  fireEvent.change(screen.getByLabelText("Review conclusion"), { target: { value: "Independent review requiring a reliable receipt" } })
  fireEvent.click(screen.getByRole("button", { name: "Record independent preview review" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry saved submission" }))
  await screen.findByText(/Current access or evidence does not permit/)
  expect(screen.queryByText("99.00")).not.toBeInTheDocument()
})
it("clears private source/preview state when hidden and ignores late reads after a scope change", async () => {
  let resolve!: (value: unknown) => void
  ;(actions.getOpeningPositionWorkspaceAction as jest.Mock).mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const view = render(<OpeningPositionWorkbench locale="en" clientOrganizationId="client-a" />)
  fireEvent.click(screen.getByRole("button", { name: "Load / refresh preview" }))
  view.rerender(<OpeningPositionWorkbench locale="en" clientOrganizationId="client-b" />)
  await act(async () => resolve({ success: true, data: workspace() }))
  expect(screen.queryByText("99.00")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Load / refresh preview" }))
  await screen.findByText("99.00")
  Object.defineProperty(document, "hidden", { value: true, configurable: true })
  fireEvent(document, new Event("visibilitychange"))
  expect(screen.queryByText("99.00")).not.toBeInTheDocument()
})
it("rejects an unsupported upload locally and keeps staging disabled", async () => {
  await load()
  fireEvent.change(screen.getByLabelText("Source position JSON"), { target: { files: [file("wrong.json", { ...source, currency: "EUR" })] } })
  await screen.findByText(/Use the documented JSON format/)
  expect(screen.getByRole("button", { name: "Stage a new preview" })).toBeDisabled()
  expect(actions.stageOpeningPositionAction).not.toHaveBeenCalled()
})

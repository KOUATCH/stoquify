import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import SettlementForm from "../PayrollEmployeeBalanceSettlementForm"
import AuthorityPanel from "../PayrollDeclarationAuthorityExecutionPanel"
import ProofDrawer from "../PayrollProofDrawerButton"
import { settlePayrollEmployeeBalanceCaseAction, enqueuePayrollAuthorityAdapterExecutionAction } from "@/actions/payroll/payroll-control.actions"
const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock("@/actions/payroll/payroll-control.actions", () => ({ settlePayrollEmployeeBalanceCaseAction: jest.fn(), enqueuePayrollAuthorityAdapterExecutionAction: jest.fn() }))
jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy({ __esModule: true }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => React.createElement("svg", { "aria-hidden": true }) })
})
beforeEach(() => jest.clearAllMocks())
function renderSettlement() {
  render(<SettlementForm locale="fr" balanceCaseId="case-1" caseNumber="CASE-1" employeeId="employee-1" outstandingAmount="250.00" currency="XAF" />)
  fireEvent.change(screen.getByLabelText("Empreinte de preuve"), { target: { value: "sha256:source-proof" } })
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer le règlement" }))
}
it.each([
  [false, "Preuves de règlement enregistrées."],
  [true, "Les preuves de règlement ont déjà été enregistrées pour cette demande."],
])("announces French settlement success without altering the payload (%s)", async (idempotent, message) => {
  ;(settlePayrollEmployeeBalanceCaseAction as jest.Mock).mockResolvedValue({success:true,data:{idempotent}})
  renderSettlement()
  expect(await screen.findByRole("status")).toHaveTextContent(message)
  expect(settlePayrollEmployeeBalanceCaseAction).toHaveBeenCalledWith(expect.objectContaining({balanceCaseId:"case-1",settledById:"employee-1",amount:"250.00",settlementMethod:"CASH",settlementEvidenceHash:"sha256:source-proof"}))
  expect(mockRefresh).toHaveBeenCalledTimes(1)
})
it("retains the exact protected error and correlation ID", async () => {
  ;(settlePayrollEmployeeBalanceCaseAction as jest.Mock).mockResolvedValue({success:false,code:"FRESH_AUTH_REQUIRED",error:"Protected policy detail",correlationId:"corr-123"})
  renderSettlement()
  expect(await screen.findByRole("alert")).toHaveTextContent("Protected policy detail")
  expect(screen.getByRole("alert")).toHaveTextContent("corr-123")
  expect(mockRefresh).not.toHaveBeenCalled()
})
it("localizes queued status while preserving adapter proof and queue payload", async () => {
  ;(enqueuePayrollAuthorityAdapterExecutionAction as jest.Mock).mockResolvedValue({success:true,data:{execution:{status:"QUEUED",authorityAdapterKey:"adapter:cm",authorityAdapterProofHash:"sha256:untouched",correlationId:"corr-456"}}})
  const declaration = {id:"decl-1",adapterExecution:{canEnqueue:true,declarationEvidenceId:"evidence-1",requiredPermission:"payroll.declarations.submit",requiresFreshAuth:true,status:"READY",reason:"Source gate reason"}} as any
  render(<AuthorityPanel locale="fr" declaration={declaration} />)
  expect(screen.getByText("Réauthentification")).toBeInTheDocument()
  expect(screen.getByText("payroll.declarations.submit")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button",{name:"Planifier l’exécution de l’adaptateur"}))
  const notice = await screen.findByRole("status")
  expect(notice).toHaveTextContent("Exécution de l’adaptateur de l’organisme mise en file d’attente.")
  expect(notice).toHaveTextContent("Statut : En file d’attente")
  expect(notice).toHaveTextContent("sha256:untouched")
  expect(enqueuePayrollAuthorityAdapterExecutionAction).toHaveBeenCalledWith({declarationEvidenceId:"evidence-1",idempotencyKey:expect.stringContaining("payroll-declaration:authority-adapter:decl-1:")})
})
it("keeps a denied adapter action unavailable", () => {
  render(<AuthorityPanel locale="fr" declaration={{id:"decl-2",adapterExecution:{canEnqueue:false,declarationEvidenceId:null,requiredPermission:"payroll.declarations.submit",status:"BLOCKED",reason:"Source gate reason"}} as any} />)
  expect(screen.queryByRole("button",{name:"Planifier l’exécution de l’adaptateur"})).not.toBeInTheDocument()
  expect(screen.getByText("Bloqué")).toBeInTheDocument()
  expect(enqueuePayrollAuthorityAdapterExecutionAction).not.toHaveBeenCalled()
})
it("localizes proof labels while keeping source values, titles and unknown labels intact", async () => {
  const subject = {id:"proof-1",label:"Source record",source:"service/source",status:"RELEASED",rows:[{label:"Batch evidence",value:"sha256:untranslated"},{label:"custom source label",value:"READY"}]}
  const before = JSON.stringify(subject)
  render(<ProofDrawer locale="fr" subject={subject} />)
  fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByRole("dialog")).toHaveTextContent("Preuve du lot")
  expect(screen.getByRole("dialog")).toHaveTextContent("sha256:untranslated")
  expect(screen.getByRole("dialog")).toHaveTextContent("custom source label")
  expect(screen.getByRole("dialog")).toHaveTextContent("READY")
  expect(screen.getByRole("button", {name:"Fermer"})).toBeInTheDocument()
  expect(screen.getByRole("dialog")).toHaveAttribute("lang","fr")
  fireEvent.keyDown(screen.getByRole("dialog"), {key:"Escape",code:"Escape"})
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  expect(screen.getByRole("button", {name:"Consulter les preuves"})).toHaveFocus()
  expect(JSON.stringify(subject)).toBe(before)
})

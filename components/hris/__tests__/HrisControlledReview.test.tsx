import {render,screen,fireEvent,waitFor,within} from "@testing-library/react"
import "@testing-library/jest-dom"
import {HrisControlledReview} from "../HrisControlledReview"
import {getHrisApprovalReviewAction,decideHrisApprovalInboxItemAction} from "@/actions/hris/approval-inbox.actions"
import {getTimeApprovalReviewAction,decideReviewedTimeApprovalAction} from "@/actions/hris/time-review.actions"
import {reviewFixture,receiptFixture} from "./controlled-review.fixture"
import {stepUpWithPasswordAction} from "@/actions/security/step-up-auth.actions"
jest.mock("lucide-react",()=>({X:()=>null}))
jest.mock("@/actions/hris/approval-inbox.actions",()=>({getHrisApprovalReviewAction:jest.fn(),decideHrisApprovalInboxItemAction:jest.fn()}))
jest.mock("@/actions/hris/time-review.actions",()=>({getTimeApprovalReviewAction:jest.fn(),decideReviewedTimeApprovalAction:jest.fn()}))
const preview=getHrisApprovalReviewAction as jest.Mock,decide=decideHrisApprovalInboxItemAction as jest.Mock
beforeEach(()=>{jest.resetAllMocks();preview.mockResolvedValue({success:true,data:reviewFixture});decide.mockResolvedValue({success:true,data:receiptFixture})})
async function open(locale:"en"|"fr"="en",onComplete=jest.fn()){
 render(<HrisControlledReview locale={locale} label="Review synthetic request" target={{domain:"SALARY_CHANGE",decision:"APPROVE",sourceId:"salary-1",employeeId:"emp-1"}} onComplete={onComplete}/>);fireEvent.click(screen.getByRole("button",{name:"Review synthetic request"}));await screen.findByText("175000 XAF",{exact:false});return onComplete
}
function fill(locale:"en"|"fr"="en"){
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"Reviewed supporting evidence"}});fireEvent.click(screen.getByRole("checkbox",{name:locale==="fr"?"Preuve conservée de la demande":"Retained request evidence"}));fireEvent.click(screen.getByRole("checkbox",{name:locale==="fr"?/J’ai vérifié/:/I reviewed/}))
}
test.each(["FRESH_AUTH_REQUIRED","BUSINESS_RULE_VIOLATION"])("%s does not clear the parent workspace",async code=>{
 const denied=jest.fn();decide.mockResolvedValueOnce({success:false,code});render(<HrisControlledReview locale="en" label="Review" target={{domain:"SALARY_CHANGE",decision:"APPROVE",sourceId:"salary-1",employeeId:"emp-1"}} onAccessDenied={denied}/>);fireEvent.click(screen.getByRole("button",{name:"Review"}));await screen.findByText("175000 XAF",{exact:false});fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await waitFor(()=>expect(decide).toHaveBeenCalledTimes(1));expect(denied).not.toHaveBeenCalled();expect(screen.getByDisplayValue("Reviewed supporting evidence")).toBeInTheDocument();if(code==="FRESH_AUTH_REQUIRED")expect(await screen.findByLabelText("Password")).toHaveFocus()
})
test.each(["en","fr"] as const)("%s review has acknowledgement, server version and readable receipt",async locale=>{
 const complete=await open(locale);fill(locale);fireEvent.click(screen.getByRole("button",{name:locale==="fr"?"Confirmer la décision":"Confirm decision"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide).toHaveBeenCalledWith(expect.objectContaining({reviewVersion:reviewFixture.version,acknowledged:true,evidenceReferences:["REQUEST"]}));expect(decide.mock.calls[0][0]).not.toHaveProperty("approvalEvidenceHash");expect(complete).not.toHaveBeenCalled();expect(screen.getByRole("dialog")).toHaveTextContent(locale==="fr"?"Version du reçu":"Receipt version")
})
test("stale response preserves reason but requires fresh facts and acknowledgement",async()=>{
 decide.mockResolvedValue({success:false,code:"CONFLICT"});await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByRole("alert");expect(screen.getByRole("textbox")).toHaveValue("Reviewed supporting evidence");expect(screen.getByRole("button",{name:"Confirm decision"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Load current facts"}));await screen.findByRole("checkbox",{name:/I reviewed/});expect(screen.getByRole("checkbox",{name:/I reviewed/})).not.toBeChecked()
})
test("uncertain response freezes envelope and recovers exact saved receipt",async()=>{
 decide.mockRejectedValueOnce(Error("connection lost"));await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByRole("button",{name:"Recover decision receipt"});expect(screen.getByRole("textbox")).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Recover decision receipt"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide.mock.calls[0][0]).toEqual(decide.mock.calls[1][0])
})
test("structured internal failure retains the exact recovery envelope",async()=>{
 decide.mockResolvedValueOnce({success:false,code:"INTERNAL_ERROR"});await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByRole("button",{name:"Recover decision receipt"});expect(screen.getByRole("textbox")).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Recover decision receipt"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide.mock.calls[0][0]).toEqual(decide.mock.calls[1][0])
})
test.each(["LIFECYCLE","CONTRACT_ACTIVATION","CONTRACT_DOCUMENT","COMPENSATION_ASSIGNMENT","SALARY_CHANGE","PAYMENT_DESTINATION","TIME_POLICY","WORK_SCHEDULE","TIME_REQUEST"] as const)("%s displays actor scope timestamp and version receipt",async domain=>{
 const time=["TIME_POLICY","WORK_SCHEDULE","TIME_REQUEST"].includes(domain),read=time?getTimeApprovalReviewAction:preview,write=time?decideReviewedTimeApprovalAction:decide
 ;(read as jest.Mock).mockResolvedValue({success:true,data:{...reviewFixture,domain}});(write as jest.Mock).mockResolvedValue({success:true,data:{...receiptFixture,domain}})
 render(<HrisControlledReview locale="en" label="Review" target={{domain,decision:"APPROVE",sourceId:"salary-1",employeeId:"emp-1"}}/>);fireEvent.click(screen.getByRole("button",{name:"Review"}));await screen.findByText("175000 XAF",{exact:false});fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByText("Synthetic checker",{exact:false});const receipt=screen.getByRole("status");expect(receipt).toHaveTextContent("Scope");expect(receipt).toHaveTextContent("Receipt version 1");expect(receipt).toHaveTextContent("10/24/2026");expect(receipt).toHaveTextContent(reviewFixture.version)
})
test("denied preview discloses no values and returns focus to trigger",async()=>{
 preview.mockResolvedValue({success:false,error:"private internal detail"});render(<HrisControlledReview locale="en" label="Review request" target={{domain:"SALARY_CHANGE",decision:"APPROVE",sourceId:"salary-1",employeeId:"emp-1"}}/>);const trigger=screen.getByRole("button",{name:"Review request"});fireEvent.click(trigger);await screen.findByRole("alert");expect(document.body.textContent).not.toContain("private internal detail");fireEvent.click(screen.getByRole("button",{name:"Close"}));await waitFor(()=>expect(trigger).toHaveFocus())
})
test("time reviews retain separate action owner",async()=>{
 (getTimeApprovalReviewAction as jest.Mock).mockResolvedValue({success:true,data:{...reviewFixture,domain:"TIME_REQUEST"}});(decideReviewedTimeApprovalAction as jest.Mock).mockResolvedValue({success:true,data:{...receiptFixture,domain:"TIME_REQUEST"}})
 render(<HrisControlledReview locale="en" label="Review time" target={{domain:"TIME_REQUEST",decision:"APPROVE",sourceId:"salary-1",employeeId:"emp-1"}}/>);fireEvent.click(screen.getByRole("button",{name:"Review time"}));await screen.findByText("175000 XAF",{exact:false});fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide).not.toHaveBeenCalled();expect(decideReviewedTimeApprovalAction).toHaveBeenCalled()
})

test.each(["FORBIDDEN","AUTH_REQUIRED","TENANT_SCOPE_VIOLATION"])("%s after preview clears private facts and requires authorized reload",async code=>{
 decide.mockResolvedValueOnce({success:false,code});await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByText("Access is no longer authorized.",{exact:false});expect(screen.queryByText("175000 XAF",{exact:false})).toBeNull();expect(screen.getByRole("textbox")).toHaveValue("");expect(screen.getByRole("button",{name:"Confirm decision"})).toBeDisabled();expect(decide).toHaveBeenCalledTimes(1)
})

test("freshness recovery in a review preserves the decision and requires explicit retry",async()=>{
 decide.mockResolvedValueOnce({success:false,code:"FRESH_AUTH_REQUIRED"});(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({success:true});await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));const password=await screen.findByLabelText("Password");expect(password).toHaveFocus();fireEvent.change(password,{target:{value:"synthetic"}});fireEvent.click(screen.getByRole("button",{name:"Verify password"}));await waitFor(()=>expect(screen.queryByLabelText("Password")).toBeNull());expect(decide).toHaveBeenCalledTimes(1);expect(screen.getByText("175000 XAF",{exact:false})).toBeVisible();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide.mock.calls[0][0]).toEqual(decide.mock.calls[1][0])
})

test("authority loss during uncertain receipt recovery hides facts and retains the original retry envelope",async()=>{
 decide.mockRejectedValueOnce(Error("lost response")).mockResolvedValueOnce({success:false,code:"AUTH_REQUIRED"});await open();fill();fireEvent.click(screen.getByRole("button",{name:"Confirm decision"}));fireEvent.click(await screen.findByRole("button",{name:"Recover decision receipt"}));await screen.findByText("Access is no longer authorized.",{exact:false});expect(screen.queryByText("175000 XAF",{exact:false})).toBeNull();expect(screen.getByRole("textbox")).toHaveValue("");fireEvent.click(screen.getByRole("button",{name:"Recover decision receipt"}));await screen.findByText("Synthetic checker",{exact:false});expect(decide).toHaveBeenCalledTimes(3);expect(decide.mock.calls[2][0]).toEqual(decide.mock.calls[0][0])
})

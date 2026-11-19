const fs=require('fs');
let p='actions/hris/__tests__/approval-inbox.actions.test.ts',s=fs.readFileSync(p,'utf8');
s=s.replace('  decideHrisApprovalInboxItem,\n','').replace('import { revalidatePath }','import {decideReviewedHrisApproval,getHrisApprovalReview} from "@/services/hris/approval-review.service"\nimport {observeModuleAccess} from "@/services/modules/module-entitlement.service"\nimport { revalidatePath }');
s=s.replace('const mockDecide = decideHrisApprovalInboxItem as jest.Mock','jest.mock("@/services/hris/approval-review.service",()=>({decideReviewedHrisApproval:jest.fn(),getHrisApprovalReview:jest.fn()}))\nconst mockDecide = decideReviewedHrisApproval as jest.Mock').replace('logger: { error: jest.fn() }','logger: { error: jest.fn(),warn:jest.fn() }');
s=s.replace('claims: { lastAuthAt:', 'claims: {userId:"checker-1",tenantId:"org-1", lastAuthAt:').replace('    mockGetInbox.mockResolvedValue','    (observeModuleAccess as jest.Mock).mockResolvedValue({allowed:true});\n    mockGetInbox.mockResolvedValue');
s=s.replaceAll('approvalEvidenceHash: "sha256:approval",','reviewVersion:"a".repeat(64),acknowledged:true,evidenceReferences:["REQUEST"],').replaceAll('      idempotencyKey: "inbox-approve-salary-1",\n','');
fs.writeFileSync(p+'.hr14-candidate',s);
p='components/hris/__tests__/HrisApprovalInbox.test.tsx';s=fs.readFileSync(p,'utf8');
s=s.slice(0,s.indexOf('describe("HrisApprovalInboxView"'))+`describe("HrisApprovalInboxView controlled review entry",()=>{
 it("retains independent decision eligibility",()=>{render(<HrisApprovalInboxView inbox={inbox(false)} locale="en"/>);expect(screen.getByRole("button",{name:"Approve"})).toBeDisabled();expect(screen.getByRole("button",{name:"Reject"})).toBeDisabled()})
 it("routes eligible review without a hash-entry form",()=>{render(<HrisApprovalInboxView inbox={inbox(true)} locale="en"/>);expect(screen.getByRole("button",{name:"Approve"})).toBeEnabled();expect(screen.queryByLabelText("Approval evidence hash")).not.toBeInTheDocument()})
})\n`;
s=s.replace('  decideHrisApprovalInboxItemAction: jest.fn(),','  decideHrisApprovalInboxItemAction: jest.fn(),getHrisApprovalReviewAction:jest.fn(),');
s+='\njest.mock("@/actions/hris/time-review.actions",()=>({getTimeApprovalReviewAction:jest.fn(),decideReviewedTimeApprovalAction:jest.fn()}))\n';fs.writeFileSync(p+'.hr14-candidate',s);

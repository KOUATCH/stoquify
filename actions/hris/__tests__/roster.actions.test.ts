const context={orgId:"tenant",userId:"actor",permissions:["hris.people.manage"],freshAuth:{claims:{userId:"actor",tenantId:"tenant"}}},options:any[]=[]
jest.mock("next/cache",()=>({revalidatePath:jest.fn()}))
jest.mock("@/services/_shared/protect",()=>({protect:(config:any,handler:any)=>async(input:any)=>{options.push(config);return handler(input,context)}}))
jest.mock("@/services/hris/roster-workspace.service",()=>({getRosterWorkspace:jest.fn().mockResolvedValue({}),certifyRosterAttendance:jest.fn().mockResolvedValue({})}))
jest.mock("@/services/hris/schedule-revision.service",()=>({prepareHrisWorkSchedule:jest.fn().mockResolvedValue({}),approveHrisWorkSchedule:jest.fn().mockResolvedValue({})}))
jest.mock("@/services/hris/attendance-file.service",()=>({previewAttendanceFile:jest.fn().mockResolvedValue({}),commitAttendanceFile:jest.fn().mockResolvedValue({})}))
jest.mock("@/services/hris/attendance-import.service",()=>({resolveReviewedOperationalAnomaly:jest.fn().mockResolvedValue({})}))
import * as actions from "../roster.actions"
import {getRosterWorkspace,certifyRosterAttendance} from "@/services/hris/roster-workspace.service"
import {prepareHrisWorkSchedule,approveHrisWorkSchedule} from "@/services/hris/schedule-revision.service"
import {previewAttendanceFile,commitAttendanceFile} from "@/services/hris/attendance-file.service"
import {resolveReviewedOperationalAnomaly} from "@/services/hris/attendance-import.service"
import {revalidatePath} from "next/cache"
beforeEach(()=>{jest.clearAllMocks();options.length=0;context.freshAuth.claims={userId:"actor",tenantId:"tenant"}})
test.each([[actions.readRosterAction,getRosterWorkspace,"hris.people.read"],[actions.readOwnRosterAction,getRosterWorkspace,"hris.self_service.read"],[actions.prepareRosterAction,prepareHrisWorkSchedule,"hris.people.manage"],[actions.approveRosterAction,approveHrisWorkSchedule,"hris.people.manage"],[actions.previewAttendanceFileAction,previewAttendanceFile,"hris.people.manage"],[actions.commitAttendanceFileAction,commitAttendanceFile,"hris.people.manage"],[actions.resolveRosterAnomalyAction,resolveReviewedOperationalAnomaly,"hris.people.manage"],[actions.certifyRosterAttendanceAction,certifyRosterAttendance,"hris.people.manage"]] as const)("native boundary replaces forged identity and enforces fresh/module permission",async(action,owner,permission)=>{
  await action({organizationId:"foreign",actorId:"forged",actorPermissions:["*"],own:true});expect(owner).toHaveBeenCalledWith(expect.objectContaining({organizationId:"tenant",actorId:"actor",actorPermissions:context.permissions}));expect(options[0]).toMatchObject({permission,freshAuth:true,tenantGuard:"handler-derived",module:{mode:"enforce"}})
})
test("mismatched fresh claims fail before source effects",async()=>{context.freshAuth.claims.tenantId="foreign";await expect(actions.commitAttendanceFileAction({})).rejects.toThrow("Refresh");expect(commitAttendanceFile).not.toHaveBeenCalled()})
test("read endpoints bind own versus scoped mode",async()=>{await actions.readOwnRosterAction({own:false});expect(getRosterWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({own:true}));await actions.readRosterAction({own:true});expect(getRosterWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({own:false}))})

test("post-commit revalidation failure preserves the retained import result",async()=>{const receipt={id:"retained-import",acceptedCount:1};(commitAttendanceFile as jest.Mock).mockResolvedValueOnce(receipt);(revalidatePath as jest.Mock).mockImplementationOnce(()=>{throw Error("Cache unavailable")});await expect(actions.commitAttendanceFileAction({})).resolves.toBe(receipt);expect(commitAttendanceFile).toHaveBeenCalledTimes(1)})

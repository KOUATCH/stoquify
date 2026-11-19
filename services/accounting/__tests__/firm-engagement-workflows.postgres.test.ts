jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const path = require("node:path"), { PrismaClient } = require("@prisma/client")
  const target = process.env.AF05_POSTGRES_URL, cluster = process.env.AF05_CLUSTER_DIR
  if (process.env.NODE_ENV === "production" || !target || !cluster || !path.isAbsolute(cluster)) throw Error("Explicit disposable AF05 target and owned cluster directory required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || !url.port || !/^\/stoquify_local_af05_[a-z0-9_]+$/.test(url.pathname)) throw Error("Explicit loopback AF05 database required")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 15000 } }) }
})

import { db } from "@/prisma/db"
import { getFirmEngagementWorkspace } from "../firm-engagement-workspace.service"
import { executeFirmEngagementCommand } from "../firm-engagement.service"
import { resolveAccountantClientAccess } from "../accountant-access.service"
import { getAccountantHandoverSummary } from "../accountant-work-desk.service"

const id = `af05-sql-${Date.now()}`
const firm = id+"-firm", client = id+"-client", manager=id+"-manager", outgoing=id+"-outgoing", incoming=id+"-incoming"
const permissions = ["accounting.close.accountant.invite","accounting.audit.read","accounting.close.accountant.review","accounting.close.read"]
const start=new Date("2020-01-01"), end=new Date("2099-01-01")
let actor: {homeOrganizationId:string;actorId:string;session:{id:string;token:string}}, engagementId:string, assignmentId:string
const command=(payload:Record<string,unknown>)=>executeFirmEngagementCommand(actor,{...payload,idempotencyKey:id+"-"+Math.random()})
beforeAll(async()=>{
  const fs = require("node:fs")
  const actual = await db.$queryRawUnsafe<Array<{data_directory: string}>>("SHOW data_directory")
  if (fs.realpathSync(actual[0].data_directory).toLowerCase() !== fs.realpathSync(process.env.AF05_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned AF05 cluster")

  await db.organization.createMany({data:[firm,client].map(id=>({id,name:id,slug:id,requestedModules:["accounting","close_assurance"]}))})
  await db.role.create({data:{id:id+"-role",organizationId:firm,code:id,nameEn:"Synthetic",permissions}})
  for(const person of [manager,outgoing,incoming]){
    await db.user.create({data:{id:person,name:person,email:person+"@example.invalid",organizationId:firm,emailVerified:true,roles:{connect:{id:id+"-role"}}}})
    await db.accountantAccessGrant.create({data:{id:person+"-grant",organizationId:client,accountantUserId:person,accountantFirmName:"Synthetic",role:"REVIEWER",
      activeScopeKey:client+":"+person,consentGrantedById:"synthetic-owner",consentEvidenceHash:"sha256:"+"a".repeat(64),effectiveFrom:start,expiresAt:end}})
  }
  const s=await db.session.create({data:{userId:manager,token:id+"-session",expiresAt:end,assuranceVerifiedAt:new Date(),assuranceMethod:"password",assuranceOrganizationId:firm,assuranceLevel:1}})
  actor={homeOrganizationId:firm,actorId:manager,session:{id:s.id,token:s.token}}
  const e=await command({command:"CREATE",clientOrganizationId:client,ownerUserId:manager,scope:"REVIEWER",effectiveFrom:start,expiresAt:end});engagementId=e.engagementId
})
afterAll(async()=>{await db.$disconnect()})

it("excludes a manager mandate bearing a revoking actor even if its status and timestamp are inconsistent", async () => {
  await db.accountantAccessGrant.update({where:{id:manager+"-grant"},data:{revokedById:"synthetic-owner"}})
  try { expect((await getFirmEngagementWorkspace(actor,{})).clients).toEqual([]) }
  finally { await db.accountantAccessGrant.update({where:{id:manager+"-grant"},data:{revokedById:null}}) }
})
it("labels a staff mandate bearing only a revoking actor as revoked", async () => {
  await db.accountantAccessGrant.update({where:{id:outgoing+"-grant"},data:{revokedById:"synthetic-owner"}})
  try {
    const member=(await getFirmEngagementWorkspace(actor,{engagementId})).members.find(m=>m.id===outgoing)
    expect(member).toMatchObject({consentState:"REVOKED",state:"CLIENT_ACTION_REQUIRED",grant:null})
  } finally { await db.accountantAccessGrant.update({where:{id:outgoing+"-grant"},data:{revokedById:null}}) }
})
it("shows the active mandate expiry instead of a newer retained revoked mandate expiry", async () => {
  await db.accountantAccessGrant.create({data:{id:id+"-revoked-history",organizationId:client,accountantUserId:manager,
    accountantFirmName:"Synthetic retained history",role:"REVIEWER",status:"REVOKED",activeScopeKey:null,
    consentGrantedById:"synthetic-owner",consentEvidenceHash:"sha256:"+"b".repeat(64),effectiveFrom:start,
    expiresAt:new Date("2021-01-01"),revokedAt:new Date("2021-01-01"),revokedById:"synthetic-owner"}})
  const member=(await getFirmEngagementWorkspace(actor,{engagementId})).members.find(m=>m.id===manager)
  expect(member).toMatchObject({consentState:"ACTIVE",consentExpiresAt:end.toISOString()})
})

it("lists only owned engagements and rejects forged scope, guessed detail and stale session",async()=>{
  const view=await getFirmEngagementWorkspace(actor,{})
  expect(view.engagements.map(e=>e.id)).toEqual([engagementId])
  await expect(getFirmEngagementWorkspace(actor,{engagementId:"not-owned"})).rejects.toMatchObject({code:"FORBIDDEN"})
  await expect(getFirmEngagementWorkspace(actor,{homeOrganizationId:client})).rejects.toThrow()
  await expect(getFirmEngagementWorkspace({...actor,session:{id:"missing",token:"missing"}},{})).rejects.toThrow()
})
it("shows assignment, enrollment and current managed access as distinct states",async()=>{
  const assigned=await command({command:"ASSIGN",engagementId,expectedVersion:0,accountantUserId:outgoing,expectedAssignmentVersion:0,scope:"REVIEWER",effectiveFrom:start,expiresAt:end})
  assignmentId=assigned.assignmentId!
  let view=await getFirmEngagementWorkspace(actor,{engagementId})
  expect(view.members.find(m=>m.id===outgoing)?.state).toBe("ENROLLMENT_REQUIRED")
  await command({command:"ENROLL",engagementId,expectedVersion:0,grantId:outgoing+"-grant"})
  await expect(resolveAccountantClientAccess({homeOrganizationId:firm,clientOrganizationId:client,accountantUserId:outgoing,capability:"READ"})).rejects.toMatchObject({code:"FORBIDDEN"})
  await command({command:"TRANSITION",engagementId,expectedVersion:0,status:"ACTIVE",reason:"Synthetic activation"})
  view=await getFirmEngagementWorkspace(actor,{engagementId})
  expect(view.members.find(m=>m.id===outgoing)?.state).toBe("CURRENT_READ_ACCESS")
})
it("preserves an actual open evidence request and original owner across handover",async()=>{
  await db.fiscalYear.create({data:{id:id+"-year",organizationId:client,name:"2026",startDate:new Date("2026-01-01"),endDate:new Date("2026-12-31")}})
  await db.accountingPeriod.create({data:{id:id+"-period",organizationId:client,fiscalYearId:id+"-year",name:"October",periodNumber:10,startDate:new Date("2026-10-01"),endDate:new Date("2026-10-31")}})
  await db.closeRun.create({data:{id:id+"-run",organizationId:client,periodId:id+"-period"}})
  await db.closeAssuranceFinding.create({data:{id:id+"-finding",organizationId:client,periodId:id+"-period",closeRunId:id+"-run",domain:"DATA_TRUST",severity:"HIGH",title:"Synthetic request",detail:"Synthetic open obligation",sourceService:"AF05_FIXTURE",ownerId:"synthetic-owner"}})
  await db.accountantComment.create({data:{id:id+"-request",organizationId:client,periodId:id+"-period",closeRunId:id+"-run",findingId:id+"-finding",authorId:outgoing,
    body:"Synthetic outstanding evidence request",visibility:"CLIENT_ACTION_REQUIRED",correlationId:id+"-request-key",
    metadata:{requestType:"MISSING_CLOSE_EVIDENCE",requestedById:outgoing,requestedFromId:"synthetic-owner",dueAt:"2027-01-01T00:00:00Z",correlationId:id+"-request-key"}}})
  const workActor={homeOrganizationId:firm,actorId:manager,actorPermissions:permissions}
  expect(await getAccountantHandoverSummary(workActor,client)).toMatchObject({awaitingClient:1,awaitingReviewTeam:0})
  const before=await db.accountantComment.findUniqueOrThrow({where:{id:id+"-request"}})
  await command({command:"HANDOVER",engagementId,expectedVersion:1,assignmentId,expectedAssignmentVersion:1,accountantUserId:incoming,
    expectedNewAssignmentVersion:0,scope:"REVIEWER",effectiveFrom:start,expiresAt:end,reason:"Synthetic controlled handover"})
  expect(await db.accountantComment.findUniqueOrThrow({where:{id:id+"-request"}})).toEqual(before)
  expect((await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:id+"-finding"}})).ownerId).toBe("synthetic-owner")
  await expect(resolveAccountantClientAccess({homeOrganizationId:firm,clientOrganizationId:client,accountantUserId:outgoing,capability:"READ"})).rejects.toMatchObject({code:"FORBIDDEN"})
  expect(await db.firmEngagementGrantLink.count({where:{engagementId,accountantUserId:incoming}})).toBe(0)
  await command({command:"ENROLL",engagementId,expectedVersion:1,grantId:incoming+"-grant"})
  expect(await getAccountantHandoverSummary({...workActor,actorId:incoming},client)).toMatchObject({awaitingClient:1,awaitingReviewTeam:0})
})
it("shows expired consent and denies its work summary without losing history",async()=>{
  await db.accountantAccessGrant.update({where:{id:incoming+"-grant"},data:{expiresAt:new Date("2021-01-01")}})
  const view=await getFirmEngagementWorkspace(actor,{engagementId})
  expect(view.members.find(m=>m.id===incoming)).toMatchObject({consentState:"EXPIRED",state:"CLIENT_ACTION_REQUIRED"})
  expect(view.selected!.endedAssignments).toHaveLength(1)
  await expect(getAccountantHandoverSummary({homeOrganizationId:firm,actorId:incoming,actorPermissions:permissions},client)).rejects.toMatchObject({code:"FORBIDDEN"})
})
it("rejects a foreign member and exposes retained metadata after ending",async()=>{
  await expect(command({command:"ASSIGN",engagementId,expectedVersion:1,accountantUserId:"af05-owner",expectedAssignmentVersion:0,scope:"REVIEWER",effectiveFrom:start,expiresAt:end})).rejects.toMatchObject({code:"FORBIDDEN"})
  await command({command:"TRANSITION",engagementId,expectedVersion:1,status:"ENDED",reason:"Synthetic end retains history"})
  expect((await getFirmEngagementWorkspace(actor,{engagementId})).selected).toMatchObject({status:"ENDED",version:2})
})

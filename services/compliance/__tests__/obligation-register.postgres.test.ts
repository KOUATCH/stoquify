jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target=process.env.AF11_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF11_CLUSTER_DIR) throw Error("Explicit synthetic target required")
  const u=new URL(target)
  if(u.hostname!=="127.0.0.1" || u.port!=="55449" || u.pathname!=="/stoquify_local_af11_20261020_r1") throw Error("Wrong target")
  return { db: new PrismaClient({datasources:{db:{url:target}}}) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { db } from "@/prisma/db"
import { getObligationRegister, recordObligationRevision } from "../obligation-register.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import { executeFirmEngagementCommand } from "@/services/accounting/firm-engagement.service"
const prefix=`af11-${Date.now()}`
const out="docs/accounting-firms/roadmap-2026-10-19/execution/AF11/2026-10-20-run-01"
const permissions=["accounting.audit.read","accounting.close.read","accounting.close.accountant.invite","accounting.close.accountant.review","accounting.close.finding.comment","payroll.reports.read"]
beforeAll(async()=>{const rows=await db.$queryRawUnsafe<Array<{data_directory:string}>>("SHOW data_directory");if(realpathSync(rows[0].data_directory).toLowerCase()!==realpathSync(process.env.AF11_CLUSTER_DIR!).toLowerCase())throw Error("Wrong cluster")})
afterAll(async()=>db.$disconnect())
async function fixture(name: string) {
  const client = `${prefix}-${name}-client`, firm = `${prefix}-${name}-firm`
  for (const id of [client, firm]) await db.organization.create({ data: { id, slug: id, name: "Synthetic " + name, currency: "XAF", countryCode: "CM", requestedModules: ["accounting", "close_assurance", "inventory", "purchasing", "sales", "payroll"] } })
  const actors: Record<string, WorkpaperActor> = {}
  for (const who of ["preparer", "reviewer", "owner"]) {
    const home = who === "owner" ? client : firm, id = `${prefix}-${name}-${who}`
    await db.role.create({ data: { id: id + "-role", organizationId: home, code: who, nameEn: who, permissions } })
    await db.user.create({ data: { id, organizationId: home, email: id + "@example.invalid", name: who, emailVerified: true, roles: { connect: { id: id + "-role" } } } })
    const session = await db.session.create({ data: { userId: id, token: id + "-private-token", expiresAt: new Date("2099-01-01"),
      assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: home, assuranceLevel: 1 } })
    actors[who] = { homeOrganizationId: home, actorId: id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  }
  for (const who of ["preparer", "reviewer"]) await db.accountantAccessGrant.create({ data: {
    id: actors[who].actorId + "-grant", organizationId: client, accountantUserId: actors[who].actorId, accountantFirmName: "Synthetic",
    role: "REVIEWER", activeScopeKey: `${client}:${actors[who].actorId}`, consentGrantedById: actors.owner.actorId,
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(actors.preparer, { ...input, idempotencyKey: `${name}-${Math.random()}` })
  const engagement = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  for (const who of ["preparer", "reviewer"]) {
    await command({ command: "ASSIGN", engagementId: engagement.engagementId, expectedVersion: 0, accountantUserId: actors[who].actorId,
      expectedAssignmentVersion: 0, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
    await command({ command: "ENROLL", engagementId: engagement.engagementId, expectedVersion: 0, grantId: actors[who].actorId + "-grant" })
  }
  await command({ command: "TRANSITION", engagementId: engagement.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic AF11 activation" })
  const year=await db.fiscalYear.create({data:{organizationId:client,name:"2026",startDate:new Date("2026-01-01"),endDate:new Date("2026-12-31")}})
  const period=await db.accountingPeriod.create({data:{organizationId:client,fiscalYearId:year.id,periodNumber:9,name:"Synthetic September",startDate:new Date("2026-09-01"),endDate:new Date("2026-09-30T23:59:59.999Z")}})
  const run=await db.closeRun.create({data:{organizationId:client,periodId:period.id,status:"BLOCKED",completedAt:new Date()}})
  // Retained synthetic draft export only. AF11 never creates or certifies a Close pack.
  const pack=await db.closePackExport.create({data:{organizationId:client,periodId:period.id,closeRunId:run.id,watermarkId:"SYNTHETIC NOT CERTIFIED",contentHash:"sha256:"+"b".repeat(64),isCertified:false}})
  return {client,firm,actors,period,run,pack,engagementId:engagement.engagementId,scope:{clientOrganizationId:client}}
}
async function prepare(f: Awaited<ReturnType<typeof fixture>>, patch:Record<string,unknown>={}) {
  const register=await getObligationRegister(f.actors.preparer,f.scope)
  const input={...f.scope,command:"SAVE",expectedVersion:0,code:"CLOSE_EVIDENCE_COLLECTION",periodId:f.period.id,applicability:"APPLICABLE",dueAt:"2026-09-30T23:59:59.000Z",claimOwnership:false,evidenceId:f.pack.id,reason:"Synthetic operational collection preparation",expectedSourceHash:register.sources[0].sourceHash,idempotencyKey:"prepare-command",...patch}
  const saved=await recordObligationRevision(f.actors.preparer,input)
  return {...input,...saved}
}
function review(p:Awaited<ReturnType<typeof prepare>>, patch:Record<string,unknown>={}) {const {version,replayed,...input}=p;return {...input,command:"REVIEW",expectedVersion:version,reason:"Independent synthetic artifact collection review",idempotencyKey:"review-command",...patch}}

it("records independent evidence review without modifying domain status or financial records", async()=>{
  const f=await fixture("review"),p=await prepare(f)
  expect((await getObligationRegister(f.actors.reviewer,f.scope)).items[0].status).toBe("OVERDUE")
  await recordObligationRevision(f.actors.reviewer,review(p))
  const result=await getObligationRegister(f.actors.preparer,f.scope)
  expect(result.items[0]).toMatchObject({status:"FULFILLED_WITH_EVIDENCE",liveFilingAccepted:false,version:2})
  expect(result.items[0].history).toHaveLength(2)
  expect((await db.closeRun.findUniqueOrThrow({where:{id:f.run.id}})).status).toBe("BLOCKED")
  expect(await db.journalEntry.count({where:{organizationId:f.client}})).toBe(0)
  writeFileSync(`${out}/retained-register.json`,JSON.stringify(result,null,2))
})
it("retains unknown and not-applicable separately and records deadline reasons",async()=>{
  const f=await fixture("states"),p=await prepare(f,{applicability:"UNKNOWN",evidenceId:null})
  expect((await getObligationRegister(f.actors.preparer,f.scope)).items[0].status).toBe("UNKNOWN")
  const {version,replayed,...input}=p
  await recordObligationRevision(f.actors.preparer,{...input,expectedVersion:version,applicability:"NOT_APPLICABLE",dueAt:null,reason:"Client does not require this operational collection",idempotencyKey:"not-applicable"})
  const row=(await getObligationRegister(f.actors.preparer,f.scope)).items[0]
  expect(row.status).toBe("NOT_APPLICABLE");expect(row.history[1].dueAt).toBe(p.dueAt)
})
it("replays an exact concurrent command once and rejects changed reuse",async()=>{
  const f=await fixture("replay"),reg=await getObligationRegister(f.actors.preparer,f.scope)
  const input={...f.scope,command:"SAVE",code:"CLOSE_EVIDENCE_COLLECTION",periodId:f.period.id,expectedVersion:0,applicability:"UNKNOWN",dueAt:null,evidenceId:null,reason:"Synthetic replay operation",idempotencyKey:"concurrent-command",expectedSourceHash:reg.sources[0].sourceHash}
  const results=await Promise.all([recordObligationRevision(f.actors.preparer,input),recordObligationRevision(f.actors.preparer,input)])
  expect(results.map(r=>r.replayed).sort()).toEqual([false,true]);expect(new Set(results.map(r=>r.instanceId)).size).toBe(1)
  await expect(recordObligationRevision(f.actors.preparer,{...input,reason:"Changed payload must not replay"})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"})
})
it("serializes competing version edits and rejects a duplicate obligation",async()=>{
  const f=await fixture("race"),p=await prepare(f),{version,replayed,...input}=p
  const result=await Promise.allSettled(["first","second"].map(key=>recordObligationRevision(f.actors.preparer,{...input,expectedVersion:version,idempotencyKey:key+"-command",reason:key+" operational date correction"})))
  expect(result.filter(r=>r.status==="fulfilled")).toHaveLength(1)
  await expect(prepare(f,{idempotencyKey:"duplicate-new"})).rejects.toMatchObject({code:"CONFLICT"})
})
it("rejects maker self-review, modified review terms and missing evidence",async()=>{
  const f=await fixture("sod"),p=await prepare(f)
  await expect(recordObligationRevision(f.actors.preparer,review(p))).rejects.toMatchObject({code:"SOD_VIOLATION"})
  await expect(recordObligationRevision(f.actors.reviewer,review(p,{dueAt:null}))).rejects.toMatchObject({code:"CONFLICT"})
  const g=await fixture("missing"),q=await prepare(g,{evidenceId:null})
  await expect(recordObligationRevision(g.actors.reviewer,review(q))).rejects.toMatchObject({code:"BUSINESS_RULE_VIOLATION"})
})
it("country/source change invalidates review and preserves prior applicability history",async()=>{
  const f=await fixture("source"),p=await prepare(f)
  await db.organization.update({where:{id:f.client},data:{countryCode:"XX"}})
  const changed=await getObligationRegister(f.actors.reviewer,f.scope)
  expect(changed.items[0]).toMatchObject({sourceChanged:true,status:"UNKNOWN"})
  await expect(recordObligationRevision(f.actors.reviewer,review(p))).rejects.toMatchObject({code:"CONFLICT"})
  const {version,replayed,...input}=p
  await recordObligationRevision(f.actors.preparer,{...input,expectedVersion:version,expectedSourceHash:changed.sources[0].sourceHash,idempotencyKey:"refresh-source",reason:"Reassessed source following country correction"})
  expect((await getObligationRegister(f.actors.preparer,f.scope)).items[0].history).toHaveLength(2)
})
it("changed or voided domain evidence removes fulfilled state",async()=>{
  const f=await fixture("evidence"),p=await prepare(f)
  await recordObligationRevision(f.actors.reviewer,review(p))
  await db.closeRun.update({where:{id:f.run.id},data:{voidedAt:new Date()}})
  const row=(await getObligationRegister(f.actors.reviewer,f.scope)).items[0]
  expect(row.status).toBe("OVERDUE");expect(row.evidenceChanged).toBe(true);expect(row.history).toHaveLength(2)
})
it("retains SQL history and refuses cross-client periods/evidence",async()=>{
  const f=await fixture("tenant"),g=await fixture("foreign"),p=await prepare(f)
  await expect(prepare(g,{evidenceId:f.pack.id})).rejects.toMatchObject({code:"NOT_FOUND"})
  await expect(prepare(g,{periodId:f.period.id})).rejects.toMatchObject({code:"NOT_FOUND"})
  const stored=await db.firmObligationRevision.findFirstOrThrow({where:{instanceId:p.instanceId}})
  await expect(db.firmObligationRevision.update({where:{id:stored.id},data:{reason:"Attempted retained history rewrite"}})).rejects.toThrow()
  await expect(db.firmObligationRevision.delete({where:{id:stored.id}})).rejects.toThrow()
})
it("enforces fresh authentication, live roles, enrollment and session authority",async()=>{
  const f=await fixture("authority"),p=await prepare(f)
  await db.session.update({where:{id:f.actors.reviewer.session.id},data:{assuranceVerifiedAt:new Date(Date.now()-301000)}})
  await expect(recordObligationRevision(f.actors.reviewer,review(p))).rejects.toMatchObject({code:"FRESH_AUTH_REQUIRED"})
  await db.role.update({where:{id:f.actors.reviewer.actorId+"-role"},data:{permissions:[]}})
  await expect(getObligationRegister(f.actors.reviewer,f.scope)).rejects.toMatchObject({code:"FORBIDDEN"})
  await executeFirmEngagementCommand(f.actors.preparer,{command:"TRANSITION",engagementId:f.engagementId,expectedVersion:1,status:"SUSPENDED",reason:"Synthetic suspension denial",idempotencyKey:"suspend-command"})
  await expect(getObligationRegister(f.actors.preparer,f.scope)).rejects.toMatchObject({code:"FORBIDDEN"})
})
it("does not expose payroll details through a firm mandate or caller permission claims",async()=>{
  const f=await fixture("payrolldenied")
  await expect(getObligationRegister(f.actors.preparer,{...f.scope,includePayroll:true})).rejects.toMatchObject({code:"FORBIDDEN"})
  await db.role.update({where:{id:f.actors.owner.actorId+"-role"},data:{permissions:permissions.filter(p=>p!=="payroll.reports.read")}})
  await expect(getObligationRegister(f.actors.owner,{...f.scope,includePayroll:true})).rejects.toMatchObject({code:"FORBIDDEN"})
})
it("manual/sandbox payroll receipts stay unverified and redacted from firm reads",async()=>{
  const f=await fixture("payroll")
  const pp=await db.payrollPeriod.create({data:{organizationId:f.client,name:"Synthetic payroll",periodStart:f.period.startDate,periodEnd:f.period.endDate,payDate:f.period.endDate,countryCode:"CM"}})
  const pr=await db.payrollRun.create({data:{organizationId:f.client,payrollPeriodId:pp.id,runNumber:"SYNTHETIC",countryCode:"CM",countryPackVersion:"CM-2026.1",countryPackSchemaVersion:"v1",countryPackResolutionHash:"fixture",countryPackCapabilityStatus:"SUPPORTED_DRAFT",ruleSetHash:"fixture",calculationHash:"fixture",attendanceSnapshotHash:"fixture"}})
  const declaration=await db.payrollDeclaration.create({data:{organizationId:f.client,payrollRunId:pr.id,authority:"CNPS",declarationType:"CNPS",periodStart:f.period.startDate,periodEnd:f.period.endDate,countryCode:"CM",countryPackVersion:"CM-2026.1",countryPackSchemaVersion:"v1",countryPackResolutionHash:"fixture"}})
  const receipt=await db.payrollDeclarationEvidence.create({data:{organizationId:f.client,declarationId:declaration.id,transition:"SUBMIT",previousStatus:"PREPARED",nextStatus:"SUBMITTED",authority:"CNPS",declarationType:"CNPS",authorityChannel:"MANUAL_PORTAL",authorityEnvironment:"MANUAL_PORTAL",authorityStatus:"SUBMITTED",evidenceCapturedById:f.actors.owner.actorId,evidenceHash:"synthetic-private-evidence-hash",countryPackResolutionHash:"fixture",idempotencyKey:"synthetic-receipt",notes:"private employee detail must not escape"}})
  const reg=await getObligationRegister(f.actors.owner,{...f.scope,includePayroll:true})
  await recordObligationRevision(f.actors.owner,{...f.scope,command:"SAVE",code:"CM_CNPS_EVIDENCE",periodId:f.period.id,expectedVersion:0,applicability:"APPLICABLE",dueAt:null,evidenceId:receipt.id,reason:"Restricted payroll evidence retained",expectedSourceHash:reg.sources[2].sourceHash,idempotencyKey:"payroll-command"})
  const local=await getObligationRegister(f.actors.owner,{...f.scope,includePayroll:true})
  expect(local.items[0]).toMatchObject({status:"UNKNOWN",evidenceClass:"MANUAL_SUBMISSION",liveFilingAccepted:false})
  for (const [environment, classification] of [["MANUAL_PORTAL","MANUAL_ACKNOWLEDGEMENT"],["SANDBOX","SANDBOX"],["PRODUCTION","UNVERIFIED_AUTHORITY"]]) {
    const next=await db.payrollDeclarationEvidence.create({data:{organizationId:f.client,declarationId:declaration.id,transition:"ACCEPT",previousStatus:"SUBMITTED",nextStatus:"ACCEPTED",authority:"CNPS",declarationType:"CNPS",authorityChannel:"SYNTHETIC",authorityEnvironment:environment,authorityStatus:"ACCEPTED",evidenceCapturedById:f.actors.owner.actorId,evidenceHash:"synthetic-"+environment,countryPackResolutionHash:"fixture",productionSubmissionSupported:true,idempotencyKey:"receipt-"+environment}})
    const current=(await getObligationRegister(f.actors.owner,{...f.scope,includePayroll:true})).items[0]
    await recordObligationRevision(f.actors.owner,{...f.scope,command:"SAVE",instanceId:current.instanceId,expectedVersion:current.version,code:current.code,periodId:f.period.id,applicability:"APPLICABLE",dueAt:null,evidenceId:next.id,reason:"Retain synthetic environment classification",expectedSourceHash:current.source.sourceHash,idempotencyKey:"evidence-"+environment})
    expect((await getObligationRegister(f.actors.owner,{...f.scope,includePayroll:true})).items[0]).toMatchObject({status:"UNKNOWN",evidenceClass:classification,liveFilingAccepted:false})
  }
  const delegated=await getObligationRegister(f.actors.preparer,f.scope)
  expect(delegated.items[0]).toMatchObject({payrollRedacted:true,evidenceId:null,history:[]})
  expect(JSON.stringify(delegated)).not.toContain(receipt.id);expect(JSON.stringify(local)).not.toContain("private employee detail")
})
it("retains an empty browser client for the real protected-action journey",async()=>{
  const f=await fixture("browser")
  if(process.env.AF11_KEEP_BROWSER_FIXTURE!=="1") writeFileSync(`${out}/browser-fixture.json`,JSON.stringify({client:f.client,firm:f.firm,periodId:f.period.id,packId:f.pack.id,engagementId:f.engagementId,actors:Object.fromEntries(Object.entries(f.actors).map(([key,actor])=>[key,actor.actorId]))},null,2))
  expect((await getObligationRegister(f.actors.preparer,f.scope)).items).toHaveLength(0)
})

it("a permission revocation holding the role lock wins before a waiting register read",async()=>{
  const f=await fixture("revocation")
  let unlock:()=>void=()=>{},announce:()=>void=()=>{}
  const held=new Promise<void>(r=>{announce=r}),release=new Promise<void>(r=>{unlock=r})
  const writer=db.$transaction(async tx=>{await tx.role.update({where:{id:f.actors.preparer.actorId+"-role"},data:{permissions:[]}});announce();await release},{timeout:15000})
  await held
  let settled=false
  const waiting=getObligationRegister(f.actors.preparer,f.scope).finally(()=>{settled=true})
  const denied=expect(waiting).rejects.toMatchObject({code:"FORBIDDEN"})
  await new Promise(r=>setTimeout(r,100));expect(settled).toBe(false);unlock();await writer;await denied
})

it("failure while recording the audit rolls back the revision and exact retry succeeds",async()=>{
  const f=await fixture("rollback")
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af11_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId"='${f.client}' AND NEW."entityType"='FirmObligation' THEN RAISE EXCEPTION 'Synthetic AF11 audit failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe('CREATE TRIGGER af11_test_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af11_test_audit_failure()')
  try {
    await expect(prepare(f)).rejects.toThrow()
    expect(await db.firmObligationRevision.count({where:{organizationId:f.client}})).toBe(0)
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER af11_test_audit_failure ON audit_logs')
    await db.$executeRawUnsafe('DROP FUNCTION af11_test_audit_failure()')
  }
  expect((await prepare(f)).version).toBe(1)
})

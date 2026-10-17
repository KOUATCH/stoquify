const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),capture=JSON.parse(fs.readFileSync(path.join(__dirname,'close-authority-before-28ee45e0-6457-402a-a934-c81d2f568582.json'))),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function once(text,from,to){assert.equal(text.split(from).length-1,1,'Expected exact one anchor: '+from.slice(0,100));return text.replace(from,to);}
function change(file,edit){const full=path.join(root,file),bytes=fs.readFileSync(full);assert.equal(sha(bytes),capture.files[file].sha256,file+' changed since captured baseline');const newline=bytes.includes(Buffer.from('\r\n'))?'\r\n':'\n';let text=bytes.toString().replaceAll('\r\n','\n');text=edit(text);const out=Buffer.from(text.replaceAll('\n',newline)),temp=full+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,out,{flag:'wx'});fs.renameSync(temp,full);assert.equal(sha(fs.readFileSync(full)),sha(out));console.log(JSON.stringify({file,sha256:sha(out)}));}
change('services/accounting/close-assurance.service.ts',text=>{
 text=once(text,'import { closeEvidenceReplacementSelection, getCloseEvidenceReplacementInTx, parseCloseEvidenceReplacementBinding } from "./close-evidence-replacement.service"','import { closeEvidenceReplacementSelection, getCloseEvidenceReplacementInTx, parseCloseEvidenceReplacementBinding } from "./close-evidence-replacement.service"\nimport { lockCloseEvidenceAcceptanceAuthorityInTx } from "./close-evidence-acceptance-authority.service"');
 text=once(text,'type MissingCloseEvidenceAcceptanceControlContext = Omit<\n  CloseControlContext,\n  "now"\n> & {\n  freshAuth?: CloseFreshAuthControl | null\n}', 'type MissingCloseEvidenceAcceptanceControlContext = Omit<\n  CloseControlContext,\n  "now"\n> & {\n  freshAuth?: CloseFreshAuthControl | null\n  session?: { id: string; token: string } | null\n  requireWorkDeskAccess?: boolean\n}');
 const begin=text.indexOf('export async function acceptMissingCloseEvidenceResponse('),end=text.indexOf('export async function requestCloseWaiver(',begin);assert.ok(begin>0&&end>begin);let body=text.slice(begin,end);
 const start=body.indexOf('    const activeActor = await tx.user.findFirst({'),finish=body.indexOf('    const organizationId = access.organizationId',start)+'    const organizationId = access.organizationId'.length;assert.ok(start>0&&finish>start);
 body=body.slice(0,start)+`    const organizationId = clientOrganizationId ?? homeOrganizationId
    const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, {
      homeOrganizationId,
      organizationId,
      actorId,
      session: control.session ?? { id: "", token: "" },
      requireWorkDeskAccess: control.requireWorkDeskAccess === true,
    })`+body.slice(finish);
 body=once(body,`      const member = await tx.user.findFirst({ where: { id: actorId, organizationId: homeOrganizationId, isActive: true }, select: { id: true } })
      if (!member) throw new ForbiddenError("Missing-proof response acceptance requires an active home-tenant accountant.")
      const currentAccess = await resolveAccountantClientAccess({ homeOrganizationId, clientOrganizationId, accountantUserId: actorId, capability: "REVIEW", now: at, client: tx })
      if (currentAccess.organizationId !== organizationId) throw new ForbiddenError("Client review access changed.")`, '      await authority.revalidate(at)');
 body=once(body,'    requireFreshMissingEvidenceAcceptanceControl(homeOrganizationId, control, new Date())\n    const acceptedAt = await readCloseAssessmentPublicationTimeInTx(tx)', '    // Finish any finding-row wait before the final authority/freshness decision.\n    const lockedFinding = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "close_assurance_findings" WHERE "id" = ${finding.id} AND "organizationId" = ${organizationId} FOR UPDATE`)\n    if (lockedFinding.length !== 1) throw new ConflictError("The missing-proof finding changed before acceptance completed.")\n    const acceptedAt = await readCloseAssessmentPublicationTimeInTx(tx)');
 return text.slice(0,begin)+body+text.slice(end);
});
change('actions/accounting/close-assurance.actions.ts',text=>{
 text=once(text,'import { protect, type ProtectedActionContext } from "@/services/_shared/protect"','import { protect, type ProtectedActionContext } from "@/services/_shared/protect"\nimport { closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"');
 const begin=text.indexOf('const acceptMissingEvidenceResponse = protect<'),end=text.indexOf('export async function acceptMissingCloseEvidenceResponseAction',begin);let body=text.slice(begin,end);assert.ok(begin>0&&end>begin);
 body=once(body,'    const lastAuthAt = verifiedCloseFreshAuthTime(ctx)','    const control = closeEvidenceAcceptanceControl(ctx)');
 body=once(body,`    const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      freshAuth: {
        actorId: ctx.userId,
        organizationId: ctx.orgId,
        lastAuthAt,
      },
    })`,'    const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, control)');
 return text.slice(0,begin)+body+text.slice(end);
});
change('actions/accounting/accountant-work-desk.actions.ts',text=>{
 text=once(text,'import { z } from "zod"','import { z } from "zod"\nimport { revalidatePath } from "next/cache"');
 text=once(text,'import { acceptMissingCloseEvidenceResponseAction } from "./close-assurance.actions"','import { acceptMissingCloseEvidenceResponse } from "@/services/accounting/close-assurance.service"\nimport { closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"');
 text=once(text,`const acceptancePreflight = protect(options, async (input: unknown, ctx) => {
  const parsed = acceptMissingCloseEvidenceResponseInputSchema.extend({ clientOrganizationId: identifier }).strict().parse(input)
  await assertAccountantWorkClient({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientOrganizationId, "write")
  return parsed
})`, `const accept = protect({ ...options, freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  const control = closeEvidenceAcceptanceControl(ctx, true)
  const parsed = acceptMissingCloseEvidenceResponseInputSchema.extend({ clientOrganizationId: identifier }).strict().parse(input)
  await assertAccountantWorkClient({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientOrganizationId, "write")
  const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, control)
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/close", "page")
  revalidatePath("/dashboard/accounting/close/" + result.periodId, "page")
  revalidatePath("/dashboard/accounting/accountant-portfolio", "page")
  return result
})`);
 text=once(text,`export async function acceptAccountantWorkItemAction(input: unknown) {
  const preflight = await acceptancePreflight(input)
  if (!preflight.success) return preflight
  // The existing action rechecks session, fresh authentication, grant, replay and domain controls.
  return acceptMissingCloseEvidenceResponseAction(preflight.data)
}`, 'export async function acceptAccountantWorkItemAction(input: unknown) { return accept(input) }');return text;
});

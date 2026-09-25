const fs=require('fs'),crypto=require('crypto'),ts=require('typescript'),path=require('path'),file='services/purchase-order/supplier-po-acknowledgement.service.ts';let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('export async function revokeSupplierPoInvite(');if(start<0||s.includes('const revocationKey ='))throw Error('Unexpected service revision');
const replacement=String.raw`export async function revokeSupplierPoInvite(
  input: RevokeSupplierPoInviteInput & { organizationId: string; revokedById: string; sessionId: string }, client: typeof db = db,
) {
  const { organizationId, revokedById, sessionId, ...command } = input
  const parsed = revokeSupplierPoInviteInputSchema.parse(command)
  const scope = supplierPoBuyerScopeSchema.parse({ organizationId, actorId: revokedById, sessionId })
  const requestHash = hashBusinessPayload({ organizationId, actorId: revokedById, ...parsed })
  const revocationKey = "supplier-po-revoke:" + parsed.idempotencyKey
  return client.$transaction(async tx => {
    const actor = await supplierPoBuyerAuthority(tx, scope, true)
    const existing = await tx.supplierPoAccessToken.findFirst({ where: { id: parsed.tokenId, organizationId, envelope: { organizationId, purchaseOrderId: parsed.purchaseOrderId } } })
    if (!existing) throw new NotFoundError("Supplier PO invitation not found")
    const previous = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId, eventSource: "INTERNAL", idempotencyKey: revocationKey } } })
    if (previous) {
      if (previous.payloadHash !== requestHash || previous.status !== "APPLIED" || previous.eventType !== "supplier.po.invite.revoked" || previous.sourceId !== existing.id || existing.status !== "REVOKED" || existing.revokedById !== actor.id || existing.revocationReason !== parsed.reason) throw new IdempotencyConflictError()
      return { tokenId: existing.id, purchaseOrderId: parsed.purchaseOrderId, status: existing.status, requestReference: parsed.idempotencyKey, correlationReference: parsed.correlationId, replayed: true }
    }
    if (existing.status !== "ACTIVE") throw new ConflictError("This invitation was already disabled by another request")
    const now = new Date()
    const claimed = await tx.supplierPoAccessToken.updateMany({ where: { id: existing.id, organizationId, status: "ACTIVE", revokedAt: null }, data: { status: "REVOKED", revokedById: actor.id, revokedAt: now, revocationReason: parsed.reason } })
    if (claimed.count !== 1) throw new ConflictError("The invitation changed. Refresh its current record.")
    const event = await recordBusinessEventInTx(tx, { organizationId, eventType: "supplier.po.invite.revoked", eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: revocationKey,
      payload: { organizationId, actorId: revokedById, ...parsed }, occurredAt: now, actorId: actor.id, sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT", sourceId: existing.id, documentHash: existing.envelopeContentHash, outboxMessages: [] })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.auditLog.create({ data: { organizationId, entityType: "SupplierPoAccessToken", entityId: existing.id, action: "SUPPLIER_PO_INVITE_REVOKED", userId: actor.id,
      changes: asJson({ after: { purchaseOrderId: parsed.purchaseOrderId, envelopeId: existing.envelopeId, status: "REVOKED", revokedAt: now.toISOString(), reasonHash: hashBusinessPayload(parsed.reason), requestReference: parsed.idempotencyKey, eventId: event.event.id, tokenHashPrefix: existing.tokenHash.slice(0, 12) } }) } })
    return { tokenId: existing.id, purchaseOrderId: parsed.purchaseOrderId, status: "REVOKED" as const, requestReference: parsed.idempotencyKey, correlationReference: parsed.correlationId, replayed: false }
  }, { isolationLevel: SERIALIZABLE })
}

export async function getSupplierPoAcknowledgementWorkbench(
  input: SupplierPoWorkbenchInput & { organizationId: string; actorId: string }, client: typeof db = db,
) {
  const { organizationId, actorId, ...raw } = input
  const command = supplierPoWorkbenchInputSchema.parse(raw), scope = supplierPoBuyerScopeSchema.parse({ organizationId, actorId })
  return client.$transaction(async tx => {
    const authority = await supplierPoBuyerAuthority(tx, scope, false)
    const order = await loadBuyerOrderInTx(tx, { organizationId, purchaseOrderId: command.purchaseOrderId })
    const purchaseOrder = order.purchaseOrder, now = new Date()
    const where = { organizationId, purchaseOrderId: purchaseOrder.id }
    const anchor = command.beforeEnvelopeId ? await tx.supplierPoEnvelope.findFirst({ where: { ...where, id: command.beforeEnvelopeId }, select: { id: true, createdAt: true } }) : null
    if (command.beforeEnvelopeId && !anchor) throw new NotFoundError("Envelope history cursor not found")
    if (command.envelopeId && !await tx.supplierPoEnvelope.findFirst({ where: { ...where, id: command.envelopeId }, select: { id: true } })) throw new NotFoundError("Supplier envelope not found")
    const tokenAnchor = command.beforeTokenId ? await tx.supplierPoAccessToken.findFirst({ where: { organizationId, envelopeId: command.envelopeId, id: command.beforeTokenId }, select: { id: true, issuedAt: true } }) : null
    const proposalAnchor = command.beforeProposalId ? await tx.supplierPoProposal.findFirst({ where: { organizationId, envelopeId: command.envelopeId, id: command.beforeProposalId }, select: { id: true, createdAt: true } }) : null
    if (command.beforeTokenId && !tokenAnchor || command.beforeProposalId && !proposalAnchor) throw new NotFoundError("Supplier history cursor not found")
    const envelopes = await tx.supplierPoEnvelope.findMany({ where: { ...where, ...(command.envelopeId ? { id: command.envelopeId } : {}), ...(anchor ? { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6,
      include: {
        accessTokens: { where: { organizationId, ...(tokenAnchor ? { OR: [{ issuedAt: { lt: tokenAnchor.issuedAt } }, { issuedAt: tokenAnchor.issuedAt, id: { lt: tokenAnchor.id } }] } : {}) }, orderBy: [{ issuedAt: "desc" }, { id: "desc" }], take: 11 },
        proposals: { where: { organizationId, ...(proposalAnchor ? { OR: [{ createdAt: { lt: proposalAnchor.createdAt } }, { createdAt: proposalAnchor.createdAt, id: { lt: proposalAnchor.id } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 11, include: { lines: true, states: { orderBy: { version: "asc" } } } },
      },
    })
    return {
      scope: { organizationId, actorId }, checkedAt: now.toISOString(), canManage: authority.canManage,
      canIssue: authority.canManage && purchaseOrder.status === "APPROVED" && purchaseOrder.supplier.isActive && purchaseOrder.lines.length > 0,
      purchaseOrder: { id: purchaseOrder.id, orderNumber: purchaseOrder.orderNumber, status: purchaseOrder.status, expectedDeliveryDate: purchaseOrder.expectedDeliveryDate?.toISOString() ?? null, updatedAt: purchaseOrder.updatedAt.toISOString(), currentOrderHash: order.sourceStateHash, contentHash: order.contentHash, supplier: { name: purchaseOrder.supplier.name, email: purchaseOrder.supplier.email, preferredLocale: purchaseOrder.supplier.preferredLocale } },
      nextEnvelopeId: envelopes.length > 5 ? envelopes[4].id : null,
      envelopes: envelopes.slice(0, 5).map(envelope => {
        assertEnvelopeIntegrity(envelope)
        return { id: envelope.id, contentHash: envelope.contentHash, sourceStateHash: envelope.sourceStateHash, preferredLocale: envelope.preferredLocale, createdAt: envelope.createdAt.toISOString(), matchesCurrentOrder: envelope.contentHash === order.contentHash,
          nextTokenId: envelope.accessTokens.length > 10 ? envelope.accessTokens[9].id : null,
          nextProposalId: envelope.proposals.length > 10 ? envelope.proposals[9].id : null,
          tokens: envelope.accessTokens.slice(0, 10).map(token => ({ id: token.id, status: token.status === "ACTIVE" && token.expiresAt <= now ? "EXPIRED" : token.status, requestReference: token.idempotencyKey, tokenHashPrefix: token.tokenHash.slice(0, 12), recipientHashPrefix: token.recipientHash?.slice(0, 12) ?? null, issuedAt: token.issuedAt.toISOString(), expiresAt: token.expiresAt.toISOString(), revokedAt: token.revokedAt?.toISOString() ?? null, revocationReason: token.revocationReason, accessCount: token.accessCount })),
          proposals: envelope.proposals.slice(0, 10).map(proposal => ({ ...proposalResult(proposal, false, envelope.contentHash), canAccept: authority.canManage && purchaseOrder.status === "APPROVED" && purchaseOrder.supplier.isActive && envelope.contentHash === order.contentHash })),
        }
      }),
      controls: { externalActionsAreProposals: true as const, purchaseOrderAuthoritative: true as const, stockAuthoritative: true as const, accountsPayableAuthoritative: true as const, accountingAuthoritative: true as const },
    }
  }, { isolationLevel: SERIALIZABLE })
}
`;
// Approval review required a verified backup and edits bounded to named functions.
const names=['revokeSupplierPoInvite','getSupplierPoAcknowledgementWorkbench'];
function ranges(source){const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);return ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>({name:n.name.text,start:n.getStart(ast),end:n.end}));}
const oldRanges=ranges(s),newRanges=ranges(replacement);
if(oldRanges.length!==2||newRanges.length!==2||names.some(name=>oldRanges.filter(r=>r.name===name).length!==1||newRanges.filter(r=>r.name===name).length!==1))throw Error('Named function boundaries are ambiguous');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex'),beforeHash=digest(s);
const backup=path.join(__dirname,'evidence','supplier-buyer-service-before-bounded-edit-'+beforeHash.slice(0,16)+'.ts.txt');
if(!fs.existsSync(backup))fs.writeFileSync(backup,s,{flag:'wx'});
if(digest(fs.readFileSync(backup,'utf8'))!==beforeHash)throw Error('Backup verification failed');
let output=s;for(const old of oldRanges.sort((a,b)=>b.start-a.start)){const next=newRanges.find(r=>r.name===old.name);output=output.slice(0,old.start)+replacement.slice(next.start,next.end)+output.slice(old.end);}
// All bytes outside the two exact spans are retained, including any later additions.
if(fs.readFileSync(file,'utf8')!==s)throw Error('Source changed during preparation');
fs.writeFileSync(file,output);
console.log(JSON.stringify({changedFunctions:names,beforeSha256:beforeHash,afterSha256:digest(output),verifiedBackup:backup}));

"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { previewPaymentRequest, submitPaymentRequest, reviewPaymentRequestApproval, confirmPaymentRequestApproval } from "@/services/purchasing/payment-request.service"
import type { PaymentRequestDraft, PaymentRequestCommand, PaymentRequestApproval } from "@/services/purchasing/payment-request-contracts"
import { paymentWorkspaceKindSchema, type PaymentSourcesQuery, type PaymentQueueQuery } from "@/services/purchasing/payment-request-contracts"
import { loadPaymentRequestSources, loadPaymentRequestQueue, loadPaymentRequestHistory } from "@/services/purchasing/payment-request-read.service"
async function scope(kind: "request" | "approve") {
  const actor=await requirePermission(`purchasing.ap.payment.${kind}`,{resource:"SupplierPayment",auditAllowed:false}),{claims}=await requireSession()
  if(claims.userId!==actor.userId||claims.tenantId!==actor.orgId)throw new ForbiddenError("Current payment workspace identity is required.")
  return{organizationId:actor.orgId,actorId:actor.userId,sessionId:claims.sessionId,sessionToken:claims.sessionToken}
}
function failure(error: unknown){const safe=toSafeActionError(error);return{success:false as const,data:null,error:safe.error,code:safe.code}}
function refresh(){try{revalidatePath('/[locale]/dashboard/purchases/payables','page');revalidatePath('/[locale]/dashboard/purchases/payables/history','page')}catch{/* Persisted request/decision remains authoritative if cache refresh fails. */}}
export async function reviewSupplierPaymentRequest(input: PaymentRequestDraft){try{return{success:true as const,data:await previewPaymentRequest(input,await scope("request"))}}catch(error){return failure(error)}}
export async function submitSupplierPaymentRequest(input: PaymentRequestCommand){try{const identity=await scope("request"),data=await submitPaymentRequest(input,identity);refresh();return{success:true as const,data:{...data,organizationId:identity.organizationId,actorId:identity.actorId,requestReference:input.idempotencyKey,reviewedRevision:input.expectedRevision}}}catch(error){return failure(error)}}
export async function reviewSupplierPaymentApproval(paymentRequestId: string){try{return{success:true as const,data:await reviewPaymentRequestApproval(paymentRequestId,await scope("approve"))}}catch(error){return failure(error)}}
export async function confirmSupplierPaymentApproval(input: PaymentRequestApproval){try{const identity=await scope("approve"),data=await confirmPaymentRequestApproval(input,identity);refresh();return{success:true as const,data:{...data,organizationId:identity.organizationId,actorId:identity.actorId,requestReference:input.idempotencyKey,reviewedRevision:input.expectedRevision}}}catch(error){return failure(error)}}
export async function loadSupplierPaymentSources(input: PaymentSourcesQuery){try{return{success:true as const,data:await loadPaymentRequestSources(input,await scope("request"))}}catch(error){return failure(error)}}
export async function loadSupplierPaymentRequests(input: PaymentQueueQuery, mode: "request" | "approve"){try{const kind=paymentWorkspaceKindSchema.parse(mode);return{success:true as const,data:await loadPaymentRequestQueue(input,kind,await scope(kind))}}catch(error){return failure(error)}}
export async function loadSupplierPaymentRequestHistory(id: string, mode: "request" | "approve"){try{const kind=paymentWorkspaceKindSchema.parse(mode);return{success:true as const,data:await loadPaymentRequestHistory(id,kind,await scope(kind))}}catch(error){return failure(error)}}

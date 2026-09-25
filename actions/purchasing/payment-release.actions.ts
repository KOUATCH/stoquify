"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { previewPaymentRelease, confirmPaymentRelease, loadPaymentReleaseQueue, readPaymentReleaseOutcome } from "@/services/purchasing/payment-release.service"
import type { PaymentReleaseDraft, PaymentReleaseCommand, PaymentReleaseQueueQuery } from "@/services/purchasing/payment-release-contracts"
import { previewPaymentPostingRecovery, confirmPaymentPostingRecovery, readPaymentPostingRecovery, loadPaymentPostingRecoverySources } from "@/services/purchasing/payment-posting-recovery.service"
import type { PaymentPostingRecoveryDraft, PaymentPostingRecoveryCommand } from "@/services/purchasing/payment-posting-recovery-contracts"
async function scope() {
  const actor=await requirePermission("purchasing.ap.payment.release",{resource:"SupplierPayment",auditAllowed:false}),{claims}=await requireSession()
  if(claims.userId!==actor.userId||claims.tenantId!==actor.orgId)throw new ForbiddenError("Current payment workspace identity is required.")
  return{organizationId:actor.orgId,actorId:actor.userId,sessionId:claims.sessionId,sessionToken:claims.sessionToken}
}
function failure(error:unknown){const safe=toSafeActionError(error);return{success:false as const,data:null,error:safe.error,code:safe.code}}
export async function reviewSupplierPaymentExecution(input:PaymentReleaseDraft){try{return{success:true as const,data:await previewPaymentRelease(input,await scope())}}catch(error){return failure(error)}}
export async function recordSupplierPaymentExecution(input:PaymentReleaseCommand){try{const data=await confirmPaymentRelease(input,await scope());try{revalidatePath('/[locale]/dashboard/purchases/payables','page');revalidatePath('/[locale]/dashboard/purchases/payables/history','page')}catch{/* Persisted outcome remains authoritative if refresh fails. */}return{success:true as const,data}}catch(error){return failure(error)}}
export async function loadSupplierPaymentExecutions(input:PaymentReleaseQueueQuery){try{return{success:true as const,data:await loadPaymentReleaseQueue(input,await scope())}}catch(error){return failure(error)}}
export async function loadSupplierPaymentExecutionOutcome(id:string){try{return{success:true as const,data:await readPaymentReleaseOutcome(id,await scope())}}catch(error){return failure(error)}}
export async function reviewSupplierPaymentPostingRecovery(input:PaymentPostingRecoveryDraft){try{return{success:true as const,data:await previewPaymentPostingRecovery(input,await scope())}}catch(error){return failure(error)}}
export async function confirmSupplierPaymentPostingRecovery(input:PaymentPostingRecoveryCommand){try{const data=await confirmPaymentPostingRecovery(input,await scope());try{revalidatePath('/[locale]/dashboard/purchases/payables','page');revalidatePath('/[locale]/dashboard/purchases/payables/history','page')}catch{/* The retained recovery outcome is authoritative. */}return{success:true as const,data}}catch(error){return failure(error)}}
export async function loadSupplierPaymentPostingRecovery(id:string){try{return{success:true as const,data:await readPaymentPostingRecovery(id,await scope())}}catch(error){return failure(error)}}
export async function loadSupplierPaymentPostingRecoverySources(input:PaymentReleaseQueueQuery){try{return{success:true as const,data:await loadPaymentPostingRecoverySources(input,await scope())}}catch(error){return failure(error)}}

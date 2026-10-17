"use server"
import { requireRbacContext } from "@/lib/security/rbac"
import { readDeliveryIssues } from "@/services/communication/delivery-issues.service"
import type { DeliveryIssuesResult } from "@/services/communication/delivery-issues-contracts"

export async function readDeliveryIssuesAction(input: unknown): Promise<{ success: true; data: DeliveryIssuesResult } | { success: false }> {
  try {
    const context = await requireRbacContext()
    return { success: true, data: await readDeliveryIssues(context, input) }
  } catch {
    return { success: false }
  }
}

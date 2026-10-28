"use client"

import type { PurchaseOrderStatus } from "./purchase-orders-system-types"

export interface WorkflowAction {
  id: string
  label: string
  status: PurchaseOrderStatus
  variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  icon: string
  requiresConfirmation?: boolean
  confirmationMessage?: string
}

export type { PurchaseOrderStatus, PurchaseOrderWithRelations } from "./purchase-orders-system-types"
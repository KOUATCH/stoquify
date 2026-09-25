import type { LocationTransferDTO } from "./inventoryMovementTypes"

export type TransferOperation = "SUBMIT" | "APPROVE" | "DISPATCH" | "RECEIVE" | "CANCEL" | "REJECT" | "RETURN_TO_DRAFT"
export type TransferCommand = {
  transferId: string
  organizationId: string
  operation: TransferOperation
  requestId: string
  expectedUpdatedAt: string
  confirmNoMovement?: boolean
  locationId?: string
  notes?: string
  lines?: { lineId: string; quantity: number }[]
}
export type TransferActivity = {
  id: string
  operation: string
  occurredAt: string
  actor: string
  locationId: string | null
  notes: string
  lines: { lineId: string; quantity: number }[]
}
export type TransferDetail = {
  transfer: LocationTransferDTO
  allowedOperations: TransferOperation[]
  history: TransferActivity[]
  blockingIssue?: "RECORDED_QUANTITIES" | "APPROVAL_EVIDENCE"
}
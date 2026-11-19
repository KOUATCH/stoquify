import { db } from "@/prisma/db"

import { getPOSActivityDay } from "./pos-activity-day"
import type { POSActivityFilters } from "./pos-activity.types"

export type POSActivityShiftSummary = {
  sessionId: string
  sessionNumber: string
  locationId: string
  terminalId: string
  closeDate: string
  currency: string
  expected: string | null
  counted: string | null
  variance: string | null
}

type ShiftSummaryActor = { organizationId: string; userId: string; manager: boolean }
type ShiftSummaryInput = POSActivityFilters & { sessionId: string }

export async function readPOSActivityShiftSummary(
  actor: ShiftSummaryActor,
  input: ShiftSummaryInput,
): Promise<POSActivityShiftSummary | null> {
  const { organizationId, userId, manager } = actor
  const shift = await db.pOSSession.findFirst({
    where: {
      id: input.sessionId,
      organizationId,
      status: { in: ["CLOSED", "RECONCILED"] },
      endTime: { not: null },
      locationId: input.locationId ?? undefined,
      terminalId: input.terminalId ?? undefined,
      location: { organizationId },
      terminal: { organizationId },
      userId: manager ? undefined : userId,
    },
    select: {
      id: true,
      sessionNumber: true,
      locationId: true,
      terminalId: true,
      terminal: { select: { locationId: true } },
      startTime: true,
      endTime: true,
      expectedBalance: true,
      closingBalance: true,
      variance: true,
    },
  })
  if (!shift?.endTime || shift.terminal.locationId !== shift.locationId) return null

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true, timezone: true },
  })
  if (!organization) return null

  const { currency, timezone } = organization
  const closeDay = getPOSActivityDay(shift.endTime, timezone, input.date)
  if (shift.startTime >= closeDay.end || shift.endTime < closeDay.start) return null

  return {
    sessionId: shift.id,
    sessionNumber: shift.sessionNumber,
    locationId: shift.locationId,
    terminalId: shift.terminalId,
    closeDate: closeDay.today,
    currency,
    expected: shift.expectedBalance?.toString() ?? null,
    counted: shift.closingBalance?.toString() ?? null,
    variance: shift.variance?.toString() ?? null,
  }
}

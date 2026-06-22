"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  getOwnerWarRoomData,
} from "@/services/owner-war-room/owner-war-room.service"
import type { OwnerWarRoomData } from "@/services/owner-war-room/owner-war-room-contracts"

export type { OwnerWarRoomData }

const ownerWarRoomInputSchema = z.object({
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  maxAgeMinutes: z.number().int().positive().max(60 * 24 * 31).nullable().optional(),
})

function asOwnerWarRoomInput(input: unknown) {
  const parsed = ownerWarRoomInputSchema.parse(input && typeof input === "object" ? input : {})
  return {
    periodStart: parsed.periodStart ?? null,
    periodEnd: parsed.periodEnd ?? null,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const getOwnerWarRoom = protect<unknown, OwnerWarRoomData>(
  {
    permission: "dashboard.read",
    auditResource: "KontavaOwnerWarRoom",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = asOwnerWarRoomInput(input)
    return getOwnerWarRoomData({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
  },
)

export async function getOwnerWarRoomAction(input: unknown = {}) {
  return getOwnerWarRoom(input)
}

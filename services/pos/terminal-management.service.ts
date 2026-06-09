import { db } from "@/prisma/db"
import { LocationType, POSSessionStatus } from "@prisma/client"
import type { TerminalManagementInput } from "./terminal-management.schemas"

type DecimalLike = { toNumber?: () => number; toString: () => string } | number | string | null | undefined

export type TerminalLocationOption = {
  id: string
  name: string
  code: string
  type: LocationType
}

export type TerminalManagementRow = {
  id: string
  terminalNumber: string
  name: string
  isActive: boolean
  hasCashDrawer: boolean
  locationId: string
  organizationId: string
  currentSessionId: string | null
  createdAt: Date
  updatedAt: Date
  locationName: string
  locationCode: string
  locationType: LocationType
  currentSession: {
    id: string
    sessionNumber: string
    status: POSSessionStatus
    startTime: Date
    cashierName: string
    cashierEmail: string
    totalSales: number
    transactionCount: number
  } | null
  sessionsCount: number
  cashDrawersCount: number
  openCashDrawersCount: number
  salesOrdersCount: number
}

export type TerminalManagementData = {
  terminals: TerminalManagementRow[]
  locations: TerminalLocationOption[]
}

function toNumber(value: DecimalLike): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value.toNumber === "function") return value.toNumber()
  return Number(value.toString()) || 0
}

function normalizeTerminalNumber(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function getUserDisplayName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
}

async function assertLocationBelongsToOrg(organizationId: string, locationId: string) {
  const location = await db.location.findFirst({
    where: {
      id: locationId,
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  })

  if (!location) {
    throw new Error("Location not found")
  }

  return location
}

async function resolveTerminalNumber(organizationId: string, input: string | null | undefined, locationCode: string, ignoreTerminalId?: string) {
  if (input) {
    const terminalNumber = normalizeTerminalNumber(input)

    if (!terminalNumber) {
      throw new Error("Terminal number is required")
    }

    const duplicate = await db.pOSStation.findFirst({
      where: {
        organizationId,
        terminalNumber,
        ...(ignoreTerminalId ? { id: { not: ignoreTerminalId } } : {}),
      },
      select: { id: true },
    })

    if (duplicate) {
      throw new Error("Terminal number already exists")
    }

    return terminalNumber
  }

  const prefix = normalizeTerminalNumber(locationCode).slice(0, 20) || "POS"
  let index = 1

  while (index < 1000) {
    const terminalNumber = `${prefix}-POS-${String(index).padStart(3, "0")}`
    const duplicate = await db.pOSStation.findFirst({
      where: {
        organizationId,
        terminalNumber,
        ...(ignoreTerminalId ? { id: { not: ignoreTerminalId } } : {}),
      },
      select: { id: true },
    })

    if (!duplicate) {
      return terminalNumber
    }

    index += 1
  }

  throw new Error("Could not generate a unique terminal number")
}

async function ensureDefaultCashDrawer(terminal: {
  id: string
  name: string
  terminalNumber: string
  locationId: string
}) {
  const existing = await db.cashDrawer.findFirst({
    where: { terminalId: terminal.id },
    select: { id: true },
  })

  if (existing) return

  await db.cashDrawer.create({
    data: {
      name: `Cash Drawer - ${terminal.name}`,
      drawerNumber: `DRAWER-${terminal.terminalNumber}`,
      terminalId: terminal.id,
      locationId: terminal.locationId,
    },
  })
}

function mapTerminalRow(terminal: Awaited<ReturnType<typeof getTerminalRecords>>[number]): TerminalManagementRow {
  return {
    id: terminal.id,
    terminalNumber: terminal.terminalNumber,
    name: terminal.name,
    isActive: terminal.isActive,
    hasCashDrawer: terminal.hasCashDrawer,
    locationId: terminal.locationId,
    organizationId: terminal.organizationId,
    currentSessionId: terminal.currentSessionId,
    createdAt: terminal.createdAt,
    updatedAt: terminal.updatedAt,
    locationName: terminal.location.name,
    locationCode: terminal.location.code,
    locationType: terminal.location.type,
    currentSession: terminal.currentSession
      ? {
          id: terminal.currentSession.id,
          sessionNumber: terminal.currentSession.sessionNumber,
          status: terminal.currentSession.status,
          startTime: terminal.currentSession.startTime,
          cashierName: getUserDisplayName(terminal.currentSession.user),
          cashierEmail: terminal.currentSession.user.email,
          totalSales: toNumber(terminal.currentSession.totalSales),
          transactionCount: terminal.currentSession.transactionCount,
        }
      : null,
    sessionsCount: terminal._count.sessions,
    cashDrawersCount: terminal._count.cashDrawers,
    openCashDrawersCount: terminal.cashDrawers.filter((drawer) => drawer.isOpen).length,
    salesOrdersCount: terminal._count.salesOrders,
  }
}

async function getTerminalRecords(organizationId: string) {
  return db.pOSStation.findMany({
    where: { organizationId },
    orderBy: [
      { isActive: "desc" },
      { terminalNumber: "asc" },
    ],
    select: {
      id: true,
      terminalNumber: true,
      name: true,
      isActive: true,
      hasCashDrawer: true,
      locationId: true,
      organizationId: true,
      currentSessionId: true,
      createdAt: true,
      updatedAt: true,
      location: {
        select: {
          name: true,
          code: true,
          type: true,
        },
      },
      currentSession: {
        select: {
          id: true,
          sessionNumber: true,
          status: true,
          startTime: true,
          totalSales: true,
          transactionCount: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      cashDrawers: {
        select: {
          isOpen: true,
        },
      },
      _count: {
        select: {
          sessions: true,
          cashDrawers: true,
          salesOrders: true,
        },
      },
    },
  })
}

export async function getTerminalManagementDataForOrg(organizationId: string): Promise<TerminalManagementData> {
  const [terminals, locations] = await Promise.all([
    getTerminalRecords(organizationId),
    db.location.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
    }),
  ])

  return {
    terminals: terminals.map(mapTerminalRow),
    locations,
  }
}

export async function createTerminalForManagement(
  organizationId: string,
  input: TerminalManagementInput,
): Promise<TerminalManagementRow> {
  const location = await assertLocationBelongsToOrg(organizationId, input.locationId)
  const terminalNumber = await resolveTerminalNumber(organizationId, input.terminalNumber, location.code)
  const name = input.name.trim()

  const terminal = await db.$transaction(async (tx) => {
    const created = await tx.pOSStation.create({
      data: {
        terminalNumber,
        name,
        locationId: location.id,
        organizationId,
        isActive: input.isActive ?? true,
        hasCashDrawer: input.hasCashDrawer ?? true,
      },
      select: {
        id: true,
        name: true,
        terminalNumber: true,
        locationId: true,
        hasCashDrawer: true,
      },
    })

    if (created.hasCashDrawer) {
      await tx.cashDrawer.create({
        data: {
          name: `Cash Drawer - ${created.name}`,
          drawerNumber: `DRAWER-${created.terminalNumber}`,
          terminalId: created.id,
          locationId: created.locationId,
        },
      })
    }

    return created
  })

  const refreshed = await getTerminalManagementDataForOrg(organizationId)
  const row = refreshed.terminals.find((item) => item.id === terminal.id)

  if (!row) {
    throw new Error("Terminal was created but could not be reloaded")
  }

  return row
}

export async function updateTerminalForManagement(
  organizationId: string,
  terminalId: string,
  input: TerminalManagementInput,
): Promise<TerminalManagementRow> {
  const existingTerminal = await db.pOSStation.findFirst({
    where: { id: terminalId, organizationId },
    select: {
      id: true,
      currentSessionId: true,
      hasCashDrawer: true,
      terminalNumber: true,
      cashDrawers: {
        select: {
          isOpen: true,
        },
      },
    },
  })

  if (!existingTerminal) {
    throw new Error("Terminal not found")
  }

  if (existingTerminal.currentSessionId && input.isActive === false) {
    throw new Error("Cannot deactivate terminal with an active session")
  }

  if (input.hasCashDrawer === false && existingTerminal.cashDrawers.some((drawer) => drawer.isOpen)) {
    throw new Error("Cannot disable cash drawer while a drawer is open")
  }

  const location = await assertLocationBelongsToOrg(organizationId, input.locationId)
  const terminalNumber = input.terminalNumber
    ? await resolveTerminalNumber(organizationId, input.terminalNumber, location.code, terminalId)
    : existingTerminal.terminalNumber

  await db.pOSStation.update({
    where: { id: terminalId },
    data: {
      terminalNumber,
      name: input.name.trim(),
      locationId: location.id,
      isActive: input.isActive ?? true,
      hasCashDrawer: input.hasCashDrawer ?? true,
    },
  })

  if (input.hasCashDrawer ?? true) {
    await ensureDefaultCashDrawer({
      id: terminalId,
      name: input.name.trim(),
      terminalNumber,
      locationId: location.id,
    })
  }

  const refreshed = await getTerminalManagementDataForOrg(organizationId)
  const row = refreshed.terminals.find((item) => item.id === terminalId)

  if (!row) {
    throw new Error("Terminal was updated but could not be reloaded")
  }

  return row
}

export async function archiveTerminalForManagement(
  organizationId: string,
  terminalId: string,
): Promise<{ id: string }> {
  const terminal = await db.pOSStation.findFirst({
    where: { id: terminalId, organizationId },
    select: {
      id: true,
      currentSessionId: true,
      currentSession: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!terminal) {
    throw new Error("Terminal not found")
  }

  if (terminal.currentSessionId || terminal.currentSession?.status === POSSessionStatus.ACTIVE) {
    throw new Error("Cannot deactivate terminal with an active session")
  }

  await db.pOSStation.update({
    where: { id: terminalId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })

  return { id: terminalId }
}

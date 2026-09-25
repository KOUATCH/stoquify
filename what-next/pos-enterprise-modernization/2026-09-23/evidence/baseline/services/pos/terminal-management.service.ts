import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError, getPrismaKnownRequest } from "@/services/_shared/action-errors"
import { LocationType, POSSessionStatus, Prisma } from "@prisma/client"
import type { TerminalManagementInput, TerminalManagementUpdateInput } from "./terminal-management.schemas"
import { terminalConfigurationRevision } from "./terminal-configuration-revision"

type DecimalLike = { toNumber?: () => number; toString: () => string } | number | string | null | undefined

export type TerminalLocationOption = {
  id: string
  name: string
  code: string
  type: LocationType
}

export type TerminalManagementRow = {
  configurationRevision: string
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

async function assertLocationBelongsToOrg(organizationId: string, locationId: string, client: Prisma.TransactionClient = db) {
  const location = await client.location.findFirst({
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
    throw new NotFoundError("Location not found")
  }

  return location
}

async function resolveTerminalNumber(organizationId: string, input: string | null | undefined, locationCode: string, ignoreTerminalId?: string, client: Prisma.TransactionClient = db) {
  if (input) {
    const terminalNumber = normalizeTerminalNumber(input)

    if (!terminalNumber) {
      throw new BusinessRuleError("Terminal number is required")
    }

    const duplicate = await client.pOSStation.findFirst({
      where: {
        organizationId,
        terminalNumber,
        ...(ignoreTerminalId ? { id: { not: ignoreTerminalId } } : {}),
      },
      select: { id: true },
    })

    if (duplicate) {
      throw new ConflictError("Terminal number already exists")
    }

    return terminalNumber
  }

  const prefix = normalizeTerminalNumber(locationCode).slice(0, 20) || "POS"
  let index = 1

  while (index < 1000) {
    const terminalNumber = `${prefix}-POS-${String(index).padStart(3, "0")}`
    const duplicate = await client.pOSStation.findFirst({
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

  throw new ConflictError("Could not generate a unique terminal number")
}

async function ensureDefaultCashDrawer(terminal: {
  id: string
  name: string
  terminalNumber: string
  locationId: string
}, client: Prisma.TransactionClient) {
  const existing = await client.cashDrawer.findFirst({
    where: { terminalId: terminal.id },
    select: { id: true },
  })

  if (existing) return

  await client.cashDrawer.create({
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
    configurationRevision: terminalConfigurationRevision(terminal),
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
    throw new BusinessRuleError("Terminal was created but could not be reloaded")
  }

  return row
}

export async function updateTerminalForManagement(
  organizationId: string,
  terminalId: string,
  input: TerminalManagementUpdateInput,
): Promise<TerminalManagementRow> {
  try {
    await db.$transaction(async (tx) => {
      const existingTerminal = await tx.pOSStation.findFirst({
        where: { id: terminalId, organizationId },
        select: {
          id: true, organizationId: true, name: true, updatedAt: true, locationId: true, isActive: true, currentSessionId: true,
          hasCashDrawer: true, terminalNumber: true,
          cashDrawers: { select: { isOpen: true, _count: { select: { transactions: true } } } },
          _count: { select: { sessions: true, salesOrders: true } },
        },
      })
      if (!existingTerminal) throw new NotFoundError("Terminal not found")
      if (input.expectedRevision !== terminalConfigurationRevision(existingTerminal)) {
        throw new ConflictError("Terminal changed since this form was opened; review the latest configuration")
      }

      const moving = existingTerminal.locationId !== input.locationId
      const isActive = input.isActive ?? existingTerminal.isActive
      const hasCashDrawer = input.hasCashDrawer ?? existingTerminal.hasCashDrawer
      if (existingTerminal.currentSessionId && !isActive) {
        throw new BusinessRuleError("Cannot deactivate terminal with an active session")
      }
      if (moving && (existingTerminal.currentSessionId || existingTerminal.cashDrawers.some(drawer => drawer.isOpen))) {
        throw new BusinessRuleError("Cannot move terminal with an active session or open drawer")
      }
      if (!hasCashDrawer && existingTerminal.cashDrawers.some(drawer => drawer.isOpen)) {
        throw new BusinessRuleError("Cannot disable cash drawer while a drawer is open")
      }
      if (moving && (existingTerminal._count.sessions > 0 || existingTerminal._count.salesOrders > 0 || existingTerminal.cashDrawers.some(drawer => drawer._count.transactions > 0))) {
        throw new BusinessRuleError("Cannot move terminal with operating history; create a terminal at the new location")
      }

      const location = await assertLocationBelongsToOrg(organizationId, input.locationId, tx)
      const terminalNumber = input.terminalNumber
        ? await resolveTerminalNumber(organizationId, input.terminalNumber, location.code, terminalId, tx)
        : existingTerminal.terminalNumber
      await tx.pOSStation.update({
        where: { id: terminalId, organizationId },
        data: { terminalNumber, name: input.name.trim(), locationId: location.id, isActive, hasCashDrawer },
      })
      // Only unused drawers can move. Their historical locations are never rewritten.
      if (moving) await tx.cashDrawer.updateMany({ where: { terminalId }, data: { locationId: location.id } })
      if (hasCashDrawer) await ensureDefaultCashDrawer({ id: terminalId, name: input.name.trim(), terminalNumber, locationId: location.id }, tx)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (getPrismaKnownRequest(error)?.code === "P2034") {
      throw new ConflictError("Terminal changed during editing; review its current session and try again")
    }
    throw error
  }

  const refreshed = await getTerminalManagementDataForOrg(organizationId)
  const row = refreshed.terminals.find((item) => item.id === terminalId)

  if (!row) {
    throw new BusinessRuleError("Terminal was updated but could not be reloaded")
  }

  return row
}

export async function archiveTerminalForManagement(
  organizationId: string,
  terminalId: string,
  expectedRevision: string,
): Promise<{ id: string }> {
  const terminal = await db.pOSStation.findFirst({
    where: { id: terminalId, organizationId },
    select: {
      id: true,
      organizationId: true,
      name: true,
      terminalNumber: true,
      locationId: true,
      isActive: true,
      hasCashDrawer: true,
      updatedAt: true,
      currentSessionId: true,
      currentSession: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!terminal) {
    throw new NotFoundError("Terminal not found")
  }

  if (terminal.currentSessionId || terminal.currentSession?.status === POSSessionStatus.ACTIVE) {
    throw new BusinessRuleError("Cannot deactivate terminal with an active session")
  }

  if (expectedRevision !== terminalConfigurationRevision(terminal)) {
    throw new ConflictError("Terminal changed since this confirmation was opened; review the latest configuration")
  }

  const archived = await db.pOSStation.updateMany({
    // Competes atomically with openPOSShift's claim of the same station row.
    where: {
      id: terminalId, organizationId, currentSessionId: null,
      name: terminal.name, terminalNumber: terminal.terminalNumber,
      locationId: terminal.locationId, isActive: terminal.isActive,
      hasCashDrawer: terminal.hasCashDrawer, updatedAt: terminal.updatedAt,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })

  if (archived.count !== 1) {
    throw new ConflictError("Terminal changed since this confirmation was opened; review the latest configuration")
  }

  return { id: terminalId }
}

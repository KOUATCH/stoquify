"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { err, ok } from "@/services/_shared/action-response"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { requireOrg } from "@/services/_shared/require-org"
import {
  archiveTerminalForManagement,
  createTerminalForManagement,
  getTerminalManagementDataForOrg,
  updateTerminalForManagement,
  type TerminalLocationOption,
  type TerminalManagementData,
  type TerminalManagementRow,
} from "@/services/pos/terminal-management.service"
import {
  TerminalManagementSchema,
  type TerminalManagementInput,
} from "@/services/pos/terminal-management.schemas"

export type {
  TerminalLocationOption,
  TerminalManagementData,
  TerminalManagementInput,
  TerminalManagementRow,
}

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Unauthorized: no active organization",
  "Organization is required",
  "You do not have access to this organization",
  "Location not found",
  "Terminal not found",
  "Terminal number is required",
  "Terminal number already exists",
  "Cannot deactivate terminal with an active session",
  "Cannot disable cash drawer while a drawer is open",
  "Terminal was created but could not be reloaded",
  "Terminal was updated but could not be reloaded",
  "Could not generate a unique terminal number",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Terminal number already exists"
    }

    if (error.code === "P2003") {
      return "Referenced record not found"
    }
  }

  return error instanceof Error && ACTIONABLE_ERROR_MESSAGES.has(error.message)
    ? error.message
    : fallback
}

function getValidationResult(input: unknown) {
  const parsed = TerminalManagementSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid terminal input",
  }
}

async function assertOrganizationAccess(requestedOrganizationId?: string | null) {
  const { orgId, user } = await requireOrg()
  const scopedOrganizationId = cleanText(requestedOrganizationId) ?? orgId

  if (!scopedOrganizationId) {
    throw new BusinessRuleError("Organization is required")
  }

  if (scopedOrganizationId !== orgId && !user.permissions.includes("*")) {
    throw new ForbiddenError("You do not have access to this organization")
  }

  return scopedOrganizationId
}

function revalidateTerminalPaths(organizationId: string, terminalId?: string) {
  revalidateTag("pos-terminals")
  revalidateTag(`pos-terminals-${organizationId}`)

  if (terminalId) {
    revalidateTag(`pos-terminal-${terminalId}`)
  }

  revalidatePath("/[locale]/dashboard/settings/terminals", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
  revalidatePath("/[locale]/dashboard/cashDrawer", "page")
}

export async function getTerminalManagementData(organizationId: string) {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const data = await getTerminalManagementDataForOrg(scopedOrganizationId)

    return ok(data)
  } catch (error) {
    return err<TerminalManagementData>(safeLoggedActionErrorMessage(
      "Error fetching terminal management data",
      error,
      { action: "getTerminalManagementData" },
      getActionErrorMessage(error, "Failed to fetch terminal management data"),
    ))
  }
}

export async function createManagedTerminal(organizationId: string, input: TerminalManagementInput) {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const parsed = getValidationResult(input)

    if (!parsed.success) {
      return err<TerminalManagementRow>(parsed.error)
    }

    const terminal = await createTerminalForManagement(scopedOrganizationId, parsed.data)
    revalidateTerminalPaths(scopedOrganizationId, terminal.id)

    return ok(terminal)
  } catch (error) {
    return err<TerminalManagementRow>(safeLoggedActionErrorMessage(
      "Error creating managed terminal",
      error,
      { action: "createManagedTerminal" },
      getActionErrorMessage(error, "Failed to create terminal"),
    ))
  }
}

export async function updateManagedTerminal(
  organizationId: string,
  terminalId: string,
  input: TerminalManagementInput,
) {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedTerminalId = cleanText(terminalId)

    if (!scopedTerminalId) {
      return err<TerminalManagementRow>("Terminal not found")
    }

    const parsed = getValidationResult(input)

    if (!parsed.success) {
      return err<TerminalManagementRow>(parsed.error)
    }

    const terminal = await updateTerminalForManagement(scopedOrganizationId, scopedTerminalId, parsed.data)
    revalidateTerminalPaths(scopedOrganizationId, terminal.id)

    return ok(terminal)
  } catch (error) {
    return err<TerminalManagementRow>(safeLoggedActionErrorMessage(
      "Error updating managed terminal",
      error,
      { action: "updateManagedTerminal" },
      getActionErrorMessage(error, "Failed to update terminal"),
    ))
  }
}

export async function archiveManagedTerminal(organizationId: string, terminalId: string) {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedTerminalId = cleanText(terminalId)

    if (!scopedTerminalId) {
      return err<{ id: string }>("Terminal not found")
    }

    const terminal = await archiveTerminalForManagement(scopedOrganizationId, scopedTerminalId)
    revalidateTerminalPaths(scopedOrganizationId, terminal.id)

    return ok(terminal)
  } catch (error) {
    return err<{ id: string }>(safeLoggedActionErrorMessage(
      "Error archiving managed terminal",
      error,
      { action: "archiveManagedTerminal" },
      getActionErrorMessage(error, "Failed to deactivate terminal"),
    ))
  }
}

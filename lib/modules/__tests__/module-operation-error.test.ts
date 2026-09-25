import { getModuleOperationErrorReason } from "../module-operation-error"
import { ApplicationError } from "@/services/_shared/action-errors"
import { withErrorHandling } from "@/lib/error-handling/server-action-wrapper"
import { errorHandler } from "@/lib/error-handling/error-handler"

const reason = "MODULE_NEW_WORK_STOPPED"

it("recognizes only the allowlisted reason attached to FORBIDDEN", () => {
  expect(getModuleOperationErrorReason({ code: "FORBIDDEN", reason })).toBe(reason)
  expect(getModuleOperationErrorReason({ code: "FORBIDDEN", metadata: { reason, private: "not-for-clients" } })).toBe(reason)
  for (const value of [null, reason, { code: "FORBIDDEN" }, { code: "FORBIDDEN", reason: "OTHER" }, { code: "INTERNAL_ERROR", reason }]) expect(getModuleOperationErrorReason(value)).toBeUndefined()
})

it("preserves the denial and only its public reason through the legacy action wrapper", async () => {
  const handle = jest.spyOn(errorHandler, "handle").mockResolvedValue({ handled: true, errorId: "test-error", logged: true })
  try {
    const action = withErrorHandling(async () => { throw new ApplicationError("FORBIDDEN", "New work is stopped", 403, true, { reason, privateEvidence: "private-marker" }) }, { actionName: "inventory.transfer.create" })
    const result = await action({})
    expect(result).toMatchObject({ success: false, error: { code: "FORBIDDEN", status: 403, reason, retryable: false, userMessage: "Forbidden" } })
    expect(result.error).not.toHaveProperty("metadata")
    expect(JSON.stringify(result)).not.toContain("private-marker")
  } finally { handle.mockRestore() }
})

it("does not relabel an unrelated legacy forbidden error as an operational stop", async () => {
  const handle = jest.spyOn(errorHandler, "handle").mockResolvedValue({ handled: true, errorId: "test-error", logged: true })
  try {
    const action = withErrorHandling(async () => { throw new ApplicationError("FORBIDDEN", "No permission", 403, true, { reason: "PRIVATE_AUTH_REASON", privateEvidence: "private-marker" }) }, { actionName: "inventory.transfer.create" })
    const result = await action({})
    expect(result.success).toBe(false)
    expect(result.error).not.toHaveProperty("reason")
    expect(JSON.stringify(result)).not.toContain("PRIVATE_AUTH_REASON")
    expect(JSON.stringify(result)).not.toContain("private-marker")
  } finally { handle.mockRestore() }
})

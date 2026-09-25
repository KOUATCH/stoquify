/** The only module-operation reason allowed across the public error boundary.
 * This is a presentation discriminator, never an authorization decision. */
export type ModuleOperationErrorReason = "MODULE_NEW_WORK_STOPPED"

export function getModuleOperationErrorReason(error: unknown): ModuleOperationErrorReason | undefined {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "FORBIDDEN") return undefined
  const reason = "reason" in error ? error.reason : undefined
  const metadata = "metadata" in error ? error.metadata : undefined
  const metadataReason = metadata && typeof metadata === "object" && "reason" in metadata ? metadata.reason : undefined
  return reason === "MODULE_NEW_WORK_STOPPED" || metadataReason === "MODULE_NEW_WORK_STOPPED" ? "MODULE_NEW_WORK_STOPPED" : undefined
}

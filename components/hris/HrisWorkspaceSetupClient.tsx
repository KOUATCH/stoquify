"use client"
import { HrisWorkspaceSetup } from "./HrisWorkspaceSetup"
import { executeWorkspaceSetupAction, getWorkspaceSetupAction } from "@/actions/hris/workspace-setup.actions"
import type { WorkspaceSetup } from "@/services/hris/workspace-setup.service"
export function HrisWorkspaceSetupClient({initial, locale}: {initial: WorkspaceSetup; locale: "en" | "fr"}) {
  return <HrisWorkspaceSetup initial={initial} locale={locale} execute={executeWorkspaceSetupAction} reload={async () => {
    const result = await getWorkspaceSetupAction()
    if (!result.success) throw new Error(result.error)
    return result.data
  }} />
}

import { createHash } from "node:crypto"

/** A version marker, never an authorization grant. Include identity and all edited fields. */
export function terminalConfigurationRevision(terminal: {
  id: string; organizationId: string; name: string; terminalNumber: string; locationId: string;
  isActive: boolean; hasCashDrawer: boolean; currentSessionId: string | null; updatedAt: Date;
}) {
  return createHash("sha256").update(JSON.stringify([
    terminal.id, terminal.organizationId, terminal.name, terminal.terminalNumber, terminal.locationId,
    terminal.isActive, terminal.hasCashDrawer, terminal.currentSessionId, terminal.updatedAt.toISOString(),
  ])).digest("hex")
}

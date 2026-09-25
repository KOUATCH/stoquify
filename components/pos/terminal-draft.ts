export type TerminalDraft = { name: string; terminalNumber: string; locationId: string; isActive: boolean; hasCashDrawer: boolean }

/** Keep explicitly edited fields; carry forward newer values the operator did not edit. */
export function mergeTerminalDraft(base: TerminalDraft, draft: TerminalDraft, latest: TerminalDraft): TerminalDraft {
  return {
    name: draft.name === base.name ? latest.name : draft.name,
    terminalNumber: draft.terminalNumber === base.terminalNumber ? latest.terminalNumber : draft.terminalNumber,
    locationId: draft.locationId === base.locationId ? latest.locationId : draft.locationId,
    isActive: draft.isActive === base.isActive ? latest.isActive : draft.isActive,
    hasCashDrawer: draft.hasCashDrawer === base.hasCashDrawer ? latest.hasCashDrawer : draft.hasCashDrawer,
  }
}

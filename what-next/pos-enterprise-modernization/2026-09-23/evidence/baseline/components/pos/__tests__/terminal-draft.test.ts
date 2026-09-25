import { mergeTerminalDraft } from "../terminal-draft"

const base = { name: "Original", terminalNumber: "T1", locationId: "L1", isActive: true, hasCashDrawer: true }
it("retains edited fields and carries newer untouched fields forward", () => {
  expect(mergeTerminalDraft(base, { ...base, name: "My draft" }, { ...base, name: "Other operator", terminalNumber: "T2", isActive: false }))
    .toEqual({ ...base, name: "My draft", terminalNumber: "T2", isActive: false })
})
it("preserves an explicit conflicting flag for review, without silently saving it", () => {
  expect(mergeTerminalDraft(base, { ...base, hasCashDrawer: false }, { ...base, locationId: "L2" }))
    .toEqual({ ...base, hasCashDrawer: false, locationId: "L2" })
})

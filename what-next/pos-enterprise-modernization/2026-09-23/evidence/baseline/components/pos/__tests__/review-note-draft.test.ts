import { readReviewNoteDraft, saveReviewNoteDraft } from "../offline/review-note-draft"
const scope = { organizationId: "org", userId: "reviewer", conflictId: "conflict" }
function storage() { const map = new Map<string, string>(); return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value) }, removeItem: (key: string) => { map.delete(key) }, map } }
it("separates notes by organization, account and conflict and clears a saved note", () => {
  const store = storage(); expect(saveReviewNoteDraft(store, scope, "Original note", 100)).toBe(true)
  expect(readReviewNoteDraft(store, scope, 101).note).toBe("Original note")
  for (const other of [{ ...scope, organizationId: "other" }, { ...scope, userId: "other" }, { ...scope, conflictId: "other" }]) expect(readReviewNoteDraft(store, other, 101).note).toBeNull()
  saveReviewNoteDraft(store, scope, null); expect(readReviewNoteDraft(store, scope, 101).note).toBeNull()
})
it("does not restore expired, future, malformed or oversized drafts", () => {
  const store = storage(); saveReviewNoteDraft(store, scope, "Note", 100)
  expect(readReviewNoteDraft(store, scope, 86400200).note).toBeNull()
  saveReviewNoteDraft(store, scope, "Note", 100); expect(readReviewNoteDraft(store, scope, 99).note).toBeNull()
  saveReviewNoteDraft(store, scope, "Note", 100); const key = [...store.map.keys()][0]; store.setItem(key, "{" ); expect(readReviewNoteDraft(store, scope, 101).unavailable).toBe(true)
  store.setItem(key, "x".repeat(8001)); expect(readReviewNoteDraft(store, scope, 101).note).toBeNull()
})
it("reports unavailable storage while preserving the caller's in-memory note", () => {
  const store = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("quota") }, removeItem: () => undefined }
  expect(readReviewNoteDraft(store, scope).unavailable).toBe(true); expect(saveReviewNoteDraft(store, scope, "Retained in memory")).toBe(false)
})

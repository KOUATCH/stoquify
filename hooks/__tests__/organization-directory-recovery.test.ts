import { readDirectoryExportRequest, saveDirectoryExportRequest } from "../organization-directory-recovery"
import { formatDirectoryPaymentTotal } from "@/services/organization/organization-directory-input"
const command = { locale: "en" as const, filters: { search: "company", status: "all" as const }, expectedHash: "a".repeat(64), requestId: "e1d8c7ce-79b0-4998-8590-866fc5c0727d" }
beforeEach(() => sessionStorage.clear())
it("restores retry identity without storing the file or password", () => {
  saveDirectoryExportRequest(sessionStorage, "org", "actor", "en", command)
  expect(readDirectoryExportRequest(sessionStorage, "org", "actor", "en")).toEqual(command)
  const saved = JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!)
  expect(Object.keys(saved).sort()).toEqual(["command", "savedAt"])
})
it.each([["other", "actor", "en"], ["org", "other", "en"], ["org", "actor", "fr"]])("does not restore across scope %s %s %s", (org, actor, locale) => {
  saveDirectoryExportRequest(sessionStorage, "org", "actor", "en", command)
  expect(readDirectoryExportRequest(sessionStorage, org, actor, locale as "en" | "fr")).toBeNull()
})
it("expires requests after 24 hours", () => {
  saveDirectoryExportRequest(sessionStorage, "org", "actor", "en", command)
  expect(readDirectoryExportRequest(sessionStorage, "org", "actor", "en", Date.now() + 86400001)).toBeNull(); expect(sessionStorage.length).toBe(0)
})
it("rejects malformed stored data and clears it", () => {
  saveDirectoryExportRequest(sessionStorage, "org", "actor", "en", command); sessionStorage.setItem(sessionStorage.key(0)!, "invalid")
  expect(readDirectoryExportRequest(sessionStorage, "org", "actor", "en")).toBeNull(); expect(sessionStorage.length).toBe(0)
})
it.each(["en", "fr"] as const)("preserves large exact cents for %s", locale => {
  const formatted = formatDirectoryPaymentTotal("9007199254740993.25", "XAF", locale)
  expect(formatted.replace(/[^0-9]/g, "")).toBe("900719925474099325")
})

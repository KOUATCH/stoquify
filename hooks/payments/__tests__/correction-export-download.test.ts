import { createHash, webcrypto } from "node:crypto"
import { downloadCorrectionEvidence } from "../correction-export-download"

const content = '{"reason":"Révision indépendante"}'
const file = { content, sha256: createHash("sha256").update(content).digest("hex"), fileName: "stoquify-suspense-correction-abc-123.json", mimeType: "application/json" }
beforeEach(() => {
  Object.defineProperty(crypto, "subtle", { configurable: true, value: webcrypto.subtle })
  URL.createObjectURL = jest.fn(() => "blob:owned")
  URL.revokeObjectURL = jest.fn()
})
it("rejects changed bytes before creating a download", async () => {
  await expect(downloadCorrectionEvidence({ ...file, content: "changed" }, () => true)).rejects.toThrow("recorded hash")
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
it("rechecks current scope after hashing and refuses an identity change", async () => {
  await expect(downloadCorrectionEvidence(file, () => false)).rejects.toThrow("Workspace changed")
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
it("requests verified UTF-8 bytes and removes its temporary link", async () => {
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function(this: HTMLAnchorElement) { expect(this.download).toBe(file.fileName); expect(this.href).toBe("blob:owned") })
  try { await downloadCorrectionEvidence(file, () => true); expect(click).toHaveBeenCalledTimes(1); expect(document.querySelector('a[download]')).toBeNull() }
  finally { click.mockRestore() }
})

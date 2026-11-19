import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ItemImportImages } from "../ItemImportImages"
import { deletePhoto } from "@/actions/storage/photo-upload-actions"
jest.mock("@/actions/storage/photo-upload-actions", () => ({ deletePhoto: jest.fn() }))
const oldFetch = global.fetch
beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn() })
afterEach(() => { global.fetch = oldFetch })
const file = () => new File([new Uint8Array(20)], "synthetic.png", { type: "image/png" })
it("uses the real uploader and keeps earlier CSV references when uploading the next image", async () => {
  const refs = ["/api/media/11111111-1111-4111-8111-111111111111", "/api/media/22222222-2222-4222-8222-222222222222"]
  const fetch = jest.mocked(global.fetch)
  for (const url of refs) fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, url }) } as Response)
  render(<ItemImportImages organizationId="org-a" locale="en" />)
  for (let i = 0; i < refs.length; i++) {
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [file()] } })
    await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(i + 1))
    expect(screen.getAllByRole("textbox")[i]).toHaveFocus()
  }
  expect(screen.getAllByRole("textbox").map(input => (input as HTMLInputElement).value)).toEqual(refs)
  expect(deletePhoto).not.toHaveBeenCalled()
  expect(fetch).toHaveBeenCalledWith("/api/media/upload", expect.objectContaining({ method: "POST", credentials: "same-origin", headers: { "x-organization-id": "org-a" }, body: expect.any(FormData) }))
})
it("keeps failed uploads out of CSV references and permits a French retry", async () => {
  const fetch = jest.mocked(global.fetch)
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Unavailable" }) } as Response)
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, url: "/api/media/11111111-1111-4111-8111-111111111111" }) } as Response)
  render(<ItemImportImages organizationId="org-a" locale="fr" />)
  fireEvent.change(screen.getByLabelText("Choisir une image"), { target: { files: [file()] } })
  expect(await screen.findByRole("alert")).toHaveTextContent("n’a pas pu être envoyée")
  expect(screen.queryAllByRole("textbox")).toHaveLength(0)
  fireEvent.click(screen.getByRole("button", { name: "Réessayer l’envoi" }))
  await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(1))
  expect(deletePhoto).not.toHaveBeenCalled()
})

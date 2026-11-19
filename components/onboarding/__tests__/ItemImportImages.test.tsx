import { fireEvent, render, screen } from "@testing-library/react"
import { ItemImportImages } from "../ItemImportImages"
jest.mock("@/components/FormInputs/EnhancedImageUploadButton", () => ({ __esModule: true, default: ({ setImageUrl, imageUrl, organizationId }: any) =>
  <button onClick={() => setImageUrl("/api/media/11111111-1111-4111-8111-111111111111")} data-current={imageUrl} data-org={organizationId}>Upload fixture</button> }))
it.each(["en", "fr"] as const)("retains separate %s references, resets uploader and focuses copyable field", locale => {
  render(<ItemImportImages organizationId="org-a" locale={locale} />)
  fireEvent.click(screen.getByText("Upload fixture"))
  expect(screen.getAllByRole("textbox")[0]).toHaveFocus()
  fireEvent.click(screen.getByText("Upload fixture"))
  expect(screen.getAllByRole("textbox")).toHaveLength(2)
  expect(screen.getAllByRole("textbox")[1]).toHaveFocus()
  expect(screen.getByText("Upload fixture")).toHaveAttribute("data-current", "")
  expect(screen.getByText("Upload fixture")).toHaveAttribute("data-org", "org-a")
})

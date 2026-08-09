import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { updateItemFromFormAction } from "@/actions/item/items"
import type { ItemEditDTO } from "@/services/item/item.service"
import ModernItemFormForEditing from "../ModernItemFormForEditing"

jest.mock("@/actions/item/items", () => ({
  updateItemFromFormAction: jest.fn(),
}))
jest.mock("lucide-react", () => {
  const Icon = ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
    <span aria-hidden={ariaHidden ?? true} />
  )
  return {
    AlertCircle: Icon,
    ArrowLeft: Icon,
    Boxes: Icon,
    Check: Icon,
    CheckCircle2: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    CircleDollarSign: Icon,
    ImageIcon: Icon,
    Loader2: Icon,
    PackageCheck: Icon,
    Save: Icon,
    ScanBarcode: Icon,
    Shapes: Icon,

  }
})
jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}))
jest.mock("@/components/FormInputs/EnhancedImageUploadButton", () => ({
  __esModule: true,
  default: (props: {
    setImageUrl: (url: string) => void
    onUploadStart?: () => void
    onUploadComplete?: () => void
    onUploadError?: () => void
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          props.onUploadStart?.()
          props.setImageUrl("/uploads/org-1/replacement.png")
          props.onUploadComplete?.()
        }}
      >
        Stage replacement image
      </button>
      <button
        type="button"
        onClick={() => {
          props.onUploadStart?.()
          props.onUploadError?.()
        }}
      >
        Fail replacement image
      </button>
    </div>
  ),
}))
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}))

const mockUpdate = updateItemFromFormAction as jest.Mock

const itemData: ItemEditDTO = {
  id: "item-1",
  organizationId: "org-1",
  nameEn: "Rice",
  nameFr: "Riz",
  descriptionEn: "Long grain",
  descriptionFr: null,
  imageUrls: "/uploads/org-1/rice.png",
  retainedImageUrls: [],
  thumbnail: "/uploads/org-1/rice.png",
  sku: "RICE-001",
  barcode: null,
  dimensions: "20 x 10 cm",
  weight: 5,
  costPrice: 20,
  sellingPrice: 30,
  msrp: 35,
  categoryId: null,
  brandId: null,
  unitId: null,
  taxRateId: null,
  trackInventory: true,
  minStockLevel: 5,
  maxStockLevel: 50,
  reorderLevel: 10,
  reorderQuantity: 20,
  isActive: true,
  isDiscontinued: false,
  trackSerialNumbers: false,
  trackBatches: false,
  trackExpiry: false,
  updatedAt: "2026-08-05T10:00:00.000Z",
}

function renderEditor(overrides?: { onCancel?: jest.Mock; onSaved?: jest.Mock }) {
  const onCancel = overrides?.onCancel ?? jest.fn()
  const onSaved = overrides?.onSaved ?? jest.fn()
  render(
    <ModernItemFormForEditing
      itemData={itemData}
      initialBrandData={[]}
      initialUnitData={[]}
      initialTaxRateData={[]}
      initialCategoryData={[]}
      onCancel={onCancel}
      onSaved={onSaved}
    />,
  )
  return { onCancel, onSaved }
}

describe("ModernItemFormForEditing", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Element.prototype.scrollIntoView = jest.fn()
  })

  it("renders a complete dedicated-page editor with no placeholder sections", () => {
    renderEditor()

    expect(screen.getByRole("form", { name: "Edit inventory item" })).toBeInTheDocument()
    for (const heading of [
      "Basic information & image",
      "Identity & physical details",
      "Pricing & tax",
      "Classification",
      "Inventory policy",
      "Lifecycle & tracking",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
    }

    const basicLayout = screen.getByTestId("basic-three-column-layout")
    const identityGrid = screen.getByTestId("identity-fields-grid")
    const fieldsRegion = screen.getByRole("region", { name: "Names and descriptions" })

    expect(screen.getByRole("region", { name: "Current item image" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Replacement image" })).toBeInTheDocument()
    expect(fieldsRegion).toHaveClass("md:col-span-2", "xl:col-span-1")
    expect(basicLayout).toHaveClass("xl:grid-cols-[minmax(220px,0.75fr)_minmax(240px,0.95fr)_minmax(0,1.45fr)]")
    expect(identityGrid).toHaveClass("lg:grid-cols-4")
    for (const label of ["UPC", "EAN", "MPN", "ISBN", "Color", "Size"]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/Tab content for/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("uses the canonical dashboard theme and semantic status colors", () => {
    renderEditor()

    const form = screen.getByRole("form", { name: "Edit inventory item" })
    const nameInput = screen.getByLabelText(/English name/)

    expect(form.closest(".dashboard-landing-theme")).toHaveClass("dark")
    expect(nameInput).toHaveClass("dashboard-control")
    expect(screen.getByText("All changes saved")).toHaveClass("text-[var(--dash-success)]")

    fireEvent.change(nameInput, { target: { value: "Updated rice" } })

    expect(screen.getByText("Unsaved changes")).toHaveClass("text-[var(--dash-warning)]")
    expect(screen.getByText("Unsaved changes")).not.toHaveClass("text-[var(--dash-danger)]")
  })


  it("stacks the responsive section navigator above the editor and tracks the active section", () => {
    renderEditor()

    const navigation = screen.getByRole("navigation", { name: "Edit item sections" })
    const basicHeading = screen.getByRole("heading", { name: "Basic information & image" })
    const basicButton = screen.getByRole("button", { name: "Basic information" })
    const identityButton = screen.getByRole("button", { name: "Identity" })

    expect(navigation.compareDocumentPosition(basicHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(basicButton).toHaveAttribute("aria-current", "step")

    fireEvent.click(identityButton)

    expect(identityButton).toHaveAttribute("aria-current", "step")
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })
  it("does not persist on load, field change, section navigation, or Enter", () => {
    renderEditor()

    expect(mockUpdate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Identity" }))
    fireEvent.change(screen.getByLabelText(/English name/), { target: { value: "Updated rice" } })
    fireEvent.keyDown(screen.getByLabelText(/English name/), { key: "Enter", code: "Enter" })

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
  })

  it("blocks invalid data without invoking the update action", async () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText(/English name/), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(await screen.findByText("Review the highlighted fields. Nothing has been saved.")).toBeInTheDocument()
    expect(screen.getByLabelText(/English name/)).toHaveValue("")
  })

  it("invokes exactly one update from an explicit save click", async () => {
    const onSaved = jest.fn()
    let resolveUpdate: ((value: {
      success: true
      data: ItemEditDTO
      message: string
    }) => void) | undefined
    mockUpdate.mockReturnValue(new Promise((resolve) => {
      resolveUpdate = resolve
    }))
    renderEditor({ onSaved })

    fireEvent.change(screen.getByLabelText(/English name/), { target: { value: "Updated rice" } })
    const saveButton = screen.getByRole("button", { name: "Save changes" })
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
    resolveUpdate?.({
      success: true,
      data: {
        ...itemData,
        nameEn: "Updated rice",
        updatedAt: "2026-08-05T10:05:00.000Z",
      },
      message: "Item updated successfully",
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it("preserves recoverable form state when saving fails", async () => {
    mockUpdate.mockResolvedValue({
      success: false,
      error: "The save service is temporarily unavailable.",
    })
    renderEditor()

    fireEvent.change(screen.getByLabelText(/English name/), { target: { value: "Recoverable rice" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("The save service is temporarily unavailable.")).toBeInTheDocument()
    expect(screen.getByLabelText(/English name/)).toHaveValue("Recoverable rice")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
  })

  it("stages an image replacement and persists it only on explicit save", async () => {
    mockUpdate.mockResolvedValue({
      success: true,
      data: {
        ...itemData,
        imageUrls: "/uploads/org-1/replacement.png",
        thumbnail: "/uploads/org-1/replacement.png",
      },
      message: "Item updated successfully",
    })
    renderEditor()

    fireEvent.click(screen.getByRole("button", { name: "Stage replacement image" }))
    expect(mockUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: "/uploads/org-1/replacement.png",
          thumbnail: "/uploads/org-1/replacement.png",
        }),
      )
    })
  })

  it("keeps the current image and form state after an upload failure", () => {
    renderEditor()

    fireEvent.click(screen.getByRole("button", { name: "Fail replacement image" }))

    expect(screen.getByText("The replacement image upload failed. The current item image is unchanged.")).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("requires confirmation before discarding unsaved changes", () => {
    const onCancel = jest.fn()
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderEditor({ onCancel })

    fireEvent.change(screen.getByLabelText(/English name/), { target: { value: "Unsaved rice" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })
})
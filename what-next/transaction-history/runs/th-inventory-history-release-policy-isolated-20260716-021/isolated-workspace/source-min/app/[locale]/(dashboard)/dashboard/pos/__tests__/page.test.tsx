import { render, screen } from "@testing-library/react"

import { checkPermission } from "@/config/useAuth"

import POSPage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

const mockProfessionalPOSSystem = jest.fn(() => <section>POS shell rendered</section>)

jest.mock("@/components/pos/ProfessionalPOSSystem", () => ({
  __esModule: true,
  default: () => mockProfessionalPOSSystem(),
}))

const mockCheckPermission = checkPermission as jest.Mock

describe("POSPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
  })

  it("requires POS operation permission before rendering the POS shell", async () => {
    render(await POSPage())

    expect(mockCheckPermission).toHaveBeenCalledWith("OPERATE_POS")
    expect(mockProfessionalPOSSystem).toHaveBeenCalledTimes(1)
    expect(screen.getByText("POS shell rendered")).toBeInTheDocument()
  })

  it("stops before rendering the POS shell when the permission guard denies access", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(POSPage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("OPERATE_POS")
    expect(mockProfessionalPOSSystem).not.toHaveBeenCalled()
  })
})

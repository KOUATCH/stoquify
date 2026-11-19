import { fireEvent, render, screen } from "@testing-library/react"
import { EnquiryForm } from "../enquiry-form"
import { enquiryInterest, enquiryMailto, formatEnquiry } from "../enquiry-brief"
import { getPublicContact, publicMetadata } from "@/lib/public-site"

let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...props }: any) => <a href={`/${mockLocale}${href}`} {...props}>{children}</a> }))
const empty = { email: null, bookingUrl: null, company: null, privacyUrl: null, termsUrl: null }
const brief = { interest: "finance" as const, organization: "A & B", country: "Cameroun", team: "1–10", locations: "2", priorities: "Stocks\nPaie?" }

test.each(["en", "fr"])("enquiry preserves interest and remains honest without a destination in %s", locale => {
  mockLocale = locale
  const { container } = render(<EnquiryForm contact={empty} interest="accounting-firm" />)
  expect(screen.getAllByRole("combobox")[0]).toHaveValue("accounting-firm")
  expect(container.querySelector('button[type="submit"]')).toBeNull()
  expect(screen.getByText(locale === "fr" ? /Les demandes en ligne ne sont pas encore disponibles/ : /Online enquiries are not available yet/)).toBeInTheDocument()
  const url = jest.fn(() => "blob:brief")
  URL.createObjectURL = url
  URL.revokeObjectURL = jest.fn()
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  fireEvent.change(screen.getByLabelText(locale === "fr" ? "Organisation" : "Organization"), { target: { value: "Example" } })
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Enregistrer mon projet" : "Save my brief" }))
  expect(url).toHaveBeenCalledWith(expect.any(Blob))
  expect(click).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Il n’a pas été envoyé" : "It has not been sent")
  click.mockRestore()
})

test("configured enquiry exposes the approved destination and encodes the complete draft", () => {
  mockLocale = "en"
  render(<EnquiryForm contact={{ ...empty, email: "sales@example.test" }} interest="finance" />)
  expect(screen.getByRole("button", { name: "Open enquiry email" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "sales@example.test" })).toHaveAttribute("href", "mailto:sales@example.test")
  const target = new URL(enquiryMailto("sales@example.test", brief, "fr"))
  expect(target.protocol).toBe("mailto:")
  expect(target.searchParams.get("body")).toBe(formatEnquiry(brief, "fr"))
  expect(target.searchParams.get("subject")).toContain("demande de devis")
  expect(target.searchParams.has("cc")).toBe(false)
  expect(enquiryInterest(["finance"])).toBe("unsure")
  expect(enquiryInterest("invalid")).toBe("unsure")
})

test("public information requires explicit valid configuration and metadata follows the locale", () => {
  const previous = { ...process.env }
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith("STOQUIFY_PUBLIC_")) delete process.env[key]
    expect(getPublicContact()).toEqual(empty)
    process.env.STOQUIFY_PUBLIC_ENQUIRY_EMAIL = "fake@example.test?cc=other@example.test"
    process.env.STOQUIFY_PUBLIC_PRIVACY_URL = "javascript:alert(1)"
    expect(getPublicContact().email).toBeNull()
    expect(getPublicContact().privacyUrl).toBeNull()
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test"
    const metadata = publicMetadata("fr")
    expect(metadata.title).toContain("Ventes, stocks")
    expect(metadata.alternates?.canonical).toBe("https://example.test/fr")
    expect(metadata.alternates?.languages).toEqual({ en: "https://example.test/en", fr: "https://example.test/fr" })
    const detail = publicMetadata("fr", "/products/hris", false, { title: "SIRH | Stoquify", description: "Dossiers du personnel" })
    expect(detail.title).toBe("SIRH | Stoquify")
    expect(detail.openGraph).toMatchObject({ title: detail.title, description: "Dossiers du personnel" })
    expect(detail.twitter).toMatchObject({ title: detail.title })
    expect(detail.alternates?.canonical).toBe("https://example.test/fr/products/hris")
    expect(detail.alternates?.languages).toEqual({ en: "https://example.test/en/products/hris", fr: "https://example.test/fr/products/hris" })
  } finally { process.env = previous }
})

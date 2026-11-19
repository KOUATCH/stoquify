import ProductRoute, { generateMetadata as productMetadata } from "@/app/[locale]/(home)/products/[module]/page"
import OfferRoute, { generateMetadata as offerMetadata } from "@/app/[locale]/(home)/offers/[offer]/page"
import { notFound } from "next/navigation"

jest.mock("@/components/landing/public-pages", () => ({ ProductPage: () => null, OfferPage: () => null }))
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND") }) }))

beforeEach(() => jest.clearAllMocks())

test.each(["en", "fr"])("invalid %s discovery metadata does not throw before the page can render its 404", async locale => {
  for (const id of ["missing", "__proto__", "constructor"]) {
    const product = await productMetadata({ params: Promise.resolve({ locale, module: id }) })
    const offer = await offerMetadata({ params: Promise.resolve({ locale, offer: id }) })
    expect(product.robots).toEqual({ index: false, follow: false })
    expect(offer.robots).toEqual({ index: false, follow: false })
    expect(product.title).toBe(locale === "fr" ? "Page introuvable | Stoquify" : "Page not found | Stoquify")
    expect(offer.title).toBe(product.title)
  }
  expect(notFound).not.toHaveBeenCalled()
  await expect(ProductRoute({ params: Promise.resolve({ module: "missing" }) })).rejects.toThrow("NOT_FOUND")
  await expect(OfferRoute({ params: Promise.resolve({ offer: "missing" }) })).rejects.toThrow("NOT_FOUND")
  expect(notFound).toHaveBeenCalledTimes(2)
})

test.each(["en", "fr"])("valid %s product and offer metadata stays specific and localized", async locale => {
  const product = await productMetadata({ params: Promise.resolve({ locale, module: "hris" }) })
  const offer = await offerMetadata({ params: Promise.resolve({ locale, offer: "people" }) })
  expect(product.title).toBe(locale === "fr" ? "Espace SIRH | Stoquify" : "HRIS workspace | Stoquify")
  expect(offer.title).toBe(locale === "fr" ? "Personnel et paie | Stoquify" : "People and Payroll | Stoquify")
  expect(notFound).not.toHaveBeenCalled()
})

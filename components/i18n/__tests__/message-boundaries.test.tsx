import fs from "node:fs"
import path from "node:path"
import { ApplicationMessages } from "../ApplicationMessages"
import LocaleLayout from "@/app/[locale]/layout"
import HomeLayout from "@/app/[locale]/(home)/layout"
import { getMessages, setRequestLocale } from "next-intl/server"

jest.mock("next-intl", () => ({ NextIntlClientProvider: "intl-provider" }))
jest.mock("next-intl/server", () => ({ getMessages: jest.fn(), setRequestLocale: jest.fn() }))
jest.mock("@/i18n/routing", () => ({ routing: { locales: ["en", "fr"] } }))
jest.mock("next/navigation", () => ({ notFound: () => { throw Error("NOT_FOUND") } }))
jest.mock("@/components/i18n/DocumentLanguage", () => ({ DocumentLanguage: () => null }))
jest.mock("@/lib/public-session", () => ({ getPublicSession: async () => null }))
jest.mock("@/lib/public-site", () => ({ getPublicContact: () => ({}) }))
jest.mock("@/components/landing/landing-header", () => ({ LandingHeader: () => null }))
jest.mock("@/components/landing/landing-footer", () => ({ LandingFooter: () => null }))
jest.mock("@/components/landing/cinematic-shell", () => ({ LandingRouteShell: () => null }))
jest.mock("@/app/[locale]/(home)/landing-fonts", () => ({ landingFontVars: "" }))

beforeEach(() => jest.clearAllMocks())

test.each(["en", "fr"])("%s public delivery excludes application messages while application delivery retains them", async locale => {
  const messages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"))
  const complete = { ...messages, paymentRequest: { preserved: "request" }, paymentExecution: { preserved: "execution" }, paymentPostingRecovery: { preserved: "recovery" } }
  jest.mocked(getMessages).mockResolvedValue(complete)
  const root = await LocaleLayout({ params: Promise.resolve({ locale }), children: null })
  expect(root.props.locale).toBe(locale)
  expect(root.props.messages).toEqual({})
  expect(setRequestLocale).toHaveBeenCalledWith(locale)
  const publicPage = await HomeLayout({ children: null })
  expect(Object.keys(publicPage.props.messages)).toEqual(["landing"])
  expect(publicPage.props.messages.landing).toEqual(messages.landing)
  expect(JSON.stringify(publicPage.props.messages).length).toBeLessThan(JSON.stringify(complete).length / 2)
  const application = await ApplicationMessages({ children: null })
  expect(application.props.messages).toBe(complete)
  // A later public render must not mutate the vocabulary used by another route.
  await HomeLayout({ children: null })
  expect((await ApplicationMessages({ children: null })).props.messages).toBe(complete)
})

test("invalid locales are rejected before a provider is returned", async () => {
  await expect(LocaleLayout({ params: Promise.resolve({ locale: "invalid" }), children: null })).rejects.toThrow("NOT_FOUND")
  expect(getMessages).not.toHaveBeenCalled()
})

test("every non-public locale route family owns a full-message boundary", () => {
  const root = path.join(process.cwd(), "app", "[locale]")
  const families = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith("_") && entry.name !== "(home)")
  expect(families.map(entry => entry.name)).toEqual(expect.arrayContaining(["(auth)", "(dashboard)", "supplier-purchase-order", "update"]))
  for (const family of families) {
    const source = fs.readFileSync(path.join(root, family.name, "layout.tsx"), "utf8")
    expect(source).toContain("ApplicationMessages")
  }
})

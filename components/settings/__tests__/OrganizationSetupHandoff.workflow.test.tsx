import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useRef, useState } from "react"
import OrganizationSetupHandoff from "../OrganizationSetupHandoff"
jest.mock("@/i18n/navigation", () => ({ Link: ({ href, locale, children, ...props }: any) => <a href={`/${locale}${href}`} {...props}>{children}</a> }))
jest.mock("lucide-react", () => ({ ExternalLink: (props: any) => <svg {...props} />, X: (props: any) => <svg {...props} /> }))
it("returns keyboard focus to the actual opener after Escape", async () => {
  function Harness() { const [open, setOpen] = useState(false), trigger = useRef<HTMLButtonElement>(null); return <><button ref={trigger} onClick={() => setOpen(true)}>Start setup</button><OrganizationSetupHandoff open={open} onOpenChange={setOpen} locale="en" returnFocus={trigger} /></> }
  render(<Harness />)
  fireEvent.click(screen.getByRole("button", { name: "Start setup" }))
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  await waitFor(() => expect(screen.getByRole("button", { name: "Start setup" })).toHaveFocus())
})

it.each(["en", "fr"] as const)("explains the owner/account boundary and opens the existing %s registration", locale => {
  const change = jest.fn()
  render(<OrganizationSetupHandoff open onOpenChange={change} locale={locale} />)
  const registration = screen.getByRole("link", { name: locale === "fr" ? /Ouvrir l’inscription du propriétaire/ : /Open owner registration/ })
  expect(registration).toHaveAttribute("href", `/${locale}/register-v2`)
  expect(registration).toHaveAttribute("target", "_blank")
  expect(registration).toHaveAttribute("rel", "noopener noreferrer")
  expect(registration).toHaveAccessibleName(locale === "fr" ? /nouvel onglet/ : /new tab/)
  expect(screen.getByText(locale === "fr" ? /adresse email non encore inscrite/ : /email address that is not already registered/)).toBeVisible()
  expect(screen.getByText(locale === "fr" ? /compte actif dans les onglets/ : /active account across browser tabs/)).toBeVisible()
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
})
it.each(["en", "fr"] as const)("provides a localized sign-in handoff without switching automatically: %s", locale => {
  render(<OrganizationSetupHandoff open onOpenChange={jest.fn()} locale={locale} />)
  const login = screen.getByRole("link", { name: locale === "fr" ? /Se connecter à une organisation existante/ : /Sign in to an existing organization/ })
  expect(login).toHaveAttribute("href", `/${locale}/login-v2`)
  expect(login).toHaveAttribute("target", "_blank")
  expect(login).toHaveAttribute("rel", "noopener noreferrer")
})
it.each(["en", "fr"] as const)("closes without creating records or collecting another owner's password: %s", locale => {
  const change = jest.fn()
  render(<OrganizationSetupHandoff open onOpenChange={change} locale={locale} />)
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Revenir à cette organisation" : "Back to this organization", exact: true }))
  expect(change).toHaveBeenCalledWith(false)
})

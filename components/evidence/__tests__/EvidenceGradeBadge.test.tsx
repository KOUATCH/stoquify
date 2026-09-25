import { render, screen } from "@testing-library/react"
import { EvidenceGradeBadge } from "../EvidenceGradeBadge"

describe("Evidence grade text", () => {
  it.each([
    ["en", "Raw", "evidence:", "Source is not reviewed"],
    ["fr", "Brut", "preuve:", "Source non examinée"],
  ])("exposes the grade and explanation as readable text in %s", (locale, label, prefix, reason) => {
    const { container } = render(<EvidenceGradeBadge grade="raw" locale={locale} reason={reason} />)
    const badge = container.firstElementChild!
    expect(badge.textContent).toBe(`${prefix} ${label}. ${reason}`)
    expect(badge).not.toHaveAttribute("aria-label")
    expect(badge).not.toHaveAttribute("role")
    expect(badge).not.toHaveAttribute("tabindex")
    expect(screen.getByText(label)).toBeVisible()
    expect(badge).toHaveAttribute("title", reason)
    expect(container.querySelector('[aria-hidden="true"]')).not.toHaveTextContent(/\S/)
  })

  it("does not invent review evidence when no explanation exists", () => {
    const { container } = render(<EvidenceGradeBadge grade="blocked" />)
    expect(container.firstElementChild?.textContent).toBe("evidence: Blocked")
    expect(container.firstElementChild).not.toHaveAttribute("title")
  })
})

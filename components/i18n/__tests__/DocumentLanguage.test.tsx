import { render } from "@testing-library/react"
import { DocumentLanguage } from "../DocumentLanguage"

it("updates the document language across locale changes without remounting the root", () => {
  const previous = document.documentElement.lang
  try {
    document.documentElement.lang = "en"
    const { rerender, container } = render(<DocumentLanguage locale="fr" />)
    expect(document.documentElement.lang).toBe("fr")
    expect(container).toBeEmptyDOMElement()
    rerender(<DocumentLanguage locale="en" />)
    expect(document.documentElement.lang).toBe("en")
    rerender(<DocumentLanguage locale="fr" />)
    expect(document.documentElement.lang).toBe("fr")
  } finally {
    document.documentElement.lang = previous
  }
})

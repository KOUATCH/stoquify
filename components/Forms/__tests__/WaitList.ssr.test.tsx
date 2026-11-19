/** @jest-environment node */
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import WaitList from "../WaitList"

test("waitlist imports and renders on the server without browser globals", () => {
  expect(typeof document).toBe("undefined")
  const html = renderToStaticMarkup(<WaitList />)
  expect(html).toContain('type="email"')
  expect(html).toContain("@keyframes gradient")
  expect(html).toContain("@keyframes fade-in")
})

import { act, fireEvent, render, screen } from "@testing-library/react"
import { JourneyPreview } from "../journey-preview"
import type { LandingWorkflow } from "../landing-workflow-library"

let mockMotionOff = false
let mockLocale = "en"
let intersect: (entries: { isIntersecting: boolean }[]) => void
const disconnect = jest.fn()
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("../cinematic-shell", () => ({ useCinematicMotionOff: () => mockMotionOff }))
const workflow = {
  id: "accountant-review", steps: ["Collect records", "Review exceptions", "Resolve findings", "Prepare close"],
  controls: ["Keep the review trail"],
} as LandingWorkflow

beforeEach(() => {
  jest.useFakeTimers()
  mockMotionOff = false
  mockLocale = "en"
  global.IntersectionObserver = jest.fn().mockImplementation(callback => {
    intersect = callback
    return { observe: jest.fn(), disconnect }
  })
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
const tick = () => act(() => jest.advanceTimersByTime(6000))
const enter = (isIntersecting = true) => act(() => intersect([{ isIntersecting }]))

test.each(["focus", "hover"])("entering a journey with %s pauses automatic progress until explicitly restarted", input => {
  const { container } = render(<JourneyPreview workflow={workflow} active />)
  enter()
  if (input === "focus") fireEvent.focus(screen.getByRole("button", { name: /Collect records/ }), { relatedTarget: document.body })
  else fireEvent.mouseEnter(container.firstChild!)
  tick()
  expect(container.firstChild).toHaveAttribute("data-step", "0")
  expect(container.firstChild).toHaveAttribute("data-playing", "false")
  fireEvent.click(screen.getByRole("button", { name: "Play workflow" }))
  tick()
  expect(container.firstChild).toHaveAttribute("data-step", "1")
})

test("only plays the selected, visible journey and resets when switching away", () => {
  const { container, rerender, unmount } = render(<JourneyPreview workflow={workflow} active />)
  const preview = container.firstChild
  tick()
  expect(preview).toHaveAttribute("data-step", "0")
  enter()
  tick()
  expect(preview).toHaveAttribute("data-step", "1")
  enter(false)
  tick()
  expect(preview).toHaveAttribute("data-step", "1")
  enter()
  const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true)
  fireEvent(document, new Event("visibilitychange"))
  tick()
  expect(preview).toHaveAttribute("data-step", "1")
  hidden.mockReturnValue(false)
  fireEvent(document, new Event("visibilitychange"))
  tick()
  expect(preview).toHaveAttribute("data-step", "2")
  rerender(<JourneyPreview workflow={workflow} active={false} />)
  tick()
  expect(preview).toHaveAttribute("data-step", "0")
  expect(preview).toHaveAttribute("data-playing", "false")
  unmount()
  expect(disconnect).toHaveBeenCalled()
  expect(jest.getTimerCount()).toBe(0)
})

test.each(["en", "fr"])("manual selection, pause, next and replay work in %s", locale => {
  mockLocale = locale
  const { container } = render(<JourneyPreview workflow={workflow} active />)
  const preview = container.firstChild
  enter()
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Mettre le parcours en pause" : "Pause workflow" }))
  tick()
  expect(preview).toHaveAttribute("data-step", "0")
  fireEvent.click(screen.getByRole("button", { name: /Resolve findings/ }))
  tick()
  expect(preview).toHaveAttribute("data-step", "2")
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Étape suivante" : "Next step" }))
  expect(preview).toHaveAttribute("data-step", "3")
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Lire le parcours" : "Play workflow" }))
  tick()
  expect(preview).toHaveAttribute("data-step", "0")
  act(() => jest.advanceTimersByTime(3000))
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Rejouer le parcours" : "Replay workflow" }))
  act(() => jest.advanceTimersByTime(3000))
  expect(preview).toHaveAttribute("data-step", "0")
  act(() => jest.advanceTimersByTime(3000))
  expect(preview).toHaveAttribute("data-step", "1")
})

test("global pause or reduced motion stops playback but keeps manual steps available", () => {
  const { container, rerender } = render(<JourneyPreview workflow={workflow} active />)
  enter()
  tick()
  mockMotionOff = true
  rerender(<JourneyPreview workflow={workflow} active />)
  tick()
  expect(container.firstChild).toHaveAttribute("data-step", "1")
  expect(screen.getByRole("button", { name: "Play workflow" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: /Prepare close/ }))
  expect(container.firstChild).toHaveAttribute("data-step", "3")
  fireEvent.click(screen.getByRole("button", { name: "Replay workflow" }))
  tick()
  expect(container.firstChild).toHaveAttribute("data-step", "0")
})

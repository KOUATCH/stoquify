import { act, fireEvent, render } from "@testing-library/react"
import { WorkflowDetails } from "../workflow-details"

let mockMotionOff = false
jest.mock("../cinematic-shell", () => ({ useCinematicMotionOff: () => mockMotionOff }))

beforeEach(() => { mockMotionOff = false })

function setup() {
  const view = render(<WorkflowDetails summary="Explore the steps"><a href="#record">Open record</a></WorkflowDetails>)
  const details = view.container.querySelector("details")!
  const summary = view.container.querySelector("summary")!
  const content = view.container.querySelector<HTMLDivElement>(".workflow-details-content")!
  const animations: Array<{ cancel: jest.Mock; onfinish: (() => void) | null }> = []
  const bounds = details.getBoundingClientRect()
  jest.spyOn(details, "getBoundingClientRect").mockImplementation(() => ({ ...bounds, height: details.open ? 600 : 48 }))
  jest.spyOn(summary, "getBoundingClientRect").mockReturnValue({ ...bounds, height: 48 })
  details.animate = jest.fn(() => {
    const animation = { cancel: jest.fn(), onfinish: null as (() => void) | null }
    animations.push(animation)
    return animation as unknown as Animation
  })
  return { ...view, details, summary, content, animations }
}

it("animates opening and closing, then returns to natural layout", () => {
  const { details, summary, content, animations } = setup()
  fireEvent.click(summary)
  expect(details.open).toBe(true)
  expect(summary).toHaveAttribute("aria-expanded", "true")
  expect(details.animate).toHaveBeenLastCalledWith([{ height: "48px" }, { height: "600px" }], expect.objectContaining({ duration: 320 }))
  act(() => animations[0].onfinish?.())
  expect(details.style.overflow).toBe("")
  fireEvent.click(summary)
  expect(details.open).toBe(true)
  expect(summary).toHaveAttribute("aria-expanded", "false")
  expect(content.inert).toBe(true)
  expect(content).toHaveAttribute("aria-hidden", "true")
  expect(details.animate).toHaveBeenLastCalledWith([{ height: "600px" }, { height: "48px" }], expect.anything())
  act(() => animations[1].onfinish?.())
  expect(details.open).toBe(false)
  expect(details.style.overflow).toBe("")
})

it("reverses an interrupted transition from its current visible height", () => {
  const { details, summary, content, animations } = setup()
  fireEvent.click(summary)
  jest.mocked(details.getBoundingClientRect).mockReturnValue({ ...details.getBoundingClientRect(), height: 240 })
  fireEvent.click(summary)
  expect(animations[0].cancel).toHaveBeenCalled()
  expect(animations[0].onfinish).toBeNull()
  expect(details.animate).toHaveBeenLastCalledWith([{ height: "240px" }, { height: "48px" }], expect.anything())
  fireEvent.click(summary)
  expect(animations[1].cancel).toHaveBeenCalled()
  expect(content.inert).toBe(false)
  expect(summary).toHaveAttribute("aria-expanded", "true")
  act(() => animations[2].onfinish?.())
  expect(details.open).toBe(true)
})

it("settles immediately when motion is disabled during a collapse", () => {
  const { details, summary, animations, rerender } = setup()
  fireEvent.click(summary)
  act(() => animations[0].onfinish?.())
  fireEvent.click(summary)
  mockMotionOff = true
  rerender(<WorkflowDetails summary="Explore the steps"><a href="#record">Open record</a></WorkflowDetails>)
  expect(animations[1].cancel).toHaveBeenCalled()
  expect(details.open).toBe(false)
  fireEvent.click(summary)
  expect(details.open).toBe(true)
  expect(details.animate).toHaveBeenCalledTimes(2)
})

it("cancels active animation callbacks when the guide unmounts", () => {
  const { summary, animations, unmount } = setup()
  fireEvent.click(summary)
  unmount()
  expect(animations[0].cancel).toHaveBeenCalled()
  expect(animations[0].onfinish).toBeNull()
})

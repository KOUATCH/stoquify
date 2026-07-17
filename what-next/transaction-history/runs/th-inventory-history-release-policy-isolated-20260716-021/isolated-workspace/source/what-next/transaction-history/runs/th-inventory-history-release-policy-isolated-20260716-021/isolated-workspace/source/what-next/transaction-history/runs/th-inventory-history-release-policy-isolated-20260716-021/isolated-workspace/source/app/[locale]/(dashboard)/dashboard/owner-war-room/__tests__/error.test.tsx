import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

import OwnerWarRoomError from "../error"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

describe("OwnerWarRoomError", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it("uses the shared dashboard retry state without leaking the route error", () => {
    render(<OwnerWarRoomError error={new Error("cash drawer secret mismatch")} reset={jest.fn()} />)

    expect(screen.getByRole("heading", { name: "Owner War Room could not load" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByText(/cash drawer secret mismatch/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledTimes(1)
  })
})

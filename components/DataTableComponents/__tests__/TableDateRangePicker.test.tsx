import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"

import {
  TableDateRangePicker,
  type TableDateRangeValue,
} from "../TableDateRangePicker"

jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return (props: Record<string, unknown>) => React.createElement("svg", props)
      },
    },
  )
})

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect: (range: { from: Date; to: Date }) => void
  }) => (
    <button
      type="button"
      onClick={() => onSelect({
        from: new Date(2026, 7, 3),
        to: new Date(2026, 7, 5),
      })}
    >
      Select August range
    </button>
  ),
}))

function ControlledHarness() {
  const [range, setRange] = useState<TableDateRangeValue>({})
  return (
    <form>
      <TableDateRangePicker
        value={range}
        onChange={setRange}
        fromName="from"
        toName="to"
      />
    </form>
  )
}

describe("TableDateRangePicker", () => {
  it("publishes one controlled inclusive range and form query values", () => {
    const { container } = render(<ControlledHarness />)

    fireEvent.click(screen.getByRole("button", { name: "Select August range" }))

    expect(screen.getByRole("button", { name: "Date range" })).toHaveTextContent(
      "Aug 03, 2026 - Aug 05, 2026",
    )
    expect(container.querySelector<HTMLInputElement>('input[name="from"]')).toHaveValue("2026-08-03")
    expect(container.querySelector<HTMLInputElement>('input[name="to"]')).toHaveValue("2026-08-05")
  })

  it("uses the localized French placeholder", () => {
    render(<TableDateRangePicker locale="fr" />)

    expect(screen.getByRole("button", { name: "Période" })).toBeInTheDocument()
  })
})

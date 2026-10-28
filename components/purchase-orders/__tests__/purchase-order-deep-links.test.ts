import { resolveReceiveDeepLink } from "@/components/purchase-orders/purchase-order-deep-links"

describe("purchase-order receive deep link", () => {
  it("opens the receive workflow only when the server-derived capability allows it", () => {
    expect(resolveReceiveDeepLink("receive", { allowed: true, reason: null })).toEqual({
      open: true,
      explanation: null,
    })
  })

  it("returns the server prerequisite explanation when receiving is unavailable", () => {
    expect(
      resolveReceiveDeepLink("receive", {
        allowed: false,
        reason: "This action requires the purchases.orders.receive permission.",
      }),
    ).toEqual({
      open: false,
      explanation: "This action requires the purchases.orders.receive permission.",
    })
  })
})

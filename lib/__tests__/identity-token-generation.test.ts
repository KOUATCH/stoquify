jest.mock("server-only", () => ({}))
jest.mock("node:crypto", () => {
  const actual = jest.requireActual("node:crypto")
  return { ...actual, randomInt: jest.fn(actual.randomInt) }
})

import { randomInt } from "node:crypto"
import { generateToken } from "../token"
import { generateOtp } from "../generateOtp"

const secureRandomInt = randomInt as jest.Mock

describe("identity secret generation", () => {
  afterEach(() => { jest.restoreAllMocks(); secureRandomInt.mockReset(); secureRandomInt.mockImplementation(jest.requireActual("node:crypto").randomInt) })

  it("preserves reset-link and OTP formats without using Math.random", () => {
    jest.spyOn(Math, "random").mockImplementation(() => { throw new Error("insecure random source") })
    expect(generateToken()).toMatch(/^[a-z0-9]{32}$/)
    expect(generateOtp()).toMatch(/^\d{6}$/)
    expect(Math.random).not.toHaveBeenCalled()
  })

  it("retains zero-padded and upper-bound verification codes", () => {
    secureRandomInt.mockReturnValueOnce(0).mockReturnValueOnce(999999)
    expect(generateOtp()).toBe("000000")
    expect(generateOtp()).toBe("999999")
  })

  it("fails instead of falling back when the secure random source fails", () => {
    secureRandomInt.mockImplementation(() => { throw new Error("secure source unavailable") })
    expect(generateToken).toThrow("secure source unavailable")
    expect(generateOtp).toThrow("secure source unavailable")
  })
})

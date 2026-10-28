import {
  isProductionDeployment,
  resolveRegulatoryExecutionMode,
} from "../regulatory-runtime-class"

describe("regulatory runtime classification", () => {
  it("forces production mode in a production deployment", () => {
    expect(
      resolveRegulatoryExecutionMode("SANDBOX", {
        NODE_ENV: "production",
      }),
    ).toBe("PRODUCTION")
  })

  it("allows sandbox mode outside production", () => {
    expect(
      resolveRegulatoryExecutionMode(undefined, {
        NODE_ENV: "test",
      }),
    ).toBe("SANDBOX")
  })

  it("recognizes explicit deployment class before framework environment", () => {
    expect(
      isProductionDeployment({
        AQSTOQFLOW_DEPLOYMENT_CLASS: "production",
        NODE_ENV: "test",
      }),
    ).toBe(true)
  })
})

import "@testing-library/jest-dom"
jest.mock("server-only", () => ({}))
jest.mock("next-intl/routing", () => ({defineRouting: (config: unknown) => config}))

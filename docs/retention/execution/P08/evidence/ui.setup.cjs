// Match the existing route tests: only the ESM routing-definition boundary is
// mocked. Real localizePath and the dashboard components still execute.
jest.mock('next-intl/routing', () => ({ defineRouting: config => config }))

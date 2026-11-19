jest.mock("@/lib/security/server-authz", () => {
  throw new Error("Public upload metadata must not initialize authorization")
})
jest.mock("@/services/_shared/action-errors", () => {
  throw new Error("Public upload metadata must not load Prisma through error handling")
})
jest.mock("uploadthing/next", () => ({ createUploadthing: () => () => {
  const builder: { middleware: () => unknown; onUploadComplete: () => unknown } = { middleware: () => builder, onUploadComplete: () => builder }
  return builder
} }))

test("root-layout upload metadata can load without the permission/database graph", async () => {
  const { ourFileRouter } = await import("../core")
  expect(Object.keys(ourFileRouter)).toEqual(["itemImageUpload"])
})

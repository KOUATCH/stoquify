jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), organization: { create: jest.fn(), findUnique: jest.fn() } } }))
import { db } from "@/prisma/db"
import { canCreateOrganizations, createOrganizationForSettings } from "../organization-settings.service"

beforeEach(() => jest.clearAllMocks())
it.each([{ name: "Another company" }, { name: "" }, { name: "New company", slug: "existing-company" }])("does not create an ownerless tenant through the legacy settings service", async input => {
  await expect(createOrganizationForSettings(input)).rejects.toMatchObject({ code: "INVALID_TRANSITION", message: "Create the owner account and organization together through owner registration." })
  expect(db.$transaction).not.toHaveBeenCalled()
  expect(db.organization.create).not.toHaveBeenCalled()
  expect(db.organization.findUnique).not.toHaveBeenCalled()
})
it.each([[], ["system.organization.update"], ["*"], ["organizations.create", "organizations.manage"]].map(permissions => ({ permissions })))("does not infer owner provisioning from settings authority", ({ permissions }) => {
  expect(canCreateOrganizations({ permissions })).toBe(false)
})

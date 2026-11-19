const context = {
    orgId: "tenant",
    userId: "actor",
    permissions: ["hris.people.manage"],
    freshAuth: { claims: { userId: "actor", tenantId: "tenant" } },
  },
  options: any[] = [];
jest.mock("@/services/_shared/protect", () => ({
  protect: (config: any, handler: any) => async (input: any) => {
    options.push(config);
    return handler(input, context);
  },
}));
jest.mock("@/services/hris/employee-import.service", () => ({
  previewEmployeeImport: jest.fn().mockResolvedValue({}),
  commitEmployeeImport: jest.fn().mockResolvedValue({}),
  getEmployeeImportReceipt: jest.fn().mockResolvedValue({}),
  downloadEmployeeImportErrors: jest.fn().mockResolvedValue({}),
  getEmployeeImportTemplate: jest.fn().mockResolvedValue({}),
}));
import {
  previewEmployeeImportAction,
  commitEmployeeImportAction,
  getEmployeeImportReceiptAction,
  downloadEmployeeImportErrorsAction,
} from "../employee-import.actions";
import {
  previewEmployeeImport,
  commitEmployeeImport,
  getEmployeeImportReceipt,
  downloadEmployeeImportErrors,
} from "@/services/hris/employee-import.service";
beforeEach(() => {
  jest.clearAllMocks();
  options.length = 0;
  context.freshAuth.claims = { userId: "actor", tenantId: "tenant" };
});
test.each([
  [previewEmployeeImportAction, previewEmployeeImport],
  [commitEmployeeImportAction, commitEmployeeImport],
])(
  "writer derives actor and enforced module independently of uploaded claims",
  async (action, owner) => {
    const input = {
      actorId: "forged",
      organizationId: "foreign",
      actorPermissions: ["*"],
      content: "synthetic",
    };
    await action(input);
    expect(owner).toHaveBeenCalledWith(
      {
        organizationId: "tenant",
        actorId: "actor",
        actorPermissions: ["hris.people.manage"],
      },
      input,
    );
    expect(options[0]).toMatchObject({
      permission: "hris.people.manage",
      freshAuth: true,
      tenantGuard: "handler-derived",
      module: { mode: "enforce", accessIntent: "write" },
    });
  },
);
test("receipt and error downloads require fresh scoped reads", async () => {
  await getEmployeeImportReceiptAction({
    idempotencyKey: "key",
    organizationId: "foreign",
  });
  await downloadEmployeeImportErrorsAction({
    previewId: "preview",
    actorId: "forged",
  });
  expect(getEmployeeImportReceipt).toHaveBeenCalledWith(
    expect.objectContaining({ organizationId: "tenant", actorId: "actor" }),
    "key",
  );
  expect(downloadEmployeeImportErrors).toHaveBeenCalledWith(
    expect.objectContaining({ organizationId: "tenant", actorId: "actor" }),
    "preview",
  );
  expect(
    options.every(
      (o) =>
        o.freshAuth &&
        o.module.mode === "enforce" &&
        o.module.accessIntent === "read",
    ),
  ).toBe(true);
});
test.each(["userId", "tenantId"])(
  "changed fresh %s rejects writes and downloads",
  async (field) => {
    context.freshAuth.claims[field as "userId"] = "foreign";
    await expect(commitEmployeeImportAction({})).rejects.toThrow(
      "session changed",
    );
    await expect(downloadEmployeeImportErrorsAction({})).rejects.toThrow(
      "session changed",
    );
    expect(commitEmployeeImport).not.toHaveBeenCalled();
    expect(downloadEmployeeImportErrors).not.toHaveBeenCalled();
  },
);

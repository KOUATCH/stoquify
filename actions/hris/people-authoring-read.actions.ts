"use server";
import { protect } from "@/services/_shared/protect";
import { getPeopleAuthoring } from "@/services/hris/people-authoring-read.service";
const read = protect<
  { employeeId?: string },
  Awaited<ReturnType<typeof getPeopleAuthoring>>
>(
  {
    permission: "hris.people.manage",
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "hris.people.authoring.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    getPeopleAuthoring(
      {
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
      },
      input.employeeId,
    ),
);
export async function getPeopleAuthoringAction(
  input: { employeeId?: string } = {},
) {
  return read(input);
}

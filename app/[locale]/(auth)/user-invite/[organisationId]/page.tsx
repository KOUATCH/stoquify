import InvitedUserRegistration from "@/components/Forms/InvitedUserRegistration";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import { db } from "@/prisma/db";
import { InviteStatus } from "@prisma/client";

const Page = async ({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

) => {

  const tokenParam = (await searchParams).token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const invite = token
    ? await db.invite.findUnique({
        where: { token },
        select: {
          email: true,
          status: true,
          expiresAt: true,
          organization: { select: { name: true } },
          role: { select: { nameEn: true, nameFr: true, code: true } },
        },
      })
    : null

  const isUsableInvite =
    invite?.status === InviteStatus.PENDING && invite.expiresAt > new Date()

  return (
    <GridBackground>
      <div className="px-4">
        <InvitedUserRegistration
          token={token ?? ""}
          email={isUsableInvite ? invite.email : ""}
          roleName={isUsableInvite ? invite.role.nameEn || invite.role.nameFr || invite.role.code : ""}
          organizationName={isUsableInvite ? invite.organization.name : "StockFlow"}
          isValidInvite={!!isUsableInvite}
        />
      </div>
    </GridBackground>
  );
}
export default Page

import InvitedUserRegistration from "@/components/Forms/InvitedUserRegistration";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import { getInviteRegistrationContext } from "@/services/users/user-identity.service";

const Page = async ({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

) => {

  const tokenParam = (await searchParams).token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const invite = await getInviteRegistrationContext(token)

  return (
    <GridBackground>
      <div className="px-4">
        <InvitedUserRegistration
          token={token ?? ""}
          email={invite.email}
          roleName={invite.roleName}
          organizationName={invite.organizationName}
          isValidInvite={invite.isValidInvite}
        />
      </div>
    </GridBackground>
  );
}
export default Page

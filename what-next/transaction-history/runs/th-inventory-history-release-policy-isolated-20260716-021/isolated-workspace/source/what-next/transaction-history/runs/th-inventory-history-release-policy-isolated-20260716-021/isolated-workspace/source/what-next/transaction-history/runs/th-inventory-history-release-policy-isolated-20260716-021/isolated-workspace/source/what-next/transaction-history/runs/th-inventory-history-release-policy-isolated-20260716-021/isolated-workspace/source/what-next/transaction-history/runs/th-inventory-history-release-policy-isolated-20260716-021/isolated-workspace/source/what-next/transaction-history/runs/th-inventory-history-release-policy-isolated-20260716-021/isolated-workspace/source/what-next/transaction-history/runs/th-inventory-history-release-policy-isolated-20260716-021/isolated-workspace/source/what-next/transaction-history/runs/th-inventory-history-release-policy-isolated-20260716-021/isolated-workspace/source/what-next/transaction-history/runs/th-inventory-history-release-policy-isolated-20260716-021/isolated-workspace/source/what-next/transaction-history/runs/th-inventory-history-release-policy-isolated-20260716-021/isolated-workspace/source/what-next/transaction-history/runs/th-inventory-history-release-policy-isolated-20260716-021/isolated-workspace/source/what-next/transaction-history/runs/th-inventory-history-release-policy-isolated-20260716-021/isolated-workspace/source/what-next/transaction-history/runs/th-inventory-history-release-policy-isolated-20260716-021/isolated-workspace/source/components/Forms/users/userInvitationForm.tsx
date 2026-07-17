"use client";

import { notify } from "@/lib/notifications/notify"
import { sendInvite } from "@/actions/users/sendInvite";
import FormSelectInput from "@/components/FormInputs/FormSelectInput";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { type ReactNode, useState } from "react";
export type InviteData = {
  email: string;
  roleId: string;
  organizationId: string;
  organizationName: string;
  name?: string;
  roleName?: string;
}
const UserInvitationForm = ({
  roles,
  organizationId,
  organizationName,
  triggerClassName,
  triggerIcon,
}: {
  roles: {
    label: string;
    value: string;
  }[];
  organizationId: string;
  organizationName: string;
  name?: string;
  email: string;
  roleName?: string;
  triggerClassName?: string;
  triggerIcon?: ReactNode;
}) => {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(roles[0]);
  // const router = useRouter();

  const sendInvitation = async () => {
    const data: InviteData = {
      email,
      roleId: selectedRole.value as string,
      organizationId,
      organizationName,
      name: selectedRole.label

    };
    setLoading(true);
    if (!email.trim()) {
      setErr("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await sendInvite(data);
      if (res.status !== 200) {
        setLoading(false);
        notify.error(res.error);
        setErr(res?.error ?? "")
        return
      }
      setLoading(false)
      setErr("")
      notify.success("Invitation sent to user", { description: "Invitation successfully sent" });
    } catch (error) {
      setLoading(false);
      notify.error("Something went wrong", { description: "Error found" });
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className={cn("gap-1", triggerClassName ?? "h-8")}>
          {triggerIcon ?? <UserPlus className="h-3.5 w-3.5" />}
          <span className="whitespace-nowrap">
            Invite user
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <Card className="w-full ">
          <CardHeader>
            <CardTitle>Send user invitaion</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex flex-col w-full gap-2">
              <Input
                type="email"
                placeholder="example, user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendInvitation()}
                className={cn(
                  "block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-rose-600 sm:text-sm sm:leading-6 text-sm",
                )}
              />
              {err && <p className="text-red-500 -mt-1">{err}</p>}
              <FormSelectInput
                label="User Roles"
                options={roles}
                option={selectedRole}
                setOption={setSelectedRole}
              />
              {loading ? (
                <Button disabled>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Please wait...
                </Button>
              ) : (
                <Button onClick={sendInvitation}>
                  <Plus className="mr-2 h-4 w-4" /> Invite User
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserInvitationForm

"use client";

import { notify } from "@/lib/notifications/notify"
import { createInvitedUser } from "@/actions/users/createInvitedUser";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/types/bilingual";
import { Headset, Loader2, Lock, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import PasswordInput from "../FormInputs/PasswordInput";
import SubmitButton from "../FormInputs/SubmitButton";
import TextInput from "../FormInputs/TextInput";
import CustomCarousel from "../frontend/custom-carousel";
import Logo from "../global/Logo";

export type OrgDataProps = {
  name: string;
  slug: string;
  country: string;
  currency: string | undefined;
  timezone: string | undefined;
}

type InvitedUserFormValues = {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  image?: string | null;
}

const InvitedUserRegistration = ({
  email,
  organizationName,
  roleName,
  token,
  isValidInvite,
}: {
  email: string
  organizationName: string
  roleName: string
  token: string
  isValidInvite: boolean
}) => {

  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useForm<InvitedUserFormValues>({
    defaultValues: {
      email
    }
  });
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const localizedHref = (href: string) => localizePath(href, locale);
  async function onSubmit(data: InvitedUserFormValues) {
    if (!isValidInvite) {
      setEmailErr("This invitation link is invalid or has expired");
      return;
    }

    setLoading(true);
    const payload = {
      ...data,
      image: "https://utfs.io/f/59b606d1-9148-4f50-ae1c-e9d02322e834-2558r.png",
      token,
    };
    try {
      const res = await createInvitedUser(payload);
      if (res.status === 409) {
        setLoading(false);
        setEmailErr(res.error);
      } else if (res.status === 200) {
        setLoading(false);
        notify.success("Account Created successfully", { description: "Your account has been created Please login" });
        router.push(localizedHref("/login"));

      } else {
        setLoading(false);
        notify.error("Something went wrong", { description: "Error during Account creation, Please try again" });
      }
    } catch (error) {
      setLoading(false);
      console.error("Network Error:", error);
      notify.error("Its seems something is wrong, try again");
    }
  }

  return (
    <div className="w-full lg:grid h-screen lg:min-h-[600px] lg:grid-cols-2 relative ">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid  gap-6 mt-10 md:mt-0">
          <div className="absolute left-1/3 top-14 md:top-5 md:left-5">
            <Logo />
          </div>
          <div className="grid gap-2 text-center mt-10 md:mt-0">
            <h1 className="text-3xl font-bold">Welcome to {organizationName}  Team</h1>
            <p className="text-muted-foreground text-sm">
              {isValidInvite
                ? `Please complete your account info with us to get started as ${roleName}`
                : "This invitation link is invalid or has expired"}
            </p>
          </div>
          <div className="">
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <input type="hidden" value={token} readOnly />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  register={register}
                  errors={errors}
                  label="First Name"
                  name="firstName"
                  icon={User}
                  placeholder="first Name"
                />
                <TextInput
                  register={register}
                  errors={errors}
                  label="Last Name"
                  name="lastName"
                  icon={User}
                  placeholder="last Name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  register={register}
                  errors={errors}
                  label="Phone"
                  name="phone"
                  icon={Headset}
                  placeholder="phone"
                />

              </div>

              <PasswordInput
                register={register}
                errors={errors}
                label="Password"
                name="password"
                icon={Lock}
                placeholder="password"
                type="password"
              />
              <div className="">
                {emailErr && (
                  <p className="text-red-500 text-xs mt-2">{emailErr}</p>
                )}
              </div>
              <div>
                <SubmitButton
                  title="Sign Up"
                  loadingTitle={isValidInvite ? "Creating Please wait.." : "Invalid invitation"}
                  loading={loading || !isValidInvite}
                  className="w-full"
                  loaderIcon={Loader2}
                  showIcon={false}
                />
              </div>
            </form>
            <div className="flex items-center py-4 justify-center space-x-1 text-slate-900">
              <div className="h-[1px] w-full bg-slate-200"></div>
              <div className="uppercase">Or</div>
              <div className="h-[1px] w-full bg-slate-200"></div>
            </div>

            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Button
                onClick={() => signIn("google")}
                variant={"outline"}
                className="w-full"
              >
                <FaGoogle className="mr-2 w-6 h-6 text-red-500" />
                Login with Google
              </Button>
              <Button
                onClick={() => signIn("github")}
                variant={"outline"}
                className="w-full"
              >
                <FaGithub className="mr-2 w-6 h-6 text-slate-900 dark:text-white" />
                Login with Github
              </Button>
            </div> */}
            <p className="mt-6 text-sm text-gray-500">
              Already Registered ?{" "}
              <Link
                href={localizedHref("/login")}
                className="font-semibold leading-6 text-rose-600 hover:text-rose-500"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <CustomCarousel />
      </div>
    </div>
  );
}
export default InvitedUserRegistration

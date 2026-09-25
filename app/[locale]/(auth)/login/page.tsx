import { AuthLayout, EnhancedLoginForm } from "@/components/auth";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthLayout variant="login">
      <EnhancedLoginForm />
    </AuthLayout>
  );
}

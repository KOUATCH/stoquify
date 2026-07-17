import { AuthLayout, EnhancedLoginForm } from "@/components/auth";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthLayout variant="login">
      <EnhancedLoginForm />
    </AuthLayout>
  );
}

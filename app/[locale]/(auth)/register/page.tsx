import { AuthLayout } from "@/components/auth";
import BeautifulRegisterForm from "@/components/auth/BeautifulRegisterForm";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthLayout variant="register">
      <BeautifulRegisterForm />
    </AuthLayout>
  );
}

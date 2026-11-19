import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ApplicationMessages } from "@/components/i18n/ApplicationMessages";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("authAvailability");
  return <ApplicationMessages>
    <noscript><p className="border-b border-[#f0c54d] bg-[#fff8dd] p-4 text-sm text-[#6f5620]">{t("javascriptRequired")}</p></noscript>
    {children}
  </ApplicationMessages>;
}

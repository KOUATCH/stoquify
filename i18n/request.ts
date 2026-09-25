import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = typeof requested === "string" && routing.locales.includes(requested as never)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: { ...messages, dashboardShared: (await import(`../messages/dashboard-shared/${locale}.json`)).default, paymentRequest: (await import(`../messages/payment-request/${locale}.json`)).default, paymentExecution: (await import(`../messages/payment-execution/${locale}.json`)).default, paymentPostingRecovery: (await import(`../messages/payment-posting-recovery/${locale}.json`)).default },
  };
});

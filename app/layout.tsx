import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { ErrorBoundary } from "@/config/error-boundary";
import { headers } from "next/headers";
import { isLocale } from "@/i18n/routing";
import { DEFAULT_LOCALE, type Locale } from "@/types/bilingual";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { extractRouterConfig } from "uploadthing/server";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "StockFlow - Retail Management System",
  description: "Comprehensive retail and inventory management solution",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get("X-NEXT-INTL-LOCALE");
  const locale: Locale = isLocale(localeHeader) ? localeHeader : DEFAULT_LOCALE;
  const uploadThingRouterConfig = extractRouterConfig(ourFileRouter);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <ErrorBoundary>
          <Providers uploadThingRouterConfig={uploadThingRouterConfig}>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

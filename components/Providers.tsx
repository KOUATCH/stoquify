"use client";
import { QueryProvider } from "@/lib/providers/query-provider";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes';
import type { ComponentProps } from "react";

type ProvidersProps = ThemeProviderProps & {
  uploadThingRouterConfig?: ComponentProps<typeof NextSSRPlugin>["routerConfig"]
}

export default function Providers({
  children,
  uploadThingRouterConfig,
  ...props
}: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <NotificationProvider>
          {uploadThingRouterConfig ? (
            <NextSSRPlugin routerConfig={uploadThingRouterConfig} />
          ) : null}
          <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            {...props}
          >
            {/* <ShadToaster richColors /> */}
            {children}
          </NextThemesProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

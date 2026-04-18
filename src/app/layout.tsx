import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { MainSiteLayout } from "@/components/layouts/MainSiteLayout";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientProviders } from "@/components/ClientProviders";
import { NavigationTelemetry } from "@/components/telemetry/NavigationTelemetry";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Locked - Event Discovery, Ticketing & Voting Platform",
  description: "Discover, vote, book events, venues, and experiences across Ghana",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased"
      >
        <ErrorBoundary>
          <ClientProviders>
            <Suspense fallback={null}>
              <NavigationTelemetry />
            </Suspense>
            <MainSiteLayout>{children}</MainSiteLayout>
          </ClientProviders>
          <Analytics />
          <SpeedInsights />
        </ErrorBoundary>
      </body>
    </html>
  );
}

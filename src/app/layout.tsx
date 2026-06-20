import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast-provider";
import { DeployRecovery } from "@/components/candela/deploy-recovery";
import { ErrorBoundary } from "@/components/candela/error-boundary";
import { MobileNav } from "@/components/candela/mobile-nav";
import { SessionProvider } from "@/components/candela/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Candela by Adrine",
  description: "Healthcare Operating System — Navayu Spine & Joint Care",
  icons: {
    icon: "/candela-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body
        className={`${geistSans.className} ${geistMono.variable} min-h-full antialiased`}
      >
        <TooltipProvider>
          <SessionProvider>
            <ToastProvider>
              <ErrorBoundary>
                <DeployRecovery />
                {children}
                <MobileNav />
              </ErrorBoundary>
            </ToastProvider>
          </SessionProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

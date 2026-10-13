import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { RealtimeSyncProvider } from "@/components/providers/RealtimeSyncProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mise | Operasyon Merkezi",
  description: "Centralized workspace for Operations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mise",
  },
  icons: {
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground flex h-screen overflow-hidden`}>
        <QueryProvider>
          <SyncProvider>
            <RealtimeSyncProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </RealtimeSyncProvider>
          </SyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

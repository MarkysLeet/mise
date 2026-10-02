import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mise | Operasyon Merkezi",
  description: "Centralized workspace for Operations",
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
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 h-screen overflow-y-auto bg-stone-50/50 pb-16 md:pb-0 transition-all duration-300">
              <div className="w-full h-full">
                {children}
              </div>
            </main>
            <BottomNavBar />
            <Toaster />
          </SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

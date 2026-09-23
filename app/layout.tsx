import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mise | F&B Command Center",
  description: "Centralized workspace for F&B Order Takers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground flex h-screen overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto bg-stone-50/50">
          <div className="mx-auto max-w-7xl p-8 h-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

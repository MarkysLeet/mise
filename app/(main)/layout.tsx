import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarProvider } from "@/components/providers/SidebarProvider";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-stone-50/50 pb-16 md:pb-0 transition-all duration-300">
        <TopBar />
        <div className="w-full min-h-[calc(100vh-3.5rem)]">
          {children}
        </div>
      </main>
      <BottomNavBar />
    </SidebarProvider>
  );
}

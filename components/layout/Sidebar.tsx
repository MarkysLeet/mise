"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, FileText, BookOpen, Settings, ChefHat, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";
import { logoutUser } from "@/actions/auth";
import { useSidebar } from "@/components/providers/SidebarProvider";

const playfair = Playfair_Display({ subsets: ["latin"] });

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Puantaj", href: "/puantaj", icon: Clock },
  { name: "Tutanak", href: "/tutanak", icon: FileText },
  { name: "Bilgi Bankası", href: "/base", icon: BookOpen },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border bg-card py-6 transition-all duration-300 relative",
        isCollapsed ? "w-20 px-2" : "w-64 px-4"
      )}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-secondary text-muted-foreground hover:text-foreground z-10"
      >
        {isCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>

      <div className={cn("flex items-center gap-3 mb-10", isCollapsed ? "justify-center" : "px-2")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ChefHat className="h-6 w-6" />
        </div>
        {!isCollapsed && (
          <div className="truncate">
            <h1 className={cn("text-2xl font-semibold text-foreground tracking-wide", playfair.className)}>Mise</h1>
            <p className="text-xs text-muted-foreground">Operasyon Merkezi</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 transition-colors duration-200",
                  isCollapsed ? "h-6 w-6" : "h-5 w-5",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto space-y-2", isCollapsed ? "px-0" : "px-2")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground">
              AD
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-foreground">Admin</span>
              <span className="text-xs text-muted-foreground">Otel Grubu</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground" title="Admin - Otel Grubu">
              AD
            </div>
          </div>
        )}

        <button
          onClick={() => logoutUser()}
          title={isCollapsed ? "Çıkış Yap" : undefined}
          className={cn(
            "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
            isCollapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          <LogOut className={cn("flex-shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5")} />
          {!isCollapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </div>
  );
}

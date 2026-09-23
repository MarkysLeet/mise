"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, FileText, BookOpen, Settings, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Puntaj", href: "/puntaj", icon: Clock },
  { name: "Tutanak", href: "/tutanak", icon: FileText },
  { name: "Base", href: "/base", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card px-4 py-6">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ChefHat className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mise</h1>
          <p className="text-xs text-muted-foreground">F&B Command Center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground">
            OT
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Order Taker</span>
            <span className="text-xs text-muted-foreground">Shift: Morning</span>
          </div>
        </div>
      </div>
    </div>
  );
}

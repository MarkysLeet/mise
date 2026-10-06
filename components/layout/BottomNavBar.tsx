"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Puantaj", href: "/puantaj", icon: Clock },
  { name: "Fazla Mesai", href: "/fazla-mesai", icon: Clock },
  { name: "Tutanak", href: "/tutanak", icon: FileText },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-zinc-200 pb-safe z-50 block md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  isActive ? "text-zinc-900" : "text-zinc-400"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-zinc-900" : "text-zinc-400"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

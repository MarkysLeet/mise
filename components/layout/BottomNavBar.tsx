"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, CalendarDays, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { DASHBOARD_QUERY_KEY } from "@/hooks/use-dashboard";
import { getEmployees, getPuantajEntries, getPuantajMonths } from "@/actions/puantaj";
import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth } from "@/actions/fazla_mesai";
import { getDashboardData } from "@/actions/dashboard";
import { getTutanakFormOptions, getTutanakFiles } from "@/actions/tutanak";

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Puantaj", href: "/puantaj", icon: CalendarDays },
  { name: "Fazla Mesai", href: "/fazla-mesai", icon: Clock },
  { name: "Tutanak", href: "/tutanak", icon: FileText },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const handlePrefetch = (href: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (href === "/dashboard") {
      queryClient.prefetchQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: () => getDashboardData(), staleTime: 5 * 60 * 1000 });
    } else if (href === "/fazla-mesai") {
      queryClient.prefetchQuery({ queryKey: ["employees", year, month], queryFn: () => getEmployees(year, month) });
      queryClient.prefetchQuery({ queryKey: ["fazla_mesai", dateStr], queryFn: () => getFazlaMesaiByDate(dateStr) });
      queryClient.prefetchQuery({ queryKey: ["fazla_mesai_total", year, month], queryFn: () => getFazlaMesaiTotalByMonth(year, month) });
    } else if (href === "/tutanak") {
      queryClient.prefetchQuery({ queryKey: ["tutanak_options"], queryFn: () => getTutanakFormOptions() });
      queryClient.prefetchQuery({ queryKey: ["tutanaks"], queryFn: () => getTutanakFiles() });
    } else if (href === "/puantaj") {
      queryClient.prefetchQuery({ queryKey: ["puantaj_months", year, month], queryFn: () => getPuantajMonths(year, month) });
      queryClient.prefetchQuery({ queryKey: ["employees", year, month], queryFn: () => getEmployees(year, month) });
      queryClient.prefetchQuery({ queryKey: ["entries", year, month], queryFn: () => getPuantajEntries(year, month) });
    }
  };

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
              onMouseEnter={() => handlePrefetch(item.href)}
              onTouchStart={() => handlePrefetch(item.href)}
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

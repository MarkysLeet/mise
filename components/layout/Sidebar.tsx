"use client";

import { GlobalSearch } from "./GlobalSearch";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, CalendarDays, FileText, BookOpen, Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen, Search, Bell, UserCircle } from "lucide-react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";
import { logoutUser } from "@/actions/auth";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { useOvertimeAlerts } from "@/hooks/use-overtime";
import { useQueryClient } from "@tanstack/react-query";
import { getEmployees, getPuantajEntries } from "@/actions/puantaj";
import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth } from "@/actions/fazla_mesai";
import { getTutanakFormOptions, getTutanakFiles } from "@/actions/tutanak";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const playfair = Playfair_Display({ subsets: ["latin"] });

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Puantaj", href: "/puantaj", icon: CalendarDays },
  { name: "Fazla Mesai", href: "/fazla-mesai", icon: Clock },
  { name: "Tutanak", href: "/tutanak", icon: FileText },
  { name: "Bilgi Bankası", href: "/base", icon: BookOpen },
  { name: "Ayarlar", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: alerts = [], isLoading: alertsLoading } = useOvertimeAlerts();
  const queryClient = useQueryClient();

  const handlePrefetch = (href: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (href === "/fazla-mesai") {
      queryClient.prefetchQuery({ queryKey: ["employees", year, month], queryFn: () => getEmployees(year, month) });
      queryClient.prefetchQuery({ queryKey: ["fazla_mesai", dateStr], queryFn: () => getFazlaMesaiByDate(dateStr) });
      queryClient.prefetchQuery({ queryKey: ["fazla_mesai_total", year, month], queryFn: () => getFazlaMesaiTotalByMonth(year, month) });
    } else if (href === "/tutanak") {
      queryClient.prefetchQuery({ queryKey: ["tutanak_options"], queryFn: () => getTutanakFormOptions() });
      queryClient.prefetchQuery({ queryKey: ["tutanaks"], queryFn: () => getTutanakFiles() });
    } else if (href === "/puantaj") {
      queryClient.prefetchQuery({ queryKey: ["employees", year, month], queryFn: () => getEmployees(year, month) });
      queryClient.prefetchQuery({ queryKey: ["entries", year, month], queryFn: () => getPuantajEntries(year, month) });
    }
  };



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
        <PanelLeftClose className={cn("h-3 w-3 transition-transform duration-300", isCollapsed ? "rotate-180" : "rotate-0")} />
      </button>

      <div className={cn("flex items-center gap-3 mb-6", isCollapsed ? "justify-center" : "px-2")}>
        <div className="flex shrink-0 items-center justify-center">
          <img src="/logo.svg" alt="Mise Logo" className="h-10 w-10" />
        </div>
        <div className={cn("transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-[140px] opacity-100")}>
          <h1 className={cn("text-2xl font-semibold text-foreground tracking-wide", playfair.className)}>Mise</h1>
          <p className="text-xs text-muted-foreground">Operasyon Merkezi</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <Tooltip>
          <TooltipTrigger render={
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                    "group w-full flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 mb-2",
                isCollapsed ? "justify-center px-0" : "px-3",
                "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            />
          }>
            <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "justify-between")}>
              <div className="flex items-center">
                <Search
                  className={cn(
                    "flex-shrink-0 transition-all duration-200",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3",
                    "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className={cn("transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "opacity-100 text-left")}>Hızlı Arama</span>
              </div>
              {!isCollapsed && (
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto group-hover:border-border/80 group-hover:bg-muted transition-colors">
                  <span className="text-xs">⌘</span>K
                </kbd>
              )}
            </div>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" align="center">
              Hızlı Arama
            </TooltipContent>
          )}
        </Tooltip>

        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.name}>
              <TooltipTrigger render={
                <Link
                  href={item.href}
                  onMouseEnter={() => handlePrefetch(item.href)}
                  onTouchStart={() => handlePrefetch(item.href)}
                  onFocus={() => handlePrefetch(item.href)}
                  className={cn(
                    "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center px-0" : "px-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                />
              }>
                <item.icon
                  className={cn(
                    "flex-shrink-0 transition-all duration-200",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className={cn("transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-[120px] opacity-100")}>{item.name}</span>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" align="center">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      <div className={cn("mt-auto flex items-center justify-between border-t border-border pt-4", isCollapsed ? "flex-col gap-4 px-0" : "px-2")}>
        <div className={cn("flex items-center", isCollapsed ? "flex-col gap-4" : "gap-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button title="Profil" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" />
            }>
              <UserCircle className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "center" : "start"} side={isCollapsed ? "right" : "top"} className="w-48">
              <DropdownMenuItem render={
                <Link href="/settings" className="cursor-pointer w-full flex items-center" />
              }>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem render={
                <Link href="/settings" className="cursor-pointer w-full flex items-center" />
              }>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Ayarlar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutUser()} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger render={
              <button title="Bildirimler" className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" />
            }>
              <Bell className="h-5 w-5" />
              {(alerts || []).length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </PopoverTrigger>
            <PopoverContent align={isCollapsed ? "center" : "start"} side={isCollapsed ? "right" : "top"} className="w-80 p-0 mb-2">
              <PopoverHeader className="p-4 border-b border-border">
                <PopoverTitle>Bildirimler</PopoverTitle>
              </PopoverHeader>
              <div className="flex flex-col max-h-80 overflow-y-auto">
                {alertsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (alerts || []).length > 0 ? (
                  (alerts || []).map((alert) => (
                    <div key={alert.id} className="flex flex-col gap-1 p-4 hover:bg-muted/50 border-b border-border transition-colors last:border-b-0">
                      <p className="text-sm font-medium text-foreground">
                        {alert.mesai_date.split('-').reverse().join('.')} — {(alert.employees as any)?.full_name || "-"} günlük mesai limitini aştı ({alert.hours} saat)
                      </p>
                      <span className="text-xs text-muted-foreground">Sistem Bildirimi</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Yeni bildirim yok
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <SyncIndicator />
        </div>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

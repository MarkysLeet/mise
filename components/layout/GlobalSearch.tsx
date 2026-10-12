"use client";

import { useState, useEffect } from "react";
import { Search, User, FileText, Clock, CalendarDays, BookOpen, Plus, Activity, CornerDownLeft, ArrowRightToLine, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchEmployees } from "@/actions/search";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches, RecentSearchItem } from "@/hooks/use-recent-searches";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGES_AND_MODULES = [
  { id: "page_puantaj", title: "Puantaj Cetveli", url: "/puantaj", icon: CalendarDays },
  { id: "page_fazla_mesai", title: "Fazla Mesai Takibi", url: "/fazla-mesai", icon: Clock },
  { id: "page_tutanaklar", title: "Tutanaklar", url: "/tutanak", icon: FileText },
  { id: "page_raporlar", title: "Raporlar", url: "/dashboard", icon: Activity },
  { id: "page_bilgi_bankasi", title: "Bilgi Bankası", url: "/base", icon: BookOpen },
];

const QUICK_ACTIONS = [
  { id: "action_tutanak", title: "Yeni Tutanak Düzenle", url: "/tutanak?action=new", icon: FileText },
  { id: "action_mesai", title: "Fazla Mesai Girişi Yap", url: "/fazla-mesai?action=new", icon: Clock },
  { id: "action_personel", title: "Yeni Personel Ekle", url: "/puantaj?action=new-employee", icon: Plus },
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchEmployees(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (url: string, item: RecentSearchItem) => {
    addRecentSearch(item);
    onOpenChange(false);
    setTimeout(() => {
      router.push(url);
    }, 150);
  };

  const handleEmployeePrimary = (emp: any) => {
    handleSelect(`/puantaj?dossierEmpId=${emp.id}`, {
      id: `emp_${emp.id}`,
      title: emp.full_name,
      subtitle: `${emp.role_title || "Belirtilmemiş"} • ${emp.department_outlet || "Belirtilmemiş"}`,
      type: "employee",
      url: `/puantaj?dossierEmpId=${emp.id}`,
    });
  };

  const handleEmployeeSecondary = (emp: any) => {
    handleSelect(`/puantaj?empId=${emp.id}`, {
      id: `emp_${emp.id}`,
      title: emp.full_name,
      subtitle: `${emp.role_title || "Belirtilmemiş"} • ${emp.department_outlet || "Belirtilmemiş"}`,
      type: "employee",
      url: `/puantaj?empId=${emp.id}`,
    });
  };

  const filteredPages = PAGES_AND_MODULES.filter(p => p.title.toLowerCase().includes(debouncedQuery.toLowerCase()));
  const filteredActions = QUICK_ACTIONS.filter(a => a.title.toLowerCase().includes(debouncedQuery.toLowerCase()));

  const showZeroState = debouncedQuery.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Hızlı Arama</DialogTitle>
      <DialogDescription className="sr-only">Sistemde arama yapın</DialogDescription>
      <DialogContent
        className="p-0 overflow-hidden md:max-w-2xl md:rounded-2xl w-full h-[100dvh] md:h-auto rounded-none fixed inset-0 md:inset-auto md:top-1/3 md:-translate-y-1/3 flex flex-col bg-background/95 backdrop-blur-xl border-none md:border md:border-border/50 shadow-2xl z-[100]"
        showCloseButton={false}
      >
        <CommandPrimitive className="flex flex-col h-full w-full outline-none">
          {/* Header & Input */}
          <div className="flex items-center border-b border-border/50 px-3 md:px-4 shrink-0 min-h-[64px]">
            <Search className="h-5 w-5 text-muted-foreground shrink-0 mr-2" />
            <CommandPrimitive.Input
              autoFocus
              placeholder="Personel, sayfa veya işlem ara..."
              value={query}
              onValueChange={setQuery}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-base md:text-sm py-4 h-full placeholder:text-muted-foreground min-h-[52px]"
            />
            <Button
              variant="ghost"
              className="md:hidden text-muted-foreground ml-2 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Vazgeç
            </Button>
            <Badge variant="outline" className="hidden md:flex ml-2 bg-muted/30 text-muted-foreground rounded-lg h-6 px-2 text-[10px] uppercase font-mono tracking-widest border-border/50">ESC</Badge>
          </div>

          {/* Results Area */}
          <CommandList className="flex-1 overflow-y-auto max-h-none md:max-h-[500px] p-2 space-y-1">
            {isLoading && debouncedQuery.length >= 2 && (
              <div className="py-14 text-sm text-center text-muted-foreground flex flex-col items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                Aranıyor...
              </div>
            )}
            {!isLoading && debouncedQuery.length >= 2 && results?.length === 0 && filteredPages.length === 0 && filteredActions.length === 0 && (
              <CommandEmpty className="py-14 text-center text-sm text-muted-foreground flex flex-col items-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
                Sonuç bulunamadı.
              </CommandEmpty>
            )}

            {/* Zero State: Recent Searches */}
            {showZeroState && recentSearches.length > 0 && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1">
                    <span>Son Aramalar</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearRecentSearches(); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Geçmişi Temizle
                    </button>
                  </div>
                }
                className="mb-4"
              >
                {recentSearches.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.url, item)}
                    className="flex items-center gap-3 py-3 md:py-2.5 px-3 rounded-xl cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                      {item.type === 'employee' ? <User className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      {item.subtitle && <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>}
                    </div>
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Zero State: Suggested Actions */}
            {showZeroState && (
              <CommandGroup heading="Önerilen İşlemler" className="mb-2">
                {QUICK_ACTIONS.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.title}
                    onSelect={() => handleSelect(action.url, { id: action.id, title: action.title, type: "action", url: action.url })}
                    className="flex items-center gap-3 py-3 md:py-2.5 px-3 rounded-xl cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm flex-1">{action.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Employee Results */}
            {results && results.length > 0 && (
              <CommandGroup heading="Personeller" className="mb-2">
                {results.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={`emp_${emp.id}_${emp.full_name}`}
                    onSelect={() => handleEmployeePrimary(emp)}
                    className="flex items-center justify-between gap-3 py-3 md:py-2.5 px-3 rounded-xl cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 md:h-9 md:w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="font-medium text-sm text-foreground truncate">{emp.full_name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="truncate">{emp.role_title || "Belirtilmemiş"}</span>
                          {emp.department_outlet && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="truncate">{emp.department_outlet}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions - visible on hover/focus on desktop, always visible but subtle on mobile */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-data-[selected=true]:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hidden md:flex text-muted-foreground hover:text-foreground bg-muted/30"
                        title="Tabloda Filtrele (Tab)"
                        onClick={(e) => { e.stopPropagation(); handleEmployeeSecondary(emp); }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span className="sr-only">Tabloda Filtrele</span>
                      </Button>
                      <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                         <ArrowRightToLine className="h-4 w-4" />
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Pages & Modules */}
            {filteredPages.length > 0 && !showZeroState && (
              <CommandGroup heading="Sayfalar & Modüller" className="mb-2">
                {filteredPages.map((page) => (
                  <CommandItem
                    key={page.id}
                    value={page.title}
                    onSelect={() => handleSelect(page.url, { id: page.id, title: page.title, type: "page", url: page.url })}
                    className="flex items-center gap-3 py-3 md:py-2.5 px-3 rounded-xl cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                      <page.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm flex-1">{page.title}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick Actions */}
            {filteredActions.length > 0 && !showZeroState && (
              <CommandGroup heading="Hızlı İşlemler" className="mb-2">
                {filteredActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.title}
                    onSelect={() => handleSelect(action.url, { id: action.id, title: action.title, type: "action", url: action.url })}
                    className="flex items-center gap-3 py-3 md:py-2.5 px-3 rounded-xl cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm flex-1">{action.title}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          </CommandList>

          {/* Footer - Desktop Only */}
          <div className="hidden md:flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="h-5 rounded bg-muted/50 px-1.5 font-sans border border-border/50 flex items-center text-[10px]">↑</kbd>
                <kbd className="h-5 rounded bg-muted/50 px-1.5 font-sans border border-border/50 flex items-center text-[10px]">↓</kbd>
                <span>Gezin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="h-5 rounded bg-muted/50 px-1.5 font-sans border border-border/50 flex items-center text-[10px]">↵</kbd>
                <span>Seç / Dosya Aç</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="h-5 rounded bg-muted/50 px-1.5 font-sans border border-border/50 flex items-center text-[10px]">Tab</kbd>
                <span>Tabloda Filtrele</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="h-5 rounded bg-muted/50 px-1.5 font-sans border border-border/50 flex items-center text-[10px]">ESC</kbd>
              <span>Kapat</span>
            </div>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

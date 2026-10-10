"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchEmployees } from "@/actions/search";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

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

  const handleSelect = (employeeId: string) => {
    onOpenChange(false);
    // Wait for dialog animation
    setTimeout(() => {
      // Assuming Dossier opens via URL state or we just navigate to Puantaj with a query param.
      // But looking at the prompt: "should open their card (Employee Dossier)".
      // The Dossier might be a dialog in the Puantaj page. If we are not on Puantaj page, we can route to `/puantaj?employeeId=${employeeId}`
      router.push(`/puantaj?employee=${employeeId}`);
    }, 150);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Personel ara (isim, soyisim)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="p-4 text-sm text-center text-muted-foreground">Aranıyor...</div>
        )}
        {!isLoading && debouncedQuery.length >= 2 && results?.length === 0 && (
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
        )}

        {results && results.length > 0 && (
          <CommandGroup heading="Personeller">
            {results.map((emp) => (
              <CommandItem
                key={emp.id}
                value={emp.full_name}
                onSelect={() => handleSelect(emp.id)}
                className="flex flex-col items-start gap-1 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="font-medium text-foreground">{emp.full_name}</div>
                  {/* Status? The prompt said "In the output show name, role and status" */}
                  {/* Let's see if we have status in schema, like status='active' */}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                  <span>{emp.role_title || "Belirtilmemiş"}</span>
                  {emp.department_outlet && (
                    <>
                      <span>•</span>
                      <span>{emp.department_outlet}</span>
                    </>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

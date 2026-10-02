/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Download,
  UploadCloud,
  Eraser,


  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";

import { addEmployee, terminateEmployee, deleteEmployee, updateEmployee } from "@/actions/puantaj";
import { importEmployeesFromSheet, syncPuantajToDrive, getPuantajSpreadsheetId } from "@/actions/puantaj-sync";
import { initializeNewMonth } from "@/actions/puantaj-init";
import { DesktopPuantajTable } from "./components/DesktopPuantajTable";
import { MobilePuantajView } from "./components/MobilePuantajView";
import { EmployeeDossier } from "./components/EmployeeDossier";
import { usePuantaj } from "./hooks/usePuantaj";
import { useQueryClient } from "@tanstack/react-query";
import PuantajLoading from "./loading";
import { IMaskInput } from "react-imask";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const STATUSES = [
  { code: "X", label: "Çalıştı", color: "bg-transparent text-slate-400" },
  { code: "Hİ", label: "Hafta İzni", color: "bg-green-100" },
  { code: "Üİ", label: "Ücretsiz İzin", color: "bg-orange-100" },
  { code: "D", label: "Devamsızlık", color: "bg-red-100 text-red-600 font-bold" },
  { code: "R", label: "Raporlu", color: "bg-yellow-100" },
  { code: "Yİ", label: "Yıllık İzin", color: "bg-teal-100" },
  { code: "SZ", label: "Süt İzni", color: "bg-purple-100" },
  { code: "ÜR", label: "Ücretli İzin", color: "bg-teal-50" },
  { code: "TERMINATED", label: "İşten Çıkış", color: "bg-black text-white" }
];

export function PuantajClient({ initialEmployees, initialEntries, initialRoles = [], currentMonth, currentYear, initializedMonths = [], dbMonths = [] }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const queryClient = useQueryClient();
  const {
    employees,
    entries,
    roles,
    isEmployeesLoading,
    isEntriesLoading,
    updateEntryAsync,
  } = usePuantaj(currentYear, currentMonth, initialEmployees, initialEntries, initialRoles);

  const [activeBrush, setActiveBrush] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(searchParams.get("empId") || null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(searchParams.get("role") || "Tümü");

  const updateFiltersInUrl = (newEmpId: string | null, newRole: string, newSearchQuery: string) => {
    const params = new URLSearchParams(searchParams);
    if (newEmpId) params.set("empId", newEmpId);
    else params.delete("empId");

    if (newRole && newRole !== "Tümü") params.set("role", newRole);
    else params.delete("role");

    if (newSearchQuery) params.set("q", newSearchQuery);
    else params.delete("q");

    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSelectEmployee = (empId: string | null) => {
    setSelectedEmployeeId(empId);
    updateFiltersInUrl(empId, selectedRoleFilter, searchQuery);
  };

  const handleSelectRole = (role: string) => {
    setSelectedRoleFilter(role);
    updateFiltersInUrl(selectedEmployeeId, role, searchQuery);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    updateFiltersInUrl(selectedEmployeeId, selectedRoleFilter, query);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const [hasUnsavedDriveChanges, setHasUnsavedDriveChanges] = useState(false);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<"create" | "edit">("create");
  const [employeeFormData, setEmployeeFormData] = useState({ id: "", full_name: "", role_title: "", phone: "", department_outlet: "", hire_date: "" });

  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierEmployee, setDossierEmployee] = useState<any>(null);

  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] = useState<any>(null);
  const [terminationDate, setTerminationDate] = useState("");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

  const [isInitMonthOpen, setIsInitMonthOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  const roleFilteredEmployees = employees.filter(emp => {
    if (selectedRoleFilter !== "Tümü" && emp.role_title !== selectedRoleFilter) return false;
    return true;
  });

  const filteredEmployees = roleFilteredEmployees.filter(emp => {
    if (selectedEmployeeId && emp.id !== selectedEmployeeId) return false;
    if (searchQuery && !emp.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Exclude 'TERMINATED' from the brush palette
  const brushStatuses = STATUSES.filter(s => s.code !== 'TERMINATED');

  // Auto-sync refs
  const stateRef = useRef({
    currentYear,
    currentMonth,
    employees,
    entries,
    hasUnsavedDriveChanges
  });

  useEffect(() => {
    stateRef.current = { currentYear, currentMonth, employees, entries, hasUnsavedDriveChanges };
  }, [currentYear, currentMonth, employees, entries, hasUnsavedDriveChanges]);

  // Debounced auto-sync
  useEffect(() => {
    if (!hasUnsavedDriveChanges) return;

    const timer = setTimeout(async () => {
      // Fire and forget auto-sync
      const current = stateRef.current;
      if (current.hasUnsavedDriveChanges) {
        try {
          const res = await syncPuantajToDrive(current.currentYear, current.currentMonth, current.employees, current.entries);
          if (res && res.success) {
            setHasUnsavedDriveChanges(false);
            setSyncUrl(res.spreadsheetUrl || null);
            toast.success("Drive ile otomatik senkronize edildi", { duration: 2000, position: 'bottom-right' });
          }
        } catch (e) {
          console.error("Auto-sync error", e);
        }
      }
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  }, [hasUnsavedDriveChanges, employees, entries]); // Reset timer on any change

  // beforeunload listener for window close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.hasUnsavedDriveChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // component unmount cleanup for Next.js routing
  useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (current.hasUnsavedDriveChanges) {
        // fire and forget sync on unmount
        syncPuantajToDrive(current.currentYear, current.currentMonth, current.employees, current.entries).catch(console.error);
      }
    };
  }, []);

  // Navigate Months
  const changeMonth = (offset: number) => {
    let m = currentMonth + offset;
    let y = currentYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }

    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("month", m.toString());
      params.set("year", y.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Calculate visibility of navigation arrows
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const hasPrevMonth = initializedMonths.includes(prevMonthKey) || dbMonths.includes(prevMonthKey);

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // To navigate right, the literal next month MUST be in the initialized list.
  const nextMonthDateInNav = new Date(currentYear, currentMonth, 1);
  const nextMonthKeyInNav = `${nextMonthDateInNav.getFullYear()}-${String(nextMonthDateInNav.getMonth() + 1).padStart(2, '0')}`;
  const hasNextMonth = initializedMonths.includes(nextMonthKeyInNav);

  const isCurrentMonthInitialized = initializedMonths.includes(currentMonthKey);

  const sortedMonths = [...initializedMonths].sort();
  const latestMonthKey = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : "";
  const isLatestMonth = latestMonthKey === currentMonthKey;

  // Logic for the Rollover button (Yeni Ayı Başlat)
  const realDate = new Date();
  const realMonth = realDate.getMonth() + 1;
  const realYear = realDate.getFullYear();

  // We determine what the "next" month to create should be.
  // If array is empty, it should be the real current month.
  // If array has items, it should be chronologically the next month after the latest initialized month.
  let monthToInitializeDate: Date;
  if (sortedMonths.length === 0) {
    monthToInitializeDate = new Date(realYear, realMonth - 1, 1);
  } else {
    const [lYear, lMonth] = latestMonthKey.split('-');
    monthToInitializeDate = new Date(parseInt(lYear), parseInt(lMonth), 1);
  }

  const monthToInitKey = `${monthToInitializeDate.getFullYear()}-${String(monthToInitializeDate.getMonth() + 1).padStart(2, '0')}`;

  // Check if we are allowed to create it based on calendar date restriction (<= current real calendar month + 1)
  const maxAllowedInitDate = new Date(realYear, realMonth, 1); // Real month + 1
  const canInitializeNextMonth = monthToInitializeDate <= maxAllowedInitDate;

  // Show "Yeni Ayı Başlat" ONLY if we are at the latest month (or array is empty) AND we are permitted to init
  const showInitButton = (isLatestMonth || sortedMonths.length === 0) && !initializedMonths.includes(monthToInitKey) && canInitializeNextMonth;

  const applyBrush = (employeeId: string, day: number) => {
    if (day > daysInMonth) return; // Ignore invalid days
    if (activeBrush === null) return;

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Do not allow overriding a 'TERMINATED' status if it's after the termination date
    const emp = employees.find(e => e.id === employeeId);
    if (emp && !emp.is_active && emp.termination_date) {
        const tDate = new Date(emp.termination_date);
        const cellDate = new Date(dateStr);
        if (cellDate > tDate) {
            return;
        }
    }

    const valueToSet = activeBrush === "ERASER" ? "" : activeBrush;

    setPendingChanges(prev => {
      const existingEntry = entries.find(e => e.employee_id === employeeId && e.date === dateStr);
      const existingStatus = prev[`${employeeId}_${dateStr}`] !== undefined ? prev[`${employeeId}_${dateStr}`] : (existingEntry?.status || "");

      if (existingStatus === valueToSet) return prev;

      setHasUnsavedDriveChanges(true); // Mark as unsaved for drive sync

      return {
        ...prev,
        [`${employeeId}_${dateStr}`]: valueToSet
      };
    });

    // Instant optimistic query cache update
    queryClient.setQueryData(["entries", currentYear, currentMonth], (old: any) => {
      if (!old) return old;
      let updated = [...old];
      if (valueToSet === "") {
        updated = updated.filter(e => !(e.employee_id === employeeId && e.date === dateStr));
      } else {
        const existingIndex = updated.findIndex(e => e.employee_id === employeeId && e.date === dateStr);
        if (existingIndex > -1) {
          updated[existingIndex] = { ...updated[existingIndex], status: valueToSet };
        } else {
          updated.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            workspace_id: 'temp',
            employee_id: employeeId,
            date: dateStr,
            status: valueToSet,
            created_at: new Date().toISOString()
          });
        }
      }
      return updated;
    });
  };

  const savePendingChanges = useCallback(async (changesToSave = pendingChanges) => {
    if (Object.keys(changesToSave).length === 0) return;
    setIsSaving(true);

    const changesArray = Object.entries(changesToSave).map(([key, status]) => {
      const [employee_id, date] = key.split('_');
      return { employee_id, date, status };
    });

    try {
      // Clear pending changes optimistically to avoid double-firing or infinite loops
      // if the save fails and a new timeout fires.
      setPendingChanges({});
      await updateEntryAsync(changesArray);
      toast.success("Değişiklikler kaydedildi");
    } catch (err: any) {
      // Restore pending changes on failure so they can be retried if needed
      setPendingChanges(changesToSave);
      toast.error(err.message || "Kaydedilirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, updateEntryAsync]);

  const pendingChangesRef = useRef(pendingChanges);
  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        if (Object.keys(pendingChangesRef.current).length > 0) {
           savePendingChanges(pendingChangesRef.current);
        }
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isMouseDown, savePendingChanges]);

  const openCreateEmployeeModal = () => {
    setEmployeeModalMode("create");
    setEmployeeFormData({ id: "", full_name: "", role_title: "", phone: "", department_outlet: "", hire_date: "" });
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp: any) => {
    setEmployeeModalMode("edit");
    setEmployeeFormData({
      id: emp.id,
      full_name: emp.full_name || "",
      role_title: emp.role_title || "",
      phone: emp.phone || "",
      department_outlet: emp.department_outlet || "",
      hire_date: emp.hire_date || ""
    });
    setIsEmployeeModalOpen(true);
  };

  const openDossier = (emp: any) => {
    setDossierEmployee(emp);
    setIsDossierOpen(true);
  };

  // Submit Employee Modal
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (employeeModalMode === "create") {
        const seq_no = employees.length > 0 ? Math.max(...employees.map(emp => emp.seq_no)) + 1 : 1;
        await addEmployee({ ...employeeFormData, seq_no });
        toast.success("Personel eklendi.");
      } else {
        const result = await updateEmployee(employeeFormData.id, {
          full_name: employeeFormData.full_name,
          role_title: employeeFormData.role_title,
          phone: employeeFormData.phone,
          department_outlet: employeeFormData.department_outlet,
          hire_date: employeeFormData.hire_date,
        });
        if (!result.success) throw new Error(result.error);
        toast.success("Personel güncellendi.");
      }
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setHasUnsavedDriveChanges(true);
      setIsEmployeeModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Personel işlemi başarısız.");
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const res = await deleteEmployee(employeeToDelete.id);
      if (!res?.success) throw new Error(res.error || "Silme işlemi başarısız");

      toast.success("Personel tamamen silindi");
      setIsDeleteOpen(false);
      setHasUnsavedDriveChanges(true);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Terminate Employee
  const handleTerminateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeToTerminate || !terminationDate) return;
    try {
      await terminateEmployee(employeeToTerminate.id, terminationDate);
      toast.success("Personel işten çıkarıldı");
      setIsTerminateOpen(false);
      setHasUnsavedDriveChanges(true);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Import from Sheets
  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await importEmployeesFromSheet(currentYear, currentMonth);
      if (res.success) {
        toast.success(`${res.count} personel başarıyla içe aktarıldı`);
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["entries"] });
        router.refresh();
      } else {
        toast.error(res.error || "İçe aktarma hatası");
      }
    } catch (err: any) {
      toast.error(err.message || "İçe aktarma hatası");
    } finally {
      setIsImporting(false);
    }
  };

  // Sync to Drive
  const handleSync = async () => {
    // Save pending changes first
    if (Object.keys(pendingChanges).length > 0) {
      await savePendingChanges();
    }

    setIsSyncing(true);
    try {
      // In a real app we might want to fetch fresh state, but we'll use current state
      const res = await syncPuantajToDrive(currentYear, currentMonth, employees, entries);

      if (res && !res.success) {
         toast.error(res.error || "Senkronizasyon hatası");
      } else {
         setSyncUrl(res.spreadsheetUrl || null);
         setHasUnsavedDriveChanges(false);
         toast.success("Drive ile senkronize edildi");
      }
    } catch (err: any) {
      toast.error(err.message || "Senkronizasyon hatası");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenDrive = async () => {
    if (syncUrl) {
      window.open(syncUrl, '_blank');
      return;
    }

    // Open blank tab immediately to bypass popup blocker
    const newWin = window.open('about:blank', '_blank');

    try {
      const res = await getPuantajSpreadsheetId(currentYear);
      if (res && res.success && res.spreadsheetId) {
        const url = `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit`;
        setSyncUrl(url); // cache it
        if (newWin) {
          newWin.location.href = url;
        }
      } else {
        if (newWin) newWin.close();
        toast.error("Tablo ID'si alınamadı veya tablo henüz oluşturulmadı.");
      }
    } catch (err: any) {
      console.error(err);
      if (newWin) newWin.close();
      toast.error("Bir hata oluştu");
    }
  };

  const fillEmptyWithX = async () => {
    const changes: { [key: string]: string } = {};
    const changesArray: { employee_id: string, date: string, status: string }[] = [];

    employees.forEach(emp => {
       if (!emp.is_active && (!emp.termination_date || new Date(emp.termination_date) < new Date(currentYear, currentMonth - 1, 1))) {
           return; // Skipped employee
       }

       for (let day = 1; day <= daysInMonth; day++) {
           const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

           if (!emp.is_active && emp.termination_date) {
               const tDate = new Date(emp.termination_date);
               const cellDate = new Date(dateStr);
               if (cellDate > tDate) continue;
           }

           if (emp.hire_date) {
               const hDate = new Date(emp.hire_date);
               const cellDate = new Date(dateStr);
               if (cellDate < hDate) continue;
           }

           const existingEntry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);
           if (!existingEntry || existingEntry.status === "") {
               changes[`${emp.id}_${dateStr}`] = "X";
               changesArray.push({ employee_id: emp.id, date: dateStr, status: "X" });
           }
       }
    });

    if (changesArray.length === 0) {
       toast.info("Doldurulacak boş gün bulunamadı.");
       return;
    }

    setPendingChanges(prev => ({ ...prev, ...changes }));

    // We auto-save to ensure it's persisted immediately
    savePendingChanges(changes);
  };

  const handleInitializeMonth = async () => {
    setIsInitializing(true);
    try {
      const initY = monthToInitializeDate.getFullYear();
      const initM = monthToInitializeDate.getMonth() + 1;
      const res = await initializeNewMonth(initY, initM);
      if (res.success) {
        toast.success("Yeni ay başarıyla oluşturuldu.");
        setIsInitMonthOpen(false);
        // Force full hard navigation to the new month
        startTransition(() => {
          router.push(`/puantaj?month=${initM}&year=${initY}`);
          router.refresh();
        });
      } else {
        toast.error(res.error || "Ay oluşturulurken hata.");
      }
    } catch (err: any) {
      toast.error(err.message || "Ay oluşturulurken hata.");
    } finally {
      setIsInitializing(false);
    }
  };

  // View Calculation
  const calculateTotals = useCallback((employeeId: string) => {
    const empEntries = entries.filter(e => e.employee_id === employeeId);

    // Deduplicate entries by date to prevent miscalculation due to accidental duplicates
    const uniqueEntriesMap = new Map();
    empEntries.forEach(entry => {
      uniqueEntriesMap.set(entry.date, entry);
    });
    const uniqueEmpEntries = Array.from(uniqueEntriesMap.values());

    let work = 0; let hi = 0; let ui = 0; let d = 0;

    uniqueEmpEntries.forEach(entry => {
      // exclude entries outside the current month's bound (if they exist)
      const entryDay = parseInt(entry.date.split('-')[2]);
      if (entryDay > daysInMonth) return;

      if (entry.status === "X") work++;
      else if (entry.status === "Hİ") hi++;
      else if (entry.status === "Üİ") ui++;
      else if (entry.status === "D") d++;
    });
    return { work, hi, ui, d };
  }, [entries, daysInMonth]);

  const requestedMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const isMonthInitialized = initializedMonths.includes(requestedMonthKey);

  // Show skeleton loader if data is currently hard-loading (e.g. initial fetch without SSR data)
  if (isEmployeesLoading || isEntriesLoading) {
    return <PuantajLoading />;
  }

  // Sanity check: If month is initialized and we have employees, but completely 0 entries, it's likely a silent fail.
  // Make sure we only show this error state if we are actually done loading.
  if (isMonthInitialized && employees.length > 0 && entries.length === 0 && !isEntriesLoading) {
    return (
      <div className="flex-1 w-full px-4 py-8 flex flex-col items-center justify-center space-y-4 bg-gray-50/50">
        <h2 className="text-xl font-semibold text-slate-900">Eksik Veri Tespiti</h2>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Bu ay için personel listesi yüklendi ancak puantaj kayıtları (tablo verileri) boş geldi. Ağ hatası veya zaman aşımı yaşanmış olabilir.
        </p>
        <Button onClick={() => router.refresh()} variant="outline">
          Sayfayı Yenile ve Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full px-4 py-4 space-y-4 max-w-full overflow-hidden bg-gray-50/50">

      {/* Mobile Header */}
      <div className="flex md:hidden w-full items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)} disabled={!hasPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <img src="/logo.svg" alt="Mise Logo" className="h-4 w-4" />
              <span className="text-sm font-serif text-slate-800 font-bold">Mise</span>
            </div>
            <h1 className="text-xs text-slate-600 font-medium w-24 text-center leading-tight">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h1>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)} disabled={!hasNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {showInitButton && (
            <Button size="sm" onClick={() => setIsInitMonthOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-3 text-xs">
              Yeni Ay
            </Button>
          )}
          <Button
            onClick={openCreateEmployeeModal}
            disabled={!isCurrentMonthInitialized}
            className="rounded-full w-10 h-10 p-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Header Panel */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:bg-slate-200" onClick={() => changeMonth(-1)} disabled={!hasPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-medium text-slate-900 w-48 text-center tracking-tight">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h1>
          <Button variant="ghost" size="icon" className="hover:bg-slate-200" onClick={() => changeMonth(1)} disabled={!hasNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>

          {showInitButton && (
            <Button onClick={() => setIsInitMonthOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white ml-2">
              {MONTH_NAMES[monthToInitializeDate.getMonth()]} Ayını Başlat
            </Button>
          )}

          <div className="hidden md:flex items-center gap-2 ml-4">
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-[200px] justify-between"
                >
                  {selectedEmployeeId
                    ? employees.find((emp) => emp.id === selectedEmployeeId)?.full_name
                    : "Personel ara..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              } />
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="İsim ile ara..." value={searchQuery} onValueChange={handleSearchQueryChange} />
                  <CommandList>
                    <CommandEmpty>Personel bulunamadı.</CommandEmpty>
                    <CommandGroup>
                      {roleFilteredEmployees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={emp.full_name}
                          onSelect={() => {
                            handleSelectEmployee(emp.id === selectedEmployeeId ? null : emp.id);
                            setIsComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {emp.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={selectedRoleFilter} onValueChange={(val) => handleSelectRole(val || "Tümü")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Görev seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tümü">Tümü (Tüm Görevler)</SelectItem>
                {roles?.map((role: any) => (
                  <SelectItem key={role.id} value={role.title}>{role.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateEmployeeModal} disabled={!isCurrentMonthInitialized}>
            <Plus className="mr-2 h-4 w-4" /> Personel Ekle
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" className="flex items-center gap-2 pointer-events-none">
                <Settings2 className="h-4 w-4" />
                Diğer İşlemler
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleImport} disabled={isImporting || !isCurrentMonthInitialized} className="cursor-pointer">
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Tablodan İçe Aktar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSync} disabled={isSyncing || !isCurrentMonthInitialized} className="cursor-pointer relative">
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Drive İle Senkronize Et
                {hasUnsavedDriveChanges && (
                  <span className="absolute right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenDrive} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" /> Tabloyu Drive&apos;da Aç
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{employeeModalMode === "create" ? "Personel Ekle" : "Personeli Düzenle"}</DialogTitle></DialogHeader>
              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div>
                  <Label>Ad Soyad</Label>
                  <Input required value={employeeFormData.full_name} onChange={e => setEmployeeFormData({...employeeFormData, full_name: e.target.value})} />
                </div>
                <div>
                  <Label>Görevi</Label>
                  {roles && roles.length > 0 ? (
                    <Select
                      value={employeeFormData.role_title || ""}
                      onValueChange={(val: string | null) => setEmployeeFormData({...employeeFormData, role_title: val || ""})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Görev seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role: any) => (
                          <SelectItem key={role.id} value={role.title}>{role.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={employeeFormData.role_title || ""} onChange={e => setEmployeeFormData({...employeeFormData, role_title: e.target.value})} placeholder="Önce ayarlardan görev ekleyin" disabled />
                  )}
                </div>
                <div>
                  <Label>Telefon</Label>
                  <IMaskInput
                    mask="+90 (000) 000 00 00"
                    value={employeeFormData.phone || ""}
                    unmask={false}
                    onAccept={(val) => setEmployeeFormData({...employeeFormData, phone: val as string})}
                    placeholder="+90 (___) ___ __ __"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div><Label>Bölüm / Outlet</Label><Input value={employeeFormData.department_outlet || ""} onChange={e => setEmployeeFormData({...employeeFormData, department_outlet: e.target.value})} /></div>
                <div><Label>Giriş Tarihi</Label><Input type="date" value={employeeFormData.hire_date || ""} onChange={e => setEmployeeFormData({...employeeFormData, hire_date: e.target.value})} /></div>
                <Button type="submit" className="w-full">{employeeModalMode === "create" ? "Ekle" : "Kaydet"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="hidden md:flex flex-wrap items-center gap-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-xs">
        <span className="font-medium text-slate-500">Lejant:</span>
        <div className="flex flex-wrap gap-3">
          {STATUSES.filter(s => s.code !== 'TERMINATED').map(status => (
            <div key={status.code} className="flex items-center gap-1.5">
              <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${status.color.includes('bg-transparent') ? 'bg-slate-50 border-slate-200 text-slate-400' : status.color + ' border-transparent'}`}>
                {status.code}
              </span>
              <span className="text-slate-600">{status.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brush Palette - Floating Bottom Bar */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur shadow-xl border rounded-full px-6 py-3 items-center gap-2 transition-all duration-300">
        <span className="text-sm font-medium text-slate-500 mr-2">Fırça:</span>
        {brushStatuses.map(status => (
          <Button
            key={status.code}
            size="sm"
            variant={activeBrush === status.code ? "default" : "outline"}
            className={`h-8 px-3 rounded-full ${activeBrush === status.code ? status.color : ''}`}
            onClick={() => setActiveBrush(activeBrush === status.code ? null : status.code)}
          >
            {status.code} - {status.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={activeBrush === "ERASER" ? "default" : "outline"}
          className={`h-8 px-3 rounded-full ${activeBrush === "ERASER" ? 'bg-gray-800 text-white' : ''}`}
          onClick={() => setActiveBrush(activeBrush === "ERASER" ? null : "ERASER")}
        >
          <Eraser className="h-4 w-4 mr-1" /> Silici
        </Button>

        <div className="ml-4 flex items-center gap-2 border-l pl-4 border-slate-200">
          {Object.keys(pendingChanges).length > 0 && (
            <Button size="sm" onClick={() => savePendingChanges()} disabled={isSaving} className="bg-green-600 hover:bg-green-700 rounded-full">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
          )}

          <Button
            size="sm"
            onClick={fillEmptyWithX}
            variant="secondary"
            title="Tüm boş günleri 'X' olarak doldur"
            className="rounded-full"
          >
            Boşlukları &apos;X&apos; Doldur
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className={`transition-opacity duration-200 relative pb-24 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
        {isPending && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}
        <DesktopPuantajTable
          employees={filteredEmployees}
          roles={roles}
        entries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
        daysArray={daysArray}
        daysInMonth={daysInMonth}
        STATUSES={STATUSES}
        pendingChanges={pendingChanges}
        activeBrush={activeBrush}
        calculateTotals={calculateTotals}
        setEmployeeToTerminate={setEmployeeToTerminate}
        setIsTerminateOpen={setIsTerminateOpen}
        setEmployeeToDelete={setEmployeeToDelete}
        setIsDeleteOpen={setIsDeleteOpen}
        setEmployeeToEdit={openEditEmployeeModal}
        setIsEditEmployeeModalOpen={setIsEmployeeModalOpen}
        setIsMouseDown={setIsMouseDown}
        isMouseDown={isMouseDown}
          applyBrush={applyBrush}
          openDossier={openDossier}
        />
      </div>

      {/* Employee Dossier */}
      <EmployeeDossier
        employee={dossierEmployee}
        entries={entries}
        isOpen={isDossierOpen}
        onOpenChange={setIsDossierOpen}
        currentMonth={currentMonth}
        onEditEmployee={(emp) => {
          setIsDossierOpen(false);
          openEditEmployeeModal(emp);
        }}
      />

      <MobilePuantajView
        employees={filteredEmployees}
        roles={roles}
        entries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
        daysArray={daysArray}
        daysInMonth={daysInMonth}
        STATUSES={STATUSES}
        calculateTotals={calculateTotals}
        setEmployeeToTerminate={setEmployeeToTerminate}
        setIsTerminateOpen={setIsTerminateOpen}
        setEmployeeToDelete={setEmployeeToDelete}
        setIsDeleteOpen={setIsDeleteOpen}
        setEmployeeToEdit={openEditEmployeeModal}
        setIsEditEmployeeModalOpen={setIsEmployeeModalOpen}
        openDossier={openDossier}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchQueryChange}
        selectedRoleFilter={selectedRoleFilter}
        setSelectedRoleFilter={handleSelectRole}
      />

      {/* Terminate Modal */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İş Çıkışı Ver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{employeeToTerminate?.full_name}</span> adlı personelin iş çıkış işlemini onaylıyor musunuz?
            </p>
            <div>
              <Label>Çıkış Tarihi</Label>
              <Input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} required />
              <p className="text-xs text-slate-400 mt-2">
                Bu tarihten sonraki tüm puantaj kayıtları tamamen silinecek ve personel sonraki aylarda tabloda görünmeyecektir.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminateOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleTerminateEmployee}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personeli Sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{employeeToDelete?.full_name}</span> adlı personeli ve tüm puantaj kayıtlarını tamamen silmek istediğinize emin misiniz?
            </p>
            <p className="text-xs text-red-500 font-medium">
              Bu işlem geri alınamaz. Eğer personel işten ayrıldıysa, silmek yerine <strong>İş Çıkışı Ver</strong> seçeneğini kullanmalısınız.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Init Month Modal */}
      <Dialog open={isInitMonthOpen} onOpenChange={setIsInitMonthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{MONTH_NAMES[monthToInitializeDate.getMonth()]} {monthToInitializeDate.getFullYear()} Ayını Başlat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-700">
              <strong className="font-semibold">{MONTH_NAMES[monthToInitializeDate.getMonth()]} {monthToInitializeDate.getFullYear()}</strong> puantajı oluşturulacak.
            </p>
            <p className="text-sm text-slate-500">
              Sistem, personellerin geçmiş aydaki çalışma günlerini analiz ederek <strong>6+1 kuralına göre</strong> (6 gün çalışma, 1 gün izin) tüm ayı otomatik dolduracaktır.
            </p>
            <p className="text-sm text-slate-500">
              Onaylıyor musunuz?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitMonthOpen(false)} disabled={isInitializing}>İptal</Button>
            <Button onClick={handleInitializeMonth} disabled={isInitializing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Evet, Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Employee, Entry } from "../types";

interface EmployeeDossierProps {
  employee: Employee | null;
  entries: Entry[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: number;
}

export function EmployeeDossier({ employee, entries, isOpen, onOpenChange, currentMonth }: EmployeeDossierProps) {
  if (!employee) return null;

  // Calculate stats for current month
  const monthEntries = entries.filter(e => e.employee_id === employee.id);
  const X_count = monthEntries.filter(e => e.status === "X").length;
  const HI_count = monthEntries.filter(e => e.status === "Hİ").length;
  const D_count = monthEntries.filter(e => e.status === "D").length;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6 border-b pb-4">
          <SheetTitle className="text-2xl font-semibold tracking-tight">{employee.full_name}</SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            {employee.role_title}
            {employee.is_active ? (
               <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
            ) : (
               <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">İşten Çıktı</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-slate-900">Kişisel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-4 rounded-xl border bg-stone-50/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sicil No</p>
                <p className="text-sm font-medium">{employee.sicil_no || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Giriş Tarihi</p>
                <p className="text-sm font-medium">{employee.hire_date ? employee.hire_date.split('-').reverse().join('.') : "-"}</p>
              </div>
              {!employee.is_active && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Çıkış Tarihi</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <p className="text-sm font-medium text-red-600">{(employee as any).termination_date ? (employee as any).termination_date.split('-').reverse().join('.') : "-"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-sm text-slate-900">Aylık Özet ({currentMonth}. Ay)</h3>
            <div className="grid grid-cols-3 gap-3">
               <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex flex-col items-center justify-center">
                 <p className="text-2xl font-semibold text-blue-700">{X_count}</p>
                 <p className="text-xs font-medium text-blue-600/80">Çalışma (X)</p>
               </div>
               <div className="rounded-xl border border-green-100 bg-green-50 p-3 flex flex-col items-center justify-center">
                 <p className="text-2xl font-semibold text-green-700">{HI_count}</p>
                 <p className="text-xs font-medium text-green-600/80">Hafta İzni (Hİ)</p>
               </div>
               <div className="rounded-xl border border-red-100 bg-red-50 p-3 flex flex-col items-center justify-center">
                 <p className="text-2xl font-semibold text-red-700">{D_count}</p>
                 <p className="text-xs font-medium text-red-600/80">Devamsızlık (D)</p>
               </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-dashed border-slate-200">
            <h3 className="font-medium text-sm text-slate-400 flex items-center justify-between">
              <span>Gelecek Modüller</span>
              <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-500">Yakında</span>
            </h3>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm text-slate-400">Mesai & İzin & Lojman verileri buraya eklenecek.</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
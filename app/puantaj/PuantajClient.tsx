/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Download,
  UploadCloud,
  Eraser,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";

import { addEmployee, terminateEmployee, bulkUpsertPuantaj } from "@/actions/puantaj";
import { importEmployeesFromSheet, syncPuantajToDrive } from "@/actions/puantaj-sync";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const STATUSES = [
  { code: "X", label: "Çalıştı", color: "bg-blue-100" },
  { code: "A", label: "Vardiya A", color: "bg-indigo-100" },
  { code: "B", label: "Vardiya B", color: "bg-indigo-100" },
  { code: "C", label: "Vardiya C", color: "bg-indigo-100" },
  { code: "Hİ", label: "Hafta İzni", color: "bg-green-100" },
  { code: "Üİ", label: "Ücretsiz İzin", color: "bg-orange-100" },
  { code: "D", label: "Devamsızlık", color: "bg-red-100 text-red-600 font-bold" },
  { code: "R", label: "Raporlu", color: "bg-yellow-100" },
  { code: "Yİ", label: "Yıllık İzin", color: "bg-teal-100" },
  { code: "SZ", label: "Süt İzni", color: "bg-purple-100" },
  { code: "ÜR", label: "Ücretli İzin", color: "bg-teal-50" },
  { code: "TERMINATED", label: "İşten Çıkış", color: "bg-black text-white" }
];

export function PuantajClient({ initialEmployees, initialEntries, currentMonth, currentYear }: any) {
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [entries, setEntries] = useState<any[]>(initialEntries);
  const [activeBrush, setActiveBrush] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ full_name: "", role_title: "", sicil_no: "", hire_date: "" });

  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] = useState<any>(null);
  const [terminationDate, setTerminationDate] = useState("");

  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  // Exclude 'TERMINATED' from the brush palette
  const brushStatuses = STATUSES.filter(s => s.code !== 'TERMINATED');

  // Navigate Months
  const changeMonth = (offset: number) => {
    let m = currentMonth + offset;
    let y = currentYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    router.push(`/puantaj?month=${m}&year=${y}`);
  };

  const handleCellClick = (employeeId: string, day: number) => {
    if (day > daysInMonth) return; // Ignore invalid days
    if (activeBrush === null) return;

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Do not allow overriding a 'TERMINATED' status if it's after the termination date
    const emp = employees.find(e => e.id === employeeId);
    if (emp && !emp.is_active && emp.termination_date) {
        const tDate = new Date(emp.termination_date);
        const cellDate = new Date(dateStr);
        if (cellDate > tDate) {
            toast.error("İşten çıkarılan personelin çıkış tarihinden sonraki günleri değiştirilemez.");
            return;
        }
    }

    const valueToSet = activeBrush === "ERASER" ? "" : activeBrush;

    setPendingChanges(prev => ({
      ...prev,
      [`${employeeId}_${dateStr}`]: valueToSet
    }));

    // Optimistic UI update
    setEntries(prev => {
      const existing = prev.filter(e => !(e.employee_id === employeeId && e.date === dateStr));
      if (valueToSet === "") return existing;
      return [...existing, { employee_id: employeeId, date: dateStr, status: valueToSet }];
    });
  };

  const savePendingChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setIsSaving(true);

    const changesArray = Object.entries(pendingChanges).map(([key, status]) => {
      const [employee_id, date] = key.split('_');
      return { employee_id, date, status };
    });

    try {
      await bulkUpsertPuantaj(changesArray);
      toast.success("Değişiklikler kaydedildi");
      setPendingChanges({});
    } catch (err: any) {
      toast.error(err.message || "Kaydedilirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const seq_no = employees.length > 0 ? Math.max(...employees.map(emp => emp.seq_no)) + 1 : 1;
      const added = await addEmployee({ ...newEmployee, seq_no });
      setEmployees(prev => [...prev, added]);
      setIsAddEmployeeOpen(false);
      setNewEmployee({ full_name: "", role_title: "", sicil_no: "", hire_date: "" });
      toast.success("Personel eklendi");
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

      // We should probably refresh the page to get the correct filled entries from backend
      router.refresh();
      // Delay state updates slightly to allow refresh to kick in
      setTimeout(() => {
          setEmployees(prev => prev.map(emp => emp.id === employeeToTerminate.id ? { ...emp, is_active: false, termination_date: terminationDate } : emp));
      }, 500);

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Import from Sheets
  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await importEmployeesFromSheet(currentYear, currentMonth);
      toast.success(`${res.count} personel başarıyla içe aktarıldı`);
      router.refresh();
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
    setSyncUrl(null);
    try {
      // In a real app we might want to fetch fresh state, but we'll use current state
      const res = await syncPuantajToDrive(currentYear, currentMonth, employees, entries);
      setSyncUrl(res.spreadsheetUrl);
      toast.success("Google E-Tablolar ile başarıyla senkronize edildi!");
    } catch (err: any) {
      toast.error(err.message || "Senkronizasyon hatası");
    } finally {
      setIsSyncing(false);
    }
  };

  // View Calculation
  const calculateTotals = useCallback((employeeId: string) => {
    const empEntries = entries.filter(e => e.employee_id === employeeId);
    let work = 0; let hi = 0; let ui = 0; let d = 0;

    empEntries.forEach(entry => {
      // exclude entries outside the current month's bound (if they exist)
      const entryDay = parseInt(entry.date.split('-')[2]);
      if (entryDay > daysInMonth) return;

      if (["X", "A", "B", "C"].includes(entry.status)) work++;
      else if (entry.status === "Hİ") hi++;
      else if (entry.status === "Üİ") ui++;
      else if (entry.status === "D") d++;
    });
    return { work, hi, ui, d };
  }, [entries, daysInMonth]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-full overflow-hidden bg-gray-50/50">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-serif text-slate-800 font-semibold w-48 text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h1>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
            <DialogTrigger >
              <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Personel Ekle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Personel Ekle</DialogTitle></DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div><Label>Ad Soyad</Label><Input required value={newEmployee.full_name} onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})} /></div>
                <div><Label>Görevi</Label><Input value={newEmployee.role_title} onChange={e => setNewEmployee({...newEmployee, role_title: e.target.value})} /></div>
                <div><Label>Sicil No</Label><Input value={newEmployee.sicil_no} onChange={e => setNewEmployee({...newEmployee, sicil_no: e.target.value})} /></div>
                <div><Label>Giriş Tarihi</Label><Input type="date" value={newEmployee.hire_date} onChange={e => setNewEmployee({...newEmployee, hire_date: e.target.value})} /></div>
                <Button type="submit" className="w-full">Ekle</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="secondary" onClick={handleImport} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Tablodan İçe Aktar
          </Button>

          <Button onClick={handleSync} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Google E-Tablolar ile Senkronize Et
          </Button>

          {syncUrl && (
            <Button variant="outline" onClick={() => window.open(syncUrl, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" /> Tabloyu Aç
            </Button>
          )}
        </div>
      </div>

      {/* Brush Palette */}
      <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <span className="text-sm font-medium text-slate-500 mr-2">Fırça:</span>
        {brushStatuses.map(status => (
          <Button
            key={status.code}
            size="sm"
            variant={activeBrush === status.code ? "default" : "outline"}
            className={`h-8 px-3 ${activeBrush === status.code ? status.color : ''}`}
            onClick={() => setActiveBrush(activeBrush === status.code ? null : status.code)}
          >
            {status.code} - {status.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={activeBrush === "ERASER" ? "default" : "outline"}
          className={`h-8 px-3 ${activeBrush === "ERASER" ? 'bg-gray-800 text-white' : ''}`}
          onClick={() => setActiveBrush(activeBrush === "ERASER" ? null : "ERASER")}
        >
          <Eraser className="h-4 w-4 mr-1" /> Silici
        </Button>

        {Object.keys(pendingChanges).length > 0 && (
          <Button size="sm" onClick={savePendingChanges} disabled={isSaving} className="ml-auto bg-green-600 hover:bg-green-700">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Değişiklikleri Kaydet"}
          </Button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-[65vh]">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 border-b border-r bg-slate-50 sticky left-0 z-30 w-12">No</th>
                <th className="px-4 py-3 border-b border-r bg-slate-50 sticky left-12 z-30 w-48">Adı Soyadı</th>
                <th className="px-4 py-3 border-b border-r bg-slate-50 sticky left-60 z-30 w-40">Görevi</th>
                <th className="px-2 py-3 border-b border-r bg-slate-50 sticky left-[400px] z-30 w-10"></th>
                {daysArray.map(day => (
                  <th key={day} className={`px-1 py-3 text-center border-b border-r w-8 ${day > daysInMonth ? 'bg-gray-200' : ''}`}>
                    {day}
                  </th>
                ))}
                <th className="px-2 py-3 text-center border-b border-r bg-blue-50" title="Çalışma">Ç</th>
                <th className="px-2 py-3 text-center border-b border-r bg-green-50" title="Hafta İzni">Hİ</th>
                <th className="px-2 py-3 text-center border-b border-r bg-orange-50" title="Ücretsiz İzin">Üİ</th>
                <th className="px-2 py-3 text-center border-b bg-red-50" title="Devamsızlık">D</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const totals = calculateTotals(emp.id);
                const isTerminated = !emp.is_active && emp.termination_date && emp.termination_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2,'0')}`);
                // Don't show employees who were terminated in previous months
                if (!emp.is_active && !isTerminated && (!emp.termination_date || new Date(emp.termination_date) < new Date(currentYear, currentMonth - 1, 1))) {
                   return null;
                }

                return (
                  <tr key={emp.id} className={`border-b hover:bg-slate-50 ${!emp.is_active ? 'opacity-75' : ''}`}>
                    <td className="px-4 py-2 border-r bg-white sticky left-0 z-10 font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 border-r bg-white sticky left-12 z-10 font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
                      {emp.full_name}
                      {!emp.is_active && <span className="ml-2 text-xs text-red-500 font-bold">(Çıkış: {emp.termination_date?.split('-').reverse().join('.')})</span>}
                    </td>
                    <td className="px-4 py-2 border-r bg-white sticky left-60 z-10 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{emp.role_title}</td>
                    <td className="px-1 py-1 border-r bg-white sticky left-[400px] z-10 text-center">
                      {emp.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setEmployeeToTerminate(emp);
                            setIsTerminateOpen(true);
                          }}
                          title="İş Çıkışı Ver"
                        >
                          <LogOut className="h-3 w-3" />
                        </Button>
                      )}
                    </td>

                    {daysArray.map(day => {
                      if (day > daysInMonth) {
                        return <td key={day} className="border-r bg-gray-100"></td>;
                      }

                      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                      // Check for pending changes first
                      const pendingKey = `${emp.id}_${dateStr}`;
                      let statusCode = pendingChanges[pendingKey];

                      if (statusCode === undefined) {
                         const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);
                         statusCode = entry ? entry.status : "";
                      }

                      const statusDef = STATUSES.find(s => s.code === statusCode);
                      const isTerminatedCell = statusCode === 'TERMINATED';

                      return (
                        <td
                          key={day}
                          className={`border-r cursor-pointer text-center font-medium text-xs
                            ${isTerminatedCell ? 'bg-black text-black' : (statusDef?.color || '')}
                            ${activeBrush ? 'hover:ring-2 hover:ring-inset hover:ring-indigo-400' : ''}
                          `}
                          onClick={() => handleCellClick(emp.id, day)}
                        >
                          {isTerminatedCell ? '' : statusCode}
                        </td>
                      );
                    })}

                    <td className="px-2 py-2 border-r text-center font-semibold bg-blue-50/50">{totals.work > 0 ? totals.work : ''}</td>
                    <td className="px-2 py-2 border-r text-center font-semibold bg-green-50/50 text-green-700">{totals.hi > 0 ? totals.hi : ''}</td>
                    <td className="px-2 py-2 border-r text-center font-semibold bg-orange-50/50 text-orange-700">{totals.ui > 0 ? totals.ui : ''}</td>
                    <td className="px-2 py-2 text-center font-bold bg-red-50/50 text-red-600">{totals.d > 0 ? totals.d : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                Bu tarihten sonraki tüm günler &apos;İşten Çıkış (Siyah)&apos; olarak işaretlenecek ve personel sonraki aylarda tabloda görünmeyecektir.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminateOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleTerminateEmployee}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

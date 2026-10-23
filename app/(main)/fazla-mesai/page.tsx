"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { addFazlaMesai, updateFazlaMesai, deleteFazlaMesai } from "@/actions/fazla_mesai";
import { syncFazlaMesaiToDrive, getFazlaMesaiSpreadsheetId } from "@/actions/fazla-mesai-sync";
import { useEmployees } from "@/hooks/use-employees";
import { useDailyOvertime, useMonthlyOvertimeTotal } from "@/hooks/use-overtime";
import { useQueryClient } from "@tanstack/react-query";
import { Employee } from "@/app/(main)/puantaj/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, AlertTriangle, Clock, Edit2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmployeeAutocomplete } from "@/app/(main)/puantaj/components/EmployeeAutocomplete";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, UploadCloud, ExternalLink } from "lucide-react";

function FazlaMesaiPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const formRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const dateParam = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<Date>(() => dateParam ? new Date(dateParam) : new Date());

  useEffect(() => {
    const newDateStr = format(selectedDate, "yyyy-MM-dd");
    if (newDateStr !== searchParams.get("date")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", newDateStr);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [selectedDate, searchParams, router]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const { data: employees = [] } = useEmployees(year, month);
  const { data: dailyMesaiList = [], isLoading: isDailyLoading } = useDailyOvertime(dateStr);
  const { data: monthlyTotal = 0 } = useMonthlyOvertimeTotal(year, month);
  const isLoading = isDailyLoading;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [formData, setFormData] = useState({ id: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getFazlaMesaiSpreadsheetId(month, year).then(res => {
      if (isMounted) {
        if (res.success && res.spreadsheetUrl) {
          setSyncUrl(res.spreadsheetUrl);
        } else {
          setSyncUrl(null);
        }
      }
    });
    return () => { isMounted = false; };
  }, [month, year]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncFazlaMesaiToDrive(year, month);
      if (res && !res.success) {
        toast.error(res.error || "Senkronizasyon hatası");
      } else {
        setSyncUrl(res.spreadsheetUrl || null);
        if (res.spreadsheetUrl) {
          toast.success("Drive ile senkronize edildi", {
            action: {
              label: "Tabloyu Aç",
              onClick: () => window.open(res.spreadsheetUrl, "_blank")
            }
          });
        } else {
          toast.success("Drive ile senkronize edildi");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Senkronizasyon hatası");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (actionParam === "new") {
      // Small delay to ensure render
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Optionally focus the employee input if we had a ref for it
      }, 100);

      const params = new URLSearchParams(searchParams);
      params.delete("action");
      router.replace(`?${params.toString()}`);
    }
  }, [actionParam, router, searchParams]);

  // Automatically update the default form date when selectedDate changes
  useEffect(() => {
    if (!formData.id) {
      setFormData(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
    }
  }, [selectedDate, formData.id]);



  const filterYear = selectedDate.getFullYear();
  const filterMonth = selectedDate.getMonth() + 1;
  const dateString = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {

  }, [dateString]);

  useEffect(() => {

  }, [filterYear, filterMonth]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };







  const refreshData = () => {


  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !formData.date || !formData.hours) {
      toast.error("Lütfen gerekli alanları doldurun.");
      return;
    }

    setIsSubmitting(true);
    const submitData = new FormData();
    submitData.append("employee_id", selectedEmployeeId);
    submitData.append("mesai_date", formData.date);
    submitData.append("hours", formData.hours);
    if (formData.description) {
      submitData.append("description", formData.description);
    }

    try {
      const res = formData.id
        ? await updateFazlaMesai(formData.id, submitData)
        : await addFazlaMesai(submitData);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(formData.id ? "Fazla mesai güncellendi." : "Fazla mesai eklendi.");
        queryClient.invalidateQueries({ queryKey: ["fazla_mesai"] });
        queryClient.invalidateQueries({ queryKey: ["fazla_mesai_total"] });
        queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });
        setFormData({ id: "", date: format(selectedDate, "yyyy-MM-dd"), hours: "", description: "" });
        setSelectedEmployeeId("");
        setSelectedEmployeeName("");

      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (mesai: any) => {
    setSelectedEmployeeId(mesai.employee_id);
    setSelectedEmployeeName((mesai.employees as any)?.full_name || "-" || "");
    setFormData({
      id: mesai.id,
      date: mesai.mesai_date,
      hours: mesai.hours.toString(),
      description: mesai.description || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await deleteFazlaMesai(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Kayıt silindi.");
        queryClient.invalidateQueries({ queryKey: ["fazla_mesai"] });
        queryClient.invalidateQueries({ queryKey: ["fazla_mesai_total"] });
        queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });

      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    }
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fazla Mesai</h1>
        <p className="text-sm text-muted-foreground mt-1">Personel fazla mesai kayıtları ve aylık özet raporu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ekleme Formu */}
        <div className="md:col-span-1" ref={formRef}>
          <div className="md:sticky md:top-6">
            <Card className="shadow-sm border-border/60 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Kayıt Ekle</CardTitle>
                <CardDescription>Yeni bir mesai kaydı oluşturun</CardDescription>
              </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Personel</Label>
                <EmployeeAutocomplete
                  employees={employees}
                  searchQuery={selectedEmployeeName}
                  onSearchQueryChange={setSelectedEmployeeName}
                  selectedEmployeeId={selectedEmployeeId}
                  onSelectEmployee={(id, name) => {
                    setSelectedEmployeeId(id);
                    setSelectedEmployeeName(name);
                  }}
                  onClear={() => {
                    setSelectedEmployeeId("");
                    setSelectedEmployeeName("");
                  }}
                  placeholder="Personel ara..."
                  inputClassName="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tarih</Label>
                  <Input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Saat</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Açıklama (Opsiyonel)</Label>
                <Textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {formData.id && (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => {
                    setFormData({ id: "", date: format(selectedDate, "yyyy-MM-dd"), hours: "", description: "" });
                    setSelectedEmployeeId("");
                    setSelectedEmployeeName("");
                  }}>
                    İptal
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isSubmitting || !selectedEmployeeId}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  {formData.id ? "Güncelle" : "Mesai Ekle"}
                </Button>
              </div>
            </form>
          </CardContent>
            </Card>
          </div>
        </div>

        {/* Raporlar */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/60 rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">Aylık Rapor</CardTitle>
                <CardDescription>Mevcut ayın özet tablosu ve detayları</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
                  <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger render={
                      <Button variant="ghost" className="h-8 min-w-[140px] font-medium justify-center flex gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {format(selectedDate, "dd MMMM yyyy", { locale: tr })}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        locale={tr}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium shadow-sm hover:bg-accent"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : (
                    <UploadCloud className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Dışa Aktar</span>
                </Button>

                {syncUrl && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => window.open(syncUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 text-emerald-600" />
                    <span className="hidden sm:inline">Drive'da Aç</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-8">
                {/* Global Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="border-border/60 shadow-sm rounded-2xl bg-card">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="font-medium flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" /> Seçili Gün Toplamı
                        </div>
                      </CardDescription>
                      <CardTitle className="text-3xl font-light text-foreground tabular-nums">
                        {dailyMesaiList.reduce((acc, curr) => acc + curr.hours, 0)}{" "}
                        <span className="text-sm font-normal text-muted-foreground font-sans">saat</span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="border-border/60 shadow-sm rounded-2xl bg-card">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="font-medium flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Aylık Toplam
                        </div>
                      </CardDescription>
                      <CardTitle className="text-3xl font-light text-foreground tabular-nums">
                        {monthlyTotal}{" "}
                        <span className="text-sm font-normal text-muted-foreground font-sans">saat</span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Details Section */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Kayıt Detayları</h3>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : dailyMesaiList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center p-8 text-center">
                      <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-3">
                        <Clock className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Bu tarihte mesai kaydı bulunmuyor</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">Yeni kayıt eklemek için soldaki formu kullanabilirsiniz.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto">
                      <table className="w-full min-w-[540px] text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                          <tr>
                            <th className="px-4 py-3 font-medium">Personel</th>
                            <th className="px-4 py-3 font-medium">Saat</th>
                            <th className="px-4 py-3 font-medium">Açıklama</th>
                            <th className="px-4 py-3 font-medium text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {dailyMesaiList.map((mesai) => {
                            const isOverLimit = mesai.hours > 3;
                            return (
                              <tr key={mesai.id} className={`hover:bg-slate-50/50 transition-colors ${isOverLimit ? 'bg-red-50/30' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">{(mesai.employees as any)?.full_name || "-"}</div>
                                  <div className="text-xs text-slate-500">{(mesai.employees as any)?.role_title || "-"}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className={isOverLimit ? 'bg-red-100 text-red-700' : ''}>
                                      {mesai.hours} Saat
                                    </Badge>
                                    {isOverLimit && (
                                      <span title="Günlük 3 saat limiti aşıldı" className="cursor-help inline-flex"><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={mesai.description}>
                                  {mesai.description || "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(mesai)}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(mesai.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FazlaMesaiPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <FazlaMesaiPageContent />
    </Suspense>
  );
}

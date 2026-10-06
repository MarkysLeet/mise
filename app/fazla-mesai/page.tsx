"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth, addFazlaMesai, updateFazlaMesai, deleteFazlaMesai } from "@/actions/fazla_mesai";
import { getEmployees } from "@/actions/puantaj";
import { Employee } from "@/app/puantaj/types";
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
import { Loader2, Trash2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmployeeAutocomplete } from "@/app/puantaj/components/EmployeeAutocomplete";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export default function FazlaMesaiPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyMesaiList, setDailyMesaiList] = useState<any[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [formData, setFormData] = useState({ id: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Automatically update the default form date when selectedDate changes
  useEffect(() => {
    if (!formData.id) {
      setFormData(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
    }
  }, [selectedDate, formData.id]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filterYear = selectedDate.getFullYear();
  const filterMonth = selectedDate.getMonth() + 1;
  const dateString = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    fetchDailyData(dateString);
  }, [dateString]);

  useEffect(() => {
    fetchMonthlyTotal(filterYear, filterMonth);
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

  const fetchEmployees = async () => {
    try {
      const empRes = await getEmployees();
      setEmployees(empRes || []);
    } catch (error) {
      toast.error("Personel listesi yüklenirken hata oluştu.");
    }
  };

  const fetchDailyData = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const mesaiRes = await getFazlaMesaiByDate(dateStr);
      setDailyMesaiList(mesaiRes || []);
    } catch (error) {
      toast.error("Günlük veriler yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyTotal = async (year: number, month: number) => {
    try {
      const total = await getFazlaMesaiTotalByMonth(year, month);
      setMonthlyTotal(total || 0);
    } catch (error) {
      toast.error("Aylık toplam yüklenirken hata oluştu.");
    }
  };

  const refreshData = () => {
    fetchDailyData(dateString);
    fetchMonthlyTotal(filterYear, filterMonth);
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
        setFormData({ id: "", date: format(selectedDate, "yyyy-MM-dd"), hours: "", description: "" });
        setSelectedEmployeeId("");
        setSelectedEmployeeName("");
        refreshData();
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (mesai: any) => {
    setSelectedEmployeeId(mesai.employee_id);
    setSelectedEmployeeName(mesai.employees?.full_name || "");
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
        refreshData();
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fazla Mesai</h1>
        <p className="text-sm text-muted-foreground mt-1">Personel fazla mesai kayıtları ve aylık özet raporu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ekleme Formu */}
        <div className="md:col-span-1">
          <div className="sticky top-6">
            <Card className="shadow-sm border-zinc-200">
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

              <div className="grid grid-cols-2 gap-4">
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
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
              <div className="space-y-1">
                <CardTitle className="text-lg">Aylık Rapor</CardTitle>
                <CardDescription>Mevcut ayın özet tablosu ve detayları</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
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
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-8">
                {/* Global Statistics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Seçili Gün Toplamı</h3>
                    <p className="text-3xl font-bold text-blue-900">
                      {dailyMesaiList.reduce((acc, curr) => acc + curr.hours, 0)} <span className="text-sm font-normal text-blue-700">saat</span>
                    </p>
                  </div>
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Aylık Toplam</h3>
                    <p className="text-3xl font-bold text-slate-900">
                      {monthlyTotal} <span className="text-sm font-normal text-slate-500">saat</span>
                    </p>
                  </div>
                </div>

                {/* Details Section */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Kayıt Detayları</h3>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : dailyMesaiList.length === 0 ? (
                    <div className="rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Clock className="w-8 h-8 mb-2 opacity-50" />
                      <p>Bu tarihte mesai kaydı bulunmuyor.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border overflow-hidden">
                      <table className="w-full text-sm text-left">
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
                                  <div className="font-medium text-slate-900">{mesai.employees?.full_name}</div>
                                  <div className="text-xs text-slate-500">{mesai.employees?.role_title}</div>
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
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit2 w-4 h-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
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

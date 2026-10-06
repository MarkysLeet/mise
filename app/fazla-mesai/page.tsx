"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getFazlaMesaiByMonth, addFazlaMesai, updateFazlaMesai, deleteFazlaMesai } from "@/actions/fazla_mesai";
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

export default function FazlaMesaiPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mesaiList, setMesaiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [formData, setFormData] = useState({ id: "", date: "", hours: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());

  const fetchInitialData = async (yearStr = filterYear, monthStr = filterMonth) => {
    setIsLoading(true);
    try {
      const [empRes, mesaiRes] = await Promise.all([
        getEmployees(),
        getFazlaMesaiByMonth(parseInt(yearStr), parseInt(monthStr))
      ]);
      setEmployees(empRes || []);
      setMesaiList(mesaiRes || []);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData(filterYear, filterMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setFormData({ id: "", date: "", hours: "", description: "" });
        setSelectedEmployeeId("");
        setSelectedEmployeeName("");
        fetchInitialData();
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
        fetchInitialData();
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    }
  };

  // Calculate Summary
  const summaryByEmployee = mesaiList.reduce((acc, curr) => {
    const empId = curr.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        name: curr.employees?.full_name || "Bilinmiyor",
        role: curr.employees?.role_title || "-",
        totalHours: 0,
        recordsCount: 0
      };
    }
    acc[empId].totalHours += curr.hours;
    acc[empId].recordsCount += 1;
    return acc;
  }, {} as Record<string, any>);

  const summaryList = Object.values(summaryByEmployee).sort((a: any, b: any) => b.totalHours - a.totalHours);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fazla Mesai</h1>
        <p className="text-sm text-muted-foreground mt-1">Personel fazla mesai kayıtları ve aylık özet raporu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ekleme Formu */}
        <Card className="md:col-span-1 shadow-sm border-zinc-200 h-fit">
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

              <div className="flex gap-2">
                {formData.id && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => {
                    setFormData({ id: "", date: "", hours: "", description: "" });
                    setSelectedEmployeeId("");
                    setSelectedEmployeeName("");
                  }}>
                    İptal
                  </Button>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting || !selectedEmployeeId}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  {formData.id ? "Güncelle" : "Mesai Ekle"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Raporlar */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
              <div className="space-y-1">
                <CardTitle className="text-lg">Aylık Rapor</CardTitle>
                <CardDescription>Mevcut ayın özet tablosu ve detayları</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterMonth} onValueChange={(val) => {
                  if (val) {
                    setFilterMonth(val);
                    fetchInitialData(filterYear, val);
                  }
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Ay" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {format(new Date(2024, i, 1), "MMMM", { locale: tr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterYear} onValueChange={(val) => {
                  if (val) {
                    setFilterYear(val);
                    fetchInitialData(val, filterMonth);
                  }
                }}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Yıl" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={(now.getFullYear() - 1).toString()}>{now.getFullYear() - 1}</SelectItem>
                    <SelectItem value={now.getFullYear().toString()}>{now.getFullYear()}</SelectItem>
                    <SelectItem value={(now.getFullYear() + 1).toString()}>{now.getFullYear() + 1}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : mesaiList.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Bu ay için mesai kaydı bulunmuyor.</p>
                </div>
              ) : (
                <div className="p-4 space-y-8">
                  {/* Summary Section */}
                  <div>
                     <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Personel Özeti</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {summaryList.map((summary: any, idx) => (
                          <div key={idx} className="bg-slate-50 border rounded-xl p-3 flex justify-between items-center">
                            <div className="truncate pr-2">
                              <p className="text-sm font-medium text-slate-900 truncate">{summary.name}</p>
                              <p className="text-xs text-slate-500 truncate">{summary.role}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-slate-900">{summary.totalHours} <span className="text-xs font-normal text-slate-500">saat</span></p>
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Details Section */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Kayıt Detayları</h3>
                    <div className="rounded-xl border overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                          <tr>
                            <th className="px-4 py-3 font-medium">Tarih</th>
                            <th className="px-4 py-3 font-medium">Personel</th>
                            <th className="px-4 py-3 font-medium">Saat</th>
                            <th className="px-4 py-3 font-medium">Açıklama</th>
                            <th className="px-4 py-3 font-medium text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {mesaiList.map((mesai) => {
                            const isOverLimit = mesai.hours > 3;
                            return (
                              <tr key={mesai.id} className={`hover:bg-slate-50/50 transition-colors ${isOverLimit ? 'bg-red-50/30' : ''}`}>
                                <td className="px-4 py-3 font-medium whitespace-nowrap">
                                  {mesai.mesai_date.split('-').reverse().join('.')}
                                </td>
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

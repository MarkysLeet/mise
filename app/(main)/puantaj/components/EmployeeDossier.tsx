"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Employee, Entry } from "../types";
import { Button } from "@/components/ui/button";
import { Edit2, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFazlaMesaiByEmployee, addFazlaMesai, updateFazlaMesai, deleteFazlaMesai } from "@/actions/fazla_mesai";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeDossierProps {
  employee: Employee | null;
  entries: Entry[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: number;
  onEditEmployee: (employee: Employee) => void;
}

export function EmployeeDossier({ employee, entries, isOpen, onOpenChange, currentMonth, onEditEmployee }: EmployeeDossierProps) {
  const [activeTab, setActiveTab] = useState("genel");
  const [mesaiList, setMesaiList] = useState<any[]>([]);
  const [isLoadingMesai, setIsLoadingMesai] = useState(false);
  const [isAddingMesai, setIsAddingMesai] = useState(false);
  const [mesaiFormData, setMesaiFormData] = useState({ id: "", date: "", hours: "", description: "" });
  const [isSubmittingMesai, setIsSubmittingMesai] = useState(false);

  useEffect(() => {
    if (isOpen && employee && activeTab === "mesai") {
      fetchMesai();
    }
  }, [isOpen, employee, activeTab]);

  const fetchMesai = async () => {
    if (!employee) return;
    setIsLoadingMesai(true);
    try {
      const data = await getFazlaMesaiByEmployee(employee.id);
      setMesaiList(data || []);
    } catch (error) {
      toast.error("Fazla mesai kayıtları yüklenemedi.");
    } finally {
      setIsLoadingMesai(false);
    }
  };

  const handleAddMesaiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !mesaiFormData.date || !mesaiFormData.hours) return;

    setIsSubmittingMesai(true);
    const formData = new FormData();
    formData.append("employee_id", employee.id);
    formData.append("mesai_date", mesaiFormData.date);
    formData.append("hours", mesaiFormData.hours);
    if (mesaiFormData.description) {
      formData.append("description", mesaiFormData.description);
    }

    try {
      const res = mesaiFormData.id
        ? await updateFazlaMesai(mesaiFormData.id, formData)
        : await addFazlaMesai(formData);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(mesaiFormData.id ? "Fazla mesai güncellendi." : "Fazla mesai eklendi.");
        setIsAddingMesai(false);
        setMesaiFormData({ id: "", date: "", hours: "", description: "" });
        fetchMesai();
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsSubmittingMesai(false);
    }
  };

  const handleEditMesai = (mesai: any) => {
    setMesaiFormData({
      id: mesai.id,
      date: mesai.mesai_date,
      hours: mesai.hours.toString(),
      description: mesai.description || ""
    });
    setIsAddingMesai(true);
  };

  const handleDeleteMesai = async (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await deleteFazlaMesai(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Kayıt silindi.");
        fetchMesai();
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    }
  };

  if (!employee) return null;

  // Calculate stats for current month
  const monthEntries = entries.filter(e => e.employee_id === employee.id);
  const X_count = monthEntries.filter(e => e.status === "X").length;
  const HI_count = monthEntries.filter(e => e.status === "Hİ").length;
  const D_count = monthEntries.filter(e => e.status === "D").length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setActiveTab("genel");
        setIsAddingMesai(false);
        setMesaiFormData({ id: "", date: "", hours: "", description: "" });
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">{employee.full_name}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {employee.role_title}
                {employee.is_active ? (
                   <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Aktif</Badge>
                ) : (
                   <Badge variant="destructive" className="ml-2">İşten Çıktı</Badge>
                )}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEditEmployee(employee)}>
              <Edit2 className="h-4 w-4 mr-2" /> Düzenle
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="genel">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="mesai">Fazla Mesai</TabsTrigger>
          </TabsList>

          <TabsContent value="genel" className="space-y-6 mt-0">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-slate-900">Kişisel Bilgiler</h3>
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-stone-50/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                  <p className="text-sm font-medium">{employee.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bölüm / Outlet</p>
                  <p className="text-sm font-medium">{employee.department_outlet || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Giriş Tarihi</p>
                  <p className="text-sm font-medium">{employee.hire_date ? employee.hire_date.split('-').reverse().join('.') : "-"}</p>
                </div>
                {!employee.is_active && (
                  <div>
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
          </TabsContent>

          <TabsContent value="mesai" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-slate-900">Mesai Geçmişi</h3>
              {!isAddingMesai && (
                <Button size="sm" onClick={() => setIsAddingMesai(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Kayıt Ekle
                </Button>
              )}
            </div>

            {isAddingMesai && (
              <form onSubmit={handleAddMesaiSubmit} className="space-y-4 border rounded-xl p-4 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tarih</Label>
                    <Input
                      type="date"
                      required
                      value={mesaiFormData.date}
                      onChange={(e) => setMesaiFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Saat</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={mesaiFormData.hours}
                      onChange={(e) => setMesaiFormData(prev => ({ ...prev, hours: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Açıklama (Opsiyonel)</Label>
                  <Textarea
                    rows={2}
                    value={mesaiFormData.description}
                    onChange={(e) => setMesaiFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingMesai(false)}>İptal</Button>
                  <Button type="submit" disabled={isSubmittingMesai}>
                    {isSubmittingMesai ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Kaydet
                  </Button>
                </div>
              </form>
            )}

            {isLoadingMesai ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : mesaiList.length === 0 ? (
              <div className="text-center py-8 border rounded-xl border-dashed">
                <p className="text-sm text-muted-foreground">Henüz mesai kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mesaiList.map((mesai) => {
                  const isOverLimit = mesai.hours > 3;
                  return (
                    <div key={mesai.id} className={`flex items-center justify-between p-3 border rounded-xl ${isOverLimit ? 'bg-red-50/50 border-red-100' : 'bg-white'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mesai.mesai_date.split('-').reverse().join('.')}</span>
                          <Badge variant="secondary" className={isOverLimit ? 'bg-red-100 text-red-700 hover:bg-red-100' : ''}>
                            {mesai.hours} Saat
                          </Badge>
                          {isOverLimit && (
                            <span title="Günlük 3 saat limiti aşıldı" className="cursor-help inline-flex"><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                          )}
                        </div>
                        {mesai.description && (
                          <p className="text-xs text-muted-foreground mt-1">{mesai.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEditMesai(mesai)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteMesai(mesai.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

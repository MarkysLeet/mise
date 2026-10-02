"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addRole, deleteRole, updateRole } from "@/actions/settings";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Database } from "@/types/database";

type Role = Database["public"]["Tables"]["roles"]["Row"];

export function RolesTab({ initialRoles }: { initialRoles: Role[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({ id: "", title: "", priority: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({ id: "", title: "", priority: 10 });
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setModalMode("edit");
    setFormData({ id: role.id, title: role.title, priority: role.priority || 10 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const newRole = await addRole(formData.title, formData.priority);
        setRoles([...roles, newRole].sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.title.localeCompare(b.title, 'tr-TR')));
        toast.success("Görev eklendi.");
      } else {
        const updatedRole = await updateRole(formData.id, formData.title, formData.priority);
        setRoles(roles.map((r) => (r.id === formData.id ? updatedRole : r)).sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.title.localeCompare(b.title, 'tr-TR')));
        toast.success("Görev güncellendi.");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("İşlem başarısız: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteRole(id);
      setRoles(roles.filter((r) => r.id !== id));
      toast.success("Görev silindi.");
    } catch (error) {
      toast.error("Silme işlemi başarısız: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Görev Yönetimi</CardTitle>
            <CardDescription>Puantaj sisteminde kullanılacak görevleri ve sıralamalarını yönetin.</CardDescription>
          </div>
          <Button onClick={openCreateModal}><Plus className="mr-2 h-4 w-4" /> Yeni Görev</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="h-10 px-4 text-left font-medium">Sıra / Öncelik</th>
                  <th className="h-10 px-4 text-left font-medium">Görev Adı</th>
                  <th className="h-10 px-4 text-right font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">Henüz bir görev eklenmemiş.</td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{role.priority}</td>
                      <td className="p-4 font-medium">{role.title}</td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(role)}>
                          <Edit className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === "create" ? "Yeni Görev Ekle" : "Görevi Düzenle"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Görev Adı</Label>
              <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Garson" />
            </div>
            <div>
              <Label>Öncelik (Küçük sayı daha üstte görünür)</Label>
              <Input type="number" required value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isSubmitting}>{modalMode === "create" ? "Ekle" : "Kaydet"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addTutanakTemplate, updateTutanakTemplate, deleteTutanakTemplate } from "@/actions/settings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TutanakTemplatesTab({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Devamsızlık");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setCategory("Devamsızlık");
    setTitle("");
    setContent("");
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (template: any) => {
    setEditingId(template.id);
    setCategory(template.category);
    setTitle(template.title);
    setContent(template.content);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !category) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateTutanakTemplate(editingId, category, title, content);
        setTemplates(templates.map(t => t.id === editingId ? updated : t));
        toast.success("Şablon güncellendi.");
      } else {
        const added = await addTutanakTemplate(category, title, content);
        setTemplates([...templates, added]);
        toast.success("Yeni şablon eklendi.");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;

    try {
      await deleteTutanakTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success("Şablon silindi.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Şablon silinemedi.");
    }
  };

  return (
    <Card className="border-border/50 shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Tutanak Şablonları
          </CardTitle>
          <CardDescription>
            Tutanak oluştururken kullanılabilecek metin şablonlarını yönetin.
          </CardDescription>
        </div>
        <Button onClick={openAddModal} className="rounded-xl shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Yeni Şablon Ekle
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {templates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="h-8 w-8 mb-3 opacity-20" />
            <p>Henüz hiç şablon eklenmemiş.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {templates.map((template) => (
              <div key={template.id} className="p-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {template.category}
                    </span>
                    <h4 className="font-medium text-sm text-foreground truncate">{template.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{template.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(template)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}</DialogTitle>
            <DialogDescription>
              Tutanak kategorisini, başlığını ve şablon metnini girin.
              Metin içinde otomatik doldurulacak alanlar için {"{{personel_adi}}"}, {"{{gorevi}}"}, {"{{tarih}}"} gibi etiketler kullanabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kategori Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Devamsızlık">Devamsızlık</SelectItem>
                  <SelectItem value="İş Kazası">İş Kazası</SelectItem>
                  <SelectItem value="Disiplin">Disiplin</SelectItem>
                  <SelectItem value="Diğer">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Şablon Adı</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Hastalık (Haber Verdi)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Şablon Metni</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Örn: {{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) rahatsızlandığını..."
                rows={6}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Ekle")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

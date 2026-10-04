"use client";

import { useState, useEffect } from "react";
import { FileText, User, AlertTriangle, Download, Plus, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { generateTutanak, getTutanakFiles, TutanakFile } from "@/actions/tutanak";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function TutanakPage() {
  const router = useRouter();

  const [files, setFiles] = useState<TutanakFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    const result = await getTutanakFiles();

    if (result.error) {
      toast.error(result.error);
      if (result.resetAuth) {
        router.push("/onboarding?error=Lütfen hesabınızı tekrar bağlayın");
      }
    } else if (result.files) {
      setFiles(result.files);
    }
    setIsLoadingFiles(false);
  };

  useEffect(() => {
    fetchFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await generateTutanak(formData);

      if (result.error) {
        setFormError(result.error);
        if (result.resetAuth) {
           router.push("/onboarding?error=Lütfen hesabınızı tekrar bağlayın");
        }
      } else if (result.success && result.documentUrl) {
        toast.success("Belge başarıyla oluşturuldu!", {
          action: {
            label: "Dokümanı Aç",
            onClick: () => window.open(result.documentUrl, "_blank", "noopener,noreferrer"),
          },
        });
        setIsModalOpen(false);
        fetchFiles();
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto p-8 pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tutanak Kütüphanesi</h1>
            <p className="text-muted-foreground mt-1">Oluşturulan tutanak belgelerini görüntüleyin ve yenilerini ekleyin.</p>
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger render={
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Yeni Tutanak Oluştur
            </Button>
          } />
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Tutanak Oluştur</DialogTitle>
              <DialogDescription>Aşağıdaki formu doldurarak resmi tutanak belgenizi otomatik oluşturun.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="grid gap-6">

                {formError && (
                  <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="olayTarihi" className="text-muted-foreground">Olay Tarihi ve Saati</Label>
                    <div className="relative">
                      <Input
                        id="olayTarihi"
                        name="olayTarihi"
                        type="datetime-local"
                        required
                        className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="olayYeri" className="text-muted-foreground">Olay Yeri</Label>
                    <div className="relative">
                      <Input
                        id="olayYeri"
                        name="olayYeri"
                        placeholder="Örn. Ana Restoran, Kat 3"
                        required
                        className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="kategori" className="text-muted-foreground">Tutanak Kategorisi</Label>
                    <Select name="kategori" required>
                      <SelectTrigger className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl w-full" size="default">
                        <SelectValue placeholder="Kategori Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Devamsizlik">Devamsızlık</SelectItem>
                        <SelectItem value="Is Kazasi">İş Kazası</SelectItem>
                        <SelectItem value="Disiplin">Disiplin</SelectItem>
                        <SelectItem value="Diger">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="konu" className="text-muted-foreground">Detaylı Konu</Label>
                    <div className="relative">
                      <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="konu"
                        name="konu"
                        placeholder="Örn. Kurallara Uymama"
                        required
                        className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="adSoyad" className="text-muted-foreground">Personel Adı Soyadı</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adSoyad"
                        name="adSoyad"
                        placeholder="Örn. Ahmet Yılmaz"
                        required
                        className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depPos" className="text-muted-foreground">Departman & Pozisyon</Label>
                    <div className="relative">
                      <Input
                        id="depPos"
                        name="depPos"
                        placeholder="Örn. F&B / Garson"
                        required
                        className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aciklama" className="text-muted-foreground">Detaylı Açıklama</Label>
                  <textarea
                    id="aciklama"
                    name="aciklama"
                    rows={6}
                    required
                    placeholder="Lütfen olayı objektif bir şekilde açıklayın..."
                    className="w-full p-4 bg-stone-50/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

              </div>
              <DialogFooter className="mt-6 border-t border-border/50 pt-4 bg-transparent sm:bg-transparent -mx-0 -mb-0 p-0 sm:p-0">
                <div className="flex justify-end gap-3 w-full">
                  <DialogClose render={<Button type="button" variant="outline" className="rounded-xl">İptal</Button>} />
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl shadow-sm">
                    {isSubmitting ? (
                      "Oluşturuluyor..."
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" /> Oluştur
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Grid of Documents */}
      {isLoadingFiles ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-10/12 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mt-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-stone-50/50 border border-dashed border-border/50 rounded-2xl text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Henüz Tutanak Yok</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">Tutanaklar oluşturulduğunda burada listelenecektir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <Link key={file.id} href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="block group h-full">
              <Card className="border-border/50 shadow-sm rounded-2xl h-full transition-all hover:shadow-md hover:border-primary/20 flex flex-col">
                <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <CardTitle className="text-base font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {file.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(file.createdTime).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </CardDescription>
                  </div>
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-4 flex items-center text-xs text-muted-foreground font-medium group-hover:text-primary transition-colors">
                  Dokümanı Görüntüle <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

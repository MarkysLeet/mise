"use client";

import { useState, useEffect } from "react";
import { FileText, User, Download, Plus, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { generateTutanak, getTutanakFiles, getTutanakFormOptions, TutanakFile } from "@/actions/tutanak";
import { EmployeeAutocomplete } from "@/app/puantaj/components/EmployeeAutocomplete";
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

  // Options state
  const [employees, setEmployees] = useState<{id: string, full_name: string, role_title: string, department_outlet: string}[]>([]);
  const [templates, setTemplates] = useState<{id: string, category: string, title: string, content: string}[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string>("");

  // Form state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [aciklama, setAciklama] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

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

  const fetchOptions = async () => {
    const opts = await getTutanakFormOptions();
    if (!opts.error) {
      setEmployees(opts.employees || []);
      setTemplates(opts.templates || []);
      setWorkspaceName(opts.workspaceName || "");
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await Promise.all([fetchFiles(), fetchOptions()]);
    };
    if (mounted) {
      load();
    }
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmployeeSelect = (empId: string, fullName: string) => {
    setSelectedEmployeeId(empId);
    setEmployeeSearchQuery(fullName);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    let content = template.content;
    const selectedEmp = employees.find(e => e.id === selectedEmployeeId);

    const formattedDate = incidentDate ? new Date(incidentDate).toLocaleDateString("tr-TR") : "";

    if (selectedEmp) {
      content = content.replace(/{{personel_adi}}/gi, selectedEmp.full_name);
      const role = selectedEmp.role_title || "";
      content = content.replace(/{{gorevi}}/gi, role);
    }
    content = content.replace(/{{tarih}}/gi, formattedDate);

    setAciklama(content);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    if (selectedEmployeeId) {
      formData.append("employee_id", selectedEmployeeId);
    }

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
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
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

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="kategori" className="text-muted-foreground">Tutanak Kategorisi</Label>
                    <Select name="kategori" required value={selectedCategory} onValueChange={(val) => {
                      setSelectedCategory(val || "");
                      setSelectedTemplateId("");
                      setAciklama("");
                    }}>
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
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="adSoyad" className="text-muted-foreground">Personel Adı Soyadı</Label>
                    <EmployeeAutocomplete
                      employees={employees}
                      searchQuery={employeeSearchQuery}
                      onSearchQueryChange={setEmployeeSearchQuery}
                      selectedEmployeeId={selectedEmployeeId}
                      onSelectEmployee={handleEmployeeSelect}
                      onClear={() => { setSelectedEmployeeId(null); setEmployeeSearchQuery(""); }}
                      placeholder="Personel Ara..."
                      className="w-full"
                      inputClassName="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                    />
                    <input type="hidden" name="adSoyad" value={employees.find(e => e.id === selectedEmployeeId)?.full_name || employeeSearchQuery} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depPos" className="text-muted-foreground">Departman & Pozisyon</Label>
                    <div className="relative">
                      <Input
                        id="depPos"
                        name="depPos"
                        value={
                          selectedEmployeeId
                            ? `${workspaceName} / ${employees.find(e => e.id === selectedEmployeeId)?.role_title || ''}`
                            : ''
                        }
                        readOnly
                        placeholder="Otomatik Doldurulur"
                        required
                        className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="aciklama" className="text-muted-foreground">Detaylı Açıklama</Label>

                    <div className="w-48 shrink-0 ml-4">
                      <Select
                        value={selectedTemplateId}
                        onValueChange={(val) => handleTemplateChange(val || "")}
                        disabled={!selectedCategory || templates.filter(t => t.category === selectedCategory).length === 0}
                      >
                        <SelectTrigger className="h-8 text-xs bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-lg w-full">
                          <SelectValue placeholder="Şablon Seç..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCategory && templates.filter(t => t.category === selectedCategory).map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <textarea
                    id="aciklama"
                    name="aciklama"
                    value={aciklama}
                    onChange={(e) => setAciklama(e.target.value)}
                    rows={6}
                    required
                    placeholder="Lütfen olayı objektif bir şekilde açıklayın..."
                    className="w-full p-4 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/50 shadow-sm rounded-xl">
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-4 w-10/12 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-3 mt-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-full mb-1.5" />
                    <Skeleton className="h-3 w-3/4" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <Link key={file.id} href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="block group h-full">
              <Card className="border-border/50 shadow-sm rounded-xl h-full transition-all hover:shadow-md hover:border-primary/20 flex flex-col p-4">
                <CardHeader className="p-0 pb-3 flex-row items-center justify-between gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors" title={file.name}>
                      {file.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {new Date(file.createdTime).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 mt-auto pt-3 border-t border-border/30 flex items-center text-xs text-muted-foreground font-medium group-hover:text-primary transition-colors">
                  Dokümanı Görüntüle <ExternalLink className="ml-auto h-3.5 w-3.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Cloud, FolderOpen, CheckCircle2, Copy, ExternalLink, RefreshCw, FileSearch, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SyncModal } from "@/components/SyncModal";
import { updateProfile, updateWorkspace, deleteAccount } from "@/actions/settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesTab } from "@/components/settings/RolesTab";


import { TutanakTemplatesTab } from "./TutanakTemplatesTab";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SettingsClientPage({ initialWorkspace, initialProfile, initialRoles, initialTemplates }: { initialWorkspace: any, initialProfile: any, initialRoles: any[], initialTemplates: any[] }) {
  const router = useRouter();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [firstName, setFirstName] = useState(initialProfile.first_name);
  const [lastName, setLastName] = useState(initialProfile.last_name);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [hotelName, setHotelName] = useState(initialWorkspace.hotel_name || "");
  const [hotelGroup, setHotelGroup] = useState(initialWorkspace.hotel_group || "Anex Hotels");
  const [department, setDepartment] = useState(initialWorkspace.name || "");
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isConnected = !!initialWorkspace?.drive_folder_id;
  const connectedFolderId = initialWorkspace?.drive_folder_id;

  const maskedFolderId = connectedFolderId
    ? `${connectedFolderId.substring(0, 4)}••••••••••••••••${connectedFolderId.substring(connectedFolderId.length - 4)}`
    : "";

  const handleCheckFolder = () => {
    if (!connectedFolderId) return;
    setSyncModalOpen(true);
  };

  const copyToClipboard = () => {
    if (connectedFolderId) {
      navigator.clipboard.writeText(connectedFolderId);
      toast.success("Klasör ID'si kopyalandı.");
    }
  };

  const openDriveFolder = () => {
    if (connectedFolderId) {
      window.open(`https://drive.google.com/drive/folders/${connectedFolderId}`, "_blank");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    const res = await updateProfile(firstName, lastName);
    setIsUpdatingProfile(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Profil başarıyla güncellendi.");
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingWorkspace(true);
    const res = await updateWorkspace(hotelName, hotelGroup, department);
    setIsUpdatingWorkspace(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Çalışma alanı başarıyla güncellendi.");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const res = await deleteAccount();
    if (res && res.error) {
      toast.error(res.error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50/30 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
            <p className="text-sm text-muted-foreground">Hesap ve çalışma alanı tercihlerinizi yönetin.</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 w-full max-w-md grid grid-cols-3">
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="roles">Görevler</TabsTrigger>
            <TabsTrigger value="templates">Şablonlar</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 outline-none">
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-2">
              {/* Profil */}
              <Card className="border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">Profil Bilgileri</CardTitle>
              <CardDescription>Kişisel bilgilerinizi güncelleyin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <Button type="submit" disabled={isUpdatingProfile} className="w-full">
                  {isUpdatingProfile ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Workspace */}
          <Card className="border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">Çalışma Alanı (Otel)</CardTitle>
              <CardDescription>Otel ve departman bilgilerinizi güncelleyin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Otel Adı</Label>
                  <Input id="hotelName" value={hotelName} onChange={e => setHotelName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotelGroup">Otel Grubu</Label>
                  <select
                    id="hotelGroup"
                    value={hotelGroup}
                    onChange={e => setHotelGroup(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="Anex Hotels">Anex Hotels</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departman</Label>
                  <select
                    id="department"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="" disabled>Departman Seçin</option>
                    <option value="Ön Büro">Ön Büro</option>
                    <option value="Kat Hizmetleri">Kat Hizmetleri</option>
                    <option value="F&B">F&B</option>
                    <option value="Misafir İlişkileri">Misafir İlişkileri</option>
                    <option value="Teknik Servis">Teknik Servis</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <Button type="submit" disabled={isUpdatingWorkspace} className="w-full">
                  {isUpdatingWorkspace ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Google Drive Status */}
        <Card className={`border-border/50 shadow-sm overflow-hidden ${isConnected ? 'bg-white' : 'bg-stone-50/50'}`}>
          <div className={`h-1.5 w-full ${isConnected ? 'bg-green-500' : 'bg-amber-400'}`} />
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Google Drive Entegrasyonu
                  {isConnected && (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Aktif
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {isConnected
                    ? "Tüm belgeleriniz ve puantaj verileriniz bu klasöre senkronize ediliyor."
                    : "Belgelerinizi oluşturmak ve saklamak için Google Drive'ı bağlayın."}
                </CardDescription>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isConnected ? 'bg-green-50' : 'bg-amber-50'}`}>
                {isConnected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <Cloud className="h-6 w-6 text-amber-600" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl border-amber-200 bg-amber-50/30">
                <Cloud className="h-10 w-10 text-amber-400 mb-4" />
                <h3 className="text-sm font-medium mb-1">Bağlantı Gerekli</h3>
                <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">Sistemi kullanabilmek için Google hesabınızı bağlamanız gerekmektedir.</p>
                <Button
                  onClick={() => router.push("/api/auth/google")}
                  className="rounded-xl shadow-sm"
                >
                  Google ile Bağlan
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hedef Klasör (ID)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <Input
                        readOnly
                        value={maskedFolderId}
                        className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl font-mono text-sm"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={copyToClipboard} title="Kopyala" className="h-11 w-11 shrink-0 rounded-xl">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={openDriveFolder} title="Yeni Sekmede Aç" className="h-11 w-11 shrink-0 rounded-xl">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleCheckFolder} title="Проверка папки" className="h-11 w-11 shrink-0 rounded-xl">
                      <FileSearch className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Google hesabınızı yeniden bağlayarak yapılandırmanızı tazeleyebilirsiniz.</p>
                    <Button
                      onClick={() => router.push("/api/auth/google")}
                      className="h-11 px-6 rounded-xl shadow-sm w-full sm:w-auto"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Google Hesabını Yeniden Bağla
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {isConnected && (
            <CardFooter className="border-t border-border/50 bg-stone-50/30 pt-4 flex justify-between">
              <p className="text-sm text-muted-foreground">Bu klasör için senkronizasyon aktif.</p>
            </CardFooter>
          )}
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 shadow-sm bg-red-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-red-600">Tehlikeli Bölge (Danger Zone)</CardTitle>
            <CardDescription className="text-red-600/80">Bu işlemler geri alınamaz. Lütfen dikkatli olun.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Hesabı Sil
            </Button>
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Hesabınızı silmek istediğinize emin misiniz?</DialogTitle>
                  <DialogDescription>
                    Bu işlem geri alınamaz. Hesabınız, profil bilgileriniz ve eğer yöneticisiyseniz tüm çalışma alanı verileriniz kalıcı olarak silinecektir.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>İptal</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? "Siliniyor..." : "Evet, Hesabımı Sil"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="outline-none">
            <RolesTab initialRoles={initialRoles} />
          </TabsContent>

          <TabsContent value="templates" className="outline-none">
            <TutanakTemplatesTab initialTemplates={initialTemplates} />
          </TabsContent>
        </Tabs>
      </div>

      {syncModalOpen && (
        <SyncModal
          isOpen={syncModalOpen}
          onOpenChange={setSyncModalOpen}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Cloud, FolderOpen, CheckCircle2, Copy, ExternalLink, RefreshCw, FileSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SyncModal } from "@/components/SyncModal";

export default function SettingsClientPage({ initialWorkspace }: { initialWorkspace: { drive_folder_id?: string } }) {
  const router = useRouter();
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const isConnected = !!initialWorkspace?.drive_folder_id;
  const connectedFolderId = initialWorkspace?.drive_folder_id;

  // Masking the folder ID for display
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

  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto p-8 pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Ayarlar</h1>
            <p className="text-muted-foreground mt-1">Entegrasyonları ve çalışma alanı tercihlerini yönetin.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        {/* Google Drive Integration Section */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-stone-50/50 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Google Drive Entegrasyonu
                </CardTitle>
                <CardDescription className="mt-1">
                  Oluşturulan Tutanak PDF&apos;lerini otomatik olarak senkronize etmek ve depolamak için bir Google Drive klasörü bağlayın.
                </CardDescription>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Bağlı
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!isConnected ? (
              <div className="space-y-4 max-w-xl">
                <div className="rounded-lg bg-destructive/10 p-4 mb-4 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    Şu anda hesabınıza bağlı bir Google Drive klasörü bulunmuyor. Sistem özelliklerini tam olarak kullanabilmek için lütfen bir klasör bağlayın.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/onboarding")}
                  className="h-11 px-6 rounded-xl shadow-sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Düzelt
                </Button>
              </div>
            ) : (
              <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Mevcut Bağlı Klasör ID</Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

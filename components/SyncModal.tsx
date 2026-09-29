"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  checkDriveFolderAccess,
  getMasterFolderStructure,
  syncDriveItem,
  completeDriveOnboarding,
} from "@/actions/drive";

export type DriveItem = {
  sourceId: string;
  name: string;
  mimeType: string;
  masterParentId: string;
  isFolder: boolean;
};

interface SyncModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  folderLink: string; // URL or ID
  onSuccess?: () => void;
}

export function SyncModal({ isOpen, onOpenChange, folderLink, onSuccess }: SyncModalProps) {
  const [step, setStep] = useState<"initial" | "access" | "fetching" | "syncing" | "completing" | "success" | "error">("initial");
  const [error, setError] = useState<string | null>(null);

  const [folderId, setFolderId] = useState<string>("");
  const [itemsToSync, setItemsToSync] = useState<DriveItem[]>([]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Maps master parent IDs to destination parent IDs
  const [folderMap, setFolderMap] = useState<Record<string, string>>({});

  const resetState = () => {
    setStep("initial");
    setError(null);
    setFolderId("");
    setItemsToSync([]);

    setCurrentIndex(0);
    setFolderMap({});
  };



  const startSync = React.useCallback(async () => {
    setStep("access");
    setError(null);

    // Step 1: Check access
    const accessRes = await checkDriveFolderAccess(folderLink);
    if (accessRes.error || !accessRes.folderId) {
      setError(accessRes.error || "Klasör erişimi başarısız.");
      setStep("error");
      return;
    }

    setFolderId(accessRes.folderId);
    setFolderMap(prev => ({ ...prev, "root": accessRes.folderId! }));

    // Step 2: Fetch structure
    setStep("fetching");
    const structRes = await getMasterFolderStructure();
    if (structRes.error || !structRes.items || !structRes.masterFolderId) {
      setError(structRes.error || "Dosya yapısı alınamadı.");
      setStep("error");
      return;
    }

    setItemsToSync(structRes.items);

    setFolderMap(prev => ({ ...prev, [structRes.masterFolderId!]: accessRes.folderId! }));
    setCurrentIndex(0);
    setStep("syncing");
  }, [folderLink]);



  const finishSync = React.useCallback(async () => {
    setStep("completing");
    const compRes = await completeDriveOnboarding(folderId);
    if (compRes.error) {
      setError(compRes.error);
      setStep("error");
      return;
    }
    setStep("success");
    toast.success("Klasör başarıyla senkronize edildi!");
  }, [folderId]);

  const processNextItem = React.useCallback(async () => {
    if (currentIndex >= itemsToSync.length) {
      finishSync();
      return;
    }

    const item = itemsToSync[currentIndex];

    // Find where to put it
    const destParentId = folderMap[item.masterParentId];
    if (!destParentId) {
      setError(`Hedef klasör bulunamadı: ${item.name}`);
      setStep("error");
      return;
    }

    const syncRes = await syncDriveItem(item, destParentId);
    if (syncRes.error || !syncRes.destId) {
      setError(syncRes.error || `Senkronizasyon hatası: ${item.name}`);
      setStep("error");
      return;
    }

    if (item.isFolder) {
      setFolderMap(prev => ({ ...prev, [item.sourceId]: syncRes.destId! }));
    }

    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, itemsToSync, folderMap, finishSync]);

    useEffect(() => {
    if (isOpen && step === "initial") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startSync();
    }
    if (!isOpen) {
      setTimeout(resetState, 300);
    }
  }, [isOpen, step, startSync]);

  useEffect(() => {
    if (step === "syncing" && itemsToSync.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      processNextItem();
    }
  }, [step, currentIndex, itemsToSync, processNextItem]);

const retryCurrentStep = () => {
    if (step === "error") {
      if (currentIndex > 0 && currentIndex < itemsToSync.length) {
        setStep("syncing");
        setError(null);
      } else {
        startSync();
      }
    }
  };



  const handleClose = () => {
    onOpenChange(false);
    if (step === "success" && onSuccess) {
      onSuccess();
    }
  };

  const progressPercent = itemsToSync.length > 0
    ? Math.round((currentIndex / itemsToSync.length) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      // Prevent closing by clicking outside if it's currently working
      if (!val && step !== "success" && step !== "error" && step !== "initial") return;
      onOpenChange(val);
    }}>
      <DialogContent showCloseButton={step === "success" || step === "error"}>
        <DialogHeader>
          <DialogTitle>Google Drive Senkronizasyonu</DialogTitle>
          <DialogDescription>
            Klasörünüz ayarlanıyor ve gerekli dosyalar kopyalanıyor...
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">

          <StepIndicator
            isActive={step === "access"}
            isCompleted={["fetching", "syncing", "completing", "success"].includes(step) || (step === "error" && folderId !== "")}
            label="Bağlantı kontrol ediliyor"
          />

          <StepIndicator
            isActive={step === "fetching"}
            isCompleted={["syncing", "completing", "success"].includes(step) || (step === "error" && itemsToSync.length > 0)}
            label="Dosya yapısı alınıyor"
          />

          <div className="flex flex-col gap-2">
            <StepIndicator
              isActive={step === "syncing"}
              isCompleted={["completing", "success"].includes(step)}
              label="Dosyalar senkronize ediliyor"
            />

            {["syncing", "completing", "success", "error"].includes(step) && itemsToSync.length > 0 && (
              <div className="ml-9 space-y-2">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-in-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {step === "syncing" && currentIndex < itemsToSync.length ? (
                      `Kopyalanıyor: ${itemsToSync[currentIndex].name}`
                    ) : step === "error" && currentIndex < itemsToSync.length ? (
                      `Hata: ${itemsToSync[currentIndex].name}`
                    ) : (
                      "Tamamlandı"
                    )}
                  </span>
                  <span>{currentIndex} / {itemsToSync.length}</span>
                </div>
              </div>
            )}
          </div>

          <StepIndicator
            isActive={step === "completing"}
            isCompleted={step === "success"}
            label="Ayarlar kaydediliyor"
          />

          {step === "error" && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-2 text-sm mt-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {step === "success" && (
            <div className="bg-green-500/10 text-green-600 p-3 rounded-md flex items-center gap-2 text-sm mt-4 font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>Tüm dosyalar başarıyla senkronize edildi!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "error" && (
            <Button onClick={retryCurrentStep} className="w-full sm:w-auto">
              Tekrar Dene
            </Button>
          )}
          {step === "success" && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Kapat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ isActive, isCompleted, label }: { isActive: boolean, isCompleted: boolean, label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 flex items-center justify-center w-6 h-6">
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : isActive ? (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <span className={`text-sm ${isActive ? "font-medium text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

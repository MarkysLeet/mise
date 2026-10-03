/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { importEmployeesFromFile } from "@/actions/puantaj-import";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleDownloadTemplate = () => {
    const ws_data = [
      ["Ad Soyad", "Görev", "İşe Giriş Tarihi", "Sicil No", "Telefon", "Departman/Şube"],
      ["Ahmet Yılmaz", "Aşçı", "15.04.2023", "12345", "05551234567", "Mutfak"],
      ["Ayşe Demir", "Garson", "01.06.2023", "12346", "05559876543", "Servis"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths
    const wscols = [
      { wch: 25 }, // Ad Soyad
      { wch: 20 }, // Görev
      { wch: 15 }, // İşe Giriş Tarihi
      { wch: 15 }, // Sicil No
      { wch: 15 }, // Telefon
      { wch: 20 }  // Departman/Şube
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personel Listesi");
    XLSX.writeFile(wb, "Personel_Sablonu.xlsx");
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "dd.mm.yyyy" });

      if (!jsonData || jsonData.length === 0) {
        throw new Error("Dosya boş veya formatı hatalı.");
      }

      const parsedEmployees = jsonData.map((row: any) => ({
        full_name: row["Ad Soyad"] || row["İsim"] || row["Name"],
        role_title: row["Görev"] || row["Ünvan"] || row["Role"],
        hire_date: row["İşe Giriş Tarihi"] || row["Giriş Tarihi"] || row["Hire Date"],
        sicil_no: row["Sicil No"] || row["Registry No"],
        phone: row["Telefon"] || row["Phone"],
        department_outlet: row["Departman/Şube"] || row["Departman"] || row["Şube"] || row["Department"]
      })).filter((emp: any) => emp.full_name && String(emp.full_name).trim().length > 0);

      if (parsedEmployees.length === 0) {
        throw new Error("Dosyada geçerli 'Ad Soyad' sütunu bulunamadı.");
      }

      const res = await importEmployeesFromFile(parsedEmployees);

      if (res.success) {
        toast.success(`İçe aktarma başarılı. ${res.inserted} eklendi, ${res.updated} güncellendi.`);
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["entries"] });
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(res.error || "İçe aktarma sırasında bir hata oluştu.");
      }
    } catch (err: any) {
      toast.error(err.message || "Dosya okunamadı.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tablodan İçe Aktar</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Sisteme toplu personel eklemek veya mevcut personellerin eksik bilgilerini tamamlamak için Excel şablonunu kullanabilirsiniz.
            </p>
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full mt-2">
              <Download className="mr-2 h-4 w-4" /> Şablonu İndir
            </Button>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400"
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileChange}
              disabled={isLoading}
            />
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                <span className="text-sm text-zinc-500">İçe aktarılıyor, lütfen bekleyin...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-zinc-400" />
                <p className="text-sm font-medium">Dosyanızı buraya sürükleyin</p>
                <p className="text-xs text-muted-foreground">veya seçmek için tıklayın (Excel/CSV)</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

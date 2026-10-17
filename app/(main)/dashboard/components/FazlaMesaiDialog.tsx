"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import React from "react";

export function FazlaMesaiDialog({
  fazlaMesaiByDepartment,
  totalFazlaMesai,
  children,
}: {
  fazlaMesaiByDepartment: { outlet: string; hours: number }[];
  totalFazlaMesai: number;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger render={
        <div className="contents">{children}</div>
      } />
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Aylık Fazla Mesai Dağılımı
          </DialogTitle>
          <div className="text-sm text-zinc-500 mt-1">
            Departman / Outlet bazında bu ayki fazla mesai saatleri (Toplam: {totalFazlaMesai} saat)
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 border-t">
          <div className="space-y-2">
            {fazlaMesaiByDepartment.map(({ outlet, hours }) => (
              <div
                key={outlet}
                className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100"
              >
                <span className="font-medium text-sm text-zinc-900">{outlet}</span>
                <span className="font-semibold text-sm bg-zinc-200 px-2.5 py-0.5 rounded-full text-zinc-700">
                  {hours} saat
                </span>
              </div>
            ))}
            {fazlaMesaiByDepartment.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Bu ay için fazla mesai kaydı bulunmuyor.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users } from "lucide-react";
import React from "react";

type Employee = {
  id: string;
  department_outlet?: string | null;
};

export function ActiveEmployeesDialog({
  activeEmployees,
  children,
}: {
  activeEmployees: Employee[];
  children: React.ReactNode;
}) {
  // Group employees by outlet
  const outletCounts = activeEmployees.reduce((acc, emp) => {
    const outlet = emp.department_outlet || "Belirtilmemiş";
    acc[outlet] = (acc[outlet] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count descending
  const sortedOutlets = Object.entries(outletCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Dialog>
      <DialogTrigger render={
        <div className="contents">{children}</div>
      } />
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aktif Personel Dağılımı
          </DialogTitle>
          <div className="text-sm text-zinc-500 mt-1">
            Departman / Outlet bazında güncel çalışan sayıları (Toplam: {activeEmployees.length})
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 border-t">
          <div className="space-y-2">
            {sortedOutlets.map(([outlet, count]) => (
              <div
                key={outlet}
                className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100"
              >
                <span className="font-medium text-sm text-zinc-900">{outlet}</span>
                <span className="font-semibold text-sm bg-zinc-200 px-2.5 py-0.5 rounded-full text-zinc-700">
                  {count}
                </span>
              </div>
            ))}
            {sortedOutlets.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Kayıtlı aktif personel bulunmuyor.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

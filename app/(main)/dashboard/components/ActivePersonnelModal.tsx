"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Users } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivePersonnelModal({ employees, children }: { employees: any[], children: React.ReactNode }) {
  // Compute grouped employees by department
  const grouped = employees.reduce((acc, emp) => {
    const dept = emp.department_outlet || "Belirtilmemiş";
    if (!acc[dept]) {
      acc[dept] = 0;
    }
    acc[dept]++;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count descending
  const sortedDepartments = Object.entries(grouped).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <Dialog>
      <DialogTrigger className="w-full text-left p-0 bg-transparent border-none appearance-none cursor-pointer outline-none block" render={<div />}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aktif Personel Dağılımı
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {sortedDepartments.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">Aktif personel bulunamadı.</p>
            ) : (
              sortedDepartments.map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 transition-colors">
                  <span className="text-sm font-medium text-zinc-900">{dept}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Kişi</span>
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-700">
                      {count as React.ReactNode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

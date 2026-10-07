"use client"

import * as React from "react"
import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type FutureTermination = {
  id: string;
  full_name: string;
  role_title: string;
  termination_date: string;
}

export function FutureTerminationsPopover({ terminations }: { terminations: FutureTermination[] }) {
  if (!terminations || terminations.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger render={
        <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors mt-2 cursor-pointer outline-none">
          <span>İleri tarihli çıkış: {terminations.length}</span>
          <Info className="h-3.5 w-3.5" />
        </button>
      } />
      <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
        <div className="bg-zinc-50/50 px-4 py-3 border-b border-zinc-100">
          <h4 className="text-sm font-medium text-zinc-900">İleri Tarihli Çıkışlar</h4>
          <p className="text-xs text-zinc-500 mt-0.5">Çıkış tarihi gelmemiş olan personeller</p>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {terminations.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-md transition-colors">
              <div className="flex flex-col overflow-hidden mr-3">
                <span className="text-sm font-medium text-zinc-900 truncate">{emp.full_name}</span>
                <span className="text-xs text-zinc-500 truncate">{emp.role_title || "Belirtilmemiş"}</span>
              </div>
              <div className="whitespace-nowrap bg-zinc-100 px-2 py-1 rounded text-xs font-medium text-zinc-700">
                {emp.termination_date}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

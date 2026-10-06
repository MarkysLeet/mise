import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PuantajLoading() {
  return (
    <div className="flex-1 w-full px-4 py-4 md:py-8 flex flex-col gap-4 md:gap-8 max-w-full overflow-hidden bg-gray-50/50">

      {/* Mobile Header Skeleton */}
      <div className="flex md:hidden w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="rounded-full w-10 h-10" />
        </div>
      </div>

      {/* Header Panel Skeleton (Desktop) */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:bg-slate-200" disabled>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-48" />
          <Button variant="ghost" size="icon" className="hover:bg-slate-200" disabled>
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="hidden md:flex items-center gap-2 ml-4">
            <Skeleton className="h-10 w-[220px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Legend Skeleton (Desktop) */}
      <div className="hidden md:flex flex-wrap items-center gap-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-xs">
        <span className="font-medium text-slate-500">Lejant:</span>
        <div className="flex flex-wrap gap-3">
           {[1, 2, 3, 4, 5, 6, 7].map(i => (
             <div key={i} className="flex items-center gap-1.5">
               <Skeleton className="w-5 h-5 rounded" />
               <Skeleton className="h-4 w-16" />
             </div>
           ))}
        </div>
      </div>

      {/* Matrix Table Skeleton */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col h-[calc(100vh-210px)] relative">
        <div className="flex flex-1 overflow-hidden">

          {/* Frozen Employee Names Section */}
          <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white z-20">
            {/* Header */}
            <div className="h-10 border-b border-slate-200 bg-slate-50/80 flex items-center px-4">
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="h-[46px] border-b border-slate-100 flex items-center px-4 gap-3">
                  <Skeleton className="h-4 w-6" /> {/* Seq no */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Days Grid Section */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            {/* Days Header */}
            <div className="h-10 border-b border-slate-200 bg-slate-50/80 flex items-center">
              {[...Array(31)].map((_, i) => (
                <div key={i} className="w-10 min-w-[40px] flex-shrink-0 h-full border-r border-slate-200 flex flex-col items-center justify-center">
                   <Skeleton className="h-3 w-4 mb-0.5" />
                   <Skeleton className="h-3 w-5" />
                </div>
              ))}
              <div className="min-w-[120px] flex-shrink-0 flex items-center justify-center px-2">
                  <Skeleton className="h-4 w-12" />
              </div>
            </div>

            {/* Grid Rows */}
            <div className="flex-1 overflow-hidden">
               {[...Array(15)].map((_, rowIndex) => (
                 <div key={rowIndex} className="h-[46px] border-b border-slate-100 flex w-max">
                   {[...Array(31)].map((_, colIndex) => (
                     <div key={colIndex} className="w-10 min-w-[40px] flex-shrink-0 border-r border-slate-100 flex items-center justify-center p-1">
                        <Skeleton className="h-full w-full rounded-sm" />
                     </div>
                   ))}
                   <div className="w-[120px] min-w-[120px] flex-shrink-0 flex items-center justify-between px-3">
                       <Skeleton className="h-5 w-5 rounded-md" />
                       <Skeleton className="h-5 w-5 rounded-md" />
                       <Skeleton className="h-5 w-5 rounded-md" />
                       <Skeleton className="h-5 w-5 rounded-md" />
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

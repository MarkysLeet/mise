import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Download, UploadCloud, ExternalLink, Eraser } from "lucide-react";

export default function PuantajLoading() {
  return (
    <div className="flex-1 w-full px-4 py-4 space-y-4 max-w-full overflow-hidden bg-gray-50/50">

      {/* Header Panel Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-32" />
          <Button variant="outline" size="icon" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Skeleton className="h-9 w-32 ml-2" />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled><Plus className="mr-2 h-4 w-4" /> Personel Ekle</Button>
          <Button variant="secondary" disabled><Download className="mr-2 h-4 w-4" /> Tablodan İçe Aktar</Button>
          <Button disabled className="bg-indigo-600 opacity-50"><UploadCloud className="mr-2 h-4 w-4" /> Google E-Tablolar ile Senkronize Et</Button>
          <Button variant="outline" disabled><ExternalLink className="mr-2 h-4 w-4" /> Tabloyu Drive&apos;da Aç</Button>
        </div>
      </div>

      {/* Brush Palette Skeleton */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white rounded-xl shadow-sm border border-slate-200">
        <span className="text-sm font-medium text-slate-500 mr-2">Fırça:</span>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
           <Skeleton key={i} className="h-8 w-28" />
        ))}
        <Button size="sm" variant="outline" disabled className="h-8 px-3">
          <Eraser className="h-4 w-4 mr-1" /> Silici
        </Button>
        <div className="ml-auto flex items-center gap-2">
           <Skeleton className="h-8 w-40" />
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

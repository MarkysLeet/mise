export function MobilePuantajDaily({ daysArray, daysInMonth, currentMonth, currentYear }: any) {
  return (
    <div className="block md:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-serif font-semibold text-slate-800">Günlük Yoklama Görünümü</h2>
        <p className="text-sm text-slate-500">Mobil görünüm yapım aşamasındadır.</p>
      </div>

      {/* Horizontal Day Selector Placeholder */}
      <div className="flex overflow-x-auto gap-2 p-4 border-b border-slate-200 hide-scrollbar">
        {daysArray.map((day: number) => {
          if (day > daysInMonth) return null;
          // Just highlight day 1 as a mock "today" for the placeholder
          const isSelected = day === 1;
          return (
            <button
              key={day}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-xl border ${
                isSelected
                  ? "bg-zinc-900 border-zinc-900 text-white"
                  : "bg-white border-zinc-200 text-slate-600"
              }`}
            >
              <span className="text-xs font-medium opacity-80">Gün</span>
              <span className="text-lg font-bold">{day}</span>
            </button>
          );
        })}
      </div>

      {/* Empty Employee List Placeholder */}
      <div className="p-4 space-y-3">
        <div className="h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 mr-3"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 rounded w-1/4"></div>
          </div>
        </div>
        <div className="h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 mr-3"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
          </div>
        </div>
        <div className="h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 mr-3"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-2/5"></div>
            <div className="h-3 bg-slate-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

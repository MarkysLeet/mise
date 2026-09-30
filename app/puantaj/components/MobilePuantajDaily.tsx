import { MobilePuantajDailyProps } from "../types";

export function MobilePuantajDaily({ daysArray, daysInMonth }: MobilePuantajDailyProps) {
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

      <div className="p-4 text-center text-slate-500 text-sm h-48 flex items-center justify-center">
        Lütfen masaüstü görünüme geçin.
      </div>
    </div>
  );
}

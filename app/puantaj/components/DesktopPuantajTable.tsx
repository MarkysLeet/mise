import { Button } from "@/components/ui/button";
import { LogOut, Trash2 } from "lucide-react";

export function DesktopPuantajTable({
  employees,
  entries,
  currentMonth,
  currentYear,
  daysArray,
  daysInMonth,
  STATUSES,
  pendingChanges,
  activeBrush,
  calculateTotals,
  setEmployeeToTerminate,
  setIsTerminateOpen,
  setEmployeeToDelete,
  setIsDeleteOpen,
  setIsMouseDown,
  isMouseDown,
  applyBrush
}: any) {
  return (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none">
      <div className="overflow-x-auto h-[65vh]">
        <table className="w-full text-sm text-left border-collapse table-fixed">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-20">
            <tr>
              <th className="px-1 py-3 border-b border-r bg-slate-50 sticky left-0 z-30 w-8 text-center">No</th>
              <th className="px-2 py-3 border-b border-r bg-slate-50 sticky left-8 z-30 w-40 truncate">Adı Soyadı</th>
              <th className="px-2 py-3 border-b border-r bg-slate-50 sticky left-48 z-30 w-28 truncate">Görevi</th>
              <th className="px-1 py-3 border-b border-r bg-slate-50 sticky left-[304px] z-30 w-14"></th>
              {daysArray.map((day: number) => (
                <th key={day} className={`px-0 py-1.5 text-center text-xs font-medium border-b border-r w-7 min-w-[26px] max-w-[28px] ${day > daysInMonth ? 'bg-gray-200' : ''}`}>
                  {day}
                </th>
              ))}
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-blue-50 w-8" title="Çalışma">Ç</th>
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-green-50 w-8" title="Hafta İzni">Hİ</th>
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-orange-50 w-8" title="Ücretsiz İzin">Üİ</th>
              <th className="px-1 py-3 text-center text-xs border-b bg-red-50 w-8" title="Devamsızlık">D</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any, idx: number) => {
              const totals = calculateTotals(emp.id);
              const isTerminated = !emp.is_active && emp.termination_date && emp.termination_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
              if (!emp.is_active && !isTerminated && (!emp.termination_date || new Date(emp.termination_date) < new Date(currentYear, currentMonth - 1, 1))) {
                return null;
              }

              return (
                <tr key={emp.id} className={`border-b hover:bg-slate-50 ${!emp.is_active ? 'opacity-75' : ''}`}>
                  <td className="px-1 py-2 border-r bg-white sticky left-0 z-10 font-medium text-slate-400 w-8 text-center">{idx + 1}</td>
                  <td className="px-2 py-2 border-r bg-white sticky left-8 z-10 font-medium text-slate-800 truncate w-40">
                    {emp.full_name}
                    {!emp.is_active && <span className="ml-2 text-[10px] text-red-500 font-bold">(Çıkış: {emp.termination_date?.split('-').reverse().join('.')})</span>}
                  </td>
                  <td className="px-2 py-2 border-r bg-white sticky left-48 z-10 text-slate-500 truncate w-28">{emp.role_title}</td>
                  <td className="px-1 py-1 border-r bg-white sticky left-[304px] z-10 text-center w-14">
                    <div className="flex justify-center gap-1">
                      {emp.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            setEmployeeToTerminate(emp);
                            setIsTerminateOpen(true);
                          }}
                          title="İş Çıkışı Ver"
                        >
                          <LogOut className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => {
                          setEmployeeToDelete(emp);
                          setIsDeleteOpen(true);
                        }}
                        title="Tamamen Sil"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>

                  {daysArray.map((day: number) => {
                    if (day > daysInMonth) {
                      return <td key={day} className="border-r bg-gray-100"></td>;
                    }

                    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const pendingKey = `${emp.id}_${dateStr}`;
                    let statusCode = pendingChanges[pendingKey];

                    if (statusCode === undefined) {
                      const entry = entries.find((e: any) => e.employee_id === emp.id && e.date === dateStr);
                      statusCode = entry ? entry.status : "";
                    }

                    const statusDef = STATUSES.find((s: any) => s.code === statusCode);
                    const isTerminatedCell = statusCode === 'TERMINATED';

                    return (
                      <td
                        key={day}
                        className={`border-r cursor-pointer text-center font-medium text-xs
                          ${isTerminatedCell ? 'bg-black text-black' : (statusDef?.color || '')}
                          ${activeBrush ? 'hover:ring-2 hover:ring-inset hover:ring-indigo-400' : ''}
                        `}
                        onMouseDown={() => {
                          if (!activeBrush) return;
                          setIsMouseDown(true);
                          applyBrush(emp.id, day);
                        }}
                        onMouseEnter={() => {
                          if (isMouseDown) applyBrush(emp.id, day);
                        }}
                      >
                        {isTerminatedCell ? '' : statusCode}
                      </td>
                    );
                  })}

                  <td className="px-1 py-2 border-r text-center text-xs font-semibold bg-blue-50/50 w-8">{totals.work > 0 ? totals.work : ''}</td>
                  <td className="px-1 py-2 border-r text-center text-xs font-semibold bg-green-50/50 text-green-700 w-8">{totals.hi > 0 ? totals.hi : ''}</td>
                  <td className="px-1 py-2 border-r text-center text-xs font-semibold bg-orange-50/50 text-orange-700 w-8">{totals.ui > 0 ? totals.ui : ''}</td>
                  <td className="px-1 py-2 text-center text-xs font-bold bg-red-50/50 text-red-600 w-8">{totals.d > 0 ? totals.d : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

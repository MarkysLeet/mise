import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2, Edit2, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { DesktopPuantajTableProps } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  setEmployeeToEdit,
  setIsEditEmployeeModalOpen,
  setIsMouseDown,
  isMouseDown,
  applyBrush,
  openDossier,
  roles
}: DesktopPuantajTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (role: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [role]: prev[role] === undefined ? false : !prev[role] // default is expanded (true) if undefined
    }));
  };

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, typeof employees> = {};
    employees.forEach(emp => {
      const role = emp.role_title || "Diğer";
      if (!groups[role]) groups[role] = [];
      groups[role].push(emp);
    });

    // Sort roles based on priority
    const sortedRoles = Object.keys(groups).sort((a, b) => {
      if (a === "Diğer") return 1;
      if (b === "Diğer") return -1;
      const roleA = roles?.find(r => r.title === a);
      const roleB = roles?.find(r => r.title === b);
      const prioA = roleA?.priority ?? 999;
      const prioB = roleB?.priority ?? 999;
      return prioA - prioB;
    });

    return sortedRoles.map(role => ({
      role,
      employees: groups[role]
    }));
  }, [employees, roles]);

  const totalCols = 4 + 31 + 4; // 4 fixed left, 31 days, 4 fixed right

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
              {daysArray.map((day: number) => {
                const isWeekend = [0, 6].includes(new Date(currentYear, currentMonth - 1, day).getDay());
                return (
                  <th key={day} className={`px-0 py-1.5 text-center text-xs font-medium border-b border-r w-7 min-w-[26px] max-w-[28px] ${day > daysInMonth ? 'bg-gray-200' : (isWeekend ? 'bg-slate-100 dark:bg-slate-800/50' : '')}`}>
                    {day}
                  </th>
                );
              })}
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-blue-50 w-8" title="Çalışma">Ç</th>
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-green-50 w-8" title="Hafta İzni">Hİ</th>
              <th className="px-1 py-3 text-center text-xs border-b border-r bg-orange-50 w-8" title="Ücretsiz İzin">Üİ</th>
              <th className="px-1 py-3 text-center text-xs border-b bg-red-50 w-8" title="Devamsızlık">D</th>
            </tr>
          </thead>
          <tbody>
            {groupedEmployees.map((group) => {
              const isExpanded = expandedGroups[group.role] !== false; // default true
              return (
                <React.Fragment key={group.role}>
                  {/* Group Header */}
                  <tr
                    className="bg-slate-100 hover:bg-slate-200 cursor-pointer border-b border-slate-300"
                    onClick={() => toggleGroup(group.role)}
                  >
                    <td colSpan={totalCols} className="px-2 py-2 sticky left-0 z-20 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="uppercase">{group.role} ({group.employees.length})</span>
                      </div>
                    </td>
                  </tr>

                  {/* Group Employees */}
                  {isExpanded && group.employees.map((emp, idx) => {
                    const totals = calculateTotals(emp.id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isTerminated = !emp.is_active && (emp as any).termination_date && (emp as any).termination_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (!emp.is_active && !isTerminated && (!(emp as any).termination_date || new Date((emp as any).termination_date) < new Date(currentYear, currentMonth - 1, 1))) {
                      return null;
                    }

                    return (
                      <tr key={emp.id} className={`border-b hover:bg-slate-50 ${!emp.is_active ? 'opacity-75' : ''}`}>
                        <td className={`px-1 py-2 border-r sticky left-0 z-10 font-medium w-8 text-center ${!emp.is_active ? 'bg-red-50/80 text-red-400' : 'bg-white text-slate-400'}`}>{idx + 1}</td>
                        <td className={`px-2 py-2 border-r sticky left-8 z-10 font-medium truncate w-40 ${!emp.is_active ? 'bg-red-50/80 text-red-700/80' : 'bg-white text-slate-800'}`}>
                          <button onClick={() => openDossier(emp)} className="hover:underline text-left outline-none focus:ring-1 focus:ring-primary rounded px-1 -ml-1 inline-flex items-center">
                            {emp.full_name}
                          </button>
                        </td>
                        <td className={`px-2 py-2 border-r sticky left-48 z-10 truncate w-28 ${!emp.is_active ? 'bg-red-50/80 text-red-600/70' : 'bg-white text-slate-500'}`}>{emp.role_title}</td>
                        <td className={`px-1 py-1 border-r sticky left-[304px] z-10 text-center w-14 ${!emp.is_active ? 'bg-red-50/80' : 'bg-white'}`}>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-6 w-6 focus-visible:ring-0">
                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              </Button>
                            } />
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => {
                                setEmployeeToEdit(emp);
                                setIsEditEmployeeModalOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4 mr-2" /> Düzenle
                              </DropdownMenuItem>
                              {emp.is_active && (
                                <DropdownMenuItem onClick={() => {
                                  setEmployeeToTerminate(emp);
                                  setIsTerminateOpen(true);
                                }}>
                                  <LogOut className="h-4 w-4 mr-2 text-orange-500" /> İş Çıkışı Ver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setEmployeeToDelete(emp);
                                setIsDeleteOpen(true);
                              }} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                <Trash2 className="h-4 w-4 mr-2" /> Tamamen Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {daysArray.map((day: number) => {
                          if (day > daysInMonth) {
                            return <td key={day} className="border-r bg-gray-100"></td>;
                          }

                          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                          let statusCode = pendingChanges[emp.id]?.[day] || undefined; // Adjust according to logic

                          if (statusCode === undefined) {
                            const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);
                            statusCode = entry ? entry.status : "";
                          }

                          const statusDef = STATUSES.find(s => s.code === statusCode);
                          const isTerminatedCell = statusCode === 'TERMINATED';

                          const isWeekend = [0, 6].includes(new Date(currentYear, currentMonth - 1, day).getDay());
                          const weekendClass = isWeekend ? 'bg-slate-50 dark:bg-slate-900/50' : '';
                          const isNeutral = statusDef?.color.includes('bg-transparent');

                          return (
                            <td
                              key={day}
                              className={`border-r cursor-pointer text-center font-medium text-xs
                                ${isTerminatedCell ? 'bg-black text-black' : (isNeutral ? `${weekendClass} ${statusDef?.color}` : (statusDef?.color || weekendClass))}
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

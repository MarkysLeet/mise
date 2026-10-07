import React, { useState, useMemo } from "react";
import { MobilePuantajViewProps, Employee } from "../types";
import { ChevronDown, ChevronRight, MoreVertical, Edit2, LogOut, Trash2 } from "lucide-react";
import { EmployeeAutocomplete } from "./EmployeeAutocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function MobilePuantajView({
  employees,
  roles,
  entries,
  currentMonth,
  currentYear,
  daysArray,
  daysInMonth,
  STATUSES,
  calculateTotals,
  setEmployeeToTerminate,
  setIsTerminateOpen,
  setEmployeeToDelete,
  setIsDeleteOpen,
  setEmployeeToEdit,
  setIsEditEmployeeModalOpen,
  openDossier,
  searchQuery,
  setSearchQuery,
  selectedEmployeeId,
  onSelectEmployee,
  onClearSearch,
  selectedRoleFilter,
  setSelectedRoleFilter,
  uniqueOutlets,
  selectedOutletFilter,
  setSelectedOutletFilter,
}: MobilePuantajViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (role: string) => {
    setExpandedGroups((prev) => ({ ...prev, [role]: prev[role] === false ? true : false }));
  };

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach((emp) => {
      const role = emp.role_title || "Diğer";
      if (!groups[role]) groups[role] = [];
      groups[role].push(emp);
    });

    const sortedRoles = Object.keys(groups).sort((a, b) => {
      const roleA = roles?.find((r) => r.title === a);
      const roleB = roles?.find((r) => r.title === b);
      const prioA = roleA?.priority ?? 999;
      const prioB = roleB?.priority ?? 999;
      return prioA - prioB;
    });

    return sortedRoles.map((role) => ({
      role,
      employees: groups[role],
    }));
  }, [employees, roles]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="block md:hidden flex flex-col gap-4">
      {/* 1. Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
        <div className="w-full">
          <EmployeeAutocomplete
            employees={employees}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={onSelectEmployee}
            onClear={onClearSearch}
          />
        </div>

        {/* Role Filters */}
        <div className="flex overflow-x-auto gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setSelectedRoleFilter("Tümü")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedRoleFilter === "Tümü"
                ? "bg-zinc-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tümü
          </button>
          {roles?.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleFilter(role.title)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedRoleFilter === role.title
                  ? "bg-zinc-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {role.title}
            </button>
          ))}
        </div>

        {/* Outlet Filters */}
        <div className="flex overflow-x-auto gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setSelectedOutletFilter("Tümü")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedOutletFilter === "Tümü"
                ? "bg-zinc-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tüm Bölümler
          </button>
          {uniqueOutlets.map((outlet) => (
              <button
                key={outlet}
                onClick={() => setSelectedOutletFilter(outlet)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedOutletFilter === outlet
                    ? "bg-zinc-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {outlet}
              </button>
            ))}
        </div>
      </div>

      {/* 2. Main Content (Accordions & Cards) */}
      <div className="flex flex-col gap-3">
        {groupedEmployees.map((group) => {
          const isExpanded = expandedGroups[group.role] !== false;
          return (
            <div key={group.role} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => toggleGroup(group.role)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="uppercase tracking-wider">
                    {group.role}
                  </span>
                </div>
                {!isExpanded && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {group.employees.length}
                  </div>
                )}
              </button>

              {/* Employee Cards */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {group.employees.map((emp) => {
                    const totals = calculateTotals(emp.id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isTerminated = !emp.is_active && (emp as any).termination_date && (emp as any).termination_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (!emp.is_active && !isTerminated && (!(emp as any).termination_date || new Date((emp as any).termination_date) < new Date(currentYear, currentMonth - 1, 1))) {
                      return null;
                    }
                    const opacityClass = !emp.is_active ? "opacity-75 bg-red-50/30" : "";

                    return (
                      <div key={emp.id} className={`p-4 flex flex-col gap-4 ${opacityClass}`}>
                        {/* Card Header (Flex Layout) */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDossier(emp)}>
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                              {getInitials(emp.full_name)}
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${!emp.is_active ? 'text-red-700' : 'text-slate-900'}`}>
                                {emp.full_name}
                              </div>
                              <div className={`text-[10px] ${!emp.is_active ? 'text-red-500' : 'text-slate-400'}`}>
                                {emp.role_title}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            {/* Counters Grid */}
                            <div className="grid grid-cols-2 gap-2 text-center bg-slate-50/50 p-1.5 rounded-lg">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] text-emerald-600 font-semibold leading-tight">Ç</span>
                                <span className="font-bold text-sm text-slate-700 leading-none mt-0.5">{totals.work || '-'}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] text-blue-600 font-semibold leading-tight">Hİ</span>
                                <span className="font-bold text-sm text-slate-700 leading-none mt-0.5">{totals.hi || '-'}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] text-orange-500 font-semibold leading-tight">Üİ</span>
                                <span className="font-bold text-sm text-slate-700 leading-none mt-0.5">{totals.ui || '-'}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] text-red-600 font-semibold leading-tight">D</span>
                                <span className="font-bold text-sm text-slate-700 leading-none mt-0.5">{totals.d || '-'}</span>
                              </div>
                            </div>

                            {/* Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              } />
                              <DropdownMenuContent align="end">
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
                                }} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" /> Tamamen Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Days Grid (Read-only) */}
                        <div className="flex overflow-x-auto gap-1 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {daysArray.map((day) => {
                            if (day > daysInMonth) return null;
                            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const entry = entries.find((e) => e.employee_id === emp.id && e.date === dateStr);
                            const statusCode = entry ? entry.status : "";
                            const statusDef = STATUSES.find((s) => s.code === statusCode);
                            const isTerminatedCell = statusCode === "TERMINATED";
                            const isWeekend = [0, 6].includes(new Date(currentYear, currentMonth - 1, day).getDay());

                            let bgColorClass = "bg-slate-50";
                            let textColorClass = "text-slate-400";

                            if (isTerminatedCell) {
                                bgColorClass = "bg-black";
                                textColorClass = "text-transparent";
                            } else if (statusDef) {
                                bgColorClass = statusDef.color;
                                // Need to extract text color if not in bg-transparent
                                if (statusDef.color.includes("bg-transparent")) {
                                    bgColorClass = isWeekend ? "bg-slate-100" : "bg-slate-50";
                                    textColorClass = "text-slate-500";
                                } else {
                                    textColorClass = "text-inherit"; // Inherit from the color def
                                }
                            } else if (isWeekend) {
                                bgColorClass = "bg-slate-100";
                            }

                            return (
                              <div key={day} className="flex flex-col items-center gap-1 shrink-0 w-8">
                                <span className="text-[10px] font-medium text-slate-400">{day}</span>
                                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${bgColorClass} ${textColorClass} ${!isTerminatedCell && !statusDef && isWeekend ? 'text-slate-400' : ''}`}>
                                  {isTerminatedCell ? "" : statusCode}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Mobile Legend */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-4 mb-20">
        <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">Lejand</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          {STATUSES.filter(s => s.code !== 'TERMINATED').map(status => (
            <div key={status.code} className="flex items-center gap-2 text-sm">
               <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border ${status.color.includes('bg-transparent') ? 'bg-slate-50 border-slate-200 text-slate-500' : status.color + ' border-transparent'}`}>
                {status.code}
              </div>
              <span className="text-slate-600 truncate">{status.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

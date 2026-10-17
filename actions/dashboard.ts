"use server";

import { createClient } from "@/lib/supabase/server";
import { ActivityLogEntry, MissingEmployee, DashboardEmployee } from "@/app/types/dashboard";

export async function getDashboardData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, workspaces(*)")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspaces) {
      throw new Error("No workspace found");
    }

    const workspace = Array.isArray(profile.workspaces) ? profile.workspaces[0] : profile.workspaces;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

    const { data: employeesData } = await supabase
      .from("employees")
      .select("*")
      .eq("workspace_id", workspace.id);

    const employees = (employeesData || []) as DashboardEmployee[];
    const todayForStats = new Date();
    todayForStats.setHours(0, 0, 0, 0);

    const activeEmployees = employees.filter(e => !e.termination_date);

    const futureTerminations = employees.filter(e => {
      if (!e.termination_date) return false;
      const termDate = new Date(e.termination_date);
      termDate.setHours(0, 0, 0, 0);
      return termDate > todayForStats; // Fixed: strict > to ensure only tomorrow or later
    }).map(e => ({
      id: e.id,
      full_name: e.full_name,
      role_title: e.role_title,
      termination_date: e.termination_date!.split('-').reverse().join('.')
    }));

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Direct queries instead of while loop
    const [
      { data: todayEntriesChunk },
      { data: devamsizlikChunk },
      { data: fazlaMesaiData },
      { data: tutanaks }
    ] = await Promise.all([
      supabase
        .from("puantaj_entries")
        .select("date, employee_id, status")
        .eq("workspace_id", workspace.id)
        .eq("date", todayStr),
      supabase
        .from("puantaj_entries")
        .select("date, employee_id, status")
        .eq("workspace_id", workspace.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .eq("status", "D"),
      supabase
        .from("fazla_mesai")
        .select("employee_id, hours")
        .eq("workspace_id", workspace.id)
        .gte("mesai_date", startDate)
        .lte("mesai_date", endDate),
      supabase
        .from("tutanaks")
        .select("*")
        .eq("workspace_id", workspace.id)
        .gte("created_at", `${startDate}T00:00:00Z`)
    ]);

    const totalFazlaMesai = (fazlaMesaiData || []).reduce((acc, row) => acc + (row.hours || 0), 0);

    const departmentFazlaMesai = (fazlaMesaiData || []).reduce((acc, row) => {
      const emp = employees.find(e => e.id === row.employee_id);
      const outlet = emp?.department_outlet || "Belirtilmemiş";
      acc[outlet] = (acc[outlet] || 0) + (row.hours || 0);
      return acc;
    }, {} as Record<string, number>);

    const fazlaMesaiByDepartment = Object.entries(departmentFazlaMesai)
      .map(([outlet, hours]) => ({ outlet, hours }))
      .sort((a, b) => b.hours - a.hours);


    const todayEntries = todayEntriesChunk || [];
    const missingEmployeesEntries = todayEntries.filter(e => e.status && e.status !== "" && e.status !== 'X' && e.status !== 'Hİ');
    const onLeaveToday = missingEmployeesEntries.length;

    const missingEmployees: MissingEmployee[] = missingEmployeesEntries.map(entry => {
      const emp = employees.find(e => e.id === entry.employee_id);
      return {
        id: entry.employee_id,
        full_name: emp?.full_name || "Bilinmiyor",
        role_title: emp?.role_title || "Belirtilmemiş",
        status: entry.status
      };
    });

    const devamsizlikThisMonth = (devamsizlikChunk || []).map(e => ({
      employee_id: e.employee_id,
      date: e.date.split("-").reverse().join(".")
    }));

    const activityLog: ActivityLogEntry[] = [];
    if (tutanaks) {
      tutanaks.forEach((t: { id: string, created_at: string, document_url: string | null }) => {
        activityLog.push({
          id: t.id,
          type: 'tutanak',
          date: new Date(t.created_at),
          title: "Tutanak Oluşturuldu",
          desc: "Sistem üzerinden yeni bir belge hazırlandı.",
          url: t.document_url
        });
      });
    }

    if (employees) {
      employees.forEach((e: DashboardEmployee) => {
        if (e.created_at) {
          const hireDate = new Date(e.created_at);
          if (hireDate.getMonth() + 1 === currentMonth && hireDate.getFullYear() === currentYear) {
            activityLog.push({
              id: `hire_${e.id}`,
              type: 'employee_hire',
              date: new Date(e.created_at),
              title: "Personel Eklendi",
              desc: `${e.full_name} (${e.role_title || 'Görevsiz'})`,
              url: null
            });
          }
        }
        if (!e.is_active && e.termination_date) {
          activityLog.push({
            id: `term_${e.id}`,
            type: 'employee_term',
            date: new Date(e.termination_date),
            title: "Personel Çıkışı",
            desc: `${e.full_name} işten ayrıldı.`,
            url: null
          });
        }
      });
    }

    activityLog.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivities = activityLog.slice(0, 5);

    return {
      profile,
      workspace,
      activeEmployees,
      futureTerminations,
      onLeaveToday,
      totalFazlaMesai,
      missingEmployees,
      devamsizlikThisMonth,
      recentActivities,
      employees,
      fazlaMesaiByDepartment
    };

  } catch (error: unknown) {
    throw new Error((error as Error).message || "An error occurred");
  }
}

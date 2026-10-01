"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { syncPuantajToDrive } from "./puantaj-sync";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export async function initializeNewMonth(year: number, month: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) throw new Error("No workspace found");
    const workspace_id = profile.workspace_id;

    // 1. Get workspace's initialized months to ensure it's not already initialized
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("initialized_months")
      .eq("id", workspace_id)
      .single();

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    if (workspace?.initialized_months?.includes(monthKey)) {
        throw new Error("Bu ay zaten başlatılmış.");
    }

    // 2. Fetch active employees (excluding those terminated before the 1st of the new month)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    let query = supabase
      .from("employees")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("seq_no", { ascending: true });

    query = query.or(`termination_date.is.null,termination_date.gte.${startDate}`);

    const { data: employeesData, error: empError } = await query;
    if (empError) throw new Error(empError.message);

    const activeEmployees = (employeesData || []) as Employee[];

    // Re-sequence remaining employees (to be 1, 2, 3...)
    for (let i = 0; i < activeEmployees.length; i++) {
        if (activeEmployees[i].seq_no !== i + 1) {
            await supabase
                .from("employees")
                .update({ seq_no: i + 1 })
                .eq("id", activeEmployees[i].id);
            activeEmployees[i].seq_no = i + 1;
        }
    }

    // 3. Analyze previous month for 6+1 rule
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }

    const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
    // Start checking from the last 6 days of the previous month
    const checkStartDay = Math.max(1, prevMonthDays - 5);
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(checkStartDay).padStart(2, '0')}`;
    const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevMonthDays).padStart(2, '0')}`;

    const { data: prevEntries } = await supabase
        .from("puantaj_entries")
        .select("*")
        .eq("workspace_id", workspace_id)
        .gte("date", prevStartDate)
        .lte("date", prevEndDate);

    type PrevEntryType = NonNullable<typeof prevEntries>[0];
    const prevEntriesMap = new Map<string, PrevEntryType[]>();
    if (prevEntries) {
        for (const entry of prevEntries) {
            if (!prevEntriesMap.has(entry.employee_id!)) {
                prevEntriesMap.set(entry.employee_id!, []);
            }
            prevEntriesMap.get(entry.employee_id!)!.push(entry);
        }
    }

    // 4. Generate new month entries
    const entriesToInsert = [];
    const daysInNewMonth = new Date(year, month, 0).getDate();

    for (const emp of activeEmployees) {
        let streak = 0;

        // Calculate streak from previous month
        const empPrevEntries = prevEntriesMap.get(emp.id) || [];
        for (let day = prevMonthDays; day >= checkStartDay; day--) {
            const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = empPrevEntries.find(e => e.date === dateStr);
            if (entry && entry.status === "X") {
                streak++;
            } else {
                break; // Streak broken
            }
        }

        // Generate days for new month
        for (let day = 1; day <= daysInNewMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const cellDate = new Date(dateStr);

            // Skip if employee wasn't hired yet
            if (emp.hire_date) {
                const hDate = new Date(emp.hire_date);
                if (cellDate < hDate) continue;
            }

            // Skip if employee is terminated before or on this day (actually if cellDate > termination_date)
            // As per requirements: "Если у сотрудника есть termination_date внутри этого нового месяца, то после даты увольнения статусы не ставятся вообще (остаются пустыми или null), чтобы UI залил их черным."
            if (emp.termination_date) {
                const tDate = new Date(emp.termination_date);
                if (cellDate > tDate) continue;
            }

            if (streak === 6) {
                entriesToInsert.push({
                    workspace_id,
                    employee_id: emp.id,
                    date: dateStr,
                    status: "Hİ"
                });
                streak = 0;
            } else {
                entriesToInsert.push({
                    workspace_id,
                    employee_id: emp.id,
                    date: dateStr,
                    status: "X"
                });
                streak++;
            }
        }
    }

    // 5. Save data
    if (entriesToInsert.length > 0) {
        const chunkSize = 1000;
        for (let i = 0; i < entriesToInsert.length; i += chunkSize) {
            const { error: insertError } = await supabase
                .from("puantaj_entries")
                .upsert(entriesToInsert.slice(i, i + chunkSize), { onConflict: 'employee_id, date' });
            if (insertError) throw new Error(insertError.message);
        }
    }

    // Update initialized_months
    const newInitializedMonths = [...(workspace?.initialized_months || []), monthKey];
    const { error: updateError } = await supabase
        .from("workspaces")
        .update({ initialized_months: newInitializedMonths })
        .eq("id", workspace_id);
    if (updateError) throw new Error(updateError.message);

    // Call sync to Drive (Google Sheets)
    try {
        await syncPuantajToDrive(year, month, activeEmployees, entriesToInsert);
    } catch (err: unknown) {
        console.error("Google Sheets oluşturulurken hata:", err);
        // We don't fail the entire transaction if Drive fails, but maybe we should?
        // Actually we probably want the month to be considered initialized even if Drive fails,
        // user can always click manual sync.
    }

    revalidatePath("/puantaj");
    return { success: true };

  } catch (err: unknown) {
    console.error("initializeNewMonth error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Bir hata oluştu" };
  }
}

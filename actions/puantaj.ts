"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type PuantajEntry = Database["public"]["Tables"]["puantaj_entries"]["Row"];

export async function getEmployees() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    throw new Error("No workspace found");
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("seq_no", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Employee[];
}

export async function addEmployee(employeeData: {
  seq_no: number;
  sicil_no: string;
  full_name: string;
  role_title: string;
  hire_date: string;
}) {
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

  const { data, error } = await supabase
    .from("employees")
    .insert({
      workspace_id: profile.workspace_id,
      seq_no: employeeData.seq_no,
      sicil_no: employeeData.sicil_no || null,
      full_name: employeeData.full_name,
      role_title: employeeData.role_title || null,
      hire_date: employeeData.hire_date || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/puantaj");
  return { success: true, data };

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}

export async function updateEmployee(id: string, employeeData: Partial<Employee>) {
 try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("employees")
    .update(employeeData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/puantaj");
  return { success: true, data };
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}

export async function terminateEmployee(id: string, terminationDate: string) {
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

  // Update the employee
  const { error: updateError } = await supabase
    .from("employees")
    .update({ termination_date: terminationDate, is_active: false })
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id);

  if (updateError) throw new Error(updateError.message);

  // Fill the rest of the current month with 'TERMINATED' statuses
  const termDateObj = new Date(terminationDate);
  const year = termDateObj.getFullYear();
  const month = termDateObj.getMonth();

  // Calculate days to fill from the day AFTER termination date
  const startDay = termDateObj.getDate() + 1;
  const lastDay = new Date(year, month + 1, 0).getDate();

  if (startDay <= lastDay) {
    const entriesToInsert = [];
    for (let day = startDay; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      entriesToInsert.push({
        workspace_id: profile.workspace_id,
        employee_id: id,
        date: dateStr,
        status: "TERMINATED"
      });
    }

    if (entriesToInsert.length > 0) {
      // Upsert the terminated statuses
      const { error: upsertError } = await supabase
        .from("puantaj_entries")
        .upsert(entriesToInsert, { onConflict: "employee_id,date" });

      if (upsertError) {
        console.error("Failed to insert termination entries:", upsertError);
      }
    }
  }

  revalidatePath("/puantaj");
  return { success: true };

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}

export async function deleteEmployee(id: string) {
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

  const { data: employeeData, error: fetchError } = await supabase
    .from("employees")
    .select("seq_no")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (fetchError || !employeeData) {
    throw new Error("Çalışan bulunamadı");
  }

  const { error: deleteError } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id);

  if (deleteError) {
    throw new Error("Çalışan silinemedi");
  }

  // Fetch all remaining employees in the workspace ordered by seq_no
  const { data: remainingEmployees, error: fetchRemainingError } = await supabase
    .from("employees")
    .select("id, seq_no")
    .eq("workspace_id", profile.workspace_id)
    .order("seq_no", { ascending: true });

  if (!fetchRemainingError && remainingEmployees) {
    // Re-sequence remaining employees
    for (let i = 0; i < remainingEmployees.length; i++) {
      if (remainingEmployees[i].seq_no !== i + 1) {
        await supabase
          .from("employees")
          .update({ seq_no: i + 1 })
          .eq("id", remainingEmployees[i].id);
      }
    }
  }

  revalidatePath("/puantaj");
  return { success: true };
 } catch (err: unknown) {
   return { success: false, error: err instanceof Error ? err.message : "Bir hata oluştu" };
 }
}

export async function getPuantajEntries(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) throw new Error("No workspace found");

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from("puantaj_entries")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw new Error(error.message);

  return data as PuantajEntry[];
}

export async function bulkUpsertPuantaj(entries: { employee_id: string; date: string; status: string }[]) {
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

  const formattedEntries = entries.map(entry => ({
    ...entry,
    workspace_id: profile.workspace_id
  }));

  // if status is empty string, we want to delete the entry
  const entriesToDelete = formattedEntries.filter(e => e.status === "");
  const entriesToUpsert = formattedEntries.filter(e => e.status !== "");

  if (entriesToDelete.length > 0) {
    // Delete one by one for now since supabase delete with OR/IN can be tricky with composite keys
    for (const entry of entriesToDelete) {
      await supabase
        .from("puantaj_entries")
        .delete()
        .eq("employee_id", entry.employee_id)
        .eq("date", entry.date);
    }
  }

  if (entriesToUpsert.length > 0) {
    const { error } = await supabase
      .from("puantaj_entries")
      .upsert(entriesToUpsert, { onConflict: "employee_id,date" });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/puantaj");
  return { success: true };
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}

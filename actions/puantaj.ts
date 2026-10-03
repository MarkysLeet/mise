"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";
import { syncPersonelListToDrive } from "./personel-sync";
import { syncPuantajToDrive } from "./puantaj-sync";
import { sanitizeDates } from "@/lib/utils/sanitizeDates";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type PuantajEntry = Database["public"]["Tables"]["puantaj_entries"]["Row"];

export async function getEmployees(year?: number, month?: number) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.workspace_id) {
      throw new Error("No workspace found");
    }

    let query = supabase
      .from("employees")
      .select("*")
      .eq("workspace_id", profile.workspace_id)
      .order("seq_no", { ascending: true })
      .limit(10000);

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      query = query.or(`termination_date.is.null,termination_date.gte.${startDate}`);
      query = query.or(`hire_date.is.null,hire_date.lte.${endDate}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const { sortEmployees } = await import('@/lib/sort');
    const sortedData = sortEmployees(data);

    // Re-sequence them for display to be 1, 2, 3... without holes
    const sequencedData = sortedData.map((emp, index) => ({
      ...emp,
      seq_no: index + 1
    }));

    return sequencedData as Employee[];
  } catch (err: unknown) {
    console.error("getEmployees error:", err);
    const msg = err instanceof Error ? err.message : "Personel verileri yüklenirken bir hata oluştu.";
    throw new Error(msg);
  }
}

export async function addEmployee(employeeData: {
  seq_no: number;
  sicil_no?: string;
  phone?: string;
  department_outlet?: string;
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

  const payload = sanitizeDates({
    workspace_id: profile.workspace_id,
    seq_no: employeeData.seq_no,
    sicil_no: employeeData.sicil_no || null,
    phone: employeeData.phone || null,
    department_outlet: employeeData.department_outlet || null,
    full_name: employeeData.full_name,
    role_title: employeeData.role_title || null,
    hire_date: employeeData.hire_date || null,
    is_active: true,
  }, ["hire_date"]);

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Background async sync for Personel Listesi
  syncPersonelListToDrive().catch(err => console.error("Background syncPersonelListToDrive error:", err));

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitizedData = sanitizeDates(employeeData, ["hire_date", "termination_date" as any]);

  const { data, error } = await supabase
    .from("employees")
    .update(sanitizedData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Background async sync for Personel Listesi
  syncPersonelListToDrive().catch(err => console.error("Background syncPersonelListToDrive error:", err));

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

  // Delete all puantaj entries strictly AFTER the termination date
  const { error: deleteError } = await supabase
    .from("puantaj_entries")
    .delete()
    .eq("employee_id", id)
    .gt("date", terminationDate);

  if (deleteError) {
    console.error("Failed to delete future termination entries:", deleteError);
    throw new Error(deleteError.message);
  }

  const termDateObj = new Date(terminationDate);
  const year = termDateObj.getFullYear();
  const month = termDateObj.getMonth() + 1;

  // Background async sync for Personel Listesi
  syncPersonelListToDrive().catch(err => console.error("Background syncPersonelListToDrive error:", err));

  // Sync Puantaj to Drive
  try {
    const employees = await getEmployees(year, month);
    const entries = await getPuantajEntries(year, month);
    syncPuantajToDrive(year, month, employees, entries).catch(err => console.error("Background syncPuantajToDrive error:", err));
  } catch (syncErr) {
    console.error("Failed to fetch data for Puantaj sync:", syncErr);
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

  // Background async sync for Personel Listesi
  syncPersonelListToDrive().catch(err => console.error("Background syncPersonelListToDrive error:", err));

  revalidatePath("/puantaj");
  return { success: true };
 } catch (err: unknown) {
   return { success: false, error: err instanceof Error ? err.message : "Bir hata oluştu" };
 }
}

export async function getPuantajEntries(year: number, month: number) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.workspace_id) throw new Error("No workspace found");

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let allData: PuantajEntry[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const to = from + pageSize - 1;

    let chunkData = null;
    let retries = 3;
    let chunkError = null;

    while (retries > 0) {
      const { data, error } = await supabase
        .from("puantaj_entries")
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("employee_id")
        .order("date")
        .range(from, to);

      if (error) {
        chunkError = error;
        retries--;
        if (retries > 0) {
          // exponential backoff
          await new Promise(res => setTimeout(res, (3 - retries) * 500));
        }
      } else {
        chunkData = data;
        chunkError = null;
        break;
      }
    }

    if (chunkError) {
      throw new Error(`Veri alınırken hata oluştu: ${chunkError.message}. Lütfen sayfayı yenileyin.`);
    }

      if (chunkData && chunkData.length > 0) {
        allData = allData.concat(chunkData as PuantajEntry[]);
        if (chunkData.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allData;
  } catch (err: unknown) {
    console.error("getPuantajEntries error:", err);
    const msg = err instanceof Error ? err.message : "Kayıt silinirken bir hata oluştu";
    throw new Error(msg);
  }
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

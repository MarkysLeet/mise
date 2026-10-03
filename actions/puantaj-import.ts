/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function parseTurkishDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const str = dateStr.toString().trim();
  if (!str) return null;

  // Try matching DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[\.\/\-]/);
  if (parts.length === 3) {
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];

    // Check if it's already YYYY-MM-DD
    if (p0.length === 4) {
      return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }

    // Check if year is last
    let year = p2;
    if (year.length === 2) {
       year = `20${year}`;
    }

    return `${year}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
  }

  return null;
}

export async function importEmployeesFromFile(employeesData: any[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspace_id) {
      throw new Error("Workspace not found");
    }

    const workspaceId = profile.workspace_id;

    const { data: existingEmployees } = await supabase
      .from("employees")
      .select("*")
      .eq("workspace_id", workspaceId);

    let maxSeqNo = 0;
    if (existingEmployees && existingEmployees.length > 0) {
      maxSeqNo = Math.max(...existingEmployees.map((e: any) => e.seq_no || 0));
    }

    const existingMap = new Map();
    if (existingEmployees) {
      for (const emp of existingEmployees) {
        // Case-insensitive, whitespace trimmed map key
        const key = emp.full_name.trim().toLowerCase().replace(/\s+/g, ' ');
        existingMap.set(key, emp);
      }
    }

    const toUpdate = [];
    const toInsert = [];

    for (const item of employeesData) {
      if (!item.full_name) continue; // Full name is required

      const parsedName = item.full_name.toString().trim();
      const searchKey = parsedName.toLowerCase().replace(/\s+/g, ' ');
      const existing = existingMap.get(searchKey);

      const parsedHireDate = parseTurkishDate(item.hire_date);

      const newValues: any = {
        sicil_no: item.sicil_no ? item.sicil_no.toString().trim() : null,
        role_title: item.role_title ? item.role_title.toString().trim() : null,
        phone: item.phone ? item.phone.toString().trim() : null,
        department_outlet: item.department_outlet ? item.department_outlet.toString().trim() : null,
        hire_date: parsedHireDate,
      };

      if (existing) {
        // Only update if db field is empty/null AND file field has a value
        const updateObj: any = { ...existing };
        let needsUpdate = false;

        for (const [key, val] of Object.entries(newValues)) {
          if ((existing[key] === null || existing[key] === "" || existing[key] === undefined) && val !== null && val !== "") {
            updateObj[key] = val;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
           toUpdate.push(updateObj);
        }
      } else {
        // Insert new
        maxSeqNo++;
        toInsert.push({
          workspace_id: workspaceId,
          seq_no: maxSeqNo,
          full_name: parsedName,
          ...newValues,
          is_active: true
        });
      }
    }

    let updatedCount = 0;
    let insertedCount = 0;

    if (toUpdate.length > 0) {
       // Supabase upsert for updates
       const { error: updateError } = await supabase.from("employees").upsert(toUpdate);
       if (updateError) throw updateError;
       updatedCount = toUpdate.length;
    }

    if (toInsert.length > 0) {
       const { error: insertError } = await supabase.from("employees").insert(toInsert);
       if (insertError) throw insertError;
       insertedCount = toInsert.length;
    }

    revalidatePath("/puantaj");
    revalidatePath("/dashboard");

    return { success: true, updated: updatedCount, inserted: insertedCount };

  } catch (error: any) {
    console.error("importEmployeesFromFile error:", error);
    return { success: false, error: error.message || "Bir hata oluştu" };
  }
}

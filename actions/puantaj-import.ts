/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normalizeDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Helper to construct YYYY-MM-DD
  const toDateStr = (y: number, m: number, d: number) => {
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    let year = y;
    if (year < 100) year += 2000;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // 1. Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return toDateStr(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  // 2. Excel Serial Number
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(d.getTime())) return null;
    return toDateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  // 3. String parsing
  if (typeof value === 'string') {
    const str = value.trim();
    if (!str) return null;

    // Matches YYYY-MM-DD directly
    if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(str)) {
      return str.substring(0, 10).replace(/\//g, '-');
    }

    const parts = str.split(/[\.\/\-]/);
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2].substring(0, 4), 10); // ignore time if attached

      if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return null;

      let year, month, day;

      if (p0 > 1000) {
        // YYYY.MM.DD
        year = p0;
        month = p1;
        day = p2;
      } else if (p2 > 1000 || parts[2].length === 2) {
        // Ends with year
        year = p2;
        if (p1 > 12) {
          // MM/DD/YYYY
          month = p0;
          day = p1;
        } else {
          // DD.MM.YYYY (Default assumption for Turkey)
          day = p0;
          month = p1;
        }
      } else {
        return null;
      }

      return toDateStr(year, month, day);
    }
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

      const parsedHireDate = normalizeDate(item.hire_date);

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

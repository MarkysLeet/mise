"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFazlaMesaiByMonth(year: number, month: number) {
  try {
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

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
      .from("fazla_mesai")
      .select(`
        id,
        employee_id,
        mesai_date,
        hours,
        description,
        created_at,
        employees:employee_id (
          id,
          full_name,
          role_title
        )
      `)
      .eq("workspace_id", profile.workspace_id)
      .gte("mesai_date", startDate)
      .lte("mesai_date", endDate)
      .order("mesai_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching fazla_mesai by month:", error);
    return [];
  }
}

export async function getFazlaMesaiByEmployee(employeeId: string) {
  try {
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
      .from("fazla_mesai")
      .select("*")
      .eq("workspace_id", profile.workspace_id)
      .eq("employee_id", employeeId)
      .order("mesai_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching fazla_mesai by employee:", error);
    return [];
  }
}

export async function addFazlaMesai(formData: FormData) {
  try {
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

    const employee_id = formData.get("employee_id") as string;
    const mesai_date = formData.get("mesai_date") as string;
    const hours = Number(formData.get("hours"));
    const description = formData.get("description") as string | null;

    if (!employee_id || !mesai_date || !hours) {
      return { error: "Lütfen gerekli alanları doldurun." };
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from("fazla_mesai")
      .select("id")
      .eq("workspace_id", profile.workspace_id)
      .eq("employee_id", employee_id)
      .eq("mesai_date", mesai_date)
      .single();

    if (existing) {
      return { error: "Bu personel icin bu tarihte zaten bir mesai kaydi var." };
    }

    const { error } = await supabase
      .from("fazla_mesai")
      .insert({
        workspace_id: profile.workspace_id,
        employee_id,
        mesai_date,
        hours,
        description
      });

    if (error) throw error;

    revalidatePath("/fazla-mesai");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error adding fazla mesai:", error);
    return { error: "Fazla mesai eklenirken bir hata oluştu." };
  }
}

export async function updateFazlaMesai(id: string, formData: FormData) {
  try {
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

    const employee_id = formData.get("employee_id") as string;
    const mesai_date = formData.get("mesai_date") as string;
    const hours = Number(formData.get("hours"));
    const description = formData.get("description") as string | null;

    if (!employee_id || !mesai_date || !hours) {
      return { error: "Lütfen gerekli alanları doldurun." };
    }

    // Check for duplicates on same date but different ID
    const { data: existing } = await supabase
      .from("fazla_mesai")
      .select("id")
      .eq("workspace_id", profile.workspace_id)
      .eq("employee_id", employee_id)
      .eq("mesai_date", mesai_date)
      .neq("id", id)
      .single();

    if (existing) {
      return { error: "Bu personel icin bu tarihte zaten bir mesai kaydi var." };
    }

    const { error } = await supabase
      .from("fazla_mesai")
      .update({
        employee_id,
        mesai_date,
        hours,
        description
      })
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id);

    if (error) throw error;

    revalidatePath("/fazla-mesai");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating fazla mesai:", error);
    return { error: "Fazla mesai güncellenirken bir hata oluştu." };
  }
}

export async function deleteFazlaMesai(id: string) {
  try {
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

    const { error } = await supabase
      .from("fazla_mesai")
      .delete()
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id);

    if (error) throw error;

    revalidatePath("/fazla-mesai");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting fazla mesai:", error);
    return { error: "Kayıt silinirken bir hata oluştu." };
  }
}

export async function getDashboardTotalFazlaMesai() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) return 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
      .from("fazla_mesai")
      .select("hours")
      .eq("workspace_id", profile.workspace_id)
      .gte("mesai_date", startDate)
      .lte("mesai_date", endDate);

    if (error) throw error;

    const totalHours = data.reduce((acc, row) => acc + (row.hours || 0), 0);
    return totalHours;
  } catch (error) {
    console.error("Error getting total fazla mesai:", error);
    return 0;
  }
}

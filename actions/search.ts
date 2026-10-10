"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchEmployees(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  // Search by first name or last name
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, role_title, department_outlet")
    .ilike("full_name", `%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error searching employees:", error);
    return [];
  }

  return data;
}

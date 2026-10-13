"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchEmployees(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  // Search by first name, last name, role title, department outlet, phone
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, role_title, department_outlet, phone")
    .or(`full_name.ilike.%${query}%,role_title.ilike.%${query}%,department_outlet.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error searching employees:", error);
    return [];
  }

  return data;
}

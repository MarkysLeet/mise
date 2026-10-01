"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const workspaceId = user.user_metadata?.workspace_id;

  if (!workspaceId) {
    return null;
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  return workspace;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function updateProfile(firstName: string, lastName: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", user.id);

  if (error) {
    return { error: "Profil güncellenemedi." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateWorkspace(hotelName: string, hotelGroup: string, department: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const workspaceId = user.user_metadata?.workspace_id;
  if (!workspaceId) {
    return { error: "Çalışma alanı bulunamadı." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ hotel_name: hotelName, hotel_group: hotelGroup, name: department })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Çalışma alanı güncellenemedi." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const workspaceId = user.user_metadata?.workspace_id;

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Attempt to delete user from Auth, which will cascade delete profile
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return { error: "Kullanıcı silinemedi." };
  }

  // Delete workspace if they were the owner/member
  if (workspaceId) {
    await supabaseAdmin.from("workspaces").delete().eq("id", workspaceId);
  }

  redirect("/login");
}
